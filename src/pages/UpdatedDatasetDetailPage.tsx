import PreviewModal from "../components/PreviewModal";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DescriptionIcon from "@mui/icons-material/Description";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import HomeIcon from "@mui/icons-material/Home";
import {
  Box,
  Typography,
  CircularProgress,
  Backdrop,
  Alert,
  Button,
  Collapse,
} from "@mui/material";
import FileTree from "components/DatasetDetailPage/FileTree/FileTree";
import {
  buildTreeFromDoc,
  makeLinkMap,
} from "components/DatasetDetailPage/FileTree/utils";
import LoadDatasetTabs from "components/DatasetDetailPage/LoadDatasetTabs";
import MetaDataPanel from "components/DatasetDetailPage/MetaDataPanel";
import ReadMoreText from "design/ReadMoreText";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useMemo, useState } from "react";
// import ReactJson from "react-json-view";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  fetchDocumentDetails,
  fetchDbInfoByDatasetId,
} from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";
import { NeurojsonService } from "services/neurojson.service";
import RoutesEnum from "types/routes.enum";

interface ExternalDataLink {
  name: string;
  size: string;
  path: string;
  url: string;
  index: number;
}

interface InternalDataLink {
  name: string;
  data: any;
  index: number;
  arraySize?: number[];
  path: string; // for preview in tree row
}

