// src/components/DatasetOrganizer/utils/fileAnalyzers.ts
// VFS adapter layer because NeuroJSON.io needs to work with FileItem[] objects
//  No single Python mirror. Functions map to:
//   categorizeFile()       → executor.py (infer_subdirectory_from_suffix, categorize_scan_type)
//   detectModality()       → evidence.py (detect_kind) + constants.py (MODALITY_*)
//   getCountsByExtension() → evidence.py (by_ext dict construction)
//   getUserContextText()   → evidence.py (_extract_document_content + documents[] assembly)
import { FileItem } from "redux/projects/types/projects.interface";

// ============================================================================
// categorizeFile()
// UI display function — determines file label/color in FileTree.
//
// NOT the same as inferScanType() in executorHelpers.ts:
//   categorizeFile()  → "what to show in the UI"
//   inferScanType()   → "what BIDS filename to generate"
//
// Partial mirror of executor.py → infer_subdirectory_from_suffix()
//                               + categorize_scan_type()
// ============================================================================
// export const categorizeFile = (file: FileItem): string => {
//   const name = file.name.toLowerCase();

//   // Functional scans (task-based)
//   if (name.includes("task-") && name.includes("bold")) return "functional-bold";
//   if (name.endsWith(".snirf")) return "functional-nirs";
//   if (name.endsWith(".nirs")) return "functional-nirs";
//   if (name.endsWith(".mat")) return "functional-nirs";

//   // Anatomical scans
//   if (name.includes("t1w")) return "anatomical-T1w";
//   if (name.includes("t2w") || name.includes("inplanet2"))
//     return "anatomical-T2w";
//   if (name.includes("flair")) return "anatomical-FLAIR";
//   if (name.endsWith(".dcm")) return "anatomical-dicom";

//   // JNIfTI — mirrors JNIFTI_EXT in constants.py: {'.jnii', '.bnii'}
//   if (name.endsWith(".jnii") || name.endsWith(".bnii"))
//     return "anatomical-jnifti";

//   // Diffusion
//   if (name.includes("dwi") || name.includes("diffusion")) return "diffusion";

//   // Field maps
//   if (name.includes("fieldmap") || name.includes("fmap")) return "fieldmap";

//   // Array/HDF5 (non-SNIRF)
//   if (name.endsWith(".h5") || name.endsWith(".hdf5")) return "array";

//   // Fall back to fileType from fileProcessors.ts
//   return file.fileType || "unknown";
// };

export const categorizeFile = (file: FileItem): string => {
  const name = file.name.toLowerCase();

  // Mirror detect_kind() priority order exactly:
  // user_trio → jnifti → nirs → mri → table → array → text_doc → document → archive → other

  // user_trio
  if (
    [
      "dataset_description.json",
      "participants.tsv",
      "readme.md",
      "readme.txt",
      "readme.rst",
      "readme",
    ].includes(name)
  )
    return "user_trio";

  // jnifti
  if (name.endsWith(".jnii") || name.endsWith(".bnii")) return "jnifti";

  // nirs — mirrors NIRS_EXT = {'.snirf', '.nirs', '.mat'}
  if (
    name.endsWith(".snirf") ||
    name.endsWith(".nirs") ||
    name.endsWith(".mat")
  )
    return "nirs";

  // mri — mirrors MRI_EXT = {'.nii', '.dcm'} + .nii.gz
  if (
    name.endsWith(".nii.gz") ||
    name.endsWith(".nii") ||
    name.endsWith(".dcm")
  )
    return "mri";

  // table
  if ([".csv", ".tsv", ".xlsx", ".xls"].some((e) => name.endsWith(e)))
    return "table";

  // array — mirrors ARRAY_EXT = {'.h5', '.hdf5', '.npy', '.npz'}
  if ([".h5", ".hdf5", ".npy", ".npz"].some((e) => name.endsWith(e)))
    return "array";

  // text_doc — mirrors TEXT_EXT = {'.txt', '.md', '.rst', '.html', '.htm', '.log'}
  if (
    [".txt", ".md", ".rst", ".html", ".htm", ".log"].some((e) =>
      name.endsWith(e)
    )
  )
    return "text_doc";

  // document — mirrors DOC_EXT = {'.pdf', '.docx', '.doc', '.pptx', '.ppt', '.odt'}
  if (
    [".pdf", ".docx", ".doc", ".pptx", ".ppt", ".odt"].some((e) =>
      name.endsWith(e)
    )
  )
    return "document";

  // archive
  if ([".zip", ".tar", ".tgz", ".tar.gz"].some((e) => name.endsWith(e)))
    return "archive";

  return "other";
};

