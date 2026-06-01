// src/components/DatasetOrganizer/utils/plannerHelpers.ts
//
// Mirrors autobidsify/converters/planner.py
// Owns Stage 5 of the pipeline: evidence bundle → BIDSPlan.yaml + participants.tsv
//
// Python equivalents:
//   DATA_EXTENSIONS / TRIO_FILENAMES / SKIP_DIRS  → planner.py _DATA_EXTS / TRIO_NAMES
//   extractNumericIdFromIdentifier()              → planner.py _sort_key lambda
//   extractFromDirectoryStructure()               → planner.py _extract_subjects_from_directory_structure()
//   extractFromFlatFilenames()                    → planner.py _extract_subjects_from_flat_filenames()
//   generateIdMapping()                           → planner.py _write_participants_from_plan() logic
//   extractSubjectAnalysis()                      → planner.py build_bids_plan() Steps 1 + 4
//   parseLLMJsonResponse()                        → planner.py _parse_llm_json_response()
//   buildOptimizedBundle()                        → planner.py build_bids_plan() Step 2
//   getBidsPlanPrompt()                           → planner.py PROMPT_BIDS_PLAN
//   parsePlanYaml()                               → planner.py yaml.safe_load() block
//   collectExtraColumns()                         → planner.py _collect_extra_columns()
//   validateSubjectCount()                        → planner.py build_bids_plan() Step 4
//   writeParticipantsFromPlan()                   → planner.py _write_participants_from_plan()
//   mergeParticipantsFromPlan()                   → planner.py _merge_participants_from_llm_metadata()
//   buildBidsPlan()                               → planner.py build_bids_plan() main entry point
import { validatePlanCoverage } from "./executorHelpers";
import { llmBidsPlan, LLMConfig } from "./llm";
import { load as yamlLoad } from "js-yaml";

// ============================================================================
// Types
// ============================================================================
export interface SubjectRecord {
  original_id: string;
  numeric_id: string;
  site: string | null;
  pattern_name: string;
  file_count: number;
  group?: string;
}

export interface SubjectAnalysis {
  success: boolean;
  method: string;
  subject_records: SubjectRecord[];
  subject_count: number;
  has_site_info: boolean;
  variants_by_subject: Record<string, any>;
  python_generated_filename_rules: any[];
  //   id_mapping: {
  //     id_mapping: Record<string, string>;
  //     reverse_mapping: Record<string, string>;
  //     strategy_used: string;
  //     metadata_columns: string[];
  //   };
}

export interface BuildBidsPlanOptions {
  evidenceBundle: any;
  llmConfig: LLMConfig;
  signal?: AbortSignal;
  onStatus?: (msg: string) => void;
}

export interface BuildBidsPlanResult {
  planYaml: string;
  subjectAnalysis: SubjectAnalysis;
  participantsTsv: string;
  coverageWarnings: string[];
}

// ============================================================================
// Constants
// Mirrors planner.py _DATA_EXTS, evidence.py TRIO_NAMES
// ============================================================================

const DATA_EXTENSIONS =
  //   /\.(snirf|nii|nii\.gz|dcm|mat|nirs|jnii|bnii|h5|hdf5|edf|bdf)$/i;
  /\.(snirf|nii|nii\.gz|dcm|mat|nirs|jnii|bnii)$/i;

const TRIO_FILENAMES = new Set([
  "dataset_description.json",
  "participants.tsv",
  "readme.md",
  "readme.txt",
  "readme.rst",
  "readme",
]);

const SKIP_DIRS = new Set([
  "anat",
  "func",
  "dwi",
  "fmap",
  "nirs",
  "meg",
  "eeg",
  "beh",
  "perf",
  "derivatives",
  "sourcedata",
  "stimuli",
  "walking",
  "resting",
  "resting_state",
  "run",
  "ses",
  "pd",
  "control",
  "hc",
  "task",
  "sub",
  "dataset",
  "data",
  "raw",
  "bids",
  "output",
  "outputs",
  "staging",
  "_staging",
  "mri",
  "fnirs",
  "edf",
  "dicom",
]);

