// Raw ZIP upload sessions (owner side). REN only authorizes and tracks state;
// the bytes go browser → Zodiac storage API via tus with a short-lived token.
// Completion (Zodiac events + raw_objects creation) is handled separately.
const crypto = require("crypto");
const { sequelize } = require("../config/database");
const {
  HttpError,
  UUID_RE,
  loadOwnedRegistry,
} = require("../lib/uploadAccess");
const { signUploadToken } = require("../lib/uploadTokens");

const MAX_UPLOAD_BYTES = Number(
  process.env.RAW_MAX_UPLOAD_BYTES || 536870912000
); // 500 GB
const CHUNK_BYTES = Number(process.env.RAW_CHUNK_BYTES || 67108864); // 64 MB
const ACTIVE = ["initiated", "uploading", "verifying"];
const EDITABLE = ["draft", "changes_requested"];

const sendError = (res, err, label) => {
  if (err instanceof HttpError) return res.status(err.status).json(err.body);
  console.error(`${label} failed:`, err.message);
  res.status(500).json({ error: `${label} failed.` });
};

// Storage endpoint the browser uploads to (env only; differs dev vs prod).
const storageEndpoint = () => {
  const base = process.env.STORAGE_PUBLIC_URL;
  if (!base) {
    throw new HttpError(503, {
      error: "Raw data upload is not configured on this server.",
    });
  }
  return `${base.replace(/\/+$/, "")}/files`;
};

// Display filename only — never used for paths. Basename, trimmed, .zip.
const cleanFilename = (raw) => {
  const name = String(raw || "")
    .split(/[\\/]/)
    .pop()
    .trim();
  if (!name || name.length > 255) {
    throw new HttpError(400, { error: "Invalid file name." });
  }
  if (!/\.zip$/i.test(name)) {
    throw new HttpError(400, { error: "Raw data must be a .zip file." });
  }
  return name;
};

const cleanSize = (raw) => {
  const size = Number(raw);
  if (!Number.isSafeInteger(size) || size <= 0) {
    throw new HttpError(400, { error: "Invalid file size." });
  }
  if (size > MAX_UPLOAD_BYTES) {
    throw new HttpError(413, {
      code: "FILE_TOO_LARGE",
      error: `The file is too large (max ${Math.floor(
        MAX_UPLOAD_BYTES / 1e9
      )} GB).`,
    });
  }
  return size;
};

