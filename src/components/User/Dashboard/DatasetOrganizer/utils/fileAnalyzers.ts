// src/components/DatasetOrganizer/utils/fileAnalyzers.ts
import { FileItem } from "redux/projects/types/projects.interface";

/**
 * Categorize a file based on its name and type
 * Returns detailed scan category (anatomical-T1w, functional-bold, etc.)
 */
export const categorizeFile = (file: FileItem): string => {
  const name = file.name.toLowerCase();

  // Functional scans (task-based)
  if (name.includes("task-") && name.includes("bold")) {
    return "functional-bold";
  }
  if (name.endsWith(".snirf")) {
    return "functional-nirs";
  }

  if (name.endsWith(".nirs")) return "functional-nirs";
  if (name.endsWith(".mat")) return "functional-nirs";

  // Anatomical scans
  if (name.includes("t1w")) {
    return "anatomical-T1w";
  }
  if (name.includes("t2w") || name.includes("inplanet2")) {
    return "anatomical-T2w";
  }
  if (name.includes("flair")) {
    return "anatomical-FLAIR";
  }

  if (name.endsWith(".dcm")) return "anatomical-dicom";

  // Diffusion
  if (name.includes("dwi") || name.includes("diffusion")) {
    return "diffusion";
  }

  // Field maps
  if (name.includes("fieldmap") || name.includes("fmap")) {
    return "fieldmap";
  }

  // Fall back to file type
  return file.fileType || "unknown";
};

/**
 * Detect modality from file collection
 */
export const detectModality = (files: FileItem[]): string => {
  const counts: Record<string, number> = {};
  files.forEach((f) => {
    const ext = f.fileType || "unknown";
    counts[ext] = (counts[ext] || 0) + 1;
  });

  if (counts.nifti > 0 || counts.dicom > 0) return "mri";
  if (
    counts.hdf5 > 0 ||
    counts.matlab > 0 ||
    counts.homer3 > 0 ||
    files.some((f) => f.name.endsWith(".snirf"))
  )
    return "nirs";
  return "mixed";
};

/**
 * Get file extension counts
 */
export const getCountsByExtension = (
  files: FileItem[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  files.forEach((f) => {
    const ext = f.fileType || "unknown";
    counts[ext] = (counts[ext] || 0) + 1;
  });
  return counts;
};

/**
 * Extract user context from metadata files
 */
export const getUserContextText = (files: FileItem[]): string => {
  const readme = files.find((f) => f.name.toLowerCase().includes("readme"));
  const instructions = files.find(
    (f) =>
      f.name.toLowerCase().includes("conversion") ||
      f.name.toLowerCase().includes("instruction")
  );
  const participants = files.find((f) =>
    f.name.toLowerCase().includes("participant")
  );

  const parts = [];
  if (readme?.content) parts.push(`README:\n${readme.content}`);
  if (instructions?.content)
    parts.push(`INSTRUCTIONS:\n${instructions.content}`);
  if (participants?.content)
    parts.push(`PARTICIPANTS:\n${participants.content}`);

  return parts.join("\n\n");
};

/** (not using yet)
 * Analyze filename patterns to detect subjects
 * (Simplified version inspired by auto-bidsify's filename_tokenizer)
 */
export const analyzeFilenamePatterns = (
  files: FileItem[]
): {
  subjectCount: number;
  subjectIds: string[];
  hasRunNumbers: boolean;
  hasTaskNames: boolean;
} => {
  const dataFiles = files.filter((f) => f.type === "file" && !f.isUserMeta);
  const subjectIds = new Set<string>();
  let hasRunNumbers = false;
  let hasTaskNames = false;

  dataFiles.forEach((f) => {
    const name = f.name;

    // Extract subject ID (sub-01, sub-02, etc.)
    const subMatch = name.match(/sub-(\d+)/i);
    if (subMatch) {
      subjectIds.add(subMatch[1]);
    }

    // Check for run numbers
    if (name.includes("_run-")) {
      hasRunNumbers = true;
    }

    // Check for task names
    if (name.includes("task-")) {
      hasTaskNames = true;
    }
  });

  return {
    subjectCount: subjectIds.size,
    subjectIds: Array.from(subjectIds).sort(),
    hasRunNumbers,
    hasTaskNames,
  };
};