// ============================================================================
// Mirrors planner.py _parse_llm_json_response()
// ============================================================================

export const parseLLMJsonResponse = (
  text: string,
  stepName: string
): any | null => {
  if (!text?.trim()) {
    console.warn(`${stepName}: LLM returned empty response`);
    return null;
  }
  let t = text.trim();
  if (t.startsWith("```json")) t = t.slice(7);
  else if (t.startsWith("```")) t = t.split("\n").slice(1).join("\n");
  if (t.endsWith("```")) t = t.slice(0, -3);
  t = t.trim();

  try {
    return JSON.parse(t);
  } catch {}

  const match = t.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  console.warn(
    `${stepName}: Failed to parse JSON. Preview: ${t.slice(0, 200)}`
  );
  return null;
};

// ============================================================================
// Subject extraction
// Mirrors _extract_numeric_id_from_identifier() in planner.py
// BZZ003 → "003", sub-01 → "01", patient021 → "021"
// ============================================================================

const extractNumericIdFromIdentifier = (identifier: string): string | null => {
  const numbers = identifier.match(/\d+/g);
  if (!numbers) return null;
  return numbers[numbers.length - 1];
};

// ── Step 1: Directory structure patterns
// Mirrors _extract_subjects_from_directory_structure() in planner.py

const extractFromDirectoryStructure = (
  allFiles: string[]
): Omit<SubjectAnalysis, "id_mapping"> | null => {
  const patterns: Array<[RegExp, boolean, number, number | null, string]> = [
    [/^([A-Za-z]+)_sub(\d+)$/i, true, 2, 1, "site_prefixed"], // Beijing_sub82352
    [/^sub-(\w+)$/, false, 1, null, "standard_bids"], // sub-01
    [/^subject[_-]?(\d+)$/i, false, 1, null, "simple"], // subject_01
    [/^\d{3,}$/, false, 1, null, "numeric_only"], // 001
    [/^([A-Za-z]+\d+)$/, false, 1, null, "alphanum_id"], // PD01, Control01, HC03
  ];

  const subjectRecords: SubjectRecord[] = [];
  const seenIds = new Set<string>();

  for (const filepath of allFiles) {
    const parts = filepath.split("/");

    // const dirsOnly = parts.slice(0, parts.length - 1); // Check ALL directory levels (not just first 2)
    const dirsOnly = parts.slice(0, Math.min(2, parts.length - 1)); // only first 2 levels

    for (const part of dirsOnly) {
      // Skip known non-subject directory names
      if (SKIP_DIRS.has(part.toLowerCase())) continue;

      for (const [
        regex,
        hasSite,
        idGroup,
        siteGroup,
        patternName,
      ] of patterns) {
        const match = part.match(regex);
        if (match) {
          const originalId = match[0];
          if (seenIds.has(originalId)) break;
          seenIds.add(originalId);
          subjectRecords.push({
            original_id: originalId,
            numeric_id: match[idGroup] || match[0],
            site: hasSite && siteGroup ? match[siteGroup] : null,
            pattern_name: patternName,
            file_count: 0,
          });
          break;
        }
      }
    }
  }

  if (subjectRecords.length === 0) return null;

  subjectRecords.sort((a, b) => {
    const aMatch = a.original_id.match(/^([A-Za-z]+)(\d+)$/);
    const bMatch = b.original_id.match(/^([A-Za-z]+)(\d+)$/);
    if (aMatch && bMatch) {
      const cmp = aMatch[1].localeCompare(bMatch[1]);
      if (cmp !== 0) return cmp;
      return parseInt(aMatch[2]) - parseInt(bMatch[2]);
    }
    return (parseInt(a.numeric_id) || 0) - (parseInt(b.numeric_id) || 0);
  });

  // Detect group from parent directory — mirrors PROMPT_BIDS_PLAN Structure 4
  // e.g. PD/PD_01.snirf → group: "PD"
  const subjectToParent: Record<string, string> = {};
  for (const filepath of allFiles) {
    const parts = filepath.split("/");
    if (parts.length >= 3) {
      const potentialGroup = parts[0];
      const potentialSubject = parts[1];
      if (
        seenIds.has(potentialSubject) &&
        !SKIP_DIRS.has(potentialGroup.toLowerCase())
      ) {
        subjectToParent[potentialSubject] = potentialGroup;
      }
    }
  }
  for (const rec of subjectRecords) {
    if (subjectToParent[rec.original_id]) {
      rec.group = subjectToParent[rec.original_id];
    }
  }

  return {
    success: true,
    method: "directory_structure",
    subject_records: subjectRecords,
    subject_count: subjectRecords.length,
    has_site_info: subjectRecords.some((r) => r.site !== null),
    variants_by_subject: {},
    python_generated_filename_rules: [],
  };
};

