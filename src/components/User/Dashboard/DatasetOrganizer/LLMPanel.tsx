import { generateId } from "./utils/fileProcessors";
import { extractSubjectAnalysis } from "./utils/filenameTokenizer";
//add
import {
  buildFileSummary,
  analyzeFilePatterns,
  getUserContext,
  getFileAnnotations,
  downloadJSON,
  buildEvidenceBundle,
  extractSubjectsFromFiles,
  buildIngestInfo,
} from "./utils/llmHelpers";
import {
  getDatasetDescriptionPrompt,
  getReadmePrompt,
  getParticipantsPrompt,
  getConversionScriptPrompt,
  getBIDSPlanPrompt,
} from "./utils/llmPrompts";
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
import JSZip from "jszip";
import React, { useState, useEffect } from "react";
import { FileItem } from "redux/projects/types/projects.interface";
import { OllamaService } from "services/ollama.service";

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
  customUrl?: boolean;
}

const llmProviders: Record<string, LLMProvider> = {
  ollama: {
    name: "Ollama (Local Server)",
    baseUrl: "http://localhost:11434/v1/chat/completions",
    models: [
      { id: "qwen3-coder-next:latest", name: "Qwen 3 Coder Next" }, // ← add
      { id: "qwen3-coder-careful:latest", name: "Qwen 3 Coder Careful" }, // ← add
      // { id: "qwen3-coder:30b", name: "Qwen 3 Coder" },
      // { id: "qwen2.5-coder:latest", name: "Qwen 2.5 Coder" },
      // { id: "codellama:latest", name: "Code Llama" },
      // { id: "llama3.1:latest", name: "Llama 3.1" },
      // { id: "mistral:latest", name: "Mistral" },
      // { id: "deepseek-coder:latest", name: "DeepSeek Coder" },
    ],
    noApiKey: true,
    customUrl: true,
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
  const [model, setModel] = useState<string>("qwen3-coder:30b");
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

    // Create abort controller
    const controller = new AbortController();
    setAbortController(controller);

    setGeneratingTrio(true);
    setError(null);
    setStatus("Generating BIDS trio files...");

    try {
      const userText = evidenceBundle.user_hints.user_text || "";

      // ==========================================
      // Call 1: Generate dataset_description.json
      // ==========================================
      let datasetDesc: any;
      if (evidenceBundle.trio_found?.["dataset_description.json"]) {
        setStatus("1/3 dataset_description.json already exists, skipping...");
        const existing = files.find(
          (f) => f.source === "user" && f.name === "dataset_description.json"
        );
        datasetDesc = existing?.content ? JSON.parse(existing.content) : {};
      } else {
        setStatus("1/3 Generating dataset_description.json...");
        const ddPrompt = getDatasetDescriptionPrompt(userText, evidenceBundle);

        let ddResponse;
        if (currentProvider.isAnthropic) {
          ddResponse = await fetch(currentProvider.baseUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 2048,
              messages: [{ role: "user", content: ddPrompt }],
            }),
          });
        } else if (provider === "ollama") {
          // const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
          // ddResponse = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
          //   method: "POST",
          //   signal: controller.signal,
          //   headers: { "Content-Type": "application/json" },
          //   body: JSON.stringify({
          //     model,
          //     messages: [{ role: "user", content: ddPrompt }],
          //     stream: false,
          //   }),
          // });
          ddResponse = await OllamaService.chat(model, [
            { role: "user", content: ddPrompt },
          ]);
        } else {
          ddResponse = await fetch(currentProvider.baseUrl, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: ddPrompt }],
              max_tokens: 2048,
            }),
          });
        }

        // const ddData = await ddResponse.json();
        const ddData =
          provider === "ollama" ? ddResponse : await ddResponse.json();
        let ddText = currentProvider.isAnthropic
          ? ddData.content[0].text
          : ddData.choices[0].message.content;

        // Clean up markdown fences
        ddText = ddText
          .replace(/^```json\n?/g, "")
          .replace(/\n?```$/g, "")
          .trim();
        datasetDesc = JSON.parse(ddText);
      }

      // ==========================================
      // Call 2: Generate README.md
      // ==========================================
      let readmeContent: string;
      if (evidenceBundle.trio_found?.["README.md"]) {
        setStatus("2/3 README.md already exists, skipping...");
        const existing = files.find(
          (f) =>
            f.source === "user" &&
            ["README.md", "README.txt", "README.rst", "readme.md"].includes(
              f.name
            )
        );
        readmeContent = existing?.content || "";
      } else {
        setStatus("2/3 Generating README.md...");
        const readmePrompt = getReadmePrompt(userText);

        let readmeResponse;
        if (currentProvider.isAnthropic) {
          readmeResponse = await fetch(currentProvider.baseUrl, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 2048,
              messages: [{ role: "user", content: readmePrompt }],
            }),
          });
        } else if (provider === "ollama") {
          // const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
          // readmeResponse = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
          //   method: "POST",
          //   signal: controller.signal,
          //   headers: { "Content-Type": "application/json" },
          //   body: JSON.stringify({
          //     model,
          //     messages: [{ role: "user", content: readmePrompt }],
          //     stream: false,
          //   }),
          // });
          readmeResponse = await OllamaService.chat(model, [
            { role: "user", content: readmePrompt },
          ]);
        } else {
          readmeResponse = await fetch(currentProvider.baseUrl, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: readmePrompt }],
              max_tokens: 2048,
            }),
          });
        }

        // const readmeData = await readmeResponse.json();
        const readmeData =
          provider === "ollama" ? readmeResponse : await readmeResponse.json();
        readmeContent = currentProvider.isAnthropic
          ? readmeData.content[0].text
          : readmeData.choices[0].message.content;
      }
      // ==========================================
      // Call 3: Generate participants.tsv
      // ==========================================
      let participantsContent: string;
      if (evidenceBundle.trio_found?.["participants.tsv"]) {
        setStatus("3/3 participants.tsv already exists, skipping...");
        const existing = files.find(
          (f) => f.source === "user" && f.name === "participants.tsv"
        );
        participantsContent = existing?.content || "";
      } else {
        setStatus("3/3 Generating participants.tsv...");
        const partsPrompt = getParticipantsPrompt(userText);

        let partsResponse;
        if (currentProvider.isAnthropic) {
          partsResponse = await fetch(currentProvider.baseUrl, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
              "anthropic-version": "2023-06-01",
            },
            body: JSON.stringify({
              model,
              max_tokens: 1024,
              messages: [{ role: "user", content: partsPrompt }],
            }),
          });
        } else if (provider === "ollama") {
          // const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
          // partsResponse = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
          //   method: "POST",
          //   signal: controller.signal,
          //   headers: { "Content-Type": "application/json" },
          //   body: JSON.stringify({
          //     model,
          //     messages: [{ role: "user", content: partsPrompt }],
          //     stream: false,
          //   }),
          // });
          partsResponse = await OllamaService.chat(model, [
            { role: "user", content: partsPrompt },
          ]);
        } else {
          partsResponse = await fetch(currentProvider.baseUrl, {
            method: "POST",
            signal: controller.signal,
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: partsPrompt }],
              max_tokens: 1024,
            }),
          });
        }

        // const partsData = await partsResponse.json();
        const partsData =
          provider === "ollama" ? partsResponse : await partsResponse.json();
        const participantsRaw = currentProvider.isAnthropic
          ? partsData.content[0].text
          : partsData.choices[0].message.content;

        // Build TSV from schema
        try {
          const schemaText = participantsRaw
            .replace(/^```json\n?/g, "")
            .replace(/\n?```$/g, "")
            .trim();
          const schema = JSON.parse(schemaText);
          const columns: string[] = schema.columns.map((c: any) => c.name);

          // Get subject IDs from evidence bundle (extracted by Python-style analysis)
          // const idMapping =
          //   evidenceBundle?.subject_analysis?.id_mapping?.id_mapping;
          // const subjectLabels: string[] = idMapping
          //   ? Object.values(idMapping).map((id) => `sub-${id}`)
          //   : ["sub-01"]; // fallback if no subject analysis
          // Get subject IDs from subjectAnalysis state (computed at plan stage)
          // Fall back to computing fresh if plan hasn't been run yet
          const currentSubjectAnalysis =
            subjectAnalysis ||
            extractSubjectAnalysis(
              evidenceBundle?.all_files || [],
              evidenceBundle?.user_hints?.n_subjects,
              evidenceBundle?.filename_analysis?.python_statistics
                ?.dominant_prefixes
            );
          const idMap = currentSubjectAnalysis?.id_mapping?.id_mapping;
          const subjectLabels: string[] =
            idMap && Object.keys(idMap).length > 0
              ? Object.values(idMap).map((id) => `sub-${id}`)
              : Array.from(
                  { length: evidenceBundle?.user_hints?.n_subjects || 1 },
                  (_, i) => `sub-${String(i + 1).padStart(2, "0")}`
                );

          const header = columns.join("\t");
          const rows = subjectLabels.map((subId) =>
            columns
              .map((col: string) => (col === "participant_id" ? subId : "n/a"))
              .join("\t")
          );
          participantsContent = [header, ...rows].join("\n");
        } catch (e) {
          // Fallback: LLM didn't return valid JSON schema, use raw content
          participantsContent = participantsRaw
            .replace(/^```\n?/g, "")
            .replace(/\n?```$/g, "")
            .trim();
        }
      }
      // ==========================================
      // Add trio files to Virtual File System
      // ==========================================
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
          content: readmeContent
            .replace(/^```markdown\n?/g, "")
            .replace(/\n?```$/g, "")
            .trim(),
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
          content: participantsContent
            .replace(/^```\n?/g, "")
            .replace(/\n?```$/g, "")
            .trim(),
          contentType: "text",
          isUserMeta: true,
          parentId: null,
          source: "ai",
          generatedAt: timestamp,
        },
      ];
      // replace existing trio files, add if not exist
      updateFiles((prev) => {
        const trioNames = [
          "dataset_description.json",
          "README.md",
          "participants.tsv",
        ];

        // Remove old AI generated trio files
        const withoutOldTrio = prev.filter(
          (f) => !(f.source === "ai" && trioNames.includes(f.name))
        );

        // Add new trio files
        // return [...withoutOldTrio, ...trioFiles];

        // Only add AI-generated files for ones that weren't user-uploaded
        const newTrioFiles = trioFiles.filter(
          (tf) =>
            !evidenceBundle.trio_found?.[
              tf.name as keyof typeof evidenceBundle.trio_found
            ]
        );

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
      setAbortController(null); // Clear controller
    }
  };

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

  const handleGenerate = async () => {
    if (!currentProvider.noApiKey && !apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    if (!baseDirectoryPath.trim()) {
      setError("Please enter a base directory path");
      return;
    }

    // Create abort controller
    const controller = new AbortController();
    setAbortController(controller);

    setLoading(true);
    setError(null);
    setStatus(`Generating script using ${currentProvider.name}...`);

    const fileSummary = buildFileSummary(files);
    const filePatterns = analyzeFilePatterns(files);
    const userContext = getUserContext(files);
    const annotations = getFileAnnotations(files);
    // console.log("=== PROMPT BEING SENT TO LLM ===");
    // console.log(fileSummary);
    // console.log(filePatterns);
    // console.log(userContext);
    // console.log("=================================");

    // UPDATED: Improved prompt that uses trio files
    const prompt = getConversionScriptPrompt(
      baseDirectoryPath,
      fileSummary,
      filePatterns,
      userContext,
      annotations
    );

    try {
      let response;

      if (provider === "ollama") {
        // const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
        // response = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
        //   method: "POST",
        //   signal: controller.signal,
        //   headers: {
        //     "Content-Type": "application/json",
        //   },
        //   body: JSON.stringify({
        //     model,
        //     messages: [
        //       {
        //         role: "system",
        //         content:
        //           "You are a neuroimaging data expert specializing in BIDS format conversion. Output only Python code without markdown fences or explanations.",
        //       },
        //       { role: "user", content: prompt },
        //     ],
        //     stream: false,
        //   }),
        // });
        response = await OllamaService.chat(model, [
          {
            role: "system",
            content:
              "You are a neuroimaging data expert specializing in BIDS format conversion. Output only Python code without markdown fences or explanations.",
          },
          { role: "user", content: prompt },
        ]);
      } else if (currentProvider.isAnthropic) {
        response = await fetch(currentProvider.baseUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 4096,
            messages: [{ role: "user", content: prompt }],
          }),
        });
      } else {
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };

        if (!currentProvider.noApiKey) {
          headers["Authorization"] = `Bearer ${apiKey}`;
        }

        response = await fetch(currentProvider.baseUrl, {
          method: "POST",
          signal: controller.signal,
          headers,
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a neuroimaging data expert specializing in BIDS format conversion. Output only Python code without markdown fences or explanations.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 4096,
            temperature: 0.7,
          }),
        });
      }

      // const data = await response.json();
      const data = provider === "ollama" ? response : await response.json();

      // if (!response.ok) {
      //   throw new Error(data.error?.message || "Failed to generate script");
      // }
      if (!response.ok && provider !== "ollama") {
        throw new Error(data.error?.message || "Failed to generate script");
      }

      // let script = "";
      // if (currentProvider.isAnthropic) {
      //   script = data.content[0].text;
      // } else {
      //   script = data.choices[0].message.content;
      // }
      let script = currentProvider.isAnthropic
        ? data.content[0].text
        : data.choices[0].message.content;

      // Clean up markdown fences if AI included them anyway
      script = script.replace(/^```python\n?/g, "").replace(/\n?```$/g, "");

      setGeneratedScript(script);
      setStatus(`✓ Script generated using ${currentProvider.name}`);
    } catch (err: any) {
      if (err.name === "AbortError") {
        setStatus("❌ Generation cancelled");
      } else {
        setError(err.message || "Failed to generate script");
        setStatus("❌ Error generating script");
      }
    } finally {
      setLoading(false);
      setAbortController(null); // Clear controller
    }
  };

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

    // ── Compute subject analysis (mirrors planner.py Step 1)
    const allFiles = evidenceBundle?.all_files || [];
    const userNSubjects = evidenceBundle?.user_hints?.n_subjects;
    const dominantPrefixes =
      evidenceBundle?.filename_analysis?.python_statistics?.dominant_prefixes;

    const computedSubjectAnalysis = extractSubjectAnalysis(
      allFiles,
      userNSubjects,
      dominantPrefixes
    );
    setSubjectAnalysis(computedSubjectAnalysis);

    const fileSummary = buildFileSummary(files);
    const filePatterns = analyzeFilePatterns(files);
    const userContext = getUserContext(files);
    // const subjectInfo = extractSubjectsFromFiles(files);
    const subjectInfo = computedSubjectAnalysis;
    const sampleFiles =
      evidenceBundle?.samples
        ?.slice(0, 10)
        .map((s: any) => `  - ${s.relpath}`)
        .join("\n") || "";

    // console.log("=== SAMPLE FILES ===");
    // console.log(sampleFiles);
    // console.log("=== COUNTS BY EXT ===");
    // console.log(evidenceBundle?.counts_by_ext);

    const prompt = getBIDSPlanPrompt(
      fileSummary,
      filePatterns,
      userContext,
      {
        subjects: Object.entries(
          computedSubjectAnalysis.id_mapping.id_mapping
        ).map(([originalId, bidsId]) => ({ originalId, bidsId })),
        strategy: computedSubjectAnalysis.id_mapping.strategy_used,
      },
      evidenceBundle?.counts_by_ext || {},
      sampleFiles,
      evidenceBundle
    );

    try {
      let response;

      if (provider === "ollama") {
        // const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
        // response = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
        //   method: "POST",
        //   signal: controller.signal,
        //   headers: { "Content-Type": "application/json" },
        //   body: JSON.stringify({
        //     model,
        //     messages: [
        //       {
        //         role: "system",
        //         content:
        //           "You are a BIDS dataset architect. Output only valid YAML without markdown fences or explanations.",
        //       },
        //       { role: "user", content: prompt },
        //     ],
        //     stream: false,
        //   }),
        // });
        response = await OllamaService.chat(model, [
          {
            role: "system",
            content:
              "You are a BIDS dataset architect. Output only valid YAML without markdown fences or explanations.",
          },
          { role: "user", content: prompt },
        ]);
      } else if (currentProvider.isAnthropic) {
        response = await fetch(currentProvider.baseUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: 2048,
            messages: [{ role: "user", content: prompt }],
          }),
        });
      } else {
        response = await fetch(currentProvider.baseUrl, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a BIDS dataset architect. Output only valid YAML without markdown fences or explanations.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: 2048,
            temperature: 0.15,
          }),
        });
      }

      // const data = await response.json();

      // if (!response.ok) {
      //   throw new Error(data.error?.message || "Failed to generate BIDSPlan");
      // }
      const data = provider === "ollama" ? response : await response.json();
      if (!response.ok && provider !== "ollama") {
        throw new Error(data.error?.message || "Failed to generate BIDSPlan");
      }

      let plan = currentProvider.isAnthropic
        ? data.content[0].text
        : data.choices[0].message.content;

      // Clean up markdown fences if present
      plan = plan
        .replace(/^```yaml\n?/g, "")
        .replace(/\n?```$/g, "")
        .trim();

      setBidsPlan(plan);
      setStatus(`✓ BIDSPlan.yaml generated using ${currentProvider.name}`);
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

              {/* <TextField
                label="Describe your dataset (optional)"
                placeholder='e.g. "DICOM files from 2 subjects, one male one female"'
                value={describeText}
                onChange={(e) => setDescribeText(e.target.value)}
                size="small"
                multiline
                rows={2}
              /> */}
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
