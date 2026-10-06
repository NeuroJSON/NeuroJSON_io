// Server-to-server routes called by the Zodiac storage API (never the browser).
// Mounted in server.js BEFORE the global express.json(), so this router can
// keep the raw body for the HMAC check.
const express = require("express");
const {
  verifyStorageSignature,
} = require("../middleware/verifyStorageSignature");
const {
  handleUploadEvent,
} = require("../controllers/storageEvents.controller");

const router = express.Router();

router.use(
  express.json({
    limit: "1mb",
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);
router.use(verifyStorageSignature);

router.post("/storage/uploads/:uploadId/events", handleUploadEvent);

module.exports = router;