// ── Step 2: Flat filename identifier extraction
// Mirrors _extract_subjects_from_flat_filenames() in planner.py

const extractFromFlatFilenames = (
  allFiles: string[]
): Omit<SubjectAnalysis, "id_mapping"> | null => {
  const identifierToFiles: Record<string, string[]> = {};

  for (const filepath of allFiles) {
    const filename = filepath.split("/").pop()!;

    // Skip trio files
    if (TRIO_FILENAMES.has(filename.toLowerCase())) continue;
    // Skip non-data files (PDFs, docs, JSONs that aren't data)
    if (!DATA_EXTENSIONS.test(filename)) continue;
    // Remove extension(s): sub-01_ses-left2s_task-FRESHMOTOR_nirs.snirf → sub-01_ses-left2s_task-FRESHMOTOR_nirs
    const nameNoExt = filename.replace(/(\.[^.]+)+$/, "");

    // Extract base identifier — alphanumeric before first underscore
    // sub-01_ses-left2s → sub-01
    // BZZ003_rest → BZZ003
    // VHMCT1mm-Hip → VHMCT1mm-Hip (no underscore, take full name)
    const match = nameNoExt.match(/^([A-Za-z0-9\-]+)/);
    if (match) {
      const identifier = match[1];
      if (!identifierToFiles[identifier]) identifierToFiles[identifier] = [];
      identifierToFiles[identifier].push(filepath);
    }
  }

  if (Object.keys(identifierToFiles).length === 0) return null;

  // Sort by extracted numeric ID if possible (mirrors sort_key in planner.py)
  const sortedIdentifiers = Object.keys(identifierToFiles).sort((a, b) => {
    const na = extractNumericIdFromIdentifier(a);
    const nb = extractNumericIdFromIdentifier(b);
    if (na && nb) return parseInt(na) - parseInt(nb);
    return a.localeCompare(b);
  });

  const subjectRecords: SubjectRecord[] = sortedIdentifiers.map(
    (identifier, i) => ({
      original_id: identifier,
      numeric_id: String(i + 1),
      site: null,
      pattern_name: "filename_identifier",
      file_count: identifierToFiles[identifier].length,
    })
  );

  // Detect group from "GROUP_NN" pattern — mirrors PROMPT_BIDS_PLAN Structure 4
  for (const rec of subjectRecords) {
    const groupMatch = rec.original_id.match(/^([A-Za-z]+)[_\-](\d+)$/);
    if (groupMatch) rec.group = groupMatch[1];
  }

  return {
    success: true,
    method: "flat_filename_identifiers",
    subject_records: subjectRecords,
    subject_count: subjectRecords.length,
    has_site_info: false,
    variants_by_subject: {},
    python_generated_filename_rules: [],
  };
};

// ── ID mapping — mirrors _generate_subject_id_mapping() in planner.py
// const generateIdMapping = (
//     subjectInfo: Omit<SubjectAnalysis, "id_mapping">
//   ): SubjectAnalysis["id_mapping"] => {
//     const records = subjectInfo.subject_records;
//     const idMapping: Record<string, string>     = {};
//     const reverseMapping: Record<string, string> = {};

