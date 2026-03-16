// src/components/DatasetOrganizer/utils/llmHelpers.ts
import {
  categorizeFile,
  detectModality,
  getCountsByExtension,
  getUserContextText,
} from "./fileAnalyzers";
import { extractSubjectAnalysis } from "./filenameTokenizer";
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
  baseDirectoryPath: string
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
  const allFiles = files
    .filter((f) => f.source === "user" && f.type === "file")
    .map((f) => f.sourcePath || f.name);

  const subjectAnalysis = extractSubjectAnalysis(allFiles);
  // ← end

  return {
    root: baseDirectoryPath,
    counts_by_ext: counts,
    samples, // add for samples
    // all_files: files
    //   .filter((f) => f.source === "user" && f.type === "file")
    //   .map((f) => f.sourcePath || f.name),
    all_files: allFiles,
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
      modality_hint: detectModality(files),
      // n_subjects: null,
      n_subjects: subjectAnalysis.subject_count || null, // ← use extracted count
    },
    subject_analysis: subjectAnalysis, // ← add for subject_analysis
    trio_found: {
      "dataset_description.json": files.some(
        (f) => f.source === "ai" && f.name === "dataset_description.json"
      ),
      "README.md": files.some(
        (f) => f.source === "ai" && f.name === "README.md"
      ),
      "participants.tsv": files.some(
        (f) => f.source === "ai" && f.name === "participants.tsv"
      ),
    },
  };
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
