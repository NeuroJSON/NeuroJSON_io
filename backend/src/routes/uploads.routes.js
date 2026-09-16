const express = require("express");
const rateLimit = require("express-rate-limit");
const { requireAuth } = require("../middleware/auth.middleware");
const { createUpload } = require("../controllers/uploads.controller");

const router = express.Router();

// Per-USER daily cap so one account can't flood the server. requireAuth runs
// first, so req.user is set and we key by user id (falls back to IP). The limit
// is configurable via UPLOAD_RATE_LIMIT_MAX (default 20) — no code change to tune.
const uploadRateLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: parseInt(process.env.UPLOAD_RATE_LIMIT_MAX || "20", 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.user && req.user.id ? String(req.user.id) : req.ip),
  message: {
    error: "Daily upload limit reached. Please try again tomorrow.",
  },
});

// POST /api/v1/uploads — upload a JSON document (logged-in users only).
router.post("/", requireAuth, uploadRateLimit, createUpload);

module.exports = router;
