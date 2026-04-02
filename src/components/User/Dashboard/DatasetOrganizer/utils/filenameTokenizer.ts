// src/components/DatasetOrganizer/utils/filenameTokenizer.ts
// Mirrors filename_tokenizer.py

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

const DATA_EXTENSIONS =
  /\.(snirf|nii|nii\.gz|dcm|mat|nirs|jnii|bnii|h5|hdf5|edf|bdf)$/i;

// ============================================================================
// FilenamePatternAnalyzer — mirrors FilenameTokenizer class
// ============================================================================
/*
 * Tokenize a filename into meaningful tokens.
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

/*
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

// ============================================================================
// FilenamePatternAnalyzer — mirrors FilenamePatternAnalyzer class
// ============================================================================

interface TokenStatistics {
  totalFiles: number;
  tokenFrequency: Record<string, number>;
  prefixFrequency: Record<string, number>;
  dominantPrefixes: DominantPrefix[];
  tokenPositions: Record<number, Record<string, number>>; // NEW — mirrors token_positions
  insights: string[]; // NEW — mirrors _generate_insights()
  uniqueTokenCount: number; // NEW
  uniquePrefixCount: number; // NEW
}

interface DominantPrefix {
  prefix: string;
  count: number;
  percentage: number;
}

interface LLMPayload {
  task: string;
  statistics: TokenStatistics;
  filenameSamples: string[];
  userHints: Record<string, any>;
  instructions: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mirrors FilenamePatternAnalyzer._find_dominant_prefixes()
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// _generate_insights()
// Mirrors FilenamePatternAnalyzer._generate_insights()
// ─────────────────────────────────────────────────────────────────────────────

const generateInsights = (
  allTokens: Record<string, number>,
  prefixTokens: Record<string, number>,
  dominantPrefixes: DominantPrefix[]
): string[] => {
  const insights: string[] = [];
  const uniqueTokenCount = Object.keys(allTokens).length;

  // Insight 1: token diversity
  if (uniqueTokenCount < 20) {
    insights.push(
      `Low token diversity: only ${uniqueTokenCount} unique tokens across all files`
    );
  } else if (uniqueTokenCount > 100) {
    insights.push(
      `High token diversity: ${uniqueTokenCount} unique tokens detected`
    );
  }

  // Insight 2: prefix distribution
  if (dominantPrefixes.length === 0) {
    insights.push("No dominant filename prefixes detected");
  } else if (dominantPrefixes.length === 1) {
    const p = dominantPrefixes[0];
    insights.push(
      `Single dominant prefix '${p.prefix}' in ${p.percentage}% of files`
    );
  } else if (dominantPrefixes.length === 2) {
    const [p1, p2] = dominantPrefixes;
    insights.push(
      `Two major prefixes detected: '${p1.prefix}' (${p1.percentage}%) and '${p2.prefix}' (${p2.percentage}%)`
    );
  } else {
    insights.push(
      `${dominantPrefixes.length} dominant prefixes detected, suggesting possible subject groupings`
    );
  }

  // Insight 3: most common tokens
  const topTokens = Object.entries(allTokens)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  if (topTokens.length > 0) {
    const commonList = topTokens.map(([t, c]) => `'${t}' (${c})`).join(", ");
    insights.push(`Most frequent tokens: ${commonList}`);
  }

  return insights;
};

// ─────────────────────────────────────────────────────────────────────────────
// _sample_diverse_filenames()
// Mirrors FilenamePatternAnalyzer._sample_diverse_filenames()
// ─────────────────────────────────────────────────────────────────────────────

const sampleDiverseFilenames = (
  filenames: string[],
  maxSamples: number = 30
): string[] => {
  if (filenames.length <= maxSamples) return [...filenames].sort();

  // Group by first token (mirrors Python: prefix_groups[prefix].append(filename))
  const prefixGroups: Record<string, string[]> = {};
  for (const filename of filenames) {
    const tokens = tokenizeFilename(filename);
    const prefix = tokens.length > 0 ? tokens[0] : "none";
    if (!prefixGroups[prefix]) prefixGroups[prefix] = [];
    prefixGroups[prefix].push(filename);
  }

  const groupCount = Object.keys(prefixGroups).length;
  const samplesPerGroup = Math.max(1, Math.floor(maxSamples / groupCount));

  const samples: string[] = [];
  for (const prefix of Object.keys(prefixGroups).sort()) {
    const groupFiles = prefixGroups[prefix];
    const n = Math.min(groupFiles.length, samplesPerGroup);
    samples.push(...[...groupFiles].sort().slice(0, n));
    if (samples.length >= maxSamples) break;
  }

  return samples.slice(0, maxSamples);
};

// ─────────────────────────────────────────────────────────────────────────────
// analyze_token_statistics()
// Mirrors FilenamePatternAnalyzer.analyze_token_statistics()
// ─────────────────────────────────────────────────────────────────────────────

export const analyzeTokenStatistics = (
  filenames: string[]
): TokenStatistics => {
  const allTokens: Record<string, number> = {};
  const prefixTokens: Record<string, number> = {};
  const positionTokens: Record<number, Record<string, number>> = {};

  for (const filename of filenames) {
    // Mirror Python __init__: strip to just filename if path provided
    const fname = filename.includes("/")
      ? filename.split("/").pop()!
      : filename;

    const tokens = tokenizeFilename(fname);

    // Count all tokens
    for (const token of tokens) {
      allTokens[token] = (allTokens[token] || 0) + 1;
    }

    // CRITICAL: use first TOKEN as prefix (not regex)
    if (tokens.length > 0) {
      const firstToken = tokens[0];
      prefixTokens[firstToken] = (prefixTokens[firstToken] || 0) + 1;
    }

    // NEW: count tokens by position — mirrors position_tokens[i][token] += 1
    tokens.forEach((token, i) => {
      if (!positionTokens[i]) positionTokens[i] = {};
      positionTokens[i][token] = (positionTokens[i][token] || 0) + 1;
    });
  }

  // Cap frequencies — mirrors .most_common(50) / .most_common(20)
  const tokenFrequency = Object.fromEntries(
    Object.entries(allTokens)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
  );
  const prefixFrequency = Object.fromEntries(
    Object.entries(prefixTokens)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
  );

  // Cap each position bucket at top 10 — mirrors .most_common(10)
  const tokenPositions: Record<number, Record<string, number>> = {};
  for (const [pos, counter] of Object.entries(positionTokens)) {
    tokenPositions[Number(pos)] = Object.fromEntries(
      Object.entries(counter)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
    );
  }

  const dominantPrefixes = findDominantPrefixes(prefixTokens, filenames.length);
  const insights = generateInsights(allTokens, prefixTokens, dominantPrefixes);

  return {
    totalFiles: filenames.length,
    tokenFrequency,
    prefixFrequency,
    dominantPrefixes,
    tokenPositions, // NEW
    insights, // NEW
    uniqueTokenCount: Object.keys(allTokens).length, // NEW
    uniquePrefixCount: Object.keys(prefixTokens).length, // NEW
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// build_llm_payload()
// Mirrors FilenamePatternAnalyzer.build_llm_payload()
// ─────────────────────────────────────────────────────────────────────────────

export const buildLLMPayload = (
  filenames: string[],
  userHints: Record<string, any>,
  maxSamples: number = 30
): LLMPayload => {
  const stats = analyzeTokenStatistics(filenames);
  const filenameSamples = sampleDiverseFilenames(filenames, maxSamples);

  return {
    task: "subject_identification",
    statistics: stats,
    filenameSamples,
    userHints,
    instructions:
      "Analyze the filename token statistics and samples. " +
      "Determine how to group files by subject. " +
      "The 'dominant_prefixes' may indicate subject identifiers. " +
      "The 'insights' provide observations. " +
      "User hint 'n_subjects' can help validate your hypothesis.",
  };
};

/**
 * Analyze token statistics across all filenames.
 * Mirrors FilenamePatternAnalyzer.analyze_token_statistics()
 */
