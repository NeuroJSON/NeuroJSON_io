import { baseURL } from "services/instance";

// POST /api/v1/uploads — submit a JSON document for review. Uses fetch with
// credentials:"include" (like the other authenticated calls) so the httpOnly
// auth cookie is sent; the shared axios instance has withCredentials:false.
export const UploadService = {
  uploadJson: async (doc: unknown): Promise<{ id: string; rev: string }> => {
    const response = await fetch(`${baseURL}/uploads`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(doc),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        (data as any).error ||
          (data as any).message ||
          `Upload failed (${response.status})`
      );
    }
    return data as { id: string; rev: string };
  },
};
