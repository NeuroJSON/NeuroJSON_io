// src/components/DatasetOrganizer/utils/trioHelpers.ts
//
// Mirrors autobidsify/stages/trio.py
// Owns Stage 4 of the pipeline: evidence bundle → trio files
// (dataset_description.json, README.md, participants.tsv)
//
// Python equivalents:
//   normalizeLicenseLocally()       → normalize_license_locally()
//   checkTrioStatus()               → check_trio_status()
//   isMarkdownContent()             → _is_markdown_content()
//   validateDatasetDescription()    → _validate_dataset_description()
//   fixFieldTypes()                 → _fix_field_types()
//   parseLLMJsonResponse()          → _parse_llm_json_response()
//   generateDatasetDescription()    → generate_dataset_description()
//   generateReadme()                → generate_readme()
//   generateParticipants()          → generate_participants()
//   generateTrioFiles()             → trio_generate_all() — main entry point
import {
  callLLM,
  llmTrioDatasetDescription,
  llmTrioReadme,
  LLMConfig,
} from "./llm";
import { FileItem } from "redux/projects/types/projects.interface";
import { OllamaService } from "services/ollama.service";

export type TrioLLMConfig = LLMConfig;
// ── License whitelist — mirrors LICENSE_WHITELIST in constants.py ─────────────
export const LICENSE_WHITELIST = new Set([
  "PDDL",
  "CC0",
  "PD",
  "CC-BY-4.0",
  "CC-BY-SA-4.0",
  "BSD-3-Clause",
  "BSD-2-Clause",
  "CDDL-1.0",
  "MPL",
  "MIT",
  "GPL-2.0",
  "GPL-2.0+",
  "GPL-3.0",
  "GPL-3.0+",
  "LGPL-3.0+",
  "GFDL-1.3",
  "CC-BY-NC-4.0",
  "CC-BY-NC-SA-4.0",
  "CC-BY-NC-ND-4.0",
  "Non-Standard",
]);

// ============================================================================
// checkTrioStatus()
// Mirrors check_trio_status() in trio.py
// Checks VFS FileItem[] instead of disk
// ============================================================================

export interface TrioStatus {
  dataset_description: {
    exists: boolean;
    source: "user" | "ai" | null;
    content: string | null;
  };
  readme: {
    exists: boolean;
    source: "user" | "ai" | null;
    content: string | null;
  };
  participants: {
    exists: boolean;
    source: "user" | "ai" | null;
    content: string | null;
  };
}

export const checkTrioStatus = (files: FileItem[]): TrioStatus => {
  const findFile = (predicate: (f: FileItem) => boolean) =>
    files.find(predicate) ?? null;

  const dd = findFile((f) => f.name === "dataset_description.json");
  const readme = findFile((f) =>
    ["README.md", "README.txt", "README.rst", "readme.md"].includes(f.name)
  );
  const participants = findFile((f) => f.name === "participants.tsv");

  return {
    dataset_description: {
      exists: !!dd,
      source: dd ? (dd.source as "user" | "ai") : null,
      content: dd?.content ?? null,
    },
    readme: {
      exists: !!readme,
      source: readme ? (readme.source as "user" | "ai") : null,
      content: readme?.content ?? null,
    },
    participants: {
      exists: !!participants,
      source: participants ? (participants.source as "user" | "ai") : null,
      content: participants?.content ?? null,
    },
  };
};

// ============================================================================
// normalizeLicenseLocally()
// Mirrors normalize_license_locally() in trio.py
// Full alias table — handles natural language, abbreviations, typos
// ============================================================================

