// Upload-token checks for tus requests. Every tus request (create, chunk,
// resume check, cancel) must carry `Authorization: Bearer <token>`. Verified
// once per request and cached (tus calls several hooks with the same Request).
import { config } from "../config.js";
import { verifyToken } from "./uploadTokens.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const cache = new WeakMap();

// tus sends { status_code, body } to the client; body must not leak internals.
export const tusError = (status_code, message) => ({
  status_code,
  body: `${message}\n`,
});

export const getClaims = (req) => {
  if (cache.has(req)) return cache.get(req);
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  let claims;
  try {
    claims = verifyToken(token, config.tokenPublicKeys, "tus-upload");
  } catch {
    throw tusError(401, "Invalid or expired upload token.");
  }
  // Paths are built from these claims, so check their shape strictly.
  if (
    !UUID_RE.test(String(claims.uid)) ||
    !UUID_RE.test(String(claims.iid)) ||
    !UUID_RE.test(String(claims.sid)) ||
    !Number.isSafeInteger(claims.len) ||
    claims.len <= 0 ||
    claims.len > config.maxUploadBytes
  ) {
    throw tusError(401, "Invalid upload token.");
  }
  cache.set(req, claims);
  return claims;
};
