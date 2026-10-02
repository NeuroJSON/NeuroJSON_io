// Drives each finished upload to completion, one record at a time (hashing
// large files is disk-heavy). Every state change is saved before the next
// step, so after a crash or restart the worker continues where it stopped.
//
//   verifying ─► awaiting_decision ─[verified]─► committing ─► committed ─[committed]─► done
//       │                     └─► discarding ─► done        (discard on committed → discarding_committed)
//       └─► rejecting ─[failed]─► done
//
// Pull mode (MAIN_API_URL empty): the file work still runs, but the worker
// stops at the states that need REN's answer; REN drives those via /internal.
import fs from "node:fs/promises";
import path from "node:path";
import {
  listPendingIds,
  readPending,
  saveRecord,
  closeRecord,
  withLock,
} from "./outbox.js";
import { incomingFile, rawObjectDir, rawZipKey } from "../lib/paths.js";
import { looksLikeZip, sha256File, fsyncDir } from "../lib/fileChecks.js";
import { pushEnabled, sendUploadEvent } from "../lib/mainApiClient.js";

const TICK_MS = 5000;
const BACKOFF_SECONDS = [5, 30, 120, 600, 1800, 3600];
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
// States where the next move needs REN's answer (pull mode waits here).
export const WAITS_FOR_REN = new Set([
  "awaiting_decision",
  "rejecting",
  "committed",
]);

const exists = (p) =>
  fs.access(p).then(
    () => true,
    () => false
  );
const removeIncoming = async (id) => {
  await fs.rm(incomingFile(id), { force: true });
  await fs.rm(`${incomingFile(id)}.json`, { force: true });
};

// A problem retrying won't fix (bad reply, files missing) → park the record.
export class Permanent extends Error {}

const ready = (rec) => {
  rec.attempts = 0;
  rec.lastError = null;
  rec.nextAttemptAt = new Date().toISOString();
};

const retryLater = async (rec, error) => {
  const delay =
    BACKOFF_SECONDS[Math.min(rec.attempts, BACKOFF_SECONDS.length - 1)];
  rec.attempts += 1;
  rec.lastError = error;
  rec.nextAttemptAt = new Date(Date.now() + delay * 1000).toISOString();
  await saveRecord(rec);
  console.warn(
    `outbox ${rec.uploadId}: ${rec.state} retry #${rec.attempts} in ${delay}s (${error})`
  );
};

const park = async (rec, error) => {
  rec.lastError = error;
  rec.parkedFrom = rec.state;
  rec.state = "failed";
  await closeRecord(rec, "failed");
  console.error(
    `outbox ${rec.uploadId}: PARKED in .outbox/failed/ (${error})`
  );
};

const finish = async (rec) => {
  rec.state = "done";
  await closeRecord(rec, "done");
  console.log(`outbox ${rec.uploadId}: done`);
};

// Ask REN; returns the reply body, or throws Permanent / a retryable Error.
const askRen = async (rec, payload) => {
  const r = await sendUploadEvent(rec.uploadId, payload);
  if (r.kind === "ok") return r.body;
  if (r.kind === "permanent") throw new Permanent(r.error);
  throw new Error(r.error);
};

const setState = async (rec, state, extra = {}) => {
  Object.assign(rec, extra, { state });
  ready(rec);
  await saveRecord(rec);
  console.log(`outbox ${rec.uploadId}: → ${state}`);
};

