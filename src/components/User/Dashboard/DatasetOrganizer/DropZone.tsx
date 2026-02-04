// src/components/DatasetOrganizer/DropZone.tsx
import { processFile, processFolder, processZip } from "./utils/fileProcessors";
import { CloudUpload, Add } from "@mui/icons-material";
import { Box, Typography, Paper, Button } from "@mui/material";
import { Colors } from "design/theme";
import React, { useState, useRef } from "react";
import { FileItem } from "redux/projects/types/projects.interface";

interface DropZoneProps {
  files: FileItem[];
  setFiles: React.Dispatch<React.SetStateAction<FileItem[]>>;
  selectedIds: Set<string>;
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  expandedIds: Set<string>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

const DropZone: React.FC<DropZoneProps> = ({
  files,
  setFiles,
  selectedIds,
  setSelectedIds,
  expandedIds,
  setExpandedIds,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const items = Array.from(e.dataTransfer.items); // detect if it is a folder
    const droppedFiles = Array.from(e.dataTransfer.files); // only gives file objects, can't detect folders

    // Separate folders and files
    const folderEntries: any[] = [];
    const fileItems: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const entry = (items[i] as any).webkitGetAsEntry?.();
      if (entry && entry.isDirectory) {
        folderEntries.push(entry);
      } else if (droppedFiles[i]) {
        fileItems.push(droppedFiles[i]);
      }
    }

    // Process folders
    for (const folderEntry of folderEntries) {
      const folderFiles = await processFolder(folderEntry, null);
      setFiles((prev) => [...prev, ...folderFiles]);
    }

    // Process files
    for (const file of fileItems) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const zipFiles = await processZip(file);
        setFiles((prev) => [...prev, ...zipFiles]);
      } else {
        const fileItem = await processFile(file);
        setFiles((prev) => [...prev, fileItem]);
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);

    for (const file of selectedFiles) {
      if (file.name.toLowerCase().endsWith(".zip")) {
        const zipFiles = await processZip(file);
        setFiles((prev) => [...prev, ...zipFiles]);
      } else {
        const fileItem = await processFile(file);
        setFiles((prev) => [...prev, fileItem]);
      }
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Show file count if files exist */}
      {files.length > 0 && (
        <Box>
          <Typography variant="h6" gutterBottom>
            Dataset Files
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {files.length} file{files.length !== 1 ? "s" : ""} added
          </Typography>
        </Box>
      )}

      {/* Always show drop zone */}
      <Paper
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        sx={{
          border: `2px dashed ${isDragging ? Colors.purple : Colors.lightGray}`,
          borderRadius: 2,
          p: 6,
          textAlign: "center",
          cursor: "pointer",
          transition: "all 0.2s",
          backgroundColor: isDragging
            ? "rgba(128, 90, 213, 0.05)"
            : "transparent",
          "&:hover": {
            borderColor: Colors.purple,
            backgroundColor: "rgba(128, 90, 213, 0.05)",
          },
        }}
      >
        <CloudUpload
          sx={{
            fontSize: files.length > 0 ? 40 : 64, // ← Smaller icon when files exist
            color: Colors.purple,
            mb: 1,
          }}
        />
        <Typography variant={files.length > 0 ? "body1" : "h6"} gutterBottom>
          {files.length > 0
            ? "Drop more files here"
            : "Drop your neuroimaging files here"}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Supports NIfTI, SNIRF, HDF5, NeuroJSON, folders, and ZIP archives
        </Typography>
        {files.length === 0 && (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              sx={{ mb: 2 }}
            >
              📁 Folders • 🗜️ ZIP files • 📄 Documents (.json, .txt, .md) • 📊
              Office (.docx, .pdf, .xlsx)
            </Typography>
            <Button
              variant="outlined"
              startIcon={<Add />}
              sx={{ borderColor: Colors.purple, color: Colors.purple }}
            >
              Or Click to Browse
            </Button>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          hidden
          onChange={handleFileSelect}
          accept=".nii,.nii.gz,.snirf,.h5,.hdf5,.jnii,.jmsh,.json,.txt,.md,.zip,.docx,.pdf,.xlsx,.xls"
        />
      </Paper>
    </Box>
  );
};

export default DropZone;