//     const allAlreadyBids = records.every((r) => /^sub-\w+$/i.test(r.original_id));
//     if (allAlreadyBids) {
//       for (const rec of records) {
//         const bidsId = rec.original_id.replace(/^sub-/i, "");
//         idMapping[rec.original_id] = bidsId;
//         reverseMapping[bidsId]     = rec.original_id;
//       }
//       return { id_mapping: idMapping, reverse_mapping: reverseMapping,
//                strategy_used: "already_bids", metadata_columns: [] };
//     }

//     const extractedNumbers: Record<string, string> = {};
//     for (const rec of records) {
//       const nums = rec.original_id.match(/\d+/g);
//       if (nums) extractedNumbers[rec.original_id] = nums[nums.length - 1];
//     }
//     const numericValues = Object.values(extractedNumbers);
//     const allUnique = new Set(numericValues).size === numericValues.length;

//     if (Object.keys(extractedNumbers).length === records.length && allUnique) {
//       for (const rec of records) {
//         const bidsId = extractedNumbers[rec.original_id];
//         idMapping[rec.original_id] = bidsId;
//         reverseMapping[bidsId]     = rec.original_id;
//       }
//     } else {
//       for (let i = 0; i < records.length; i++) {
//         const orig   = records[i].original_id;
//         const bidsId = String(i + 1);
//         idMapping[orig]      = bidsId;
//         reverseMapping[bidsId] = orig;
//       }
//     }

//     return { id_mapping: idMapping, reverse_mapping: reverseMapping,
//              strategy_used: "numeric", metadata_columns: ["original_id"] };
//   };

// export const extractSubjectAnalysis = (
//   allFiles: string[],
//   userNSubjects?: number | null,
//   dominantPrefixes?: { prefix: string; count: number; percentage: number }[]
// ): SubjectAnalysis => {
//   // Step 1: directory structure
//   let subjectInfo = extractFromDirectoryStructure(allFiles);

//   // Step 2: flat filename fallback
//   if (!subjectInfo || subjectInfo.subject_records.length === 0) {
//     subjectInfo = extractFromFlatFilenames(allFiles);
//   }

//   if (!subjectInfo || subjectInfo.subject_records.length === 0) {
//     return {
//       success: false,
//       method: "none",
//       subject_records: [],
//       subject_count: 0,
//       has_site_info: false,
//       variants_by_subject: {},
//       python_generated_filename_rules: [],
//       id_mapping: {
//         id_mapping: {},
//         reverse_mapping: {},
//         strategy_used: "none",
//         metadata_columns: [],
//       },
//     };
//   }

//   // ── CRITICAL validation: mirrors planner.py lines 190-215
//   // If extracted count doesn't match user hint but dominant prefixes do,
//   // fall back to dominant prefixes (handles VHM/VHF body-part over-extraction)
//   const pythonCount = subjectInfo.subject_count;
//   if (
//     userNSubjects &&
//     pythonCount !== userNSubjects &&
//     dominantPrefixes &&
//     dominantPrefixes.length === userNSubjects
//   ) {
//     subjectInfo = {
//       success: true,
//       method: "dominant_prefix_fallback",
//       subject_records: dominantPrefixes.map((p, i) => ({
//         original_id: p.prefix,
//         numeric_id: String(i + 1),
//         site: null,
//         pattern_name: "dominant_prefix",
//         file_count: p.count,
//       })),
//       subject_count: dominantPrefixes.length,
//       has_site_info: false,
//       variants_by_subject: {},
//       python_generated_filename_rules: [],
//     };
//   }
//   // bug fix for subject mapping
//   // === original
//   // const idMapping = generateIdMapping(subjectInfo);
//   // return { ...subjectInfo, id_mapping: idMapping };
//   // ==== end
//   // ==== updates
//   // CRITICAL: n_subjects is authoritative (mirrors planner.py PROMPT_BIDS_PLAN)
//   // If analysis count doesn't match user input, fall back to sequential numbering
//   const expectedCount = userNSubjects;
//   if (expectedCount && subjectInfo.subject_count !== expectedCount) {
//     const idMap: Record<string, string> = {};
//     const reverseMap: Record<string, string> = {};
//     for (let i = 1; i <= expectedCount; i++) {
//       const bidsId = String(i).padStart(2, "0");
//       idMap[`sub-${bidsId}`] = bidsId;
//       reverseMap[bidsId] = `sub-${bidsId}`;
//     }
//     return {
//       ...subjectInfo,
//       subject_count: expectedCount,
//       id_mapping: {
//         id_mapping: idMap,
//         reverse_mapping: reverseMap,
//         strategy_used: "numeric_fallback",
//         metadata_columns: [],
//       },
//     };
//   }

