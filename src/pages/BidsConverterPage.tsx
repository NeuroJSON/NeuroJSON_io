import DropZone from "components/User/Dashboard/DatasetOrganizer/DropZone";
import FileTree from "components/User/Dashboard/DatasetOrganizer/FileTree";
import LLMPanel from "components/User/Dashboard/DatasetOrganizer/LLMPanel";
import { ArrowBack, GetApp, Psychology } from "@mui/icons-material";
import { Box, Button, Typography, Alert } from "@mui/material";
import { Colors } from "design/theme";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileItem } from "redux/projects/types/projects.interface";

const BidsConverterPage: React.FC = () => {
  const navigate = useNavigate();

  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showLLMPanel, setShowLLMPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseDirectoryPath, setBaseDirectoryPath] = useState<string>("");
  const [evidenceBundle, setEvidenceBundle] = useState<any>(null);
  const [trioGenerated, setTrioGenerated] = useState(false);

  const updateFiles = (updater: React.SetStateAction<FileItem[]>) =>
    setFiles(updater);

  const updateSelectedIds = (updater: React.SetStateAction<Set<string>>) =>
    setSelectedIds(updater);

  const updateExpandedIds = (updater: React.SetStateAction<Set<string>>) =>
    setExpandedIds(updater);

  const updateBaseDirectoryPath = (path: string) => setBaseDirectoryPath(path);

  const handleExportJSON = () => {
    const buildTree = (parentId: string | null): any => {
      const children = files.filter((f) => f.parentId === parentId);
      const result: any = {};
      children.forEach((child) => {
        if (child.type === "folder" || child.type === "zip") {
          result[child.name] = {
            _type: child.type,
            _sourcePath: baseDirectoryPath
              ? `${baseDirectoryPath}/${child.sourcePath || child.name}`.replace(/\/+/g, "/")
              : child.sourcePath || "",
            _children: buildTree(child.id),
          };
        } else {
          const fileData: any = {
            _type: "file",
            _fileType: child.fileType || "other",
          };
          if (child.sourcePath || baseDirectoryPath) {
            fileData._sourcePath = baseDirectoryPath
              ? `${baseDirectoryPath}/${child.sourcePath || child.name}`.replace(/\/+/g, "/")
              : child.sourcePath;
          }
          if (child.isUserMeta) fileData._isUserMeta = true;
          if (child.content) fileData._content = child.content;
          if (child.contentType) fileData._contentType = child.contentType;
          if (child.note) fileData._note = child.note;
          result[child.name] = fileData;
        }
      });
      return result;
    };

    const exportData = {
      _exportDate: new Date().toISOString(),
      _totalFiles: files.length,
      files: buildTree(null),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "bids_converter_export.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "linear-gradient(180deg,#f6f7fb 0%, #aeb6e8 100%)",
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
          gap: 2,
        }}
      >
        <Box display="flex" alignItems="center" gap={2}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate("/")}
            sx={{ color: Colors.purple }}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h5">BIDS Converter</Typography>
            <Typography variant="body2" color="text.secondary">
              Organize and rename your dataset files into BIDS format
            </Typography>
          </Box>
        </Box>

        <Box display="flex" gap={1}>
          <Button
            variant="contained"
            startIcon={<Psychology />}
            onClick={() => setShowLLMPanel(!showLLMPanel)}
            disabled={files.length === 0}
            sx={{
              backgroundColor: Colors.purple,
              color: Colors.lightGray,
              "&:hover": { backgroundColor: Colors.purple, border: "none" },
            }}
          >
            Generate BIDS Plan
          </Button>
          <Button
            variant="contained"
            startIcon={<GetApp />}
            onClick={handleExportJSON}
            disabled={files.length === 0}
            sx={{
              backgroundColor: Colors.darkGreen,
              color: Colors.lightGray,
              "&:hover": { backgroundColor: Colors.darkGreen, border: "none" },
            }}
          >
            Export JSON
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        <Box sx={{ flex: 1, overflow: "auto", p: 3, position: "relative" }}>
          <DropZone
            files={files}
            setFiles={updateFiles}
            baseDirectoryPath={baseDirectoryPath}
            setBaseDirectoryPath={updateBaseDirectoryPath}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            expandedIds={expandedIds}
            setExpandedIds={setExpandedIds}
          />
          {showLLMPanel && (
            <LLMPanel
              files={files}
              baseDirectoryPath={baseDirectoryPath}
              setBaseDirectoryPath={updateBaseDirectoryPath}
              evidenceBundle={evidenceBundle}
              setEvidenceBundle={setEvidenceBundle}
              trioGenerated={trioGenerated}
              setTrioGenerated={setTrioGenerated}
              updateFiles={updateFiles}
              onClose={() => setShowLLMPanel(false)}
            />
          )}
        </Box>

        <FileTree
          files={files}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          setFiles={updateFiles}
          setSelectedIds={updateSelectedIds}
          setExpandedIds={updateExpandedIds}
        />
      </Box>
    </Box>
  );
};

export default BidsConverterPage;
