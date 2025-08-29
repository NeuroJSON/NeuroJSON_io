// for rendering the preview and download buttons in folder structure row
import type { TreeNode } from "./types";
import { formatLeafValue, isPreviewable } from "./utils";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import FolderIcon from "@mui/icons-material/Folder";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import VisibilityIcon from "@mui/icons-material/Visibility";
import { Box, Button, Collapse, Typography } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

type Props = {
  node: TreeNode;
  level: number;
  //   onPreview: (url: string, index: number) => void;
  // for preview in the tree row
  onPreview: (src: string | any, index: number, isInternal?: boolean) => void;
  getInternalByPath?: (
    path: string
  ) => { data: any; index: number } | undefined;
};

const FileTreeRow: React.FC<Props> = ({
  node,
  level,
  onPreview,
  getInternalByPath,
}) => {
  const [open, setOpen] = React.useState(false);
  const internal = getInternalByPath?.(node.path); // 👈 resolve by path
  const externalUrl = node.link?.url;

  //   if (node.kind === "folder") {
  //     return (
  //       <>
  //         <Box
  //           sx={{
  //             display: "flex",
  //             alignItems: "center",
  //             gap: 1,
  //             py: 0.5,
  //             px: 1,
  //             cursor: "pointer",
  //             "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
  //           }}
  //           onClick={() => setOpen((o) => !o)}
  //         >
  //           <Box sx={{ pl: level * 1.25 }}>
  //             <FolderIcon fontSize="small" />
  //           </Box>
  //           <Typography sx={{ fontWeight: 600, flex: 1 }}>{node.name}</Typography>
  //           {open ? <ExpandLess /> : <ExpandMore />}
  //         </Box>

  //         <Collapse in={open} timeout="auto" unmountOnExit>
  //           {node.children.map((child) => (
  //             <FileTreeRow
  //               key={child.path}
  //               node={child}
  //               level={level + 1}
  //               onPreview={onPreview}
  //             />
  //           ))}
  //         </Collapse>
  //       </>
  //     );
  //   }
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

          {/* ✅ Actions on folder if it carries a link (from linkHere) */}
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
            />
          ))}
        </Collapse>
      </>
    );
  }
  // if the node is a file
  return (
    <Box
      sx={{ display: "flex", alignItems: "flex-start", gap: 1, py: 0.5, px: 1 }}
    >
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
          {/* {node.link?.url && (
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
          )} */}
        </Box>
      )}
    </Box>
  );
};

export default FileTreeRow;
