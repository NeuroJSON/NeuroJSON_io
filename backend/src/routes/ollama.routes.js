const express = require("express");
const router = express.Router();
const { proxyChat, getTags } = require("../controllers/ollama.controller");

router.post("/chat", proxyChat);
router.get("/tags", getTags);

module.exports = router;
