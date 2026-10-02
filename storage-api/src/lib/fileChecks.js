// File checks for a finished upload. The ZIP check is SCREENING ONLY (first
// bytes) — the archive is never opened or extracted here.
import crypto from "node:crypto";
import fs from "node:fs";
import fsp from "node:fs/promises";

const ZIP_MAGIC = Buffer.from([0x50, 0x4b, 0x03, 0x04]); // "PK\x03\x04"

export const looksLikeZip = async (file) => {
  const fh = await fsp.open(file, "r");
  try {
    const buf = Buffer.alloc(4);
    const { bytesRead } = await fh.read(buf, 0, 4, 0);
    return bytesRead === 4 && buf.equals(ZIP_MAGIC);
  } finally {
    await fh.close();
  }
};

// Streamed (constant memory), so it works for very large files.
export const sha256File = (file) =>
  new Promise((resolve, reject) => {
    const hash = crypto.createHash("sha256");
    fs.createReadStream(file, { highWaterMark: 4 * 1024 * 1024 })
      .on("data", (chunk) => hash.update(chunk))
      .on("error", reject)
      .on("end", () => resolve(hash.digest("hex")));
  });

// Make a rename durable: fsync the directory that now holds the file.
export const fsyncDir = async (dir) => {
  const fh = await fsp.open(dir, "r");
  try {
    await fh.sync();
  } finally {
    await fh.close();
  }
};
