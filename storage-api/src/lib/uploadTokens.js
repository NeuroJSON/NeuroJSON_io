// Verify the short-lived EdDSA (Ed25519) tokens REN issues for uploads.
// Same strict checks as backend/src/lib/uploadTokens.js verifyToken — keep the
// two in sync (scripts/self-test.js exercises this copy). Zodiac never signs.
import crypto from "node:crypto";

const ISSUER = "neurojson-api";
const AUDIENCE = "zodiac-storage";
const CLOCK_LEEWAY_SECONDS = 30;

// publicKeys: { [kid]: KeyObject | pem }. Throws on any problem; returns claims.
export const verifyToken = (token, publicKeys, expectedTyp) => {
  const parts = String(token || "").split(".");
  if (parts.length !== 3) throw new Error("malformed token");
  const [h, p, s] = parts;
  const header = JSON.parse(Buffer.from(h, "base64url").toString());
  if (header.alg !== "EdDSA") throw new Error("bad alg"); // never trust other algs
  const keyMaterial = publicKeys[header.kid];
  if (!keyMaterial) throw new Error("unknown kid");
  const key =
    typeof keyMaterial === "string"
      ? crypto.createPublicKey(keyMaterial)
      : keyMaterial;
  if (key.asymmetricKeyType !== "ed25519") throw new Error("bad key type");
  const ok = crypto.verify(
    null,
    Buffer.from(`${h}.${p}`),
    key,
    Buffer.from(s, "base64url")
  );
  if (!ok) throw new Error("bad signature");
  const claims = JSON.parse(Buffer.from(p, "base64url").toString());
  const now = Math.floor(Date.now() / 1000);
  if (claims.iss !== ISSUER || claims.aud !== AUDIENCE) {
    throw new Error("bad issuer/audience");
  }
  if (claims.typ !== expectedTyp) throw new Error("wrong token type");
  if (
    typeof claims.exp !== "number" ||
    claims.exp + CLOCK_LEEWAY_SECONDS < now
  ) {
    throw new Error("expired");
  }
  if (
    typeof claims.iat !== "number" ||
    claims.iat - CLOCK_LEEWAY_SECONDS > now
  ) {
    throw new Error("issued in the future");
  }
  return claims;
};