// export const analyzeTokenStatistics = (
//   filenames: string[]
// ): TokenStatistics => {
//   const allTokens: Record<string, number> = {};
//   const prefixTokens: Record<string, number> = {}; // first token only

//   for (const filename of filenames) {
//     // Extract just filename from path
//     const fname = filename.includes("/")
//       ? filename.split("/").pop()!
//       : filename;

//     const tokens = tokenizeFilename(fname);

//     // Count all tokens
//     for (const token of tokens) {
//       allTokens[token] = (allTokens[token] || 0) + 1;
//     }

//     // CRITICAL: use first TOKEN as prefix (not regex match)
//     if (tokens.length > 0) {
//       const firstToken = tokens[0];
//       prefixTokens[firstToken] = (prefixTokens[firstToken] || 0) + 1;
//     }
//   }

//   const dominantPrefixes = findDominantPrefixes(prefixTokens, filenames.length);

//   return {
//     totalFiles: filenames.length,
//     tokenFrequency: allTokens,
//     prefixFrequency: prefixTokens,
//     dominantPrefixes,
//   };
// };

/*
 * Find dominant prefixes — tokens appearing in >5% of files
 * that are not common words.
 * Mirrors FilenamePatternAnalyzer._find_dominant_prefixes()
 */
// const findDominantPrefixes = (
//   prefixCounter: Record<string, number>,
//   totalFiles: number
// ): DominantPrefix[] => {
//   const threshold = totalFiles * 0.05; // 5% threshold

//   return Object.entries(prefixCounter)
//     .filter(([prefix, count]) => {
//       if (count < threshold) return false;
//       if (COMMON_WORDS.has(prefix.toLowerCase())) return false;
//       return true;
//     })
//     .sort((a, b) => b[1] - a[1])
//     .slice(0, 20)
//     .map(([prefix, count]) => ({
//       prefix,
//       count,
//       percentage: Math.round((count / totalFiles) * 1000) / 10,
//     }));
// };

// ============================================================================
// Integration Functions
// Mirrors analyze_filenames_for_subjects() + _generate_recommendation() in filename_tokenizer.py
// ============================================================================

