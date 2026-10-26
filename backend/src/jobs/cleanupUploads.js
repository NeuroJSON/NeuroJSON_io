// Upload cleanup, run on a timer. Assumes ONE backend process, like the
// reconciler (add a Postgres advisory lock if that changes).
//   1) drafts idle for DRAFT_EXPIRE_DAYS → 'expired' (row kept for history;
//      sandbox JSON removed; preferred id released if never published).
//      A published version is read from its archive copy, never the sandbox.
//   2) unused raw ZIPs → deleted on Zodiac (row kept, zip_deleted_at set).
//      Unused = not linked to any version that still needs it (only
//      rejected/expired, or replaced). Only-expired → right away; otherwise
//      after RAW_CLEANUP_DAYS, so e.g. a rejected user can re-upload it.
const { sequelize } = require("../config/database");
const { DRAFT_EXPIRE_DAYS } = require("../lib/draftExpiry");
const { deleteSandboxDoc } = require("../lib/sandbox");
const storage = require("../lib/storageClient");

const INTERVAL_MS = Number(process.env.UPLOAD_CLEANUP_INTERVAL_MS ?? 3600000); // 1 h; 0 = off
const RAW_CLEANUP_DAYS = Number(process.env.RAW_CLEANUP_DAYS ?? 30);
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

const q = (sql, replacements, transaction) =>
  sequelize.query(sql, {
    replacements,
    transaction,
    type: sequelize.QueryTypes.SELECT,
  });

// Linked to a version that still needs it.
const USED = `EXISTS (SELECT 1 FROM submission_raw_files f
                        JOIN submissions s ON s.submission_id = f.submission_id
                       WHERE f.raw_id = o.raw_id
                         AND s.status NOT IN ('rejected','expired'))`;
// Linked, but only to expired drafts → no grace period (the draft already
// had its 30 days and the warning).
const ONLY_EXPIRED = `(EXISTS (SELECT 1 FROM submission_raw_files f WHERE f.raw_id = o.raw_id)
   AND NOT EXISTS (SELECT 1 FROM submission_raw_files f
                     JOIN submissions s ON s.submission_id = f.submission_id
                    WHERE f.raw_id = o.raw_id AND s.status <> 'expired'))`;
const LIVE = `o.delete_requested_at IS NULL AND o.zip_deleted_at IS NULL`;
const DUE = `${LIVE} AND o.storage_backend = 'zodiac' AND NOT ${USED}
   AND (${ONLY_EXPIRED} OR o.unused_since < NOW() - (:days * INTERVAL '1 day'))`;

const cleanUnusedZips = async (summary) => {
  // A) start / stop the grace clock
  await sequelize.query(
    `UPDATE raw_objects o SET unused_since = NOW(), updated_at = NOW()
      WHERE ${LIVE} AND o.unused_since IS NULL AND NOT ${USED}`
  );
  await sequelize.query(
    `UPDATE raw_objects o SET unused_since = NULL, updated_at = NOW()
      WHERE ${LIVE} AND o.unused_since IS NOT NULL AND ${USED}`
  );

  // B) due → mark for deletion. Locked and checked again, so dedup (which
  // locks the same row) can't reuse it at the same moment; once marked,
  // dedup skips it and stores a new copy instead.
  const due = await q(
    `SELECT o.raw_id FROM raw_objects o WHERE ${DUE} LIMIT ${BATCH}`,
    { days: RAW_CLEANUP_DAYS }
  );
  for (const { raw_id } of due) {
    await sequelize.transaction(async (t) => {
      const [o] = await q(
        `SELECT o.raw_id FROM raw_objects o
          WHERE o.raw_id = :rid AND ${DUE} FOR UPDATE`,
        { rid: raw_id, days: RAW_CLEANUP_DAYS },
        t
      );
      if (!o) return;
      await sequelize.query(
        `UPDATE raw_objects SET delete_requested_at = NOW(), updated_at = NOW()
          WHERE raw_id = :rid`,
        { replacements: { rid: raw_id }, transaction: t }
      );
      summary.zipsMarked++;
    });
  }

  // C) delete on Zodiac (also retries earlier failures), then record it.
  const toDelete = await q(
    `SELECT raw_id, dataset_registry_id FROM raw_objects
      WHERE delete_requested_at IS NOT NULL AND zip_deleted_at IS NULL
        AND storage_backend = 'zodiac'
      ORDER BY delete_requested_at LIMIT ${BATCH}`
  );
  for (const o of toDelete) {
    try {
      await storage.deleteObject(o.dataset_registry_id, o.raw_id);
      await sequelize.query(
        `UPDATE raw_objects SET zip_deleted_at = NOW(), updated_at = NOW()
          WHERE raw_id = :rid`,
        { replacements: { rid: o.raw_id } }
      );
      summary.zipsDeleted++;
    } catch (e) {
      summary.errors++;
      console.warn(
        `cleanup: deleting raw ${o.raw_id} failed (will retry):`,
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
  const summary = { expired: 0, zipsMarked: 0, zipsDeleted: 0, errors: 0 };
  try {
    await expireIdleDrafts(summary);
    if (storage.configured()) await cleanUnusedZips(summary);
    else console.log("upload cleanup: ZIP pass off (storage not configured)");
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
