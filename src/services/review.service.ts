import { baseURL } from "services/instance";
import { UploadRecord } from "services/upload.service";

// Reviewer API (/api/v1/reviews). fetch + credentials:"include" sends the
// httpOnly login cookie, like upload.service.ts.

export type SubmissionStatus = Exclude<UploadRecord["status"], null>;
export type ReviewDecision = "approve" | "request_changes" | "reject";

export interface ReviewListItem {
  submission_id: string;
  status: SubmissionStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  updated_at: string | null;
  internal_id: string;
  dataset_name: string | null;
  requested_db: string | null;
  requested_dataset_id: string | null;
  owner_username: string;
  owner_email: string;
  is_own: boolean;
  raw_zip_size: string | number | null; // BIGINT arrives as a string
  json_uploaded_at: string | null;
  raw_zip_uploaded_at: string | null;
  dataset_id: string | null;
  live_version: number | null; // highest version already published by another submission
}

export interface ReviewComment {
  id: number;
  username: string; // real name (reviewers see everyone)
  message: string;
  created_at: string;
  is_owner: boolean;
}

export interface ReviewDetail
  extends Omit<ReviewListItem, "raw_zip_size" | "raw_zip_uploaded_at"> {
  dataset_id: string | null;
  json_uploaded_at: string | null;
  raw_zip_expected: boolean;
  published_version: number | null;
  promoted_db: string | null;
  is_live: boolean; // this submission is the version the live page shows
  raw_zip: {
    rawId: string;
    filename: string | null;
    size: number;
    sha256: string;
    extractionStatus: string;
    uploadedAt: string;
  } | null;
  comments: ReviewComment[];
}

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const res = await fetch(`${baseURL}/reviews${path}`, {
    credentials: "include",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.error || `Request failed (${res.status})`);
    (err as any).status = res.status;
    throw err;
  }
  return body as T;
};

export const ReviewService = {
  // true = show the Review tab. Any error (403, offline) = not a reviewer.
  canReview: async (): Promise<boolean> =>
    request<{ role: string }>("/access").then(
      () => true,
      () => false
    ),

  list: (status: SubmissionStatus = "pending") =>
    request<ReviewListItem[]>(`?status=${encodeURIComponent(status)}`),

  get: (submissionId: string) => request<ReviewDetail>(`/${submissionId}`),

  // Opened in a new tab; the backend checks the reviewer role.
  documentUrl: (submissionId: string) =>
    `${baseURL}/reviews/${submissionId}/document`,

  decide: (submissionId: string, decision: ReviewDecision, message: string) =>
    request<{ submission_id: string; status: SubmissionStatus }>(
      `/${submissionId}/decision`,
      { method: "POST", body: JSON.stringify({ decision, message }) }
    ),

  // Publish an approved submission (the backend checks everything again).
  promote: (submissionId: string) =>
    request<{
      status: SubmissionStatus;
      db: string;
      dataset_id: string;
      version: number;
      path: string;
    }>(`/${submissionId}/promote`, { method: "POST" }),

  comment: (submissionId: string, message: string) =>
    request<ReviewComment>(`/${submissionId}/comments`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),
};