export interface FilenameAnalysisResult {
  python_statistics: TokenStatistics;
  llm_payload: LLMPayload;
  confidence: "high" | "medium" | "low" | "none";
  recommendation: string;
}

/**
 * Main entry point: analyze filenames to detect subject groupings.
 * Mirrors analyze_filenames_for_subjects() in filename_tokenizer.py
 *
 * Called from buildEvidenceBundle() in llmHelpers.ts — replaces the
 * manual filenameAnalysis block that was built inline there.
 */
export const analyzeFilenamesForSubjects = (
  allFiles: string[],
  userHints: Record<string, any>
): FilenameAnalysisResult => {
  // Mirror Python: extract just filenames, not full paths
  const filenames = allFiles.map((f) =>
    f.includes("/") ? f.split("/").pop()! : f
  );

  const stats = analyzeTokenStatistics(filenames);
  const llmPayload = buildLLMPayload(filenames, userHints, 30);

  // Assess confidence — mirrors Python confidence logic exactly
  const dominantCount = stats.dominantPrefixes.length;
  const userNSubjects: number | null = userHints?.n_subjects ?? null;

  let confidence: "high" | "medium" | "low" | "none" = "none";
  if (dominantCount > 0) {
    if (userNSubjects && dominantCount === userNSubjects) {
      confidence = "high";
    } else if (dominantCount >= 2 && dominantCount <= 10) {
      confidence = "medium";
    } else {
      confidence = "low";
    }
  }

  const recommendation = generateRecommendation(stats, userHints);

  return {
    python_statistics: stats,
    llm_payload: llmPayload,
    confidence,
    recommendation,
  };
};

/**
 * Mirrors _generate_recommendation() in filename_tokenizer.py
 */
const generateRecommendation = (
  stats: TokenStatistics,
  userHints: Record<string, any>
): string => {
  const dominantPrefixes = stats.dominantPrefixes;
  const userNSubjects: number | null = userHints?.n_subjects ?? null;

  if (dominantPrefixes.length === 0) {
    return (
      "No clear filename patterns detected. " +
      "Recommend using --describe to explain subject identification."
    );
  }

  if (userNSubjects && dominantPrefixes.length === userNSubjects) {
    const prefixesStr = dominantPrefixes.map((p) => p.prefix).join(", ");
    return (
      `HIGH CONFIDENCE: Detected ${dominantPrefixes.length} dominant prefixes ` +
      `(${prefixesStr}) matching user hint of ${userNSubjects} subjects.`
    );
  }

  if (dominantPrefixes.length >= 2 && dominantPrefixes.length <= 5) {
    return (
      `MEDIUM CONFIDENCE: Detected ${dominantPrefixes.length} potential subject groups. ` +
      `Will send to LLM for validation.`
    );
  }

  return (
    `LOW CONFIDENCE: Found ${dominantPrefixes.length} prefix patterns, ` +
    `which may or may not represent subjects. LLM will analyze.`
  );
};

// ============================================================================
// SubjectGroupingDecision
// Mirrors SubjectGroupingDecision class in filename_tokenizer.py
// Not used in runtime flow — used as typed helpers when parsing LLM responses
// ============================================================================

export interface PrefixMappingDecision {
  method: "prefix_based";
  description: string;
  rules: Array<{
    prefix: string;
    maps_to_subject: string;
    match_pattern: string;
  }>;
  participant_metadata: Record<string, Record<string, any>>;
}

export interface SequentialAssignmentDecision {
  method: "sequential";
  n_subjects: number;
  note: string;
}

export interface BlockingQuestionDecision {
  method: "blocked";
  reason: string;
  question: {
    type: string;
    severity: string;
    message: string;
    options: string[];
  };
}

export type SubjectGroupingDecision =
  | PrefixMappingDecision
  | SequentialAssignmentDecision
  | BlockingQuestionDecision;

/**
 * Mirrors SubjectGroupingDecision.create_prefix_mapping()
 */
export const createPrefixMapping = (
  prefixToSubject: Record<string, string>,
  metadata?: Record<string, Record<string, any>>
): PrefixMappingDecision => ({
  method: "prefix_based",
  description: `Files grouped by ${
    Object.keys(prefixToSubject).length
  } filename prefixes`,
  rules: Object.entries(prefixToSubject).map(([prefix, subjId]) => ({
    prefix,
    maps_to_subject: subjId,
    match_pattern: `${prefix}*`,
  })),
  participant_metadata: metadata ?? {},
});

/**
 * Mirrors SubjectGroupingDecision.create_sequential_assignment()
 */
export const createSequentialAssignment = (
  nSubjects: number
): SequentialAssignmentDecision => ({
  method: "sequential",
  n_subjects: nSubjects,
  note:
    "No clear subject grouping pattern detected in filenames. " +
    "Assigning sequential IDs based on file order or user hint.",
});

/**
 * Mirrors SubjectGroupingDecision.create_blocking_question()
 */
export const createBlockingQuestion = (
  reason: string,
  options: string[]
): BlockingQuestionDecision => ({
  method: "blocked",
  reason,
  question: {
    type: "subject_grouping",
    severity: "block",
    message: reason,
    options,
  },
});

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
