// Only the Zodiac storage API may call /api/v1/internal/*: every request must
// carry a valid HMAC signature over method + path + raw body (see
// src/lib/storageSignature.js). Needs req.rawBody (set by the internal router).
const { verifyRequest } = require("../lib/storageSignature");

const verifyStorageSignature = (req, res, next) => {
  const result = verifyRequest({
    method: req.method,
    path: req.originalUrl, // includes the query string exactly as sent
    headers: req.headers,
    rawBody: req.rawBody || "",
  });
  if (!result.ok) {
    console.warn(
      "Rejected internal storage call:",
      result.reason,
      req.method,
      req.originalUrl
    );
    return res.status(401).json({ error: "Invalid service signature." });
  }
  next();
};

module.exports = { verifyStorageSignature };
