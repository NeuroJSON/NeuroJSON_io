// src/components/DatasetOrganizer/utils/executorHelpers.ts
//
// Portable helper functions from autobidsify/converters/executor.py
//
// What is NOT here (intentionally — requires server-side CLI):
//   execute_bids_plan()       — file copy/conversion operations
//   convert_mat_to_snirf()    — binary .mat read + .snirf write
//   run_dcm2niix_batch()      — dcm2niix subprocess
//   convert_jnifti_to_nifti() — nibabel NIfTI write
//
// What IS here (useful client-side for plan validation + preview):
//   sanitizeBidsLabel()       mirrors _sanitize_bids_label()
//   normalizeFilename()       mirrors _normalize_filename()
//   extractAcqLabel()         mirrors _extract_acq_label()
//   selectPreferredFile()     mirrors _select_preferred_file()
//   matchGlobPattern()        mirrors _match_glob_pattern()
//   inferScanType()           mirrors infer_scan_type_from_filepath()
//   inferSubdirectory()       mirrors infer_subdirectory_from_suffix()
//   categorizeScanType()      mirrors categorize_scan_type()
//   analyzeFilepathUniversal() mirrors analyze_filepath_universal()
//   validatePlanCoverage()    NEW — uses matchGlobPattern to check LLM patterns

// ============================================================================
// sanitizeBidsLabel()
// Mirrors _sanitize_bids_label() in executor.py
// Removes all non-alphanumeric characters from a BIDS entity value
// e.g. "mental_arithmetic" → "mentalarithmetic"
// ============================================================================

export const sanitizeBidsLabel = (label: string): string =>
  label.replace(/[^a-zA-Z0-9]/g, "");

// ============================================================================
// normalizeFilename()
// Mirrors _normalize_filename() in executor.py
//
// Strips extensions and trailing sequence numbers.
// Used to identify DICOM series and detect format duplicates.
//
// Examples:
//   "VHFCT1mm-Hip (134).dcm"       → "vhfct1mm-hip"
//   "scan_mprage_anonymized.nii.gz" → "scan_mprage_anonymized"
//   "scan_001.dcm"                  → "scan"
// ============================================================================

export const normalizeFilename = (filepath: string): string => {
  let name = filepath.split("/").pop()!;

  // Strip all extensions (up to 6 chars)
  while (name.includes(".") && name.split(".").pop()!.length <= 6) {
    name = name.substring(0, name.lastIndexOf("."));
  }

  // Strip trailing " (N)"
  name = name.replace(/\s*\(\d+\)\s*$/, "");
  // Strip trailing _NNN or -NNN
  name = name.replace(/[_\-]\d+$/, "");

  return name.trim().toLowerCase();
};

// ============================================================================
// extractAcqLabel()
// Mirrors _extract_acq_label() in executor.py
//
// Derives a short, clean acq- label from a normalized DICOM filename.
// Keeps the last meaningful alphabetic token (body part or scan descriptor).
//
// Examples:
//   "vhfct1mmankle" → "ankle"
//   "vhfct1mmhead"  → "head"
//   "vhmct1mmhip"   → "hip"
//   "scanmprage"    → "mprage"
// ============================================================================

export const extractAcqLabel = (normalizedFname: string): string => {
  const skip = new Set(["vhf", "vhm", "ct", "mr", "mri", "mm", "scan", "the"]);
  const tokens = normalizedFname.match(/[a-z]+/g) || [];
  const meaningful = tokens.filter((t) => t.length > 2 && !skip.has(t));

  if (meaningful.length > 0) {
    return meaningful[meaningful.length - 1]; // last = body part
  }
  return normalizedFname.slice(0, 20); // fallback: cap at 20 chars
};

// ============================================================================
// selectPreferredFile()
// Mirrors _select_preferred_file() in executor.py
//
// Priority: NIfTI dir > non-BRIK > shortest path > alphabetical
// ============================================================================

export const selectPreferredFile = (files: string[]): string | null => {
  if (files.length === 0) return null;
  if (files.length === 1) return files[0];

  const priority = (f: string): [number, number, number, string] => {
    const parts = f.toLowerCase().split("/");
    return [
      parts.some((p) => p.includes("nifti")) ? 0 : 1,
      parts.some((p) => p.includes("brik")) ? 1 : 0,
      parts.length,
      f,
    ];
  };

  return [...files].sort((a, b) => {
    const [a0, a1, a2, a3] = priority(a);
    const [b0, b1, b2, b3] = priority(b);
    if (a0 !== b0) return a0 - b0;
    if (a1 !== b1) return a1 - b1;
    if (a2 !== b2) return a2 - b2;
    return a3.localeCompare(b3);
  })[0];
};

