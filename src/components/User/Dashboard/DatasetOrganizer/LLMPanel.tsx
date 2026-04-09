import { generateId } from "./utils/fileProcessors";
import { LLMConfig } from "./utils/llm";
import {
  buildEvidenceBundle,
  buildIngestInfo,
  downloadJSON,
} from "./utils/llmHelpers";
import { buildBidsPlan } from "./utils/plannerHelpers";
import { generateTrioFiles } from "./utils/trioHelpers";
import {
  Close,
  ContentCopy,
  Download,
  AutoAwesome,
  DriveFileMove,
} from "@mui/icons-material";
import {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  IconButton,
  Alert,
} from "@mui/material";
import { Colors } from "design/theme";
import { dump as yamlDump } from "js-yaml";
import JSZip from "jszip";
import React, { useState, useEffect } from "react";
import { FileItem } from "redux/projects/types/projects.interface";

// import { OllamaService } from "services/ollama.service";

interface LLMPanelProps {
  files: FileItem[];
  baseDirectoryPath: string;
  setBaseDirectoryPath: (path: string) => void;
  evidenceBundle: any; // ✅ Add
  setEvidenceBundle: (bundle: any) => void; // ✅ Add
  trioGenerated: boolean; // ✅ Add
  setTrioGenerated: (value: boolean) => void; // ✅ Add
  updateFiles: (updater: React.SetStateAction<FileItem[]>) => void; // ✅ Add
  onClose: () => void;
}

interface LLMProvider {
  name: string;
  baseUrl: string;
  models: Array<{ id: string; name: string }>;
  noApiKey?: boolean;
  isAnthropic?: boolean;
  // customUrl?: boolean;
}

const llmProviders: Record<string, LLMProvider> = {
  ollama: {
    name: "Ollama (Local Server)",
    // baseUrl: "http://localhost:11434/v1/chat/completions",
    baseUrl: "",
    models: [
      { id: "qwen3-coder-next:latest", name: "Qwen 3 Coder Next" },
      { id: "qwen3-coder-careful:latest", name: "Qwen 3 Coder Careful" },
      { id: "qwen3.5:9b", name: "Qwen 3.5 9B" },
      { id: "qwen2.5-coder:latest", name: "Qwen 2.5 Coder (7.6B)" },
      { id: "qwen2.5-coder:7b", name: "Qwen 2.5 Coder 7B" },
    ],
    noApiKey: true,
    // customUrl: true,
  },
  groq: {
    name: "Groq (Free API Key - 14,400 req/day)",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Fast)" },
      { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B" },
    ],
  },
  openrouter: {
    name: "OpenRouter (Free models available)",
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    models: [
      {
        id: "meta-llama/llama-3.1-8b-instruct:free",
        name: "Llama 3.1 8B (Free)",
      },
      { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B (Free)" },
      { id: "mistralai/mistral-7b-instruct:free", name: "Mistral 7B (Free)" },
    ],
  },
  anthropic: {
    name: "Anthropic Claude (Paid)",
    baseUrl: "https://api.anthropic.com/v1/messages",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
    ],
    isAnthropic: true,
  },
  openai: {
    name: "OpenAI (Paid)",
    baseUrl: "https://api.openai.com/v1/chat/completions",
    models: [
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4o", name: "GPT-4o" },
    ],
  },
};

