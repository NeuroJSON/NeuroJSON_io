// src/components/DatasetOrganizer/utils/llmHelpers.ts
import {
  categorizeFile,
  detectModality,
  getCountsByExtension,
  getUserContextText,
} from "./fileAnalyzers";
import {
  extractSubjectAnalysis,
  analyzeTokenStatistics,
} from "./filenameTokenizer";
import { FileItem } from "redux/projects/types/projects.interface";

/**
 * Build structured file summary for LLM
 */
export const buildFileSummary = (files: FileItem[]): string => {
  let summary = "";

  // Trio section — AI generated files only
  const datasetDesc = files.find(
    (f) => f.source === "ai" && f.name === "dataset_description.json"
  );
  const readme = files.find((f) => f.source === "ai" && f.name === "README.md");
  const participants = files.find(
    (f) => f.source === "ai" && f.name === "participants.tsv"
  );

  const hasTrioFiles = datasetDesc || readme || participants;

  if (hasTrioFiles) {
    summary += "GENERATED BIDS METADATA FILES:\n";
    summary += "=".repeat(70) + "\n\n";

    if (datasetDesc?.content) {
      summary += "[dataset_description.json]:\n";
      summary += datasetDesc.content + "\n\n";
    }

    if (readme?.content) {
      summary += "[README.md]:\n";
      summary += readme.content.slice(0, 1000) + "\n\n";
    }

    if (participants?.content) {
      summary += "[participants.tsv]:\n";
      summary += participants.content + "\n\n";
    }

    summary += "=".repeat(70) + "\n\n";
  }

  // Data files section — user dropped files only
  summary += "DATA FILES TO CONVERT:\n";
  summary += "=".repeat(70) + "\n";

  const dataFiles = files.filter(
    (f) => f.source === "user" && f.type === "file"
  );

  const formatLabel: Record<string, string> = {
    dicom: "format: DICOM → convert_to: nifti (dcm2niix)",
    matlab: "format: MATLAB → convert_to: snirf",
    homer3: "format: Homer3 → convert_to: snirf",
    nifti: "format: NIfTI → format_ready: true",
    hdf5: "format: SNIRF → format_ready: true",
  };

  // dataFiles.forEach((f) => {
  //   const category = categorizeFile(f);
  //   const fmt = formatLabel[f.fileType || ""] || ""; // add
  //   summary += `  - ${f.name} [${category}]`;
  //   if (fmt) summary += ` <${fmt}>`; // add
  //   if (f.sourcePath) summary += ` (${f.sourcePath})`;
  //   summary += "\n";
  // });
  const byType: Record<string, typeof dataFiles> = {};
  dataFiles.forEach((f) => {
    const key = f.fileType || "other";
    if (!byType[key]) byType[key] = [];
    byType[key].push(f);
  });

  Object.entries(byType).forEach(([type, typeFiles]) => {
    const fmt = formatLabel[type] || "";
    const sample = typeFiles.slice(0, 5);

    summary += `\n[${type.toUpperCase()}] ${typeFiles.length} files total`;
    if (fmt) summary += ` — ${fmt}`;
    summary += "\n";

    sample.forEach((f) => {
      const category = categorizeFile(f);
      summary += `  - ${f.name} [${category}]`;
      if (f.sourcePath) summary += ` (${f.sourcePath})`;
      summary += "\n";
    });

    if (typeFiles.length > 5) {
      summary += `  ... and ${typeFiles.length - 5} more ${type} files\n`;
    }
  });

  return summary;
};

/**
 * Analyze file patterns
 */
export const analyzeFilePatterns = (files: FileItem[]): string => {
  const dataFiles = files.filter((f) => f.type === "file" && !f.isUserMeta);
  const filenames = dataFiles.map((f) => f.name);

  const extensions = [
    ...new Set(
      filenames.map((name) => {
        const parts = name.toLowerCase().split(".");
        return parts.length > 1 ? parts[parts.length - 1] : "none";
      })
    ),
  ];

  // Categorize files
  const categorized: Record<string, string[]> = {
    anatomical: [],
    functional: [],
    diffusion: [],
    other: [],
  };

  dataFiles.forEach((f) => {
    const category = categorizeFile(f);
    if (category.startsWith("anatomical")) {
      categorized.anatomical.push(f.name);
    } else if (category.startsWith("functional")) {
      categorized.functional.push(f.name);
    } else if (category.includes("diffusion")) {
      categorized.diffusion.push(f.name);
    } else {
      categorized.other.push(f.name);
    }
  });

  return `
FILENAME ANALYSIS:
${"=".repeat(70)}
Total data files: ${dataFiles.length}
File types: ${extensions.join(", ")}

File Categories:
  Anatomical scans: ${categorized.anatomical.length}
  Functional scans: ${categorized.functional.length}
  Diffusion scans: ${categorized.diffusion.length}
  Other files: ${categorized.other.length}

Sample filenames (first 10):
${filenames
  .slice(0, 10)
  .map((name) => `  - ${name}`)
  .join("\n")}
${
  filenames.length > 10 ? `\n  ... and ${filenames.length - 10} more files` : ""
}
`;
};

