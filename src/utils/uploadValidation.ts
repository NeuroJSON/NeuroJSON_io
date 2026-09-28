import { useEffect, useState } from "react";
import { NeurojsonService } from "services/neurojson.service";

// Live checks for the upload publishing settings. They mirror the backend
// rules (^[a-z0-9][a-z0-9_-]{2,62}$; no "njds" prefix for dataset ids) but
// give one specific message per problem. The backend stays authoritative.

const CHAR_RE = /^[a-z0-9][a-z0-9_-]*$/; // allowed chars + first-char rule

const lengthError = (v: string) =>
  v.length < 3
    ? "Too short — use at least 3 characters."
    : v.length > 63
    ? "Too long — use 63 characters or fewer."
    : "";

// Preferred public dataset id. Empty = no preference (valid).
export const getRequestedIdError = (raw: string): string => {
  const v = raw.trim();
  if (!v) return "";
  if (v.startsWith("njds")) {
    return 'Cannot start with "njds" (reserved for NeuroJSON-assigned IDs).';
  }
  if (!CHAR_RE.test(v)) {
    return "Use only lowercase letters and numbers; join words with - or _ (e.g. my-fmri-study). Cannot start with - or _.";
  }
  return lengthError(v);
};

// Target database. Empty = default "public" (valid). Names of existing
// databases belong to other collections, so they're blocked (except public).
export const getRequestedDbError = (
  raw: string,
  existingDbs: Set<string>
): string => {
  const v = raw.trim();
  if (!v) return "";
  if (!CHAR_RE.test(v)) {
    return "Use only lowercase letters and numbers; join words with - or _ (e.g. smith-lab).";
  }
  const len = lengthError(v);
  if (len) return len;
  if (v.toLowerCase() !== "public" && existingDbs.has(v.toLowerCase())) {
    return `A database named "${v}" already exists. Choose a different name or leave blank for public.`;
  }
  return "";
};

// Existing public db names (lowercased), fetched for the collision check only —
// never offered as a picker. Non-fatal if the registry can't be loaded.
export const useExistingDbNames = (): Set<string> => {
  const [names, setNames] = useState<Set<string>>(new Set());
  useEffect(() => {
    NeurojsonService.getRegistry()
      .then((data: any) =>
        setNames(
          new Set(
            (data?.database || []).map((d: any) =>
              String(d.name || "").toLowerCase()
            )
          )
        )
      )
      .catch(() => {});
  }, []);
  return names;
};
