// src/components/DatasetOrganizer/utils/filenameTokenizer.ts
// Port of autobidsify's filename_tokenizer.py
// Philosophy: Python stats → dominant prefixes → subject IDs (no LLM needed for this part)
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
  id_mapping: {
    id_mapping: Record<string, string>;
    reverse_mapping: Record<string, string>;
    strategy_used: string;
    metadata_columns: string[];
  };
}

// Known neuroimaging terms to keep together (not split)
const NEUROIMAGING_TERMS = new Set([
  "T1w",
  "T2w",
  "T1",
  "T2",
  "PD",
  "FLAIR",
  "DWI",
  "BOLD",
]);

// Common words to exclude from dominant prefix detection
const COMMON_WORDS = new Set([
  "scan",
  "data",
  "file",
  "image",
  "sub",
  "subject",
  "patient",
  "sample",
  "test",
  "experiment",
]);

// ============================================================================
// FilenameTokenizer — mirrors FilenameTokenizer class in filename_tokenizer.py
// ============================================================================

/**
 * Advanced split: CamelCase + number boundaries
 * "VHMCT" → ["VHM", "CT"]
 * "CT1mm" → ["CT", "1", "mm"]
 * "sub82352" → ["sub", "82352"]
 */
const splitAdvanced = (text: string): string[] => {
  if (!text) return [];

  // Keep known neuroimaging terms together
  if (NEUROIMAGING_TERMS.has(text)) return [text];

  // Split on type boundaries:
  // - Uppercase sequence before uppercase+lowercase: "VHM" before "CT"
  // - CamelCase: uppercase followed by lowercase
  // - Letter/digit boundaries
  const pattern = /([A-Z]+(?=[A-Z][a-z]|\b|[0-9])|[A-Z][a-z]+|[a-z]+|[0-9]+)/g;
  const tokens = text.match(pattern) || [];
  return tokens.filter((t) => t.length > 0);
};

/**
 * Tokenize a filename into meaningful tokens.
 * Mirrors FilenameTokenizer.tokenize() in filename_tokenizer.py
 *
 * Examples:
 *   "VHMCT1mm-Hip (134).dcm" → ["VHM", "CT", "1", "mm", "Hip", "134"]
 *   "Beijing_sub82352"       → ["Beijing", "sub", "82352"]
 *   "scan_001_T1w.nii"       → ["scan", "001", "T1w"]
 */
export const tokenizeFilename = (filename: string): string[] => {
  // Step 1: Remove all extensions (up to 6 chars)
  let name = filename;
  while (name.includes(".") && name.split(".").pop()!.length <= 6) {
    name = name.substring(0, name.lastIndexOf("."));
  }

  // Step 2: Replace delimiters with spaces
  for (const delim of ["_", "-", "(", ")", "[", "]", "{", "}", ",", ";"]) {
    name = name.split(delim).join(" ");
  }

  // Step 3: Split by spaces
  const parts = name.split(/\s+/).filter((p) => p.length > 0);

  // Step 4: Advanced split each part
  const tokens: string[] = [];
  for (const part of parts) {
    tokens.push(...splitAdvanced(part));
  }

  // Step 5: Filter empty
  return tokens.filter((t) => t.trim().length >= 1);
};

// ============================================================================
// FilenamePatternAnalyzer — mirrors FilenamePatternAnalyzer class
// ============================================================================

interface DominantPrefix {
  prefix: string;
  count: number;
  percentage: number;
}

interface TokenStatistics {
  totalFiles: number;
  tokenFrequency: Record<string, number>;
  prefixFrequency: Record<string, number>;
  dominantPrefixes: DominantPrefix[];
}

/**
 * Find dominant prefixes — tokens appearing in >5% of files
 * that are not common words.
 * Mirrors FilenamePatternAnalyzer._find_dominant_prefixes()
 */