// ============================================================================
// Detect modality from file collection
// Rough equivalent of evidence.py → detect_kind() + constants.py MODALITY_*
// ============================================================================
export const detectModality = (files: FileItem[]): string => {
  const counts: Record<string, number> = {};
  files.forEach((f) => {
    const ext = f.fileType || "unknown";
    counts[ext] = (counts[ext] || 0) + 1;
  });

  if (counts.nifti > 0 || counts.dicom > 0) return "mri";
  // FIX: fileProcessors.ts returns "nirs" for .nirs files, not "homer3"
  if (
    counts.hdf5 > 0 ||
    counts.matlab > 0 ||
    counts.nirs > 0 ||
    files.some((f) => f.name.endsWith(".snirf"))
  )
    return "nirs";
  return "mixed";
};

// ============================================================================
// Get file extension counts
// Mirrors evidence.py → by_ext dict construction.
// Uses ".nii.gz" as a single key — mirrors Python: p.name.lower().endswith(".nii.gz")
// ============================================================================
export const getCountsByExtension = (
  files: FileItem[]
): Record<string, number> => {
  const counts: Record<string, number> = {};
  files
    .filter((f) => f.source === "user" && f.type === "file")
    .forEach((f) => {
      const name = f.name.toLowerCase();
      const ext = name.endsWith(".nii.gz")
        ? ".nii.gz"
        : "." + name.split(".").pop();
      counts[ext] = (counts[ext] || 0) + 1;
    });
  return counts;
};

// ============================================================================
// Extract user context from metadata files
// Partial mirror of evidence.py → _extract_document_content() +
// the documents[] assembly in _build_evidence_bundle_internal().
//
// Python reads files from disk; this reads from VFS FileItem.content.
// ============================================================================
// export const getUserContextText = (files: FileItem[]): string => {
//   const readme = files.find((f) => f.name.toLowerCase().includes("readme"));
//   const instructions = files.find(
//     (f) =>
//       f.name.toLowerCase().includes("conversion") ||
//       f.name.toLowerCase().includes("instruction")
//   );
//   const participants = files.find((f) =>
//     f.name.toLowerCase().includes("participant")
//   );

//   const datasetDescription = files.find(
//     (f) => f.name.toLowerCase() === "dataset_description.json"
//   );

//   const pdfsAndDocs = files.filter(
//     (f) =>
//       f.source === "user" &&
//       f.fileType === "office" &&
//       f.content?.trim() &&
//       f.name.toLowerCase() !== "participants.tsv" // already handled
//   );
//   const textFiles = files.filter(
//     (f) =>
//       f.source === "user" &&
//       f.fileType === "text" &&
//       f.content?.trim() &&
//       ![
//         "readme",
//         "participants.tsv",
//         "dataset_description.json",
//         "readme.md",
//         "readme.txt",
//       ].includes(f.name.toLowerCase()) &&
//       f.isUserMeta === true // only user-added meta files, not data sidecars
//   );
//   textFiles.forEach((f) => {
//     parts.push(`TEXT FILE [${f.name}]:\n${f.content!.slice(0, 3000)}`);
//   });

//   const parts = [];
//   if (datasetDescription?.content)
//     parts.push(`DATASET DESCRIPTION:\n${datasetDescription.content}`);
//   if (readme?.content) parts.push(`README:\n${readme.content}`);
//   if (instructions?.content)
//     parts.push(`INSTRUCTIONS:\n${instructions.content}`);
//   if (participants?.content)
//     parts.push(`PARTICIPANTS:\n${participants.content}`);
//   pdfsAndDocs.forEach((f) => {
//     parts.push(`DOCUMENT [${f.name}]:\n${f.content!.slice(0, 3000)}`);
//   });
//   return parts.join("\n\n");
// };
export const getUserContextText = (files: FileItem[]): string => {
  const readme = files.find(
    (f) => f.source === "user" && f.name.toLowerCase().includes("readme")
  );
  const instructions = files.find(
    (f) =>
      f.source === "user" &&
      (f.name.toLowerCase().includes("conversion") ||
        f.name.toLowerCase().includes("instruction"))
  );
  const participants = files.find(
    (f) => f.source === "user" && f.name.toLowerCase().includes("participant")
  );
  const datasetDescription = files.find(
    (f) =>
      f.source === "user" && f.name.toLowerCase() === "dataset_description.json"
  );

  const pdfsAndDocs = files.filter(
    (f) =>
      f.source === "user" &&
      f.fileType === "office" &&
      f.content?.trim() &&
      f.name.toLowerCase() !== "participants.tsv"
  );
  const textFiles = files.filter(
    (f) =>
      f.source === "user" &&
      f.fileType === "text" &&
      f.content?.trim() &&
      ![
        "readme",
        "participants.tsv",
        "dataset_description.json",
        "readme.md",
        "readme.txt",
      ].includes(f.name.toLowerCase()) &&
      f.isUserMeta === true
  );

  const parts: string[] = [];
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
  textFiles.forEach((f) => {
    parts.push(`TEXT FILE [${f.name}]:\n${f.content!.slice(0, 3000)}`);
  });

  return parts.join("\n\n");
};
