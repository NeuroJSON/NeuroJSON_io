// src/components/DatasetOrganizer/utils/llmPrompts.ts

/**
 * Prompt for dataset_description.json generation
 * Based on auto-bidsify's PROMPT_TRIO_DATASET_DESC
 */
export const getDatasetDescriptionPrompt = (
  userText: string,
  evidenceBundle?: any
): string => {
  const documentsContext =
    // evidenceBundle?.documents
    //   ?.map((d: any) => `[${d.filename}]:\n${d.content}`)
    //   .join("\n\n") || "";
    evidenceBundle?.documents
      ?.map((d: any) => `[${d.filename}]:\n${(d.content || "").slice(0, 500)}`)
      .join("\n\n") || "";

  return `You are a BIDS dataset_description.json generator.
  
  CRITICAL: Use the following user-provided content to extract dataset information!
  
  USER-PROVIDED CONTENT:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${userText || "(no readme/instructions provided)"}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

   ALL UPLOADED DOCUMENTS (search these for dataset name, authors, etc.):
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${documentsContext || "(no documents)"}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Also consider the dataset folder name for clues about the dataset name:
  File paths start with: ${evidenceBundle?.root || ""}
  
  CRITICAL RULES:
  - Authors MUST be array: ["Name 1", "Name 2", "Name 3"]
  - DO NOT include empty strings "" or empty arrays []
  - DO NOT use placeholders like "Extract" or "Dataset Name"
  - Extract ACTUAL dataset name from content
  - License: use "PD" if not specified, normalize "CC BY 4.0" to "CC-BY-4.0"
  
  Extract from user-provided content:
  - Dataset name (look for study title, project name, experiment name)
  - Authors/institutions mentioned
  - Funding sources (if mentioned)
  - License information
  
  Output ONLY valid JSON (no markdown fences, no explanations):
  {
    "Name": "Actual Dataset Name Here",
    "BIDSVersion": "1.10.0",
    "DatasetType": "raw",
    "License": "PD",
    "Authors": ["Actual Author Name"]
  }`;
};

/**
 * Prompt for README.md generation
 * Based on auto-bidsify's PROMPT_TRIO_README
 */
export const getReadmePrompt = (userText: string): string => {
  return `Generate a comprehensive BIDS README.md file.
  
  CRITICAL: Use the following user-provided content as the PRIMARY source!
  
  USER-PROVIDED CONTENT:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${userText}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  Create a comprehensive README with these sections:
  - ## Overview (extract from user content)
  - ## Dataset Description (expand on user content)
  - ## Data Acquisition (if information available)
  - ## File Organization (describe BIDS structure)
  - ## Usage Notes
  - ## References (if mentioned in user content)
  
  Use the user-provided content to inform ALL sections.
  Expand and structure the information, but stay true to the original content.
  
  OUTPUT: Direct Markdown text only (no JSON wrapper, no code fences)`;
};

/**
 * Prompt for participants.tsv generation
 * Based on auto-bidsify's PROMPT_TRIO_PARTICIPANTS
 */
export const getParticipantsPrompt = (userText: string): string => {
  return `You are a BIDS participants.tsv column schema generator.

USER-PROVIDED CONTENT:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${userText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR JOB: Decide which columns belong in participants.tsv based ONLY on what is explicitly stated in the user content above.

STRICT RULES:
- participant_id is ALWAYS required
- ONLY add columns for demographics EXPLICITLY mentioned in the content
- DO NOT invent age, sex, handedness, or any column not directly stated
- If no demographic info is mentioned, return ONLY participant_id

Output ONLY valid JSON (no markdown fences, no explanation):
{
  "columns": [
    {"name": "participant_id", "required": true}
  ]
}

Examples:
- Content mentions "1 male, 1 female" → add {"name": "sex", "levels": ["M", "F"]}
- Content mentions "patients and controls" → add {"name": "group", "levels": ["patient", "control"]}
- Content mentions nothing about demographics → return only participant_id
`;
};

// export const getParticipantsPrompt = (userText: string): string => {
//   return `Generate a BIDS participants.tsv file.

//   CRITICAL: Extract participant metadata from the following user-provided content!

//   USER-PROVIDED CONTENT:
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//   ${userText}
//   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