const findDominantPrefixes = (
  prefixCounter: Record<string, number>,
  totalFiles: number
): DominantPrefix[] => {
  const threshold = totalFiles * 0.05; // 5% threshold

  return Object.entries(prefixCounter)
    .filter(([prefix, count]) => {
      if (count < threshold) return false;
      if (COMMON_WORDS.has(prefix.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([prefix, count]) => ({
      prefix,
      count,
      percentage: Math.round((count / totalFiles) * 1000) / 10,
    }));
};

/**
 * Analyze token statistics across all filenames.
 * Mirrors FilenamePatternAnalyzer.analyze_token_statistics()
 */
export const analyzeTokenStatistics = (
  filenames: string[]
): TokenStatistics => {
  const allTokens: Record<string, number> = {};
  const prefixTokens: Record<string, number> = {}; // first token only

  for (const filename of filenames) {
    // Extract just filename from path
    const fname = filename.includes("/")
      ? filename.split("/").pop()!
      : filename;

    const tokens = tokenizeFilename(fname);

    // Count all tokens
    for (const token of tokens) {
      allTokens[token] = (allTokens[token] || 0) + 1;
    }

    // CRITICAL: use first TOKEN as prefix (not regex match)
    if (tokens.length > 0) {
      const firstToken = tokens[0];
      prefixTokens[firstToken] = (prefixTokens[firstToken] || 0) + 1;
    }
  }

  const dominantPrefixes = findDominantPrefixes(prefixTokens, filenames.length);

  return {
    totalFiles: filenames.length,
    tokenFrequency: allTokens,
    prefixFrequency: prefixTokens,
    dominantPrefixes,
  };
};

// ============================================================================
// extractSubjectAnalysis — mirrors build_bids_plan()'s subject extraction
// ============================================================================

/**
 * Full subject extraction mirroring autobidsify's judgment sequence:
 *
 * 1. Try directory structure patterns (sub-01, subject_01, site_sub01, 001)
 * 2. If fails → try filename token statistics (dominant prefix approach)
 * 3. Generate ID mapping (already_bids / numeric / semantic)
 */
// export const extractSubjectAnalysis = (allFiles: string[], userNSubjects?: number | null, dominantPrefixes?: { prefix: string; count: number; percentage: number }[]): SubjectAnalysis => {
//   // ── Step 1: Try directory structure (mirrors _extract_subjects_from_directory_structure)
//   const fromDir = extractFromDirectoryStructure(allFiles);
//   if (fromDir && fromDir.subject_records.length > 0) {
//     const idMapping = generateIdMapping(fromDir);
//     return { ...fromDir, id_mapping: idMapping };
//   }

//   // ── Step 2: Filename token statistics (mirrors filename_tokenizer approach)
//   const fromTokens = extractFromTokenStatistics(allFiles);
//   if (fromTokens && fromTokens.subject_records.length > 0) {
//     const idMapping = generateIdMapping(fromTokens);
//     return { ...fromTokens, id_mapping: idMapping };
//   }

//   // ── Fallback: empty result
//   return {
//     success: false,
//     method: "none",
//     subject_records: [],
//     subject_count: 0,
//     has_site_info: false,
//     variants_by_subject: {},
//     python_generated_filename_rules: [],
//     id_mapping: {
//       id_mapping: {},
//       reverse_mapping: {},
//       strategy_used: "none",
//       metadata_columns: [],
//     },
//   };
// };

// ── Step 1: Directory structure patterns
// Mirrors _extract_subjects_from_directory_structure() in planner.py
// const extractFromDirectoryStructure = (
//   allFiles: string[]
// ): Omit<SubjectAnalysis, "id_mapping"> | null => {
//   const patterns: Array<[RegExp, boolean, number, number | null, string]> = [
//     [/^([A-Za-z]+)_sub(\d+)$/i, true, 2, 1, "site_prefixed"],
//     [/^sub-(\w+)$/i, false, 1, null, "standard_bids"],
//     [/^subject[_-]?(\d+)$/i, false, 1, null, "simple"],
//     [/^(\d{3,})$/, false, 1, null, "numeric_only"],
//   ];

//   const subjectRecords: SubjectRecord[] = [];
//   const seenIds = new Set<string>();

//   for (const filepath of allFiles) {
//     const parts = filepath.split("/");
//     for (const part of parts.slice(0, 2)) {
//       for (const [
//         regex,
//         hasSite,
//         idGroup,
//         siteGroup,
//         patternName,
//       ] of patterns) {
//         const match = part.match(regex);
//         if (match) {
//           const originalId = match[0];
//           if (seenIds.has(originalId)) break;
//           seenIds.add(originalId);
//           subjectRecords.push({
//             original_id: originalId,
//             numeric_id: match[idGroup],
//             site: hasSite && siteGroup ? match[siteGroup] : null,
//             pattern_name: patternName,
//             file_count: 0,
//           });
//           break;
//         }
//       }
//     }
//   }

//   if (subjectRecords.length === 0) return null;

//   subjectRecords.sort((a, b) => {
//     const na = parseInt(a.numeric_id) || 0;
//     const nb = parseInt(b.numeric_id) || 0;
//     return na - nb;
//   });

//   return {
//     success: true,
//     method: "directory_structure",
//     subject_records: subjectRecords,
//     subject_count: subjectRecords.length,
//     has_site_info: subjectRecords.some((r) => r.site !== null),
//     variants_by_subject: {},
//     python_generated_filename_rules: [],
//   };
// };

// ── Step 2: Token statistics (dominant prefix approach)
// Mirrors FilenamePatternAnalyzer + analyze_filenames_for_subjects() in filename_tokenizer.py
// const extractFromTokenStatistics = (
//   allFiles: string[]
// ): Omit<SubjectAnalysis, "id_mapping"> | null => {
//   // Extract just filenames (not full paths) — mirrors filename_tokenizer.py line:
//   // filenames = [f.split('/')[-1] for f in all_files]
//   const filenames = allFiles.map((f) =>
//     f.includes("/") ? f.split("/").pop()! : f
//   );

//   const stats = analyzeTokenStatistics(filenames);

//   if (stats.dominantPrefixes.length === 0) return null;

//   // Count files per prefix
//   const prefixFileCounts: Record<string, number> = {};
//   for (const filename of filenames) {
//     const tokens = tokenizeFilename(filename);
//     if (tokens.length > 0) {
//       const first = tokens[0];
//       if (stats.dominantPrefixes.some((p) => p.prefix === first)) {
//         prefixFileCounts[first] = (prefixFileCounts[first] || 0) + 1;
//       }
//     }
//   }

//   const subjectRecords: SubjectRecord[] = stats.dominantPrefixes.map(
//     (p, i) => ({
//       original_id: p.prefix,
//       numeric_id: String(i + 1),
//       site: null,
//       pattern_name: "dominant_prefix",
//       file_count: prefixFileCounts[p.prefix] || p.count,
//     })
//   );

//   return {
//     success: true,
//     method: "dominant_prefix_fallback",
//     subject_records: subjectRecords,
//     subject_count: subjectRecords.length,
//     has_site_info: false,
//     variants_by_subject: {},
//     python_generated_filename_rules: [],
//   };
// };

/**
 * Mirrors _extract_numeric_id_from_identifier() in planner.py
 * BZZ003 → "003", sub-01 → "01", patient021 → "021"
 */
const extractNumericIdFromIdentifier = (identifier: string): string | null => {
  const numbers = identifier.match(/\d+/g);
  if (!numbers) return null;
  return numbers[numbers.length - 1]; // last numeric sequence, preserving leading zeros
};

// ── Step 1: Directory structure patterns
// Mirrors _extract_subjects_from_directory_structure() in planner.py
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
    // Check ALL directory levels (not just first 2)
    const dirsOnly = parts.slice(0, parts.length - 1);
    // const dirsOnly = parts.slice(0, Math.min(2, parts.length - 1)); // only first 2 levels

    for (const part of dirsOnly) {
      // Skip known non-subject directory names
      // if (SKIP_DIRS.has(part.toLowerCase())) continue;

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
    // const na = parseInt(a.numeric_id) || 0;
    // const nb = parseInt(b.numeric_id) || 0;
    // return na - nb;
    const aMatch = a.original_id.match(/^([A-Za-z]+)(\d+)$/);
    const bMatch = b.original_id.match(/^([A-Za-z]+)(\d+)$/);

    if (aMatch && bMatch) {
      const prefixCompare = aMatch[1].localeCompare(bMatch[1]);
      if (prefixCompare !== 0) return prefixCompare;
      return parseInt(aMatch[2]) - parseInt(bMatch[2]);
    }

    const na = parseInt(a.numeric_id) || 0;
    const nb = parseInt(b.numeric_id) || 0;
    return na - nb;
  });

  // Build group map: subject originalId → parent directory name
  // const groupMap: Record<string, string> = {};
  // for (const filepath of allFiles) {
  //   const parts = filepath.split("/");
  //   for (let i = 1; i < parts.length - 1; i++) {
  //     if (seenIds.has(parts[i]) && !SKIP_DIRS.has(parts[i - 1].toLowerCase())) {
  //       groupMap[parts[i]] = parts[i - 1];
  //     }
  //   }
  // }

  // // Attach group to each record
  // for (const rec of subjectRecords) {
  //   if (groupMap[rec.original_id]) {
  //     rec.group = groupMap[rec.original_id];
  //   }
  // }

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

const DATA_EXTENSIONS = /\.(snirf|nii|nii\.gz|dcm|mat|nirs|h5|hdf5|edf|bdf)$/i;
const TRIO_FILENAMES = new Set([
  "dataset_description.json",
  "participants.tsv",
  "readme.md",
  "readme.txt",
  "readme.rst",
  "readme",
]);
// ── Step 2: Flat filename identifier extraction
// Mirrors _extract_subjects_from_flat_filenames() in planner.py
// KEY DIFFERENCE from old version: uses base identifier (before first _)
// not tokenizer dominant prefixes
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

export const extractSubjectAnalysis = (
  allFiles: string[],
  userNSubjects?: number | null,
  dominantPrefixes?: { prefix: string; count: number; percentage: number }[]
): SubjectAnalysis => {
  // Step 1: directory structure
  let subjectInfo = extractFromDirectoryStructure(allFiles);

  // Step 2: flat filename fallback
  if (!subjectInfo || subjectInfo.subject_records.length === 0) {
    subjectInfo = extractFromFlatFilenames(allFiles);
  }

  if (!subjectInfo || subjectInfo.subject_records.length === 0) {
    return {
      success: false,
      method: "none",
      subject_records: [],
      subject_count: 0,
      has_site_info: false,
      variants_by_subject: {},
      python_generated_filename_rules: [],
      id_mapping: {
        id_mapping: {},
        reverse_mapping: {},
        strategy_used: "none",
        metadata_columns: [],
      },
    };
  }

  // ── CRITICAL validation: mirrors planner.py lines 190-215
  // If extracted count doesn't match user hint but dominant prefixes do,
  // fall back to dominant prefixes (handles VHM/VHF body-part over-extraction)
  const pythonCount = subjectInfo.subject_count;
  if (
    userNSubjects &&
    pythonCount !== userNSubjects &&
    dominantPrefixes &&
    dominantPrefixes.length === userNSubjects
  ) {
    subjectInfo = {
      success: true,
      method: "dominant_prefix_fallback",
      subject_records: dominantPrefixes.map((p, i) => ({
        original_id: p.prefix,
        numeric_id: String(i + 1),
        site: null,
        pattern_name: "dominant_prefix",
        file_count: p.count,
      })),
      subject_count: dominantPrefixes.length,
      has_site_info: false,
      variants_by_subject: {},
      python_generated_filename_rules: [],
    };
  }
  // bug fix for subject mapping
  // === original
  // const idMapping = generateIdMapping(subjectInfo);
  // return { ...subjectInfo, id_mapping: idMapping };
  // ==== end
  // ==== updates
  // CRITICAL: n_subjects is authoritative (mirrors planner.py PROMPT_BIDS_PLAN)
  // If analysis count doesn't match user input, fall back to sequential numbering
  const expectedCount = userNSubjects;
  if (expectedCount && subjectInfo.subject_count !== expectedCount) {
    const idMap: Record<string, string> = {};
    const reverseMap: Record<string, string> = {};
    for (let i = 1; i <= expectedCount; i++) {
      const bidsId = String(i).padStart(2, "0");
      idMap[`sub-${bidsId}`] = bidsId;
      reverseMap[bidsId] = `sub-${bidsId}`;
    }
    return {
      ...subjectInfo,
      subject_count: expectedCount,
      id_mapping: {
        id_mapping: idMap,
        reverse_mapping: reverseMap,
        strategy_used: "numeric_fallback",
        metadata_columns: [],
      },
    };
  }

  const idMapping = generateIdMapping(subjectInfo);
  return { ...subjectInfo, id_mapping: idMapping };
};

// ── ID mapping — mirrors _generate_subject_id_mapping() in planner.py
const generateIdMapping = (
  subjectInfo: Omit<SubjectAnalysis, "id_mapping">
): SubjectAnalysis["id_mapping"] => {
  const records = subjectInfo.subject_records;
  const idMapping: Record<string, string> = {};
  const reverseMapping: Record<string, string> = {};

  // Detect already-BIDS format (sub-01, sub-02...)
  const allAlreadyBids = records.every((r) => /^sub-\w+$/i.test(r.original_id));

  if (allAlreadyBids) {
    for (const rec of records) {
      const bidsId = rec.original_id.replace(/^sub-/i, "");
      idMapping[rec.original_id] = bidsId;
      reverseMapping[bidsId] = rec.original_id;
    }
    return {
      id_mapping: idMapping,
      reverse_mapping: reverseMapping,
      strategy_used: "already_bids",
      metadata_columns: [],
    };
  }

  // Numeric strategy: try to extract trailing numbers first
  // BZZ003 → "003", patient021 → "021" (mirrors _extract_numeric_id_from_identifier)
  const extractedNumbers: Record<string, string> = {};
  for (const rec of records) {
    const nums = rec.original_id.match(/\d+/g);
    if (nums) extractedNumbers[rec.original_id] = nums[nums.length - 1];
  }

  const numericValues = Object.values(extractedNumbers);
  const allUnique = new Set(numericValues).size === numericValues.length;

  if (Object.keys(extractedNumbers).length === records.length && allUnique) {
    // Use extracted numeric IDs (preserving leading zeros)
    for (const rec of records) {
      const bidsId = extractedNumbers[rec.original_id];
      idMapping[rec.original_id] = bidsId;
      reverseMapping[bidsId] = rec.original_id;
    }
  } else {
    // Fall back to sequential numbering
    for (let i = 0; i < records.length; i++) {
      const orig = records[i].original_id;
      const bidsId = String(i + 1);
      idMapping[orig] = bidsId;
      reverseMapping[bidsId] = orig;
    }
  }

  return {
    id_mapping: idMapping,
    reverse_mapping: reverseMapping,
    strategy_used: "numeric",
    metadata_columns: ["original_id"],
  };
};