export const normalizeLicenseLocally = (licenseStr: string): string | null => {
  if (!licenseStr) return null;

  // Normalize: strip separators, uppercase
  const key = licenseStr.toUpperCase().replace(/[\s\-\._]+/g, "");

  const ALIAS_TABLE: Record<string, string[]> = {
    CC0: [
      "CC0",
      "CC010",
      "CC01",
      "CREATIVECOMMONSZERO",
      "CREATIVECOMMONS0",
      "CC0UNIVERSALPUBLICDOMAIN",
      "CC010UNIVERSAL",
      "CC0UNIVERSAL",
      "ZERORIGHTSPUBLICDOMAIN",
      "CC0LICENSE",
    ],
    PD: ["PD", "PUBLICDOMAIN", "PUBLIEDOMAIN"],
    PDDL: ["PDDL", "PDDL10", "PUBLICDOMAINDEDICATIONLICENSE"],
    "CC-BY-4.0": [
      "CCBY40",
      "CCBY4",
      "CCBY",
      "CREATIVECOMMONSATTRIBUTION40",
      "CREATIVECOMMONSATTRIBUTION4",
      "CREATIVECOMMONSATTRIBUTION40INTERNATIONAL",
    ],
    "CC-BY-SA-4.0": [
      "CCBYSA40",
      "CCBYSA4",
      "CCBYSA",
      "CREATIVECOMMONSATTRIBUTIONSHAREALIKE40",
    ],
    "CC-BY-NC-4.0": [
      "CCBYNC40",
      "CCBYNC4",
      "CCBYNC",
      "CREATIVECOMMONSATTRIBUTIONNONCOMMERCIAL40",
    ],
    "CC-BY-NC-SA-4.0": ["CCBYNCSA40", "CCBYNCSA4"],
    "CC-BY-NC-ND-4.0": ["CCBYNCND40", "CCBYNCND4"],
    MIT: ["MIT", "MITLICENSE", "MITOPENSOURCE"],
    "BSD-3-Clause": ["BSD3CLAUSE", "BSD3", "BSDNEW", "BSDREVISED"],
    "BSD-2-Clause": ["BSD2CLAUSE", "BSD2", "BSDORIGINAL", "BSDSIMPLIFIED"],
    "GPL-2.0": ["GPL20", "GPL2", "GNUGPL2"],
    "GPL-2.0+": ["GPL20+", "GPL2+", "GPL2ORLATER"],
    "GPL-3.0": ["GPL30", "GPL3", "GNUGPL3"],
    "GPL-3.0+": ["GPL30+", "GPL3+", "GPL3ORLATER"],
    "LGPL-3.0+": ["LGPL30+", "LGPL3+", "LGPL3ORLATER"],
    MPL: ["MPL", "MPL20", "MPL2", "MOZILLAPUBLICLICENSE"],
    "CDDL-1.0": ["CDDL", "CDDL10"],
    "GFDL-1.3": ["GFDL", "GFDL13"],
    "Non-Standard": [
      "NONSTANDARD",
      "CUSTOM",
      "OTHER",
      "PROPRIETARY",
      "RESTRICTED",
    ],
  };

  for (const [canonical, variants] of Object.entries(ALIAS_TABLE)) {
    if (variants.includes(key)) return canonical;
  }

  return "Non-Standard";
};

// ============================================================================
// parseLLMJsonResponse()
// Mirrors _parse_llm_json_response() in trio.py
// Shared utility — also used in plannerHelpers.ts
// ============================================================================

export const parseLLMJsonResponse = (
  text: string,
  stepName: string
): any | null => {
  if (!text?.trim()) {
    console.warn(`${stepName}: LLM returned empty response`);
    return null;
  }

  let t = text.trim();
  if (t.startsWith("```json")) t = t.slice(7);
  else if (t.startsWith("```")) t = t.split("\n").slice(1).join("\n");
  if (t.endsWith("```")) t = t.slice(0, -3);
  t = t.trim();

  // Direct parse
  try {
    return JSON.parse(t);
  } catch {}

  // raw_decode equivalent: find first complete JSON object
  const match = t.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {}
  }

  console.warn(
    `${stepName}: Failed to parse JSON. Preview: ${t.slice(0, 200)}`
  );
  return null;
};

// ============================================================================
// isMarkdownContent()
// Mirrors _is_markdown_content() in trio.py
// ============================================================================

export const isMarkdownContent = (text: string): boolean => {
  const t = text.trim();
  return (
    t.startsWith("#") ||
    t.startsWith("##") ||
    t.includes("# ") ||
    t.includes("\n## ") ||
    t.startsWith("**") ||
    t.slice(0, 100).includes("- ") ||
    t.includes("\n- ")
  );
};