//   STRICT RULES:
//   - First column MUST be "participant_id"
//   - Use tab (\\t) as delimiter
//   - ONLY include columns for data EXPLICITLY mentioned in the user content above
//   - DO NOT invent or assume age, sex, handedness, or any other column unless it is directly stated in the content
//   - If no demographic data is mentioned, output ONLY participant_id column
//   - If only subject IDs are known, output the minimal form below

//   MINIMAL FORM (use this when no demographics are mentioned):
//   participant_id
//   sub-01
//   sub-02

//   Extract participant information:
//   - Subject IDs (look for "sub-01", "2 subjects", "participants: sub-01 and sub-02", etc.)
//   - Demographics if available:
//     - "1 male, 1 female" → sex column: M, F
//     - "ages 25-65" → age column
//     - "patients and controls" → group column
//     - "right-handed" → handedness column

//   Rules:
//   - First column MUST be "participant_id"
//   - Use tab (\\t) as delimiter
//   - Include only columns with actual data (no empty columns)
//   - If only subject IDs known, output: participant_id\\nsub-01\\nsub-02

//   Examples:
//   - If text says "2 subjects: sub-01 and sub-02" with no demographics:
//     participant_id
//     sub-01
//     sub-02

//   - If text says "sub-01 (25y, male), sub-02 (30y, female)":
//     participant_id\\tage\\tsex
//     sub-01\\t25\\tM
//     sub-02\\t30\\tF

//   OUTPUT: Direct TSV text only (no JSON, no code fences, no markdown)`;
// };

/**
 * Main prompt for BIDS conversion script generation
 */
