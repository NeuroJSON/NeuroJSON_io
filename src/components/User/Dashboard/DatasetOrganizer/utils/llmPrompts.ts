// src/components/DatasetOrganizer/utils/llmPrompts.ts
//
// NeuroJSON.io-only prompts — functions that have no Python equivalent.
//
// All PROMPT_* constants and LLM wrapper functions now live in llm.ts,
// mirroring autobidsify's llm.py where prompts and callers are co-located.
//
// This file only contains:
//   getConversionScriptPrompt() — generates a standalone Python conversion
//   script from the user's file structure. Autobidsify IS the conversion
//   script, so this feature has no Python equivalent.

// ============================================================================
// getConversionScriptPrompt()
// NeuroJSON.io-only — no Python equivalent in autobidsify.
// Called by LLMPanel.tsx → handleGenerate() ("Generate Script" button)
// ============================================================================

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
- [anatomical-T1w]    → sub-XX/anat/sub-XX_T1w.nii.gz
- [anatomical-T2w]    → sub-XX/anat/sub-XX_T2w.nii.gz
- [functional-bold]   → sub-XX/func/sub-XX_task-<n>_run-XX_bold.nii.gz
- [functional-nirs]   → sub-XX/nirs/sub-XX_task-<n>_nirs.snirf
- [anatomical-dicom]  → convert with dcm2niix → sub-XX/anat/
- [anatomical-jnifti] → convert with jnifti_converter → sub-XX/anat/
- [diffusion]         → sub-XX/dwi/
- [fieldmap]          → sub-XX/fmap/

FORMAT CONVERSION RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- <format: DICOM → convert_to: nifti>
    → subprocess.run(['dcm2niix', '-o', dest_dir, '-f', bids_filename, src_file])
- <format: MATLAB → convert_to: snirf>
    → Use MNE-Python or note manual conversion needed → sub-XX/nirs/
- <format: Homer3 → convert_to: snirf>
    → Same as MATLAB → sub-XX/nirs/
- <format: NIfTI → format_ready: true>   → direct copy
- <format: SNIRF → format_ready: true>   → direct copy

⚠️ NEVER put task-based files in anat/ folder!
⚠️ NEVER put T1w/T2w files in func/ folder!

CRITICAL INSTRUCTIONS:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. BIDS metadata files (dataset_description.json, README.md, participants.tsv)
   have ALREADY been generated. Script MUST use their EXACT content.

2. All paths are RELATIVE to: ${baseDirectoryPath}
   Access with: os.path.join('${baseDirectoryPath}', relative_path)

3. For EACH data file:
   a) Extract subject ID from filename
   b) Determine modality from file category
   c) Create destination: bids_dir/sub-XX/modality/new_filename
   d) Copy the file
   e) Create JSON sidecar for imaging files

4. Error handling: wrap in try-except, print progress, continue on errors

OUTPUT ONLY THE PYTHON SCRIPT (no markdown code fences, no explanations).`;
};
