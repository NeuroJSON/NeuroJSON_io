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

// Published versions are MAJOR.MINOR ("1.1"); frozen copies are
// <archive db>/<db>:<dataset_id>:v<major>.<minor>.
const versionLabel = (major, minor) => `${major}.${minor}`;
const archiveIdFor = (db, id, major, minor) =>
  `${db}:${id}:v${versionLabel(major, minor)}`;

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
            s.json_uploaded_at, s.raw_zip_expected, s.promoted_db,
            s.published_major, s.published_minor,
            (r.published_submission_id = s.submission_id) AS is_live,
            -- the LIVE version of this dataset (if it's another submission), e.g. "1.1"
            (SELECT ls.published_major || '.' || ls.published_minor
               FROM submissions ls
              WHERE ls.submission_id = r.published_submission_id
                AND ls.submission_id <> s.submission_id) AS live_version,
            -- may this be a MINOR update? (same raw ZIP as the live version, or both none)
            (r.published_submission_id IS NOT NULL
             AND r.published_submission_id <> s.submission_id
             AND (SELECT f.raw_id FROM submission_raw_files f WHERE f.submission_id = s.submission_id)
                 IS NOT DISTINCT FROM
                 (SELECT f.raw_id FROM submission_raw_files f WHERE f.submission_id = r.published_submission_id)
            ) AS minor_allowed,
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
  // Drafts (and expired drafts) are private to their owner.
  if (!rows[0] || ["draft", "expired"].includes(rows[0].status)) {
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
              s.json_uploaded_at,
              r.internal_id, r.dataset_name, r.requested_db, r.requested_dataset_id,
              r.dataset_id,
              s.published_major, s.published_minor,
              (r.published_submission_id = s.submission_id) AS is_live,
              -- the LIVE version of this dataset (if it's another submission), e.g. "1.1"
              (SELECT ls.published_major || '.' || ls.published_minor
                 FROM submissions ls
                WHERE ls.submission_id = r.published_submission_id
                  AND ls.submission_id <> s.submission_id) AS live_version,
              u.username AS owner_username, u.email AS owner_email,
              (r.owner_user_id = :me) AS is_own,
              (SELECT o.size_bytes FROM submission_raw_files f
                 JOIN raw_objects o ON o.raw_id = f.raw_id
                WHERE f.submission_id = s.submission_id) AS raw_zip_size,
              -- when the current ZIP arrived (for "what changed since review")
              (SELECT o.created_at FROM submission_raw_files f
                 JOIN raw_objects o ON o.raw_id = f.raw_id
                WHERE f.submission_id = s.submission_id) AS raw_zip_uploaded_at
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
// A PUBLISHED submission is read from its frozen copy in the archive
// (<db>:<dataset_id>:v<major>.<minor>): the sandbox only holds the dataset's latest working
// copy, which may already be a newer version. Everything else (draft, pending,
// changes requested, approved, rejected) reads the working copy.
const getReviewDocument = async (req, res) => {
  try {
    const sub = await loadSubmission(String(req.params.submissionId));
    if (sub.status === "promoted" && sub.published_major != null) {
      const archiveId = archiveIdFor(
        sub.promoted_db,
        sub.dataset_id,
        sub.published_major,
        sub.published_minor
      );
      const frozen = ARCHIVE_DB ? await getDoc(ARCHIVE_DB, archiveId) : null;
      if (!frozen) {
        return res.status(404).json({
          error: "The archived copy of this published version was not found.",
        });
      }
      return res.json(frozen);
    }
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
// Frozen copy of every published version goes here (create-only):
//   <archive db>/<db>:<dataset_id>:v<major>.<minor>
// Required while publishing is on, so no version is published without it.
const ARCHIVE_DB = (process.env.COUCHDB_PROMOTE_ARCHIVE_DB || "").trim();

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

// Reserve the public ID and the version number (Postgres). First publish of a
// dataset: the ID must also be free in the target CouchDB database (an older
// dataset may already use it). Both stay reserved, so a failed publish is
// retried with the SAME ID and version.
const reserveDatasetId = async (sub, db, kind) =>
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
    // Public ID: the one this dataset already has (a new version keeps it),
    // else the preferred ID, else the next free njds######.
    let id = reg.dataset_id;
    if (!id) {
      id = reg.requested_dataset_id;
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
    }

    // Version for this publish (kept if a failed attempt already reserved it):
    //   first publish            → 1.0 (always a new version)
    //   kind "minor" (metadata)  → <live major>.<highest minor of that major + 1>,
    //                              only if the raw ZIP is the same as the live version's
    //   kind "major"             → <highest major + 1>.0
    // The unique index (dataset, major, minor) refuses a duplicate.
    let major = s.published_major;
    let minor = s.published_minor;
    if (major == null) {
      const top = (
        await sequelize.query(
          `SELECT MAX(published_major) AS max_major FROM submissions
            WHERE dataset_registry_id = :iid AND submission_id <> :sid`,
          {
            replacements: { iid: s.internal_id, sid: s.submission_id },
            type: sequelize.QueryTypes.SELECT,
            transaction: t,
          }
        )
      )[0];
      if (!top.max_major) {
        if (kind === "minor") {
          throw new HttpError(409, {
            error: "The first publish is always version 1.0 (a new version).",
          });
        }
        major = 1;
        minor = 0;
      } else if (kind === "minor") {
        if (!s.minor_allowed) {
          throw new HttpError(409, {
            error:
              "The raw data (ZIP) changed since the live version, so this must be published as a new version.",
          });
        }
        const live = (
          await sequelize.query(
            `SELECT ls.published_major AS major,
                    (SELECT MAX(x.published_minor) FROM submissions x
                      WHERE x.dataset_registry_id = :iid
                        AND x.published_major = ls.published_major) AS max_minor
               FROM dataset_registry r
               JOIN submissions ls ON ls.submission_id = r.published_submission_id
              WHERE r.internal_id = :iid`,
            {
              replacements: { iid: s.internal_id },
              type: sequelize.QueryTypes.SELECT,
              transaction: t,
            }
          )
        )[0];
        major = live.major;
        minor = live.max_minor + 1;
      } else {
        major = top.max_major + 1;
        minor = 0;
      }
      await sequelize.query(
        `UPDATE submissions SET published_major = :major, published_minor = :minor
          WHERE submission_id = :sid`,
        {
          replacements: { major, minor, sid: s.submission_id },
          transaction: t,
        }
      );
    }
    return { datasetId: id, major, minor };
  });

// POST /api/v1/reviews/:submissionId/promote — publish an approved submission.
// 1 checks → 2 reserve the public ID + version (Postgres) → 3a frozen copy in
// the archive db (create-only) → 3b latest doc (full replace) → 4 mark
// promoted (Postgres). Safe to repeat after a failure at any step: same ID and
// version; the frozen copy is never rewritten, the latest is updated again.
// Any reviewer may publish, including their own (approved by someone else).
const promote = async (req, res) => {
  try {
    if (!promoteEnabled()) {
      throw new HttpError(503, {
        error: "Publishing is not enabled on this server yet.",
      });
    }
    // "minor" = metadata-only update of the live version; anything else = new version.
    const kind = req.body?.kind === "minor" ? "minor" : "major";
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
    // Safety net while testing against a real CouchDB server: only listed
    // databases may be written. Empty list = no database is allowed.
    const allowed = (process.env.COUCHDB_PROMOTE_DBS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (!allowed.includes(db)) {
      throw new HttpError(403, {
        error: `Publishing to the "${db}" database is not enabled on this server.`,
      });
    }
    if (!(await dbExists(db))) {
      throw new HttpError(409, {
        error: `The database "${db}" doesn't exist yet. Please create it first, then publish again.`,
      });
    }
    if (!ARCHIVE_DB || !DB_RE.test(ARCHIVE_DB)) {
      throw new HttpError(503, {
        error: "Publishing is not enabled on this server yet.",
      });
    }
    if (!(await dbExists(ARCHIVE_DB))) {
      throw new HttpError(503, {
        error: "The version archive is not set up on this server.",
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

    const { datasetId, major, minor } = await reserveDatasetId(sub, db, kind);
    const version = versionLabel(major, minor); // "1.1"

    // Full replace (a new version must not keep keys it removed — the public
    // dbs' `timestamp` update handler would merge), with .datainfo like the
    // CouchDB timestamp handler (seconds, as strings): CreateTime = first
    // publish (kept), UpdateTime = now; plus the version number.
    const existing = await getDoc(db, datasetId);
    const now = String(Date.now() / 1000);
    doc[".datainfo"] = {
      ...(doc[".datainfo"] || {}),
      CreateTime: existing?.[".datainfo"]?.CreateTime ?? now,
      UpdateTime: now,
      Version: version,
    };

    // 1) Frozen copy, create-only: never overwrite an archived version. If it
    //    exists, a failed earlier attempt already wrote it (the number is ours).
    const archiveId = archiveIdFor(db, datasetId, major, minor);
    if (!(await getDoc(ARCHIVE_DB, archiveId))) {
      try {
        await putDoc(ARCHIVE_DB, archiveId, doc);
      } catch (err) {
        if (err.response?.status !== 409) throw err; // 409 = written by a parallel attempt
      }
    }

    // 2) Latest (full replace) — what the stable /db/<db>/<dataset_id> shows.
    const latest = existing ? { ...doc, _rev: existing._rev } : doc;
    await putDoc(db, datasetId, latest);

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
            msg: `Published as ${db}/${datasetId} (version ${version}).`,
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
      version,
      major,
      minor,
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
