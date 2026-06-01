// Common BIDS suffixes grouped by modality.
// Extend the lists as you find missing values in your data.
export const TYPES_BY_MODALITY: Record<string, string[]> = {
  anat: ["T1w", "T2w", "FLAIR", "T2star", "PD", "angio", "defacemask"],
  func: ["bold", "sbref", "events", "physio", "stim"],
  dwi: ["dwi", "sbref"],
  fmap: ["phasediff", "magnitude1", "magnitude2", "fieldmap", "epi"],
  meg: ["meg", "channels", "coordsystem", "headshape", "events"],
  eeg: ["eeg", "channels", "electrodes", "coordsystem", "events"],
  ieeg: ["ieeg", "channels", "electrodes", "coordsystem", "events"],
  pet: ["pet", "blood", "events"],
  nirs: ["nirs", "channels", "optodes", "coordsystem", "events"],
  beh: ["beh", "events"],
  motion: ["motion", "channels", "events"],
  perf: ["asl", "m0scan"],
  micr: ["TEM", "SEM", "MRM"],
};

// The modality form field stores values like "fMRI (func)" — extract the
// suffix inside the parens so we can look it up in TYPES_BY_MODALITY.
export function getModalityKey(modalityValue?: string): string | null {
  if (!modalityValue || modalityValue === "any") return null;
  const m = modalityValue.match(/\(([^)]+)\)/);
  return m ? m[1] : modalityValue;
}

export function getTypeSuggestions(modalityValue?: string): string[] {
  const key = getModalityKey(modalityValue);
  if (!key) {
    // No modality picked → show all suffixes deduped and sorted.
    return Array.from(new Set(Object.values(TYPES_BY_MODALITY).flat())).sort();
  }
  return TYPES_BY_MODALITY[key] || [];
}
