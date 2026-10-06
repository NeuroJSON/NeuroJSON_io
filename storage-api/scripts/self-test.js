// Self-test for the storage API's token + HMAC helpers and config (prints no
// secrets). Usage: npm run self-test   (reads storage-api/.env)
import crypto from "node:crypto";
import { config } from "../src/config.js"; // also validates .env (exits if wrong)
import { verifyToken } from "../src/lib/uploadTokens.js";
import { signRequest, verifyRequest } from "../src/lib/storageSignature.js";

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

// --- Tokens: sign with a THROWAWAY key in the same format REN uses ---------
const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const pub = { "test-kid": publicKey };
const b64 = (v) => Buffer.from(JSON.stringify(v)).toString("base64url");
const makeToken = (claims, ttl = 900) => {
  const iat = Math.floor(Date.now() / 1000);
  const header = { alg: "EdDSA", typ: "JWT", kid: "test-kid" };
  const payload = {
    iss: "neurojson-api",
    aud: "zodiac-storage",
    typ: "tus-upload",
    iat,
    exp: iat + ttl,
    ...claims,
  };
  const input = `${b64(header)}.${b64(payload)}`;
  const sig = crypto.sign(null, Buffer.from(input), privateKey);
  return `${input}.${sig.toString("base64url")}`;
};
const token = makeToken({ uid: crypto.randomUUID(), len: 1234 });

check("valid token verifies", () => {
  if (verifyToken(token, pub, "tus-upload").len !== 1234) {
    throw new Error("len claim wrong");
  }
});
check("tampered payload is rejected", () => {
  const [h, p, s] = token.split(".");
  const bad = JSON.parse(Buffer.from(p, "base64url").toString());
  bad.len = 999999;
  expectThrow(
    () => verifyToken(`${h}.${b64(bad)}.${s}`, pub, "tus-upload"),
    "tamper"
  );
});
check("wrong token type is rejected", () =>
  expectThrow(() => verifyToken(token, pub, "file-read"), "typ")
);
check("unknown kid is rejected", () =>
  expectThrow(() => verifyToken(token, {}, "tus-upload"), "kid")
);
check("expired token is rejected", () =>
  expectThrow(
    () => verifyToken(makeToken({}, -120), pub, "tus-upload"),
    "exp"
  )
);

// --- HMAC: uses the CONFIGURED Zodiac secret --------------------------------
const body = JSON.stringify({ event: "verified" });
const path = "/neurojson-storage/internal/uploads/x";
const headers = signRequest(
  { method: "POST", path, body },
  config.hmacKeys,
  config.hmacActiveKid
);
check("valid HMAC request verifies", () => {
  const r = verifyRequest(
    { method: "POST", path, headers, rawBody: body },
    config.hmacKeys
  );
  if (!r.ok) throw new Error(r.reason);
});
check("HMAC rejects changed body", () => {
  const r = verifyRequest(
    { method: "POST", path, headers, rawBody: body + " " },
    config.hmacKeys
  );
  if (r.ok) throw new Error("accepted");
});
check("HMAC rejects changed path", () => {
  const r = verifyRequest(
    { method: "POST", path: path + "?x=1", headers, rawBody: body },
    config.hmacKeys
  );
  if (r.ok) throw new Error("accepted");
});

// --- Config ----------------------------------------------------------------
check("configured public keys load", () => {
  const kids = Object.keys(config.tokenPublicKeys);
  if (!kids.length) throw new Error("none");
  console.log("     kids:", kids.join(", "));
});

console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