//   const idMapping = generateIdMapping(subjectInfo);
//   return { ...subjectInfo, id_mapping: idMapping };
// };

// ============================================================================
// collectExtraColumns()
// Mirrors _collect_extra_columns() in planner.py
// ============================================================================

const collectExtraColumns = (
  metadata: Record<string, Record<string, any>>
): string[] => {
  const seen = new Set<string>();
  const cols: string[] = [];
  for (const meta of Object.values(metadata)) {
    for (const col of Object.keys(meta)) {
      if (!seen.has(col) && col !== "participant_id") {
        seen.add(col);
        cols.push(col);
      }
    }
  }
  return cols;
};

// ============================================================================
// writeParticipantsFromPlan()
// Mirrors _write_participants_from_plan() in planner.py
// ============================================================================

export const writeParticipantsFromPlan = (
  planYaml: any,
  userNSubjects: number | null
): string => {
  const rules: any[] = planYaml?.assignment_rules || [];
  const labels: any[] = planYaml?.subjects?.labels || [];
  const metadata: Record<string, any> = planYaml?.participant_metadata || {};

  // Collect ordered subject IDs from assignment_rules first, then labels
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const rule of rules) {
    const sid = String(rule?.subject ?? "");
    if (sid && !seen.has(sid)) {
      seen.add(sid);
      ordered.push(sid);
    }
  }
  if (ordered.length === 0) {
    for (const lbl of labels) {
      const sid = String(lbl);
      if (sid && !seen.has(sid)) {
        seen.add(sid);
        ordered.push(sid);
      }
    }
  }

  if (userNSubjects && ordered.length < userNSubjects) {
    console.warn(
      `writeParticipantsFromPlan: plan has ${ordered.length} subjects ` +
        `but user specified ${userNSubjects}. LLM assignment_rules may be incomplete.`
    );
  }

  const extraColumns = collectExtraColumns(metadata);
  // Always include original_id — mirrors Python metadata_columns: ["original_id"]
  // const allExtra = ["original_id", ...extraColumns.filter((c) => c !== "original_id")];
  // const columns  = ["participant_id", ...allExtra];
  const columns = ["participant_id", ...extraColumns];

  const sortKey = (sid: string): [number, number, string] => {
    const n = parseInt(sid);
    return isNaN(n) ? [1, 0, sid] : [0, n, sid];
  };

  const sortedIds = [...ordered].sort((a, b) => {
    const [at, an, as_] = sortKey(a);
    const [bt, bn, bs] = sortKey(b);
    if (at !== bt) return at - bt;
    if (an !== bn) return an - bn;
    return as_.localeCompare(bs);
  });

  const header = columns.join("\t");
  const rows = sortedIds.map((sid) => {
    const meta = metadata[sid] || {};
    return columns
      .map((col) => {
        if (col === "participant_id") return `sub-${sid}`;
        return String(meta[col] ?? "n/a");
      })
      .join("\t");
  });

  return [header, ...rows].join("\n");
};

// ============================================================================
// mergeParticipantsFromPlan()
// Mirrors _merge_participants_from_llm_metadata() in planner.py
// Appends extra columns from BIDSPlan participant_metadata into existing TSV
// ============================================================================

