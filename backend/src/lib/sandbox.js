// Sandbox CouchDB (draft JSON documents, _id = internal_id). Server-side only:
// the URL and login never reach the browser.
const axios = require("axios");

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

const sandboxDocUrl = (internalId) =>
  `${UPLOAD_URL}/${UPLOAD_DB}/${encodeURIComponent(internalId)}`;

// Remove the working copy. Already gone = done.
const deleteSandboxDoc = async (internalId) => {
  try {
    const { data } = await axios.get(sandboxDocUrl(internalId), {
      headers: buildHeaders(),
    });
    await axios.delete(
      `${sandboxDocUrl(internalId)}?rev=${encodeURIComponent(data._rev)}`,
      {
        headers: buildHeaders(),
      }
    );
  } catch (err) {
    if (err.response?.status === 404) return;
    throw err;
  }
};

module.exports = {
  UPLOAD_URL,
  UPLOAD_DB,
  buildHeaders,
  sandboxDocUrl,
  deleteSandboxDoc,
};
