// src/components/DatasetOrganizer/utils/llmHelpers.ts
import {
  categorizeFile,
  detectModality,
  getCountsByExtension,
  getUserContextText,
} from "./fileAnalyzers";
import {
  analyzeFilenamesForSubjects,
  analyzeTokenStatistics,
} from "./filenameTokenizer";
import { FileItem } from "redux/projects/types/projects.interface";

// ============================================================================
// FileStructureAnalyzer
// Mirrors universal_core.py FileStructureAnalyzer
// Works on allFiles: string[] (relative paths) from VFS
// ============================================================================

const analyzeDirectoryStructure = (allFiles: string[]): Record<string, any> => {
  const depthCounter: Record<number, number> = {};
  const uniqueDirs = new Set<string>();
  const levelDirs: Record<number, Set<string>> = {};

  for (const filepath of allFiles) {
    const parts = filepath.split("/");
    const depth = parts.length - 1;
    depthCounter[depth] = (depthCounter[depth] || 0) + 1;

    for (let level = 0; level < parts.length - 1; level++) {
      uniqueDirs.add(parts[level]);
      if (!levelDirs[level]) levelDirs[level] = new Set();
      levelDirs[level].add(parts[level]);
    }
  }

  // Infer structure template — mirrors _infer_structure_template()
  const firstLevel = levelDirs[0] ? [...levelDirs[0]].slice(0, 10) : [];
  const hasSubKeyword = firstLevel.some((d) => d.toLowerCase().includes("sub"));
  const nLevels = Object.keys(levelDirs).length;

  let template = "flat";
  if (hasSubKeyword) {
    if (nLevels === 1) template = "{subject}";
    else if (nLevels === 2) template = "{subject}/{scantype}";
    else if (nLevels === 3) template = "{subject}/{scantype}/{format}";
    else template = "{subject}/nested";
  } else if (nLevels > 0) {
    template = `custom_${nLevels}_levels`;
  }

  return {
    max_depth: Math.max(0, ...Object.keys(depthCounter).map(Number)),
    depth_distribution: depthCounter,
    unique_dir_names: [...uniqueDirs].sort().slice(0, 100),
    dir_level_patterns: Object.fromEntries(
      Object.entries(levelDirs).map(([k, v]) => [k, [...v].sort().slice(0, 20)])
    ),
    total_unique_dirs: uniqueDirs.size,
    structure_template: template,
  };
};

