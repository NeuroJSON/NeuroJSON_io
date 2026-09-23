import { baseURL } from "services/instance";

export interface UploadResponse {
  status: number; // HTTP status
  data: any; // parsed JSON body
}

export interface UploadRecord {
  dataset_id: string;
  dataset_name: string | null;
  status:
    | "pending"
    | "changes_requested"
    | "approved"
    | "rejected"
    | "promoted";
  review_note: string | null;
  created_at: string;
  updated_at: string;
  reviewed_at: string | null;
  promoted_db: string | null;
  promoted_at: string | null;
}

// POST /api/v1/uploads — submit a JSON dataset for review. fetch with
// credentials:"include" sends the httpOnly auth cookie (the shared axios
// instance has withCredentials:false). Returns status + body so the caller
// branches on 201 (ok) / 409 (confirmation or blocked) / 400 / 403 itself.
export const UploadService = {
  uploadJson: async (
    doc: unknown,
    opts?: { datasetId?: string; datasetName?: string; confirm?: boolean }
  ): Promise<UploadResponse> => {
    const params = new URLSearchParams();
    if (opts?.datasetId) params.set("datasetId", opts.datasetId);
    if (opts?.datasetName) params.set("datasetName", opts.datasetName);
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
};
