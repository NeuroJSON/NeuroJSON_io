// Short-lived EdDSA (Ed25519) JWTs that let the browser talk to the Zodiac
// storage API. REN signs with the private key; Zodiac verifies with a
// kid -> public-key map (so keys can rotate). Built on Node's crypto (no jose:
// jose 6 is ESM-only and this backend is CommonJS).
const crypto = require("crypto");

const ISSUER = "neurojson-api";
const AUDIENCE = "zodiac-storage";
const DEFAULT_TTL_SECONDS = 15 * 60;
const CLOCK_LEEWAY_SECONDS = 30;

const b64url = (v) =>
  Buffer.from(typeof v === "string" ? v : JSON.stringify(v)).toString(
    "base64url"
  );

let signer; // cached { key, kid }
const getSigner = () => {
  if (signer) return signer;
  const pem = process.env.UPLOAD_TOKEN_PRIVATE_KEY;
  const kid = process.env.UPLOAD_TOKEN_KID;
  if (!pem || !kid) {
    throw new Error(
      "Upload token key not configured (UPLOAD_TOKEN_PRIVATE_KEY / UPLOAD_TOKEN_KID)."
    );
  }
  const key = crypto.createPrivateKey(pem);
  if (key.asymmetricKeyType !== "ed25519") {
    throw new Error("UPLOAD_TOKEN_PRIVATE_KEY must be an Ed25519 key.");
  }
  signer = { key, kid };
  return signer;
};

// Sign a token of a given purpose (typ) with extra claims.
const signToken = (typ, claims, ttlSeconds = DEFAULT_TTL_SECONDS) => {
  const { key, kid } = getSigner();
  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: "EdDSA", typ: "JWT", kid };
  const payload = {
    iss: ISSUER,
    aud: AUDIENCE,
    typ,
    iat,
    exp: iat + ttlSeconds,
    jti: crypto.randomUUID(),
    ...claims,
  };
  const input = `${b64url(header)}.${b64url(payload)}`;
  const sig = crypto.sign(null, Buffer.from(input), key).toString("base64url");
  return {
    token: `${input}.${sig}`,
    expiresAt: new Date(payload.exp * 1000).toISOString(),
  };
};

// Token for all tus requests of ONE upload. `len` = exact Upload-Length.
const signUploadToken = ({
  userId,
  uploadId,
  internalId,
  submissionId,
  expectedSize,
}) =>
  signToken("tus-upload", {
    sub: String(userId),
    uid: uploadId,
    iid: internalId,
    sid: submissionId,
    len: expectedSize,
  });

// Strict verification (used by Zodiac; also by REN's self-test).
// publicKeys: { [kid]: pem | KeyObject }. Throws on any problem.
const verifyToken = (token, publicKeys, expectedTyp) => {
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

module.exports = {
  signToken,
  signUploadToken,
  verifyToken,
  DEFAULT_TTL_SECONDS,
};
