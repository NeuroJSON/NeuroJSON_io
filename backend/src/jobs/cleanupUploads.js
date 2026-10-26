// Upload cleanup, run on a timer. Assumes ONE backend process, like the
// reconciler (add a Postgres advisory lock if that changes).
//   1) drafts idle for DRAFT_EXPIRE_DAYS → 'expired' (row kept for history;
//      sandbox JSON removed; preferred id released if never published).
//      A published version is read from its archive copy, never the sandbox.
//   2) unused raw ZIPs → deleted on Zodiac (not built yet)
const { sequelize } = require("../config/database");
const { DRAFT_EXPIRE_DAYS } = require("../lib/draftExpiry");
const { deleteSandboxDoc } = require("../lib/sandbox");

const INTERVAL_MS = Number(process.env.UPLOAD_CLEANUP_INTERVAL_MS ?? 3600000); // 1 h; 0 = off
const BATCH = 50;
const ACTIVE = ["initiated", "uploading", "verifying"];

// One draft, in one transaction. false = no longer due (e.g. Keep was clicked).
const expireDraft = (id) =>
  sequelize.transaction(async (t) => {
    // Locks the dataset row too: an upload at the same moment waits, then
    // sees the new state.
    const [s] = await sequelize.query(
      `SELECT s.id, s.submission_id, s.dataset_registry_id
         FROM submissions s
         JOIN dataset_registry r ON r.internal_id = s.dataset_registry_id
        WHERE s.id = :id AND s.status = 'draft'
          AND s.last_activity_at < NOW() - (:days * INTERVAL '1 day')
        FOR UPDATE OF s, r`,
      {
        replacements: { id, days: DRAFT_EXPIRE_DAYS },
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );
    if (!s) return false;
    // Sandbox first: if CouchDB fails, this rolls back and the next run retries.
    // (A published version is read from its archive copy, not the sandbox.)
    await deleteSandboxDoc(s.dataset_registry_id);

    const run = (sql) =>
      sequelize.query(sql, {
        replacements: {
          id: s.id,
          sid: s.submission_id,
          iid: s.dataset_registry_id,
          active: ACTIVE,
        },
        transaction: t,
      });
    await run(
      `UPDATE submissions
          SET status = 'expired', expired_at = NOW(), updated_at = NOW()
        WHERE id = :id`
    );
    // Unfinished ZIP uploads end too; the reconciler then makes Zodiac drop
    // what it still holds.
    await run(
      `UPDATE raw_upload_attempts
          SET status = 'expired', error = 'The draft expired.',
              completed_at = NOW(), updated_at = NOW()
        WHERE submission_id = :sid AND status IN (:active)`
    );
    // Never published → free the preferred id for others.
    await run(
      `UPDATE dataset_registry
          SET requested_dataset_id = NULL, updated_at = NOW()
        WHERE internal_id = :iid AND dataset_id IS NULL`
    );
    return true;
  });

const expireIdleDrafts = async (summary) => {
  const due = await sequelize.query(
    `SELECT id FROM submissions
      WHERE status = 'draft'
        AND last_activity_at < NOW() - (:days * INTERVAL '1 day')
      ORDER BY last_activity_at LIMIT ${BATCH}`,
    {
      replacements: { days: DRAFT_EXPIRE_DAYS },
      type: sequelize.QueryTypes.SELECT,
    }
  );
  for (const { id } of due) {
    try {
      if (await expireDraft(id)) summary.expired++;
    } catch (e) {
      summary.errors++;
      console.warn(
        `cleanup: expiring submission ${id} failed (will retry):`,
        e.message
      );
    }
  }
};

let running = false;

// One full pass. Returns a short summary (used by the one-shot script too).
const cleanupOnce = async () => {
  if (running) return { skipped: true };
  running = true;
  const summary = { expired: 0, errors: 0 };
  try {
    await expireIdleDrafts(summary);
  } finally {
    running = false;
  }
  return summary;
};

const startUploadCleanup = () => {
  if (!INTERVAL_MS) {
    return console.log("upload cleanup: off (UPLOAD_CLEANUP_INTERVAL_MS=0)");
  }
  console.log(`upload cleanup: every ${INTERVAL_MS / 1000}s`);
  setInterval(
    () =>
      cleanupOnce().catch((e) => console.error("upload cleanup:", e.message)),
    INTERVAL_MS
  );
};

module.exports = { cleanupOnce, startUploadCleanup };