const detectSubjectIdentifiers = (
  allFiles: string[],
  userHint: number | null
): Record<string, any> => {
  const firstLevelDirs = new Set<string>();
  for (const filepath of allFiles) {
    const parts = filepath.split("/");
    if (parts.length > 1) firstLevelDirs.add(parts[0]);
  }

  const candidates: any[] = [];
  const totalFiles = allFiles.length;

  // Pattern 1: Site_subID (e.g. Beijing_sub82352)
  const p1Matches: Record<string, any> = {};
  for (const dir of firstLevelDirs) {
    const m = dir.match(/^([A-Za-z]+)_sub(\d+)$/i);
    if (m) p1Matches[m[2]] = { site: m[1], original: dir };
  }
  if (Object.keys(p1Matches).length > 0) {
    candidates.push({
      type: "directory_pattern",
      pattern_name: "site_sub_id",
      pattern_display: "{site}_sub{id}",
      extraction_regex: `([A-Za-z]+)_sub(\\d+)`,
      subject_group: 2,
      site_group: 1,
      count: Object.keys(p1Matches).length,
      sample_ids: Object.keys(p1Matches).sort().slice(0, 10),
      metadata: { has_site: true },
      avg_files_per_subject:
        Object.keys(p1Matches).length > 0
          ? totalFiles / Object.keys(p1Matches).length
          : 0,
    });
  }

  // Pattern 2: sub-ID or subID (BIDS standard)
  const p2Matches = new Set<string>();
  for (const dir of firstLevelDirs) {
    const m = dir.match(/^sub-?(\w+)$/i);
    if (m) p2Matches.add(m[1]);
  }
  if (p2Matches.size > 0) {
    candidates.push({
      type: "directory_pattern",
      pattern_name: "bids_standard",
      pattern_display: "sub-{id}",
      extraction_regex: `sub-?(\\w+)`,
      subject_group: 1,
      site_group: null,
      count: p2Matches.size,
      sample_ids: [...p2Matches].sort().slice(0, 10),
      metadata: { has_site: false },
      avg_files_per_subject:
        p2Matches.size > 0 ? totalFiles / p2Matches.size : 0,
    });
  }

  // Pattern 3: Numeric directories (e.g. 001, 025)
  const p3Matches = new Set<string>();
  for (const dir of firstLevelDirs) {
    if (/^\d{2,6}$/.test(dir)) p3Matches.add(dir);
  }
  if (p3Matches.size > 0) {
    candidates.push({
      type: "directory_pattern",
      pattern_name: "numeric_only",
      pattern_display: "{id}",
      extraction_regex: `^(\\d+)$`,
      subject_group: 1,
      site_group: null,
      count: p3Matches.size,
      sample_ids: [...p3Matches].sort().slice(0, 10),
      metadata: { numeric_only: true },
      avg_files_per_subject:
        p3Matches.size > 0 ? totalFiles / p3Matches.size : 0,
    });
  }

  // Pattern 4: patient_ID or subject_ID in filenames
  const p4Matches = new Set<string>();
  for (const filepath of allFiles) {
    const filename = filepath.split("/").pop()!;
    const m = filename.match(/(?:patient|subject)[_-]?(\d+)/i);
    if (m) p4Matches.add(m[1]);
  }
  if (p4Matches.size > 0) {
    candidates.push({
      type: "filename_pattern",
      pattern_name: "patient_or_subject_id",
      pattern_display: "{prefix}_{id}",
      extraction_regex: `(?:patient|subject)[_-]?(\\d+)`,
      subject_group: 1,
      site_group: null,
      count: p4Matches.size,
      sample_ids: [...p4Matches].sort().slice(0, 10),
      metadata: {},
      avg_files_per_subject:
        p4Matches.size > 0 ? totalFiles / p4Matches.size : 0,
    });
  }

  // Pattern 5: Alphanumeric IDs (PD01, Control01, HC03)
  const p5Matches = new Set<string>();
  for (const dir of firstLevelDirs) {
    if (/^[A-Za-z]+\d+$/.test(dir)) p5Matches.add(dir);
  }
  if (p5Matches.size > 0) {
    candidates.push({
      type: "directory_pattern",
      pattern_name: "alphanum_id",
      pattern_display: "{prefix}{id}",
      extraction_regex: `^([A-Za-z]+)(\\d+)$`,
      subject_group: 2,
      site_group: null,
      count: p5Matches.size,
      sample_ids: [...p5Matches].sort().slice(0, 10),
      metadata: {},
      avg_files_per_subject:
        p5Matches.size > 0 ? totalFiles / p5Matches.size : 0,
    });
  }

  if (candidates.length === 0) {
    return {
      best_candidate: null,
      confidence: "none",
      candidates: [],
      total_candidates_evaluated: 0,
    };
  }

  // Score candidates — mirrors _score_identifier_candidate()
  for (const c of candidates) {
    let score = 0;
    const count = c.count;

    if (userHint) {
      if (count === userHint) score += 50;
      else if (Math.abs(count - userHint) <= 2) score += 30;
      else if (Math.abs(count - userHint) <= 5) score += 10;
    }

    const avg = c.avg_files_per_subject;
    if (avg >= 5) score += 20;
    else if (avg >= 2) score += 15;
    else if (avg >= 1) score += 5;

    if (count >= 2 && count <= 200) score += 15;
    else if (count > 200 && count <= 500) score += 5;

    if (c.type === "directory_pattern") score += 10;
    if (c.metadata?.has_site) score += 5;
    c.score = score;
  }

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  let confidence: "high" | "medium" | "low" | "none" = "none";
  if (best.score > 80) confidence = "high";
  else if (best.score > 60) confidence = "medium";
  else confidence = "low";

  return {
    candidates: candidates.slice(0, 5),
    best_candidate: best,
    confidence,
    total_candidates_evaluated: candidates.length,
  };
};

const detectDuplicateFilenames = (
  allFiles: string[]
): Record<string, string[]> => {
  const filenameToPaths: Record<string, string[]> = {};
  for (const filepath of allFiles) {
    const filename = filepath.split("/").pop()!;
    if (!filenameToPaths[filename]) filenameToPaths[filename] = [];
    filenameToPaths[filename].push(filepath);
  }
  return Object.fromEntries(
    Object.entries(filenameToPaths).filter(([, paths]) => paths.length > 1)
  );
};

