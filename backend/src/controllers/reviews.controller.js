const axios = require("axios");
const { sequelize } = require("../config/database");
const { HttpError, UUID_RE } = require("../lib/uploadAccess");
const { buildHeaders, sandboxDocUrl } = require("../lib/sandbox");
const {
  promoteEnabled,
  dbExists,
  getDoc,
  putDoc,
} = require("../lib/publicCouch");

// Reviewer side of the upload workflow (routes use requireAuth + requireReviewer).
// Drafts are private to their owner, so reviewers only see submissions that
// were sent to review at least once (any status except draft).

const LIST_STATUSES = [
  "pending",
  "changes_requested",
  "approved",
  "rejected",
  "promoted",
];
const DECISIONS = {
  approve: "approved",
  request_changes: "changes_requested",
  reject: "rejected",
};
const MAX_MESSAGE = 5000;

const sendError = (res, err, what) => {
  if (err instanceof HttpError) return res.status(err.status).json(err.body);
  console.error(`${what} failed:`, err.message);
  res.status(500).json({ error: `${what} failed.` });
};

// One submission + its dataset + owner, or 404. `lock` = FOR UPDATE (in a transaction).
const loadSubmission = async (submissionId, { t, lock } = {}) => {
  if (!UUID_RE.test(submissionId)) {
    throw new HttpError(404, { error: "Submission not found." });
  }
  const rows = await sequelize.query(
    `SELECT s.submission_id, s.status, s.submitted_at, s.reviewed_at, s.updated_at,
            s.json_uploaded_at, s.raw_zip_expected,
            r.internal_id, r.dataset_name, r.requested_db, r.requested_dataset_id,
            r.dataset_id, r.owner_user_id, u.username AS owner_username, u.email AS owner_email
       FROM submissions s
       JOIN dataset_registry r ON r.internal_id = s.dataset_registry_id
       JOIN users u ON u.id = r.owner_user_id
      WHERE s.submission_id = :sid
      ${lock ? "FOR UPDATE OF s" : ""}`,
    {
      replacements: { sid: submissionId },
      type: sequelize.QueryTypes.SELECT,
      transaction: t,
    }
  );
  if (!rows[0] || rows[0].status === "draft") {
    throw new HttpError(404, { error: "Submission not found." });
  }
  return rows[0];
};

