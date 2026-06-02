const express = require("express");
const router = express.Router();
const { proxyChat, getTags } = require("../controllers/ollama.controller");
const { requireAuth } = require("../middleware/auth.middleware");

router.post("/bidsify", requireAuth, proxyChat);
// router.get("/tags", requireAuth, getTags);

module.exports = router;
