// Send a signed request to the storage API's /internal endpoints, as REN would.
// Usage: node scripts/call-internal.js <GET|POST|DELETE> <path-after-/internal> ['<json body>']
//   e.g. node scripts/call-internal.js GET /status
//        node scripts/call-internal.js GET /uploads/<id>
//        node scripts/call-internal.js POST /uploads/<id>/decision '{"decision":"commit","rawId":"<id>"}'
//        node scripts/call-internal.js POST /uploads/<id>/ack '{"action":"keep"}'
import { config } from "../src/config.js";
import { signRequest } from "../src/lib/storageSignature.js";

const [method = "GET", sub = "/status", json = ""] = process.argv.slice(2);
const path = `${config.basePath}/internal${sub}`;
const url = `http://${config.host}:${process.env.CALL_PORT || config.port}${path}`;
const headers = {
  ...(json ? { "Content-Type": "application/json" } : {}),
  ...signRequest(
    { method, path, body: json },
    config.hmacKeys,
    config.hmacActiveKid
  ),
};
const res = await fetch(url, { method, headers, body: json || undefined });
console.log(res.status, await res.text());