// ============================================================================
// matchGlobPattern()
// Mirrors _match_glob_pattern() in executor.py
//
// Supported patterns:
//   "**/*.nii.gz"  → any .nii.gz at any depth
//   "**/BRIK/**"   → any file inside a BRIK directory
//   "*token*"      → filepath contains token
//   "*.ext"        → filename ends with extension
//   "token*"       → filename starts with token
//   "plain"        → substring anywhere in path (fallback)
// ============================================================================

export const matchGlobPattern = (
  filepath: string,
  pattern: string
): boolean => {
  const fp = filepath.toLowerCase();
  const pat = pattern.toLowerCase();
  const parts = fp.split("/");
  const filename = parts[parts.length - 1];

  // **/TOKEN/** — directory component match
  if (pat.startsWith("**/") && pat.endsWith("/**")) {
    const token = pat.slice(3, -3);
    return parts.slice(0, -1).includes(token);
  }

  // **/*.ext — any depth extension match
  if (pat.startsWith("**/")) {
    const suffix = pat.slice(3);
    if (suffix.startsWith("*.")) return fp.endsWith(suffix.slice(1));
    return fp.includes(suffix);
  }

  // *token* — substring in full path
  if (pat.startsWith("*") && pat.endsWith("*")) {
    return fp.includes(pat.slice(1, -1));
  }

  // *.ext — extension match on filename only
  if (pat.startsWith("*.")) {
    return filename.endsWith(pat.slice(1));
  }

  // token* — filename prefix
  if (pat.endsWith("*")) {
    return filename.startsWith(pat.slice(0, -1));
  }

  // fallback — substring anywhere in path
  return fp.includes(pat);
};

// ============================================================================
// inferScanType()
// Mirrors infer_scan_type_from_filepath() in executor.py
//
// Priority:
//   1. LLM filename_rules from BIDSPlan
//   2. BIDS entities already in filename (ses-, task-, acq-, run-)
//   3. Keyword detection in path
//   4. Extension fallback
// ============================================================================

interface ScanTypeResult {
  suffix: string;
  subdirectory: string;
  category: string;
}

