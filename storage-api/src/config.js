// Read and check all settings at startup. If anything is wrong, list every
// problem and refuse to start (better than failing on the first upload).
import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const problems = [];
const env = process.env;

const parseJson = (name) => {
  try {
    return JSON.parse(env[name] || "");
  } catch {
    problems.push(`${name} must be valid JSON`);
    return {};
  }
};

const basePath = (env.BASE_PATH || "/neurojson-storage").replace(/\/+$/, "");
if (!basePath.startsWith("/")) problems.push("BASE_PATH must start with /");

if (!env.UPLOAD_ROOT) problems.push("UPLOAD_ROOT is required");
const uploadRoot = path.resolve(env.UPLOAD_ROOT || ".");

const allowedOrigins = (env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (!allowedOrigins.length) problems.push("ALLOWED_ORIGINS is required");

// Public keys by kid; each must be a real Ed25519 public key.
const tokenPublicKeys = {};
for (const [kid, pem] of Object.entries(
  parseJson("UPLOAD_TOKEN_PUBLIC_KEYS")
)) {
  try {
    const key = crypto.createPublicKey(pem);
    if (key.asymmetricKeyType !== "ed25519") throw new Error();
    tokenPublicKeys[kid] = key;
  } catch {
    problems.push(
      `UPLOAD_TOKEN_PUBLIC_KEYS["${kid}"] is not an Ed25519 public key`
    );
  }
}
if (!Object.keys(tokenPublicKeys).length) {
  problems.push("UPLOAD_TOKEN_PUBLIC_KEYS has no keys");
}

const hmacKeys = parseJson("STORAGE_HMAC_KEYS");
const hmacActiveKid = env.STORAGE_HMAC_ACTIVE_KID;
if (!hmacActiveKid || !hmacKeys[hmacActiveKid]) {
  problems.push(
    "STORAGE_HMAC_ACTIVE_KID must name a key in STORAGE_HMAC_KEYS"
  );
}

const num = (name, def) => {
  const v = Number(env[name] ?? def);
  if (!Number.isFinite(v) || v < 0) {
    problems.push(`${name} must be a positive number`);
  }
  return v;
};

export const config = {
  host: env.HOST || "127.0.0.1",
  port: num("PORT", 8090),
  basePath,
  uploadRoot,
  incomingDir: path.join(uploadRoot, ".incoming"),
  outboxDir: path.join(uploadRoot, ".outbox"),
  allowedOrigins,
  mainApiUrl: (env.MAIN_API_URL || "").replace(/\/+$/, ""), // "" = pushes off
  tokenPublicKeys,
  hmacKeys,
  hmacActiveKid,
  maxUploadBytes: num("MAX_UPLOAD_BYTES", 50000000000), // 50 GB (decimal)
  diskReservePercent: num("DISK_RESERVE_PERCENT", 5),
};

if (problems.length) {
  console.error(
    "storage-api: invalid configuration:\n  - " + problems.join("\n  - ")
  );
  process.exit(1);
}

// Working folders (the root itself must already exist and be writable).
try {
  fs.accessSync(uploadRoot, fs.constants.W_OK);
  for (const dir of [config.incomingDir, config.outboxDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
} catch (e) {
  console.error(
    `storage-api: UPLOAD_ROOT is not writable: ${uploadRoot} (${e.code})`
  );
  process.exit(1);
}
