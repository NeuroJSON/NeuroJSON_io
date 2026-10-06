// HMAC-SHA256 signatures for server-to-server calls between REN and the
// Zodiac storage API (both directions). Signs timestamp + method + path(+query)
// + SHA-256 of the raw body. Secrets are a kid -> secret map so they can rotate.
const crypto = require("crypto");

const MAX_SKEW_SECONDS = 300;
const H_KID = "x-nj-key-id";
const H_TS = "x-nj-timestamp";
const H_SIG = "x-nj-signature";

const loadKeys = () => {
  try {
    return JSON.parse(process.env.STORAGE_HMAC_KEYS || "{}");
  } catch {
    throw new Error("STORAGE_HMAC_KEYS is not valid JSON.");
  }
};

const sha256hex = (buf) =>
  crypto.createHash("sha256").update(buf || "").digest("hex");
const canonical = (ts, method, path, body) =>
  [ts, String(method).toUpperCase(), path, sha256hex(body)].join("\n");

// Headers to attach to an outgoing request. `body` = the exact bytes/string sent.
const signRequest = ({ method, path, body = "" }) => {
  const kid = process.env.STORAGE_HMAC_ACTIVE_KID;
  const secret = loadKeys()[kid];
  if (!kid || !secret) throw new Error("Storage HMAC key not configured.");
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = crypto
    .createHmac("sha256", secret)
    .update(canonical(ts, method, path, body))
    .digest("base64url");
  return { [H_KID]: kid, [H_TS]: ts, [H_SIG]: sig };
};

// Check an incoming request. `path` must include the query string exactly as
// sent; `rawBody` must be the unparsed bytes. Returns { ok, reason }.
const verifyRequest = ({ method, path, headers, rawBody }) => {
  const kid = headers[H_KID];
  const ts = headers[H_TS];
  const sig = headers[H_SIG];
  if (!kid || !ts || !sig) {
    return { ok: false, reason: "missing signature headers" };
  }
  const secret = loadKeys()[kid];
  if (!secret) return { ok: false, reason: "unknown key id" };
  const now = Math.floor(Date.now() / 1000);
  if (!/^\d+$/.test(ts) || Math.abs(now - Number(ts)) > MAX_SKEW_SECONDS) {
    return { ok: false, reason: "timestamp out of range" };
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(canonical(ts, method, path, rawBody))
    .digest();
  const given = Buffer.from(String(sig), "base64url");
  if (
    given.length !== expected.length ||
    !crypto.timingSafeEqual(given, expected)
  ) {
    return { ok: false, reason: "bad signature" };
  }
  return { ok: true, kid };
};

module.exports = {
  signRequest,
  verifyRequest,
  HEADER_NAMES: { H_KID, H_TS, H_SIG },
};