export const inferScanType = (
  filepath: string,
  filenameRules: any[] = []
): ScanTypeResult => {
  const pathLower = filepath.toLowerCase();
  const filename = filepath.split("/").pop()!;
  const fnameLow = filename.toLowerCase();

  // ── Priority 1: LLM filename_rules ──────────────────────────────────
  for (const rule of filenameRules) {
    try {
      const mp = (rule.match_pattern || "").replace(/\\\\/g, "\\");
      if (!new RegExp(mp, "i").test(filename)) continue;

      const template: string = rule.bids_template || "";
      const m = template.match(/sub-[^_]+_(.*?)\.(nii\.gz|snirf|nii)/);
      if (!m) continue;

      let raw = m[1];
      // Remove placeholder entities
      raw = raw
        .replace(/ses-X_?/g, "")
        .replace(/task-X_?/g, "")
        .replace(/^_|_$/g, "");

      // Remove spurious ses- if no ses- dir in path
      if (
        /ses-[A-Za-z0-9]+/.test(raw) &&
        !/\/ses-[A-Za-z0-9]+\//.test(filepath)
      ) {
        raw = raw.replace(/ses-[A-Za-z0-9]+_?/g, "").replace(/^_|_$/g, "");
      }

      if (raw) {
        // Sanitize entity values — mirrors _sanitize_suffix() in executor.py
        // "task-mental_arithmetic_nirs" → "task-mentalarithmetic_nirs"
        raw = raw.replace(
          /([a-zA-Z]+-)(.+?)(?=_[a-zA-Z]+-|_[a-zA-Z]+$|$)/g,
          (_match, key, val) => key + sanitizeBidsLabel(val)
        );
        const subdir = inferSubdirectory(raw);
        return {
          suffix: raw,
          subdirectory: subdir,
          category: categorizeScanType(raw),
        };
      }
    } catch {
      continue;
    }
  }

  // ── Priority 2: BIDS entities already in filename ────────────────────
  const entities: Record<string, string> = {};
  for (const [key, pattern] of [
    ["ses", /ses-([A-Za-z0-9]+)/],
    ["task", /task-([A-Za-z0-9]+)/],
    ["acq", /acq-([A-Za-z0-9]+)/],
    ["run", /run-([A-Za-z0-9]+)/],
  ] as [string, RegExp][]) {
    const match = filename.match(pattern);
    if (match) entities[key] = match[1];
  }

  // Infer task from filename keywords when no task- entity present
  if (!entities.task) {
    const nameNoExt = fnameLow.replace(/\.[^.]+$/, "");
    if (/rest|resting/.test(nameNoExt)) entities.task = "rest";
    else if (/finger|tapping|fingertap/.test(nameNoExt))
      entities.task = "fingertapping";
    else if (/walking|walk/.test(nameNoExt)) entities.task = "walking";
    else if (/motor|tap/.test(nameNoExt)) entities.task = "motor";
  }

  let modalityLabel: string | null = null;
  let subdir = "anat";

  if (fnameLow.endsWith(".snirf") || fnameLow.includes("nirs")) {
    modalityLabel = "nirs";
    subdir = "nirs";
  } else if (/t1w|t1/.test(fnameLow)) {
    modalityLabel = "T1w";
    subdir = "anat";
  } else if (/t2w|t2/.test(fnameLow)) {
    modalityLabel = "T2w";
    subdir = "anat";
  } else if (/bold|func/.test(fnameLow)) {
    modalityLabel = "bold";
    subdir = "func";
  } else if (/dwi/.test(fnameLow)) {
    modalityLabel = "dwi";
    subdir = "dwi";
  }

  // BIDS rule: task-* scans go in func/ (unless nirs)
  if (subdir !== "nirs" && (entities.task || pathLower.includes("func/"))) {
    subdir = "func";
    if (!modalityLabel) modalityLabel = "bold";
  }

  if (Object.keys(entities).length > 0 || modalityLabel) {
    const parts: string[] = [];
    for (const key of ["ses", "task", "acq", "run"]) {
      if (entities[key])
        parts.push(`${key}-${sanitizeBidsLabel(entities[key])}`);
    }
    if (modalityLabel) parts.push(modalityLabel);
    if (parts.length > 0) {
      const suffix = parts.join("_");
      return {
        suffix,
        subdirectory: subdir,
        category: categorizeScanType(suffix),
      };
    }
  }

  // ── Priority 3: Heuristic path keywords ─────────────────────────────
  if (/anat|mprage|t1w/.test(pathLower))
    return { suffix: "T1w", subdirectory: "anat", category: "anatomical" };
  if (/func|bold/.test(pathLower)) {
    const m = pathLower.match(/task[_-]([a-z0-9]+)/);
    const suffix = m ? `task-${m[1]}_bold` : "task-rest_bold";
    return { suffix, subdirectory: "func", category: "functional" };
  }
  if (pathLower.includes("rest"))
    return {
      suffix: "task-rest_bold",
      subdirectory: "func",
      category: "functional",
    };
  if (/nirs|fnirs|\.snirf/.test(pathLower))
    return { suffix: "nirs", subdirectory: "nirs", category: "functional" };
  if (pathLower.includes("dwi"))
    return { suffix: "dwi", subdirectory: "dwi", category: "diffusion" };

  // ── Priority 4: Extension fallback ──────────────────────────────────
  if (fnameLow.endsWith(".snirf"))
    return { suffix: "nirs", subdirectory: "nirs", category: "functional" };
  if (fnameLow.endsWith(".nii") || fnameLow.endsWith(".nii.gz"))
    return { suffix: "T1w", subdirectory: "anat", category: "anatomical" };

  return { suffix: "unknown", subdirectory: "anat", category: "unknown" };
};

// ============================================================================
// inferSubdirectory()
// Mirrors infer_subdirectory_from_suffix() in executor.py
// ============================================================================

export const inferSubdirectory = (suffix: string): string => {
  const s = suffix.toLowerCase();
  if (s.includes("t1w") || s.includes("t2w")) return "anat";
  if (s.includes("bold")) return "func";
  if (s.includes("nirs")) return "nirs";
  if (s.includes("dwi")) return "dwi";
  return "anat";
};

// ============================================================================
// categorizeScanType()
// Mirrors categorize_scan_type() in executor.py
// ============================================================================

export const categorizeScanType = (suffix: string): string => {
  const s = suffix.toLowerCase();
  if (s.includes("t1w") || s.includes("t2w")) return "anatomical";
  if (s.includes("bold") || s.includes("nirs")) return "functional";
  if (s.includes("dwi")) return "diffusion";
  return "unknown";
};

