// tus resumable uploads into UPLOAD_ROOT/.incoming/<uploadId>.
// The upload id = the token's `uid` (assigned by REN), so URLs are
// <BASE_PATH>/files/<uploadId>. Finishing (verify → ask REN → move) comes next.
import fs from "node:fs/promises";
import { Server } from "@tus/server";
import { FileStore } from "@tus/file-store";
import { config } from "../config.js";
import { getClaims, tusError } from "../lib/tusAuth.js";
import { hasRoomFor } from "../lib/diskSpace.js";
import { incomingFile, rawObjectDir } from "../lib/paths.js";

const exists = (p) =>
  fs.access(p).then(
    () => true,
    () => false
  );

export const tusServer = new Server({
  path: `${config.basePath}/files`,
  datastore: new FileStore({
    directory: config.incomingDir,
    expirationPeriodInMilliseconds: 7 * 24 * 3600 * 1000, // idle uploads expire after 7 days
  }),
  respectForwardedHeaders: true, // Apache sets X-Forwarded-Proto/Host → https Location URLs
  allowedOrigins: config.allowedOrigins,
  allowedHeaders: ["Authorization"],
  allowedCredentials: false, // Bearer token, no cookies
  disableTerminationForFinishedUploads: true,

  // Runs FIRST on create: the token decides the upload id.
  namingFunction: async (req) => getClaims(req).uid,

  // The upload can never be bigger than the size REN signed into the token.
  maxSize: async (req, id) =>
    id ? getClaims(req).len : config.maxUploadBytes,

  // Every request: valid token, and the URL's upload id must be the token's.
  onIncomingRequest: async (req, uploadId) => {
    if (getClaims(req).uid !== uploadId) {
      throw tusError(403, "This token is not for this upload.");
    }
  },

  onUploadCreate: async (req, upload) => {
    const c = getClaims(req);
    if (upload.size === undefined) {
      throw tusError(400, "The file size must be known when the upload starts.");
    }
    if (upload.size !== c.len) {
      throw tusError(
        400,
        "Upload-Length must equal the size declared to NeuroJSON."
      );
    }
    // Never restart an upload that already has data (that would wipe
    // progress), and never re-create one that already finished.
    if (
      (await exists(incomingFile(c.uid))) ||
      (await exists(rawObjectDir(c.iid, c.uid)))
    ) {
      throw tusError(409, "This upload already exists. Resume it instead.");
    }
    if (!(await hasRoomFor(upload.size, c.uid))) {
      throw tusError(507, "Not enough storage space for this file right now.");
    }
    // Server-side facts for the finish step; these win over client metadata.
    return {
      metadata: {
        ...upload.metadata,
        nj_internal_id: c.iid,
        nj_submission_id: c.sid,
        nj_upload_id: c.uid,
      },
    };
  },

  onUploadFinish: async (req, upload) => {
    // Next step replaces this: write outbox record → verify → ask REN → move.
    console.log(`upload complete: ${upload.id} (${upload.size} bytes)`);
    return {};
  },

  // Our own errors ({status_code, body}) pass through; anything unexpected
  // becomes a generic 500 so file paths / stack details never reach the client.
  onResponseError: async (req, err) => {
    if (err && typeof err.status_code === "number") return undefined;
    console.error("tus error:", err?.message || err);
    return { status_code: 500, body: "Internal server error.\n" };
  },
});
