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
  // files.forEach((f) => {
  //   const ext = f.fileType || "unknown";
  //   counts[ext] = (counts[ext] || 0) + 1;
  // });
  files
    .filter((f) => f.source === "user" && f.type === "file")
    .forEach((f) => {
      // Mirror Python: use ".nii.gz" as a single key for .nii.gz files
      const name = f.name.toLowerCase();
      const ext = name.endsWith(".nii.gz")
        ? ".nii.gz"
        : "." + name.split(".").pop();
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

  const datasetDescription = files.find(
    (f) => f.name.toLowerCase() === "dataset_description.json"
  );

  const pdfsAndDocs = files.filter(
    (f) =>
      f.source === "user" &&
      f.fileType === "office" &&
      f.content?.trim() &&
      f.name.toLowerCase() !== "participants.tsv" // already handled
  );

  const parts = [];
  if (datasetDescription?.content)
    parts.push(`DATASET DESCRIPTION:\n${datasetDescription.content}`);
  if (readme?.content) parts.push(`README:\n${readme.content}`);
  if (instructions?.content)
    parts.push(`INSTRUCTIONS:\n${instructions.content}`);
  if (participants?.content)
    parts.push(`PARTICIPANTS:\n${participants.content}`);
  pdfsAndDocs.forEach((f) => {
    parts.push(`DOCUMENT [${f.name}]:\n${f.content!.slice(0, 3000)}`);
  });
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

// add to fileAnalyzers.ts

// export interface SubjectRecord {
//   original_id: string;
//   numeric_id: string;
//   site: string | null;
//   pattern_name: string;
//   file_count: number;
// }

// export interface SubjectAnalysis {
//   success: boolean;
//   method: string;
//   subject_records: SubjectRecord[];
//   subject_count: number;
//   has_site_info: boolean;
//   variants_by_subject: Record<string, any>;
//   python_generated_filename_rules: any[];
//   id_mapping: {
//     id_mapping: Record<string, string>;
//     reverse_mapping: Record<string, string>;
//     strategy_used: string;
//     metadata_columns: string[];
//   };
// }

// // mirrors _extract_subjects_from_directory_structure
// const extractFromDirectoryStructure = (
//   allFiles: string[]
// ): Omit<SubjectAnalysis, "id_mapping"> | null => {
//   const patterns: Array<[RegExp, boolean, number, number | null, string]> = [
//     [/^([A-Za-z]+)_sub(\d+)$/i, true, 2, 1, "site_prefixed"],
//     [/^sub-(\d+)$/i, false, 1, null, "standard_bids"],
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

// // mirrors _extract_subjects_from_flat_filenames
// const extractFromFlatFilenames = (
//   allFiles: string[]
// ): Omit<SubjectAnalysis, "id_mapping"> | null => {
//   const identifierToFiles: Record<string, string[]> = {};

//   for (const filepath of allFiles) {
//     const filename = filepath.split("/").pop() || "";
//     const nameNoExt = filename
//       .replace(/\.[^/.]+$/, "")
//       .replace(/\.nii\.gz$/, "");
//     const match = nameNoExt.match(/^([A-Za-z0-9\-]+)/);
//     if (match) {
//       const identifier = match[1];
//       if (!identifierToFiles[identifier]) identifierToFiles[identifier] = [];
//       identifierToFiles[identifier].push(filepath);
//     }
//   }

//   if (Object.keys(identifierToFiles).length === 0) return null;

//   const extractNumeric = (id: string): number => {
//     const nums = id.match(/\d+/g);
//     return nums ? parseInt(nums[nums.length - 1]) : 999999;
//   };

//   const sortedIdentifiers = Object.keys(identifierToFiles).sort(
//     (a, b) => extractNumeric(a) - extractNumeric(b)
//   );

//   const subjectRecords: SubjectRecord[] = sortedIdentifiers.map((id, i) => ({
//     original_id: id,
//     numeric_id: String(i + 1),
//     site: null,
//     pattern_name: "dominant_prefix",
//     file_count: identifierToFiles[id].length,
//   }));

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

// // mirrors _generate_subject_id_mapping
// const generateIdMapping = (
//   subjectInfo: Omit<SubjectAnalysis, "id_mapping">
// ): SubjectAnalysis["id_mapping"] => {
//   const records = subjectInfo.subject_records;
//   const idMapping: Record<string, string> = {};
//   const reverseMapping: Record<string, string> = {};

//   // detect already-BIDS format (sub-01, sub-02...)
//   const allAlreadyBids = records.every((r) => /^sub-\w+$/i.test(r.original_id));

//   if (allAlreadyBids) {
//     for (const rec of records) {
//       const bidsId = rec.original_id.replace(/^sub-/i, "");
//       idMapping[rec.original_id] = bidsId;
//       reverseMapping[bidsId] = rec.original_id;
//     }
//     return {
//       id_mapping: idMapping,
//       reverse_mapping: reverseMapping,
//       strategy_used: "already_bids",
//       metadata_columns: [],
//     };
//   }

//   // numeric strategy
//   for (let i = 0; i < records.length; i++) {
//     const orig = records[i].original_id;
//     const bidsId = String(i + 1);
//     idMapping[orig] = bidsId;
//     reverseMapping[bidsId] = orig;
//   }

//   return {
//     id_mapping: idMapping,
//     reverse_mapping: reverseMapping,
//     strategy_used: "numeric",
//     metadata_columns: ["original_id"],
//   };
// };

// // main export — call this from llmHelpers
// export const extractSubjectAnalysis = (allFiles: string[]): SubjectAnalysis => {
//   const fromDir = extractFromDirectoryStructure(allFiles);
//   const base = fromDir ??
//     extractFromFlatFilenames(allFiles) ?? {
//       success: false,
//       method: "none",
//       subject_records: [],
//       subject_count: 0,
//       has_site_info: false,
//       variants_by_subject: {},
//       python_generated_filename_rules: [],
//     };

//   const idMapping = generateIdMapping(base);
//   return { ...base, id_mapping: idMapping };
// };
