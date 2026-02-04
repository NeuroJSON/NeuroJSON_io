// src/components/DatasetOrganizer/LLMPanel.tsx
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
import React, { useState } from "react";
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
}

const llmProviders: Record<string, LLMProvider> = {
  ollama: {
    name: "Ollama (Local)",
    baseUrl: "http://localhost:11434/v1/chat/completions",
    models: [
      { id: "qwen2.5-coder:latest", name: "Qwen 2.5 Coder" },
      { id: "codellama:latest", name: "Code Llama" },
      { id: "llama3.1:latest", name: "Llama 3.1" },
    ],
    noApiKey: true,
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    models: [
      { id: "llama-3.3-70b-versatile", name: "Llama 3.3 70B" },
      { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B (Fast)" },
    ],
  },
  anthropic: {
    name: "Anthropic",
    baseUrl: "https://api.anthropic.com/v1/messages",
    models: [
      { id: "claude-sonnet-4-20250514", name: "Claude Sonnet 4" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
    ],
    isAnthropic: true,
  },
};

const LLMPanel: React.FC<LLMPanelProps> = ({ files, onClose }) => {
  const [provider, setProvider] = useState<string>("groq");
  const [model, setModel] = useState<string>("llama-3.3-70b-versatile");
  const [apiKey, setApiKey] = useState<string>("");
  const [generatedScript, setGeneratedScript] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");

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

Please generate a Python script that:
1. Reads the source files
2. Renames and reorganizes them according to BIDS specification
3. Creates required BIDS metadata files (dataset_description.json, participants.tsv, etc.)
4. Handles the specific file types present (NIfTI, SNIRF, JSON sidecars, etc.)

Include comments explaining the BIDS structure.
Output ONLY the Python script.`;

    try {
      let response;

      if (currentProvider.isAnthropic) {
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
        height: "50vh",
        zIndex: 1000,
        borderTop: 2,
        borderColor: Colors.purple,
        display: "flex",
        flexDirection: "column",
      }}
    >
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
            disabled={loading}
            sx={{
              background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.secondaryPurple} 100%)`,
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.secondaryPurple} 0%, ${Colors.purple} 100%)`,
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
