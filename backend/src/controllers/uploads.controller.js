const axios = require("axios");
const crypto = require("crypto");
const { sequelize } = require("../config/database");

// Upload a JSON dataset into the sandbox CouchDB db for review, tracked in
// PostgreSQL. See migration 20260921170000-create-submissions.
//
// Identity model:
//   dataset_id   = stable NeuroJSON id (njds000001), from neurojson_dataset_seq;
//                  ALSO the CouchDB _id in the sandbox db.
//   submission_id= UUID per review workflow, PostgreSQL only.
// The sandbox holds the latest working copy at _id = dataset_id; a re-upload
// full-replaces it (handled by the `timestamp` update handler on the db).
//
// Upload target + creds come from .env (never exposed to the client). Basic
// auth only attached if upload creds are set (sandbox allows anonymous writes).
const UPLOAD_URL = process.env.COUCHDB_UPLOAD_URL || process.env.COUCHDB_URL;
const UPLOAD_DB = process.env.COUCHDB_UPLOAD_DB;

const buildHeaders = () => {
  const headers = { "Content-Type": "application/json" };
  const user = process.env.COUCHDB_UPLOAD_USER;
  const pass = process.env.COUCHDB_UPLOAD_PASSWORD;
  if (user && pass) {
    headers.Authorization =
      "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  }
  return headers;
};

// Errors thrown inside the transaction to signal a specific HTTP response.
class HttpError extends Error {
  constructor(status, body) {
    super(typeof body === "string" ? body : body.error || "error");
    this.status = status;
    this.body = typeof body === "string" ? { error: body } : body;
  }
}

const formatDatasetId = (n) => `njds${String(n).padStart(6, "0")}`;

const createUpload = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res
        .status(400)
        .json({ error: "Request body must be a JSON object" });
    }

    // Strip top-level CouchDB-reserved fields (_id, _rev, ...). The sandbox
    // doc address is controlled by dataset_id, never the uploaded file. (The
    // update handler also deletes these, so this is belt-and-suspenders.)
    const clean = {};
    for (const [key, value] of Object.entries(body)) {
      if (!key.startsWith("_")) clean[key] = value;
    }

    // dataset_name: dataset_description.json.Name → user-provided → else reject.
    const dd = clean["dataset_description.json"];
    const nameFromDoc =
      dd && typeof dd === "object" && !Array.isArray(dd) ? dd.Name : undefined;
    const datasetName = nameFromDoc || req.query.datasetName;
    if (!datasetName) {
      return res.status(400).json({
        error:
          "Dataset name required: provide dataset_description.json.Name in the file or a datasetName parameter.",
      });
    }
    // Normalize: ensure the stored doc carries the name.
    if (!nameFromDoc) {
      if (!dd || typeof dd !== "object" || Array.isArray(dd)) {
        clean["dataset_description.json"] = {};
      }
      clean["dataset_description.json"].Name = datasetName;
    }

    const providedDatasetId = req.query.datasetId
      ? String(req.query.datasetId)
      : null;
    const confirm = req.query.confirm === "true";
    const userId = req.user.id;

    // Keep the PostgreSQL transaction open across the CouchDB write: commit on
    // success, roll back if the upload fails. Acceptable at low upload volume;
    // simple and consistent. (Sequence values consumed on rollback are not
    // reused — harmless id gaps.)
    const result = await sequelize.transaction(async (t) => {
      let datasetId;
      let submissionId;

      if (!providedDatasetId) {
        // NEW dataset → allocate an id + open a workflow.
        const [seqRows] = await sequelize.query(
          "SELECT nextval('neurojson_dataset_seq') AS n",
          { transaction: t }
        );
        datasetId = formatDatasetId(seqRows[0].n);
        submissionId = crypto.randomUUID();
        await sequelize.query(
          `INSERT INTO submissions
             (submission_id, dataset_id, dataset_name, user_id, status, created_at, updated_at)
           VALUES (:sid, :did, :name, :uid, 'pending', NOW(), NOW())`,
          {
            replacements: {
              sid: submissionId,
              did: datasetId,
              name: datasetName,
              uid: userId,
            },
            transaction: t,
          }
        );
      } else {
        // UPDATE to an existing dataset.
        datasetId = providedDatasetId;
        const subs = await sequelize.query(
          `SELECT id, submission_id, user_id, status
             FROM submissions
            WHERE dataset_id = :did
            ORDER BY created_at DESC
            FOR UPDATE`,
          {
            replacements: { did: datasetId },
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );
        if (subs.length === 0) {
          throw new HttpError(400, { error: "Unknown dataset_id" });
        }
        // Owner-only: dataset belongs to whoever created it.
        if (subs.some((s) => s.user_id !== userId)) {
          throw new HttpError(403, {
            error: "This dataset belongs to another user",
          });
        }

        const pending = subs.find((s) => s.status === "pending");
        if (pending) {
          // Re-upload of the active working copy → reuse the workflow.
          submissionId = pending.submission_id;
          await sequelize.query(
            `UPDATE submissions
                SET dataset_name = :name, updated_at = NOW()
              WHERE id = :id`,
            {
              replacements: { name: datasetName, id: pending.id },
              transaction: t,
            }
          );
        } else {
          // No open (pending) workflow — decide by the latest status.
          const latest = subs[0];

          if (latest.status === "approved") {
            // Still an ACTIVE workflow (awaiting promotion) — block; do not
            // open a second workflow. Not confirmable.
            throw new HttpError(409, {
              code: "DATASET_ALREADY_APPROVED",
              dataset_id: datasetId,
              status: "approved",
              requiresConfirmation: false,
              message:
                "This dataset has been approved and is awaiting promotion.",
            });
          }

          // promoted or rejected → confirmable resubmission.
          if (!confirm) {
            const promoted = latest.status === "promoted";
            throw new HttpError(409, {
              code: promoted
                ? "DATASET_ALREADY_PROMOTED"
                : "PREVIOUS_SUBMISSION_REJECTED",
              dataset_id: datasetId,
              status: latest.status,
              requiresConfirmation: true,
              message: promoted
                ? `Dataset ${datasetId} is already promoted. Confirm to submit an updated version for a new review.`
                : `The previous submission for ${datasetId} was rejected. Confirm to resubmit for review.`,
            });
          }

          // Confirmed → open a new review workflow (same dataset_id).
          submissionId = crypto.randomUUID();
          await sequelize.query(
            `INSERT INTO submissions
               (submission_id, dataset_id, dataset_name, user_id, status, created_at, updated_at)
             VALUES (:sid, :did, :name, :uid, 'pending', NOW(), NOW())`,
            {
              replacements: {
                sid: submissionId,
                did: datasetId,
                name: datasetName,
                uid: userId,
              },
              transaction: t,
            }
          );
        }
      }

      // Full-replace the sandbox working copy (handler keyed by dataset_id).
      // If this throws, the transaction rolls back → no submission row leaks.
      const url = `${UPLOAD_URL}/${UPLOAD_DB}/_design/qq/_update/timestamp/${encodeURIComponent(
        datasetId
      )}`;
      await axios.put(url, clean, { headers: buildHeaders() });

      return { dataset_id: datasetId, submission_id: submissionId };
    });

    res.status(201).json({ ok: true, status: "pending", ...result });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json(err.body);
    }
    console.error(
      "Upload failed:",
      err.response?.status,
      err.message,
      "| couch:",
      JSON.stringify(err.response?.data)
    );
    res.status(err.response?.status || 500).json({
      error: "Upload failed",
      detail: err.response?.data || err.message,
    });
  }
};

// List the caller's own submissions for the dashboard "Uploads" tab.
const listMyUploads = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT dataset_id, dataset_name, status, created_at, updated_at,
              reviewed_at, promoted_db, promoted_at
         FROM submissions
        WHERE user_id = :uid
        ORDER BY created_at DESC`,
      { replacements: { uid: req.user.id }, type: sequelize.QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (err) {
    console.error("List uploads failed:", err.message);
    res.status(500).json({ error: "Failed to list uploads" });
  }
};

module.exports = { createUpload, listMyUploads };
