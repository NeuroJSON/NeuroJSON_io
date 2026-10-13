// What changed since the last review decision, for a resubmitted (pending)
// submission. null = first-time submission or not pending. Shared by the
// review queue (chips) and the review page (note), so they always agree.
export type ResubmitChanges = "json+zip" | "json" | "zip" | "none" | null;

export const resubmitChanges = (s: {
  status: string;
  reviewed_at: string | null;
  json_uploaded_at: string | null;
  raw_zip_uploaded_at: string | null;
}): ResubmitChanges => {
  if (s.status !== "pending" || !s.reviewed_at) return null;
  const reviewed = new Date(s.reviewed_at);
  const json = !!s.json_uploaded_at && new Date(s.json_uploaded_at) > reviewed;
  const zip =
    !!s.raw_zip_uploaded_at && new Date(s.raw_zip_uploaded_at) > reviewed;
  return json && zip ? "json+zip" : json ? "json" : zip ? "zip" : "none";
};