// Latest submission (cycle) of the dataset, locked for this transaction.
const lockLatestSubmission = async (internalId, t) => {
  const rows = await sequelize.query(
    `SELECT id, submission_id, status FROM submissions
      WHERE dataset_registry_id = :iid ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
    {
      replacements: { iid: internalId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t,
    }
  );
  if (!rows[0]) throw new HttpError(404, { error: "No submission found." });
  return rows[0];
};

const assertEditable = (sub) => {
  if (!EDITABLE.includes(sub.status)) {
    throw new HttpError(409, {
      code: "NOT_EDITABLE",
      error:
        "Raw data can only be changed while the submission is a draft or has requested changes.",
    });
  }
};

const tokenFor = (req, reg, sub, attempt) =>
  signUploadToken({
    userId: req.user.id,
    uploadId: attempt.upload_id,
    internalId: reg.internal_id,
    submissionId: sub.submission_id,
    expectedSize: Number(attempt.expected_size), // BIGINT comes back as a string
  });

// POST /api/v1/uploads/:internalId/raw  {filename, size}
// Start a raw ZIP upload, or resume the active one (same name + size).
const startRawUpload = async (req, res) => {
  try {
    const filename = cleanFilename(req.body?.filename);
    const size = cleanSize(req.body?.size);
    const endpoint = storageEndpoint();
    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );

    const out = await sequelize.transaction(async (t) => {
      const sub = await lockLatestSubmission(reg.internal_id, t);
      assertEditable(sub);

      const active = await sequelize.query(
        `SELECT upload_id, original_filename, expected_size FROM raw_upload_attempts
          WHERE submission_id = :sid AND status IN (:active)`,
        {
          replacements: { sid: sub.submission_id, active: ACTIVE },
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );
      if (active[0]) {
        const a = active[0];
        if (
          a.original_filename === filename &&
          Number(a.expected_size) === size
        ) {
          return { sub, attempt: a, resumed: true }; // same file → resume
        }
        throw new HttpError(409, {
          code: "ACTIVE_UPLOAD_EXISTS",
          error:
            "Another raw data upload is in progress. Resume it with the same file, or cancel it first.",
          upload: {
            uploadId: a.upload_id,
            filename: a.original_filename,
            size: Number(a.expected_size),
          },
        });
      }

      const attempt = {
        upload_id: crypto.randomUUID(),
        original_filename: filename,
        expected_size: size,
      };
      await sequelize.query(
        `INSERT INTO raw_upload_attempts
           (upload_id, submission_id, status, original_filename, expected_size, uploaded_by, created_at, updated_at)
         VALUES (:uid, :sid, 'initiated', :name, :size, :by, NOW(), NOW())`,
        {
          replacements: {
            uid: attempt.upload_id,
            sid: sub.submission_id,
            name: filename,
            size,
            by: req.user.id,
          },
          transaction: t,
        }
      );
      // Starting a raw upload means this version includes raw data.
      await sequelize.query(
        `UPDATE submissions SET raw_zip_expected = true, updated_at = NOW() WHERE id = :id`,
        { replacements: { id: sub.id }, transaction: t }
      );
      return { sub, attempt, resumed: false };
    });

    const { token, expiresAt } = tokenFor(req, reg, out.sub, out.attempt);
    res.status(out.resumed ? 200 : 201).json({
      uploadId: out.attempt.upload_id,
      endpoint,
      token,
      expiresAt,
      chunkSize: CHUNK_BYTES,
      resumed: out.resumed,
    });
  } catch (err) {
    // Unique index backstop: two starts at the same moment.
    if (err.original?.code === "23505") {
      return res.status(409).json({
        code: "ACTIVE_UPLOAD_EXISTS",
        error: "Another raw data upload is in progress.",
      });
    }
    sendError(res, err, "Start raw upload");
  }
};

// Load an attempt that belongs to this dataset (owner already checked).
const loadAttempt = async (reg, uploadId, t) => {
  if (!UUID_RE.test(uploadId)) {
    throw new HttpError(404, { error: "Upload not found." });
  }
  const rows = await sequelize.query(
    `SELECT a.upload_id, a.status, a.expected_size, a.original_filename,
            s.submission_id, s.status AS submission_status
       FROM raw_upload_attempts a
       JOIN submissions s ON s.submission_id = a.submission_id
      WHERE a.upload_id = :uid AND s.dataset_registry_id = :iid`,
    {
      replacements: { uid: uploadId, iid: reg.internal_id },
      type: sequelize.QueryTypes.SELECT,
      transaction: t,
    }
  );
  if (!rows[0]) throw new HttpError(404, { error: "Upload not found." });
  return rows[0];
};

// POST /api/v1/uploads/:internalId/raw/:uploadId/token — fresh token for a
// long-running upload.
const refreshRawUploadToken = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );
    const a = await loadAttempt(reg, String(req.params.uploadId));
    if (!ACTIVE.includes(a.status)) {
      throw new HttpError(409, {
        code: "UPLOAD_NOT_ACTIVE",
        error: "This upload is no longer active.",
      });
    }
    if (!EDITABLE.includes(a.submission_status)) {
      throw new HttpError(409, {
        code: "NOT_EDITABLE",
        error: "The submission can no longer be changed.",
      });
    }
    const { token, expiresAt } = tokenFor(
      req,
      reg,
      { submission_id: a.submission_id },
      a
    );
    res.json({ token, expiresAt });
  } catch (err) {
    sendError(res, err, "Refresh upload token");
  }
};

// GET /api/v1/uploads/:internalId/raw — current raw object + active/last attempt.
const getRawStatus = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );
    const subs = await sequelize.query(
      `SELECT submission_id, status, raw_zip_expected FROM submissions
        WHERE dataset_registry_id = :iid ORDER BY created_at DESC LIMIT 1`,
      { replacements: { iid: reg.internal_id }, type: sequelize.QueryTypes.SELECT }
    );
    const sub = subs[0];
    if (!sub) {
      return res.json({
        rawZipExpected: false,
        editable: false,
        current: null,
        activeUpload: null,
        lastUpload: null,
      });
    }

    const current = await sequelize.query(
      `SELECT o.raw_id, o.original_filename, o.size_bytes, o.sha256,
              o.extraction_status, o.created_at,
              -- carried forward = the upload that made this object belongs
              -- to a different version (exact; not a timestamp guess)
              (a.submission_id IS NOT NULL AND a.submission_id <> f.submission_id)
                AS carried_forward
         FROM submission_raw_files f
         JOIN raw_objects o ON o.raw_id = f.raw_id
         LEFT JOIN raw_upload_attempts a ON a.raw_id = o.raw_id
        WHERE f.submission_id = :sid`,
      {
        replacements: { sid: sub.submission_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const attempts = await sequelize.query(
      `SELECT upload_id, status, original_filename, expected_size, error,
              created_at, updated_at, completed_at
         FROM raw_upload_attempts WHERE submission_id = :sid
        ORDER BY created_at DESC LIMIT 1`,
      {
        replacements: { sid: sub.submission_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const last = attempts[0] || null;
    const shape = (a) =>
      a && {
        uploadId: a.upload_id,
        status: a.status,
        filename: a.original_filename,
        size: Number(a.expected_size),
        error: a.error || null,
        createdAt: a.created_at,
        updatedAt: a.updated_at,
        completedAt: a.completed_at,
      };
    const c = current[0];
    res.json({
      rawZipExpected: !!sub.raw_zip_expected,
      editable: EDITABLE.includes(sub.status),
      // Storage keys stay server-side; only display facts are returned.
      current: c
        ? {
            rawId: c.raw_id,
            filename: c.original_filename,
            size: Number(c.size_bytes),
            sha256: c.sha256,
            extractionStatus: c.extraction_status,
            carriedForward: !!c.carried_forward,
            uploadedAt: c.created_at,
          }
        : null,
      activeUpload: last && ACTIVE.includes(last.status) ? shape(last) : null,
      // "Last upload failed/cancelled/expired" (the current ZIP is untouched).
      lastUpload:
        last && ["failed", "cancelled", "expired"].includes(last.status)
          ? shape(last)
          : null,
    });
  } catch (err) {
    sendError(res, err, "Load raw data status");
  }
};

// DELETE /api/v1/uploads/:internalId/raw/:uploadId — cancel an active upload.
// One conditional UPDATE, so it can't race the completion step: if REN has
// already committed it, the row is 'complete' and this returns 409.
const cancelRawUpload = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );
    const a = await loadAttempt(reg, String(req.params.uploadId));
    const rows = await sequelize.query(
      `UPDATE raw_upload_attempts
          SET status = 'cancelled', completed_at = NOW(), updated_at = NOW()
        WHERE upload_id = :uid AND status IN (:active)
      RETURNING upload_id`,
      {
        replacements: { uid: a.upload_id, active: ACTIVE },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    if (!rows.length) {
      throw new HttpError(409, {
        code: "UPLOAD_NOT_ACTIVE",
        error: "This upload has already finished.",
      });
    }
    // Zodiac's partial data is removed by the reconciliation/cleanup step;
    // the browser also sends a tus DELETE when the user cancels.
    res.json({ status: "cancelled" });
  } catch (err) {
    sendError(res, err, "Cancel raw upload");
  }
};

// PATCH /api/v1/uploads/:internalId/raw/expected  {expected: boolean}
// "This dataset includes raw data". Can only be turned off when there is no
// raw ZIP and no active upload.
const setRawExpected = async (req, res) => {
  try {
    if (typeof req.body?.expected !== "boolean") {
      throw new HttpError(400, { error: "`expected` must be true or false." });
    }
    const expected = req.body.expected;
    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );
    await sequelize.transaction(async (t) => {
      const sub = await lockLatestSubmission(reg.internal_id, t);
      assertEditable(sub);
      if (!expected) {
        const [{ busy }] = await sequelize.query(
          `SELECT (EXISTS (SELECT 1 FROM submission_raw_files WHERE submission_id = :sid)
                OR EXISTS (SELECT 1 FROM raw_upload_attempts
                            WHERE submission_id = :sid AND status IN (:active))) AS busy`,
          {
            replacements: { sid: sub.submission_id, active: ACTIVE },
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );
        if (busy) {
          throw new HttpError(409, {
            code: "RAW_DATA_PRESENT",
            error:
              "This version already has raw data (or an upload in progress), so it can't be unmarked.",
          });
        }
      }
      await sequelize.query(
        `UPDATE submissions SET raw_zip_expected = :e, updated_at = NOW() WHERE id = :id`,
        { replacements: { e: expected, id: sub.id }, transaction: t }
      );
    });
    res.json({ rawZipExpected: expected });
  } catch (err) {
    sendError(res, err, "Update raw data setting");
  }
};

module.exports = {
  startRawUpload,
  refreshRawUploadToken,
  getRawStatus,
  cancelRawUpload,
  setRawExpected,
};
