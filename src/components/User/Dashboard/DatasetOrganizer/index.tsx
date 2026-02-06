import DropZone from "./DropZone";
import FileTree from "./FileTree";
import LLMPanel from "./LLMPanel";
import { ArrowBack, Save, GetApp, Psychology } from "@mui/icons-material";
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
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

  // Load project on mount
  useEffect(() => {
    if (projectId) {
      dispatch(getProject({ projectId: parseInt(projectId) }));
    }
  }, [projectId, dispatch]);

  // Restore state from project when loaded
  useEffect(() => {
    if (currentProject && currentProject.extractor_state) {
      const state = currentProject.extractor_state;
      setFiles(state.files || []);
      setSelectedIds(new Set(state.selectedIds || []));
      setExpandedIds(new Set(state.expandedIds || []));
      setHasUnsavedChanges(false);
    }
  }, [currentProject]);

  const handleSave = async () => {
    if (!currentProject) return;

    try {
      await dispatch(
        updateProject({
          projectId: currentProject.id,
          extractor_state: {
            files,
            selectedIds: Array.from(selectedIds),
            expandedIds: Array.from(expandedIds),
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
            _sourcePath: child.sourcePath || "",
            _children: buildTree(child.id),
          };
        } else {
          const fileData: any = {
            _type: "file",
            _fileType: child.fileType || "other",
          };
          if (child.sourcePath) fileData._sourcePath = child.sourcePath;
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

  const handleBack = () => {
    if (hasUnsavedChanges) {
      const userWantsToSave = window.confirm(
        "You have unsaved changes. Do you want to save before leaving?"
      );

      if (userWantsToSave) {
        handleSave();
        navigate("/dashboard");
      }
      // If user clicks Cancel, do nothing (stay on page)
    } else {
      // No unsaved changes, go back directly
      navigate("/dashboard");
    }
  };

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
              "&:hover": {
                backgroundColor: Colors.purple,
                border: "none",
              },
            }}
          >
            Generate BIDS Script
          </Button>
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

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ m: 2 }}>
          {error}
        </Alert>
      )}

      {/* Main Content */}
      <Box sx={{ display: "flex", flex: 1, minHeight: 0 }}>
        {/* Left: Drop Zone */}
        <Box sx={{ flex: 1, overflow: "auto", p: 3 }}>
          <DropZone
            files={files}
            setFiles={updateFiles} // Pass wrapper
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
            expandedIds={expandedIds}
            setExpandedIds={setExpandedIds}
          />
        </Box>

        {/* Right: File Tree */}
        <FileTree
          files={files}
          selectedIds={selectedIds}
          expandedIds={expandedIds}
          setFiles={updateFiles} // Pass wrapper instead
          setSelectedIds={updateSelectedIds} // Pass wrapper
          setExpandedIds={updateExpandedIds} // Pass wrapper
        />
      </Box>

      {/* LLM Panel */}
      {/* {showLLMPanel && (
        <LLMPanel files={files} onClose={() => setShowLLMPanel(false)} />
      )} */}
    </Box>
  );
};

export default DatasetOrganizer;
