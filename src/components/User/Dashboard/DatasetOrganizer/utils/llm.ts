// src/components/DatasetOrganizer/utils/llm.ts
//
// Mirrors autobidsify/llm.py
// Unified LLM caller supporting OpenAI, Qwen (Ollama), Anthropic, Groq, OpenRouter.
//
// Python equivalents:
//   LLMHardFail                  → LLMHardFail class
//   isQwenModel()                → is_qwen_model()
//   isOpenAIModel()              → is_openai_model()
//   isReasoningModel()           → is_reasoning_model()
//   inferQwenTemperature()       → _infer_qwen_temperature()
//   callLLM()                    → _call_llm()
//   PROMPT_TRIO_DATASET_DESC     → PROMPT_TRIO_DATASET_DESC
//   PROMPT_TRIO_README           → PROMPT_TRIO_README
//   PROMPT_TRIO_PARTICIPANTS     → PROMPT_TRIO_PARTICIPANTS
//   PROMPT_BIDS_PLAN             → PROMPT_BIDS_PLAN
//   PROMPT_MAT_SNIRF_MAPPING     → PROMPT_MAT_SNIRF_MAPPING
//   llmTrioDatasetDescription()  → llm_trio_dataset_description()
//   llmTrioReadme()              → llm_trio_readme()
//   llmTrioParticipants()        → llm_trio_participants()
//   llmBidsPlan()                → llm_bids_plan()
//   llmMapMatToSnirf()           → llm_map_mat_to_snirf()
//
// DIFFERENCES FROM llm.py — see bottom of file for explanation
import { OllamaService } from "services/ollama.service";

// ============================================================================
// LLMHardFail
// Mirrors LLMHardFail exception class in llm.py
// ============================================================================

export class LLMHardFail extends Error {
  step: string;
  error_type: string;
  message: string;

  constructor(step: string, errorType: string, message: string) {
    super(`[${step}] ${errorType}: ${message}`);
    this.step = step;
    this.error_type = errorType;
    this.message = message;
  }
}

// ============================================================================
// Provider detection
// Mirrors is_qwen_model(), is_openai_model(), is_reasoning_model()
// ============================================================================

export const isQwenModel = (model: string): boolean =>
  model.toLowerCase().startsWith("qwen");

export const isOpenAIModel = (model: string): boolean =>
  model.toLowerCase().startsWith("gpt") ||
  model.toLowerCase().startsWith("o1") ||
  model.toLowerCase().startsWith("o3");

export const isReasoningModel = (model: string): boolean => {
  const m = model.toLowerCase();
  return m.startsWith("o1") || m.startsWith("o3") || m.startsWith("gpt-5");
};

// TS addition: Anthropic is a separate provider not in Python
// Python has OpenAI + Qwen only. TS adds Anthropic, Groq, OpenRouter.
export const isAnthropicModel = (model: string): boolean =>
  model.toLowerCase().startsWith("claude");

// ============================================================================
// Temperature inference for Qwen
// Mirrors _infer_qwen_temperature() in llm.py
// ============================================================================

export const inferQwenTemperature = (
  model: string,
  baseTemperature: number | null
): number | null => {
  if (baseTemperature === null) return null;

  const m = model.toLowerCase();

  if (["think", "careful", "compare", "reason"].some((kw) => m.includes(kw)))
    return Math.min(baseTemperature, 0.15);

  if (["next", "fast", "turbo", "lite"].some((kw) => m.includes(kw)))
    return Math.max(baseTemperature, 0.4);

  return Math.max(baseTemperature, 0.3);
};

// ============================================================================
// LLM config type
// TS-only: Python uses env vars + CLI args; TS gets config from UI state
// ============================================================================

export interface LLMConfig {
  provider: string;
  model: string;
  apiKey: string;
  baseUrl: string;
  isAnthropic?: boolean;
  noApiKey?: boolean;
}

// ============================================================================
// callLLM()
// Mirrors _call_llm() unified entry point in llm.py
//
// Python routing:
//   qwen*        → _call_qwen()    (Ollama / REST API / DashScope)
//   gpt* o1* o3* → _call_openai() (OpenAI API)
//
// TS routing adds Anthropic, Groq, OpenRouter (not in Python)
// because NeuroJSON.io supports more providers than the CLI does.
// ============================================================================