/**
 * Get user context (README, instructions, participant info)
 */
export const getUserContext = (files: FileItem[]): string => {
  const userText = getUserContextText(files);
  if (!userText) return "No user-provided context available.";
  return `USER-PROVIDED CONTEXT:\n${"=".repeat(70)}\n${userText}`;
};

/**
 * Get file annotations (notes)
 */
export const getFileAnnotations = (files: FileItem[]): string => {
  const filesWithNotes = files.filter((f) => f.note);
  if (filesWithNotes.length === 0) return "";

  return `
FILE ANNOTATIONS (User Notes):
${filesWithNotes.map((f) => `  ${f.name}: ${f.note}`).join("\n")}
`;
};

/**
 * Download evidence JSON file
 */
export const downloadJSON = (data: any, filename: string) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Download text file(not using this function yet)
 */
export const downloadText = (text: string, filename: string) => {
  const blob = new Blob([text], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

/**
 * Build evidence bundle structure
 */
export const buildEvidenceBundle = (
  files: FileItem[],
  baseDirectoryPath: string,
  userOverrides?: {
    nSubjects: number | null;
    modalityHint: string;
    describeText: string;
  }
): any => {
  const counts = getCountsByExtension(files);
  const userText = getUserContextText(files);

  // add for samples ---start---
  const dataFiles = files.filter(
    (f) => f.source === "user" && f.type === "file"
  );

  // Mirror autobidsify's _intelligent_file_sampling()
  // Group by file type, take up to 5 samples per type
  const samplesByType: Record<string, FileItem[]> = {};
  dataFiles.forEach((f) => {
    const key = f.fileType || "other";
    if (!samplesByType[key]) samplesByType[key] = [];
    if (samplesByType[key].length < 5) {
      samplesByType[key].push(f);
    }
  });

  const samples = Object.values(samplesByType)
    .flat()
    .map((f) => ({
      relpath: f.sourcePath || f.name,
      filename: f.name,
      suffix: f.name.split(".").pop() || "",
      kind: f.fileType || "other",
      size: 0,
    }));

  // ----end---

  // add this for subject_analysis.json
  // const allFiles = files
  //   .filter((f) => f.source === "user" && f.type === "file")
  //   .map((f) => f.sourcePath || f.name);
  const allFiles = files
    .filter((f) => f.source === "user" && f.type === "file")
    .map((f) => {
      const path = f.sourcePath || f.name;
      // Strip leading folder name — mirrors Python's relative-to-data_root paths
      // "1-FRESH-Motor-snirf/sub-01_ses-..." → "sub-01_ses-..."
      const parts = path.split("/");
      return parts.length > 1 ? parts.slice(1).join("/") : path;
    });

  const subjectAnalysis = extractSubjectAnalysis(allFiles);
  // ← end

  // ── filename analysis (must come AFTER subjectAnalysis)
  const justFilenames = allFiles.map((f) =>
    f.includes("/") ? f.split("/").pop()! : f
  );
  const tokenStats = analyzeTokenStatistics(justFilenames);
  const dominantCount = tokenStats.dominantPrefixes.length;
  const userNSubjects = subjectAnalysis.subject_count || null;
  let filenameConfidence: "high" | "medium" | "low" | "none" = "none";
  if (dominantCount > 0) {
    if (userNSubjects && dominantCount === userNSubjects)
      filenameConfidence = "high";
    else if (dominantCount >= 2 && dominantCount <= 10)
      filenameConfidence = "medium";
    else filenameConfidence = "low";
  }
  const filenameAnalysis = {
    python_statistics: {
      total_files: tokenStats.totalFiles,
      token_frequency: tokenStats.tokenFrequency,
      prefix_frequency: tokenStats.prefixFrequency,
      dominant_prefixes: tokenStats.dominantPrefixes,
      unique_token_count: Object.keys(tokenStats.tokenFrequency).length,
      unique_prefix_count: Object.keys(tokenStats.prefixFrequency).length,
    },
    confidence: filenameConfidence,
    recommendation: buildFilenameRecommendation(
      tokenStats.dominantPrefixes,
      userNSubjects
    ),
  };

  // subject count decision logic:
  const finalSubjectCount =
    userOverrides?.nSubjects ?? // user wins
    subjectAnalysis.subject_count ??
    tokenStats.dominantPrefixes.length ??
    null;

  const participantEvidence = buildParticipantMetadataEvidence(
    allFiles,
    // pass the already-built documents array
    files
      .filter(
        (f) => f.source === "user" && f.content && f.content.trim().length > 0
      )
      .map((f) => ({
        relpath: f.sourcePath || f.name,
        filename: f.name,
        content: f.content || "",
      }))
  );

  return {
    root: baseDirectoryPath,
    counts_by_ext: counts,
    samples,
    all_files: allFiles,
    filename_analysis: filenameAnalysis, // NEW
    participant_metadata_evidence: participantEvidence, // NEW
    subject_detection: {
      method: "hybrid_analysis",
      path_based_count: subjectAnalysis.subject_count,
      path_based_confidence: subjectAnalysis.success ? "medium" : "none",
      filename_based_count: tokenStats.dominantPrefixes.length,
      filename_based_confidence: filenameConfidence,
      final_count: finalSubjectCount,
      count_source:
        userOverrides?.nSubjects != null
          ? "user_provided"
          : subjectAnalysis.success
          ? subjectAnalysis.method
          : "filename_based",
      best_pattern: subjectAnalysis.subject_records[0]?.pattern_name || "none",
    },
    documents: files
      .filter((f) => {
        if (f.source !== "user") return false; // exclude AI files
        if (!f.content || f.content.trim().length === 0) return false;

        // ✅ Text files - primary source
        if (["text", "office", "meta"].includes(f.fileType || "")) return true;

        // ✅ NIfTI headers - useful for LLM to understand scan parameters
        if (f.fileType === "nifti" && f.contentType === "nifti") return true;

        // ✅ HDF5/SNIRF structure - useful for fNIRS datasets
        if (f.fileType === "hdf5" && f.contentType === "hdf5") return true;

        // ✅ NeuroJSON - already JSON text
        if (f.fileType === "neurojsonText") return true;

        // ✅ Catch undefined fileType but has content (your current bug)
        if (f.fileType === undefined && f.content) return true;

        return false;
      })
      .map((f) => ({
        relpath: f.sourcePath || f.name,
        filename: f.name,
        type: f.fileType || "unknown",
        content: f.content || "",
        purpose: "experimental_protocol_or_metadata",
      })),
    user_hints: {
      user_text: userText,
      modality_hint: userOverrides?.modalityHint || detectModality(files),
      n_subjects: finalSubjectCount,
    },
    // subject_analysis: subjectAnalysis,
    trio_found: {
      "dataset_description.json": files.some(
        (f) => f.source === "user" && f.name === "dataset_description.json"
      ),
      "README.md": files.some(
        (f) =>
          f.source === "user" &&
          (f.name === "README.md" ||
            f.name === "README.txt" ||
            f.name === "README.rst" ||
            f.name === "readme.md")
      ),
      "participants.tsv": files.some(
        (f) => f.source === "user" && f.name === "participants.tsv"
      ),
    },
  };
};

const buildFilenameRecommendation = (
  dominantPrefixes: { prefix: string; count: number; percentage: number }[],
  userNSubjects: number | null
): string => {
  if (dominantPrefixes.length === 0)
    return "No clear filename patterns detected. Recommend user describe subject identification.";
  if (userNSubjects && dominantPrefixes.length === userNSubjects) {
    const prefixStr = dominantPrefixes.map((p) => p.prefix).join(", ");
    return `HIGH CONFIDENCE: Detected ${dominantPrefixes.length} dominant prefixes (${prefixStr}) matching user hint of ${userNSubjects} subjects.`;
  }
  if (dominantPrefixes.length >= 2 && dominantPrefixes.length <= 5)
    return `MEDIUM CONFIDENCE: Detected ${dominantPrefixes.length} potential subject groups. Will send to LLM for validation.`;
  return `LOW CONFIDENCE: Found ${dominantPrefixes.length} prefix patterns, which may or may not represent subjects. LLM will analyze.`;
};

const buildParticipantMetadataEvidence = (
  allFiles: string[],
  documents: { relpath: string; filename: string; content: string }[]
): Record<string, any> => {
  const evidence: Record<string, any> = {};

  // Evidence 1: explicit metadata files
  const metadataPatterns = [
    "participants",
    "subjects",
    "metadata",
    "demographics",
    "phenotype",
    "participant_data",
    "subject_info",
  ];
  const metadataExts = [".csv", ".tsv", ".json", ".txt", ".xlsx"];
  const metadataFiles = allFiles.filter((f) => {
    const fname = f.split("/").pop()!.toLowerCase();
    const ext = "." + fname.split(".").pop()!;
    return (
      metadataPatterns.some((p) => fname.startsWith(p)) &&
      metadataExts.includes(ext)
    );
  });
  evidence.explicit_metadata_files =
    metadataFiles.length > 0
      ? {
          found: true,
          count: metadataFiles.length,
          files: metadataFiles.map((f) => ({
            filename: f.split("/").pop(),
            path: f,
          })),
        }
      : { found: false };

  // Evidence 2: DICOM headers (already extracted into documents content)
  // Skip re-reading — not feasible client-side

  // Evidence 3: filename semantic patterns
  const genderKws = [
    "male",
    "female",
    "_m_",
    "_f_",
    "_m.",
    "_f.",
    "VHM",
    "VHF",
  ];
  const groupKws = [
    "patient",
    "control",
    "healthy",
    "hc",
    "pt",
    "ctrl",
    "case",
  ];
  const ageRegexes = [/\d{2}yo/, /\d{2}y\b/, /age\d{2}/, /y\d{2}/];

  const genderHits: any[] = [],
    groupHits: any[] = [],
    ageHits: any[] = [];
  for (const f of allFiles.slice(0, 200)) {
    const fn = (f.split("/").pop() || "").toLowerCase();
    for (const kw of genderKws) {
      if (fn.includes(kw.toLowerCase())) {
        genderHits.push({ keyword: kw, filename: fn });
        break;
      }
    }
    for (const kw of groupKws) {
      if (fn.includes(kw)) {
        groupHits.push({ keyword: kw, filename: fn });
        break;
      }
    }
    for (const rx of ageRegexes) {
      if (rx.test(fn)) {
        ageHits.push({ pattern: rx.source, filename: fn });
        break;
      }
    }
  }
  const totalSemanticHints =
    genderHits.length + groupHits.length + ageHits.length;
  evidence.filename_semantic_patterns =
    totalSemanticHints > 0
      ? {
          found: true,
          patterns: {
            gender_keywords: genderHits.slice(0, 10),
            group_keywords: groupHits.slice(0, 10),
            age_patterns: ageHits.slice(0, 10),
          },
        }
      : { found: false };

  // Evidence 4: demographic keywords in documents
  const demoTerms = [
    "male",
    "female",
    "sex",
    "gender",
    "age",
    "years old",
    "patient",
    "control",
    "healthy",
    "diagnosis",
    "participants",
    "subjects",
    "volunteers",
    "cohort",
    "cadaver",
    "adult",
    "child",
  ];
  const demoHits: any[] = [];
  for (const doc of documents) {
    const content = (doc.content || "").toLowerCase();
    const found: any[] = [];
    for (const term of demoTerms) {
      const idx = content.indexOf(term);
      if (idx !== -1) {
        const snippet = content
          .slice(Math.max(0, idx - 100), idx + 100)
          .trim()
          .replace(/\s+/g, " ");
        found.push({ term, context_snippet: snippet.slice(0, 200) });
      }
    }
    if (found.length > 0)
      demoHits.push({ document: doc.filename, found_terms: found.slice(0, 5) });
  }
  evidence.document_demographic_keywords =
    demoHits.length > 0
      ? {
          found: true,
          documents_with_keywords: demoHits.length,
          details: demoHits.slice(0, 5),
        }
      : { found: false };

  // Evidence 5: balanced prefix distribution
  const justFilenames = allFiles.map((f) =>
    f.includes("/") ? f.split("/").pop()! : f
  );
  const tokenStats = analyzeTokenStatistics(justFilenames);
  const dominant = tokenStats.dominantPrefixes;
  if (dominant.length === 2) {
    const [p1, p2] = dominant;
    const ratio =
      Math.min(p1.percentage, p2.percentage) /
      Math.max(p1.percentage, p2.percentage);
    if (ratio > 0.8) {
      evidence.balanced_prefix_distribution = {
        found: true,
        prefix_1: p1.prefix,
        prefix_1_percentage: p1.percentage,
        prefix_1_count: p1.count,
        prefix_2: p2.prefix,
        prefix_2_percentage: p2.percentage,
        prefix_2_count: p2.count,
        distribution_ratio: Math.round(ratio * 100) / 100,
        note: "Two balanced groups may indicate gender/group split",
      };
    } else {
      evidence.balanced_prefix_distribution = { found: false };
    }
  } else {
    evidence.balanced_prefix_distribution = { found: false };
  }

  const evidenceCount = Object.values(evidence).filter(
    (v) => typeof v === "object" && v?.found === true
  ).length;
  evidence.summary = {
    total_evidence_types_found: evidenceCount,
    evidence_types: Object.entries(evidence)
      .filter(([, v]) => typeof v === "object" && v?.found === true)
      .map(([k]) => k),
  };

  return evidence;
};

/**
 * Extract subject identifiers from file list
 * Mirrors autobidsify's _extract_subjects_from_flat_filenames()
 */
export const extractSubjectsFromFiles = (
  files: FileItem[]
): {
  subjects: { originalId: string; bidsId: string }[];
  strategy: string;
} => {
  const dataFiles = files.filter(
    (f) => f.source === "user" && f.type === "file"
  );

  // Count occurrences of each base identifier
  const identifierCounts: Record<string, number> = {};
  // dataFiles.forEach((f) => {
  //   const nameNoExt = f.name.replace(/\.[^/.]+$/, "").replace(/\.nii$/, "");
  //   const match = nameNoExt.match(/^([A-Za-z0-9\-]+)/);
  //   if (match) {
  //     const id = match[1];
  //     identifierCounts[id] = (identifierCounts[id] || 0) + 1;
  //   }
  // });
  dataFiles.forEach((f) => {
    const nameNoExt = f.name
      .replace(/\.nii\.gz$/i, "")
      .replace(/\.[^/.]+$/, "")
      .replace(/\s*\([^)]*\)/, ""); // remove (309) etc.

    // Split on first digit sequence or underscore — take prefix only
    // VHMCT1mm → VHMCT, sub-01 → sub-01, BZZ003 → BZZ
    const match = nameNoExt.match(/^([A-Za-z]+(?:-[A-Za-z]+)*)/);
    if (match) {
      const id = match[1];
      identifierCounts[id] = (identifierCounts[id] || 0) + 1;
    }
  });

  // Sort by frequency — most common identifiers are likely subjects
  // const sorted = Object.entries(identifierCounts).sort((a, b) => b[1] - a[1]);

  // Step 2: Keep only identifiers that appear in multiple files
  // (single-file identifiers are likely body parts, not subjects)
  const totalFiles = dataFiles.length;
  const threshold = Math.max(2, Math.floor(totalFiles * 0.05)); // at least 5% of files

  const filtered = Object.entries(identifierCounts)
    .filter(([, count]) => count >= threshold)
    .sort((a, b) => b[1] - a[1]);

  // If filtering leaves nothing, fall back to all identifiers
  const candidates =
    filtered.length > 0
      ? filtered
      : Object.entries(identifierCounts).sort((a, b) => b[1] - a[1]);
  // Step 3: Use numeric strategy for >10 subjects
  const strategy = candidates.length > 10 ? "numeric" : "numeric";
  // const strategy = sorted.length > 10 ? "numeric" : "semantic";

  // const subjects = sorted.map(([originalId], i) => ({
  //   originalId,
  //   bidsId:
  //     strategy === "numeric"
  //       ? String(i + 1)
  //       : originalId.replace(/[^a-zA-Z0-9]/g, ""),
  // }));
  const subjects = candidates.map(([originalId], i) => ({
    originalId,
    bidsId: String(i + 1),
  }));

  return { subjects, strategy };
};

export const buildIngestInfo = (
  baseDirectoryPath: string
  // outputDir: string
): object => {
  // Remove trailing slash if any
  const cleanPath = baseDirectoryPath.replace(/\/$/, "");

  // Get parent directory
  const parentDir = cleanPath.substring(0, cleanPath.lastIndexOf("/"));

  // Append outputs: "/home/.../test3-web/outputs"
  const outputDir = `${parentDir}/outputs`;

  return {
    step: "ingest",
    timestamp: new Date().toISOString(),
    input_path: baseDirectoryPath,
    input_type: "directory",
    output_dir: outputDir,
    staging_dir: null,
    actual_data_path: baseDirectoryPath, // ← the key field executor uses
    status: "complete",
  };
};