const STEPS = {
  // Size, ZIP signature, SHA-256 of the file sitting in .incoming/.
  async verifying(rec) {
    const file = incomingFile(rec.uploadId);
    let size;
    try {
      size = (await fs.stat(file)).size;
    } catch {
      throw new Permanent("incoming file is missing");
    }
    let reason = null;
    if (size !== rec.expectedSize) reason = "size_mismatch";
    else if (!(await looksLikeZip(file))) reason = "not_zip";
    if (reason) return setState(rec, "rejecting", { reason });
    const sha256 = await sha256File(file);
    await setState(rec, "awaiting_decision", { size, sha256 });
  },

  // Tell REN the file failed the checks, then delete it.
  async rejecting(rec) {
    await askRen(rec, { event: "failed", reason: rec.reason });
    await applyAck(rec);
  },

  // "verified" → REN answers commit (with rawId) or discard.
  async awaiting_decision(rec) {
    const reply = await askRen(rec, {
      event: "verified",
      size: rec.size,
      sha256: rec.sha256,
    });
    await applyDecision(rec, reply);
  },

  // Move .incoming/<uploadId> → <iid>/raw/<rawId>/source.zip (atomic rename).
  async committing(rec) {
    const dir = rawObjectDir(rec.internalId, rec.rawId);
    const src = incomingFile(rec.uploadId);
    const dest = path.join(dir, "source.zip");
    await fs.mkdir(dir, { recursive: true });
    const haveSrc = await exists(src);
    const haveDest = await exists(dest);
    if (haveSrc && haveDest) {
      throw new Permanent("both incoming and final file exist");
    }
    if (!haveSrc && !haveDest) {
      throw new Permanent("file is missing (neither incoming nor final)");
    }
    if (haveSrc) await fs.rename(src, dest); // else: moved before a crash — continue
    await fsyncDir(dir);
    if ((await fs.stat(dest)).size !== rec.size) {
      throw new Permanent("final file size changed");
    }
    await fs.rm(`${src}.json`, { force: true }); // tus metadata no longer needed
    await setState(rec, "committed", {
      storageKey: rawZipKey(rec.internalId, rec.rawId),
    });
  },

  // "committed" → REN records the object; keep, or discard if cancelled meanwhile.
  async committed(rec) {
    const reply = await askRen(rec, {
      event: "committed",
      size: rec.size,
      sha256: rec.sha256,
    });
    await applyAck(rec, reply);
  },

  async discarding(rec) {
    await removeIncoming(rec.uploadId);
    await finish(rec);
  },

  async discarding_committed(rec) {
    await fs.rm(rawObjectDir(rec.internalId, rec.rawId), {
      recursive: true,
      force: true,
    });
    await finish(rec);
  },
};

// Apply REN's commit/discard answer (used by push mode here and by the pull
// endpoint later). Validates the rawId so a bad reply can't pick a path.
export const applyDecision = async (rec, reply) => {
  if (reply.decision === "commit") {
    if (!UUID_RE.test(String(reply.rawId))) {
      throw new Permanent("REN sent an invalid rawId");
    }
    const key = rawZipKey(rec.internalId, reply.rawId);
    if (reply.storageKey && reply.storageKey !== key) {
      throw new Permanent("REN storageKey does not match");
    }
    return setState(rec, "committing", { rawId: reply.rawId });
  }
  if (reply.decision === "discard") {
    return setState(rec, "discarding", { reason: reply.reason || null });
  }
  throw new Permanent("REN sent an unknown decision");
};

// REN's acknowledgement of a final result (push reply or pull /ack).
export const applyAck = async (rec, reply = {}) => {
  if (rec.state === "committed") {
    if (reply.action === "discard") {
      return setState(rec, "discarding_committed", {
        reason: reply.reason || null,
      });
    }
    if (reply.action === "keep") return finish(rec);
    throw new Permanent(
      "acknowledging a committed upload needs action keep or discard"
    );
  }
  if (rec.state === "rejecting") {
    await removeIncoming(rec.uploadId);
    return finish(rec);
  }
  throw new Permanent(`nothing to acknowledge in state ${rec.state}`);
};

// Run one record forward until it waits, retries, or finishes.
const advance = async (rec) => {
  for (let i = 0; i < 10; i++) {
    const step = STEPS[rec.state];
    if (!step) return;
    if (!pushEnabled() && WAITS_FOR_REN.has(rec.state)) return; // pull mode
    const before = rec.state;
    try {
      await step(rec);
    } catch (e) {
      if (e instanceof Permanent) await park(rec, e.message);
      else await retryLater(rec, e.message);
      return;
    }
    if (rec.state === before || rec.state === "done") return;
  }
};

let running = false;
let again = false;
let timer = null;

const tick = async () => {
  if (running) {
    again = true;
    return;
  }
  running = true;
  try {
    for (const id of await listPendingIds()) {
      // Read fresh inside the lock, so REN's /internal calls and the worker
      // never work on the same record at once (or on a stale copy).
      await withLock(id, async () => {
        let rec;
        try {
          rec = await readPending(id);
        } catch {
          return; // finished or removed meanwhile
        }
        if (new Date(rec.nextAttemptAt) > new Date()) return;
        await advance(rec);
      });
    }
  } catch (e) {
    console.error("outbox worker:", e.message);
  } finally {
    running = false;
    if (again) {
      again = false;
      setImmediate(tick);
    }
  }
};

export const wakeWorker = () => setImmediate(tick);
export const startWorker = () => {
  timer = setInterval(tick, TICK_MS);
  wakeWorker(); // pick up records left from before a restart
};
export const stopWorker = () => clearInterval(timer);
