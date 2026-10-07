const axios = require("axios");
const { sequelize } = require("../config/database");
const { HttpError, UUID_RE } = require("../lib/uploadAccess");
const { buildHeaders, sandboxDocUrl } = require("../lib/sandbox");

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

module.exports = {
  listReviews,
  getReview,
  getReviewDocument,
  decide,
  postReviewComment,
};