// ============================================================================
// validateDatasetDescription()
// Mirrors _validate_dataset_description() in trio.py
// ============================================================================

export const validateDatasetDescription = (
  dd: Record<string, any>
): { isValid: boolean; issues: string[] } => {
  const issues: string[] = [];

  if (!dd.Name) issues.push("Missing required field: Name");
  if (!dd.BIDSVersion) issues.push("Missing required field: BIDSVersion");
  if (!dd.License) issues.push("Missing required field: License");
  else if (!LICENSE_WHITELIST.has(dd.License))
    issues.push(`License '${dd.License}' not in BIDS whitelist`);

  for (const field of ["Authors", "Funding", "EthicsApprovals"]) {
    if (dd[field] !== undefined && !Array.isArray(dd[field]))
      issues.push(`${field} must be an array`);
  }

  if (dd.License === "Non-Standard" && !dd.DataLicense)
    issues.push("License='Non-Standard' requires DataLicense field");

  const empty = Object.entries(dd)
    .filter(([, v]) => v === "" || (Array.isArray(v) && v.length === 0))
    .map(([k]) => k);
  if (empty.length > 0)
    issues.push(`Empty fields (will be removed): ${empty.join(", ")}`);

  const isValid = !issues.some(
    (i) => i.includes("Missing required") || i.includes("must be an array")
  );
  return { isValid, issues };
};

// ============================================================================
// fixFieldTypes()
// Mirrors _fix_field_types() in trio.py
// Converts string → array for Authors/Funding/EthicsApprovals,
// removes empty strings
// ============================================================================

export const fixFieldTypes = (
  dd: Record<string, any>
): { fixed: Record<string, any>; fixes: string[] } => {
  const fixed = { ...dd };
  const fixes: string[] = [];

  for (const field of ["Authors", "Funding", "EthicsApprovals"]) {
    if (!(field in fixed)) continue;
    const val = fixed[field];
    if (typeof val === "string") {
      if (val.trim()) {
        fixed[field] = [val];
        fixes.push(`Converted ${field} from string to array`);
      } else {
        delete fixed[field];
      }
    } else if (Array.isArray(val) && val.length === 0) {
      delete fixed[field];
    }
  }

  // Remove empty strings except required fields
  const required = new Set(["Name", "BIDSVersion", "DatasetType", "License"]);
  for (const [k, v] of Object.entries(fixed)) {
    if (v === "" && !required.has(k)) delete fixed[k];
  }

  return { fixed, fixes };
};

// ============================================================================
// LLM call config type
// ============================================================================

// export interface TrioLLMConfig {
//   provider: string;
//   model: string;
//   apiKey: string;
//   baseUrl: string;
//   isAnthropic?: boolean;
//   noApiKey?: boolean;
// }

export interface GenerateTrioOptions {
  evidenceBundle: any;
  files: FileItem[];
  llmConfig: TrioLLMConfig;
  signal?: AbortSignal;
  onStatus?: (msg: string) => void;
}

export interface GenerateTrioResult {
  datasetDesc: Record<string, any>;
  readmeContent: string;
  participantsTsv: string;
  skipped: { datasetDesc: boolean; readme: boolean; participants: boolean };
}

// ============================================================================
// callTrioLLM() — internal LLM dispatcher
// ============================================================================

const callTrioLLM = async (
  prompt: string,
  llmConfig: TrioLLMConfig,
  maxTokens: number = 2048,
  signal?: AbortSignal
): Promise<string> => {
  const { provider, model, apiKey, baseUrl, isAnthropic, noApiKey } = llmConfig;

  if (provider === "ollama") {
    const res = await OllamaService.chat(model, [
      { role: "user", content: prompt },
    ]);
    return res?.choices?.[0]?.message?.content ?? "";
  }

  if (isAnthropic) {
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
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    const data = await res.json();
    return data?.content?.[0]?.text ?? "";
  }

  const res = await fetch(baseUrl, {
    method: "POST",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(noApiKey ? {} : { Authorization: `Bearer ${apiKey}` }),
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: maxTokens,
    }),
  });
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
};

