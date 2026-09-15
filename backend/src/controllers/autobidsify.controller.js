const axios = require("axios");
const crypto = require("crypto");

// Upload a JSON document to the sandbox CouchDB database. The upload target
// (URL + db) and any credentials come from .env (server-only) and are never
// exposed to the client. Minimal version: POST to the database so CouchDB
// assigns the document _id. (Auth token, rate limiting, and duplicate handling
// are intentionally not included yet.)
//
// COUCHDB_UPLOAD_URL lets uploads target a separate CouchDB (e.g. the zodiac
// sandbox) while the read endpoints keep using COUCHDB_URL. Basic auth is only
// attached when upload creds are set — the sandbox may allow anonymous upload.
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

const uploadToSandbox = async (req, res) => {
  try {
    const doc = req.body;
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      return res
        .status(400)
        .json({ error: "Request body must be a JSON object" });
    }

    // Write via the CouchDB `timestamp` update handler (not a plain POST/PUT)
    // so the doc gets `.datainfo` CreateTime/UpdateTime, matching how datasets
    // are stamped elsewhere. We mint the id ourselves so we can return it; PUT
    // to _update/timestamp/<id> creates the doc and merges the body.
    const id = crypto.randomUUID();
    const url = `${UPLOAD_URL}/${UPLOAD_DB}/_design/qq/_update/timestamp/${encodeURIComponent(
      id
    )}`;
    const response = await axios.put(url, doc, { headers: buildHeaders() });
    // Update handlers return the new revision in this header (the body is a
    // plain success message, not JSON).
    const rev = response.headers["x-couch-update-newrev"];

    res.status(201).json({ ok: true, id, rev });
  } catch (err) {
    console.error(
      "Sandbox upload failed:",
      err.response?.status,
      err.message
    );
    res.status(err.response?.status || 500).json({
      error: "Upload failed",
      detail: err.response?.data || err.message,
    });
  }
};

module.exports = { uploadToSandbox };
