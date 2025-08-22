import FileTreeRow from "./FileTreeRow";
import type { TreeNode } from "./types";
import FolderIcon from "@mui/icons-material/Folder";
import { Box, Typography } from "@mui/material";
import React from "react";

type Props = {
  title: string;
  tree: TreeNode[];
  filesCount: number;
  totalBytes: number;
  onPreview: (url: string, index: number) => void;
};

const formatSize = (n: number) => {
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(2)} MB`;
  if (n < 1024 ** 4) return `${(n / 1024 ** 3).toFixed(2)} GB`;
  return `${(n / 1024 ** 4).toFixed(2)} TB`;
};

const FileTree: React.FC<Props> = ({
  title,
  tree,
  filesCount,
  totalBytes,
  onPreview,
}) => (
  <Box
    sx={{
      backgroundColor: "#fff",
      borderRadius: 2,
      border: "1px solid #e0e0e0",
      height: "100%",
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
    }}
  >
    <Box
      sx={{
        px: 2,
        py: 1.5,
        borderBottom: "1px solid #eee",
        display: "flex",
        alignItems: "center",
        gap: 1,
        flexShrink: 0,
      }}
    >
      <FolderIcon />
      <Typography sx={{ fontWeight: 700, flex: 1 }}>{title}</Typography>
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        Files: {filesCount} &nbsp; Size: {formatSize(totalBytes)}
      </Typography>
    </Box>

    <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", py: 0.5 }}>
      {tree.map((n) => (
        <FileTreeRow key={n.path} node={n} level={0} onPreview={onPreview} />
      ))}
    </Box>
  </Box>
);

export default FileTree;
