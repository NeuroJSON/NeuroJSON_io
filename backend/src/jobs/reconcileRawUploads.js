// Reconciliation: REN asks the Zodiac storage API about raw uploads that
// aren't finished and finishes them. Required in dev (Zodiac can't reach the
// developer's machine, so pushes are off); a safety net in prod. Decisions
// reuse processStorageEvent, so pull and push can never decide differently.
// Assumes ONE backend process (add a Postgres advisory lock if that changes).
const { sequelize } = require("../config/database");
const {
  processStorageEvent,
} = require("../controllers/storageEvents.controller");
const storage = require("../lib/storageClient");

const INTERVAL_MS = Number(process.env.RAW_RECONCILE_INTERVAL_MS ?? 600000); // 0 = off
const MIN_AGE_MS = Number(process.env.RAW_RECONCILE_MIN_AGE_MS ?? 1800000); // let pushes happen first
const EXPIRE_MS = Number(process.env.RAW_INACTIVE_EXPIRE_DAYS ?? 7) * 86400000;
const BATCH = 50;
const ACTIVE = ["initiated", "uploading", "verifying"];

const q = (sql, replacements) =>
  sequelize.query(sql, { replacements, type: sequelize.QueryTypes.SELECT });
const run = (sql, replacements) => sequelize.query(sql, { replacements });

const touch = (id) =>
  run(
    `UPDATE raw_upload_attempts SET last_checked_at = NOW() WHERE upload_id = :id`,
    { id }
  );
const expire = (id, msg) =>
  run(
    `UPDATE raw_upload_attempts
        SET status = 'expired', error = :msg, completed_at = NOW(), updated_at = NOW()
      WHERE upload_id = :id AND status IN (:active)`,
    { id, msg, active: ACTIVE }
  );
const idleTooLong = (since) =>
  Date.now() - new Date(since).getTime() > EXPIRE_MS;

// One unfinished attempt: look at Zodiac, then take the matching step.
const reconcileActive = async (a) => {
  const id = a.upload_id;
  const st = await storage.getUpload(id);
  switch (st.phase) {
    case "none":
      if (idleTooLong(a.updated_at)) {
        await expire(id, "The upload was never started.");
      }
      break;
    case "incoming":
      if (idleTooLong(st.lastActivityAt)) {
        await expire(id, "The upload stopped and expired.");
        await storage.deleteUpload(id);
      } else {
        await run(
          `UPDATE raw_upload_attempts SET status = 'uploading', updated_at = NOW()
            WHERE upload_id = :id AND status = 'initiated'`,
          { id }
        );
      }
      break;
    case "awaiting_decision": {
      const reply = await processStorageEvent(id, {
        event: "verified",
        size: st.size,
        sha256: st.sha256,
      });
      await storage.sendDecision(id, reply);
      break;
    }
    case "committed": {
      const reply = await processStorageEvent(id, {
        event: "committed",
        size: st.size,
        sha256: st.sha256,
      });
      await storage.sendAck(id, reply);
      break;
    }
    case "rejecting":
      await processStorageEvent(id, { event: "failed", reason: st.reason });
      await storage.sendAck(id);
      break;
    case "failed": // parked on Zodiac for an admin
      await processStorageEvent(id, {
        event: "failed",
        reason: "storage_error",
      });
      break;
    default:
      // verifying / committing / discarding / done: Zodiac is busy (or
      // finished a discard) — check again next run.
      break;
  }
  await touch(id);
  return st.phase;
};

// A finished-in-REN attempt (cancelled/failed/expired): make sure Zodiac
// drops whatever it still holds. Never touches committed objects REN kept.
const cleanUpFinished = async (a) => {
  const id = a.upload_id;
  const st = await storage.getUpload(id);
  if (st.phase === "incoming") {
    await storage.deleteUpload(id);
  } else if (st.phase === "awaiting_decision") {
    await storage.sendDecision(id, { decision: "discard", reason: a.status });
  } else if (st.phase === "committed") {
    await storage.sendAck(id, { action: "discard", reason: a.status });
  } else if (st.phase === "rejecting") {
    await storage.sendAck(id);
  }
  await touch(id); // cleaned up → skipped next time
  return st.phase;
};

let running = false;

// One full pass. Returns a short summary (used by the one-shot script too).
const reconcileOnce = async () => {
  if (running) return { skipped: true };
  running = true;
  const summary = { active: 0, cleaned: 0, errors: 0 };
  try {
    const active = await q(
      `SELECT upload_id, status, updated_at FROM raw_upload_attempts
        WHERE status IN (:active)
          AND updated_at < NOW() - (:minAge * INTERVAL '1 millisecond')
        ORDER BY updated_at LIMIT ${BATCH}`,
      { active: ACTIVE, minAge: MIN_AGE_MS }
    );
    for (const a of active) {
      try {
        const phase = await reconcileActive(a);
        summary.active++;
        console.log(`reconcile ${a.upload_id}: Zodiac says ${phase}`);
      } catch (e) {
        summary.errors++;
        console.warn(`reconcile ${a.upload_id} failed (will retry):`, e.message);
      }
    }
    const finished = await q(
      `SELECT upload_id, status FROM raw_upload_attempts
        WHERE status IN ('cancelled','failed','expired')
          AND (last_checked_at IS NULL OR last_checked_at < completed_at)
        ORDER BY completed_at LIMIT ${BATCH}`
    );
    for (const a of finished) {
      try {
        const phase = await cleanUpFinished(a);
        summary.cleaned++;
        console.log(`cleanup ${a.upload_id} (${a.status}): Zodiac had ${phase}`);
      } catch (e) {
        summary.errors++;
        console.warn(`cleanup ${a.upload_id} failed (will retry):`, e.message);
      }
    }
  } finally {
    running = false;
  }
  return summary;
};

const startRawReconciler = () => {
  if (!INTERVAL_MS) {
    return console.log("raw reconciler: off (RAW_RECONCILE_INTERVAL_MS=0)");
  }
  if (!storage.configured()) {
    return console.log(
      "raw reconciler: off (no STORAGE_INTERNAL_URL / STORAGE_PUBLIC_URL)"
    );
  }
  console.log(
    `raw reconciler: every ${INTERVAL_MS / 1000}s (min age ${MIN_AGE_MS / 1000}s)`
  );
  setInterval(
    () =>
      reconcileOnce().catch((e) => console.error("raw reconciler:", e.message)),
    INTERVAL_MS
  );
};

module.exports = { reconcileOnce, startRawReconciler };
