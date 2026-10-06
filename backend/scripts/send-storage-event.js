// Send a signed storage event to the local backend, as Zodiac would (testing).
// Usage: node scripts/send-storage-event.js <uploadId> <event> [size] [sha256|reason]
require("dotenv").config({ quiet: true });
const { signRequest } = require("../src/lib/storageSignature");

const [uploadId, event, size, extra] = process.argv.slice(2);
if (!uploadId || !event) {
  console.log(
    "usage: node scripts/send-storage-event.js <uploadId> <started|verified|committed|failed> [size] [sha256|reason]"
  );
  process.exit(1);
}
const payload = { event };
if (event === "verified" || event === "committed") {
  Object.assign(payload, { size: Number(size), sha256: extra });
}
if (event === "failed") payload.reason = size || "storage_error";

const base = process.env.MAIN_API_LOCAL_URL || "http://localhost:5000";
const path = `/api/v1/internal/storage/uploads/${uploadId}/events`;
const body = JSON.stringify(payload);

fetch(base + path, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    ...signRequest({ method: "POST", path, body }),
  },
  body,
})
  .then(async (r) => console.log(r.status, await r.text()))
  .catch((e) => console.log("request failed:", e.message));
