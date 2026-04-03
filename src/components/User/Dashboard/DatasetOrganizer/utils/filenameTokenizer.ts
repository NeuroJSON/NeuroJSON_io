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
