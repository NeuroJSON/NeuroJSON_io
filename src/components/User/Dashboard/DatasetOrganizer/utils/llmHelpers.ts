// src/components/DatasetOrganizer/utils/llmHelpers.ts
import {
  categorizeFile,
  detectModality,
  getCountsByExtension,
  getUserContextText,
} from "./fileAnalyzers";
import { FileItem } from "redux/projects/types/projects.interface";

/**
 * Build structured file summary for LLM
 */
export const buildFileSummary = (files: FileItem[]): string => {
  let summary = "";

  // Check if trio files exist
  const datasetDesc = files.find((f) => f.name === "dataset_description.json");
  const readme = files.find((f) => f.name === "README.md");
  const participants = files.find((f) => f.name === "participants.tsv");

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

  summary += "DATA FILES TO CONVERT:\n";
  summary += "=".repeat(70) + "\n";

  // List data files with detailed categorization
  const dataFiles = files.filter(
    (f) =>
      !f.isUserMeta ||
      ["dataset_description.json", "README.md", "participants.tsv"].includes(
        f.name
      )
  );

  dataFiles.forEach((f) => {
    if (
      !["dataset_description.json", "README.md", "participants.tsv"].includes(
        f.name
      )
    ) {
      const category = categorizeFile(f);
      summary += `  - ${f.name} [${category}]`;
      if (f.sourcePath) summary += ` (${f.sourcePath})`;
      summary += "\n";
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

  return {
    root: baseDirectoryPath,
    counts_by_ext: counts,
    all_files: files
      .filter((f) => !f.isUserMeta)
      .map((f) => f.sourcePath || f.name),
    documents: files
      //   .filter((f) => f.content && ["text", "office"].includes(f.fileType || ""))
      .filter((f) => {
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
      n_subjects: null,
    },
    trio_found: {
      "dataset_description.json": files.some(
        (f) => f.name === "dataset_description.json"
      ),
      "README.md": files.some((f) => f.name === "README.md"),
      "participants.tsv": files.some((f) => f.name === "participants.tsv"),
    },
  };
};