export const mergeParticipantsFromPlan = (
  existingTsv: string,
  planYaml: any
): string => {
  const metadata = planYaml?.participant_metadata || {};
  const extraColumns = collectExtraColumns(metadata);
  if (extraColumns.length === 0) return existingTsv;

  const lines = existingTsv.split("\n").filter((l) => l.trim());
  if (lines.length === 0) return existingTsv;

  const header = lines[0].split("\t");
  const newCols = extraColumns.filter((c) => !header.includes(c));
  if (newCols.length === 0) return existingTsv;

  const newHeader = [...header, ...newCols].join("\t");
  const newRows = lines.slice(1).map((line) => {
    const cells = line.split("\t");
    const sid = cells[0].replace(/^sub-/, "");
    const meta = metadata[sid] || {};
    return [...cells, ...newCols.map((col) => String(meta[col] ?? "n/a"))].join(
      "\t"
    );
  });

  return [newHeader, ...newRows].join("\n");
};

// ============================================================================
// sampleDataFiles()
// Mirrors build_bids_plan() Step 2 sampling:
//   ≤200 files → use all; >200 → sample beginning + middle + end
// ============================================================================

const sampleDataFiles = (allFiles: string[], maxFiles = 200): string[] => {
  const dataFiles = allFiles.filter((f) => {
    const low = f.toLowerCase();
    if (low.endsWith(".nii.gz")) return true;
    const ext = low.includes(".") ? "." + low.split(".").pop()! : "";
    return new Set([
      ".snirf",
      ".nirs",
      ".mat",
      ".dcm",
      ".nii",
      ".jnii",
      ".bnii",
      ".nii.gz",
    ]).has(ext);
  });

  if (dataFiles.length <= maxFiles) return dataFiles;

  const n = dataFiles.length;
  const indices = new Set([
    ...Array.from({ length: Math.min(50, n) }, (_, i) => i),
    ...Array.from({ length: 50 }, (_, i) => Math.floor(n / 2) - 25 + i),
    ...Array.from({ length: Math.min(50, n) }, (_, i) => n - 50 + i),
  ]);
  return [...indices]
    .filter((i) => i >= 0 && i < n)
    .sort((a, b) => a - b)
    .map((i) => dataFiles[i]);
};

// ============================================================================
// buildOptimizedBundle()
// Mirrors build_bids_plan() Step 2 — strips evidence bundle to lean payload.
// Python explicitly excludes documents[], participant_metadata_evidence,
// full all_files[] to keep the prompt token count low.
// ============================================================================

const buildOptimizedBundle = (
  evidenceBundle: any,
  subjectAnalysis: SubjectAnalysis
): object => {
  const allFiles: string[] = evidenceBundle?.all_files || [];
  const sampleFiles = sampleDataFiles(allFiles, 200);

  const DATA_EXT_SET = new Set([
    ".snirf",
    ".nirs",
    ".mat",
    ".dcm",
    ".nii",
    ".jnii",
    ".bnii",
    ".nii.gz",
  ]);
  const countsFiltered = Object.fromEntries(
    Object.entries(evidenceBundle?.counts_by_ext || {}).filter(([ext]) =>
      DATA_EXT_SET.has(ext.toLowerCase())
    )
  );

  return {
    root: evidenceBundle?.root,
    counts_by_ext: countsFiltered,
    user_hints: evidenceBundle?.user_hints,
    total_files: allFiles.length,
    data_files: allFiles.filter((f) => DATA_EXTENSIONS.test(f)).length,
    sample_files: sampleFiles,
    structure_hint: evidenceBundle?.structure_hint,
    python_subject_analysis: {
      success: subjectAnalysis.success,
      method: subjectAnalysis.method,
      subject_count: subjectAnalysis.subject_count,
      subject_examples: subjectAnalysis.subject_records
        .slice(0, 20)
        .map((r) => ({
          original: r.original_id,
          numeric_id: r.numeric_id,
          site: r.site ?? null,
          //   group: r.group ?? null,
        })),
      note:
        "This is a HINT from heuristic detection. " +
        "Trust user_hints.n_subjects over this count. " +
        "Use your own analysis of sample_files to determine the true subject structure.",
    },
  };
};

