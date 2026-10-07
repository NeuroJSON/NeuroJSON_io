// Sandbox CouchDB (draft JSON documents, _id = internal_id). Server-side only:
// the URL and login never reach the browser.
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

module.exports = { UPLOAD_URL, UPLOAD_DB, buildHeaders, sandboxDocUrl };
