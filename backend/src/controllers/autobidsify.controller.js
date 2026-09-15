const axios = require("axios");

// Upload a JSON document to the sandbox CouchDB database. CouchDB credentials
// come from .env (server-only) and are never exposed to the client. Minimal
// version: POST to the database so CouchDB assigns the document _id.
// (Auth token, rate limiting, and duplicate handling are intentionally not
// included yet.)
const COUCHDB_URL = process.env.COUCHDB_URL;
const UPLOAD_DB = process.env.COUCHDB_UPLOAD_DB;

const authHeader = () =>
  "Basic " +
  Buffer.from(
    `${process.env.COUCHDB_UPLOAD_USER}:${process.env.COUCHDB_UPLOAD_PASSWORD}`
  ).toString("base64");

const uploadToSandbox = async (req, res) => {
  try {
    const doc = req.body;
    if (!doc || typeof doc !== "object" || Array.isArray(doc)) {
      return res
        .status(400)
        .json({ error: "Request body must be a JSON object" });
    }

    // POST to the database → CouchDB generates the _id.
    const response = await axios.post(`${COUCHDB_URL}/${UPLOAD_DB}`, doc, {
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
    });

    res.status(201).json({
      ok: true,
      id: response.data.id,
      rev: response.data.rev,
    });
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
