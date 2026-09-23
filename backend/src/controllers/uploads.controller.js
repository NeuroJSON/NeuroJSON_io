const axios = require("axios");
const crypto = require("crypto");
const { sequelize } = require("../config/database");

// Upload a JSON dataset into the sandbox CouchDB db for review, tracked in
// PostgreSQL. See migrations create-dataset-registry / create-submissions /
// create-submission-comments.
//
// Identity model:
//   dataset_registry.internal_id = permanent logical-dataset id (UUID); also
//                                  the sandbox CouchDB _id. Lives forever.
//   dataset_registry.dataset_id  = FINAL public id, assigned only at promotion
//                                  (njds###### or the user's custom id).
//   submissions.submission_id    = one review cycle (UUID).
// The sandbox holds the latest working copy at _id = internal_id; a re-upload
// full-replaces it (the `timestamp` update handler on the db).
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

// Preferred public id rules (final availability is re-checked at promotion).
const REQUESTED_ID_RE = /^[a-z0-9][a-z0-9_-]{2,62}$/;
const validateRequestedId = (id) => {
  if (!REQUESTED_ID_RE.test(id)) {
    throw new HttpError(400, {
      error:
        "Preferred dataset ID must be 3–63 characters: lowercase letters, digits, hyphen or underscore, and cannot start with a hyphen or underscore.",
    });
  }
  if (id.startsWith("njds")) {
    throw new HttpError(400, {
      error:
        'Preferred dataset ID cannot start with "njds" (reserved for NeuroJSON-assigned IDs).',
    });
  }
};