// ============================================================================
// generateDatasetDescription()
// Mirrors generate_dataset_description() in trio.py
//
// Key design (mirrors Python):
//   LLM outputs 'raw_license' (natural language, no format constraints)
//   Python/TS normalizes: raw_license → normalizeLicenseLocally() → BIDS canonical
//   This is robust: user can write anything, LLM understands it, we map it.
// ============================================================================

const generateDatasetDescription = async (
  evidenceBundle: any,
  existingContent: string | null,
  llmConfig: TrioLLMConfig,
  signal?: AbortSignal
): Promise<Record<string, any>> => {
  let existingDD: Record<string, any> | null = null;
  if (existingContent) {
    try {
      existingDD = JSON.parse(existingContent);
    } catch {}
  }

  const raw = await llmTrioDatasetDescription(
    JSON.stringify({
      user_hints: evidenceBundle?.user_hints ?? {},
      documents: (evidenceBundle?.documents ?? []).map((d: any) => ({
        filename: d.filename,
        content: (d.content || "").slice(0, 500),
      })),
      counts_by_ext: evidenceBundle?.counts_by_ext ?? {},
      existing: existingDD,
    }),
    llmConfig,
    signal
  );
  const result = parseLLMJsonResponse(raw, "dataset_description");

  // Extract raw_license — mirrors Python's multi-location search
  const rawLicense: string =
    result?.raw_license ||
    result?.dataset_description?.raw_license ||
    result?.dataset_description?.License ||
    existingDD?.License ||
    "";

  // Python-side normalization — mirrors normalize_license_locally() call
  const normalizedLicense = rawLicense
    ? normalizeLicenseLocally(rawLicense)
    : null;

  const llmDD = result?.dataset_description || {};

  // Merge: existingDD < llmDD, then apply normalized license (highest priority)
  const merged: Record<string, any> = {};
  Object.assign(merged, llmDD);
  if (existingDD) {
    for (const [k, v] of Object.entries(existingDD)) {
      if (v) merged[k] = v; // existing wins only if non-empty
    }
  }
  delete merged.raw_license; // remove if LLM put it inside

  if (normalizedLicense) {
    merged.License = normalizedLicense;
  }

  // Build final structure — mirrors Python's required_structure assembly
  const final: Record<string, any> = {
    Name: merged.Name || "",
    BIDSVersion: "1.10.0",
    DatasetType: merged.DatasetType || "raw",
    License: merged.License || "",
  };

  // Array fields — mirrors _fix_field_types()
  for (const field of ["Authors", "Funding", "EthicsApprovals"]) {
    const val = merged[field];
    if (!val) continue;
    if (typeof val === "string" && val.trim()) final[field] = [val];
    else if (Array.isArray(val) && val.length > 0) final[field] = val;
  }

  // Optional scalar fields
  for (const field of [
    "Acknowledgements",
    "HowToAcknowledge",
    "DatasetDOI",
    "HEDVersion",
    "DataLicense",
  ]) {
    if (merged[field]) final[field] = merged[field];
  }

  // Optional array fields
  for (const field of ["ReferencesAndLinks", "GeneratedBy", "SourceDatasets"]) {
    if (Array.isArray(merged[field]) && merged[field].length > 0)
      final[field] = merged[field];
  }

  const finalLic = final.License;
  if (finalLic && !LICENSE_WHITELIST.has(finalLic)) {
    const again = normalizeLicenseLocally(finalLic);
    if (again) final.License = again;
  }

  // Remove empty strings
  for (const [k, v] of Object.entries(final)) {
    if (v === "" || (Array.isArray(v) && v.length === 0)) delete final[k];
  }

  return final;
};

// ============================================================================
// generateReadme()
// Mirrors generate_readme() in trio.py
// ============================================================================

