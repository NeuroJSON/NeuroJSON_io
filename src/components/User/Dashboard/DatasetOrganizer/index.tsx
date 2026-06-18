import DropZone from "./DropZone";
import FileTree from "./FileTree";
import LLMPanel from "./LLMPanel";
import { generateId } from "./utils/fileProcessors";
import { ArrowBack, Save, GetApp, Psychology, InfoOutlined } from "@mui/icons-material";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  Chip,
  Tooltip,
  IconButton,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getProject, updateProject } from "redux/projects/projects.action";
import {
  selectCurrentProject,
  selectProjectsLoading,
  selectIsUpdatingProject,
} from "redux/projects/projects.selector";
import { FileItem } from "redux/projects/types/projects.interface";

const DatasetOrganizer: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const currentProject = useAppSelector(selectCurrentProject);
  const loading = useAppSelector(selectProjectsLoading);
  const isSaving = useAppSelector(selectIsUpdatingProject);

  // Local state for the organizer
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showLLMPanel, setShowLLMPanel] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [baseDirectoryPath, setBaseDirectoryPath] = useState<string>("");
  // add
  const [evidenceBundle, setEvidenceBundle] = useState<any>(null);
  const [trioGenerated, setTrioGenerated] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false); //add

  // Helper to mark as changed
  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };

  // Wrapper functions that mark as changed
  const updateFiles = (updater: React.SetStateAction<FileItem[]>) => {
    setFiles(updater);
    markAsChanged();
  };

  const updateSelectedIds = (updater: React.SetStateAction<Set<string>>) => {
    setSelectedIds(updater);
    markAsChanged();
  };

  const updateExpandedIds = (updater: React.SetStateAction<Set<string>>) => {
    setExpandedIds(updater);
    markAsChanged();
  };

  const updateBaseDirectoryPath = (path: string) => {
    setBaseDirectoryPath(path);
    markAsChanged();
  };

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      // dispatch(getProject({ projectId: parseInt(projectId) }));
      dispatch(getProject({ projectId }));
    }
  }, [projectId, dispatch]);

  // Restore state from project when loaded
  useEffect(() => {
    if (currentProject && currentProject.extractor_state) {
      const state = currentProject.extractor_state;
      setFiles(state.files || []);
      setSelectedIds(new Set(state.selectedIds || []));
      setExpandedIds(new Set(state.expandedIds || []));
      setBaseDirectoryPath(state.baseDirectoryPath || "");
      setEvidenceBundle(state.evidenceBundle || null);
      setTrioGenerated(state.trioGenerated || false);
      setHasUnsavedChanges(false);
    }
  }, [currentProject]);

  const handleSave = async () => {
    if (!currentProject) return;

    try {
      await dispatch(
        updateProject({
          projectId: currentProject.public_id, // ← was currentProject.id
          extractor_state: {
            files,
            selectedIds: Array.from(selectedIds),
            expandedIds: Array.from(expandedIds),
            baseDirectoryPath,
            evidenceBundle,
            trioGenerated,
          },
        })
      ).unwrap();

      setHasUnsavedChanges(false);
      setError(null);
    } catch (err: any) {
      setError(err.message || "Failed to save project");
    }
  };

  const handleExportJSON = () => {
    const buildTree = (parentId: string | null): any => {
      const children = files.filter((f) => f.parentId === parentId);
      const result: any = {};

      children.forEach((child) => {
        if (child.type === "folder" || child.type === "zip") {
          result[child.name] = {
            _type: child.type,
            // _sourcePath: child.sourcePath || "", //change
            //add
            _sourcePath: baseDirectoryPath
              ? `${baseDirectoryPath}/${
                  child.sourcePath || child.name
                }`.replace(/\/+/g, "/")
              : child.sourcePath || "",
            _children: buildTree(child.id),
          };
        } else {
          const fileData: any = {
            _type: "file",
            _fileType: child.fileType || "other",
          };
          // if (child.sourcePath) fileData._sourcePath = child.sourcePath; // change
          //add
          if (child.sourcePath || baseDirectoryPath) {
            fileData._sourcePath = baseDirectoryPath
              ? `${baseDirectoryPath}/${
                  child.sourcePath || child.name
                }`.replace(/\/+/g, "/")
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
      _projectName: currentProject?.name,
      files: buildTree(null),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${
      currentProject?.name?.replace(/\s+/g, "_") || "bids_metadata"
    }_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // BACK BUTTON WITH DIALOG
  const handleBack = () => {
    if (hasUnsavedChanges) {
      setShowExitDialog(true);
    } else {
      navigate("/dashboard");
    }
  };

  // ========================================================================
  // LOADING & ERROR STATES
  // ========================================================================
  if (loading && !currentProject) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!currentProject) {
    return (
      <Box
        sx={{
          p: 4,
          background: "linear-gradient(180deg,#f6f7fb 0%, #aeb6e8 100%)",
        }}
      >
        <Alert severity="error">Project not found</Alert>
        <Button onClick={() => navigate("/dashboard")} sx={{ mt: 2 }}>
          Back to Dashboard
        </Button>
      </Box>
    );
  }

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
            onClick={handleBack}
            sx={{ color: Colors.purple }}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h5">{currentProject.name}</Typography>
            {currentProject.description && (
              <Typography variant="body2" color="text.secondary">
                {currentProject.description}
              </Typography>
            )}
            <Tooltip
              title={
                <Box>
                  <Typography variant="body2">An LLM-powered tool for automatically converting neuroimaging datasets into BIDS-compliant format.</Typography>
                  <Typography
                    variant="body2"
                    sx={{ color: Colors.purple, cursor: "pointer", mt: 0.5, textDecoration: "underline" }}
                    onClick={() => window.open("https://github.com/COTILab/autobidsify", "_blank")}
                  >
                    Learn more
                  </Typography>
                </Box>
              }
              placement="bottom-start"
              arrow
              componentsProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "white",
                    color: Colors.darkPurple,
                    border: `1px solid ${Colors.lightGray}`,
                    boxShadow: 3,
                    fontSize: "0.875rem",
                    p: 1.5,
                    maxWidth: 320,
                  },
                },
                arrow: {
                  sx: {
                    color: "white",
                    "&::before": { border: `1px solid ${Colors.lightGray}` },
                  },
                },
              }}
            >
              <Chip
                label="Powered by AutoBIDSify"
                size="small"
                onClick={() => window.open("https://github.com/COTILab/autobidsify", "_blank")}
                sx={{
                  mt: 0.5,
                  backgroundColor: Colors.purple,
                  color: Colors.white,
                  fontSize: "0.7rem",
                  cursor: "pointer",
                  "&:hover": { backgroundColor: Colors.secondaryPurple },
                }}
              />
            </Tooltip>
            <Tooltip
              title={
                <Box>
                  <Typography variant="body2" fontWeight={600} mb={0.5}>How to use:</Typography>
                  <Typography variant="body2" component="ol" sx={{ pl: 2, m: 0 }}>
                    <li>Drop your dataset files into the workspace.</li>
                    <li>Enter the number of subjects, modality, and base directory path.</li>
                    <li>The AI will analyze your files and generate a BIDS conversion plan.</li>
                    <li>Download the conversion bundle and the AutoBIDSify Converter, then run the Converter locally to reorganize your data into BIDS format.</li>
                  </Typography>
                  <Typography
                    variant="body2"
                    onClick={() => navigate("/about")}
                    sx={{ mt: 1, color: Colors.purple, cursor: "pointer", textDecoration: "underline" }}
                  >
                    Watch video tutorial
                  </Typography>
                </Box>
              }
              placement="bottom-start"
              arrow
              componentsProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "white",
                    color: Colors.darkPurple,
                    border: `1px solid ${Colors.lightGray}`,
                    boxShadow: 3,
                    fontSize: "0.875rem",
                    lineHeight: 1.5,
                    p: 1.5,
                    maxWidth: 320,
                  },
                },
                arrow: {
                  sx: {
                    color: "white",
                    "&::before": { border: `1px solid ${Colors.lightGray}` },
                  },
                },
              }}
            >
              <IconButton size="small" sx={{ color: Colors.purple, p: 0, mt: 0.5 }}>
                <InfoOutlined fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        <Box display="flex" flexDirection="column" gap={1} alignItems="flex-end">
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<Psychology />}
              onClick={() => setShowLLMPanel(!showLLMPanel)}
              sx={{
                backgroundColor: Colors.purple,
                color: Colors.lightGray,
                "&:hover": {
                  backgroundColor: Colors.purple,
                  border: "none",
                },
              }}
            >
              AI Assistant
            </Button>
            <Button
              variant="outlined"
              startIcon={<GetApp />}
              onClick={() => {
                const ua = navigator.userAgent.toLowerCase();
                const os = ua.includes("win") ? "windows" : ua.includes("linux") ? "linux" : "mac";
                const urls: Record<string, string> = {
                  mac: "https://github.com/yiyiliu-rose/autobidsifyAPP/releases/latest/download/AutoBIDSify-ExecVal-macOS-arm64.zip",
                  windows: "https://github.com/yiyiliu-rose/autobidsifyAPP/releases/latest/download/AutoBIDSify-ExecVal-Windows.zip",
                  linux: "https://github.com/yiyiliu-rose/autobidsifyAPP/releases/latest/download/AutoBIDSify-ExecVal-Linux.tar.gz",
                };
                window.open(urls[os], "_blank");
              }}
              sx={{ borderColor: Colors.purple, color: Colors.purple, textTransform: "none" }}
            >
              Download Converter
            </Button>
          </Box>
          <Box display="flex" gap={1}>
            <Button
              variant="contained"
              startIcon={<GetApp />}
              onClick={handleExportJSON}
              disabled={files.length === 0}
              sx={{
                backgroundColor: Colors.darkGreen,
                color: Colors.lightGray,
                "&:hover": {
                  backgroundColor: Colors.darkGreen,
                  border: "none",
                },
              }}
            >
              Export JSON
            </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
            disabled={!hasUnsavedChanges || isSaving}
            sx={{
              background: hasUnsavedChanges
                ? `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`
                : "#e0e0e0",
              color: "white",
              "&:hover": {
                background: hasUnsavedChanges
                  ? `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`
                  : "#d5d5d5",
              },
            }}
          >
            {isSaving ? (
              <CircularProgress size={20} />
            ) : hasUnsavedChanges ? (
              "Save Changes"
            ) : (
              "Saved ✓"
            )}
          </Button>
          </Box>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left: Drop Zone */}
        <Box sx={{ flex: 1, overflow: "auto", p: 3, position: "relative" }}>
          <DropZone
            files={files}
            setFiles={updateFiles} // Pass wrapper
            baseDirectoryPath={baseDirectoryPath}
            // setBaseDirectoryPath={setBaseDirectoryPath}
            setBaseDirectoryPath={updateBaseDirectoryPath} // ← was setBaseDirectoryPath
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            expandedIds={expandedIds}
            setExpandedIds={setExpandedIds}
          />
          {/* LLM Panel */}
          {showLLMPanel && (
            <LLMPanel
              files={files}
              baseDirectoryPath={baseDirectoryPath}
              // setBaseDirectoryPath={setBaseDirectoryPath}
              setBaseDirectoryPath={updateBaseDirectoryPath} // ← was setBaseDirectoryPath
              evidenceBundle={evidenceBundle}
              setEvidenceBundle={setEvidenceBundle}
              trioGenerated={trioGenerated}
              setTrioGenerated={setTrioGenerated}
              updateFiles={updateFiles}
              onClose={() => setShowLLMPanel(false)}
            />
          )}
        </Box>

        {/* Right: File Tree */}
        <FileTree
          files={files}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          setFiles={updateFiles}
          setSelectedIds={updateSelectedIds}
          setExpandedIds={updateExpandedIds}
          baseDirectoryPath={baseDirectoryPath}
          setBaseDirectoryPath={updateBaseDirectoryPath}
        />
      </Box>

      {/* Exit Confirmation Dialog */}
      <Dialog open={showExitDialog} onClose={() => setShowExitDialog(false)}>
        <DialogTitle>Unsaved Changes</DialogTitle>
        <DialogContent>
          <DialogContentText>
            You have unsaved changes. Are you sure you want to leave? Your
            changes will be lost.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            variant="outlined"
            onClick={() => setShowExitDialog(false)}
            sx={{ color: Colors.purple, border: Colors.purple }}
          >
            Stay
          </Button>
          <Button
            onClick={() => {
              setShowExitDialog(false);
              navigate("/dashboard");
            }}
            variant="outlined"
            sx={{ color: Colors.purple, border: Colors.purple }}
          >
            Leave Without Saving
          </Button>
          <Button
            onClick={async () => {
              await handleSave();
              setShowExitDialog(false);
              navigate("/dashboard");
            }}
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`,
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`,
                border: "none",
              },
            }}
          >
            Save & Leave
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DatasetOrganizer;