const buildDirectoryTreeSummary = (
  allFiles: string[],
  maxSubjects: number = 50
): Record<string, any> => {
  const subjectToStructure: Record<string, Record<string, string[]>> = {};

  for (const filepath of allFiles) {
    const parts = filepath.split("/");
    if (parts.length < 2) continue;
    const subjectDir = parts[0];
    const remainingPath = parts.slice(1, -1).join("/") || "root";
    const filename = parts[parts.length - 1];
    const pattern = filename.replace(/\d+/g, "N").replace(/\s*\([^)]*\)/g, "");

    if (!subjectToStructure[subjectDir]) subjectToStructure[subjectDir] = {};
    if (!subjectToStructure[subjectDir][remainingPath])
      subjectToStructure[subjectDir][remainingPath] = [];
    if (!subjectToStructure[subjectDir][remainingPath].includes(pattern))
      subjectToStructure[subjectDir][remainingPath].push(pattern);
  }

  const allSubjects = Object.keys(subjectToStructure).sort();
  let sampledSubjects = allSubjects;
  if (allSubjects.length > maxSubjects) {
    const mid = Math.floor(allSubjects.length / 2);
    sampledSubjects = [
      ...allSubjects.slice(0, 15),
      ...allSubjects.slice(mid - 10, mid + 10),
      ...allSubjects.slice(-15),
    ]
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, maxSubjects);
  }

  const summary: Record<string, any> = {};
  for (const subject of sampledSubjects) {
    summary[subject] = Object.fromEntries(
      Object.entries(subjectToStructure[subject]).map(([path, patterns]) => [
        path,
        patterns.slice(0, 5),
      ])
    );
  }

  return {
    subject_structure_samples: summary,
    total_subjects_detected: allSubjects.length,
    sampled_subjects: sampledSubjects.length,
  };
};

// ============================================================================
// TS-only UI helpers
// ============================================================================

// Build structured file summary for LLM
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
// export const analyzeFilePatterns = (files: FileItem[]): string => {
//   const dataFiles = files.filter((f) => f.type === "file" && !f.isUserMeta);
//   const filenames = dataFiles.map((f) => f.name);

//   const extensions = [
//     ...new Set(
//       filenames.map((name) => {
//         const parts = name.toLowerCase().split(".");
//         return parts.length > 1 ? parts[parts.length - 1] : "none";
//       })
//     ),
//   ];

//   // Categorize files
//   const categorized: Record<string, string[]> = {
//     anatomical: [],
//     functional: [],
//     diffusion: [],
//     other: [],
//   };

//   dataFiles.forEach((f) => {
//     const category = categorizeFile(f);
//     if (category === "mri" || category === "jnifti") {
//       categorized.anatomical.push(f.name);
//     } else if (category === "nirs") {
//       categorized.functional.push(f.name);
//     } else if (category === "array") {
//       categorized.diffusion.push(f.name);
//     } else {
//       categorized.other.push(f.name);
//     }
//   });

//   return `
// FILENAME ANALYSIS:
// ${"=".repeat(70)}
// Total data files: ${dataFiles.length}
// File types: ${extensions.join(", ")}

// File Categories:
//   Anatomical scans: ${categorized.anatomical.length}
//   Functional scans: ${categorized.functional.length}
//   Diffusion scans: ${categorized.diffusion.length}
//   Other files: ${categorized.other.length}

// Sample filenames (first 10):
// ${filenames
//   .slice(0, 10)
//   .map((name) => `  - ${name}`)
//   .join("\n")}
// ${
//   filenames.length > 10 ? `\n  ... and ${filenames.length - 10} more files` : ""
// }
// `;
// };

// Get user context (README, instructions, participant info)
// export const getUserContext = (files: FileItem[]): string => {
//   const userText = getUserContextText(files);
//   if (!userText) return "No user-provided context available.";
//   return `USER-PROVIDED CONTEXT:\n${"=".repeat(70)}\n${userText}`;
// };

// Get file annotations (notes)
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

// ============================================================================
// functions mirror to evidence.py
// ============================================================================

// ============================================================================
// detect_kind from evidence.py maps to categorizeFile in fileAnalyzers.ts
// ============================================================================