export const getConversionScriptPrompt = (
  baseDirectoryPath: string,
  fileSummary: string,
  filePatterns: string,
  userContext: string,
  annotations: string
): string => {
  return `You are a BIDS conversion expert specializing in neuroimaging data.
  
  ╔════════════════════════════════════════════════════════════════╗
  ║ TASK: Generate Python script to convert dataset to BIDS       ║
  ╚════════════════════════════════════════════════════════════════╝
  
  BASE DIRECTORY: ${baseDirectoryPath}
  
  ${fileSummary}
  
  ${filePatterns}
  
  ${userContext}
  
  ${annotations}
  
  CRITICAL FILE CATEGORIZATION RULES:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Files are marked with categories. YOU MUST respect these categories:
  
  - [anatomical-T1w] → Goes to sub-XX/anat/ folder, rename to sub-XX_T1w.nii.gz
  - [anatomical-T2w] → Goes to sub-XX/anat/ folder, rename to sub-XX_T2w.nii.gz
  - [functional-bold] → Goes to sub-XX/func/ folder, rename to sub-XX_task-<name>_run-XX_bold.nii.gz
  - [functional-nirs] → Goes to sub-XX/func/ folder, rename to sub-XX_task-<name>_nirs.snirf
  - [anatomical-dicom] → Convert to NIfTI using dcm2niix, then goes to sub-XX/anat/
  - [diffusion] → Goes to sub-XX/dwi/ folder
  - [fieldmap] → Goes to sub-XX/fmap/ folder

  FORMAT CONVERSION RULES:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Some files require conversion before copying to BIDS:
  
  - <format: DICOM → convert_to: nifti (dcm2niix)>
      → Run: subprocess.run(['dcm2niix', '-o', dest_dir, '-f', bids_filename, src_file])
      → Output goes to sub-XX/anat/
  
  - <format: MATLAB → convert_to: snirf>
      → Use MNE-Python: mne.export.export_raw(dst, raw, fmt='snirf')
      → OR note in script that manual conversion is needed
      → Output goes to sub-XX/nirs/
  
  - <format: Homer3 → convert_to: snirf>
      → Same as MATLAB conversion above
      → Output goes to sub-XX/nirs/
  
  - <format: NIfTI → format_ready: true>
      → Direct copy, no conversion needed
  
  - <format: SNIRF → format_ready: true>
      → Direct copy, no conversion needed
  
  FILENAME-BASED DETECTION (if category unclear):
  - Contains "task-" AND "bold" → ALWAYS functional (func/ folder)
  - Contains "T1w" → ALWAYS anatomical (anat/ folder)
  - Contains "T2w" OR "inplaneT2" → ALWAYS anatomical (anat/ folder)
  - Ends with ".snirf" → ALWAYS functional (func/ folder)
  - Ends with ".dcm" → ALWAYS needs dcm2niix conversion → anat/ folder
  - Ends with ".mat" → ALWAYS needs snirf conversion → nirs/ folder  
  - Ends with ".nirs" → ALWAYS needs snirf conversion → nirs/ folder
  
  ⚠️ CRITICAL: NEVER put task-based files in anat/ folder!
  ⚠️ CRITICAL: NEVER put T1w/T2w files in func/ folder!
  
  CRITICAL INSTRUCTIONS:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  1. The BIDS metadata files (dataset_description.json, README.md, participants.tsv)
     have ALREADY been generated above. Your script MUST:
     ✓ Use the EXACT content from dataset_description.json (copy it verbatim)
     ✓ Use the EXACT participant IDs from participants.tsv
     ✓ Write these files as-is to the BIDS directory
  
  2. All file paths are RELATIVE to base directory: ${baseDirectoryPath}
     When accessing files: os.path.join(base_dir, relative_path)
     
     Example:
     File shown as: "Balloon Analog Risk-taking Task/sub-01_T1w.nii.gz"
     Full path: os.path.join('${baseDirectoryPath}', 'Balloon Analog Risk-taking Task', 'sub-01_T1w.nii.gz')
  
  3. BIDS directory structure to create:
     bids_dataset/
     ├── dataset_description.json  ← Write exact content from above
     ├── README.md                  ← Write exact content from above
     ├── participants.tsv           ← Write exact content from above
     └── sub-XX/
         ├── anat/                  ← Anatomical scans only!
         │   ├── sub-XX_T1w.nii.gz
         │   └── sub-XX_T2w.nii.gz
         └── func/                  ← Functional scans only!
             └── sub-XX_task-<name>_run-XX_bold.nii.gz
  
  4. For EACH data file, you must:
     a) Extract subject ID from filename (e.g., "sub-01" from "sub-01_T1w.nii.gz")
     b) Determine modality from file category:
        - [anatomical-*] → modality = 'anat'
        - [functional-*] → modality = 'func'
        - [diffusion] → modality = 'dwi'
     c) Construct source path including any parent folders
     d) Create destination path: bids_dir/sub-XX/modality/new_filename
     e) Copy the file
     f) Create JSON sidecar (for imaging files)
  
  5. Handle run numbers correctly:
     - Functional scans often have run-01, run-02, run-03
     - Extract run number ONLY from files that have "_run-" in filename
     - Anatomical scans typically don't have run numbers
  
  6. Error handling:
     - Wrap file operations in try-except
     - Print progress messages
     - Print errors but continue processing
  
  OUTPUT REQUIREMENTS:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Generate a complete, runnable Python script that:
  - Imports: os, shutil, json, pathlib
  - Defines base_dir and bids_dir
  - Creates BIDS directory structure (based on participants.tsv)
  - Writes the three metadata files (exact content from above)
  - Loops through data files and processes each one
  - Includes clear comments explaining each step
  - Has error handling and progress messages
  
  OUTPUT ONLY THE PYTHON SCRIPT (no markdown code fences, no explanations before or after).`;
};

/**
 * Prompt for BIDSPlan.yaml generation
 * Based on autobidsify's PROMPT_BIDS_PLAN
 */