const UpdatedDatasetDetailPage: React.FC = () => {
  const { dbName, docId } = useParams<{ dbName: string; docId: string }>();
  const navigate = useNavigate();
  // for revision
  const [searchParams, setSearchParams] = useSearchParams();
  const rev = searchParams.get("rev") || undefined;

  const handleSelectRevision = (newRev?: string | null) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev); // copy of the query url
      if (newRev) p.set("rev", newRev);
      else p.delete("rev");
      return p;
    });
  };

  const dispatch = useAppDispatch();
  const {
    selectedDocument: datasetDocument,
    loading,
    error,
    datasetViewInfo: dbViewInfo,
  } = useAppSelector(NeurojsonSelector);

  const [externalLinks, setExternalLinks] = useState<ExternalDataLink[]>([]);
  const [internalLinks, setInternalLinks] = useState<InternalDataLink[]>([]);
  const [isInternalExpanded, setIsInternalExpanded] = useState(true);
  const [downloadScript, setDownloadScript] = useState<string>("");
  const [downloadScriptSize, setDownloadScriptSize] = useState<number>(0);
  const [totalFileSize, setTotalFileSize] = useState<number>(0);
  const [previewIsInternal, setPreviewIsInternal] = useState(false);
  const [isExternalExpanded, setIsExternalExpanded] = useState(true);
  const [jsonSize, setJsonSize] = useState<number>(0);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const aiSummary = datasetDocument?.[".datainfo"]?.AISummary ?? "";

  //   useEffect(() => {
  //     if (!datasetDocument) {
  //       setJsonSize(0);
  //       return;
  //     }
  //     const bytes = new TextEncoder().encode(
  //       JSON.stringify(datasetDocument)
  //     ).length;
  //     setJsonSize(bytes);
  //   }, [datasetDocument]);

  const linkMap = useMemo(() => makeLinkMap(externalLinks), [externalLinks]);

  const treeData = useMemo(
    () => buildTreeFromDoc(datasetDocument || {}, linkMap, ""),
    [datasetDocument, linkMap]
  );

  const treeTitle = "Files";
  const filesCount = externalLinks.length;
  const totalBytes = useMemo(() => {
    let bytes = 0;
    for (const l of externalLinks) {
      const m = l.url.match(/size=(\d+)/);
      if (m) bytes += parseInt(m[1], 10);
    }
    return bytes;
  }, [externalLinks]);

  // add spinner
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  const formatSize = (sizeInBytes: number): string => {
    if (sizeInBytes < 1024) {
      return `${sizeInBytes} Bytes`;
    } else if (sizeInBytes < 1024 * 1024) {
      return `${(sizeInBytes / 1024).toFixed(1)} KB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
    } else if (sizeInBytes < 1024 * 1024 * 1024 * 1024) {
      return `${(sizeInBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    } else {
      return `${(sizeInBytes / (1024 * 1024 * 1024 * 1024)).toFixed(2)} TB`;
    }
  };

  // Recursive function to find `_DataLink_`
  const extractDataLinks = (obj: any, path: string): ExternalDataLink[] => {
    const links: ExternalDataLink[] = [];

    const traverse = (
      node: any,
      currentPath: string,
      parentKey: string = ""
    ) => {
      if (typeof node === "object" && node !== null) {
        for (const key in node) {
          if (key === "_DataLink_" && typeof node[key] === "string") {
            let correctedUrl = node[key].replace(/:\$.*$/, "");
            const sizeMatch = node[key].match(/size=(\d+)/);
            const size = sizeMatch
              ? `${(parseInt(sizeMatch[1], 10) / 1024 / 1024).toFixed(2)} MB`
              : "Unknown Size";

            const parts = currentPath.split("/");
            const subpath = parts.slice(-3).join("/");
            const label = parentKey || "ExternalData";

            links.push({
              name: `${label} (${size}) [/${subpath}]`,
              size,
              path: currentPath, // keep full JSON path for file placement
              url: correctedUrl,
              index: links.length,
            });
          } else if (typeof node[key] === "object") {
            const isMetaKey = key.startsWith("_");
            const newLabel = !isMetaKey ? key : parentKey;
            traverse(node[key], `${currentPath}/${key}`, newLabel);
          }
        }
      }
    };

    traverse(obj, path);
    const seenUrls = new Set<string>();
    const uniqueLinks = links.filter((link) => {
      if (seenUrls.has(link.url)) return false;
      seenUrls.add(link.url);
      return true;
    });

    return uniqueLinks;
  };

  const extractInternalData = (obj: any, path = ""): InternalDataLink[] => {
    const internalLinks: InternalDataLink[] = [];

    if (obj && typeof obj === "object") {
      // Handle arrays so paths match the tree (/[0], /[1], …)
      if (Array.isArray(obj)) {
        obj.forEach((item, i) => {
          internalLinks.push(...extractInternalData(item, `${path}/[${i}]`));
        });
        return internalLinks;
      }

      if (
        obj.hasOwnProperty("MeshNode") &&
        (obj.hasOwnProperty("MeshSurf") || obj.hasOwnProperty("MeshElem"))
      ) {
        if (
          obj.MeshNode?.hasOwnProperty("_ArrayZipData_") &&
          typeof obj.MeshNode["_ArrayZipData_"] === "string"
        ) {
          console.log("path", path);
          internalLinks.push({
            name: "JMesh",
            data: obj,
            index: internalLinks.length,
            arraySize: obj.MeshNode._ArraySize_,
            path: `${path}/MeshNode`, // attach to the MeshNode row in the tree
          });
        }
      } else if (obj.hasOwnProperty("NIFTIData")) {
        if (
          obj.NIFTIData?.hasOwnProperty("_ArrayZipData_") &&
          typeof obj.NIFTIData["_ArrayZipData_"] === "string"
        ) {
          internalLinks.push({
            name: "JNIfTI",
            data: obj,
            index: internalLinks.length,
            arraySize: obj.NIFTIData._ArraySize_,
            path: `${path}/NIFTIData`, // attach to the NIFTIData row
          });
        }
      } else if (
        obj.hasOwnProperty("_ArraySize_") &&
        !/_EnumValue_$/.test(path)
      ) {
        if (
          obj.hasOwnProperty("_ArrayZipData_") &&
          typeof obj["_ArrayZipData_"] === "string"
        ) {
          internalLinks.push({
            name: "JData",
            data: obj,
            index: internalLinks.length,
            arraySize: obj._ArraySize_,
            path, // attach to the current node
          });
        }
      } else {
        Object.keys(obj).forEach((key) => {
          if (typeof obj[key] === "object") {
            // use slash paths to match buildTreeFromDoc
            internalLinks.push(
              ...extractInternalData(obj[key], `${path}/${key}`)
            );
          }
        });
      }
    }

    return internalLinks;
  };

  //   useEffect(() => {
  //     const fetchData = async () => {
  //       if (dbName && docId) {
  //         await dispatch(fetchDocumentDetails({ dbName, docId }));
  //         await dispatch(fetchDbInfoByDatasetId({ dbName, docId }));
  //       }
  //     };

  //     fetchData();
  //   }, [dbName, docId, dispatch]);

  useEffect(() => {
    if (!dbName || !docId) return;

    (async () => {
      await dispatch(fetchDocumentDetails({ dbName, docId, rev })); // for dataset detail
      dispatch(fetchDbInfoByDatasetId({ dbName, docId })); // for metadata panel (include modality)
    })();
  }, [dbName, docId, rev, dispatch]);
  // for revs list storage
  const [revsList, setRevsList] = React.useState<{ rev: string }[]>([]);

  useEffect(() => {
    const fromDoc = Array.isArray(datasetDocument?._revs_info)
      ? (datasetDocument._revs_info as { rev: string }[])
      : [];
    if (fromDoc.length && revsList.length === 0) {
      setRevsList(fromDoc);
    }
  }, [datasetDocument, revsList.length]);

  useEffect(() => {
    if (datasetDocument) {
      // Extract External Data & Assign `index`
      console.log("datasetDocument", datasetDocument);
      const links = extractDataLinks(datasetDocument, "").map(
        (link, index) => ({
          ...link,
          index, // Assign index correctly
        })
      );

      const bytes = new Blob([JSON.stringify(datasetDocument)], {
        type: "application/json",
      });
      setJsonSize(bytes.size);

      //   const bytes = new TextEncoder().encode(
      //     JSON.stringify(datasetDocument)
      //   ).length;
      //   setJsonSize(bytes);
      // Extract Internal Data & Assign `index`
      const internalData = extractInternalData(datasetDocument).map(
        (data, index) => ({
          ...data,
          index, // Assign index correctly
        })
      );

      setExternalLinks(links);
      setInternalLinks(internalData);

      // Calculate total file size from size= query param
      let total = 0;
      links.forEach((link) => {
        const sizeMatch = link.url.match(/(?:[?&]size=)(\d+)/);
        if (sizeMatch && sizeMatch[1]) {
          total += parseInt(sizeMatch[1], 10);
        }
      });
      setTotalFileSize(total);

      let totalSize = 0;

      // 1. Sum external link sizes (from URL like ...?size=12345678)
      links.forEach((link) => {
        const sizeMatch = link.url.match(/size=(\d+)/);
        if (sizeMatch) {
          totalSize += parseInt(sizeMatch[1], 10);
        }
      });

      // 2. Estimate internal size from _ArraySize_ (assume Float32 = 4 bytes)
      internalData.forEach((link) => {
        if (link.arraySize && Array.isArray(link.arraySize)) {
          const count = link.arraySize.reduce((acc, val) => acc * val, 1);
          totalSize += count * 4;
        }
      });

      //   const blob = new Blob([JSON.stringify(datasetDocument, null, 2)], {
      //     type: "application/json",
      //   });
      //   setJsonSize(blob.size);

      //  Construct download script dynamically
      let script = `curl -L --create-dirs "https://neurojson.io:7777/${dbName}/${docId}" -o "${docId}.json"\n`;

      links.forEach((link) => {
        const url = link.url;
        const match = url.match(/file=([^&]+)/);

        const filename = match
          ? (() => {
              try {
                return decodeURIComponent(match[1]);
              } catch {
                return match[1]; // fallback if decode fails
              }
            })()
          : `file-${link.index}`;

        const outputPath = `$HOME/.neurojson/io/${dbName}/${docId}/${filename}`;

        script += `curl -L --create-dirs "${url}" -o "${outputPath}"\n`;
      });
      setDownloadScript(script);
      // Calculate and set script size
      const scriptBlob = new Blob([script], { type: "text/plain" });
      setDownloadScriptSize(scriptBlob.size);
    }
  }, [datasetDocument, docId]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDataKey, setPreviewDataKey] = useState<any>(null);

  const handleDownloadDataset = () => {
    if (!datasetDocument) return;
    const jsonData = JSON.stringify(datasetDocument);
    const blob = new Blob([jsonData], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${docId}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadScript = () => {
    const blob = new Blob([downloadScript], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${docId}.sh`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePreview = (
    dataOrUrl: string | any,
    idx: number,
    isInternal: boolean = false
  ) => {
    console.log(
      "🟢 Preview button clicked for:",
      dataOrUrl,
      "Index:",
      idx,
      "Is Internal:",
      isInternal
    );

    // Clear any stale preview type from last run
    delete (window as any).__previewType;

    // fix spinner
    setIsPreviewLoading(true); // Show the spinner overlay
    setPreviewIndex(idx);
    setPreviewDataKey(dataOrUrl);
    setPreviewIsInternal(isInternal);

    const is2DPreviewCandidate = (obj: any): boolean => {
      if (typeof window !== "undefined" && (window as any).__previewType) {
        return (window as any).__previewType === "2d";
      }

      if (!obj || typeof obj !== "object") {
        return false;
      }

      if (!obj._ArrayType_ || !obj._ArraySize_ || !obj._ArrayZipData_) {
        return false;
      }
      const dim = obj._ArraySize_;

      return (
        Array.isArray(dim) &&
        (dim.length === 1 || dim.length === 2) &&
        dim.every((v) => typeof v === "number" && v > 0)
      );
    };
    // for add spinner ---- start
    // When legacy preview is actually ready, turn off spinner & open modal
    window.__onPreviewReady = () => {
      setIsPreviewLoading(false);
      // Only open modal for 3D data
      if (!is2DPreviewCandidate(dataOrUrl)) {
        setPreviewOpen(true);
      }
      delete window.__onPreviewReady;
      delete (window as any).__previewType; // for is2DPreviewCandidate
    };
    // -----end

    const extractFileName = (url: string): string => {
      const match = url.match(/file=([^&]+)/);
      if (match) {
        // Strip any trailing query parameters
        const raw = decodeURIComponent(match[1]);
        return raw.split("?")[0].split("&")[0];
      }
      // fallback: try to get last path part if no 'file=' param
      try {
        const u = new URL(url);
        const parts = u.pathname.split("/");
        return parts[parts.length - 1];
      } catch {
        return url;
      }
    };

    const fileName =
      typeof dataOrUrl === "string" ? extractFileName(dataOrUrl) : "";
    // console.log("🔍 Extracted fileName:", fileName);

    const isPreviewableFile = (fileName: string): boolean => {
      return /\.(nii\.gz|jdt|jdb|bmsh|jmsh|bnii)$/i.test(fileName);
    };
    // console.log("🧪 isPreviewableFile:", isPreviewableFile(fileName));

    if (isInternal) {
      try {
        if (!(window as any).intdata) {
          (window as any).intdata = [];
        }
        if (!(window as any).intdata[idx]) {
          (window as any).intdata[idx] = ["", "", null, `Internal ${idx}`];
        }
        (window as any).intdata[idx][2] = JSON.parse(JSON.stringify(dataOrUrl));

        const is2D = is2DPreviewCandidate(dataOrUrl);

        if (is2D) {
          console.log("📊 2D data → rendering inline with dopreview()");
          (window as any).dopreview(dataOrUrl, idx, true);
          const panel = document.getElementById("chartpanel");
          if (panel) panel.style.display = "block"; // Show it!
          setPreviewOpen(false); // Don't open modal
        } else {
          //   console.log("🎬 3D data → rendering in modal");
          (window as any).previewdata(dataOrUrl, idx, true, []);
        }
      } catch (err) {
        console.error("❌ Error in internal preview:", err);
      }
    } else {
      const fileName =
        typeof dataOrUrl === "string" ? extractFileName(dataOrUrl) : "";
      if (isPreviewableFile(fileName)) {
        (window as any).previewdataurl(dataOrUrl, idx);
      } else {
        console.warn("⚠️ Unsupported file format for preview:", dataOrUrl);
      }
    }
  };

  // for preview in tree row

  const internalMap = React.useMemo(() => {
    const m = new Map<string, { data: any; index: number }>();
    for (const it of internalLinks)
      m.set(it.path, { data: it.data, index: it.index });
    return m;
  }, [internalLinks]);

  const getInternalByPath = (path: string) => internalMap.get(path);

  // returns the subtree/primitive at that path—returning the whole document if the path is empty, or undefined if any step is invalid.
  const getJsonByPath = React.useCallback(
    (path: string) => {
      if (!datasetDocument) return undefined;
      if (!path) return datasetDocument; // root

      const parts = path.split("/").filter(Boolean); // "/a/b/[0]/c" → ["a","b","[0]","c"]
      let cur: any = datasetDocument;
      for (const p of parts) {
        if (/^\[\d+\]$/.test(p)) {
          const idx = parseInt(p.slice(1, -1), 10);
          if (!Array.isArray(cur)) return undefined;
          cur = cur[idx];
        } else {
          if (cur == null || typeof cur !== "object") return undefined;
          cur = cur[p];
        }
      }
      return cur;
    },
    [datasetDocument]
  );

  const handleClosePreview = () => {
    setPreviewOpen(false);
    setPreviewDataKey(null);

    // Cancel animation frame loop
    if (typeof window.reqid !== "undefined") {
      cancelAnimationFrame(window.reqid);
      window.reqid = undefined;
    }

    // Stop 2D chart if any
    const panel = document.getElementById("chartpanel");
    if (panel) panel.style.display = "none";

    // Reset Three.js global refs
    window.scene = undefined;
    window.camera = undefined;
    window.renderer = undefined;
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress sx={{ color: Colors.primary.main }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: "center", padding: 4 }}>
        <Alert severity="error" sx={{ color: Colors.error }}>
          {error}
        </Alert>
      </Box>
    );
  }

  const onekey = datasetDocument
    ? datasetDocument.hasOwnProperty("README")
      ? "README"
      : datasetDocument.hasOwnProperty("dataset_description.json")
      ? "dataset_description.json"
      : "_id"
    : "_id";

  return (
    <>
      <Box sx={{ padding: 4 }}>
        <Button
          variant="text"
          onClick={() => navigate(-1)}
          sx={{
            marginBottom: 2,
            color: Colors.white,
            "&:hover": {
              transform: "scale(1.05)",
              backgroundColor: "transparent",
              textDecoration: "underline",
            },
          }}
        >
          Back
        </Button>

        <Box
          sx={{
            position: "sticky",
            top: 0,
            backgroundColor: "white",
            zIndex: 10,
            padding: 2,
            borderBottom: `1px solid ${Colors.lightGray}`,
            borderRadius: "8px",
          }}
        >
          {/* Dataset Title (From dataset_description.json) */}
          <Typography
            variant="h4"
            color={Colors.darkPurple}
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            {datasetDocument?.["dataset_description.json"]?.Name ??
              `Dataset: ${docId}`}
          </Typography>

          {/* Dataset Author (If Exists) */}
          {datasetDocument?.["dataset_description.json"]?.Authors && (
            <Typography
              variant="h6"
              sx={{ fontStyle: "italic", color: Colors.textSecondary }}
            >
              {Array.isArray(
                datasetDocument["dataset_description.json"].Authors
              )
                ? datasetDocument["dataset_description.json"].Authors.join(", ")
                : datasetDocument["dataset_description.json"].Authors}
            </Typography>
          )}

          {/* Breadcrumb Navigation (Home → Database → Dataset) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
            {/* Home Icon Button */}
            <Button
              onClick={() => navigate("/")}
              sx={{
                backgroundColor: "transparent",
                padding: 0,
                minWidth: "auto",
                "&:hover": { backgroundColor: "transparent" },
              }}
            >
              <HomeIcon
                sx={{
                  color: Colors.darkPurple,
                  "&:hover": {
                    transform: "scale(1.1)",
                    backgroundColor: "transparent",
                  },
                }}
              />
            </Button>

            <Typography variant="h5" sx={{ marginX: 1, fontWeight: "bold" }}>
              »
            </Typography>

            {/* Database Name (Clickable) */}
            <Button
              onClick={() => navigate(`${RoutesEnum.DATABASES}/${dbName}`)}
              sx={{
                textTransform: "none",
                fontSize: "1.2rem",
                fontWeight: "bold",
                color: Colors.darkPurple,
                "&:hover": {
                  transform: "scale(1.05)",
                  backgroundColor: "transparent",
                },
              }}
            >
              {dbName?.toLowerCase()}
            </Button>

            <Typography variant="h5" sx={{ marginX: 1, fontWeight: "bold" }}>
              »
            </Typography>

            {/* Dataset Name (_id field) */}
            <Typography
              variant="h5"
              sx={{
                fontWeight: "bold",
                color: Colors.darkPurple,
                fontSize: "1.2rem",
              }}
            >
              {docId}
            </Typography>
          </Box>

          {/* ai summary */}
          {aiSummary && <ReadMoreText text={aiSummary} />}

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              mb: 2,
              backgroundColor: "#f5f5f5",
              padding: "12px",
              borderRadius: "8px",
            }}
          >
            <Button
              variant="contained"
              startIcon={<CloudDownloadIcon />}
              onClick={handleDownloadDataset}
              sx={{
                backgroundColor: Colors.purple,
                color: Colors.lightGray,
                "&:hover": { backgroundColor: Colors.secondaryPurple },
              }}
            >
              Download Matadata ({formatSize(jsonSize)})
            </Button>

            <Button
              variant="contained"
              startIcon={<DescriptionIcon />}
              onClick={handleDownloadScript}
              sx={{
                backgroundColor: Colors.purple,
                color: Colors.lightGray,
                "&:hover": { backgroundColor: Colors.secondaryPurple },
              }}
            >
              {/* Script to Download All Files ({downloadScript.length} Bytes) */}
              Script to Download All Files ({formatSize(downloadScriptSize)})
              {externalLinks.length > 0 &&
                ` (links: ${externalLinks.length}, total: ${formatSize(
                  totalFileSize
                )})`}
            </Button>
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "flex-start",
            marginTop: 2,
            flexDirection: {
              xs: "column",
              md: "row",
            },
            height: {
              xs: "auto",
              md: "560px", // fixed height container
            },
          }}
        >
          {/* tree viewer (left panel) */}
          <Box
            sx={{
              flex: 3,
              backgroundColor: "#f5f5f5",
              padding: 2,
              borderRadius: "8px",
              overflowX: "auto",
              height: {
                xs: "auto",
                md: "100%",
              },
              width: {
                xs: "100%",
                md: "auto",
              },
              minWidth: {
                xs: "100%",
                md: "350px",
              },
            }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                height: "100%",
                overflow: "hidden",
              }}
            >
              {/* folder structure */}

              <Box sx={{ flex: 1, minHeight: 240, overflow: "hidden" }}>
                <FileTree
                  title={treeTitle}
                  tree={treeData}
                  filesCount={filesCount}
                  totalBytes={totalBytes}
                  onPreview={handlePreview} // pass the function down to FileTree
                  getInternalByPath={getInternalByPath}
                  getJsonByPath={getJsonByPath}
                />
              </Box>
            </Box>
          </Box>

          {/* MetaData panels (right panel) */}
          <Box
            sx={{
              width: {
                xs: "100%",
                md: "460px",
              },
              minWidth: {
                xs: "100%",
                md: "360px",
              },
              height: {
                xs: "auto",
                md: "100%",
              },
              display: "flex",
              flexDirection: "column",
            }}
          >
            <MetaDataPanel
              datasetDocument={datasetDocument}
              dbViewInfo={dbViewInfo}
              dbName={dbName}
              docId={docId}
              // new props:
              currentRev={rev} // reflect URL selection
              onChangeRev={handleSelectRevision}
              revsList={revsList}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "column", lg: "row" },
            gap: 2,
            marginTop: 2,
            height: {
              xs: "auto",
              md: "100%",
            },
            width: {
              xs: "100%",
              md: "auto",
            },
            minWidth: {
              xs: "100%",
              md: "350px",
            },
          }}
        >
          <Box
            sx={{
              backgroundColor: Colors.lightBlue,
              padding: 2,
              borderRadius: "8px",
              flex: 1,
            }}
          >
            {/* Collapsible header */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => setIsInternalExpanded(!isInternalExpanded)}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                Internal Data ({internalLinks.length} objects)
              </Typography>
              {isInternalExpanded ? <ExpandLess /> : <ExpandMore />}
            </Box>

            <Collapse in={isInternalExpanded}>
              {/* Scrollable area */}
              <Box
                sx={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  // marginTop: 2,
                  paddingRight: 1,
                  "&::-webkit-scrollbar": {
                    width: "6px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#aaa",
                    borderRadius: "4px",
                  },
                }}
              >
                {internalLinks.length > 0 ? (
                  internalLinks.map((link, index) => (
                    <Box
                      key={index}
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "6px 10px",
                        backgroundColor: "white",
                        borderRadius: "4px",
                        border: "1px solid #ddd",
                        mt: 1,
                        height: "34px",
                        minWidth: 0,
                        fontSize: "0.85rem",
                      }}
                    >
                      <Typography
                        sx={{
                          flexGrow: 1,
                          minWidth: 0,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          fontSize: "1rem",
                          marginRight: "12px",
                          maxWidth: "calc(100% - 160px)",
                        }}
                        title={link.name}
                      >
                        {link.name}{" "}
                        {link.arraySize ? `[${link.arraySize.join("x")}]` : ""}
                      </Typography>
                      <Button
                        variant="contained"
                        size="small"
                        sx={{
                          backgroundColor: Colors.purple,
                          flexShrink: 0,
                          minWidth: "70px",
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          lineHeight: 1,
                          "&:hover": {
                            backgroundColor: Colors.secondaryPurple,
                          },
                        }}
                        onClick={() =>
                          handlePreview(link.data, link.index, true)
                        }
                      >
                        Preview
                      </Button>
                    </Box>
                  ))
                ) : (
                  <Typography sx={{ fontStyle: "italic", mt: 1 }}>
                    No internal data found.
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Box>
          <Box
            sx={{
              backgroundColor: Colors.lightBlue,
              padding: 2,
              borderRadius: "8px",
              flex: 1,
              // overflowY: "auto",
              overflow: "hidden",
            }}
          >
            {/* Header with toggle */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
              }}
              onClick={() => setIsExternalExpanded(!isExternalExpanded)}
            >
              <Typography variant="h6" sx={{ fontWeight: "bold" }}>
                External Data ({externalLinks.length} links)
              </Typography>
              {isExternalExpanded ? <ExpandLess /> : <ExpandMore />}
            </Box>

            <Collapse in={isExternalExpanded}>
              {/* Scrollable card container */}
              <Box
                sx={{
                  maxHeight: "300px",
                  overflowY: "auto",
                  // marginTop: 2,
                  paddingRight: 1,
                  "&::-webkit-scrollbar": {
                    width: "6px",
                  },
                  "&::-webkit-scrollbar-thumb": {
                    backgroundColor: "#ccc",
                    borderRadius: "4px",
                  },
                }}
              >
                {externalLinks.length > 0 ? (
                  externalLinks.map((link, index) => {
                    const match = link.url.match(/file=([^&]+)/);
                    const fileName = match ? match[1] : "";
                    const isPreviewable =
                      /\.(nii(\.gz)?|bnii|jdt|jdb|jmsh|bmsh)$/i.test(fileName);

                    return (
                      <Box
                        key={index}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "6px 10px",
                          backgroundColor: "white",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                          mt: 1,
                          height: "34px",
                          minWidth: 0,
                          fontSize: "0.85rem",
                        }}
                      >
                        <Typography
                          sx={{
                            flexGrow: 1,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            minWidth: 0,
                            fontSize: "1rem",
                            marginRight: "12px",
                            maxWidth: "calc(100% - 160px)",
                          }}
                          title={link.name}
                        >
                          {link.name}
                        </Typography>
                        <Box sx={{ display: "flex", flexShrink: 0, gap: 1 }}>
                          <Button
                            variant="contained"
                            size="small"
                            sx={{
                              backgroundColor: Colors.purple,
                              minWidth: "70px",
                              fontSize: "0.7rem",
                              padding: "2px 6px",
                              lineHeight: 1,
                              "&:hover": {
                                backgroundColor: Colors.secondaryPurple,
                              },
                            }}
                            onClick={() => window.open(link.url, "_blank")}
                          >
                            Download
                          </Button>
                          {isPreviewable && (
                            <Button
                              variant="outlined"
                              size="small"
                              sx={{
                                color: Colors.purple,
                                borderColor: Colors.purple,
                                minWidth: "65px",
                                fontSize: "0.7rem",
                                padding: "2px 6px",
                                lineHeight: 1,
                                "&:hover": {
                                  color: Colors.secondaryPurple,
                                  borderColor: Colors.secondaryPurple,
                                },
                              }}
                              onClick={() =>
                                handlePreview(link.url, link.index, false)
                              }
                            >
                              Preview
                            </Button>
                          )}
                        </Box>
                      </Box>
                    );
                  })
                ) : (
                  <Typography sx={{ fontStyle: "italic", mt: 1 }}>
                    No external links found.
                  </Typography>
                )}
              </Box>
            </Collapse>
          </Box>
        </Box>

        <div
          id="chartpanel"
          style={{
            display: "none",
            marginTop: "16px",
            background: Colors.darkGray,
            color: Colors.black,
            padding: "12px",
            borderRadius: "8px",
            position: "relative",
          }}
        ></div>

        {/* <div id="chartpanel"></div> */}
        <Box
          sx={{
            borderBottom: `1px solid ${Colors.lightGray}`,
            marginTop: 4,
            marginBottom: 3,
          }}
        ></Box>

        {/* <DatasetFlashcards */}
        <LoadDatasetTabs
          pagename={docId ?? ""}
          docname={datasetDocument?.Name || ""}
          dbname={dbName || ""}
          serverUrl={"https://neurojson.io:7777/"}
          datasetDocument={datasetDocument}
          onekey={onekey}
          handleDownloadDataset={handleDownloadDataset}
        />

        {/* Global spinner while loading (before modal mounts) */}
        <Backdrop
          open={isPreviewLoading && !previewOpen}
          sx={{ zIndex: 2000, color: "#fff" }}
        >
          <CircularProgress color="inherit" />
        </Backdrop>

        {/* Preview Modal Component - Add Here */}
        <PreviewModal
          isOpen={previewOpen}
          dataKey={previewDataKey}
          isInternal={previewIsInternal}
          onClose={handleClosePreview}
          isLoading={isPreviewLoading} // add spinner
          previewIndex={previewIndex} // provide the correct index for preview.js to look up data
          key={`${previewIndex}-${previewOpen}`} // react will destroy the existing component and create a new one for mount
        />
      </Box>
    </>
  );
};

export default UpdatedDatasetDetailPage;
