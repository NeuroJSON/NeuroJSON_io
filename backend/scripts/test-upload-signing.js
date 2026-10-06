// Self-test for the upload token + service-signature helpers (prints no secrets).
// Usage: node scripts/test-upload-signing.js   (reads backend/.env)
require("dotenv").config();
const crypto = require("crypto");
const {
  signUploadToken,
  verifyToken,
  signToken,
} = require("../src/lib/uploadTokens");
const { signRequest, verifyRequest } = require("../src/lib/storageSignature");

let failed = 0;
const check = (name, fn) => {
  try {
    fn();
    console.log("PASS", name);
  } catch (e) {
    failed++;
    console.log("FAIL", name, "-", e.message);
  }
};
const expectThrow = (fn, msg) => {
  try {
    fn();
  } catch {
    return;
  }
  throw new Error(`expected failure: ${msg}`);
};

const kid = process.env.UPLOAD_TOKEN_KID;
const pub = {
  [kid]: crypto.createPublicKey(process.env.UPLOAD_TOKEN_PRIVATE_KEY),
};
const { token } = signUploadToken({
  userId: 1,
  uploadId: crypto.randomUUID(),
  internalId: crypto.randomUUID(),
  submissionId: crypto.randomUUID(),
  expectedSize: 1234,
});

check("valid upload token verifies", () => {
  const c = verifyToken(token, pub, "tus-upload");
  if (c.len !== 1234) throw new Error("len claim wrong");
});
check("tampered payload is rejected", () => {
  const [h, p, s] = token.split(".");
  const bad = JSON.parse(Buffer.from(p, "base64url").toString());
  bad.len = 999999;
  const forged = `${h}.${Buffer.from(JSON.stringify(bad)).toString(
    "base64url"
  )}.${s}`;
  expectThrow(() => verifyToken(forged, pub, "tus-upload"), "tamper");
});
check("wrong token type is rejected", () =>
  expectThrow(() => verifyToken(token, pub, "file-read"), "typ")
);
check("unknown kid is rejected", () =>
  expectThrow(() => verifyToken(token, {}, "tus-upload"), "kid")
);
check("expired token is rejected", () => {
  const { token: old } = signToken("tus-upload", {}, -120);
  expectThrow(() => verifyToken(old, pub, "tus-upload"), "exp");
});

const body = JSON.stringify({ event: "verified" });
const path = "/api/v1/internal/storage/uploads/x/events";
const headers = signRequest({ method: "POST", path, body });
check("valid HMAC request verifies", () => {
  const r = verifyRequest({ method: "POST", path, headers, rawBody: body });
  if (!r.ok) throw new Error(r.reason);
});
check("HMAC rejects changed body", () => {
  const r = verifyRequest({ method: "POST", path, headers, rawBody: body + " " });
  if (r.ok) throw new Error("accepted");
});
check("HMAC rejects changed path", () => {
  const r = verifyRequest({
    method: "POST",
    path: path + "?x=1",
    headers,
    rawBody: body,
  });
  if (r.ok) throw new Error("accepted");
});

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
