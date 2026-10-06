// All storage paths are built ONLY from token claims (UUIDs), never from
// anything else the client sends, and must stay inside UPLOAD_ROOT.
import path from "node:path";
import { config } from "../config.js";

const inside = (p) => {
  const root = config.uploadRoot + path.sep;
  if (!p.startsWith(root)) throw new Error("path escapes UPLOAD_ROOT");
  return p;
};

export const incomingFile = (uploadId) =>
  inside(path.join(config.incomingDir, uploadId));

export const rawObjectDir = (internalId, rawId) =>
  inside(path.join(config.uploadRoot, internalId, "raw", rawId));

// Relative key stored in Postgres (never an absolute path).
export const rawZipKey = (internalId, rawId) =>
  `${internalId}/raw/${rawId}/source.zip`;
