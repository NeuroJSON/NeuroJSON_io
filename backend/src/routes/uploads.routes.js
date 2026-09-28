const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth.middleware");
const {
  createUpload,
  listMyUploads,
  getUpload,
  getUploadDocument,
  submitForReview,
  withdrawSubmission,
  updateSettings,
  listComments,
  postComment,
} = require("../controllers/uploads.controller");

const router = express.Router();

// Per-USER daily cap so one account can't flood the server. requireAuth runs
// first, so req.user is set and we key by user id (falls back to IP). The limit
// is configurable via UPLOAD_RATE_LIMIT_MAX (default 20) — no code change to tune.
const uploadRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || "20", 10),
  standardHeaders: true,
  legacyHeaders: false,
  // requireAuth runs first, so req.user is always set — key purely by user id.
  // (Avoid referencing req.ip: express-rate-limit v7 statically flags that as
  // an IPv6-unsafe key generator.)
  keyGenerator: (req) => `user:${req.user.id}`,
  message: {
    error: "Daily upload limit reached. Please try again tomorrow.",
  },
});

// POST /api/v1/uploads — upload a JSON document (logged-in users only).
router.post("/", requireAuth, uploadRateLimit, createUpload);

// GET /api/v1/uploads — the caller's own submissions (dashboard Uploads tab).
router.get("/", requireAuth, listMyUploads);

// One dataset's detail + its review conversation (owner only).
router.get("/:internalId", requireAuth, getUpload);
router.get("/:internalId/document", requireAuth, getUploadDocument);

// Review workflow actions (owner only).
router.post("/:internalId/submit", requireAuth, submitForReview);
router.post("/:internalId/withdraw", requireAuth, withdrawSubmission);

// Publishing settings (target db + preferred id), editable without re-uploading.
router.patch("/:internalId/settings", requireAuth, updateSettings);
router.get("/:internalId/comments", requireAuth, listComments);
router.post("/:internalId/comments", requireAuth, postComment);

module.exports = router;
