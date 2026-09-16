const axios = require("axios");
const crypto = require("crypto");

// Upload a JSON document to the sandbox CouchDB database for review. This is a
// general, login-gated endpoint (any authenticated user can submit a JSON file
// — the AutoBIDSify app just links here). The upload target (URL + db) and any
// credentials come from .env (server-only) and are never exposed to the client.
//
// COUCHDB_UPLOAD_URL lets uploads target a separate CouchDB (the zodiac
// sandbox) while the read endpoints keep using COUCHDB_URL. Basic auth is only
// attached when upload creds are set — the sandbox allows anonymous writes and
// access is gated by the website login instead.
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

const createUpload = async (req, res) => {
  try {
    const doc = req.body;
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      return res
        .status(400)
        .json({ error: "Request body must be a JSON object" });
    }

    // Strip CouchDB-reserved fields the uploaded file may carry (_id, _rev,
    // _revisions, _attachments, ...). A stray _rev makes the write fail with
    // 409; a stray _id would write to/OVERWRITE that document (e.g. "ds000001")
    // instead of a fresh sandbox doc. We always assign a new id below.
    const clean = {};
    for (const [key, value] of Object.entries(doc)) {
      if (!key.startsWith("_")) clean[key] = value;
    }

    // Stamp who submitted + a pending status into .datainfo (merged alongside
    // the CreateTime/UpdateTime the update handler adds) so the review queue
    // shows the submitter. requireAuth guarantees req.user is set.
    const meta = {
      status: "pending",
      submittedBy: {
        id: req.user.id,
        username: req.user.username,
        email: req.user.email,
      },
    };
    const payload = {
      ...clean,
      ".datainfo": { ...(clean[".datainfo"] || {}), ...meta },
    };

    // Write via the CouchDB `timestamp` update handler (not a plain POST/PUT)
    // so the doc gets .datainfo CreateTime/UpdateTime. Mint the id so we can
    // return it; PUT to _update/timestamp/<id> creates the doc and merges body.
    const id = crypto.randomUUID();
    const url = `${UPLOAD_URL}/${UPLOAD_DB}/_design/qq/_update/timestamp/${encodeURIComponent(
      id
    )}`;
    const response = await axios.put(url, payload, { headers: buildHeaders() });
    const rev = response.headers["x-couch-update-newrev"];

    res.status(201).json({ ok: true, id, rev });
  } catch (err) {
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

module.exports = { createUpload };
