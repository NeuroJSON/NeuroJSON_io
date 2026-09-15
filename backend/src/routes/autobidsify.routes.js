const express = require("express");
const { uploadToSandbox } = require("../controllers/autobidsify.controller");

const router = express.Router();

// POST /api/v1/autobidsify/upload — upload a JSON document to the sandbox db.
router.post("/upload", uploadToSandbox);

module.exports = router;
