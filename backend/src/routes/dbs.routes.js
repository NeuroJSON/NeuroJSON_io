// request send to couchdb
const express = require("express");
const {
  getDbList,
  getDbStats,
  getDbInfo,
  getDbDatasets,
  searchAllDatabases,
  getFileTypes,
  getDatasetFilesManifest,
  //   searchDatabase,
} = require("../controllers/couchdb.controller");

const router = express.Router();

// Database list and stats
router.get("/", getDbList);
router.get("/stats", getDbStats);

// distinct file extensions across all iolinks rows (drives the file-type
// filter on the search page). Must come BEFORE the /:dbName route, otherwise
// Express treats "file-types" as a dbName.
router.get("/file-types", getFileTypes);

// cross-database search
router.post("/search", searchAllDatabases);

// downloadable manifest (plain text) of all iolinks URLs for a dataset
// filtered by extension(s). e.g. /dbs/bfnirs/Motion-Yucel2014-I/files/manifest?ext=.jdb
router.get("/:dbName/:dsName/files/manifest", getDatasetFilesManifest);

// Specific database routes
router.get("/:dbName", getDbInfo);
router.get("/:dbName/datasets", getDbDatasets);
// router.post("/:dbName/search", searchDatabase); // search within one db

module.exports = router;
