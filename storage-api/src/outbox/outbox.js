// Crash-safe job records on disk, one per finished upload:
//   .outbox/<uploadId>.json        pending
//   .outbox/done/<uploadId>.json   finished (kept for status lookups; cleaned up later)
//   .outbox/failed/<uploadId>.json parked for an admin (REN said 4xx, or files missing)
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";

const DIR = config.outboxDir;
const DONE = path.join(DIR, "done");
const FAILED = path.join(DIR, "failed");
await fs.mkdir(DONE, { recursive: true });
await fs.mkdir(FAILED, { recursive: true });

const fileIn = (dir, id) => path.join(dir, `${id}.json`);

// One change at a time per upload (worker vs. REN's /internal calls).
// In-memory is enough: the service runs as a single process.
const locks = new Map();
export const withLock = async (id, fn) => {
  while (locks.has(id)) await locks.get(id);
  let release;
  locks.set(
    id,
    new Promise((r) => {
      release = r;
    })
  );
  try {
    return await fn();
  } finally {
    locks.delete(id);
    release();
  }
};

// temp file → fsync → rename, so a crash never leaves a half-written record.
const writeAtomic = async (file, obj) => {
  const tmp = `${file}.tmp`;
  const fh = await fs.open(tmp, "w");
  try {
    await fh.writeFile(JSON.stringify(obj, null, 2));
    await fh.sync();
  } finally {
    await fh.close();
  }
  await fs.rename(tmp, file);
};

// Look in pending, done and failed (also used by the status endpoint).
export const findRecord = async (id) => {
  for (const [where, dir] of [
    ["pending", DIR],
    ["done", DONE],
    ["failed", FAILED],
  ]) {
    try {
      return {
        where,
        rec: JSON.parse(await fs.readFile(fileIn(dir, id), "utf8")),
      };
    } catch {
      // not here
    }
  }
  return null;
};

// Returns false if a record for this upload already exists (never overwrite).
export const createRecord = async (rec) => {
  if (await findRecord(rec.uploadId)) return false;
  const now = new Date().toISOString();
  await writeAtomic(fileIn(DIR, rec.uploadId), {
    ...rec,
    attempts: 0,
    nextAttemptAt: now,
    lastError: null,
    createdAt: now,
    updatedAt: now,
  });
  return true;
};

export const saveRecord = (rec) =>
  writeAtomic(fileIn(DIR, rec.uploadId), {
    ...rec,
    updatedAt: new Date().toISOString(),
  });

export const listPendingIds = async () =>
  (await fs.readdir(DIR))
    .filter((n) => n.endsWith(".json"))
    .map((n) => n.slice(0, -5));

export const readPending = async (id) =>
  JSON.parse(await fs.readFile(fileIn(DIR, id), "utf8"));

// Final state: save, then move out of the pending folder.
export const closeRecord = async (rec, outcome) => {
  await saveRecord(rec);
  await fs.rename(
    fileIn(DIR, rec.uploadId),
    fileIn(outcome === "failed" ? FAILED : DONE, rec.uploadId)
  );
};
