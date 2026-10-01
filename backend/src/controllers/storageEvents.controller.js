// Events from the Zodiac storage API about one raw ZIP upload. Idempotent and
// forward-only: Zodiac may resend any event (outbox retries, reconciliation).
//   started   → initiated → uploading
//   verified  → REN decides commit | discard
//   committed → one transaction: raw_objects + attempt complete + mapping
//   failed    → attempt failed (safe message)
// raw_id = upload_id (deterministic, so a repeated "verified" gets the same
// answer and Zodiac always moves the file to the same path).
const { sequelize } = require("../config/database");
const { HttpError, UUID_RE } = require("../lib/uploadAccess");

const ACTIVE = ["initiated", "uploading", "verifying"];
const EDITABLE = ["draft", "changes_requested"];
const SHA_RE = /^[0-9a-f]{64}$/;

// Zodiac sends a reason code; users only ever see these fixed sentences.
const FAILURE_MESSAGES = {
  not_zip: "The file is not a ZIP archive.",
  size_mismatch: "The uploaded file size did not match the expected size.",
  storage_error: "The storage server could not save the file.",
};
const failureMessage = (code) =>
  FAILURE_MESSAGES[code] || "The upload could not be completed.";

const zipKey = (internalId, rawId) => `${internalId}/raw/${rawId}/source.zip`;