// ============================================================================
// Intelligent file sampling — mirrors _intelligent_file_sampling() in evidence.py
// Groups files by extension then by filename pattern, samples up to 5 per extension.
// ============================================================================

const intelligentFileSampling = (
  dataFiles: FileItem[],
  targetSamplesPerExt: number = 5
): FileItem[] => {
  // Group by extension — mirrors by_ext in Python
  const byExt: Record<string, FileItem[]> = {};
  dataFiles.forEach((f) => {
    const name = f.name.toLowerCase();
    const ext = name.endsWith(".nii.gz")
      ? ".nii.gz"
      : "." + (name.split(".").pop() || "other");
    if (!byExt[ext]) byExt[ext] = [];
    byExt[ext].push(f);
  });

  const sampledFiles: FileItem[] = [];

  Object.entries(byExt).forEach(([ext, fileList]) => {
    // Group by filename pattern — mirrors pattern_groups in Python
    const patternGroups: Record<string, FileItem[]> = {};
    fileList.forEach((f) => {
      const pattern = f.name.replace(/\d+/g, "N").replace(/\s*\([^)]*\)/g, "");
      if (!patternGroups[pattern]) patternGroups[pattern] = [];
      patternGroups[pattern].push(f);
    });

    const nPatterns = Object.keys(patternGroups).length;
    const spp = Math.max(1, Math.floor(targetSamplesPerExt / nPatterns));

    let extSamples: FileItem[] = [];
    const extSampledSet = new Set<string>();

    // Take spp files from each pattern group
    Object.values(patternGroups).forEach((group) => {
      group.slice(0, spp).forEach((f) => {
        extSamples.push(f);
        extSampledSet.add(f.id);
      });
    });

    // Top-up to targetSamplesPerExt if under
    if (extSamples.length < targetSamplesPerExt) {
      const sorted = [...Object.values(patternGroups)].sort(
        (a, b) => b.length - a.length
      );
      for (const group of sorted) {
        if (extSamples.length >= targetSamplesPerExt) break;
        for (const f of group) {
          if (extSamples.length >= targetSamplesPerExt) break;
          if (!extSampledSet.has(f.id)) {
            extSamples.push(f);
            extSampledSet.add(f.id);
          }
        }
      }
    }

    sampledFiles.push(...extSamples);
  });

  return sampledFiles;
};

// ============================================================================
// mirror _collect_participant_metadata_evidence() in evidence.py
// ============================================================================