// ============================================================================
// analyzeFilepathUniversal()
// Mirrors analyze_filepath_universal() in executor.py
//
// Determines BIDS subject ID and output filename for one source file.
// Used for plan preview — shows user what each file will become.
// ============================================================================

export interface FilepathAnalysis {
  subject_id: string;
  scan_type_suffix: string;
  bids_filename: string;
  subdirectory: string;
  scan_category: string;
  original_filepath: string;
  modality: string;
}

export const analyzeFilepathUniversal = (
  filepath: string,
  assignmentRules: any[],
  filenameRules: any[],
  modality: string = "mri"
): FilepathAnalysis => {
  const filename = filepath.split("/").pop()!;
  const pathParts = filepath.split("/");
  let subjectId: string | null = null;

  // Priority 1: match glob patterns
  for (const rule of assignmentRules) {
    for (const pat of rule.match || []) {
      if (matchGlobPattern(filepath, pat)) {
        subjectId = rule.subject;
        break;
      }
    }
    if (subjectId) break;
  }

  // Priority 2: original substring match
  if (!subjectId) {
    for (const rule of assignmentRules) {
      const orig: string = rule.original || "";
      if (orig && filepath.toLowerCase().includes(orig.toLowerCase())) {
        subjectId = rule.subject;
        break;
      }
    }
  }

  // Priority 3: prefix match
  if (!subjectId) {
    for (const rule of assignmentRules) {
      const pfx: string = rule.prefix || "";
      if (pfx && filename.toLowerCase().startsWith(pfx.toLowerCase())) {
        subjectId = rule.subject;
        break;
      }
    }
  }

  // Priority 4: sub-XX already in path
  if (!subjectId) {
    for (const part of pathParts) {
      const m = part.match(/sub[_-]?(\w+)/i);
      if (m) {
        subjectId = m[1];
        break;
      }
    }
  }

  // Fallback
  if (!subjectId) subjectId = "unknown";

  // Strip accidental sub- prefix
  if (subjectId.startsWith("sub-")) subjectId = subjectId.slice(4);

  const scanInfo = inferScanType(filepath, filenameRules);
  const ext = modality === "nirs" ? ".snirf" : ".nii.gz";
  const bidsFilename = `sub-${subjectId}_${scanInfo.suffix}${ext}`;

  return {
    subject_id: subjectId,
    scan_type_suffix: scanInfo.suffix,
    bids_filename: bidsFilename,
    subdirectory: scanInfo.subdirectory,
    scan_category: scanInfo.category,
    original_filepath: filepath,
    modality,
  };
};

// ============================================================================
// validatePlanCoverage()
// NEW — not in Python (Python validates at runtime, we validate at plan-time)
//
// Checks that the LLM's match patterns in BIDSPlan actually cover the
// sample files from the evidence bundle. Warns about uncovered files.
//
// Used in plannerHelpers.ts after buildBidsPlan() to surface issues
// before the user downloads the ZIP.
// ============================================================================

export interface PlanCoverageResult {
  covered: string[];
  uncovered: string[];
  coveragePercent: number;
  warnings: string[];
}

export const validatePlanCoverage = (
  sampleFiles: string[],
  mappings: any[]
): PlanCoverageResult => {
  const covered: string[] = [];
  const uncovered: string[] = [];
  const warnings: string[] = [];

  for (const filepath of sampleFiles) {
    let isCovered = false;

    for (const mapping of mappings) {
      const patterns: string[] = mapping.match || [];
      const excludes: string[] = mapping.exclude || [];

      const isExcluded = excludes.some((ex) => matchGlobPattern(filepath, ex));
      if (isExcluded) continue;

      const isMatched = patterns.some((pat) => matchGlobPattern(filepath, pat));
      if (isMatched) {
        isCovered = true;
        break;
      }
    }

    if (isCovered) covered.push(filepath);
    else uncovered.push(filepath);
  }

  if (uncovered.length > 0) {
    warnings.push(
      `${uncovered.length} sample file(s) not covered by any mapping pattern.`
    );
    for (const f of uncovered.slice(0, 5)) {
      warnings.push(`  Uncovered: ${f}`);
    }
    if (uncovered.length > 5) {
      warnings.push(`  ... and ${uncovered.length - 5} more`);
    }
  }

  return {
    covered,
    uncovered,
    coveragePercent:
      sampleFiles.length > 0
        ? Math.round((covered.length / sampleFiles.length) * 100)
        : 100,
    warnings,
  };
};