const LLMPanel: React.FC<LLMPanelProps> = ({
  files,
  baseDirectoryPath,
  setBaseDirectoryPath,
  evidenceBundle, // ✅ Add
  setEvidenceBundle, // ✅ Add
  trioGenerated, // ✅ Add
  setTrioGenerated, // ✅ Add
  updateFiles, // ✅ Add
  onClose,
}) => {
  const [provider, setProvider] = useState<string>("ollama");
  const [model, setModel] = useState<string>("qwen3-coder-next:latest");
  // const [ollamaUrl, setOllamaUrl] = useState<string>(
  //   "http://jin.neu.edu:11434"
  // );
  const [apiKey, setApiKey] = useState<string>("");
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [bidsPlan, setBidsPlan] = useState<string>(""); // add bids plan
  const [loading, setLoading] = useState(false); // add loading spin to generate script button
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [generatingEvidence, setGeneratingEvidence] = useState(false); // Add loading spin to evidence button
  const [generatingTrio, setGeneratingTrio] = useState(false); // Add loading spin to trio button
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

  const [subjectAnalysis, setSubjectAnalysis] = useState<any>(null);
  const [nSubjects, setNSubjects] = useState<string>("");
  const [modalityHint, setModalityHint] = useState<string>("mri");
  const [describeText, setDescribeText] = useState<string>("");
  const [nSubjectsError, setNSubjectsError] = useState(false);
  const [modalityError, setModalityError] = useState(false);

  const [panelHeight, setPanelHeight] = useState<number>(450);
  const [isResizing, setIsResizing] = useState(false);

  // Build LLMConfig for all helper calls — mirrors autobidsify CLI arg assembly
  const buildLLMConfig = (): LLMConfig => ({
    provider,
    model,
    apiKey,
    baseUrl: currentProvider.baseUrl,
    isAnthropic: currentProvider.isAnthropic,
    noApiKey: currentProvider.noApiKey,
  });

  // ========================================================================
  // BUTTON 1: GENERATE EVIDENCE BUNDLE
  // ========================================================================
  const handleGenerateEvidence = () => {
    const hasNSubjectsError = !nSubjects || parseInt(nSubjects) < 1;
    const hasModalityError = !modalityHint;
    setNSubjectsError(hasNSubjectsError);
    setModalityError(hasModalityError);
    if (hasNSubjectsError || hasModalityError) return;

    if (!baseDirectoryPath.trim()) {
      setError("Please enter a base directory path first");
      return;
    }

    setGeneratingEvidence(true);
    setError(null);
    setStatus("Building evidence bundle...");
    try {
      const bundle = buildEvidenceBundle(files, baseDirectoryPath, {
        nSubjects: nSubjects ? parseInt(nSubjects) : null,
        modalityHint,
        describeText,
      });

      setEvidenceBundle(bundle);
      setSubjectAnalysis(null); // ← add this line
      downloadJSON(bundle, "evidence_bundle.json");
      setStatus("✓ Evidence bundle generated and downloaded!");
    } catch (err: any) {
      setError("Failed to generate evidence bundle");
    } finally {
      setGeneratingEvidence(false);
    }
  };

  // ========================================================================
  // BUTTON 2: Generate BIDS Trio with LLM calls
  // ========================================================================
  const handleGenerateTrio = async () => {
    if (!evidenceBundle) {
      setError("Please generate evidence bundle first");
      return;
    }
    if (!currentProvider.noApiKey && !apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setGeneratingTrio(true);
    setError(null);
    setStatus("Generating BIDS trio files...");

    try {
      const { datasetDesc, readmeContent, participantsTsv, skipped } =
        await generateTrioFiles({
          evidenceBundle,
          files,
          llmConfig: buildLLMConfig(),
          signal: controller.signal,
          onStatus: setStatus,
        });

      const timestamp = new Date().toLocaleString();
      const trioFiles: FileItem[] = [
        {
          id: generateId(),
          name: "dataset_description.json",
          type: "file",
          fileType: "meta",
          content: JSON.stringify(datasetDesc, null, 2),
          contentType: "text",
          isUserMeta: true,
          parentId: null,
          source: "ai",
          generatedAt: timestamp,
        },
        {
          id: generateId(),
          name: "README.md",
          type: "file",
          fileType: "meta",
          content: readmeContent,
          contentType: "text",
          isUserMeta: true,
          parentId: null,
          source: "ai",
          generatedAt: timestamp,
        },
        {
          id: generateId(),
          name: "participants.tsv",
          type: "file",
          fileType: "meta",
          content: participantsTsv,
          contentType: "text",
          isUserMeta: true,
          parentId: null,
          source: "ai",
          generatedAt: timestamp,
        },
      ];

      updateFiles((prev) => {
        const trioNames = [
          "dataset_description.json",
          "README.md",
          "participants.tsv",
        ];
        const withoutOldTrio = prev.filter(
          (f) => !(f.source === "ai" && trioNames.includes(f.name))
        );
        // Only add AI files for ones that weren't user-uploaded (skipped=true means user-uploaded)
        const newTrioFiles = trioFiles.filter((tf) => {
          if (tf.name === "dataset_description.json")
            return !skipped.datasetDesc;
          if (tf.name === "README.md") return !skipped.readme;
          if (tf.name === "participants.tsv") return !skipped.participants;
          return true;
        });
        return [...withoutOldTrio, ...newTrioFiles];
      });

      setTrioGenerated(true);
      setStatus(
        "✓ BIDS trio files generated and added to Virtual File System!"
      );
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStatus("❌ Generation cancelled");
      } else {
        setError(err.message || "Failed to generate trio files");
        setStatus("❌ Error generating trio files");
      }
    } finally {
      setGeneratingTrio(false);
      setAbortController(null);
    }
  };
  // const handleGenerateTrio = async () => {
  //   if (!evidenceBundle) {
  //     setError("Please generate evidence bundle first");
  //     return;
  //   }

  //   if (!currentProvider.noApiKey && !apiKey.trim()) {
  //     setError("Please enter an API key");
  //     return;
  //   }

  //   // Create abort controller
  //   const controller = new AbortController();
  //   setAbortController(controller);

  //   setGeneratingTrio(true);
  //   setError(null);
  //   setStatus("Generating BIDS trio files...");

  //   try {
  //     const userText = evidenceBundle.user_hints.user_text || "";

  //     // ==========================================
  //     // Call 1: Generate dataset_description.json
  //     // ==========================================
  //     let datasetDesc: any;
  //     if (evidenceBundle.trio_found?.["dataset_description.json"]) {
  //       setStatus("1/3 dataset_description.json already exists, skipping...");
  //       const existing = files.find(
  //         (f) => f.source === "user" && f.name === "dataset_description.json"
  //       );
  //       datasetDesc = existing?.content ? JSON.parse(existing.content) : {};
  //     } else {
  //       setStatus("1/3 Generating dataset_description.json...");
  //       const ddPrompt = getDatasetDescriptionPrompt(userText, evidenceBundle);

  //       let ddResponse;
  //       if (currentProvider.isAnthropic) {
  //         ddResponse = await fetch(currentProvider.baseUrl, {
  //           method: "POST",
  //           signal: controller.signal,
  //           headers: {
  //             "Content-Type": "application/json",
  //             "x-api-key": apiKey,
  //             "anthropic-version": "2023-06-01",
  //           },
  //           body: JSON.stringify({
  //             model,
  //             max_tokens: 2048,
  //             messages: [{ role: "user", content: ddPrompt }],
  //           }),
  //         });
  //       } else if (provider === "ollama") {

  //         ddResponse = await OllamaService.chat(model, [
  //           { role: "user", content: ddPrompt },
  //         ]);
  //       } else {
  //         ddResponse = await fetch(currentProvider.baseUrl, {
  //           method: "POST",
  //           signal: controller.signal,
  //           headers: {
  //             "Content-Type": "application/json",
  //             Authorization: `Bearer ${apiKey}`,
  //           },
  //           body: JSON.stringify({
  //             model,
  //             messages: [{ role: "user", content: ddPrompt }],
  //             max_tokens: 2048,
  //           }),
  //         });
  //       }

  //       // const ddData = await ddResponse.json();
  //       const ddData =
  //         provider === "ollama" ? ddResponse : await ddResponse.json();
  //       let ddText = currentProvider.isAnthropic
  //         ? ddData.content[0].text
  //         : ddData.choices[0].message.content;

  //       // Clean up markdown fences
  //       ddText = ddText
  //         .replace(/^```json\n?/g, "")
  //         .replace(/\n?```$/g, "")
  //         .trim();
  //       datasetDesc = JSON.parse(ddText);
  //     }

  //     // ==========================================
  //     // Call 2: Generate README.md
  //     // ==========================================
  //     let readmeContent: string;
  //     if (evidenceBundle.trio_found?.["README.md"]) {
  //       setStatus("2/3 README.md already exists, skipping...");
  //       const existing = files.find(
  //         (f) =>
  //           f.source === "user" &&
  //           ["README.md", "README.txt", "README.rst", "readme.md"].includes(
  //             f.name
  //           )
  //       );
  //       readmeContent = existing?.content || "";
  //     } else {
  //       setStatus("2/3 Generating README.md...");
  //       const readmePrompt = getReadmePrompt(userText);

  //       let readmeResponse;
  //       if (currentProvider.isAnthropic) {
  //         readmeResponse = await fetch(currentProvider.baseUrl, {
  //           method: "POST",
  //           signal: controller.signal,
  //           headers: {
  //             "Content-Type": "application/json",
  //             "x-api-key": apiKey,
  //             "anthropic-version": "2023-06-01",
  //           },
  //           body: JSON.stringify({
  //             model,
  //             max_tokens: 2048,
  //             messages: [{ role: "user", content: readmePrompt }],
  //           }),
  //         });
  //       } else if (provider === "ollama") {

  //         readmeResponse = await OllamaService.chat(model, [
  //           { role: "user", content: readmePrompt },
  //         ]);
  //       } else {
  //         readmeResponse = await fetch(currentProvider.baseUrl, {
  //           method: "POST",
  //           signal: controller.signal,
  //           headers: {
  //             "Content-Type": "application/json",
  //             Authorization: `Bearer ${apiKey}`,
  //           },
  //           body: JSON.stringify({
  //             model,
  //             messages: [{ role: "user", content: readmePrompt }],
  //             max_tokens: 2048,
  //           }),
  //         });
  //       }

  //       const readmeData =
  //         provider === "ollama" ? readmeResponse : await readmeResponse.json();
  //       readmeContent = currentProvider.isAnthropic
  //         ? readmeData.content[0].text
  //         : readmeData.choices[0].message.content;
  //     }
  //     // ==========================================
  //     // Call 3: Generate participants.tsv
  //     // ==========================================
  //     let participantsContent: string;
  //     if (evidenceBundle.trio_found?.["participants.tsv"]) {
  //       setStatus("3/3 participants.tsv already exists, skipping...");
  //       const existing = files.find(
  //         (f) => f.source === "user" && f.name === "participants.tsv"
  //       );
  //       participantsContent = existing?.content || "";
  //     } else {
  //       setStatus("3/3 Generating participants.tsv...");
  //       const partsPrompt = getParticipantsPrompt(userText);

  //       const currentSubjectAnalysis = extractSubjectAnalysis(
  //         evidenceBundle?.all_files || [],
  //         evidenceBundle?.user_hints?.n_subjects,
  //         evidenceBundle?.filename_analysis?.python_statistics
  //           ?.dominant_prefixes
  //       );

  //       console.log("=== PARTICIPANTS DEBUG ===");
  //       console.log("method:", currentSubjectAnalysis?.method);
  //       console.log("subject_count:", currentSubjectAnalysis?.subject_count);
  //       console.log(
  //         "id_mapping:",
  //         currentSubjectAnalysis?.id_mapping?.id_mapping
  //       );
  //       console.log(
  //         "reverse_mapping:",
  //         currentSubjectAnalysis?.id_mapping?.reverse_mapping
  //       );
  //       console.log(
  //         "subject_records sample:",
  //         currentSubjectAnalysis?.subject_records?.slice(0, 3)
  //       );
  //       const idMap = currentSubjectAnalysis?.id_mapping?.id_mapping;
  //       const expectedCount = evidenceBundle?.user_hints?.n_subjects;
  //       const subjectLabels: string[] =
  //         idMap &&
  //         Object.keys(idMap).length > 0 &&
  //         (!expectedCount || Object.keys(idMap).length === expectedCount)
  //           ? Object.values(idMap).map((id: string) => `sub-${id}`)
  //           : Array.from(
  //               {
  //                 length: expectedCount || Object.keys(idMap || {}).length || 1,
  //               },
  //               (_, i) => `sub-${String(i + 1).padStart(2, "0")}`
  //             );

  //       let partsResponse;
  //       if (currentProvider.isAnthropic) {
  //         partsResponse = await fetch(currentProvider.baseUrl, {
  //           method: "POST",
  //           signal: controller.signal,
  //           headers: {
  //             "Content-Type": "application/json",
  //             "x-api-key": apiKey,
  //             "anthropic-version": "2023-06-01",
  //           },
  //           body: JSON.stringify({
  //             model,
  //             max_tokens: 1024,
  //             messages: [{ role: "user", content: partsPrompt }],
  //           }),
  //         });
  //       } else if (provider === "ollama") {

  //         partsResponse = await OllamaService.chat(model, [
  //           { role: "user", content: partsPrompt },
  //         ]);
  //       } else {
  //         partsResponse = await fetch(currentProvider.baseUrl, {
  //           method: "POST",
  //           signal: controller.signal,
  //           headers: {
  //             "Content-Type": "application/json",
  //             Authorization: `Bearer ${apiKey}`,
  //           },
  //           body: JSON.stringify({
  //             model,
  //             messages: [{ role: "user", content: partsPrompt }],
  //             max_tokens: 1024,
  //           }),
  //         });
  //       }

  //       // const partsData = await partsResponse.json();
  //       const partsData =
  //         provider === "ollama" ? partsResponse : await partsResponse.json();
  //       const participantsRaw = currentProvider.isAnthropic
  //         ? partsData.content[0].text
  //         : partsData.choices[0].message.content;

  //       // Build TSV from schema
  //       // try {
  //       //   const schemaText = participantsRaw
  //       //     .replace(/^```json\n?/g, "")
  //       //     .replace(/\n?```$/g, "")
  //       //     .trim();
  //       //   const schema = JSON.parse(schemaText);
  //       //   const columns: string[] = schema.columns.map((c: any) => c.name);

  //       //   // Get subject IDs from evidence bundle (extracted by Python-style analysis)
  //       //   // const idMapping =
  //       //   //   evidenceBundle?.subject_analysis?.id_mapping?.id_mapping;
  //       //   // const subjectLabels: string[] = idMapping
  //       //   //   ? Object.values(idMapping).map((id) => `sub-${id}`)
  //       //   //   : ["sub-01"]; // fallback if no subject analysis
  //       //   // Get subject IDs from subjectAnalysis state (computed at plan stage)
  //       //   // Fall back to computing fresh if plan hasn't been run yet
  //       //   const currentSubjectAnalysis =
  //       //     subjectAnalysis ||
  //       //     extractSubjectAnalysis(
  //       //       evidenceBundle?.all_files || [],
  //       //       evidenceBundle?.user_hints?.n_subjects,
  //       //       evidenceBundle?.filename_analysis?.python_statistics
  //       //         ?.dominant_prefixes
  //       //     );
  //       //   const idMap = currentSubjectAnalysis?.id_mapping?.id_mapping;
  //       //   const subjectLabels: string[] =
  //       //     idMap && Object.keys(idMap).length > 0
  //       //       ? Object.values(idMap).map((id) => `sub-${id}`)
  //       //       : Array.from(
  //       //           { length: evidenceBundle?.user_hints?.n_subjects || 1 },
  //       //           (_, i) => `sub-${String(i + 1).padStart(2, "0")}`
  //       //         );

  //       //   const header = columns.join("\t");
  //       //   // ====origin====
  //       //   // const rows = subjectLabels.map((subId) =>
  //       //   //   columns
  //       //   //     .map((col: string) => (col === "participant_id" ? subId : "n/a"))
  //       //   //     .join("\t")
  //       //   // );
  //       //   //====== end ======
  //       //   // =====update start=====
  //       //   const reverseMap =
  //       //     currentSubjectAnalysis?.id_mapping?.reverse_mapping || {};
  //       //   const subjectRecords = currentSubjectAnalysis?.subject_records || [];

  //       //   const rows = subjectLabels.map((subId) => {
  //       //     const bareId = subId.replace(/^sub-/, "");
  //       //     const originalId = reverseMap[bareId];
  //       //     const record = subjectRecords.find(
  //       //       (r: any) => r.original_id === originalId
  //       //     );
  //       //     return columns
  //       //       .map((col: string) => {
  //       //         if (col === "participant_id") return subId;
  //       //         if (col === "original_id") return originalId || "n/a";
  //       //         if (col === "group") return (record as any)?.group || "n/a";
  //       //         return "n/a";
  //       //       })
  //       //       .join("\t");
  //       //   });
  //       //   //====update end======
  //       //   participantsContent = [header, ...rows].join("\n");
  //       // } catch (e) {
  //       //   // Fallback: LLM didn't return valid JSON schema, use raw content
  //       //   participantsContent = participantsRaw
  //       //     .replace(/^```\n?/g, "")
  //       //     .replace(/\n?```$/g, "")
  //       //     .trim();
  //       // }
  //       // Build TSV from schema + subject analysis
  //       // Mirrors _generate_participants_tsv_from_python() in planner.py
  //       try {
  //         const schemaText = participantsRaw
  //           .replace(/^```json\n?/g, "")
  //           .replace(/\n?```$/g, "")
  //           .trim();
  //         const schema = JSON.parse(schemaText);

  //         // LLM decides extra demographic columns (sex, age, group etc.)
  //         // but we always add participant_id and original_id ourselves
  //         const extraColumns: string[] = schema.columns
  //           .map((c: any) => c.name)
  //           .filter(
  //             (name: string) =>
  //               name !== "participant_id" && name !== "original_id"
  //           );

  //         // Always start with participant_id and original_id
  //         const columns = ["participant_id", "original_id", ...extraColumns];

  //         const reverseMap =
  //           currentSubjectAnalysis?.id_mapping?.reverse_mapping || {};
  //         const subjectRecords = currentSubjectAnalysis?.subject_records || [];

  //         const header = columns.join("\t");
  //         const rows = subjectLabels.map((subId) => {
  //           const bareId = subId.replace(/^sub-/, "");
  //           const originalId = reverseMap[bareId] || "n/a";
  //           const record = subjectRecords.find(
  //             (r: any) => r.original_id === originalId
  //           );
  //           return columns
  //             .map((col: string) => {
  //               if (col === "participant_id") return subId;
  //               if (col === "original_id") return originalId;
  //               if (col === "group") return (record as any)?.group || "n/a";
  //               return "n/a";
  //             })
  //             .join("\t");
  //         });

  //         participantsContent = [header, ...rows].join("\n");
  //       } catch (e) {
  //         // Fallback: generate minimal TSV directly from subject analysis
  //         const reverseMap =
  //           currentSubjectAnalysis?.id_mapping?.reverse_mapping || {};
  //         const header = "participant_id\toriginal_id";
  //         const rows = subjectLabels.map((subId) => {
  //           const bareId = subId.replace(/^sub-/, "");
  //           const originalId = reverseMap[bareId] || "n/a";
  //           return `${subId}\t${originalId}`;
  //         });
  //         participantsContent = [header, ...rows].join("\n");
  //       }
  //     }
  //     // ==========================================
  //     // Add trio files to Virtual File System
  //     // ==========================================
  //     const timestamp = new Date().toLocaleString();
  //     const trioFiles: FileItem[] = [
  //       {
  //         id: generateId(),
  //         name: "dataset_description.json",
  //         type: "file",
  //         fileType: "meta",
  //         content: JSON.stringify(datasetDesc, null, 2),
  //         contentType: "text",
  //         isUserMeta: true,
  //         parentId: null,
  //         source: "ai",
  //         generatedAt: timestamp,
  //       },
  //       {
  //         id: generateId(),
  //         name: "README.md",
  //         type: "file",
  //         fileType: "meta",
  //         content: readmeContent
  //           .replace(/^```markdown\n?/g, "")
  //           .replace(/\n?```$/g, "")
  //           .trim(),
  //         contentType: "text",
  //         isUserMeta: true,
  //         parentId: null,
  //         source: "ai",
  //         generatedAt: timestamp,
  //       },
  //       {
  //         id: generateId(),
  //         name: "participants.tsv",
  //         type: "file",
  //         fileType: "meta",
  //         content: participantsContent
  //           .replace(/^```\n?/g, "")
  //           .replace(/\n?```$/g, "")
  //           .trim(),
  //         contentType: "text",
  //         isUserMeta: true,
  //         parentId: null,
  //         source: "ai",
  //         generatedAt: timestamp,
  //       },
  //     ];
  //     // replace existing trio files, add if not exist
  //     updateFiles((prev) => {
  //       const trioNames = [
  //         "dataset_description.json",
  //         "README.md",
  //         "participants.tsv",
  //       ];

  //       // Remove old AI generated trio files
  //       const withoutOldTrio = prev.filter(
  //         (f) => !(f.source === "ai" && trioNames.includes(f.name))
  //       );

  //       // Add new trio files
  //       // return [...withoutOldTrio, ...trioFiles];

  //       // Only add AI-generated files for ones that weren't user-uploaded
  //       const newTrioFiles = trioFiles.filter(
  //         (tf) =>
  //           !evidenceBundle.trio_found?.[
  //             tf.name as keyof typeof evidenceBundle.trio_found
  //           ]
  //       );

  //       return [...withoutOldTrio, ...newTrioFiles];
  //     });
  //     setTrioGenerated(true);
  //     setStatus(
  //       "✓ BIDS trio files generated and added to Virtual File System!"
  //     );
  //   } catch (err: any) {
  //     if (err.name === "AbortError") {
  //       setStatus("❌ Generation cancelled");
  //     } else {
  //       setError(err.message || "Failed to generate trio files");
  //       setStatus("❌ Error generating trio files");
  //     }
  //   } finally {
  //     setGeneratingTrio(false);
  //     setAbortController(null); // Clear controller
  //   }
  // };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return;

    const newHeight = window.innerHeight - e.clientY;
    if (newHeight >= 100 && newHeight <= window.innerHeight - 100) {
      setPanelHeight(newHeight);
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "ns-resize";

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.body.style.cursor = "";
      };
    }
  }, [isResizing]);

  const currentProvider = llmProviders[provider];

  const handleGeneratePlan = async () => {
    if (!currentProvider.noApiKey && !apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }
    if (!baseDirectoryPath.trim()) {
      setError("Please enter a base directory path");
      return;
    }

    const controller = new AbortController();
    setAbortController(controller);
    setLoading(true);
    setError(null);
    setStatus(`Generating BIDSPlan.yaml using ${currentProvider.name}...`);

    try {
      const {
        planYaml,
        subjectAnalysis: sa,
        participantsTsv,
        coverageWarnings,
      } = await buildBidsPlan({
        evidenceBundle,
        llmConfig: buildLLMConfig(),
        signal: controller.signal,
        onStatus: setStatus,
      });

      // Store subject analysis for ZIP packaging
      setSubjectAnalysis(sa);

      // Dump final YAML string (planYaml is raw string from LLM, already cleaned)
      setBidsPlan(planYaml);

      // Update participants.tsv in VFS with the full version from the plan stage
      if (participantsTsv) {
        const timestamp = new Date().toLocaleString();
        updateFiles((prev) => {
          const withoutOld = prev.filter(
            (f) => !(f.source === "ai" && f.name === "participants.tsv")
          );
          return [
            ...withoutOld,
            {
              id: generateId(),
              name: "participants.tsv",
              type: "file" as const,
              fileType: "meta",
              content: participantsTsv,
              contentType: "text",
              isUserMeta: true,
              parentId: null,
              source: "ai" as const,
              generatedAt: timestamp,
            },
          ];
        });
      }

      if (coverageWarnings.length > 0) {
        setStatus(
          `✓ BIDSPlan.yaml generated (${coverageWarnings.length} coverage warning(s) — check console)`
        );
      } else {
        setStatus(`✓ BIDSPlan.yaml generated using ${currentProvider.name}`);
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStatus("❌ Generation cancelled");
      } else {
        setError(err.message || "Failed to generate BIDSPlan");
        setStatus("❌ Error generating BIDSPlan");
      }
    } finally {
      setLoading(false);
      setAbortController(null);
    }
  };
  // const handleGeneratePlan = async () => {
  //   if (!currentProvider.noApiKey && !apiKey.trim()) {
  //     setError("Please enter an API key");
  //     return;
  //   }
  //   if (!baseDirectoryPath.trim()) {
  //     setError("Please enter a base directory path");
  //     return;
  //   }

  //   const controller = new AbortController();
  //   setAbortController(controller);
  //   setLoading(true);
  //   setError(null);
  //   setStatus(`Generating BIDSPlan.yaml using ${currentProvider.name}...`);

  //   // ── Compute subject analysis (mirrors planner.py Step 1)
  //   const allFiles = evidenceBundle?.all_files || [];
  //   const userNSubjects = evidenceBundle?.user_hints?.n_subjects;
  //   const dominantPrefixes =
  //     evidenceBundle?.filename_analysis?.python_statistics?.dominant_prefixes;

  //   const computedSubjectAnalysis = extractSubjectAnalysis(
  //     allFiles,
  //     userNSubjects,
  //     dominantPrefixes
  //   );

  //   setSubjectAnalysis(computedSubjectAnalysis);

  //   const fileSummary = buildFileSummary(files);
  //   const filePatterns = analyzeFilePatterns(files);
  //   const userContext = getUserContext(files);
  //   // const subjectInfo = extractSubjectsFromFiles(files);
  //   const subjectInfo = computedSubjectAnalysis;
  //   const sampleFiles =
  //     evidenceBundle?.samples
  //       ?.slice(0, 10)
  //       .map((s: any) => `  - ${s.relpath}`)
  //       .join("\n") || "";

  //   const prompt = getBIDSPlanPrompt(
  //     fileSummary,
  //     filePatterns,
  //     userContext,
  //     {
  //       subjects: Object.entries(
  //         computedSubjectAnalysis.id_mapping.id_mapping
  //       ).map(([originalId, bidsId]) => ({ originalId, bidsId })),
  //       strategy: computedSubjectAnalysis.id_mapping.strategy_used,
  //     },
  //     evidenceBundle?.counts_by_ext || {},
  //     sampleFiles,
  //     evidenceBundle
  //   );

  //   try {
  //     let response;

  //     if (provider === "ollama") {

  //       response = await OllamaService.chat(model, [
  //         {
  //           role: "system",
  //           content:
  //             "You are a BIDS dataset architect. Output only valid YAML without markdown fences or explanations.",
  //         },
  //         { role: "user", content: prompt },
  //       ]);
  //     } else if (currentProvider.isAnthropic) {
  //       response = await fetch(currentProvider.baseUrl, {
  //         method: "POST",
  //         signal: controller.signal,
  //         headers: {
  //           "Content-Type": "application/json",
  //           "x-api-key": apiKey,
  //           "anthropic-version": "2023-06-01",
  //         },
  //         body: JSON.stringify({
  //           model,
  //           max_tokens: 2048,
  //           messages: [{ role: "user", content: prompt }],
  //         }),
  //       });
  //     } else {
  //       response = await fetch(currentProvider.baseUrl, {
  //         method: "POST",
  //         signal: controller.signal,
  //         headers: {
  //           "Content-Type": "application/json",
  //           Authorization: `Bearer ${apiKey}`,
  //         },
  //         body: JSON.stringify({
  //           model,
  //           messages: [
  //             {
  //               role: "system",
  //               content:
  //                 "You are a BIDS dataset architect. Output only valid YAML without markdown fences or explanations.",
  //             },
  //             { role: "user", content: prompt },
  //           ],
  //           max_tokens: 2048,
  //           temperature: 0.15,
  //         }),
  //       });
  //     }

  //     const data = provider === "ollama" ? response : await response.json();
  //     if (!response.ok && provider !== "ollama") {
  //       throw new Error(data.error?.message || "Failed to generate BIDSPlan");
  //     }

  //     let plan = currentProvider.isAnthropic
  //       ? data.content[0].text
  //       : data.choices[0].message.content;

  //     // Clean up markdown fences if present
  //     plan = plan
  //       .replace(/^```yaml\n?/g, "")
  //       .replace(/\n?```$/g, "")
  //       .trim();

  //     setBidsPlan(plan);
  //     setStatus(`✓ BIDSPlan.yaml generated using ${currentProvider.name}`);
  //   } catch (err: any) {
  //     if (err.name === "AbortError") {
  //       setStatus("❌ Generation cancelled");
  //     } else {
  //       setError(err.message || "Failed to generate BIDSPlan");
  //       setStatus("❌ Error generating BIDSPlan");
  //     }
  //   } finally {
  //     setLoading(false);
  //     setAbortController(null);
  //   }
  // };

  const handleDownloadPlan = () => {
    const blob = new Blob([bidsPlan], { type: "text/yaml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "BIDSPlan.yaml";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setStatus("Cancelling...");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedScript);
    setStatus("✓ Copied to clipboard!");
    setTimeout(() => setStatus(""), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([generatedScript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bids_conversion_script.py";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPackage = async () => {
    const zip = new JSZip();
    // const outputDir = "outputs";

    // _staging/ files
    const ingestInfo = buildIngestInfo(baseDirectoryPath);
    zip.file("_staging/ingest_info.json", JSON.stringify(ingestInfo, null, 2));
    zip.file("_staging/BIDSPlan.yaml", bidsPlan); // your already-generated YAML
    zip.file(
      "_staging/evidence_bundle.json",
      JSON.stringify(evidenceBundle, null, 2)
    );
    zip.file(
      "_staging/subject_analysis.json",
      JSON.stringify(subjectAnalysis, null, 2) // ← was evidenceBundle.subject_analysis
    );
    // trio files (get content from the AI-generated FileItems)
    const dd = files.find(
      (f) =>
        (f.source === "ai" || f.source === "user") &&
        f.name === "dataset_description.json"
    );
    const readme = files.find(
      (f) =>
        (f.source === "ai" || f.source === "user") &&
        (f.name === "README.md" ||
          f.name === "README.txt" ||
          f.name === "README.rst" ||
          f.name === "readme.md")
    );
    const participants = files.find(
      (f) =>
        (f.source === "ai" || f.source === "user") &&
        f.name === "participants.tsv"
    );

    if (dd?.content) zip.file("dataset_description.json", dd.content);
    if (readme?.content) zip.file("README.md", readme.content);
    if (participants?.content)
      zip.file("participants.tsv", participants.content);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "outputs.zip";
    a.click();
    URL.revokeObjectURL(url);
  };

  // save zip
  const handleSaveZip = async () => {
    // Add output files to VFS
    const timestamp = new Date().toLocaleString();
    const zipLabel = `bids_output_${new Date().toISOString().slice(0, 10)}`;
    const outputFiles: FileItem[] = [];

    const folderId = generateId();
    outputFiles.push({
      id: folderId,
      name: zipLabel,
      type: "folder",
      parentId: null,
      source: "output",
      generatedAt: timestamp,
    });

    // _staging subfolder
    const stagingFolderId = generateId();
    outputFiles.push({
      id: stagingFolderId,
      name: "_staging",
      type: "folder",
      parentId: folderId, // ← child of root output folder
      source: "output",
      generatedAt: timestamp,
    });

    // Files inside _staging
    if (bidsPlan) {
      outputFiles.push({
        id: generateId(),
        name: "BIDSPlan.yaml",
        type: "file",
        fileType: "text",
        content: bidsPlan,
        parentId: stagingFolderId, // ← inside _staging
        source: "output",
        generatedAt: timestamp,
      });
    }

    if (evidenceBundle) {
      outputFiles.push({
        id: generateId(),
        name: "evidence_bundle.json",
        type: "file",
        fileType: "text",
        content: JSON.stringify(evidenceBundle, null, 2),
        parentId: stagingFolderId, // ← inside _staging
        source: "output",
        generatedAt: timestamp,
      });

      outputFiles.push({
        id: generateId(),
        name: "ingest_info.json",
        type: "file",
        fileType: "text",
        content: JSON.stringify(buildIngestInfo(baseDirectoryPath), null, 2),
        parentId: stagingFolderId, // ← inside _staging
        source: "output",
        generatedAt: timestamp,
      });

      if (subjectAnalysis) {
        // ← was evidenceBundle.subject_analysis
        outputFiles.push({
          id: generateId(),
          name: "subject_analysis.json",
          type: "file",
          fileType: "text",
          content: JSON.stringify(subjectAnalysis, null, 2), // ← was evidenceBundle.subject_analysis
          parentId: stagingFolderId, // ← inside _staging
          source: "output",
          generatedAt: timestamp,
        });
      }
    }
    // Trio files at root level (outside _staging)
    const dd = files.find(
      (f) =>
        (f.source === "ai" || f.source === "user") &&
        f.name === "dataset_description.json"
    );
    const readme = files.find(
      (f) =>
        (f.source === "ai" || f.source === "user") &&
        (f.name === "README.md" ||
          f.name === "README.txt" ||
          f.name === "README.rst" ||
          f.name === "readme.md")
    );
    const participants = files.find(
      (f) =>
        (f.source === "ai" || f.source === "user") &&
        f.name === "participants.tsv"
    );

    [dd, readme, participants].forEach((f) => {
      if (f?.content) {
        outputFiles.push({
          ...f,
          id: generateId(),
          parentId: folderId,
          source: "output",
          generatedAt: timestamp,
        });
      }
    });

    updateFiles((prev) => [...prev, ...outputFiles]);
    setStatus("✓ Saved to VFS. Click 'Save Changes' to persist to database.");
  };
  // const handleSaveZip = async () => {
  //   const zip = new JSZip();

  //   // _staging/ files
  //   const ingestInfo = buildIngestInfo(baseDirectoryPath);
  //   zip.file("_staging/ingest_info.json", JSON.stringify(ingestInfo, null, 2));
  //   zip.file("_staging/BIDSPlan.yaml", bidsPlan);
  //   zip.file(
  //     "_staging/evidence_bundle.json",
  //     JSON.stringify(evidenceBundle, null, 2)
  //   );
  //   zip.file(
  //     "_staging/subject_analysis.json",
  //     JSON.stringify(evidenceBundle.subject_analysis, null, 2)
  //   );

  //   // Declare trio files once, reuse for both zip and VFS
  //   const dd = files.find(
  //     (f) => f.source === "ai" && f.name === "dataset_description.json"
  //   );
  //   const readme = files.find(
  //     (f) => f.source === "ai" && f.name === "README.md"
  //   );
  //   const participants = files.find(
  //     (f) => f.source === "ai" && f.name === "participants.tsv"
  //   );

  //   // Add trio files to zip
  //   if (dd?.content) zip.file("dataset_description.json", dd.content);
  //   if (readme?.content) zip.file("README.md", readme.content);
  //   if (participants?.content)
  //     zip.file("participants.tsv", participants.content);

  //   const blob = await zip.generateAsync({ type: "blob" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = `bids_output_${new Date().toISOString().slice(0, 10)}.zip`;
  //   a.click();
  //   URL.revokeObjectURL(url);

  //   // Add output files to VFS
  //   const timestamp = new Date().toLocaleString();
  //   const zipLabel = `bids_output_${new Date().toISOString().slice(0, 10)}`;
  //   const outputFiles: FileItem[] = [];

  //   const folderId = generateId();
  //   outputFiles.push({
  //     id: folderId,
  //     name: zipLabel,
  //     type: "folder",
  //     parentId: null,
  //     source: "output",
  //     generatedAt: timestamp,
  //   });

  //   // Add trio files under the folder
  //   [dd, readme, participants].forEach((f) => {
  //     if (f?.content) {
  //       outputFiles.push({
  //         ...f,
  //         id: generateId(),
  //         parentId: folderId,
  //         source: "output",
  //         generatedAt: timestamp,
  //       });
  //     }
  //   });

  //   // Add BIDSPlan.yaml under the folder
  //   if (bidsPlan) {
  //     outputFiles.push({
  //       id: generateId(),
  //       name: "BIDSPlan.yaml",
  //       type: "file",
  //       fileType: "text",
  //       content: bidsPlan,
  //       parentId: folderId,
  //       source: "output",
  //       generatedAt: timestamp,
  //     });
  //   }

  //   updateFiles((prev) => [...prev, ...outputFiles]);
  // };

  return (
    <Paper
      sx={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: `${panelHeight}px`,
        zIndex: 1000,
        borderTop: 2,
        borderColor: Colors.purple,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Resize Handle */}
      <Box
        onMouseDown={handleMouseDown}
        sx={{
          height: 6,
          backgroundColor: isResizing ? Colors.lightGray : Colors.lightGray,
          cursor: "ns-resize",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          "&:hover": {
            backgroundColor: Colors.lightGray,
          },
        }}
      >
        <Box
          sx={{
            width: 40,
            height: 3,
            backgroundColor: Colors.secondaryPurple,
          }}
        />
      </Box>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: "divider",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography
          variant="h6"
          sx={{ display: "flex", alignItems: "center", gap: 1 }}
        >
          <AutoAwesome sx={{ color: Colors.purple }} />
          AI-Generated BIDS Conversion Script
        </Typography>
        <IconButton onClick={onClose} size="small">
          <Close />
        </IconButton>
      </Box>

      {/* Content */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left: Configuration */}
        <Box
          sx={{
            width: 400,
            p: 2,
            borderRight: 1,
            borderColor: "divider",
            overflow: "auto",
          }}
        >
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>LLM Provider</InputLabel>
            <Select
              value={provider}
              label="LLM Provider"
              onChange={(e) => {
                setProvider(e.target.value);
                setModel(llmProviders[e.target.value].models[0].id);
              }}
            >
              {Object.entries(llmProviders).map(([key, p]) => (
                <MenuItem key={key} value={key}>
                  {p.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Model</InputLabel>
            <Select
              value={model}
              label="Model"
              onChange={(e) => setModel(e.target.value)}
            >
              {currentProvider.models.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Ollama Server URL field */}
          {/* {provider === "ollama" && (
            <TextField
              fullWidth
              label="Ollama Server URL"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              sx={{ mb: 2 }}
            />
          )} */}
          {/* Base Directory Path field (shows for ALL providers) */}
          <TextField
            fullWidth
            required
            label="Directory Path (required)"
            value={baseDirectoryPath}
            onChange={(e) => setBaseDirectoryPath(e.target.value)}
            placeholder="Enter the folder path where these files are located"
            helperText="e.g., /Users/name/datasets/study1 or C:\Data\Study1"
            sx={{ mb: 2 }}
          />

          {!currentProvider.noApiKey && (
            <TextField
              fullWidth
              type="password"
              label="API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key..."
              sx={{ mb: 2 }}
            />
          )}

          {/* Step-by-step workflow buttons */}
          <Box
            sx={{
              mb: 2,
              p: 2,
              backgroundColor: "rgba(128, 90, 213, 0.05)",
              borderRadius: 1,
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mb: 1, display: "block" }}
            >
              Workflow Steps:
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              <TextField
                label="Number of subjects (required)*"
                placeholder="e.g. 2"
                value={nSubjects}
                onChange={(e) => {
                  setNSubjects(e.target.value);
                  setNSubjectsError(false);
                }}
                type="number"
                size="small"
                error={nSubjectsError}
                helperText={nSubjectsError ? "Required" : ""}
                inputProps={{ min: 1 }}
                sx={{ mb: 1 }}
              />

              <FormControl size="small" error={modalityError} sx={{ mb: 1 }}>
                <InputLabel>Modality (required)*</InputLabel>
                <Select
                  value={modalityHint}
                  onChange={(e) => {
                    setModalityHint(e.target.value);
                    setModalityError(false);
                  }}
                  label="Modality (required)*"
                >
                  <MenuItem value="">
                    <em>Select modality</em>
                  </MenuItem>
                  <MenuItem value="mri">MRI</MenuItem>
                  <MenuItem value="nirs">NIRS</MenuItem>
                  <MenuItem value="mixed">Mixed</MenuItem>
                </Select>
                {modalityError && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ mt: 0.5, ml: 1.5 }}
                  >
                    Required
                  </Typography>
                )}
              </FormControl>

              <TextField
                label="Describe your dataset (optional)"
                placeholder='e.g. "DICOM files from 2 subjects, one male one female"'
                value={describeText}
                onChange={(e) => setDescribeText(e.target.value)}
                size="small"
                multiline
                rows={2}
                sx={{ mb: 1 }}
              />
              <Button
                fullWidth
                size="small"
                variant={evidenceBundle ? "contained" : "outlined"}
                onClick={handleGenerateEvidence}
                disabled={!baseDirectoryPath.trim() || generatingEvidence}
                startIcon={
                  generatingEvidence ? <CircularProgress size={16} /> : null
                }
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  backgroundColor: evidenceBundle
                    ? Colors.darkGreen
                    : "transparent",
                  borderColor: Colors.purple,
                  color: evidenceBundle ? "white" : Colors.purple,
                  "&:hover": {
                    backgroundColor: evidenceBundle
                      ? Colors.darkGreen
                      : "rgba(128, 90, 213, 0.1)",
                  },
                }}
              >
                {generatingEvidence
                  ? "Generating..."
                  : evidenceBundle
                  ? "✓  1. Generate Evidence Bundle"
                  : "1. Generate Evidence Bundle"}
              </Button>

              <Button
                fullWidth
                size="small"
                variant={trioGenerated ? "contained" : "outlined"}
                onClick={handleGenerateTrio}
                disabled={!evidenceBundle || generatingTrio}
                startIcon={
                  generatingTrio ? <CircularProgress size={16} /> : null
                }
                sx={{
                  justifyContent: "flex-start",
                  textTransform: "none",
                  backgroundColor: trioGenerated
                    ? Colors.darkGreen
                    : "transparent",
                  borderColor: Colors.purple,
                  color: trioGenerated ? "white" : Colors.purple,
                  "&:hover": {
                    backgroundColor: trioGenerated
                      ? Colors.darkGreen
                      : "rgba(128, 90, 213, 0.1)",
                  },
                }}
              >
                {generatingTrio
                  ? "Generating..."
                  : trioGenerated
                  ? "✓  2. Generate BIDS Trio"
                  : "2. Generate BIDS Trio"}
              </Button>
              {/* <Typography
                variant="body2"
                sx={{
                  textAlign: "left",
                  color: trioGenerated ? Colors.purple : Colors.lightGray,
                  py: 1,
                }}
              >
                Ready to Generate Script ↓
              </Typography> */}
            </Box>
          </Box>

          <Button
            fullWidth
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={20} /> : <AutoAwesome />
            }
            onClick={handleGeneratePlan}
            disabled={loading || !baseDirectoryPath.trim() || !trioGenerated}
            sx={{
              background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.secondaryPurple} 100%)`,
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.secondaryPurple} 0%, ${Colors.purple} 100%)`,
              },
              "&.Mui-disabled": { background: "#e0e0e0", color: "#9e9e9e" },
            }}
          >
            {loading ? "Generating..." : "3. Generate BIDSPlan.yaml"}
          </Button>

          {/* <Button
            fullWidth
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={20} /> : <AutoAwesome />
            }
            onClick={handleGenerate}
            disabled={loading || !baseDirectoryPath.trim() || !trioGenerated}
            sx={{
              background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.secondaryPurple} 100%)`,
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.secondaryPurple} 0%, ${Colors.purple} 100%)`,
              },
              "&.Mui-disabled": {
                background: "#e0e0e0",
                color: "#9e9e9e",
              },
            }}
          >
            {loading ? "Generating..." : "3b. Generate Script"}
          </Button> */}

          {/* cancel button*/}
          {(generatingTrio || loading) && (
            <Button
              fullWidth
              variant="outlined"
              onClick={handleCancel}
              sx={{
                borderColor: Colors.rose,
                color: Colors.rose,
                "&:hover": {
                  backgroundColor: "rgba(211, 47, 47, 0.1)",
                },
              }}
            >
              Cancel
            </Button>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}

          {status && !error && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 2, display: "block" }}
            >
              {status}
            </Typography>
          )}
        </Box>

        {/* Right: Generated Script */}
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column", p: 2 }}>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Button
              size="small"
              startIcon={<ContentCopy />}
              // onClick={handleCopy}
              // disabled={!generatedScript}
              onClick={() =>
                navigator.clipboard.writeText(bidsPlan || generatedScript)
              }
              disabled={!bidsPlan && !generatedScript}
            >
              Copy
            </Button>
            {/* <Button
              size="small"
              startIcon={<Download />}
              // onClick={handleDownload}
              // disabled={!generatedScript}
              onClick={bidsPlan ? handleDownloadPlan : handleDownload}
              disabled={!bidsPlan && !generatedScript}
            >
              {bidsPlan ? "Download BIDSPlan.yaml" : "Download Script"}
            </Button> */}
            <Button
              size="small"
              startIcon={<Download />}
              onClick={handleDownloadPackage}
              disabled={!bidsPlan && !generatingTrio}
            >
              {/* Download */}
              Download zip file for convert
            </Button>
            <Button
              size="small"
              startIcon={<DriveFileMove />}
              onClick={handleSaveZip}
              disabled={!bidsPlan || !trioGenerated}
              sx={{ color: Colors.darkGreen, borderColor: Colors.darkGreen }}
            >
              Save to Virtual File System
            </Button>
          </Box>

          <Paper
            variant="outlined"
            sx={{
              flex: 1,
              p: 2,
              overflow: "auto",
              fontFamily: "monospace",
              fontSize: "0.875rem",
              backgroundColor: "#1e1e1e",
              color: "#d4d4d4",
            }}
          >
            {/* {generatedScript ||
              'Configure your LLM provider and click "Generate Script"...'} */}
            {bidsPlan ||
              generatedScript ||
              'Configure your LLM provider and click "Generate BIDSPlan.yaml"...'}
          </Paper>
        </Box>
      </Box>
    </Paper>
  );
};

export default LLMPanel;