// ============================================================================
// parsePlanYaml()
// Mirrors yaml.safe_load() + validation in build_bids_plan() Step 3
// ============================================================================

export const parsePlanYaml = (responseText: string): any | null => {
  let text = responseText.trim();
  if (text.startsWith("```yaml")) text = text.slice(7);
  else if (text.startsWith("```")) text = text.split("\n").slice(1).join("\n");
  if (text.endsWith("```")) text = text.slice(0, -3);
  text = text.trim();

  try {
    const parsed = yamlLoad(text);
    if (parsed && typeof parsed === "object") return parsed;
    return { _raw: text, _parseError: "parsed value is not an object" };
  } catch (e) {
    console.warn("parsePlanYaml: YAML parse failed", e);
    return { _raw: text, _parseError: String(e) };
  }
};

// ============================================================================
// validateSubjectCount()
// Mirrors build_bids_plan() Step 4
// Trusts LLM assignment_rules; only patches the count field if needed
// ============================================================================

const validateSubjectCount = (
  planYaml: any,
  userNSubjects: number | null
): any => {
  const llmCount = planYaml?.subjects?.count ?? 0;
  if (userNSubjects && llmCount !== userNSubjects) {
    console.warn(
      `validateSubjectCount: LLM count (${llmCount}) ≠ user count (${userNSubjects}). ` +
        `Trusting LLM assignment_rules, updating count field only.`
    );
    return {
      ...planYaml,
      subjects: { ...(planYaml.subjects || {}), count: userNSubjects },
    };
  }
  return planYaml;
};

// ============================================================================
// buildBidsPlan()
// Main entry point — mirrors build_bids_plan() in planner.py
// Called by handleGeneratePlan() in LLMPanel.tsx
// ============================================================================

