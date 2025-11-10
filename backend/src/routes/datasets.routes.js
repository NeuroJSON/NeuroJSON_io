// request send to couchdb
const express = require("express");
const {
  // getDatasetDetail,
  // getDatasetMeta,
} = require("../controllers/couchdb.controller");

const router = express.Router();

// Dataset routes
// router.get("/:dbName/:datasetId", getDatasetDetail);
// router.get("/:dbName/:datasetId/meta", getDatasetMeta);

module.exports = router;