export const callLLM = async (
  systemPrompt: string,
  userPayload: string,
  step: string,
  llmConfig: LLMConfig,
  temperature: number | null = null,
  signal?: AbortSignal
): Promise<string> => {
  const { provider, model, apiKey, baseUrl, isAnthropic, noApiKey } = llmConfig;

  // ── Backend Ollama proxy (save mode only) ─────────────────────────
  // Routes to OllamaService → jin.neu.edu:11434.
  // "local-ai" falls through to the OpenAI-compatible block below.
  if (provider === "ollama") {
    const temp = inferQwenTemperature(model, temperature);
    try {
      const res = await OllamaService.chat(
        model,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPayload },
        ],
        temp ?? undefined
      );
      const content = res?.choices?.[0]?.message?.content ?? "";
      if (content.trim()) return content.trim();
      throw new LLMHardFail(
        step,
        "EmptyResponse",
        "Ollama returned empty content"
      );
    } catch (e) {
      if (e instanceof LLMHardFail) throw e;
      const msg = String(e).toLowerCase();
      if (msg.includes("connection") || msg.includes("refused"))
        throw new LLMHardFail(
          step,
          "OllamaNotRunning",
          "Cannot connect to Ollama proxy"
        );
      throw new LLMHardFail(step, "QwenError", String(e));
    }
  }

  // ── Anthropic Claude ──────────────────────────────────────────────
  // TS addition — not in Python llm.py
  if (isAnthropic || isAnthropicModel(model)) {
    try {
      const res = await fetch(baseUrl, {
        method: "POST",
        signal,
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: isReasoningModel(model) ? 32000 : 16000,
          messages: [
            { role: "user", content: `${systemPrompt}\n\n${userPayload}` },
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new LLMHardFail(
          step,
          "AnthropicError",
          data?.error?.message ?? res.statusText
        );
      const content = data?.content?.[0]?.text ?? "";
      if (content.trim()) return content.trim();
      throw new LLMHardFail(
        step,
        "EmptyResponse",
        "Anthropic returned empty content"
      );
    } catch (e) {
      if (e instanceof LLMHardFail) throw e;
      throw new LLMHardFail(step, "AnthropicError", String(e));
    }
  }

  // ── OpenAI-compatible (OpenAI, Groq, OpenRouter) ──────────────────
  // Mirrors _call_openai() in llm.py.
  // Groq and OpenRouter use the same OpenAI-compatible API format.
  try {
    const params: Record<string, any> = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPayload },
      ],
    };

    if (isReasoningModel(model)) {
      // Mirrors: params["max_completion_tokens"] = 32000 (no temperature)
      params.max_completion_tokens = 32000;
    } else {
      // Mirrors: params["max_completion_tokens"] = 16000 + temperature
      params.max_completion_tokens = 16000;
      if (temperature !== null) params.temperature = temperature;
    }

    const res = await fetch(baseUrl, {
      method: "POST",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(noApiKey ? {} : { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!res.ok)
      throw new LLMHardFail(
        step,
        "OpenAIError",
        data?.error?.message ?? res.statusText
      );
    const content = data?.choices?.[0]?.message?.content ?? "";
    if (content.trim()) return content.trim();
    throw new LLMHardFail(
      step,
      "EmptyResponse",
      "OpenAI returned empty content"
    );
  } catch (e) {
    if (e instanceof LLMHardFail) throw e;
    throw new LLMHardFail(step, "UnexpectedError", String(e));
  }
};

// ============================================================================
// Prompts
// Mirrors all PROMPT_* constants in llm.py
// These are the EXACT strings from llm.py — no changes.
// ============================================================================

export const PROMPT_TRIO_DATASET_DESC = `You are a BIDS dataset_description.json metadata extractor.

═══════════════════════════════════════════════════════
YOUR JOB
═══════════════════════════════════════════════════════

Extract dataset metadata from the input. Return ONLY valid JSON, no markdown.

═══════════════════════════════════════════════════════
CRITICAL RULES
═══════════════════════════════════════════════════════

1. LICENSE — output as "raw_license" (plain string, NOT normalized):
   - Copy exactly what the user wrote, e.g. "CC0", "CC BY 4.0",
     "Creative Commons Zero", "public domain", "MIT license"
   - Do NOT try to normalize or format it — Python will do that
   - If the user wrote "License: CC0" → raw_license: "CC0"
   - If the document says "released under Creative Commons" → raw_license: "Creative Commons"
   - If no license mentioned anywhere → omit raw_license

2. AUTHORS — extract from ALL available sources:
   - Search in order: user_hints.user_text → documents[]
   - Look for: explicit author lists, citation patterns, "Created by",
     "Principal Investigator", "Contact", "Contributors" sections
   - If full names are available, use them: ["Last FM", "Last FM"]
   - If only "et al." citation exists, keep first author + et al.: ["Shafto MA et al."]
   - Do NOT infer, guess, or use outside knowledge to expand author lists
   - Do NOT fabricate names not present in any input source
   - If no author information found anywhere, omit Authors field entirely

   EXAMPLES (follow exactly):

   Input: "Smith et al. (2023). A neuroimaging study..."
   Output: "Authors": ["Smith et al."]

   Input: "Created by John Doe, Jane Smith and Bob Lee"
   Output: "Authors": ["John Doe", "Jane Smith", "Bob Lee"]

   Input: "Data collected by the CamCAN team. Contact: info@cam.ac.uk"
   Output: (omit Authors field)

   Input: "Shafto et al. (2014). The Cambridge Centre for Ageing..."
   Output: "Authors": ["Shafto et al."]

3. NAME — infer from context:
   - Look for explicit dataset name in user_hints.user_text
   - If not found, infer from the scientific context
   - Keep it short and descriptive

4. MISSING FIELDS — omit rather than guess:
   - If you cannot determine a field with reasonable confidence, omit it
   - Never invent information not present in the input

═══════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════

{
  "dataset_description": {
    "Name": "...",
    "BIDSVersion": "1.10.0",
    "DatasetType": "raw",
    "Authors": ["First Last", "First Last"]
  },
  "raw_license": "CC0",
  "extraction_log": {
    "Name": "inferred from user_text: '...'",
    "raw_license": "found in user_text: 'License: CC0'",
    "Authors": "extracted from citation in user_text"
  },
  "questions": []
}

Notes:
- raw_license goes at the TOP LEVEL (not inside dataset_description)
- dataset_description should NOT contain a "License" field — Python adds it after normalization
- BIDSVersion must always be "1.10.0"
- DatasetType must always be "raw"
- Output ONLY valid JSON, no extra text, no markdown fences

FIELD SOURCE RULES (STRICT - violations cause data integrity failure):
┌─────────────────┬────────────────────────────────────────────────────┐
│ Field           │ Allowed sources                                    │
├─────────────────┼────────────────────────────────────────────────────┤
│ Authors         │ user_hints.user_text or documents[] ONLY           │
│                 │ NEVER use training knowledge to expand et al.      │
│ raw_license     │ user_hints.user_text or documents[] ONLY           │
│ Name            │ may infer from context if not explicit             │
│ BIDSVersion     │ always "1.10.0" (fixed)                            │
│ DatasetType     │ always "raw" (fixed)                               │
└─────────────────┴────────────────────────────────────────────────────┘`;

export const PROMPT_TRIO_README = `Generate README.md for BIDS dataset.

CRITICAL: Use user_hints.user_text as primary source for README content.

Create comprehensive README with sections:
- Overview
- Dataset Description
- Data Acquisition
- File Organization
- Usage Notes
- References

Output: Direct Markdown text (no JSON wrapper)`;

export const PROMPT_BIDS_PLAN = `You are a BIDS dataset architect with complete decision-making authority.

═══════════════════════════════════════════════════════════════════════
SUPPORTED FORMATS AND CONVERSION RULES
═══════════════════════════════════════════════════════════════════════

MRI FORMATS (modality: mri):
  • DICOM (.dcm)           → convert_to: nifti   (dcm2niix)
  • NIfTI (.nii, .nii.gz)  → format_ready: true  (copy directly)
  • JNIfTI (.jnii, .bnii)  → convert_to: nifti

fNIRS FORMATS (modality: nirs):
  • SNIRF (.snirf)         → format_ready: true  (copy directly)
  • Homer3 (.nirs)         → convert_to: snirf
  • MATLAB (.mat)          → convert_to: snirf

EEG FORMATS (modality: eeg):
  • EDF/EDF+ (.edf)        → format_ready: true  (copy directly)
  • BrainVision (.vhdr)    → format_ready: true  (copy directly)
  • EEGLAB (.set)          → format_ready: true  (copy directly)
  • Biosemi (.bdf)         → format_ready: true  (copy directly)
  CRITICAL: EEG files are NEVER converted. Always format_ready: true, convert_to: none.
  CRITICAL: EEG bids_template MUST end with '_eeg.<original_ext>' (e.g. '_eeg.edf').
            NEVER use NIfTI suffixes (T1w, T2w, bold) for EEG data.

═══════════════════════════════════════════════════════════════════════
SUBJECT IDENTIFICATION — MOST IMPORTANT STEP
═══════════════════════════════════════════════════════════════════════

Your first job is to correctly identify all subjects from the file list.
The dataset may use ANY of the following structures:

STRUCTURE 1 — Already BIDS (sub-XX directories)
  sub-01/nirs/sub-01_task-rest_nirs.snirf
  sub-02/nirs/sub-02_task-rest_nirs.snirf
  → Use 'already_bids' strategy. Strip 'sub-' prefix.

STRUCTURE 2 — Site-prefixed directories
  Beijing_sub82352/anat/scan.nii.gz
  Newark_sub41006/anat/scan.nii.gz
  → Use directory names as subject identifiers.

STRUCTURE 3 — Flat files with numeric suffix
  VHMCT1mm-Hip (134).dcm  (prefix VHM = subject 1)
  VHFCT1mm-Hip (45).dcm   (prefix VHF = subject 2)
  → Use filename prefix as subject identifier.

STRUCTURE 4 — Group/subject nested directories
  PD/PD_01.snirf
  PD/PD_02.snirf
  control/control_01.snirf
  control/control_20.snirf
  → Each unique filename base (PD_01, PD_02 ... control_01 ... control_20)
    is ONE subject. The parent directory (PD / control) is the GROUP,
    not the subject. Add 'group' column to participant_metadata.
  → Assign numeric IDs: PD_01→1, PD_02→2 ... control_01→21 ... control_20→40

STRUCTURE 5 — Task/group/subject nested directories
  walking/PD/PD_01.snirf
  walking/control/control_01.snirf
  → Same as Structure 4. Ignore the task-level directory when identifying subjects.
    The task name goes into the BIDS filename (task-walking), not the subject ID.

STRUCTURE 6 — Pure numeric directories
  001/scan.dcm
  002/scan.dcm
  → Use directory number as subject ID.

CRITICAL RULES FOR SUBJECT COUNTING:
1. python_subject_analysis.subject_count is a HINT, not authoritative.
2. user_hints.n_subjects is the AUTHORITATIVE count.
   If provided, your assignment_rules MUST produce exactly that many subjects.
3. Count the actual unique files/directories to determine the true number.
4. For group/subject nested structures: count UNIQUE FILES, not directories.
   (PD/ and control/ are 2 directories but may contain 40 subjects total)

═══════════════════════════════════════════════════════════════════════
GROUP METADATA
═══════════════════════════════════════════════════════════════════════

When the dataset has clinically meaningful groups (PD vs control,
patient vs healthy, treated vs untreated):
- Add a 'group' column to participant_metadata for EVERY subject.
- Use the exact group label from the directory or filename.

Example for PD dataset with 40 subjects:
  participant_metadata:
    '1':  {original_id: 'PD_01',      group: 'PD'}
    '2':  {original_id: 'PD_02',      group: 'PD'}
    ...
    '21': {original_id: 'control_01', group: 'control'}
    ...
    '40': {original_id: 'control_20', group: 'control'}

═══════════════════════════════════════════════════════════════════════
ASSIGNMENT RULES
═══════════════════════════════════════════════════════════════════════

Each rule maps source files to one BIDS subject ID.

CRITICAL: 'subject' field must be BARE ID — no 'sub-' prefix.
  ✓ subject: '1'      → executor creates sub-1
  ✗ subject: 'sub-1'  → executor creates sub-sub-1

For group/subject nested structures, use the filename as the match token:
  assignment_rules:
    - subject: '1'
      original: 'PD_01'
      match: ['*PD_01*']
    - subject: '21'
      original: 'control_01'
      match: ['*control_01*']

For prefix-based flat structures:
  assignment_rules:
    - subject: '1'
      original: 'VHM'
      match: ['*VHM*']
    - subject: '2'
      original: 'VHF'
      match: ['*VHF*']

═══════════════════════════════════════════════════════════════════════
FORMAT_READY AND CONVERT_TO RULES
═══════════════════════════════════════════════════════════════════════

format_ready: true  → .nii/.nii.gz (MRI) or .snirf (fNIRS) — copy directly
format_ready: false → needs conversion:
  .dcm / .jnii / .bnii → convert_to: nifti
  .mat / .nirs         → convert_to: snirf
convert_to: "none"   → only when format_ready: true

═══════════════════════════════════════════════════════════════════════
FILENAME RULES — TASK INFERENCE
═══════════════════════════════════════════════════════════════════════

For fNIRS: infer task name from directory structure or user description.
  walking/ directory → task-walking
  fingertapping/ or tapping/ → task-fingertapping
  resting/ or rest/ → task-rest

For MRI: use acq- to distinguish different scan series from same subject.
  VHFCT1mm-Ankle.dcm → acq-ankle_T1w
  VHFCT1mm-Head.dcm  → acq-head_T1w

For EEG: infer task and run from filename suffixes or directory names.
  RULE 1 — If each subject has multiple EEG files, each file is a separate scan.
    Identify what differs between files of the same subject (suffix, keyword, directory).
    Map each variant to a distinct task- or run- label from user description.
    If task labels cannot be inferred, use run-1, run-2, run-N.
  RULE 2 — Create one mapping entry per unique file variant across subjects.
  RULE 3 — BIDS directory for EEG is always 'eeg/', never 'anat/' or 'nirs/'.
  RULE 4 — BIDS filename suffix is always '_eeg' + original extension.

EEG FILENAME EXAMPLES (CRITICAL — follow exactly):
  ✓ sub-01_task-rest_eeg.edf
  ✓ sub-01_task-arithmetic_eeg.edf
  ✓ sub-01_run-1_eeg.edf
  ✗ sub-01_T1w.nii.gz          ← NEVER for EEG
  ✗ sub-01_unknown.nii.gz      ← NEVER for EEG
  ✗ sub-01_bold.nii.gz         ← NEVER for EEG

═══════════════════════════════════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════════════════════════════════

subjects:
  labels: [list of bare BIDS IDs, e.g. ['1','2',...,'40']]
  count: N
  source: llm_analysis
  id_strategy: numeric / semantic / already_bids

assignment_rules:
  - subject: 'bare_id'
    original: 'exact_identifier_from_filename_or_dirname'
    match: ['*identifier*']

participant_metadata:
  'bare_id':
    original_id: 'xxx'
    group: 'PD'          # if applicable
    sex: 'M'             # if available
    age: '65'            # if available

mappings:
  - modality: nirs
    match: ['**/*.snirf']
    exclude: []
    format_ready: true
    convert_to: none
    filename_rules:
      - match_pattern: '.*'
        bids_template: 'sub-X_task-walking_nirs.snirf'

  # EEG example — when each subject has ONE edf file:
  - modality: eeg
    match: ['**/*.edf']
    exclude: []
    format_ready: true
    convert_to: none
    filename_rules:
      - match_pattern: '.*'
        bids_template: 'sub-X_task-rest_eeg.edf'

  # EEG example — when each subject has MULTIPLE edf files (different tasks/runs):
  # Create one mapping entry per task/run, use match_pattern to distinguish them.
  # The match_pattern must be derived from what actually differs in the filenames.

OUTPUT: Raw YAML only (no markdown, no explanation)`;

export const PROMPT_MAT_SNIRF_MAPPING = `You are an fNIRS data format expert.

You will receive a JSON summary of one or more MATLAB .mat files from the
same structural group. The summary contains a "flat_vars" dict where all
scipy struct wrappers have already been unwrapped — what you see reflects
the actual data shape and content.

flat_vars key conventions:
- Top-level variable:     "d", "t", "fs"
- Struct field:           "dat.signal", "SD.Lambda", "dat.fs"
- "likely_data": true     marks tall 2D float arrays (n_samples > n_channels)
- "value"                 means scalar
- "values"                means small array with known content
- "string_array" dtype    means channel labels or string metadata

Use flat_vars keys EXACTLY as they appear. Do not invent new paths.

═══════════════════════════════════════════════════════════
SNIRF REQUIRED FIELDS
═══════════════════════════════════════════════════════════

dataTimeSeries  — 2D float (n_samples × n_channels)
time            — 1D float (n_samples,), unit: seconds
wavelengths     — 1D array of wavelength values in nm
measurementList — per-channel source/detector/wavelength/dataType indices

═══════════════════════════════════════════════════════════
DATA ASSEMBLY TYPES
═══════════════════════════════════════════════════════════

Choose the correct type based on how the data is stored:

TYPE 1 — "single": data is in one variable (most common)
  Use when: one tall 2D array holds all channels
  Example: Homer3 "d", or "dat.signal"
  {
    "type": "single",
    "var": "d",
    "transpose": false
  }
  Set transpose: true if shape is (n_channels, n_samples) instead of (n_samples, n_channels)
  FORBIDDEN: Do NOT use array indexing syntax like "data.values[0]" or "data[0]".
  The Python executor does not support cell array indexing.
  Only dot-notation paths are supported: "data.X", "dat.signal", "SD.Lambda".

  CRITICAL — struct variables: if the top-level variable is a MATLAB struct
  (i.e. flat_vars shows sub-fields like "data.X", "data.fs", "data.trial"),
  you MUST use the full dot-notation path to the numeric field, NOT the
  struct variable name itself.

  Example: flat_vars shows:
    "data.X":     {"shape": [N, C], "likely_data": true}
    "data.fs":    {"value": 10.0}
    "data.trial": {"shape": [1, 75]}
  Correct:   "var": "data.X"     ← full dot-notation path
  WRONG:     "var": "data"       ← this is the struct, not the data array

  Similarly for time:
    "data.fs" is a scalar → use as fs_var in time_assembly
    Correct: {"type": "generate", "fs_var": "data.fs"}

TYPE 2 — "stack_columns": data split across ch1, ch2, ... chN variables
  Use when: flat_vars contains many variables named ch1, ch2, ch3 ... chN
  each being a 1D or column vector of the same length
  {
    "type": "stack_columns",
    "var_pattern": "ch",
    "var_range": [1, 40]
  }
  var_pattern: the common prefix (e.g. "ch", "channel", "nirs")
  var_range: [first_index, last_index] inclusive
  Use "vars" list instead of var_pattern+var_range if naming is non-numeric:
  {
    "type": "stack_columns",
    "vars": ["left_pfc", "right_pfc", "motor"]
  }

TYPE 3 — "hbo_hbr": HbO and HbR stored as separate matrices
  Use when: two 2D arrays named HbO/HbR or oxy/deoxy exist with same shape
  {
    "type": "hbo_hbr",
    "hbo_var": "HbO",
    "hbr_var": "HbR"
  }
  Result: columns are concatenated [HbO | HbR] → (n_samples, n_channels)

═══════════════════════════════════════════════════════════
TIME ASSEMBLY TYPES
═══════════════════════════════════════════════════════════

TYPE 1 — "var": time vector exists as a variable
  {
    "type": "var",
    "var": "t"
  }

TYPE 2 — "generate": no time variable, generate from sampling rate
  Prefer fs_var (read from file) over fs_value (hardcoded)
  {
    "type": "generate",
    "fs_var": "dat.fs",
    "fs_value": 13.33
  }
  If neither fs_var nor fs_value is known, set fs_value to null
  (executor will default to 10.0 Hz)

═══════════════════════════════════════════════════════════
WAVELENGTHS ASSEMBLY TYPES
═══════════════════════════════════════════════════════════

TYPE 1 — "var": wavelengths stored in a variable
  {
    "type": "var",
    "var": "SD.Lambda"
  }

TYPE 2 — "value": hardcode the values
  Use when no wavelength variable found, or data is already concentration (HbO/HbR)
  {
    "type": "value",
    "values": [760, 850]
  }

═══════════════════════════════════════════════════════════
OTHER FIELDS
═══════════════════════════════════════════════════════════

measlist_var:
  2D array shape (n_channels, 4), cols = [srcIdx, detIdx, aux, dataTypeCode]
  Common: "SD.MeasList"
  null if not found

n_sources_var:
  dot-notation path to a scalar variable whose value is the number of sources (optodes).
  Look in flat_vars for a key whose:
    - value is a small integer (typically 2–64)
    - name semantically suggests source count: contains "nSrc", "nSource", "source",
      "Src", "nS" or similar
  Use the EXACT key as it appears in flat_vars. Do NOT invent paths.
  null if no such variable found.

n_detectors_var:
  dot-notation path to a scalar variable whose value is the number of detectors (optodes).
  Look in flat_vars for a key whose:
    - value is a small integer (typically 2–64)
    - name semantically suggests detector count: contains "nDet", "nDetector",
      "detector", "Det", "nD" or similar
  Use the EXACT key as it appears in flat_vars. Do NOT invent paths.
  null if no such variable found.

data_type_code:
  1 = raw intensity (default)
  2 = dOD (optical density change)
  4 = HbO/HbR concentration
  Set to 4 if data_assembly type is "hbo_hbr" or var names suggest concentration

confidence: "high" | "medium" | "low"

═══════════════════════════════════════════════════════
DECISION GUIDE
═══════════════════════════════════════════════════════

Step 0 — Detect multi-block structure:
  Use "top_level_shapes" (NOT flat_vars) to detect multi-block structures.
  top_level_shapes shows the RAW shape of each variable BEFORE any unwrapping,
  which is the only reliable way to see that e.g. "data" is a (1,4) cell array.

  Detection rule — ALL three conditions must be true:
    1. top_level_shapes[key].is_object == true
    2. top_level_shapes[key].shape == [1, N] with N > 1
    3. flat_vars contains sub-fields of that key (e.g. "data.X", "data.fs")
       meaning each element of the cell array is a struct with data fields

  If all three conditions are met:
    → n_blocks = N  (the second dimension of the shape)
    → block_data_field = the sub-field name holding the signal matrix
      (look for the tall 2D array in flat_vars, e.g. "data.X" with likely_data=true)
    → data_assembly.var = full dot-notation path to signal field in ONE block
      (e.g. "data.X") — the executor iterates over blocks automatically

  If the top-level variable is a plain 2D float matrix: n_blocks=1.
  If uncertain: n_blocks=1  (safe default — no data is lost).

  EXAMPLES:
    top_level_shapes: {"data": {"shape": [1,4], "is_object": true, "is_struct": false}}
    flat_vars has: "data.X" (likely_data=true), "data.fs" (scalar), "data.trial"
    → n_blocks=4, block_data_field="X", data_assembly.var="data.X"

    top_level_shapes: {"d": {"shape": [3000, 52], "is_object": false}}
    → n_blocks=1, standard single-block processing

Step 1 — Identify data_assembly type:
  - Is there one tall 2D float array?        → "single"
  - Are there many ch1...chN variables?      → "stack_columns"
  - Are there HbO and HbR arrays?            → "hbo_hbr"

Step 2 — Identify time_assembly type:
  - Is there a 1D array matching n_samples?  → "var"
  - Is there a scalar fs/Fs/srate?           → "generate" with fs_var
  - Neither?                                 → "generate" with fs_value from notes or null

Step 3 — Identify wavelengths_assembly type:
  - Is there a small float array 600-1000?   → "var"
  - No wavelength info found?                → "value" with [760, 850]

Step 4 — Set data_type_code:
  - Raw NIR intensity data                   → 1
  - Optical density (log ratio)              → 2
  - Hemoglobin concentration (HbO/HbR)       → 4

═══════════════════════════════════════════════════════════
OUTPUT FORMAT — JSON only, no markdown, no explanation
═══════════════════════════════════════════════════════════

{
  "data_assembly": {
    "type": "single",
    "var": "d",
    "transpose": false
  },
  "time_assembly": {
    "type": "var",
    "var": "t"
  },
  "wavelengths_assembly": {
    "type": "var",
    "var": "SD.Lambda"
  },
  "wavelengths_default": [760, 850],
  "measlist_var": "SD.MeasList",
  "n_sources_var": null,
  "n_detectors_var": null,
  "n_blocks": 1,
  "block_data_field": null,
  "data_type_code": 1,
  "notes": "Homer3 format: standard d/t/SD structure detected",
  "confidence": "high"
}

Additional examples:

stack_columns case (ch1...ch40):
{
  "data_assembly": {
    "type": "stack_columns",
    "var_pattern": "ch",
    "var_range": [1, 40]
  },
  "time_assembly": {
    "type": "generate",
    "fs_var": "nfo.fs",
    "fs_value": 13.33
  },
  "wavelengths_assembly": {
    "type": "value",
    "values": [760, 850]
  },
  "wavelengths_default": [760, 850],
  "measlist_var": null,
  "n_sources_var": null,
  "n_detectors_var": null,
  "n_blocks": 1,
  "block_data_field": null,
  "data_type_code": 4,
  "notes": "Data split across 40 channel variables ch1-ch40, concentration format",
  "confidence": "medium"
}

hbo_hbr case:
{
  "data_assembly": {
    "type": "hbo_hbr",
    "hbo_var": "HbO",
    "hbr_var": "HbR"
  },
  "time_assembly": {
    "type": "var",
    "var": "time"
  },
  "wavelengths_assembly": {
    "type": "value",
    "values": [760, 850]
  },
  "wavelengths_default": [760, 850],
  "measlist_var": null,
  "n_sources_var": null,
  "n_detectors_var": null,
  "n_blocks": 1,
  "block_data_field": null,
  "data_type_code": 4,
  "notes": "HbO and HbR stored separately, will be concatenated column-wise",
  "confidence": "high"
}`;

// ============================================================================
// Public LLM call wrappers
// Mirrors llm_trio_dataset_description(), llm_bids_plan(), etc. in llm.py
// Each function mirrors its Python counterpart including temperature.
// ============================================================================

export const llmTrioDatasetDescription = (
  payload: string,
  llmConfig: LLMConfig,
  signal?: AbortSignal
): Promise<string> =>
  callLLM(
    PROMPT_TRIO_DATASET_DESC,
    payload,
    "Trio_DatasetDesc",
    llmConfig,
    0.1,
    signal
  );

export const llmTrioReadme = (
  payload: string,
  llmConfig: LLMConfig,
  signal?: AbortSignal
): Promise<string> =>
  callLLM(PROMPT_TRIO_README, payload, "Trio_README", llmConfig, 0.4, signal);

// generate_participants no longer calls the LLM at all — it just generates simple sequential IDs and defers to the plan stage for complex datasets.
// export const llmTrioParticipants = (
//   payload: string,
//   llmConfig: LLMConfig,
//   signal?: AbortSignal
// ): Promise<string> =>
//   callLLM(PROMPT_TRIO_PARTICIPANTS, payload, "Trio_Participants", llmConfig, 0.2, signal);

export const llmBidsPlan = (
  payload: string,
  llmConfig: LLMConfig,
  signal?: AbortSignal
): Promise<string> =>
  callLLM(PROMPT_BIDS_PLAN, payload, "BIDSPlan", llmConfig, 0.15, signal);

export const llmMapMatToSnirf = (
  payload: string,
  llmConfig: LLMConfig,
  signal?: AbortSignal
): Promise<string> =>
  callLLM(
    PROMPT_MAT_SNIRF_MAPPING,
    payload,
    "MAT_SNIRF_Mapping",
    llmConfig,
    0.05,
    signal
  );

// Python stubs themselves are essentially empty instructions,
// these stages aren't really functional in autobidsify either yet
// they're just scaffolding for future implementation.
export const PROMPT_NIRS_DRAFT = `fNIRS-to-SNIRF mapper (Draft).
  Output JSON (ONLY valid JSON):
  {
    "draft": {...},
    "confidence": 0.8,
    "questions": [...]
  }`;

export const PROMPT_NIRS_NORMALIZE = `fNIRS-to-SNIRF mapper (Normalize).
  Output JSON (ONLY valid JSON):
  {
    "normalized": {...},
    "questions": [...]
  }`;

export const PROMPT_MRI_VOXEL_DRAFT = `MRI voxelization planner (Draft).
  Output JSON (ONLY valid JSON):
  {
    "volume_candidates": [...],
    "meta_candidates": {...},
    "confidence": 0.8
  }`;

export const PROMPT_MRI_VOXEL_FINAL = `MRI voxelization planner (Final).
  Output JSON (ONLY valid JSON):
  {
    "conversions": [...],
    "questions": []
  }`;

export const llmNirsDraft = (
  payload: string,
  llmConfig: LLMConfig,
  signal?: AbortSignal
): Promise<string> =>
  callLLM(PROMPT_NIRS_DRAFT, payload, "NIRS_Draft", llmConfig, 0.2, signal);

export const llmNirsNormalize = (
  payload: string,
  llmConfig: LLMConfig,
  signal?: AbortSignal
): Promise<string> =>
  callLLM(
    PROMPT_NIRS_NORMALIZE,
    payload,
    "NIRS_Normalize",
    llmConfig,
    0.1,
    signal
  );

export const llmMriVoxelDraft = (
  payload: string,
  llmConfig: LLMConfig,
  signal?: AbortSignal
): Promise<string> =>
  callLLM(
    PROMPT_MRI_VOXEL_DRAFT,
    payload,
    "MRI_Voxel_Draft",
    llmConfig,
    0.2,
    signal
  );

export const llmMriVoxelFinal = (
  payload: string,
  llmConfig: LLMConfig,
  signal?: AbortSignal
): Promise<string> =>
  callLLM(
    PROMPT_MRI_VOXEL_FINAL,
    payload,
    "MRI_Voxel_Final",
    llmConfig,
    0.1,
    signal
  );
