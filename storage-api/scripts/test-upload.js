// Upload a test file to the storage API with tus-js-client (Node), like the
// browser will. The test file starts with "PK\x03\x04" so the later ZIP check
// passes; it's saved under storage-dev/test-files/ so a resumed run sends the
// exact same bytes.
//
// Usage:
//   node scripts/test-upload.js '<json from backend/scripts/mint-test-upload-token.js>' \
//        [--stop-after-mb N] [--resume] [--chunk-mb 5] [--endpoint URL]
//   --stop-after-mb N  abort once N MB are uploaded (to test resuming)
//   --resume           continue an existing upload (HEAD → PATCH from its offset)
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import * as tus from "tus-js-client";

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(name);
  return i === -1 ? def : args[i + 1];
};
let info;
try {
  info = JSON.parse(args[0]);
} catch {
  console.log("first argument must be the JSON printed by mint-test-upload-token.js");
  process.exit(1);
}
const endpoint = opt(
  "--endpoint",
  "http://127.0.0.1:8090/neurojson-storage/files"
);
const chunkSize = Number(opt("--chunk-mb", 5)) * 1024 * 1024;
const stopAfter = opt("--stop-after-mb") && Number(opt("--stop-after-mb")) * 1024 * 1024;
const resume = args.includes("--resume");

// Same bytes every run for the same upload id.
const dir = path.resolve("storage-dev/test-files");
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `${info.uploadId}.zip`);
if (!fs.existsSync(file)) {
  const buf = crypto.randomBytes(info.size);
  Buffer.from([0x50, 0x4b, 0x03, 0x04]).copy(buf, 0); // "PK\x03\x04"
  fs.writeFileSync(file, buf);
}
const data = fs.readFileSync(file);

let stopped = false;
const upload = new tus.Upload(data, {
  endpoint,
  uploadUrl: resume ? `${endpoint}/${info.uploadId}` : undefined,
  uploadSize: data.length,
  chunkSize,
  headers: { Authorization: `Bearer ${info.token}` },
  metadata: { filename: `${info.uploadId}.zip` },
  retryDelays: [0, 1000],
  onProgress: (sent, total) => {
    process.stdout.write(`\r${(sent / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} MB`);
    if (stopAfter && sent >= stopAfter && !stopped) {
      stopped = true;
      upload.abort().then(() =>
        console.log(`\nstopped at ${(sent / 1048576).toFixed(1)} MB (run again with --resume)`)
      );
    }
  },
  onError: (err) => {
    const r = err.originalResponse;
    console.log(`\nFAILED: ${r ? `HTTP ${r.getStatus()} ${r.getBody().trim()}` : err.message}`);
    process.exit(1);
  },
  onSuccess: () => console.log(`\nDONE: ${upload.url}`),
});
upload.start();
