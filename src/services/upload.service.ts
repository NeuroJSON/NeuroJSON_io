import { baseURL } from "services/instance";

export interface UploadResponse {
  status: number; // HTTP status
  data: any; // parsed JSON body
}

export interface UploadRecord {
  internal_id: string; // permanent logical-dataset id (also the sandbox _id)
  dataset_id: string | null; // final public id — null until promoted
  requested_dataset_id: string | null;
  dataset_name: string | null;
  submission_id: string | null;
  status:
    | "pending"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "promoted"
    | null;
  created_at: string | null;
  updated_at: string | null;
  promoted_db: string | null;
  promoted_at: string | null;
}

export interface UploadDetail {
  internal_id: string;
  dataset_id: string | null;
  requested_dataset_id: string | null;
  dataset_name: string | null;
  submission_id: string | null;
  status: UploadRecord["status"];
  created_at: string | null;
  updated_at: string | null;
  promoted_db: string | null;
  promoted_at: string | null;
}

export interface Comment {
  id: number;
  username: string; // owner's real name, or "Reviewer" (identity masked)
  message: string;
  created_at: string;
  is_owner: boolean;
}

// POST /api/v1/uploads — submit a JSON dataset for review. fetch with
// credentials:"include" sends the httpOnly auth cookie (the shared axios
// instance has withCredentials:false). Returns status + body so the caller
// branches on 201 (ok) / 409 (confirmation or blocked) / 400 / 403 itself.
export const UploadService = {
  uploadJson: async (
    doc: unknown,
    opts?: {
      internalId?: string;
      datasetName?: string;
      requestedDatasetId?: string;
      confirm?: boolean;
    }
  ): Promise<UploadResponse> => {
    const params = new URLSearchParams();
    if (opts?.internalId) params.set("internalId", opts.internalId);
    if (opts?.datasetName) params.set("datasetName", opts.datasetName);
    if (opts?.requestedDatasetId)
      params.set("requestedDatasetId", opts.requestedDatasetId);
    if (opts?.confirm) params.set("confirm", "true");
    const qs = params.toString() ? `?${params.toString()}` : "";

    const response = await fetch(`${baseURL}/uploads${qs}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
  },

  listMine: async (): Promise<UploadRecord[]> => {
    const res = await fetch(`${baseURL}/uploads`, { credentials: "include" });
    if (!res.ok) throw new Error(`Failed to load uploads (${res.status})`);
    return res.json();
  },

  getUpload: async (internalId: string): Promise<UploadDetail> => {
    const res = await fetch(`${baseURL}/uploads/${internalId}`, {
      credentials: "include",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to load dataset (${res.status})`);
    }
    return res.json();
  },

  listComments: async (internalId: string): Promise<Comment[]> => {
    const res = await fetch(`${baseURL}/uploads/${internalId}/comments`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error(`Failed to load comments (${res.status})`);
    return res.json();
  },

  postComment: async (internalId: string, message: string): Promise<Comment> => {
    const res = await fetch(`${baseURL}/uploads/${internalId}/comments`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `Failed to post comment (${res.status})`);
    }
    return res.json();
  },
};
