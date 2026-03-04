import { generateId } from "./utils/fileProcessors";
//add
import {
  buildFileSummary,
  analyzeFilePatterns,
  getUserContext,
  getFileAnnotations,
  downloadJSON,
  buildEvidenceBundle,
} from "./utils/llmHelpers";
import {
  getDatasetDescriptionPrompt,
  getReadmePrompt,
  getParticipantsPrompt,
  getConversionScriptPrompt,
} from "./utils/llmPrompts";
import { Close, ContentCopy, Download, AutoAwesome } from "@mui/icons-material";
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
import React, { useState, useEffect } from "react";
import { FileItem } from "redux/projects/types/projects.interface";

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
      { id: "qwen3-coder:30b", name: "Qwen 3 Coder" },
      { id: "qwen2.5-coder:latest", name: "Qwen 2.5 Coder" },
      { id: "codellama:latest", name: "Code Llama" },
      { id: "llama3.1:latest", name: "Llama 3.1" },
      { id: "mistral:latest", name: "Mistral" },
      { id: "deepseek-coder:latest", name: "DeepSeek Coder" },
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
  const [ollamaUrl, setOllamaUrl] = useState<string>(
    "http://huo.neu.edu:11434"
  );
  const [apiKey, setApiKey] = useState<string>("");
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [loading, setLoading] = useState(false); // add loading spin to generate script button
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [generatingEvidence, setGeneratingEvidence] = useState(false); // Add loading spin to evidence button
  const [generatingTrio, setGeneratingTrio] = useState(false); // Add loading spin to trio button
  const [abortController, setAbortController] =
    useState<AbortController | null>(null); // ✅ Add this

  const [panelHeight, setPanelHeight] = useState<number>(350);
  const [isResizing, setIsResizing] = useState(false);

  // Helper functions
  // const getCountsByExtension = (): Record<string, number> => {
  //   const counts: Record<string, number> = {};
  //   files.forEach((f) => {
  //     const ext = f.fileType || "unknown";
  //     counts[ext] = (counts[ext] || 0) + 1;
  //   });
  //   return counts;
  // };

  // const detectModality = (): string => {
  //   const counts = getCountsByExtension();
  //   if (counts.nifti > 0) return "mri";
  //   if (counts.hdf5 > 0 || files.some((f) => f.name.endsWith(".snirf")))
  //     return "nirs";
  //   return "mixed";
  // };

  // const getUserContextText = (): string => {
  //   const readme = files.find((f) => f.name.toLowerCase().includes("readme"));
  //   const instructions = files.find(
  //     (f) =>
  //       f.name.toLowerCase().includes("conversion") ||
  //       f.name.toLowerCase().includes("instruction")
  //   );
  //   const participants = files.find((f) =>
  //     f.name.toLowerCase().includes("participant")
  //   );

  //   const parts = [];
  //   if (readme?.content) parts.push(`README:\n${readme.content}`);
  //   if (instructions?.content)
  //     parts.push(`INSTRUCTIONS:\n${instructions.content}`);
  //   if (participants?.content)
  //     parts.push(`PARTICIPANTS:\n${participants.content}`);

  //   return parts.join("\n\n");
  // };

  // ========================================================================
  // BUTTON 1: GENERATE EVIDENCE BUNDLE
  // ========================================================================
  const handleGenerateEvidence = () => {
    if (!baseDirectoryPath.trim()) {
      setError("Please enter a base directory path first");
      return;
    }

    setGeneratingEvidence(true); // ✅ Add this
    setError(null);
    setStatus("Building evidence bundle..."); // ✅ Add this
    try {
      //modify
      // const bundle = {
      //   root: baseDirectoryPath,
      //   counts_by_ext: getCountsByExtension(),
      //   all_files: files
      //     .filter((f) => !f.isUserMeta)
      //     .map((f) => f.sourcePath || f.name),
      //   documents: files
      //     .filter(
      //       (f) => f.content && ["text", "office"].includes(f.fileType || "")
      //     )
      //     .map((f) => ({
      //       relpath: f.sourcePath || f.name,
      //       filename: f.name,
      //       type: f.fileType || "unknown",
      //       content: f.content || "",
      //     })),
      //   user_hints: {
      //     user_text: getUserContextText(),
      //     modality_hint: detectModality(),
      //     n_subjects: null,
      //   },
      // };
      // ✅ Add this debug block
      console.log("=== FILES GOING INTO buildEvidenceBundle ===");
      console.log("Total files:", files.length);
      console.log(
        "Files with content:",
        files.filter((f) => !!f.content).length
      );
      console.log(
        "Files by fileType:",
        files.reduce((acc, f) => {
          acc[f.fileType || "undefined"] =
            (acc[f.fileType || "undefined"] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      );
      console.log(
        "isUserMeta files:",
        files.filter((f) => f.isUserMeta).map((f) => f.name)
      );
      // ==========================================
      const bundle = buildEvidenceBundle(files, baseDirectoryPath);

      setEvidenceBundle(bundle);
      downloadJSON(bundle, "evidence_bundle.json");
      setStatus("✓ Evidence bundle generated and downloaded!");
    } catch (err: any) {
      setError("Failed to generate evidence bundle"); // ✅ Add this
    } finally {
      setGeneratingEvidence(false); // ✅ Add this
    }
  };

  // ========================================================================
  // BUTTON 2: GENERATE BIDS TRIO
  // ========================================================================

  // Button 2: Generate BIDS Trio with LLM calls
  const handleGenerateTrio = async () => {
    if (!evidenceBundle) {
      setError("Please generate evidence bundle first");
      return;
    }

    if (!currentProvider.noApiKey && !apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    // ✅ Create abort controller
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
      setStatus("1/3 Generating dataset_description.json...");
      const ddPrompt = getDatasetDescriptionPrompt(userText);
      //       const ddPrompt = `You are a BIDS dataset_description.json generator.

      // EXTRACT from the following user-provided content:
      // ${userText}

      // Generate a valid dataset_description.json with these fields:
      // - Name: Extract dataset name from content
      // - BIDSVersion: Use "1.10.0"
      // - DatasetType: Use "raw"
      // - License: Extract or use "PD"
      // - Authors: Extract author names (must be array)

      // OUTPUT: Valid JSON only (no markdown, no explanations)`;

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
        const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
        ddResponse = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
          method: "POST",
          signal: controller.signal, // ✅ Add to all fetch calls
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: ddPrompt }],
          }),
        });
      } else {
        ddResponse = await fetch(currentProvider.baseUrl, {
          method: "POST",
          signal: controller.signal, // ✅ Add to all fetch calls
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

      const ddData = await ddResponse.json();
      let ddText = currentProvider.isAnthropic
        ? ddData.content[0].text
        : ddData.choices[0].message.content;

      // Clean up markdown fences
      ddText = ddText
        .replace(/^```json\n?/g, "")
        .replace(/\n?```$/g, "")
        .trim();
      const datasetDesc = JSON.parse(ddText);

      // ==========================================
      // Call 2: Generate README.md
      // ==========================================
      setStatus("2/3 Generating README.md...");
      const readmePrompt = getReadmePrompt(userText);
      //       const readmePrompt = `Generate a BIDS README.md file.

      // USER CONTEXT:
      // ${userText}

      // Create a comprehensive README with sections:
      // - Overview (use user context)
      // - Dataset Description
      // - File Organization
      // - Usage Notes

      // OUTPUT: Direct Markdown text (no JSON wrapper, no code fences)`;

      let readmeResponse;
      if (currentProvider.isAnthropic) {
        readmeResponse = await fetch(currentProvider.baseUrl, {
          method: "POST",
          signal: controller.signal, // ✅ Add to all fetch calls
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
        const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
        readmeResponse = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
          method: "POST",
          signal: controller.signal, // ✅ Add to all fetch calls
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: readmePrompt }],
          }),
        });
      } else {
        readmeResponse = await fetch(currentProvider.baseUrl, {
          method: "POST",
          signal: controller.signal, // ✅ Add to all fetch calls
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

      const readmeData = await readmeResponse.json();
      const readmeContent = currentProvider.isAnthropic
        ? readmeData.content[0].text
        : readmeData.choices[0].message.content;

      // ==========================================
      // Call 3: Generate participants.tsv
      // ==========================================
      setStatus("3/3 Generating participants.tsv...");
      const partsPrompt = getParticipantsPrompt(userText);
      //       const partsPrompt = `Generate a BIDS participants.tsv file.

      // USER CONTEXT:
      // ${userText}

      // Extract participant information (IDs, demographics).
      // If no info available, create basic: participant_id\\nsub-01

      // OUTPUT: Direct TSV text (no JSON, no code fences)`;

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
        const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
        partsResponse = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model,
            messages: [{ role: "user", content: partsPrompt }],
          }),
        });
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

      const partsData = await partsResponse.json();
      const participantsContent = currentProvider.isAnthropic
        ? partsData.content[0].text
        : partsData.choices[0].message.content;

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
        return [...withoutOldTrio, ...trioFiles];
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
    console.log("=== PROMPT BEING SENT TO LLM ===");
    console.log(fileSummary);
    console.log(filePatterns);
    console.log(userContext);
    console.log("=================================");

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
        const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
        response = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
          },
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
            stream: false,
          }),
        });
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || "Failed to generate script");
      }

      let script = "";
      if (currentProvider.isAnthropic) {
        script = data.content[0].text;
      } else {
        script = data.choices[0].message.content;
      }

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

  return (
    <Paper
      sx={{
        position: "fixed",
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
            // borderRadius: 2,
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
          {provider === "ollama" && (
            <TextField
              fullWidth
              label="Ollama Server URL"
              value={ollamaUrl}
              onChange={(e) => setOllamaUrl(e.target.value)}
              placeholder="http://localhost:11434"
              sx={{ mb: 2 }}
            />
          )}
          {/* ADD THIS: Base Directory Path field (shows for ALL providers) */}
          <TextField
            fullWidth
            required
            label="Base Directory Path (required)"
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
              <Button
                fullWidth
                size="small"
                variant={evidenceBundle ? "contained" : "outlined"}
                onClick={handleGenerateEvidence}
                disabled={!baseDirectoryPath.trim() || generatingEvidence} // ✅ Add || generatingEvidence
                startIcon={
                  generatingEvidence ? <CircularProgress size={16} /> : null
                } // ✅ Add this
                // disabled={!baseDirectoryPath.trim()}
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
                {/* {evidenceBundle ? "✓" : "1."} Generate Evidence Bundle */}
                {generatingEvidence
                  ? "Generating..."
                  : evidenceBundle
                  ? "✓ Generate Evidence Bundle"
                  : "1. Generate Evidence Bundle"}
              </Button>

              <Button
                fullWidth
                size="small"
                variant={trioGenerated ? "contained" : "outlined"}
                onClick={handleGenerateTrio}
                // disabled={!evidenceBundle}
                disabled={!evidenceBundle || generatingTrio} // ✅ Add || generatingTrio
                startIcon={
                  generatingTrio ? <CircularProgress size={16} /> : null
                } // ✅ Add this
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
                {/* {trioGenerated ? "✓" : "2."} Generate BIDS Trio */}
                {generatingTrio
                  ? "Generating..."
                  : trioGenerated
                  ? "✓ Generate BIDS Trio"
                  : "2. Generate BIDS Trio"}
              </Button>
              <Typography
                variant="body2"
                sx={{
                  textAlign: "left",
                  color: trioGenerated ? Colors.purple : Colors.lightGray,
                  py: 1,
                }}
              >
                3. Ready to Generate Script ↓
              </Typography>
            </Box>
          </Box>

          <Button
            fullWidth
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={20} /> : <AutoAwesome />
            }
            onClick={handleGenerate}
            // disabled={loading}
            disabled={loading || !baseDirectoryPath.trim() || !trioGenerated} // Add
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
            {loading ? "Generating..." : "Generate Script"}
          </Button>

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
              onClick={handleCopy}
              disabled={!generatedScript}
            >
              Copy
            </Button>
            <Button
              size="small"
              startIcon={<Download />}
              onClick={handleDownload}
              disabled={!generatedScript}
            >
              Download
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
            {generatedScript ||
              'Configure your LLM provider and click "Generate Script"...'}
          </Paper>
        </Box>
      </Box>
    </Paper>
  );
};

export default LLMPanel;
