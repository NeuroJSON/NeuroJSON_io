const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const { proxyChat, getTags } = require("../controllers/ollama.controller");

const dailyLimit = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Daily request limit reached. You can send up to 10 requests per day from this IP." },
});

router.post("/chat", dailyLimit, proxyChat);
// router.get("/tags", dailyLimit, getTags);

module.exports = router;
