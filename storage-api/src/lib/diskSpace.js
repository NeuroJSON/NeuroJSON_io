// Free space minus what in-progress uploads still need, so two big uploads
// can't each pass the check and then fill the disk together. Computed fresh
// from .incoming/ (survives restarts; creates are rare, so a scan is cheap).
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

// Bytes other active uploads still have to write.
const reservedBytes = async (exceptId) => {
  let total = 0;
  for (const name of await fs.readdir(config.incomingDir)) {
    if (!name.endsWith(".json")) continue;
    const id = name.slice(0, -5);
    if (id === exceptId) continue;
    try {
      const meta = JSON.parse(
        await fs.readFile(path.join(config.incomingDir, name), "utf8")
      );
      const written = (await fs.stat(path.join(config.incomingDir, id))).size;
      if (Number.isFinite(meta.size)) total += Math.max(0, meta.size - written);
    } catch {
      // half-written or removed meanwhile — ignore
    }
  }
  return total;
};

// true if `size` more bytes fit, keeping DISK_RESERVE_PERCENT of the disk free.
export const hasRoomFor = async (size, uploadId) => {
  const s = await fs.statfs(config.uploadRoot);
  const free = s.bavail * s.bsize;
  const margin = (s.blocks * s.bsize * config.diskReservePercent) / 100;
  return free - (await reservedBytes(uploadId)) - margin >= size;
};