export const getBIDSPlanPrompt = (
  fileSummary: string,
  filePatterns: string,
  userContext: string,
  subjectInfo: {
    subjects: { originalId: string; bidsId: string }[];
    strategy: string;
  },
  countsByExt: Record<string, number>,
  sampleFiles: string,
  evidenceBundle: any
): string => {
  const subjectAnalysis = evidenceBundle.subject_analysis;
  const assignmentRules = subjectInfo.subjects
    .slice(0, 50) // cap at 50
    .map(
      (s) =>
        `- match:\n  - '*${s.originalId}*'\n  original: ${s.originalId}\n  subject: '${s.bidsId}'`
    )
    .join("\n");

  const subjectLabels = subjectInfo.subjects
    .slice(0, 50)
    .map((s) => `  - '${s.bidsId}'`)
    .join("\n");

  const participantMetadata = subjectInfo.subjects
    .slice(0, 50)
    .map((s) => `  '${s.bidsId}':\n    original_id: ${s.originalId}`)
    .join("\n");

  const countsText = Object.entries(countsByExt)
    .map(([ext, count]) => `  ${ext}: ${count} files`)
    .join("\n");

  const pythonSubjectAnalysisText = subjectAnalysis
    ? `\nPYTHON SUBJECT ANALYSIS (for context only — do NOT re-detect subjects):\n${JSON.stringify(
        {
          method: subjectAnalysis.method,
          subject_count: subjectAnalysis.subject_count,
          subject_examples: (subjectAnalysis.subject_records || [])
            .slice(0, 5)
            .map((r: any) => ({
              original: r.original_id,
              file_count: r.file_count,
            })),
        },
        null,
        2
      )}\n`
    : "";

  return `You are a BIDS dataset architect. Generate a BIDSPlan.yaml file.

${fileSummary}

${filePatterns}

${userContext}

${pythonSubjectAnalysisText}

CONVERSION RULES (CRITICAL):
- .dcm  → format_ready: false, convert_to: nifti,  modality: mri
- .nii/.nii.gz → format_ready: true,  convert_to: none,  modality: mri
- .jnii/.bnii  → format_ready: false, convert_to: nifti,  modality: mri
- .mat  → format_ready: false, convert_to: snirf, modality: nirs
- .nirs → format_ready: false, convert_to: snirf, modality: nirs
- .snirf → format_ready: true, convert_to: none,  modality: nirs

YOUR ONLY JOB: Generate the mappings section based on the file types present.
Copy assignment_rules, participant_metadata, and subjects sections EXACTLY as shown in the OUTPUT below.

OUTPUT (Raw YAML only, no markdown, no explanation):

assignment_rules:
${assignmentRules}

FILE EXTENSION COUNTS (use these to determine which mappings to generate):
${countsText}

SAMPLE FILENAMES (use these to determine correct bids_template and match_pattern):
${sampleFiles}

MAPPINGS FORMAT (ONE entry per file extension, use glob patterns NOT individual filenames):

Example 1 - DICOM:
  mappings:
  - modality: mri
    match: ['*.dcm', '**/*.dcm']
    format_ready: false
    convert_to: nifti
    filename_rules:
      - match_pattern: '.*'
        bids_template: 'sub-X_T1w.nii.gz'

Example 2 - fNIRS .mat:
  mappings:
  - modality: nirs
    match: ['*.mat', '**/*.mat']
    format_ready: false
    convert_to: snirf
    filename_rules:
      - match_pattern: '.*'
        bids_template: 'sub-X_task-rest_nirs.snirf'

Example 3 - Mixed:
  mappings:
  - modality: mri
    match: ['*.nii.gz']
    format_ready: true
    convert_to: none
    filename_rules:
      - match_pattern: '.*T1.*'
        bids_template: 'sub-X_T1w.nii.gz'
  - modality: nirs
    match: ['*.mat']
    format_ready: false
    convert_to: snirf
    filename_rules:
      - match_pattern: '.*'
        bids_template: 'sub-X_task-rest_nirs.snirf'

participant_metadata:
${participantMetadata}

subjects:
  count: ${subjectInfo.subjects.length}
  id_strategy: ${subjectInfo.strategy}
  labels:
${subjectLabels}
  source: python_extracted`;
};

/**
 * Prompt for BIDSPlan.yaml generation
 * Mirrors autobidsify's PROMPT_BIDS_PLAN + build_bids_plan()'s optimized_bundle
 */
// export const getBIDSPlanPrompt = (evidenceBundle: any): string => {
//   // ── Pull subject analysis from evidence bundle (generated by extractSubjectAnalysis)
//   const subjectAnalysis = evidenceBundle.subject_analysis;
//   const idMapping: Record<string, string> =
//     subjectAnalysis?.id_mapping?.id_mapping || {};
//   const subjectRecords: any[] = subjectAnalysis?.subject_records || [];

//   // ── Build assignment_rules (mirrors planner.py's _apply_python_rules_to_plan)
//   const assignmentRules = subjectRecords
//     .slice(0, 50)
//     .map(
//       (r) =>
//         `- match:\n  - '*${r.original_id}*'\n  original: ${
//           r.original_id
//         }\n  subject: '${idMapping[r.original_id] ?? r.numeric_id}'`
//     )
//     .join("\n");

//   // ── Build subjects section
//   const subjectLabels = subjectRecords
//     .slice(0, 50)
//     .map((r) => `  - '${idMapping[r.original_id] ?? r.numeric_id}'`)
//     .join("\n");