export const buildBidsPlan = async (
  opts: BuildBidsPlanOptions
): Promise<BuildBidsPlanResult> => {
  const { evidenceBundle, llmConfig, signal, onStatus } = opts;
  const log = (msg: string) => {
    console.log(msg);
    onStatus?.(msg);
  };

  const allFiles: string[] = evidenceBundle?.all_files || [];
  const userHints = evidenceBundle?.user_hints || {};
  const userNSubjects: number | null = userHints?.n_subjects ?? null;

  // ── Step 1: Python structural hints (advisory) ────────────────────
  log("Step 1: Extracting subject hints...");

  let rawSubjectInfo = extractFromDirectoryStructure(allFiles);
  if (!rawSubjectInfo || rawSubjectInfo.subject_records.length === 0) {
    log("  Directory-level detection failed, trying flat filename analysis...");
    rawSubjectInfo = extractFromFlatFilenames(allFiles);
  }

  // Attach id_mapping so buildOptimizedBundle() has full SubjectAnalysis shape
  //   const subjectAnalysis: SubjectAnalysis = rawSubjectInfo
  //     ? { ...rawSubjectInfo, id_mapping: generateIdMapping(rawSubjectInfo) }
  //     : {
  //         success: false, method: "none", subject_records: [],
  //         subject_count: 0, has_site_info: false,
  //         variants_by_subject: {}, python_generated_filename_rules: [],
  //         id_mapping: { id_mapping: {}, reverse_mapping: {},
  //                       strategy_used: "none", metadata_columns: [] },
  //       };
  const subjectAnalysis: SubjectAnalysis = rawSubjectInfo ?? {
    success: false,
    method: "none",
    subject_records: [],
    subject_count: 0,
    has_site_info: false,
    variants_by_subject: {},
    python_generated_filename_rules: [],
  };
  log(
    `  ${subjectAnalysis.subject_count} subjects (method: ${subjectAnalysis.method})`
  );

  // ── Step 2: Build optimized LLM payload ───────────────────────────
  log("Step 2: Building LLM payload...");
  const optimizedBundle = buildOptimizedBundle(evidenceBundle, subjectAnalysis);
  const payload = JSON.stringify(optimizedBundle, null, 2);
  log(`  Sample files: ${(optimizedBundle as any).sample_files?.length ?? 0}`);

  // ── Step 3: Call LLM ──────────────────────────────────────────────
  log(`Step 3: Calling LLM (${llmConfig.model})...`);
  const raw = await llmBidsPlan(payload, llmConfig, signal);
  if (!raw) throw new Error("LLM returned empty response for BIDS plan");

  // ── Step 3b: Parse YAML ───────────────────────────────────────────
  let planYaml = parsePlanYaml(raw);
  if (!planYaml || planYaml._parseError) {
    throw new Error(
      `BIDS plan YAML parsing failed: ${planYaml?._parseError ?? "unknown"}`
    );
  }

  // ── Step 4: Validate subject count ───────────────────────────────
  log("Step 4: Validating subject count...");
  planYaml = validateSubjectCount(planYaml, userNSubjects);
  log(`  Final count: ${planYaml?.subjects?.count ?? "unknown"}`);

  // ── Step 4b: Validate plan coverage against sample files ─────────
  // Uses executorHelpers.validatePlanCoverage() — surfaces LLM pattern errors early
  const sampleFiles: string[] = (optimizedBundle as any).sample_files || [];
  const coverage = validatePlanCoverage(sampleFiles, planYaml?.mappings || []);
  if (coverage.warnings.length > 0) {
    coverage.warnings.forEach((w) => log(`  ⚠ ${w}`));
  } else {
    log(`  ✓ Coverage: ${coverage.coveragePercent}% of sample files matched`);
  }

  // ── Step 5: Write participants.tsv ────────────────────────────────
  log("Step 5: Generating participants.tsv...");
  const participantsTsv = writeParticipantsFromPlan(planYaml, userNSubjects);

  // ── Step 6: Merge extra metadata columns ──────────────────────────
  log("Step 6: Merging participant metadata columns...");
  const mergedTsv = mergeParticipantsFromPlan(participantsTsv, planYaml);

  // ── Step 7: Inject plan metadata ─────────────────────────────────
  // Mirrors plan_yaml["metadata"] = {...} in planner.py Step 7
  planYaml.metadata = {
    generated_at: new Date().toISOString(),
    model: llmConfig.model,
    id_strategy: "auto",
  };

  // ── Step MAT: inject mat_mapping_path into nirs mappings ─────────
  log("Step MAT: .mat mapping deferred to local execute step");
  const matFiles = allFiles.filter((f) => f.toLowerCase().endsWith(".mat"));
  if (matFiles.length > 0) {
    for (const mapping of planYaml?.mappings || []) {
      if (mapping?.modality === "nirs") {
        const patterns: string[] = mapping?.match || [];
        const coversMat =
          patterns.length === 0 ||
          patterns.some(
            (p: string) => p.toLowerCase().includes(".mat") || p === "**/*.mat"
          );
        if (coversMat) {
          mapping.mat_mapping_path = "_staging/mat_mapping.json";
        }
      }
    }
  }

  // Preserve raw YAML string for saving
  //   const planYamlStr = raw.startsWith("```") ? planYaml._raw ?? raw : raw;
  // Preserve raw YAML string for saving — strip markdown fences if present (mirrors planner.py Step 3)
  let planYamlStr = raw.trim();
  if (planYamlStr.startsWith("```yaml")) planYamlStr = planYamlStr.slice(7);
  else if (planYamlStr.startsWith("```"))
    planYamlStr = planYamlStr.split("\n").slice(1).join("\n");
  if (planYamlStr.endsWith("```")) planYamlStr = planYamlStr.slice(0, -3);
  planYamlStr = planYamlStr.trim();

  log("✓ BIDSPlan complete");
  return {
    planYaml: planYamlStr,
    subjectAnalysis,
    participantsTsv: mergedTsv,
    coverageWarnings: coverage.warnings,
  };
};
