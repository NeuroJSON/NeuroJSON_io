import { generateId } from "./utils/fileProcessors";
import {
  Folder,
  InsertDriveFile,
  ExpandMore,
  ChevronRight,
  Delete,
  NoteAdd,
  Edit,
  Description,
  Add,
  AutoAwesome,
  FolderSpecial,
  Download,
} from "@mui/icons-material";
import {
  Box,
  Typography,
  IconButton,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Colors } from "design/theme";
import JSZip from "jszip";
import React, { useState } from "react";
import { FileItem } from "redux/projects/types/projects.interface";

interface FileTreeProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedIds: Set<string>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const FileTree: React.FC<FileTreeProps> = ({
  files,
  setFiles,
  selectedIds,
  setSelectedIds,
  expandedIds,
  setExpandedIds,
}) => {
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [metaEditorOpen, setMetaEditorOpen] = useState(false);
  const [metaType, setMetaType] = useState<
    "readme" | "subject" | "instructions" | null
  >(null);
  const [metaFileName, setMetaFileName] = useState("");
  const [metaContent, setMetaContent] = useState("");

  // split files into two groups
  const userFiles = files.filter((f) => f.source !== "output");
  const outputFiles = files.filter((f) => f.source === "output");

  // In FileTree.tsx
  const metaConfigs = {
    readme: {
      label: "Add README File",
      defaultFilename: "README.md",
      placeholder:
        "Enter dataset description, authors, license, and other important information...",
    },
    subject: {
      label: "Add Subject/Session Info",
      defaultFilename: "participants.txt",
      placeholder:
        "Enter subject IDs, session info, and participant metadata...\n\nExample:\nSubject ID: sub-01\nSession: ses-01\nAge: 25\nSex: M",
    },
    instructions: {
      label: "Add Conversion Instructions",
      defaultFilename: "CONVERSION_NOTES.md",
      placeholder:
        "Enter instructions for converting this dataset to BIDS format...\n\nExample:\n- Rename T1w files to sub-XX_T1w.nii.gz\n- Create JSON sidecars for each scan\n- Map task names to BIDS task labels",
    },
  };

  const handleOpenMetaEditor = (
    type: "readme" | "subject" | "instructions"
  ) => {
    const config = metaConfigs[type];
    setMetaType(type);
    setMetaFileName(config.defaultFilename);
    setMetaContent("");
    setMetaEditorOpen(true);
  };

  const handleSaveMetaFile = () => {
    if (!metaFileName.trim()) {
      alert("Please enter a filename");
      return;
    }

    const newFile: FileItem = {
      id: generateId(),
      name: metaFileName.trim(),
      type: "file",
      parentId: null,
      fileType: "meta",
      content: metaContent,
      contentType: "text",
      sourcePath: undefined,
      isUserMeta: true,
    };

    setFiles((prev) => [...prev, newFile]);
    setMetaEditorOpen(false);
    setMetaType(null);
    setMetaFileName("");
    setMetaContent("");
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    const allIds = files.map((f) => f.id);
    setSelectedIds(new Set(allIds));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds.size} selected item(s)?`)) return;

    // Collect all descendants
    const toDelete = new Set(selectedIds);
    const collectDescendants = (parentId: string) => {
      files.forEach((file) => {
        if (file.parentId === parentId) {
          toDelete.add(file.id);
          collectDescendants(file.id);
        }
      });
    };

    selectedIds.forEach((id) => collectDescendants(id));

    // Remove files
    setFiles((prev) => prev.filter((f) => !toDelete.has(f.id)));
    setSelectedIds(new Set());
  };

  const handleDownloadOutputFolder = async (
    folderId: string,
    folderName: string
  ) => {
    const zip = new JSZip();

    // Recursive function to add files to zip
    const addToZip = (
      parentId: string,
      zipFolder: any,
      currentPath: string
    ) => {
      const children = files.filter((f) => f.parentId === parentId);
      children.forEach((child) => {
        if (child.type === "folder") {
          const subFolder = zipFolder.folder(child.name);
          addToZip(child.id, subFolder, `${currentPath}/${child.name}`);
        } else {
          if (child.content) {
            zipFolder.file(child.name, child.content);
          }
        }
      });
    };

    addToZip(folderId, zip, folderName);

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${folderName}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddNote = (id: string) => {
    const file = files.find((f) => f.id === id);
    setEditingNoteId(id);
    setNoteText(file?.note || "");
    setNoteDialogOpen(true);
  };

  const handleSaveNote = () => {
    if (!editingNoteId) return;

    setFiles((prev) =>
      prev.map((f) => (f.id === editingNoteId ? { ...f, note: noteText } : f))
    );

    setNoteDialogOpen(false);
    setEditingNoteId(null);
    setNoteText("");
  };

  const renderFileIcon = (file: FileItem) => {
    if (file.source === "output") {
      if (file.type === "folder") {
        return <FolderSpecial sx={{ color: Colors.darkGreen, fontSize: 20 }} />;
      }
      return <InsertDriveFile sx={{ color: Colors.darkGreen, fontSize: 20 }} />;
    }
    // AI generated files — use AutoAwesome icon with purple color
    if (file.source === "ai") {
      return (
        <>
          {file.source === "ai" && (
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                px: 0.5,
                py: 0.1,
                ml: 0.5,
                borderRadius: 0.5,
                backgroundColor: "rgba(88, 101, 242, 0.1)",
                border: `1px solid ${Colors.purple}`,
              }}
            >
              <AutoAwesome sx={{ color: Colors.purple, fontSize: 15 }} />
              <Typography
                sx={{
                  fontSize: "0.7rem",
                  color: Colors.purple,
                  fontFamily: "Ubuntu",
                  fontWeight: 600,
                  lineHeight: 1.5,
                }}
              >
                AI
              </Typography>
            </Box>
          )}
        </>
      );
    }
    if (file.type === "folder" || file.type === "zip") {
      return <Folder sx={{ color: Colors.darkGreen, fontSize: 20 }} />;
    }

    // Color based on file type
    const colorMap: Record<string, string> = {
      text: "#22c55e",
      nifti: "#f472b6",
      hdf5: "#fb923c",
      neurojsonText: Colors.purple,
      neurojsonBinary: Colors.secondaryPurple,
      office: "#38bdf8",
      meta: Colors.yellow,
      matlab: Colors.black,
      dicom: "#34d399",
      nirs: Colors.darkOrange, // show homer3 in footer legend
      array: "#9ca3af",
    };

    const color = colorMap[file.fileType || "other"] || "#9ca3af";
    return <InsertDriveFile sx={{ color, fontSize: 20 }} />;
  };

  // one item in the tree
  const renderTreeItem = (
    file: FileItem,
    depth: number = 0,
    filePool: FileItem[] = files
  ) => {
    // const children = files.filter((f) => f.parentId === file.id); // origin
    const children = filePool.filter((f) => f.parentId === file.id);
    const hasChildren = children.length > 0;

    // Check if file has content or children to show expand button
    const hasContent =
      file.content !== undefined &&
      file.content !== null &&
      file.content !== "";
    const canExpand = hasChildren || hasContent;

    const isExpanded = expandedIds.has(file.id);
    const isSelected = selectedIds.has(file.id);

    return (
      <Box key={file.id}>
        {/* File Row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            py: 0.5,
            px: 1,
            pl: depth * 2 + 1,
            cursor: "pointer",
            backgroundColor: isSelected
              ? "rgba(128, 90, 213, 0.1)"
              : "transparent",
            "&:hover": {
              backgroundColor: "rgba(128, 90, 213, 0.05)",
            },
          }}
          onClick={() => handleToggleSelect(file.id)}
        >
          {/* Expand/Collapse Icon */}
          {canExpand ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleExpand(file.id);
              }}
              sx={{ p: 0.25 }}
            >
              {isExpanded ? (
                <ExpandMore sx={{ fontSize: 18 }} />
              ) : (
                <ChevronRight sx={{ fontSize: 18 }} />
              )}
            </IconButton>
          ) : (
            <Box sx={{ width: 24 }} />
          )}

          {/* File Icon */}
          {renderFileIcon(file)}

          {/* File Name */}
          <Typography
            variant="body2"
            sx={{
              flex: 1,
              fontSize: "0.875rem",
              wordBreak: "break-word",
            }}
          >
            {file.name}
          </Typography>

          {/* Download button for output root folders */}
          {file.source === "output" &&
            file.parentId === null &&
            file.type === "folder" && (
              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownloadOutputFolder(file.id, file.name);
                }}
                sx={{ p: 0.25, color: Colors.purple }}
                title="Download as ZIP"
              >
                <Download sx={{ fontSize: 16 }} />
              </IconButton>
            )}

          {/* Add timestamp for AI files */}
          {file.source === "ai" && file.generatedAt && (
            <Typography
              variant="caption"
              sx={{
                color: Colors.purple,
                fontSize: "0.7rem",
                opacity: 0.7,
                mr: 1,
                fontFamily: "Ubuntu",
              }}
            >
              {file.generatedAt}
            </Typography>
          )}

          {/* Note Icon */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleAddNote(file.id);
            }}
            sx={{
              p: 0.25,
              color: file.note ? Colors.darkGreen : "text.secondary",
            }}
            title={file.note ? "Edit note" : "Add note"}
          >
            {file.note ? (
              <Edit sx={{ fontSize: 16 }} />
            ) : (
              <NoteAdd sx={{ fontSize: 16 }} />
            )}
          </IconButton>
        </Box>

        {/* Show Note Preview */}
        {file.note && isExpanded && (
          <Box
            sx={{
              ml: depth * 2 + 4,
              mr: 1,
              my: 0.5,
              p: 1,
              backgroundColor: "rgba(251, 191, 36, 0.1)",
              borderLeft: "2px solid #fbbf24",
              borderRadius: 1,
            }}
          >
            <Typography variant="caption" sx={{ color: "#92400e" }}>
              Note: {file.note}
            </Typography>
          </Box>
        )}

        {/* Show Content Preview */}
        {hasContent && isExpanded && (
          <Box
            sx={{
              ml: depth * 2 + 4,
              mr: 1,
              my: 0.5,
              p: 1,
              backgroundColor: "rgba(34, 197, 94, 0.05)",
              borderLeft: "2px solid #22c55e",
              borderRadius: 1,
              fontFamily: "monospace",
              fontSize: "0.75rem",
              maxHeight: "200px",
              overflow: "auto",
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
            }}
          >
            {file.content}
          </Box>
        )}

        {/* Children */}
        {hasChildren && isExpanded && (
          <Box>
            {children.map((child) =>
              renderTreeItem(child, depth + 1, filePool)
            )}
          </Box> // add filePool
        )}
      </Box>
    );
  };

  const rootFiles = files.filter((f) => f.parentId === null);

  if (files.length === 0) {
    return (
      <Paper
        sx={{
          width: 420,
          borderLeft: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          p: 3,
        }}
      >
        <Typography variant="body2" color="text.secondary" textAlign="center">
          No files yet. Drop files to get started.
        </Typography>
      </Paper>
    );
  }

  return (
    <>
      <Paper
        sx={{
          width: 420,
          borderLeft: 1,
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 2,
            borderBottom: 1,
            borderColor: "divider",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            // alignItems: "center",
          }}
        >
          <Box>
            <Typography variant="subtitle2" fontWeight="600">
              Virtual File System
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {files.length} item{files.length !== 1 ? "s" : ""}
            </Typography>
          </Box>

          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap", mb: 1 }}>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => handleOpenMetaEditor("readme")}
              sx={{
                fontSize: "0.75rem",
                textTransform: "none",
                color: "text.secondary",
                "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.1)" },
              }}
            >
              README
            </Button>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => handleOpenMetaEditor("subject")}
              sx={{
                fontSize: "0.75rem",
                textTransform: "none",
                color: "text.secondary",
                "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.1)" },
              }}
            >
              Subject ID
            </Button>
            <Button
              size="small"
              startIcon={<Add />}
              onClick={() => handleOpenMetaEditor("instructions")}
              sx={{
                fontSize: "0.75rem",
                textTransform: "none",
                color: "text.secondary",
                "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.1)" },
              }}
            >
              Instructions
            </Button>
          </Box>

          {/* Select All / Deselect All */}
          <Box>
            <Button
              size="small"
              onClick={
                selectedIds.size > 0 ? handleDeselectAll : handleSelectAll
              }
              sx={{
                fontSize: "0.75rem",
                textTransform: "none",
                color: "text.secondary",
                "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.1)" },
              }}
            >
              {selectedIds.size > 0 ? "Deselect All" : "Select All"}
            </Button>

            {selectedIds.size > 0 && (
              <Button
                size="small"
                startIcon={<Delete />}
                onClick={handleDeleteSelected}
                sx={{
                  color: Colors.rose,
                  "&:hover": {
                    backgroundColor: "rgba(211, 47, 47, 0.1)",
                  },
                }}
              >
                Delete ({selectedIds.size})
              </Button>
            )}
          </Box>
        </Box>

        {/* File Tree */}
        {/* <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
          {rootFiles.map((file) => renderTreeItem(file))}
        </Box> */}

        <Box sx={{ flex: 1, overflow: "auto", p: 1 }}>
          {userFiles
            .filter((f) => f.parentId === null)
            .map((f) => renderTreeItem(f, 0, userFiles))}

          {outputFiles.length > 0 && (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  px: 1,
                  py: 0.5,
                  mt: 1,
                  borderTop: 1,
                  borderColor: "divider",
                }}
              >
                <FolderSpecial sx={{ color: Colors.darkGreen, fontSize: 16 }} />
                <Typography
                  variant="caption"
                  sx={{ color: Colors.darkGreen, fontWeight: 600 }}
                >
                  BIDS Conversion Package Preview
                </Typography>
              </Box>
              {outputFiles
                .filter((f) => f.parentId === null)
                .map((f) => renderTreeItem(f, 0, outputFiles))}
            </>
          )}
        </Box>

        {/* Footer Legend */}
        <Box
          sx={{
            p: 1.5,
            borderTop: 1,
            borderColor: "divider",
            backgroundColor: "background.default",
          }}
        >
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#22c55e",
                }}
              />
              <Typography variant="caption">Text</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#f472b6",
                }}
              />
              <Typography variant="caption">NIfTI</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#fb923c",
                }}
              />
              <Typography variant="caption">HDF5</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: Colors.purple,
                }}
              />
              <Typography variant="caption">NeuroJSON</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#38bdf8",
                }}
              />
              <Typography variant="caption">Office</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: Colors.yellow,
                }}
              />
              <Typography variant="caption">User Meta</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#34d399",
                }}
              />
              <Typography variant="caption">DICOM</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: Colors.black,
                }}
              />
              <Typography variant="caption">MATLAB</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: Colors.darkOrange,
                }}
              />
              <Typography variant="caption">Homer3</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: "50%",
                  backgroundColor: "#9ca3af",
                }}
              />
              <Typography variant="caption">Array</Typography>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  px: 0.5,
                  py: 0.1,
                  ml: 0.5,
                  borderRadius: 0.5,
                  backgroundColor: "rgba(88, 101, 242, 0.1)",
                  border: `1px solid ${Colors.purple}`,
                }}
              >
                <AutoAwesome sx={{ color: Colors.purple, fontSize: 15 }} />
                <Typography
                  sx={{
                    fontSize: "0.7rem",
                    color: Colors.purple,
                    fontFamily: "Ubuntu",
                    fontWeight: 600,
                    lineHeight: 1.5,
                  }}
                >
                  AI
                </Typography>
              </Box>
              <Typography variant="caption">AI Generated</Typography>
            </Box>
          </Box>
        </Box>
      </Paper>

      {/* Note Editor Dialog */}
      <Dialog
        open={noteDialogOpen}
        onClose={() => setNoteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: Colors.darkPurple }}>
          {editingNoteId && files.find((f) => f.id === editingNoteId)
            ? `Note for: ${files.find((f) => f.id === editingNoteId)?.name}`
            : "Add Note"}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            rows={4}
            fullWidth
            variant="outlined"
            placeholder="Enter your note here..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            sx={{
              mt: 1,
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setNoteDialogOpen(false)}
            sx={{ color: Colors.purple }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveNote}
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`,
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`,
              },
            }}
          >
            Save Note
          </Button>
        </DialogActions>
      </Dialog>

      {/* Meta File Editor Dialog */}
      <Dialog
        open={metaEditorOpen}
        onClose={() => setMetaEditorOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: Colors.darkPurple }}>
          {metaType && metaConfigs[metaType].label}
        </DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Filename"
            fullWidth
            variant="outlined"
            value={metaFileName}
            onChange={(e) => setMetaFileName(e.target.value)}
            sx={{
              mb: 2,
              mt: 1,
              "& .MuiInputLabel-root.Mui-focused": { color: Colors.purple },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
          <TextField
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            placeholder={metaType ? metaConfigs[metaType].placeholder : ""}
            value={metaContent}
            onChange={(e) => setMetaContent(e.target.value)}
            sx={{
              "& .MuiInputLabel-root.Mui-focused": { color: Colors.purple },
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setMetaEditorOpen(false)}
            sx={{ color: Colors.purple }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveMetaFile}
            variant="contained"
            sx={{
              background: `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`,
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`,
              },
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default FileTree;