const generateReadme = async (
  evidenceBundle: any,
  llmConfig: TrioLLMConfig,
  signal?: AbortSignal
): Promise<string> => {
  const raw = await llmTrioReadme(
    JSON.stringify({
      documents: (evidenceBundle?.documents ?? []).map((d: any) => ({
        filename: d.filename,
        content: (d.content || "").slice(0, 500),
      })),
      user_hints: evidenceBundle?.user_hints ?? {},
      existing_readme: null,
    }),
    llmConfig,
    signal
  );

  if (isMarkdownContent(raw)) return raw.trim();

  const result = parseLLMJsonResponse(raw, "README");
  return result?.readme_content ?? "# Dataset\n\nNeuroimaging dataset.\n";
};
// ============================================================================
// generateParticipants()
// Mirrors generate_participants() in trio.py
//
// Critical design (mirrors Python):
//   LLM decides ONLY extra demographic column schema
//   TS always controls participant_id and original_id from subject analysis
// ============================================================================

const generateParticipants = (evidenceBundle: any): string | null => {
  // null = deferred
  const nSubjects: number = evidenceBundle?.user_hints?.n_subjects ?? 1;
  const allFiles: string[] = evidenceBundle?.all_files || [];

  // Mirror Python deferral logic exactly
  if (nSubjects > 100 || allFiles.length > 500) {
    return null; // deferred — plan stage handles it
  }

  // Simple placeholder — plan stage will overwrite with full columns
  const rows = Array.from(
    { length: nSubjects },
    (_, i) => `sub-${String(i + 1).padStart(2, "0")}`
  );
  return ["participant_id", ...rows].join("\n");
};
// const generateParticipants = async (
//   evidenceBundle: any,
//   files: FileItem[],
//   llmConfig: TrioLLMConfig,
//   signal?: AbortSignal
// ): Promise<string> => {
//   const userText = evidenceBundle?.user_hints?.user_text || "";
//   const allFiles: string[] = evidenceBundle?.all_files || [];
//   const userNSubjects: number | null =
//     evidenceBundle?.user_hints?.n_subjects ?? null;
//   const dominantPrefixes =
//     evidenceBundle?.filename_analysis?.python_statistics?.dominant_prefixes;

//   // Compute subject analysis — mirrors Python's authoritative subject detection
//   const subjectAnalysis = extractSubjectAnalysis(
//     allFiles,
//     userNSubjects,
//     dominantPrefixes
//   );

//   const idMap = subjectAnalysis.id_mapping.id_mapping;
//   const reverseMap = subjectAnalysis.id_mapping.reverse_mapping;
//   const subjectRecords = subjectAnalysis.subject_records;

//   // Build subject labels list
//   const expectedCount = userNSubjects || Object.keys(idMap).length || 1;
//   const subjectLabels: string[] =
//     Object.keys(idMap).length > 0 &&
//     (!userNSubjects || Object.keys(idMap).length === userNSubjects)
//       ? Object.values(idMap).map((id: string) => `sub-${id}`)
//       : Array.from(
//           { length: expectedCount },
//           (_, i) => `sub-${String(i + 1).padStart(2, "0")}`
//         );

//   // Ask LLM ONLY for extra column schema — mirrors Python's design
//   const prompt = `You are a BIDS participants.tsv column schema generator.

// USER-PROVIDED CONTENT:
// ${"─".repeat(60)}
// ${userText || "(none provided)"}
// ${"─".repeat(60)}

// YOUR JOB: Decide which EXTRA columns belong in participants.tsv based ONLY
// on what is explicitly stated in the user content above.

// STRICT RULES:
// - participant_id and original_id are ALWAYS added by code — do NOT include them
// - ONLY add columns for demographics EXPLICITLY mentioned
// - DO NOT invent age, sex, handedness unless directly stated
// - If no demographic info is mentioned, return empty columns array

// Output ONLY valid JSON (no markdown fences):
// {
//   "columns": [
//     {"name": "sex", "levels": ["M", "F"]}
//   ]
// }

// If no extra columns: {"columns": []}`;

//   const raw = await callTrioLLM(prompt, llmConfig, 1024, signal);
//   const schema = parseLLMJsonResponse(raw, "participants");

//   // Extra columns decided by LLM (demographic columns only)
//   const extraColumns: string[] = (schema?.columns || [])
//     .map((c: any) => c.name)
//     .filter((n: string) => n !== "participant_id" && n !== "original_id");

//   // TypeScript always controls participant_id and original_id
//   // mirrors Python: _generate_participants_tsv_from_python()
//   const columns = ["participant_id", "original_id", ...extraColumns];
//   const header = columns.join("\t");

