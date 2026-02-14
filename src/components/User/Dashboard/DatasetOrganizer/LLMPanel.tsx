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

const LLMPanel: React.FC<LLMPanelProps> = ({ files, onClose }) => {
  const [provider, setProvider] = useState<string>("ollama");
  const [model, setModel] = useState<string>("qwen3-coder:30b");
  const [ollamaUrl, setOllamaUrl] = useState<string>(
    "http://huo.neu.edu:11434"
  );
  const [apiKey, setApiKey] = useState<string>("");
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [baseDirectoryPath, setBaseDirectoryPath] = useState<string>(""); // ✅ Add this

  const [panelHeight, setPanelHeight] = useState<number>(350);
  const [isResizing, setIsResizing] = useState(false);

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

  const buildFileSummary = (
    parentId: string | null,
    indent: string = ""
  ): string => {
    let summary = "";
    const children = files.filter((f) => f.parentId === parentId);

    children.forEach((child) => {
      summary += `${indent}${child.name}`;
      if (child.type === "folder" || child.type === "zip") {
        summary += "/\n";
        summary += buildFileSummary(child.id, indent + "  ");
      } else {
        if (child.contentType) summary += ` [${child.contentType}]`;
        summary += "\n";
        if (child.content && child.content.length < 500) {
          summary += `${indent}  Content: ${child.content
            .slice(0, 300)
            .replace(/\n/g, " ")}\n`;
        }
      }
    });

    return summary;
  };

  const handleGenerate = async () => {
    if (!currentProvider.noApiKey && !apiKey.trim()) {
      setError("Please enter an API key");
      return;
    }

    setLoading(true);
    setError(null);
    setStatus(`Generating script using ${currentProvider.name}...`);

    const fileSummary = buildFileSummary(null);
    const prompt = `You are a neuroimaging data expert. Analyze the following file structure and metadata from a neuroimaging dataset and generate a Python script to convert it to BIDS format.

FILE STRUCTURE AND METADATA:
${fileSummary}

all _sourcePath are relative to the root path ${baseDirectoryPath}

Please generate a Python script that:
1. Reads the source files
2. Renames and reorganizes them according to BIDS specification
3. Creates required BIDS metadata files (dataset_description.json, participants.tsv, etc.)
4. Handles the specific file types present (NIfTI, SNIRF, JSON sidecars, etc.)

Include comments explaining the BIDS structure.
Output ONLY the Python script.`;

    try {
      let response;

      if (provider === "ollama") {
        const ollamaBaseUrl = ollamaUrl || "http://localhost:11434";
        response = await fetch(`${ollamaBaseUrl}/v1/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a neuroimaging data expert specializing in BIDS format conversion. Output only Python code.",
              },
              { role: "user", content: prompt },
            ],
            stream: false,
          }),
        });
      } else if (currentProvider.isAnthropic) {
        response = await fetch(currentProvider.baseUrl, {
          method: "POST",
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
          headers,
          body: JSON.stringify({
            model,
            messages: [
              {
                role: "system",
                content:
                  "You are a neuroimaging data expert specializing in BIDS format conversion. Output only Python code.",
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

      setGeneratedScript(script);
      setStatus(`✓ Script generated using ${currentProvider.name}`);
    } catch (err: any) {
      setError(err.message || "Failed to generate script");
      setStatus("❌ Error generating script");
    } finally {
      setLoading(false);
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

          <Button
            fullWidth
            variant="contained"
            startIcon={
              loading ? <CircularProgress size={20} /> : <AutoAwesome />
            }
            onClick={handleGenerate}
            // disabled={loading}
            disabled={loading || !baseDirectoryPath.trim()} // Add
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
