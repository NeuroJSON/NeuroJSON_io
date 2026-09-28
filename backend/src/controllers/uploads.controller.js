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

// Target public database name (same slug rule; no njds restriction — that is
// only for dataset ids). Blank defaults to "public" upstream.
const validateRequestedDb = (db) => {
  if (!/^[a-z0-9][a-z0-9_-]{2,62}$/.test(db)) {
    throw new HttpError(400, {
      error:
        "Database name must be 3–63 characters: lowercase letters, numbers, - or _.",
    });
  }
};

// Preliminary availability: reject an id already used as a final public
// dataset_id OR another row's requested_dataset_id. `excludeInternalId` skips
// the caller's own row on update. (The authoritative check still runs at
// promotion; a DB partial-unique index also backs this up.)
const assertRequestedIdFree = async (requestedId, excludeInternalId, t) => {
  const rows = await sequelize.query(
    `SELECT 1 FROM dataset_registry
      WHERE (dataset_id = :id OR requested_dataset_id = :id)
        AND (:exclude::uuid IS NULL OR internal_id <> :exclude::uuid)
      LIMIT 1`,
    {
      replacements: { id: requestedId, exclude: excludeInternalId || null },
      type: sequelize.QueryTypes.SELECT,
      transaction: t,
    }
  );
  if (rows.length) {
    throw new HttpError(409, {
      code: "REQUESTED_ID_TAKEN",
      error: `The preferred ID "${requestedId}" is already in use.`,
    });
  }
};

