import { Colors } from "design/theme";
import { UploadRecord } from "services/upload.service";

// Label + color for each submission status (same look on every page).
export type SubmissionStatusKey = Exclude<UploadRecord["status"], null>;

export const STATUS_CHIP: Record<
  SubmissionStatusKey,
  {
    label: string;
    color?: "default" | "info" | "warning" | "success" | "error";
    sx?: object;
  }
> = {
  draft: { label: "Draft", color: "default" },
  // Pending uses the theme purple (not MUI's default blue).
  pending: {
    label: "Pending review",
    sx: { backgroundColor: Colors.purple, color: Colors.white },
  },
  changes_requested: { label: "Changes requested", color: "warning" },
  approved: { label: "Approved — awaiting publishing", color: "info" },
  // DB status stays "promoted"; users see "Published".
  promoted: { label: "Published", color: "success" },
  rejected: { label: "Rejected", color: "error" },
};
