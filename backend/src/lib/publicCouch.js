const axios = require("axios");

// The CouchDB that published datasets are written to (with a least-privilege
// "promoter" login). EMPTY COUCHDB_PROMOTE_URL = publishing is OFF. For tests
// it points at a test database on the Zodiac CouchDB — never at the live
// neurojson.io CouchDB until testing is done.
const PROMOTE_URL = (process.env.COUCHDB_PROMOTE_URL || "").replace(/\/+$/, "");

const promoteEnabled = () => Boolean(PROMOTE_URL);

// Frozen copy of every published version goes here (create-only):
//   <archive db>/<db>:<dataset_id>:v<major>.<minor>
// Required while publishing is on, so no version is published without it.
const ARCHIVE_DB = (process.env.COUCHDB_PROMOTE_ARCHIVE_DB || "").trim();
const archiveIdFor = (db, id, major, minor) => `${db}:${id}:v${major}.${minor}`;

const headers = () => {
  const h = { "Content-Type": "application/json" };
  const user = process.env.COUCHDB_PROMOTE_USER;
  const pass = process.env.COUCHDB_PROMOTE_PASSWORD;
  if (user && pass) {
    h.Authorization =
      "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");
  }
  return h;
};

const docUrl = (db, id) =>
  `${PROMOTE_URL}/${encodeURIComponent(db)}/${encodeURIComponent(id)}`;

// true / false; anything else (auth, network) throws.
const dbExists = async (db) => {
  try {
    await axios.head(`${PROMOTE_URL}/${encodeURIComponent(db)}`, {
      headers: headers(),
    });
    return true;
  } catch (err) {
    if (err.response?.status === 404) return false;
    throw err;
  }
};

// The doc, or null if there is none.
const getDoc = async (db, id) => {
  try {
    const { data } = await axios.get(docUrl(db, id), { headers: headers() });
    return data;
  } catch (err) {
    if (err.response?.status === 404) return null;
    throw err;
  }
};

const putDoc = async (db, id, doc) =>
  (await axios.put(docUrl(db, id), doc, { headers: headers() })).data;

module.exports = {
  promoteEnabled,
  dbExists,
  getDoc,
  putDoc,
  ARCHIVE_DB,
  archiveIdFor,
};