//   const rows = subjectLabels.map((subId) => {
//     const bareId = subId.replace(/^sub-/, "");
//     const originalId = reverseMap[bareId] || "n/a";
//     const record = subjectRecords.find((r) => r.original_id === originalId);

//     return columns
//       .map((col) => {
//         if (col === "participant_id") return subId;
//         if (col === "original_id") return originalId;
//         if (col === "group") return (record as any)?.group ?? "n/a";
//         return "n/a";
//       })
//       .join("\t");
//   });

//   return [header, ...rows].join("\n");
// };

// ============================================================================
// generateTrioFiles()
// Main entry point — mirrors trio_generate_all() in trio.py
// Called by handleGenerateTrio() in LLMPanel.tsx
// ============================================================================

export const generateTrioFiles = async (
  opts: GenerateTrioOptions
): Promise<GenerateTrioResult> => {
  const { evidenceBundle, files, llmConfig, signal, onStatus } = opts;
  const log = (msg: string) => {
    console.log(msg);
    onStatus?.(msg);
  };

  const status = checkTrioStatus(files);
  log(
    `Trio status: DD=${status.dataset_description.exists}, README=${status.readme.exists}, participants=${status.participants.exists}`
  );

  // Skip logic:
  //   source === "user"  → user uploaded this file → ALWAYS skip (never overwrite)
  //   source === "ai"    → AI generated previously → REGENERATE (replace)
  //   null               → nothing exists          → GENERATE
  const skipDD = status.dataset_description.source === "user";
  const skipReadme = status.readme.source === "user";
  const skipParticipants = status.participants.source === "user";
  // ── dataset_description.json ─────────────────────────────────────
  let datasetDesc: Record<string, any>;

  if (skipDD) {
    log("1/3 dataset_description.json user-uploaded, skipping...");
    try {
      datasetDesc = JSON.parse(status.dataset_description.content!);
    } catch {
      datasetDesc = {};
    }
  } else {
    // Generates on first click AND regenerates on every subsequent click
    log("1/3 Generating dataset_description.json...");
    datasetDesc = await generateDatasetDescription(
      evidenceBundle,
      status.dataset_description.content ?? null,
      llmConfig,
      signal
    );
    log(`  License: ${datasetDesc.License || "MISSING"}`);
  }

  // ── README.md ────────────────────────────────────────────────────
  let readmeContent: string;

  if (skipReadme) {
    log("2/3 README.md user-uploaded, skipping...");
    readmeContent = status.readme.content!;
  } else {
    log("2/3 Generating README.md...");
    readmeContent = await generateReadme(evidenceBundle, llmConfig, signal);
  }

  // ── participants.tsv ─────────────────────────────────────────────
  let participantsTsv: string;

  //   if (skipParticipants) {
  //     log("3/3 participants.tsv user-uploaded, skipping...");
  //     participantsTsv = status.participants.content!;
  //   } else {
  //     log("3/3 Generating participants.tsv...");
  //     participantsTsv = await generateParticipants(
  //       evidenceBundle,
  //       files,
  //       llmConfig,
  //       signal
  //     );
  //   }
  if (skipParticipants) {
    log("3/3 participants.tsv user-uploaded, skipping...");
    participantsTsv = status.participants.content!;
  } else {
    const simple = generateParticipants(evidenceBundle);
    if (simple === null) {
      log("3/3 participants.tsv deferred to plan stage...");
      participantsTsv = ""; // empty — plan step will generate it
    } else {
      log("3/3 Generating basic participants.tsv...");
      participantsTsv = simple;
    }
  }

  log("✓ Trio generation complete");

  return {
    datasetDesc,
    readmeContent: readmeContent
      .replace(/^```markdown\n?/g, "")
      .replace(/\n?```$/g, "")
      .trim(),
    participantsTsv: participantsTsv
      .replace(/^```\n?/g, "")
      .replace(/\n?```$/g, "")
      .trim(),
    skipped: {
      datasetDesc: skipDD,
      readme: skipReadme,
      participants: skipParticipants,
    },
  };
};
