import {
  RawUploadError,
  RawUploadService,
  RawUploadSession,
} from "services/rawUpload.service";
import * as tus from "tus-js-client";

// Sends one raw ZIP from the browser straight to the storage API with tus,
// resumably, in chunks. REN only hands out the session and short-lived
// tokens; the token is kept in memory (never in localStorage).

export interface RawUploaderCallbacks {
  onProgress?: (sent: number, total: number) => void;
  onFinished?: () => void; // every byte stored — the server now verifies it
  onError?: (message: string, canResume: boolean) => void;
}

const REFRESH_MARGIN_MS = 3 * 60 * 1000; // renew tokens with < 3 min left
// Statuses where retrying the same request can't help.
const STOP_STATUSES = new Set([400, 403, 404, 409, 410, 413, 507]);

export const rawUploadSupported = tus.isSupported;

// Turn any upload error into a short message + whether Resume makes sense.
const describeError = (err: any): { message: string; canResume: boolean } => {
  const cause = err?.causingError ?? err;
  if (cause instanceof RawUploadError) {
    // A token refresh with REN failed.
    if (cause.status === 401) {
      return {
        message:
          "Your login session ended. Log in again, then choose the same file to continue.",
        canResume: false,
      };
    }
    return { message: cause.message, canResume: false };
  }
  const status: number = err?.originalResponse?.getStatus?.() ?? 0;
  const body: string = (err?.originalResponse?.getBody?.() || "").trim();
  if (STOP_STATUSES.has(status)) {
    return {
      message: body || `The upload was refused (HTTP ${status}).`,
      canResume: false,
    };
  }
  if (status === 401) {
    return {
      message: "The upload permission expired. Click Resume to continue.",
      canResume: true,
    };
  }
  return {
    message: "The connection was interrupted. Click Resume to continue.",
    canResume: true,
  };
};

export class RawUploader {
  readonly internalId: string;
  readonly file: File;
  private session: RawUploadSession;
  private callbacks: RawUploaderCallbacks;
  private upload: tus.Upload | null = null;
  private token: string;
  private tokenExpiresAt: number;

  private constructor(
    internalId: string,
    file: File,
    session: RawUploadSession,
    callbacks: RawUploaderCallbacks
  ) {
    this.internalId = internalId;
    this.file = file;
    this.session = session;
    this.callbacks = callbacks;
    this.token = session.token;
    this.tokenExpiresAt = Date.parse(session.expiresAt);
  }

  // Ask REN for a session (new, or the existing one for this same file) and
  // start sending. Throws RawUploadError, e.g. ACTIVE_UPLOAD_EXISTS when a
  // DIFFERENT file is already being uploaded for this version.
  static async begin(
    internalId: string,
    file: File,
    callbacks: RawUploaderCallbacks
  ): Promise<RawUploader> {
    const session = await RawUploadService.start(internalId, {
      name: file.name,
      size: file.size,
    });
    const uploader = new RawUploader(internalId, file, session, callbacks);
    uploader.start();
    return uploader;
  }

  get uploadId() {
    return this.session.uploadId;
  }

  get resumed() {
    return this.session.resumed;
  }

  private async currentToken(): Promise<string> {
    if (Date.now() < this.tokenExpiresAt - REFRESH_MARGIN_MS) return this.token;
    const fresh = await RawUploadService.refreshToken(
      this.internalId,
      this.session.uploadId
    );
    this.token = fresh.token;
    this.tokenExpiresAt = Date.parse(fresh.expiresAt);
    return this.token;
  }

  private start() {
    const { endpoint, uploadId, chunkSize, resumed } = this.session;
    this.upload = new tus.Upload(this.file, {
      endpoint,
      // The upload id is known, so resume exactly that upload: tus asks the
      // server for its offset and continues. (If the server has nothing yet,
      // tus creates it — same id, since the server names uploads by token.)
      uploadUrl: resumed ? `${endpoint}/${uploadId}` : null,
      chunkSize,
      metadata: {
        filename: this.file.name, // display only; never used for paths
        filetype: this.file.type || "application/zip",
      },
      storeFingerprintForResuming: false, // we resume by upload id instead
      retryDelays: [0, 1000, 3000, 5000, 10000, 20000, 30000, 60000],
      onBeforeRequest: async (req) => {
        req.setHeader("Authorization", `Bearer ${await this.currentToken()}`);
      },
      onShouldRetry: (err) => {
        const status = err.originalResponse?.getStatus() ?? 0;
        if (status === 401) {
          this.tokenExpiresAt = 0; // next attempt fetches a fresh token
          return true;
        }
        return !STOP_STATUSES.has(status); // network errors, 5xx, 423 → retry
      },
      onProgress: (sent, total) => this.callbacks.onProgress?.(sent, total),
      onSuccess: () => this.callbacks.onFinished?.(),
      onError: (err) => {
        const { message, canResume } = describeError(err);
        this.callbacks.onError?.(message, canResume);
      },
    });
    this.upload.start();
  }

  // Stop sending; the server keeps what it has.
  async pause() {
    await this.upload?.abort(false);
  }

  // Continue from the server's offset (tus re-checks it first).
  resume() {
    this.upload?.start();
  }

  // Stop, ask the storage API to drop the partial data, and tell REN. If the
  // storage call fails, REN's cleanup job removes the leftovers anyway.
  async cancel() {
    try {
      await this.upload?.abort(true);
    } catch {
      // already finished or not created yet — REN's cancel still applies
    }
    await RawUploadService.cancel(this.internalId, this.session.uploadId);
  }
}