// GET /api/v1/reviews?status=pending — the queue (oldest first for pending).
const listReviews = async (req, res) => {
  try {
    const status = String(req.query.status || "pending");
    if (!LIST_STATUSES.includes(status)) {
      throw new HttpError(400, { error: "Unknown status." });
    }
    const order =
      status === "pending" ? "s.submitted_at ASC" : "s.updated_at DESC";
    const rows = await sequelize.query(
      `SELECT s.submission_id, s.status, s.submitted_at, s.reviewed_at, s.updated_at,
              r.internal_id, r.dataset_name, r.requested_db, r.requested_dataset_id,
              u.username AS owner_username, u.email AS owner_email,
              (r.owner_user_id = :me) AS is_own,
              (SELECT o.size_bytes FROM submission_raw_files f
                 JOIN raw_objects o ON o.raw_id = f.raw_id
                WHERE f.submission_id = s.submission_id) AS raw_zip_size
         FROM submissions s
         JOIN dataset_registry r ON r.internal_id = s.dataset_registry_id
         JOIN users u ON u.id = r.owner_user_id
        WHERE s.status = :status
        ORDER BY ${order}
        LIMIT 200`,
      {
        replacements: { status, me: req.user.id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.json(rows);
  } catch (err) {
    sendError(res, err, "Load review queue");
  }
};

// GET /api/v1/reviews/:submissionId — details + current ZIP + thread.
const getReview = async (req, res) => {
  try {
    const sub = await loadSubmission(String(req.params.submissionId));
    const zip = await sequelize.query(
      `SELECT o.raw_id, o.original_filename, o.size_bytes, o.sha256, o.extraction_status, o.created_at
         FROM submission_raw_files f JOIN raw_objects o ON o.raw_id = f.raw_id
        WHERE f.submission_id = :sid`,
      {
        replacements: { sid: sub.submission_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    // Reviewers see real names (the owner's own thread view masks reviewers).
    const comments = await sequelize.query(
      `SELECT c.id, u.username, c.message, c.created_at,
              (c.user_id = :owner) AS is_owner
         FROM submission_comments c JOIN users u ON u.id = c.user_id
        WHERE c.submission_id = :sid
        ORDER BY c.created_at ASC`,
      {
        replacements: { sid: sub.submission_id, owner: sub.owner_user_id },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    const z = zip[0];
    const { owner_user_id, ...rest } = sub; // don't send user ids
    res.json({
      ...rest,
      is_own: owner_user_id === req.user.id,
      raw_zip: z
        ? {
            rawId: z.raw_id,
            filename: z.original_filename,
            size: Number(z.size_bytes),
            sha256: z.sha256,
            extractionStatus: z.extraction_status,
            uploadedAt: z.created_at,
          }
        : null,
      comments,
    });
  } catch (err) {
    sendError(res, err, "Load submission");
  }
};

// GET /api/v1/reviews/:submissionId/document — the submitted JSON (proxied).
const getReviewDocument = async (req, res) => {
  try {
    const sub = await loadSubmission(String(req.params.submissionId));
    const { data } = await axios.get(sandboxDocUrl(sub.internal_id), {
      headers: buildHeaders(),
    });
    res.json(data);
  } catch (err) {
    if (err.response?.status === 404) {
      return res
        .status(404)
        .json({ error: "The submitted document was not found." });
    }
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    console.error("Load review document failed:", err.message);
    res.status(502).json({ error: "Failed to load the submitted document." });
  }
};

const readMessage = (body) => {
  const message = String((body && body.message) || "").trim();
  if (message.length > MAX_MESSAGE) {
    throw new HttpError(400, {
      error: `Message is too long (${MAX_MESSAGE} characters max).`,
    });
  }
  return message;
};

// POST /api/v1/reviews/:submissionId/decision {decision, message}
// One transaction: status + reviewed_by/at + the message as a comment. Only a
// still-pending submission can be decided (no double decisions, none after a
// withdraw); nobody may decide their own upload.
const decide = async (req, res) => {
  try {
    const decision = String((req.body && req.body.decision) || "");
    const newStatus = DECISIONS[decision];
    if (!newStatus) throw new HttpError(400, { error: "Unknown decision." });
    const message = readMessage(req.body);
    if (decision !== "approve" && !message) {
      throw new HttpError(400, {
        error:
          "Please explain what the uploader should change or why it is rejected.",
      });
    }
    const result = await sequelize.transaction(async (t) => {
      const sub = await loadSubmission(String(req.params.submissionId), {
        t,
        lock: true,
      });
      if (sub.owner_user_id === req.user.id) {
        throw new HttpError(403, { error: "You can't review your own upload." });
      }
      if (sub.status !== "pending") {
        throw new HttpError(409, {
          error: "This submission is no longer waiting for review.",
          status: sub.status,
        });
      }
      await sequelize.query(
        `UPDATE submissions
            SET status = :st, reviewed_by = :me, reviewed_at = NOW(), updated_at = NOW()
          WHERE submission_id = :sid AND status = 'pending'`,
        {
          replacements: {
            st: newStatus,
            me: req.user.id,
            sid: sub.submission_id,
          },
          transaction: t,
        }
      );
      if (message) {
        await sequelize.query(
          `INSERT INTO submission_comments (submission_id, user_id, message, created_at)
           VALUES (:sid, :me, :msg, NOW())`,
          {
            replacements: {
              sid: sub.submission_id,
              me: req.user.id,
              msg: message,
            },
            transaction: t,
          }
        );
      }
      return { submission_id: sub.submission_id, status: newStatus };
    });
    res.json(result);
  } catch (err) {
    sendError(res, err, "Save decision");
  }
};

// POST /api/v1/reviews/:submissionId/comments {message} — comment without deciding.
const postReviewComment = async (req, res) => {
  try {
    const message = readMessage(req.body);
    if (!message) throw new HttpError(400, { error: "Message cannot be empty." });
    const sub = await loadSubmission(String(req.params.submissionId));
    const ins = await sequelize.query(
      `INSERT INTO submission_comments (submission_id, user_id, message, created_at)
       VALUES (:sid, :me, :msg, NOW()) RETURNING id, created_at`,
      {
        replacements: { sid: sub.submission_id, me: req.user.id, msg: message },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    res.status(201).json({
      id: ins[0].id,
      username: req.user.username,
      message,
      created_at: ins[0].created_at,
      is_owner: sub.owner_user_id === req.user.id,
    });
  } catch (err) {
    sendError(res, err, "Post comment");
  }
};

// ---- Publishing (promotion) ----

// CouchDB database names (and the rule /settings already enforces).
const DB_RE = /^[a-z][a-z0-9_-]{0,62}$/;
// Raw-file links written by the converter. Publishing them needs extraction +
// validation (not built yet), so such JSONs are blocked — markers are NOT
// rewritten here. Later they become /api/v1/files/<db>/<dataset_id>/<path>.
const FILE_MARKER = "neurojson:files/";

// Any string anywhere in the doc that starts with "neurojson:files/"?
// Iterative so a very deep JSON can't overflow the stack.
const hasFileMarker = (root) => {
  const stack = [root];
  while (stack.length) {
    const v = stack.pop();
    if (typeof v === "string") {
      if (v.startsWith(FILE_MARKER)) return true;
    } else if (v && typeof v === "object") {
      for (const k in v) stack.push(v[k]);
    }
  }
  return false;
};

// Reserve the public ID (Postgres) — or reuse the one this dataset already has.
// First time only: the ID must also be free in the target CouchDB database
// (an older dataset may already use it). A reserved ID stays reserved, so a
// failed publish can be retried with the SAME ID.
const reserveDatasetId = async (sub, db) =>
  sequelize.transaction(async (t) => {
    const s = await loadSubmission(sub.submission_id, { t, lock: true });
    if (s.status !== "approved") {
      throw new HttpError(409, {
        error: "Only approved submissions can be published.",
      });
    }
    const reg = (
      await sequelize.query(
        `SELECT dataset_id, requested_dataset_id FROM dataset_registry
          WHERE internal_id = :iid FOR UPDATE`,
        {
          replacements: { iid: s.internal_id },
          type: sequelize.QueryTypes.SELECT,
          transaction: t,
        }
      )
    )[0];
    if (reg.dataset_id) return reg.dataset_id;

    let id = reg.requested_dataset_id;
    if (id) {
      if (await getDoc(db, id)) {
        throw new HttpError(409, {
          error: `The dataset ID "${id}" is already used in the "${db}" database. Ask the uploader to choose another one.`,
        });
      }
    } else {
      // Next free njds###### (skip numbers an older dataset already uses).
      for (let tries = 0; !id; tries++) {
        if (tries >= 20) throw new Error("no free njds id after 20 tries");
        const n = (
          await sequelize.query(
            "SELECT nextval('neurojson_dataset_seq') AS n",
            { type: sequelize.QueryTypes.SELECT, transaction: t }
          )
        )[0].n;
        const candidate = `njds${String(n).padStart(6, "0")}`;
        if (!(await getDoc(db, candidate))) id = candidate;
      }
    }
    try {
      await sequelize.query(
        `UPDATE dataset_registry SET dataset_id = :id, updated_at = NOW()
          WHERE internal_id = :iid`,
        { replacements: { id, iid: s.internal_id }, transaction: t }
      );
    } catch (err) {
      if (err.name === "SequelizeUniqueConstraintError") {
        throw new HttpError(409, {
          error: `The dataset ID "${id}" is already used by another dataset.`,
        });
      }
      throw err;
    }
    return id;
  });

// POST /api/v1/reviews/:submissionId/promote — publish an approved submission.
// 1 checks → 2 reserve the public ID (Postgres) → 3 write the doc to the
// public CouchDB → 4 mark promoted (Postgres). Safe to repeat after a failure
// at any step: same ID, and step 3 updates the doc it wrote before.
// Any reviewer may publish, including their own (approved by someone else).
const promote = async (req, res) => {
  try {
    if (!promoteEnabled()) {
      throw new HttpError(503, {
        error: "Publishing is not enabled on this server yet.",
      });
    }
    const sub = await loadSubmission(String(req.params.submissionId));
    if (sub.status !== "approved") {
      throw new HttpError(409, {
        error: "Only approved submissions can be published.",
      });
    }
    const db = sub.requested_db || "public";
    if (!DB_RE.test(db)) {
      throw new HttpError(400, { error: "Invalid database name." });
    }
    if (!(await dbExists(db))) {
      throw new HttpError(409, {
        error: `The database "${db}" doesn't exist yet. Please create it first, then publish again.`,
      });
    }

    // The JSON as it will be published (sandbox _id/_rev and other _ fields dropped).
    const { data: sandboxDoc } = await axios.get(
      sandboxDocUrl(sub.internal_id),
      { headers: buildHeaders() }
    );
    if (hasFileMarker(sandboxDoc)) {
      throw new HttpError(409, {
        error:
          "This dataset links to raw files (neurojson:files/…). Publishing those needs file extraction, which isn't available yet.",
      });
    }
    const doc = {};
    for (const [k, v] of Object.entries(sandboxDoc)) {
      if (!k.startsWith("_")) doc[k] = v;
    }

    const datasetId = await reserveDatasetId(sub, db);

    // Write (or update — a new version, or a retry after a failure) the public doc.
    const existing = await getDoc(db, datasetId);
    if (existing) doc._rev = existing._rev;
    await putDoc(db, datasetId, doc);

    await sequelize.transaction(async (t) => {
      const [, meta] = await sequelize.query(
        `UPDATE submissions
            SET status = 'promoted', promoted_db = :db, promoted_at = NOW(), updated_at = NOW()
          WHERE submission_id = :sid AND status = 'approved'`,
        { replacements: { db, sid: sub.submission_id }, transaction: t }
      );
      // Exactly this submission, still approved — otherwise change nothing.
      if (!meta || meta.rowCount !== 1) {
        throw new HttpError(409, {
          error: "This submission is no longer approved.",
        });
      }
      await sequelize.query(
        `UPDATE dataset_registry SET published_submission_id = :sid, updated_at = NOW()
          WHERE internal_id = :iid`,
        {
          replacements: { sid: sub.submission_id, iid: sub.internal_id },
          transaction: t,
        }
      );
      await sequelize.query(
        `INSERT INTO submission_comments (submission_id, user_id, message, created_at)
         VALUES (:sid, :me, :msg, NOW())`,
        {
          replacements: {
            sid: sub.submission_id,
            me: req.user.id,
            msg: `Published as ${db}/${datasetId}.`,
          },
          transaction: t,
        }
      );
    });

    // path = the dataset's "View live" page on the site (not the raw-file API).
    res.json({
      status: "promoted",
      db,
      dataset_id: datasetId,
      path: `/db/${db}/${datasetId}`,
    });
  } catch (err) {
    if (err instanceof HttpError) return res.status(err.status).json(err.body);
    // CouchDB / network problems: log the reason, never send it to the client.
    console.error(
      "Promote failed:",
      err.response ? `HTTP ${err.response.status}` : err.message
    );
    res.status(502).json({ error: "Publishing failed. Please try again." });
  }
};

module.exports = {
  listReviews,
  getReview,
  getReviewDocument,
  decide,
  postReviewComment,
  promote,
};
