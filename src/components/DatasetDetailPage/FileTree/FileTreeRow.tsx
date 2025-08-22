import type { TreeNode } from "./types";
import { formatLeafValue, isPreviewable } from "./utils";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Box, Button, Collapse, Typography } from "@mui/material";
import React from "react";

type Props = {
  node: TreeNode;
  level: number;
  onPreview: (url: string, index: number) => void;
};

const FileTreeRow: React.FC<Props> = ({ node, level, onPreview }) => {
  const [open, setOpen] = React.useState(false);

  if (node.kind === "folder") {
    return (
      <>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            py: 0.5,
            px: 1,
            cursor: "pointer",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
          }}
          onClick={() => setOpen((o) => !o)}
        >
          <Box sx={{ pl: level * 1.25 }}>
            <FolderIcon fontSize="small" />
          </Box>
          <Typography sx={{ fontWeight: 600, flex: 1 }}>{node.name}</Typography>
          {open ? <ExpandLess /> : <ExpandMore />}
        </Box>

        <Collapse in={open} timeout="auto" unmountOnExit>
          {node.children.map((child) => (
            <FileTreeRow
              key={child.path}
              node={child}
              level={level + 1}
              onPreview={onPreview}
            />
          ))}
        </Collapse>
      </>
    );
  }

  return (
    <Box
      sx={{ display: "flex", alignItems: "flex-start", gap: 1, py: 0.5, px: 1 }}
    >
      <Box sx={{ pl: level * 1.25, pt: "2px" }}>
        <InsertDriveFileIcon fontSize="small" />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <Typography
          title={node.name}
          sx={{
            fontWeight: 500,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {node.name}
        </Typography>

        {!node.link && node.value !== undefined && (
          <Typography
            title={
              node.name === "_ArrayZipData_"
                ? "[compressed data]"
                : typeof node.value === "string"
                ? node.value
                : JSON.stringify(node.value)
            }
            sx={{
              fontFamily: "monospace",
              fontSize: "0.85rem",
              color: "text.secondary",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              mt: 0.25,
            }}
          >
            {node.name === "_ArrayZipData_"
              ? "[compressed data]"
              : formatLeafValue(node.value)}
          </Typography>
        )}
      </Box>

      {node.link?.url && (
        <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
          <Button
            size="small"
            variant="text"
            onClick={() => window.open(node.link!.url, "_blank")}
            startIcon={<DownloadIcon fontSize="small" />}
          >
            Download
          </Button>
          {isPreviewable(node.link.url) && (
            <Button
              size="small"
              variant="text"
              startIcon={<VisibilityIcon fontSize="small" />}
              onClick={() => onPreview(node.link!.url, node.link!.index)}
            >
              Preview
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

export default FileTreeRow;