const createUpload = async (req, res) => {
  try {
    const body = req.body;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return res
        .status(400)
        .json({ error: "Request body must be a JSON object" });
    }

    // Strip top-level CouchDB-reserved fields (_id, _rev, ...).
    const clean = {};
    for (const [key, value] of Object.entries(body)) {
      if (!key.startsWith("_")) clean[key] = value;
    }

    // dataset name: file's dataset_description.json.Name → ?datasetName → 400.
    const dd = clean["dataset_description.json"];
    const nameFromDoc =
      dd && typeof dd === "object" && !Array.isArray(dd) ? dd.Name : undefined;
    const datasetName = nameFromDoc || req.query.datasetName;
    if (!datasetName) {
      return res.status(400).json({ error: "Please enter a dataset name." });
    }
    if (!nameFromDoc) {
      if (!dd || typeof dd !== "object" || Array.isArray(dd)) {
        clean["dataset_description.json"] = {};
      }
      clean["dataset_description.json"].Name = datasetName;
    }

    const internalId = req.query.internalId
      ? String(req.query.internalId)
      : null;
    const requestedId = req.query.requestedDatasetId
      ? String(req.query.requestedDatasetId).trim()
      : null;
    const confirm = req.query.confirm === "true";
    const userId = req.user.id;

    if (requestedId) validateRequestedId(requestedId); // throws 400

    // Keep the PostgreSQL transaction open across the CouchDB write: commit on
    // success, roll back if the upload fails. Acceptable at low upload volume.
    const result = await sequelize.transaction(async (t) => {
      let registryId; // = internal_id (also the sandbox _id)
      let submissionId;

      if (!internalId) {
        // NEW logical dataset.
        if (requestedId) {
          const dup = await sequelize.query(
            "SELECT 1 FROM dataset_registry WHERE dataset_id = :id LIMIT 1",
            {
              replacements: { id: requestedId },
              type: sequelize.QueryTypes.SELECT,
              transaction: t,
            }
          );
          if (dup.length) {
            throw new HttpError(409, {
              code: "REQUESTED_ID_TAKEN",
              error: `The preferred ID "${requestedId}" is already in use.`,
            });
          }
        }
        registryId = crypto.randomUUID();
        await sequelize.query(
          `INSERT INTO dataset_registry
             (internal_id, dataset_id, requested_dataset_id, dataset_name, owner_user_id, created_at, updated_at)
           VALUES (:iid, NULL, :req, :name, :uid, NOW(), NOW())`,
          {
            replacements: {
              iid: registryId,
              req: requestedId,
              name: datasetName,
              uid: userId,
            },
            transaction: t,
          }
        );
        submissionId = crypto.randomUUID();
        await sequelize.query(
          `INSERT INTO submissions
             (submission_id, dataset_registry_id, status, created_at, updated_at)
           VALUES (:sid, :rid, 'pending', NOW(), NOW())`,
          {
            replacements: { sid: submissionId, rid: registryId },
            transaction: t,
          }
        );
      } else {
        // UPDATE existing logical dataset.
        registryId = internalId;
        const regs = await sequelize.query(
          `SELECT internal_id, owner_user_id FROM dataset_registry
            WHERE internal_id = :iid FOR UPDATE`,
          {
            replacements: { iid: registryId },
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );
        if (regs.length === 0) {
          throw new HttpError(400, { error: "Unknown dataset" });
        }
        if (regs[0].owner_user_id !== userId) {
          throw new HttpError(403, {
            error: "This dataset belongs to another user",
          });
        }

        // Registry holds the canonical name (+ optional preferred id).
        await sequelize.query(
          `UPDATE dataset_registry
              SET dataset_name = :name,
                  requested_dataset_id = COALESCE(:req, requested_dataset_id),
                  updated_at = NOW()
            WHERE internal_id = :iid`,
          {
            replacements: { name: datasetName, req: requestedId, iid: registryId },
            transaction: t,
          }
        );

        const subs = await sequelize.query(
          `SELECT id, submission_id, status FROM submissions
            WHERE dataset_registry_id = :rid
            ORDER BY created_at DESC FOR UPDATE`,
          {
            replacements: { rid: registryId },
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        );

        // Open = pending / changes_requested → reuse, reset to pending.
        const open = subs.find(
          (s) => s.status === "pending" || s.status === "changes_requested"
        );
        if (open) {
          submissionId = open.submission_id;
          await sequelize.query(
            `UPDATE submissions SET status='pending', updated_at=NOW() WHERE id=:id`,
            { replacements: { id: open.id }, transaction: t }
          );
        } else if (subs.length === 0) {
          // Defensive: registry with no cycle → start one.
          submissionId = crypto.randomUUID();
          await sequelize.query(
            `INSERT INTO submissions (submission_id, dataset_registry_id, status, created_at, updated_at)
             VALUES (:sid, :rid, 'pending', NOW(), NOW())`,
            {
              replacements: { sid: submissionId, rid: registryId },
              transaction: t,
            }
          );
        } else {
          const latest = subs[0];
          if (latest.status === "approved") {
            // Still an ACTIVE workflow (awaiting promotion) — block.
            throw new HttpError(409, {
              code: "DATASET_ALREADY_APPROVED",
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
              status: latest.status,
              requiresConfirmation: true,
              message: promoted
                ? "This dataset is already published. Confirm to submit an updated version for a new review."
                : "The previous submission was rejected. Confirm to resubmit for review.",
            });
          }
          submissionId = crypto.randomUUID();
          await sequelize.query(
            `INSERT INTO submissions (submission_id, dataset_registry_id, status, created_at, updated_at)
             VALUES (:sid, :rid, 'pending', NOW(), NOW())`,
            {
              replacements: { sid: submissionId, rid: registryId },
              transaction: t,
            }
          );
        }
      }

      // Full-replace the sandbox working copy at _id = internal_id.
      // If this throws, the transaction rolls back → no rows leak.
      const url = `${UPLOAD_URL}/${UPLOAD_DB}/_design/qq/_update/timestamp/${encodeURIComponent(
        registryId
      )}`;
      await axios.put(url, clean, { headers: buildHeaders() });

      return { internal_id: registryId, submission_id: submissionId };
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

// One row per logical dataset the caller owns (registry + its latest cycle).
const listMyUploads = async (req, res) => {
  try {
    const rows = await sequelize.query(
      `SELECT r.internal_id, r.dataset_id, r.requested_dataset_id, r.dataset_name,
              s.submission_id, s.status,
              s.created_at, s.updated_at, s.promoted_db, s.promoted_at
         FROM dataset_registry r
         LEFT JOIN LATERAL (
           SELECT * FROM submissions s2
            WHERE s2.dataset_registry_id = r.internal_id
            ORDER BY s2.created_at DESC LIMIT 1
         ) s ON true
        WHERE r.owner_user_id = :uid
        ORDER BY r.created_at DESC`,
      { replacements: { uid: req.user.id }, type: sequelize.QueryTypes.SELECT }
    );
    res.json(rows);
  } catch (err) {
    console.error("List uploads failed:", err.message);
    res.status(500).json({ error: "Failed to list uploads" });
  }
};

module.exports = { createUpload, listMyUploads };