//   // ── Build participant_metadata section
//   const participantMetadata = subjectRecords
//     .slice(0, 50)
//     .map(
//       (r) =>
//         `  '${idMapping[r.original_id] ?? r.numeric_id}':\n    original_id: ${
//           r.original_id
//         }`
//     )
//     .join("\n");

//   // ── Build file extension counts
//   const countsText = Object.entries(
//     evidenceBundle.counts_by_ext as Record<string, number>
//   )
//     .map(([ext, count]) => `  ${ext}: ${count} files`)
//     .join("\n");

//   // ── Build sample files (mirrors optimized_bundle.sample_files)
//   const sampleFiles =
//     (evidenceBundle.sample as Array<{ relpath: string }>)
//       ?.map((s) => `  - ${s.relpath}`)
//       .join("\n") ?? "";

//   // ── Build python_subject_analysis block (mirrors planner.py's optimized_bundle)
//   const subjectExamples = subjectRecords.slice(0, 10).map((r) => ({
//     original: r.original_id,
//     bids_id: idMapping[r.original_id] ?? r.numeric_id,
//   }));

//   const pythonSubjectAnalysis = JSON.stringify(
//     {
//       success: subjectAnalysis?.success ?? false,
//       method: subjectAnalysis?.method ?? "none",
//       subject_count: subjectAnalysis?.subject_count ?? 0,
//       subject_examples: subjectExamples,
//       id_mapping: subjectAnalysis?.id_mapping ?? {},
//     },
//     null,
//     2
//   );

//   return `You are a BIDS dataset architect with complete decision-making authority.

// ═══════════════════════════════════════════════════════════════════════
// SUPPORTED FORMATS AND CONVERSION RULES (v10 - CRITICAL)
// ═══════════════════════════════════════════════════════════════════════

// MRI FORMATS (modality: mri):
//   Input formats:
//     • DICOM (.dcm)           → Convert to NIfTI using dcm2niix
//     • NIfTI (.nii, .nii.gz)  → Already BIDS-ready, copy directly
//     • JNIfTI (.jnii, .bnii)  → Convert to NIfTI using jnifti_converter
//   BIDS output: .nii.gz files only

// fNIRS FORMATS (modality: nirs):
//   Input formats:
//     • SNIRF (.snirf)         → Already BIDS-ready, copy directly
//     • Homer3 (.nirs)         → Convert to SNIRF
//     • MATLAB (.mat)          → Convert to SNIRF
//   BIDS output: .snirf files only

// FORMAT_READY AND CONVERT_TO RULES:
//   format_ready: true  → .nii/.nii.gz (MRI) or .snirf (fNIRS) — just copy
//   format_ready: false → .dcm (convert_to: nifti), .jnii/.bnii (convert_to: nifti),
//                         .mat (convert_to: snirf), .nirs (convert_to: snirf)

// CRITICAL: assignment_rules subject values must be BARE IDs (no 'sub-' prefix).
//   ✓ subject: '1'       ← correct
//   ✗ subject: 'sub-1'   ← wrong, executor adds sub- automatically

// YOUR ONLY JOB: Generate the mappings section based on the file types present.
// Copy assignment_rules, participant_metadata, and subjects sections EXACTLY as shown below.

// ═══════════════════════════════════════════════════════════════════════
// PYTHON SUBJECT ANALYSIS (use this — do NOT re-detect subjects yourself)
// ═══════════════════════════════════════════════════════════════════════
// ${pythonSubjectAnalysis}

// FILE EXTENSION COUNTS:
// ${countsText}

// SAMPLE FILE PATHS (use these for match patterns and bids_template):
// ${sampleFiles}

// ═══════════════════════════════════════════════════════════════════════
// OUTPUT (Raw YAML only, no markdown, no explanation)
// ═══════════════════════════════════════════════════════════════════════

// assignment_rules:
// ${assignmentRules}

// mappings:
//   - modality: mri             # example — generate based on file types present
//     match: ['*.dcm', '**/*.dcm']
//     format_ready: false
//     convert_to: nifti
//     filename_rules:
//       - match_pattern: '.*'
//         bids_template: 'sub-X_T1w.nii.gz'

// participant_metadata:
// ${participantMetadata}

// subjects:
//   count: ${subjectAnalysis?.subject_count ?? 0}
//   id_strategy: ${subjectAnalysis?.id_mapping?.strategy_used ?? "numeric"}
//   labels:
// ${subjectLabels}
//   source: python_extracted`;
// };
