// Generate a new Ed25519 key pair (upload/file-read tokens) and an HMAC secret
// (REN <-> Zodiac service calls). Prints .env lines; writes nothing to disk.
// Usage: node scripts/generate-upload-keys.js [kid]   (default kid: dev-YYYY-MM)
const crypto = require("crypto");

const now = new Date();
const kid =
  process.argv[2] ||
  `dev-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
if (!/^[a-z0-9][a-z0-9_-]{2,40}$/.test(kid)) {
  console.error("kid must be 3-41 chars: lowercase letters, digits, - or _");
  process.exit(1);
}

const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const privPem = privateKey.export({ type: "pkcs8", format: "pem" });
const pubPem = publicKey.export({ type: "spki", format: "pem" });
const hmacSecret = crypto.randomBytes(32).toString("base64url");

// dotenv turns \n inside double quotes into real newlines.
const oneLine = (pem) => pem.trim().replace(/\n/g, "\\n");

console.log("# ---- REN  backend/.env  (keep private) ----");
console.log(`UPLOAD_TOKEN_KID=${kid}`);
console.log(`UPLOAD_TOKEN_PRIVATE_KEY="${oneLine(privPem)}"`);
console.log(`STORAGE_HMAC_ACTIVE_KID=${kid}`);
console.log(`STORAGE_HMAC_KEYS='${JSON.stringify({ [kid]: hmacSecret })}'`);
console.log("");
console.log("# ---- Zodiac  storage-api/.env ----");
console.log(
  `UPLOAD_TOKEN_PUBLIC_KEYS='${JSON.stringify({ [kid]: pubPem.trim() })}'`
);
console.log(`STORAGE_HMAC_ACTIVE_KID=${kid}`);
console.log(`STORAGE_HMAC_KEYS='${JSON.stringify({ [kid]: hmacSecret })}'`);
console.log("");
console.log("# Rotation: add the new kid to the Zodiac maps first, then switch REN");
console.log("# to the new kid, then remove the old kid after 15+ minutes.");