const buildParticipantMetadataEvidence = (
  allFiles: string[],
  documents: { relpath: string; filename: string; content: string }[],
  files: FileItem[]
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

  const dicomFiles = files.filter(
    (f) => f.source === "user" && f.fileType === "dicom" && f.content
  );
  if (dicomFiles.length > 0) {
    const dicomSamples = dicomFiles.slice(0, 10).map((f) => ({
      filename: f.name,
      extracted_header: f.content?.slice(0, 300) || "",
    }));
    evidence.dicom_headers = {
      found: true,
      sampled_count: dicomSamples.length,
      total_dicom_files: dicomFiles.length,
      samples: dicomSamples,
      note: "DICOM headers extracted client-side",
    };
  } else {
    evidence.dicom_headers = { found: false };
  }

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

// ============================================================================
// Build evidence bundle structure
// mirror _build_evidence_bundle_internal() and build_evidence_bundle() in evidence.py
// ============================================================================

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
  // const userText = getUserContextText(files);
  const fileContextText = getUserContextText(files);
  const userText = [userOverrides?.describeText?.trim(), fileContextText]
    .filter(Boolean)
    .join("\n\n");

  // add for samples ---start---
  const dataFiles = files.filter(
    (f) => f.source === "user" && f.type === "file"
  );

  const sampledFiles = intelligentFileSampling(dataFiles);
  const samples = sampledFiles.map((f) => ({
    relpath: f.sourcePath || f.name,
    filename: f.name,
    suffix: f.name.split(".").pop() || "",
    kind: categorizeFile(f),
    size: 0,
    header_info: f.content ? { raw: f.content.slice(0, 500) } : undefined,
  }));

  const allFiles = files
    .filter((f) => f.source === "user" && f.type === "file")
    .map((f) => {
      const path = f.sourcePath || f.name;
      // Strip leading folder name — mirrors Python's relative-to-data_root paths
      // "1-FRESH-Motor-snirf/sub-01_ses-..." → "sub-01_ses-..."
      const parts = path.split("/");
      return parts.length > 1 ? parts.slice(1).join("/") : path;
    });

  // ── FileStructureAnalyzer — mirrors universal_core.py
  const dirStructure = analyzeDirectoryStructure(allFiles);
  const subjectDetectionResult = detectSubjectIdentifiers(
    allFiles,
    userOverrides?.nSubjects ?? null
  );
  const duplicates = detectDuplicateFilenames(allFiles);
  const treeSummary = buildDirectoryTreeSummary(allFiles, 50);
  const pathBasedCount = subjectDetectionResult.best_candidate?.count ?? 0;
  const pathBasedConfidence = subjectDetectionResult.confidence;

  const filenameAnalysisRaw = analyzeFilenamesForSubjects(allFiles, {
    n_subjects: userOverrides?.nSubjects ?? null,
    user_text: userOverrides?.describeText ?? "",
  });
  const { llm_payload, ...filenameAnalysis } = filenameAnalysisRaw;
  const tokenStats = filenameAnalysis.python_statistics;
  const filenameConfidence = filenameAnalysis.confidence;

  // subject count decision logic:
  let finalSubjectCount: number | null;
  let countSource: string;

  if (userOverrides?.nSubjects != null) {
    finalSubjectCount = userOverrides.nSubjects;
    countSource = "user_provided";
  } else if (pathBasedConfidence === "high") {
    finalSubjectCount = pathBasedCount;
    countSource = "path_based_high_confidence";
  } else if (
    (filenameConfidence === "high" || filenameConfidence === "medium") &&
    pathBasedCount === 0
  ) {
    finalSubjectCount = tokenStats.dominantPrefixes.length;
    countSource = "filename_based";
  } else if (pathBasedCount > 0) {
    finalSubjectCount = pathBasedCount;
    countSource = "path_based";
  } else {
    finalSubjectCount = 1;
    countSource = "fallback";
  }

  const documents = files
    .filter((f) => {
      if (f.source !== "user") return false;
      if (!f.content || f.content.trim().length === 0) return false;
      if (["text", "office", "meta"].includes(f.fileType || "")) return true;
      if (f.fileType === "nifti" && f.contentType === "nifti") return true;
      if (f.fileType === "hdf5" && f.contentType === "hdf5") return true;
      if (f.fileType === "neurojsonText") return true;
      if (f.fileType === undefined && f.content) return true;
      return false;
    })
    .map((f) => ({
      relpath: f.sourcePath || f.name,
      filename: f.name,
      type: f.fileType || "unknown",
      content: f.content || "",
      purpose: "experimental_protocol_or_metadata",
    }));

  const participantEvidence = buildParticipantMetadataEvidence(
    allFiles,
    documents,
    files
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
      path_based_count: pathBasedCount,
      path_based_confidence: pathBasedConfidence,
      filename_based_count: tokenStats.dominantPrefixes.length,
      filename_based_confidence: filenameConfidence,
      final_count: finalSubjectCount,
      count_source: countSource,
      best_pattern:
        subjectDetectionResult.best_candidate?.pattern_display || "none",
    },
    structure_analysis: {
      directory_structure: dirStructure,
      subject_detection: subjectDetectionResult,
      duplicate_files: Object.fromEntries(
        Object.entries(duplicates).slice(0, 20)
      ),
      tree_summary_for_llm: treeSummary,
      analyzer_confidence: subjectDetectionResult.confidence,
    },

    documents: documents,
    document_summary: {
      total_documents: documents.length,
      document_types: [...new Set(documents.map((d) => d.type))],
      total_text_length: documents.reduce(
        (sum, d) => sum + d.content.length,
        0
      ),
    },
    sampling_strategy: {
      method: "pattern_based",
      target_per_ext: 5,
      total_files_sampled: sampledFiles.length,
    },
    user_hints: {
      user_text: userText,
      modality_hint: userOverrides?.modalityHint || detectModality(files),
      n_subjects: finalSubjectCount,
    },
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
    trio_promoted: {
      dataset_description: [],
      readme: [],
      participants: [],
    },
    data_source: {
      type: "directory",
      original_path: baseDirectoryPath,
      actual_path: baseDirectoryPath,
    },
  };
};

// ============================================================================
// mirror ingest_data() in ingest.py
// ============================================================================

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
