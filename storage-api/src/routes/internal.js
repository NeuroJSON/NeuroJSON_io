// Server-to-server endpoints for REN (never the browser). Every request must
// be HMAC-signed with the shared secret; REN signs the full path it calls
// (BASE_PATH included, which Apache keeps when proxying). Used by REN's pull
// reconciliation (dev, and as a safety net in prod) and for monitoring.
import fs from "node:fs/promises";
import express from "express";
import { config } from "../config.js";
import { verifyRequest } from "../lib/storageSignature.js";
import { incomingFile } from "../lib/paths.js";
import {
  findRecord,
  readPending,
  listPendingIds,
  withLock,
  closeRecord,
} from "../outbox/outbox.js";
import {
  applyDecision,
  applyAck,
  Permanent,
  wakeWorker,
} from "../outbox/worker.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const router = express.Router();

router.use(
  express.json({
    limit: "64kb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
router.use((req, res, next) => {
  const r = verifyRequest(
    {
      method: req.method,
      path: req.originalUrl,
      headers: req.headers,
      rawBody: req.rawBody || "",
    },
    config.hmacKeys
  );
  if (!r.ok) {
    console.warn("Rejected internal call:", r.reason, req.method, req.originalUrl);
    return res.status(401).json({ error: "Invalid service signature." });
  }
  next();
});

const httpError = (status, message) =>
  Object.assign(new Error(message), { status });

const uploadId = (req) => {
  const id = String(req.params.uploadId);
  if (!UUID_RE.test(id)) throw httpError(404, "Unknown upload.");
  return id;
};

const sendError = (res, err) => {
  if (err instanceof Permanent) return res.status(409).json({ error: err.message });
  if (err.status) return res.status(err.status).json({ error: err.message });
  console.error("internal endpoint:", err.message);
  res.status(500).json({ error: "Internal error." });
};

const removeIncoming = async (id) => {
  await fs.rm(incomingFile(id), { force: true });
  await fs.rm(`${incomingFile(id)}.json`, { force: true });
};

// What the disk says about one upload.
const describe = async (id) => {
  const found = await findRecord(id);
  if (found) {
    const r = found.rec;
    return {
      uploadId: id,
      phase: r.state,
      where: found.where,
      size: r.size ?? r.expectedSize,
      sha256: r.sha256 || null,
      rawId: r.rawId || null,
      storageKey: r.storageKey || null,
      reason: r.reason || null,
      lastError: r.lastError || null,
      updatedAt: r.updatedAt,
    };
  }
  try {
    const st = await fs.stat(incomingFile(id));
    let size = null;
    try {
      size =
        JSON.parse(await fs.readFile(`${incomingFile(id)}.json`, "utf8")).size ??
        null;
    } catch {
      // no tus metadata
    }
    return {
      uploadId: id,
      phase: "incoming",
      offset: st.size,
      size,
      lastActivityAt: st.mtime.toISOString(),
    };
  } catch {
    return { uploadId: id, phase: "none" };
  }
};

// GET /internal/uploads/:uploadId
router.get("/uploads/:uploadId", async (req, res) => {
  try {
    res.json(await describe(uploadId(req)));
  } catch (err) {
    sendError(res, err);
  }
});

// POST /internal/uploads/:uploadId/decision
//   {decision: "commit"|"discard", rawId?, storageKey?, reason?}
router.post("/uploads/:uploadId/decision", async (req, res) => {
  try {
    const id = uploadId(req);
    const body = req.body || {};
    const state = await withLock(id, async () => {
      const found = await findRecord(id);
      if (!found) throw httpError(409, "Upload has not finished uploading.");
      const rec = found.rec;
      if (rec.state === "awaiting_decision" && found.where === "pending") {
        await applyDecision(rec, body);
        return rec.state;
      }
      // Repeat of a decision that already took effect → same answer, no change.
      const committedAlready = [
        "committing",
        "committed",
        "discarding_committed",
        "done",
      ].includes(rec.state);
      if (body.decision === "commit" && committedAlready && rec.rawId === body.rawId) {
        return rec.state;
      }
      if (
        body.decision === "discard" &&
        ["discarding", "done"].includes(rec.state) &&
        !rec.rawId
      ) {
        return rec.state;
      }
      throw new Permanent(`cannot apply that decision in state ${rec.state}`);
    });
    wakeWorker(); // committing / discarding continue right away
    res.json({ ok: true, state });
  } catch (err) {
    sendError(res, err);
  }
});

// POST /internal/uploads/:uploadId/ack  {action?: "keep"|"discard", reason?}
router.post("/uploads/:uploadId/ack", async (req, res) => {
  try {
    const id = uploadId(req);
    const state = await withLock(id, async () => {
      const found = await findRecord(id);
      if (!found) throw httpError(404, "Unknown upload.");
      if (found.where !== "pending") return found.rec.state; // finished → idempotent
      await applyAck(found.rec, req.body || {});
      return found.rec.state;
    });
    wakeWorker();
    res.json({ ok: true, state });
  } catch (err) {
    sendError(res, err);
  }
});

// DELETE /internal/uploads/:uploadId — leftovers of a cancelled/expired upload.
// Never removes a committed object (that's the cleanup job's decision).
router.delete("/uploads/:uploadId", async (req, res) => {
  try {
    const id = uploadId(req);
    const result = await withLock(id, async () => {
      const found = await findRecord(id);
      if (found && found.where === "pending") {
        if (
          ["committing", "committed", "discarding_committed"].includes(
            found.rec.state
          )
        ) {
          throw new Permanent(
            "upload is already committed; objects are removed by cleanup, not here"
          );
        }
        await removeIncoming(id);
        found.rec.reason = "deleted by REN";
        found.rec.state = "done";
        await closeRecord(found.rec, "done");
        return "removed";
      }
      if (found) return "nothing to remove"; // already done/failed
      await removeIncoming(id);
      return "removed";
    });
    res.json({ ok: true, result });
  } catch (err) {
    sendError(res, err);
  }
});

// GET /internal/status — for REN's monitoring (never public).
router.get("/status", async (req, res) => {
  try {
    const s = await fs.statfs(config.uploadRoot);
    const byState = {};
    let oldest = null;
    for (const id of await listPendingIds()) {
      try {
        const r = await readPending(id);
        byState[r.state] = (byState[r.state] || 0) + 1;
        if (!oldest || r.updatedAt < oldest.since) {
          oldest = { uploadId: id, state: r.state, since: r.updatedAt };
        }
      } catch {
        // moved meanwhile
      }
    }
    const count = async (sub) =>
      (await fs.readdir(`${config.outboxDir}/${sub}`)).filter((n) =>
        n.endsWith(".json")
      ).length;
    res.json({
      disk: { freeBytes: s.bavail * s.bsize, totalBytes: s.blocks * s.bsize },
      outbox: {
        pending: byState,
        done: await count("done"),
        failed: await count("failed"),
      },
      oldestPending: oldest,
      pushes: config.mainApiUrl ? "on" : "off",
    });
  } catch (err) {
    sendError(res, err);
  }
});

export default router;