const createUpload = async (req, res) => {
  // Existing editable cycle whose JSON update is being attempted; used to
  // record a failure after the transaction rolls back.
  let jsonTargetId = null;
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
    const requestedDb = req.query.requestedDb
      ? String(req.query.requestedDb).trim()
      : null;
    const confirm = req.query.confirm === "true";
    const userId = req.user.id;

    if (requestedId) validateRequestedId(requestedId); // throws 400
    if (requestedDb) validateRequestedDb(requestedDb); // throws 400

    // Review status of the cycle this upload lands in (returned to the client).
    let reviewStatus = "draft";

    // Keep the PostgreSQL transaction open across the CouchDB write: commit on
    // success, roll back if the upload fails. Acceptable at low upload volume.
    const result = await sequelize.transaction(async (t) => {
      let registryId; // = internal_id (also the sandbox _id)
      let submissionId;

      if (!internalId) {
        // NEW logical dataset.
        if (requestedId) await assertRequestedIdFree(requestedId, null, t);
        registryId = crypto.randomUUID();
        await sequelize.query(
          `INSERT INTO dataset_registry
             (internal_id, dataset_id, requested_dataset_id, requested_db, dataset_name, owner_user_id, created_at, updated_at)
           VALUES (:iid, NULL, :req, :db, :name, :uid, NOW(), NOW())`,
          {
            replacements: {
              iid: registryId,
              req: requestedId,
              db: requestedDb || "public",
              name: datasetName,
              uid: userId,
            },
            transaction: t,
          }
        );
        submissionId = crypto.randomUUID();
        await sequelize.query(
          `INSERT INTO submissions
             (submission_id, dataset_registry_id, status, json_status, json_uploaded_at, created_at, updated_at)
           VALUES (:sid, :rid, 'draft', 'uploaded', NOW(), NOW(), NOW())`,
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

        // Registry holds the canonical name. Publishing settings (preferred id,
        // target db) are NOT changed by an upload — they are edited only via
        // PATCH /:internalId/settings, so they're ignored here on update.
        await sequelize.query(
          `UPDATE dataset_registry
              SET dataset_name = :name, updated_at = NOW()
            WHERE internal_id = :iid`,
          {
            replacements: { name: datasetName, iid: registryId },
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

        // Editable = draft / changes_requested → reuse this cycle. The review
        // status is NOT changed; the user must click Submit/Resubmit to send it
        // to review.
        const editable = subs.find(
          (s) => s.status === "draft" || s.status === "changes_requested"
        );
        if (editable) {
          submissionId = editable.submission_id;
          reviewStatus = editable.status;
          jsonTargetId = editable.id;
          await sequelize.query(
            `UPDATE submissions
                SET json_status='uploaded', json_uploaded_at=NOW(), json_error=NULL, updated_at=NOW()
              WHERE id=:id`,
            { replacements: { id: editable.id }, transaction: t }
          );
        } else if (subs.length === 0) {
          // Defensive: registry with no cycle → start one.
          submissionId = crypto.randomUUID();
          await sequelize.query(
            `INSERT INTO submissions
               (submission_id, dataset_registry_id, status, json_status, json_uploaded_at, created_at, updated_at)
             VALUES (:sid, :rid, 'draft', 'uploaded', NOW(), NOW(), NOW())`,
            {
              replacements: { sid: submissionId, rid: registryId },
              transaction: t,
            }
          );
        } else {
          const latest = subs[0];
          if (latest.status === "pending") {
            // Locked while waiting for review; the user can withdraw it to
            // draft first.
            throw new HttpError(409, {
              code: "SUBMISSION_UNDER_REVIEW",
              status: "pending",
              requiresConfirmation: false,
              message:
                "This submission is waiting for review. Withdraw it back to draft to make changes.",
            });
          }
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
                ? "This dataset is already published. Confirm to start a new version (saved as a draft)."
                : "The previous submission was rejected. Confirm to start a new version (saved as a draft).",
            });
          }
          submissionId = crypto.randomUUID();
          await sequelize.query(
            `INSERT INTO submissions
               (submission_id, dataset_registry_id, status, json_status, json_uploaded_at, created_at, updated_at)
             VALUES (:sid, :rid, 'draft', 'uploaded', NOW(), NOW(), NOW())`,
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

    res.status(201).json({ ok: true, status: reviewStatus, ...result });
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.status).json(err.body);
    }
    // The transaction rolled back, so the sandbox still has the previous good
    // copy. Mark the last JSON update as failed — only for an existing
    // draft/changes_requested cycle (a brand-new dataset has no row to mark).
    // Stored message is a fixed, safe sentence (never the raw error).
    if (jsonTargetId) {
      await sequelize
        .query(
          `UPDATE submissions
              SET json_status='failed', json_error=:msg, updated_at=NOW()
            WHERE id=:id`,
          {
            replacements: {
              id: jsonTargetId,
              msg: "The last JSON update could not be saved.",
            },
          }
        )
        .catch((e) =>
          console.error("Could not record JSON failure:", e.message)
        );
    }
    // Full details stay in the server log only. Never send err.message or the
    // CouchDB response to the browser — a network error message contains the
    // sandbox host/port (e.g. "connect ECONNREFUSED <ip>:7777").
    console.error(
      "Upload failed:",
      err.response?.status,
      err.message,
      "| couch:",
      JSON.stringify(err.response?.data)
    );
    // 502 = the upstream sandbox failed; keeps it distinct from our own 409s.
    res.status(502).json({
      error: "Upload failed. Please try again later.",
    });
  }
};

// GET /api/v1/uploads/:internalId/document — the stored sandbox doc (owner
// only). Proxied server-side so the sandbox CouchDB URL never reaches the
// browser (not even in DevTools).
const getUploadDocument = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );
    const url = `${UPLOAD_URL}/${UPLOAD_DB}/${encodeURIComponent(
      reg.internal_id
    )}`;
    const { data } = await axios.get(url, { headers: buildHeaders() });
    res.json(data);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    if (err.response?.status === 404) {
      return res.status(404).json({
        error: "The submitted document was not found in the sandbox.",
      });
    }
    console.error("Get upload document failed:", err.message);
    res.status(502).json({ error: "Failed to load the submitted document." });
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

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Load a registry row the caller owns, or throw (404 unknown, 403 not owner).
// Guards the UUID format first so a bad param can't crash the SQL uuid cast.
const loadOwnedRegistry = async (internalId, userId) => {
  if (!UUID_RE.test(internalId)) {
    throw new HttpError(404, { error: "Dataset not found" });
  }
  const rows = await sequelize.query(
    `SELECT internal_id, dataset_id, requested_dataset_id, requested_db, dataset_name, owner_user_id
       FROM dataset_registry WHERE internal_id = :iid`,
    { replacements: { iid: internalId }, type: sequelize.QueryTypes.SELECT }
  );
  if (rows.length === 0) throw new HttpError(404, { error: "Dataset not found" });
  if (rows[0].owner_user_id !== userId) {
    throw new HttpError(403, { error: "This dataset belongs to another user" });
  }
  return rows[0];
};

const latestSubmissionId = async (internalId) => {
  const s = await sequelize.query(
    `SELECT submission_id FROM submissions
      WHERE dataset_registry_id = :iid ORDER BY created_at DESC LIMIT 1`,
    { replacements: { iid: internalId }, type: sequelize.QueryTypes.SELECT }
  );
  return s[0] ? s[0].submission_id : null;
};

// What must be true before draft/changes_requested → pending.
// (Raw ZIP checks are added in step 2, once the raw tables exist; until then
// raw_zip_expected is always false.)
const getReadiness = (sub) => {
  const problems = [];
  if (sub.json_status !== "uploaded") {
    problems.push("The last JSON update failed. Upload the JSON again.");
  }
  return { canSubmit: problems.length === 0, problems };
};

// POST /api/v1/uploads/:internalId/submit — send (or resend) to review.
const submitForReview = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );
    const out = await sequelize.transaction(async (t) => {
      const rows = await sequelize.query(
        `SELECT id, status, json_status, raw_zip_expected FROM submissions
          WHERE dataset_registry_id = :iid
          ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        {
          replacements: { iid: reg.internal_id },
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );
      const sub = rows[0];
      if (!sub || !["draft", "changes_requested"].includes(sub.status)) {
        throw new HttpError(409, {
          code: "NOT_SUBMITTABLE",
          error:
            "Only a draft or a submission with requested changes can be sent for review.",
        });
      }
      const { canSubmit, problems } = getReadiness(sub);
      if (!canSubmit) {
        throw new HttpError(409, {
          code: "NOT_READY",
          error: problems[0],
          problems,
        });
      }
      await sequelize.query(
        `UPDATE submissions
            SET status='pending', submitted_at=NOW(), updated_at=NOW()
          WHERE id=:id`,
        { replacements: { id: sub.id }, transaction: t }
      );
      return { status: "pending" };
    });
    res.json(out);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    console.error("Submit failed:", err.message);
    res.status(500).json({ error: "Failed to submit for review." });
  }
};

// POST /api/v1/uploads/:internalId/withdraw — pending → draft, only until the
// reviewer changes the status. A single conditional UPDATE, so it can't race a
// reviewer action: whichever lands first wins.
const withdrawSubmission = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );
    const sid = await latestSubmissionId(reg.internal_id);
    const rows = sid
      ? await sequelize.query(
          `UPDATE submissions SET status='draft', updated_at=NOW()
            WHERE submission_id = :sid AND status = 'pending'
          RETURNING id`,
          { replacements: { sid }, type: sequelize.QueryTypes.SELECT }
        )
      : [];
    if (rows.length === 0) {
      return res.status(409).json({
        code: "CANNOT_WITHDRAW",
        error:
          "This submission can no longer be withdrawn — the reviewer has already acted on it.",
      });
    }
    res.json({ status: "draft" });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    console.error("Withdraw failed:", err.message);
    res.status(500).json({ error: "Failed to withdraw." });
  }
};

// PATCH /api/v1/uploads/:internalId/settings — change publishing settings
// without re-uploading. A field left out = unchanged; null or "" = reset
// (requestedDatasetId → let NeuroJSON assign; requestedDb → "public").
const updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k);
    const clean = (v) =>
      v === null || v === undefined ? null : String(v).trim() || null;

    const changeId = has("requestedDatasetId");
    const changeDb = has("requestedDb");
    if (!changeId && !changeDb) {
      return res.status(400).json({ error: "Nothing to update." });
    }
    const newId = changeId ? clean(body.requestedDatasetId) : null;
    const newDb = changeDb ? clean(body.requestedDb) || "public" : null;
    if (newId) validateRequestedId(newId); // 400 on bad format / njds
    if (changeDb) validateRequestedDb(newDb); // "public" passes

    const reg = await loadOwnedRegistry(
      String(req.params.internalId),
      req.user.id
    );

    // Once a dataset has a public ID, its URL (/db/<db>/<id>) is fixed so
    // shared/cited links keep working; later versions publish to the same place.
    if (reg.dataset_id) {
      throw new HttpError(409, {
        code: "PUBLIC_ID_ASSIGNED",
        error:
          "This dataset is already published, so its database and ID can't be changed.",
      });
    }

    const out = await sequelize.transaction(async (t) => {
      // Same rule as uploads: only while the submission is editable.
      const rows = await sequelize.query(
        `SELECT status FROM submissions WHERE dataset_registry_id = :iid
          ORDER BY created_at DESC LIMIT 1 FOR UPDATE`,
        {
          replacements: { iid: reg.internal_id },
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );
      if (
        !rows[0] ||
        !["draft", "changes_requested"].includes(rows[0].status)
      ) {
        throw new HttpError(409, {
          code: "NOT_EDITABLE",
          error:
            "Settings can only be changed while the submission is a draft or has requested changes.",
        });
      }
      if (newId) await assertRequestedIdFree(newId, reg.internal_id, t);

      const sets = [];
      const repl = { iid: reg.internal_id };
      if (changeId) {
        sets.push("requested_dataset_id = :rid");
        repl.rid = newId;
      }
      if (changeDb) {
        sets.push("requested_db = :rdb");
        repl.rdb = newDb;
      }
      const updated = await sequelize.query(
        `UPDATE dataset_registry SET ${sets.join(", ")}, updated_at = NOW()
          WHERE internal_id = :iid
          RETURNING requested_dataset_id, requested_db`,
        {
          replacements: repl,
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      );
      return updated[0];
    });
    res.json(out);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    // Unique index backstop (two users grabbing the same ID at once).
    if (err.original?.code === "23505") {
      return res.status(409).json({
        code: "REQUESTED_ID_TAKEN",
        error: "That preferred ID is already in use.",
      });
    }
    console.error("Update settings failed:", err.message);
    res.status(500).json({ error: "Failed to update settings." });
  }
};

// GET /api/v1/uploads/:internalId — one dataset's detail (owner only).
const getUpload = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(String(req.params.internalId), req.user.id);
    const s = await sequelize.query(
      `SELECT submission_id, status, created_at, updated_at, promoted_db, promoted_at,
              json_status, json_uploaded_at, json_error, submitted_at, raw_zip_expected
         FROM submissions WHERE dataset_registry_id = :iid
        ORDER BY created_at DESC LIMIT 1`,
      { replacements: { iid: reg.internal_id }, type: sequelize.QueryTypes.SELECT }
    );
    const sub = s[0] || {};
    res.json({
      internal_id: reg.internal_id,
      dataset_id: reg.dataset_id,
      requested_dataset_id: reg.requested_dataset_id,
      requested_db: reg.requested_db,
      dataset_name: reg.dataset_name,
      submission_id: sub.submission_id || null,
      status: sub.status || null,
      created_at: sub.created_at || null,
      updated_at: sub.updated_at || null,
      promoted_db: sub.promoted_db || null,
      promoted_at: sub.promoted_at || null,
      json_status: sub.json_status || null,
      json_uploaded_at: sub.json_uploaded_at || null,
      json_error: sub.json_error || null,
      submitted_at: sub.submitted_at || null,
      raw_zip_expected: !!sub.raw_zip_expected,
      readiness: sub.submission_id
        ? getReadiness(sub)
        : { canSubmit: false, problems: ["No submission found."] },
    });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    console.error("Get upload failed:", err.message);
    res.status(500).json({ error: "Failed to load dataset" });
  }
};

// GET /api/v1/uploads/:internalId/comments — thread for the latest cycle.
const listComments = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(String(req.params.internalId), req.user.id);
    const sid = await latestSubmissionId(reg.internal_id);
    if (!sid) return res.json([]);
    // Mask reviewer identity: the owner sees their own name, reviewers show as
    // a generic "Reviewer" and their user id is not exposed.
    const rows = await sequelize.query(
      `SELECT c.id,
              CASE WHEN c.user_id = :owner THEN u.username ELSE 'Reviewer' END AS username,
              c.message, c.created_at,
              (c.user_id = :owner) AS is_owner
         FROM submission_comments c
         JOIN users u ON u.id = c.user_id
        WHERE c.submission_id = :sid
        ORDER BY c.created_at ASC`,
      {
        replacements: { sid, owner: reg.owner_user_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.json(rows);
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    console.error("List comments failed:", err.message);
    res.status(500).json({ error: "Failed to load comments" });
  }
};

// POST /api/v1/uploads/:internalId/comments — add a comment (owner only for now).
const postComment = async (req, res) => {
  try {
    const reg = await loadOwnedRegistry(String(req.params.internalId), req.user.id);
    const message = String((req.body && req.body.message) || "").trim();
    if (!message) throw new HttpError(400, { error: "Message cannot be empty." });
    if (message.length > 5000) {
      throw new HttpError(400, {
        error: "Message is too long (5000 characters max).",
      });
    }
    const sid = await latestSubmissionId(reg.internal_id);
    if (!sid) throw new HttpError(400, { error: "No submission to comment on." });
    const ins = await sequelize.query(
      `INSERT INTO submission_comments (submission_id, user_id, message, created_at)
       VALUES (:sid, :uid, :msg, NOW()) RETURNING id, created_at`,
      {
        replacements: { sid, uid: req.user.id, msg: message },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const isOwner = reg.owner_user_id === req.user.id;
    res.status(201).json({
      id: ins[0].id,
      username: isOwner ? req.user.username : "Reviewer",
      message,
      created_at: ins[0].created_at,
      is_owner: isOwner,
    });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    console.error("Post comment failed:", err.message);
    res.status(500).json({ error: "Failed to post comment" });
  }
};

module.exports = {
  createUpload,
  listMyUploads,
  getUpload,
  getUploadDocument,
  submitForReview,
  withdrawSubmission,
  updateSettings,
  listComments,
  postComment,
};
