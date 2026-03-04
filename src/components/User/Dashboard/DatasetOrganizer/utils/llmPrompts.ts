// src/components/DatasetOrganizer/utils/llmPrompts.ts

/**
 * Prompt for dataset_description.json generation
 * Based on auto-bidsify's PROMPT_TRIO_DATASET_DESC
 */
export const getDatasetDescriptionPrompt = (userText: string): string => {
  return `You are a BIDS dataset_description.json generator.
  
  CRITICAL: Use the following user-provided content to extract dataset information!
  
  USER-PROVIDED CONTENT:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${userText}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
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
  return `Generate a BIDS participants.tsv file.
  
  CRITICAL: Extract participant metadata from the following user-provided content!
  
  USER-PROVIDED CONTENT:
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ${userText}
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  
  Extract participant information:
  - Subject IDs (look for "sub-01", "2 subjects", "participants: sub-01 and sub-02", etc.)
  - Demographics if available:
    - "1 male, 1 female" → sex column: M, F
    - "ages 25-65" → age column
    - "patients and controls" → group column
    - "right-handed" → handedness column
  
  Rules:
  - First column MUST be "participant_id"
  - Use tab (\\t) as delimiter
  - Include only columns with actual data (no empty columns)
  - If only subject IDs known, output: participant_id\\nsub-01\\nsub-02
  
  Examples:
  - If text says "2 subjects: sub-01 and sub-02" with no demographics:
    participant_id
    sub-01
    sub-02
  
  - If text says "sub-01 (25y, male), sub-02 (30y, female)":
    participant_id\\tage\\tsex
    sub-01\\t25\\tM
    sub-02\\t30\\tF
  
  OUTPUT: Direct TSV text only (no JSON, no code fences, no markdown)`;
};

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
  - [diffusion] → Goes to sub-XX/dwi/ folder
  - [fieldmap] → Goes to sub-XX/fmap/ folder
  
  FILENAME-BASED DETECTION (if category unclear):
  - Contains "task-" AND "bold" → ALWAYS functional (func/ folder)
  - Contains "T1w" → ALWAYS anatomical (anat/ folder)
  - Contains "T2w" OR "inplaneT2" → ALWAYS anatomical (anat/ folder)
  - Ends with ".snirf" → ALWAYS functional (func/ folder)
  
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
