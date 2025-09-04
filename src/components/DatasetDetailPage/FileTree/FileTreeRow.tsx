// for rendering the preview and download buttons in folder structure row
import type { TreeNode } from "./types";
import { formatLeafValue, isPreviewable } from "./utils";
import CheckIcon from "@mui/icons-material/Check";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Box, Button, Collapse, Typography } from "@mui/material";
import { Tooltip, IconButton } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

type Props = {
  node: TreeNode;
  level: number;

  // src is either an external URL(string) or the internal object
  onPreview: (src: string | any, index: number, isInternal?: boolean) => void;
  getInternalByPath: (path: string) => { data: any; index: number } | undefined;
  getJsonByPath?: (path: string) => any;
};

// copy helper function
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fallback if the copy api not working
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  }
};

const FileTreeRow: React.FC<Props> = ({
  node,
  level,
  onPreview,
  getInternalByPath,
  getJsonByPath,
}) => {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  //   const internal = getInternalByPath?.(node.path);
  // const internal = getInternalByPath ? getInternalByPath(node.path) : undefined;
  const internal = getInternalByPath(node.path);
  const externalUrl = node.link?.url;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // prevent expand/ collapse from firing when click the copy button
    const json = getJsonByPath?.(node.path); // call getJsonByPath(node.path)
    const asText = JSON.stringify(json, null, 2); // subtree at this row
    if (await copyText(asText ?? "null")) {
      // call copyText function
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    }
  };

  if (node.kind === "folder") {
    // const isSubject = /^sub-/i.test(node.name); // subject folders only
    const isJson = /\.json$/i.test(node.name); // end with .json only
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
            <FolderIcon
              fontSize="small"
              sx={{
                color: isJson ? Colors.orange : Colors.darkPurple,
              }}
            />
          </Box>

          <Typography
            sx={{
              //   fontWeight: 600,
              flex: 1,
              color: Colors.darkPurple,
            }}
          >
            {node.name}
          </Typography>

          {/* Actions on folder if it carries a link (from linkHere) */}
          {node.link?.url && (
            <Box
              sx={{ display: "flex", gap: 1, mr: 0.5, flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()} // don't toggle expand
            >
              <Button
                size="small"
                variant="text"
                startIcon={<DownloadIcon fontSize="small" />}
                onClick={() => window.open(node.link!.url, "_blank")}
                sx={{ color: Colors.purple }}
              >
                Download
              </Button>
              {isPreviewable(node.link.url) && (
                <Button
                  size="small"
                  variant="text"
                  startIcon={<VisibilityIcon fontSize="small" />}
                  onClick={() => onPreview(node.link!.url, node.link!.index)}
                  sx={{ color: Colors.purple }}
                >
                  Preview
                </Button>
              )}
            </Box>
          )}

          {/* internal preview action for folders */}
          {internal && (
            <Box
              sx={{ display: "flex", gap: 1, mr: 0.5, flexShrink: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                size="small"
                variant="text"
                startIcon={<VisibilityIcon fontSize="small" />}
                onClick={() => onPreview(internal.data, internal.index, true)}
                sx={{ color: Colors.purple }}
              >
                Preview
              </Button>
            </Box>
          )}

          {/* Copy subtree JSON button */}
          <Box
            sx={{ display: "flex", gap: 1, mr: 0.5, flexShrink: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <Tooltip title={copied ? "Copied!" : "Copy subtree JSON"} arrow>
              <IconButton size="small" onClick={handleCopy}>
                {copied ? (
                  <CheckIcon fontSize="inherit" />
                ) : (
                  <ContentCopyIcon fontSize="inherit" />
                )}
              </IconButton>
            </Tooltip>
          </Box>

          {open ? <ExpandLess /> : <ExpandMore />}
        </Box>

        {/*timeout controls the duration of the expand/collapse animation*/}
        <Collapse in={open} timeout="auto" unmountOnExit>
          {node.children.map((child) => (
            <FileTreeRow
              key={child.path}
              node={child}
              level={level + 1}
              onPreview={onPreview}
              getInternalByPath={getInternalByPath}
              getJsonByPath={getJsonByPath}
            />
          ))}
        </Collapse>
      </>
    );
  }
  // if the node is a file
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, py: 0.5, px: 1 }}>
      <Box sx={{ pl: level * 1.25, pt: "2px" }}>
        <InsertDriveFileIcon
          fontSize="small"
          sx={{ color: Colors.darkGreen }}
        />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, overflow: "hidden" }}>
        <Typography
          title={node.name}
          sx={{
            // fontWeight: 500,
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
      {/* ALWAYS show copy for files, even when no external/internal */}
      <Tooltip title={copied ? "Copied!" : "Copy JSON"} arrow>
        <span>
          <IconButton
            size="small"
            onClick={handleCopy}
            disabled={!getJsonByPath} // optional safety
          >
            {copied ? (
              <CheckIcon fontSize="inherit" />
            ) : (
              <ContentCopyIcon fontSize="inherit" />
            )}
          </IconButton>
        </span>
      </Tooltip>
      {/* Placeholder to align with folder chevron */}
      <Box sx={{ width: 28 }} />
      {(externalUrl || internal) && (
        <Box
          sx={{ display: "flex", gap: 1, flexShrink: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {externalUrl && (
            <>
              <Button
                size="small"
                variant="text"
                onClick={() => window.open(externalUrl, "_blank")}
              >
                Download
              </Button>
              {isPreviewable(externalUrl) && (
                <Button
                  size="small"
                  variant="text"
                  onClick={() =>
                    onPreview(externalUrl, node.link!.index, false)
                  }
                >
                  Preview
                </Button>
              )}
            </>
          )}

          {internal && (
            <Button
              size="small"
              variant="text"
              startIcon={<VisibilityIcon fontSize="small" />}
              onClick={(e) => {
                e.stopPropagation();
                onPreview(internal.data, internal.index, true);
              }}
              sx={{ color: Colors.purple }}
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
