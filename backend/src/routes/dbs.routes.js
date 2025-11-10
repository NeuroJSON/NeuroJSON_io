// request send to couchdb
const express = require("express");
const {
  getDbList,
  getDbStats,
  getDbInfo,
  getDbDatasets,
  searchAllDatabases,
  searchDatabase,
} = require("../controllers/couchdb.controller");

const router = express.Router();

// Database list and stats
router.get("/", getDbList);
router.get("/stats", getDbStats);

// cross dbs search
router.post("/search", searchAllDatabases);

// Specific database routes
router.get("/:dbName", getDbInfo);
router.get("/:dbName/datasets", getDbDatasets);
router.post("/:dbName/search", searchDatabase); // search within one db

module.exports = router;