// Lock the attempt row and read its submission + dataset.
const lockAttempt = async (uploadId, t) => {
  const rows = await sequelize.query(
    `SELECT a.upload_id, a.status, a.expected_size, a.original_filename, a.raw_id,
            s.id AS submission_pk, s.submission_id, s.status AS submission_status,
            s.dataset_registry_id
       FROM raw_upload_attempts a
       JOIN submissions s ON s.submission_id = a.submission_id
      WHERE a.upload_id = :uid
      FOR UPDATE OF a`,
    {
      replacements: { uid: uploadId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t,
    }
  );
  if (!rows[0]) throw new HttpError(404, { error: "Unknown upload." });
  return rows[0];
};

const markFailed = (uploadId, message, t) =>
  sequelize.query(
    `UPDATE raw_upload_attempts
        SET status = 'failed', error = :msg, completed_at = NOW(), updated_at = NOW()
      WHERE upload_id = :uid AND status IN (:active)`,
    {
      replacements: { uid: uploadId, msg: message, active: ACTIVE },
      transaction: t,
    }
  );

// size + sha256 sent by Zodiac must match what this upload expected.
const checkFile = (a, body) => {
  const size = Number(body.size);
  if (!Number.isSafeInteger(size) || !SHA_RE.test(String(body.sha256 || ""))) {
    throw new HttpError(400, { error: "size and sha256 are required." });
  }
  return {
    size,
    sha256: body.sha256,
    sizeOk: size === Number(a.expected_size),
  };
};

const onStarted = async (a, body, t) => {
  await sequelize.query(
    `UPDATE raw_upload_attempts SET status = 'uploading', updated_at = NOW()
      WHERE upload_id = :uid AND status = 'initiated'`,
    { replacements: { uid: a.upload_id }, transaction: t }
  );
  return { ok: true };
};

const onVerified = async (a, body, t) => {
  if (a.status === "complete") {
    // Already committed earlier — repeat the same answer.
    return {
      decision: "commit",
      rawId: a.raw_id,
      storageKey: zipKey(a.dataset_registry_id, a.raw_id),
    };
  }
  if (!ACTIVE.includes(a.status)) {
    // cancelled / failed / expired
    return { decision: "discard", reason: `upload is ${a.status}` };
  }
  const { sizeOk } = checkFile(a, body);
  if (!sizeOk) {
    await markFailed(a.upload_id, failureMessage("size_mismatch"), t);
    return { decision: "discard", reason: "size_mismatch" };
  }
  if (!EDITABLE.includes(a.submission_status)) {
    await markFailed(
      a.upload_id,
      "The submission was locked before the upload finished.",
      t
    );
    return { decision: "discard", reason: "submission_locked" };
  }
  await sequelize.query(
    `UPDATE raw_upload_attempts SET status = 'verifying', updated_at = NOW()
      WHERE upload_id = :uid AND status IN ('initiated','uploading')`,
    { replacements: { uid: a.upload_id }, transaction: t }
  );
  const rawId = a.upload_id; // deterministic: same answer every time
  return {
    decision: "commit",
    rawId,
    storageKey: zipKey(a.dataset_registry_id, rawId),
  };
};

const onCommitted = async (a, body, t) => {
  const { size, sha256, sizeOk } = checkFile(a, body);
  const rawId = a.upload_id;

  if (a.status === "complete") {
    // Repeat: confirm it's the same file, change nothing.
    const [obj] = await sequelize.query(
      `SELECT sha256 FROM raw_objects WHERE raw_id = :rid`,
      {
        replacements: { rid: a.raw_id },
        type: sequelize.QueryTypes.SELECT,
        transaction: t,
      }
    );
    if (obj && obj.sha256 !== sha256) {
      throw new HttpError(409, {
        error: "Upload already completed with a different file.",
      });
    }
    return { action: "keep" };
  }
  if (!ACTIVE.includes(a.status)) {
    // e.g. the user cancelled after REN said "commit" — Zodiac deletes the file.
    return { action: "discard", reason: `upload is ${a.status}` };
  }
  if (!sizeOk) {
    await markFailed(a.upload_id, failureMessage("size_mismatch"), t);
    return { action: "discard", reason: "size_mismatch" };
  }

  // ONE transaction: the object, the finished attempt, and the version mapping.
  await sequelize.query(
    `INSERT INTO raw_objects
       (raw_id, dataset_registry_id, zip_storage_key, original_filename,
        size_bytes, sha256, created_at, updated_at)
     VALUES (:rid, :iid, :key, :name, :size, :sha, NOW(), NOW())`,
    {
      replacements: {
        rid: rawId,
        iid: a.dataset_registry_id,
        key: zipKey(a.dataset_registry_id, rawId),
        name: a.original_filename,
        size,
        sha: sha256,
      },
      transaction: t,
    }
  );
  await sequelize.query(
    `UPDATE raw_upload_attempts
        SET status = 'complete', raw_id = :rid, error = NULL,
            completed_at = NOW(), updated_at = NOW()
      WHERE upload_id = :uid`,
    { replacements: { rid: rawId, uid: a.upload_id }, transaction: t }
  );
  // Replace (or create) this version's raw ZIP. The previous object, if any,
  // becomes unmapped and is left for the cleanup job.
  await sequelize.query(
    `INSERT INTO submission_raw_files (submission_id, raw_id, created_at)
     VALUES (:sid, :rid, NOW())
     ON CONFLICT (submission_id) DO UPDATE SET raw_id = EXCLUDED.raw_id, created_at = NOW()`,
    { replacements: { sid: a.submission_id, rid: rawId }, transaction: t }
  );
  await sequelize.query(
    `UPDATE submissions SET raw_zip_expected = true, updated_at = NOW() WHERE id = :id`,
    { replacements: { id: a.submission_pk }, transaction: t }
  );
  return { action: "keep" };
};

const onFailed = async (a, body, t) => {
  await markFailed(a.upload_id, failureMessage(String(body.reason || "")), t);
  return { ok: true };
};

const HANDLERS = {
  started: onStarted,
  verified: onVerified,
  committed: onCommitted,
  failed: onFailed,
};

// POST /api/v1/internal/storage/uploads/:uploadId/events  {event, ...}
const handleUploadEvent = async (req, res) => {
  try {
    const uploadId = String(req.params.uploadId);
    if (!UUID_RE.test(uploadId)) {
      throw new HttpError(404, { error: "Unknown upload." });
    }
    const body = req.body || {};
    const handler = HANDLERS[body.event];
    if (!handler) throw new HttpError(400, { error: "Unknown event." });

    const out = await sequelize.transaction(async (t) => {
      const a = await lockAttempt(uploadId, t);
      return handler(a, body, t);
    });
    res.json(out);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    console.error("Storage event failed:", err.message);
    // 5xx → Zodiac's outbox retries later.
    res.status(500).json({ error: "Storage event failed." });
  }
};

module.exports = { handleUploadEvent };
