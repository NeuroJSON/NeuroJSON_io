// DEV ONLY: print a signed tus-upload token for a test upload of <size> bytes,
// with made-up ids (the storage API doesn't ask REN about uploads yet).
// Usage: node scripts/mint-test-upload-token.js <size>
require("dotenv").config({ quiet: true });
const crypto = require("crypto");
const { signUploadToken } = require("../src/lib/uploadTokens");

const size = Number(process.argv[2]);
if (!Number.isSafeInteger(size) || size <= 0) {
  console.error("usage: node scripts/mint-test-upload-token.js <size-in-bytes>");
  process.exit(1);
}
const ids = {
  uploadId: crypto.randomUUID(),
  internalId: crypto.randomUUID(),
  submissionId: crypto.randomUUID(),
};
const { token } = signUploadToken({ userId: 0, ...ids, expectedSize: size });
console.log(JSON.stringify({ ...ids, size, token }));
