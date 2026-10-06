import { baseURL } from "services/instance";

// Calls to REN's raw ZIP routes (/api/v1/uploads/:internalId/raw…). The file
// itself never goes through REN — the browser sends it to the storage API
// with tus (see utils/rawUploader.ts), using the token these routes return.

export type RawAttemptStatus =
  | "initiated"
  | "uploading"
  | "verifying"
  | "complete"
  | "failed"
  | "cancelled"
  | "expired";

export type RawExtractionStatus =
  | "not_extracted"
  | "extracting"
  | "extracted"
  | "failed";

// One upload attempt (the active one, or the last failed/cancelled/expired one).
export interface RawUploadSummary {
  uploadId: string;
  status: RawAttemptStatus;
  filename: string | null;
  size: number;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

// The ZIP this version currently uses.
export interface RawCurrentZip {
  rawId: string;
  filename: string | null;
  size: number;
  sha256: string;
  extractionStatus: RawExtractionStatus;
  carriedForward: boolean;
  uploadedAt: string;
}

export interface RawStatus {
  rawZipExpected: boolean;
  editable: boolean;
  maxUploadBytes: number; // server's per-file limit (bytes)
  current: RawCurrentZip | null;
  activeUpload: RawUploadSummary | null;
  lastUpload: RawUploadSummary | null;
}

// What REN returns when an upload starts (or resumes).
export interface RawUploadSession {
  uploadId: string;
  endpoint: string; // storage API tus endpoint, e.g. https://…/neurojson-storage/files
  token: string; // short-lived upload token (memory only — never stored)
  expiresAt: string;
  chunkSize: number;
  resumed: boolean; // true = continue the existing upload for this file
}

export interface RawUploadToken {
  token: string;
  expiresAt: string;
}

// Error from a raw route that keeps REN's code (e.g. ACTIVE_UPLOAD_EXISTS,
// FILE_TOO_LARGE, NOT_EDITABLE) and extra fields (e.g. the other upload), so
// the UI can react to each case instead of only showing a message.
export class RawUploadError extends Error {
  status: number;
  code?: string;
  details: any;

  constructor(message: string, status: number, code?: string, details?: any) {
    super(message);
    this.name = "RawUploadError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

const request = async <T>(
  method: string,
  path: string,
  body?: unknown
): Promise<T> => {
  const res = await fetch(`${baseURL}/uploads${path}`, {
    method,
    credentials: "include",
    headers:
      body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new RawUploadError(
      data.error || `Request failed (${res.status})`,
      res.status,
      data.code,
      data
    );
  }
  return data as T;
};

export const RawUploadService = {
  // Current ZIP + active/last upload for the dataset's latest version.
  getStatus: (internalId: string) =>
    request<RawStatus>("GET", `/${internalId}/raw`),

  // Start an upload, or get the active one back (same name + size → resumed).
  start: (internalId: string, file: { name: string; size: number }) =>
    request<RawUploadSession>("POST", `/${internalId}/raw`, {
      filename: file.name,
      size: file.size,
    }),

  // Fresh token for a long upload (tokens last 15 minutes).
  refreshToken: (internalId: string, uploadId: string) =>
    request<RawUploadToken>("POST", `/${internalId}/raw/${uploadId}/token`),

  cancel: (internalId: string, uploadId: string) =>
    request<{ status: string }>("DELETE", `/${internalId}/raw/${uploadId}`),

  // "This dataset includes raw data" checkbox.
  setExpected: (internalId: string, expected: boolean) =>
    request<{ rawZipExpected: boolean }>(
      "PATCH",
      `/${internalId}/raw/expected`,
      { expected }
    ),
};
