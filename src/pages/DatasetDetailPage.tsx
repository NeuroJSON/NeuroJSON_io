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
  Card,
  CardContent,
  Collapse,
} from "@mui/material";
import { TextField } from "@mui/material";
import LoadDatasetTabs from "components/DatasetDetailPage/LoadDatasetTabs";
import ReadMoreText from "design/ReadMoreText";
import theme, { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useMemo, useState } from "react";
import ReactJson from "react-json-view";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDocumentDetails } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";
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
}

const transformJsonForDisplay = (obj: any): any => {
  if (typeof obj !== "object" || obj === null) return obj;

  const transformed: any = Array.isArray(obj) ? [] : {};

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const value = obj[key];

    // Match README, CHANGES, or file extensions
    const isLongTextKey = /^(README|CHANGES)$|\.md$|\.txt$|\.m$/i.test(key);

    if (typeof value === "string" && isLongTextKey) {
      transformed[key] = `<code class="puretext">${value}</code>`;
    } else if (typeof value === "object") {
      transformed[key] = transformJsonForDisplay(value);
    } else {
      transformed[key] = value;
    }
  }

  return transformed;
};

const formatAuthorsWithDOI = (
  authors: string[] | string,
  doi: string
): JSX.Element => {
  let authorText = "";

  if (Array.isArray(authors)) {
    if (authors.length === 1) {
      authorText = authors[0];
    } else if (authors.length === 2) {
      authorText = authors.join(", ");
    } else {
      authorText = `${authors.slice(0, 2).join("; ")} et al.`;
    }
  } else {
    authorText = authors;
  }

  let doiUrl = "";
  if (doi) {
    if (/^[0-9]/.test(doi)) {
      doiUrl = `https://doi.org/${doi}`;
    } else if (/^doi\./.test(doi)) {
      doiUrl = `https://${doi}`;
    } else if (/^doi:/.test(doi)) {
      doiUrl = doi.replace(/^doi:/, "https://doi.org/");
    } else {
      doiUrl = doi;
    }
  }

  return (
    <>
      <i>{authorText}</i>
      {doiUrl && (
        <a
          href={doiUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            marginLeft: "10px",
            color: "black",
            fontWeight: 500,
            fontStyle: "normal",
            textDecoration: "none",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.textDecoration = "underline")
          }
          onMouseLeave={(e) => (e.currentTarget.style.textDecoration = "none")}
        >
          {doiUrl}
        </a>
      )}
    </>
  );
};

const DatasetDetailPage: React.FC = () => {
  const { dbName, docId } = useParams<{ dbName: string; docId: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    selectedDocument: datasetDocument,
    loading,
    error,
  } = useAppSelector(NeurojsonSelector);

  const [externalLinks, setExternalLinks] = useState<ExternalDataLink[]>([]);
  const [internalLinks, setInternalLinks] = useState<InternalDataLink[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isInternalExpanded, setIsInternalExpanded] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<HTMLElement[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [downloadScript, setDownloadScript] = useState<string>("");
  const [downloadScriptSize, setDownloadScriptSize] = useState<number>(0);
  const [totalFileSize, setTotalFileSize] = useState<number>(0);

  const [previewIsInternal, setPreviewIsInternal] = useState(false);
  const [isExternalExpanded, setIsExternalExpanded] = useState(true);
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  const [originalTextMap, setOriginalTextMap] = useState<
    Map<HTMLElement, string>
  >(new Map());
  const [jsonViewerKey, setJsonViewerKey] = useState(0);
  const [jsonSize, setJsonSize] = useState<number>(0);
  const [transformedDataset, setTransformedDataset] = useState<any>(null);
  const [previewIndex, setPreviewIndex] = useState<number>(0);
  const aiSummary = datasetDocument?.[".datainfo"]?.AISummary ?? "";

  // add spinner
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [readyPreviewData, setReadyPreviewData] = useState<any>(null);

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
    // return links;
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
      if (
        obj.hasOwnProperty("MeshNode") &&
        (obj.hasOwnProperty("MeshSurf") || obj.hasOwnProperty("MeshElem"))
      ) {
        if (
          obj.MeshNode.hasOwnProperty("_ArrayZipData_") &&
          typeof obj.MeshNode["_ArrayZipData_"] === "string"
        ) {
          internalLinks.push({
            name: `JMesh`,
            data: obj,
            index: internalLinks.length, // maybe can be remove
            arraySize: obj.MeshNode._ArraySize_,
          });
        }
      } else if (obj.hasOwnProperty("NIFTIData")) {
        if (
          obj.NIFTIData.hasOwnProperty("_ArrayZipData_") &&
          typeof obj.NIFTIData["_ArrayZipData_"] === "string"
        ) {
          internalLinks.push({
            name: `JNIfTI`,
            data: obj,
            index: internalLinks.length, //maybe can be remove
            arraySize: obj.NIFTIData._ArraySize_,
          });
        }
      } else if (
        obj.hasOwnProperty("_ArraySize_") &&
        !path.match("_EnumValue_$")
      ) {
        if (
          obj.hasOwnProperty("_ArrayZipData_") &&
          typeof obj["_ArrayZipData_"] === "string"
        ) {
          internalLinks.push({
            name: `JData`,
            data: obj,
            index: internalLinks.length, // maybe can be remove
            arraySize: obj._ArraySize_,
          });
        }
      } else {
        Object.keys(obj).forEach((key) => {
          if (typeof obj[key] === "object") {
            internalLinks.push(
              ...extractInternalData(
                obj[key],
                `${path}.${key.replace(/\./g, "\\.")}`
              )
            );
          }
        });
      }
    }

    return internalLinks;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (dbName && docId) {
        await dispatch(fetchDocumentDetails({ dbName, docId }));
        // console.log("dbName", dbName);
        // console.log("docId", docId);
      }
    };

    fetchData();
  }, [dbName, docId, dispatch]);

  useEffect(() => {
    if (datasetDocument) {
      // ✅ Extract External Data & Assign `index`
      // console.log("datasetDocument", datasetDocument);
      const links = extractDataLinks(datasetDocument, "").map(
        (link, index) => ({
          ...link,
          index, // ✅ Assign index correctly
        })
      );

      // ✅ Extract Internal Data & Assign `index`
      const internalData = extractInternalData(datasetDocument).map(
        (data, index) => ({
          ...data,
          index, // ✅ Assign index correctly
        })
      );

      // console.log("🟢 Extracted external links:", links);
      // console.log("🟢 Extracted internal data:", internalData);

      setExternalLinks(links);
      setInternalLinks(internalData);
      const transformed = transformJsonForDisplay(datasetDocument);
      setTransformedDataset(transformed);

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

      // 1️⃣ Sum external link sizes (from URL like ...?size=12345678)
      links.forEach((link) => {
        const sizeMatch = link.url.match(/size=(\d+)/);
        if (sizeMatch) {
          totalSize += parseInt(sizeMatch[1], 10);
        }
      });

      // 2️⃣ Estimate internal size from _ArraySize_ (assume Float32 = 4 bytes)
      internalData.forEach((link) => {
        if (link.arraySize && Array.isArray(link.arraySize)) {
          const count = link.arraySize.reduce((acc, val) => acc * val, 1);
          totalSize += count * 4;
        }
      });

      // setTotalFileSize(totalSize);

      // const minifiedBlob = new Blob([JSON.stringify(datasetDocument)], {
      //   type: "application/json",
      // });
      // setJsonSize(minifiedBlob.size);

      const blob = new Blob([JSON.stringify(datasetDocument)], {
        type: "application/json",
      });
      setJsonSize(blob.size);

      // // ✅ Construct download script dynamically
      let script = `curl -L --create-dirs "https://neurojson.io:7777/${dbName}/${docId}" -o "${docId}.json"\n`;

      links.forEach((link) => {
        const url = link.url;
        // console.log("url", url);
        const match = url.match(/file=([^&]+)/);
        // console.log("match", match);
        // console.log("match[1]", match?.[1]);
        // try {
        //   const decoded = match?.[1] ? decodeURIComponent(match[1]) : "N/A";
        //   console.log("decode", decoded);
        // } catch (err) {
        //   console.warn("⚠️ Failed to decode match[1]:", match?.[1], err);
        // }

        // const filename = match
        //   ? decodeURIComponent(match[1])
        //   : `file-${link.index}`;

        const filename = match
          ? (() => {
              try {
                return decodeURIComponent(match[1]);
              } catch {
                return match[1]; // fallback if decode fails
              }
            })()
          : `file-${link.index}`;
        // console.log("filename", filename);

        const outputPath = `$HOME/.neurojson/io/${dbName}/${docId}/${filename}`;

        script += `curl -L --create-dirs "${url}" -o "${outputPath}"\n`;
      });
      setDownloadScript(script);
      // ✅ Calculate and set script size
      const scriptBlob = new Blob([script], { type: "text/plain" });
      setDownloadScriptSize(scriptBlob.size);
    }
  }, [datasetDocument, docId]);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDataKey, setPreviewDataKey] = useState<any>(null);

  useEffect(() => {
    highlightMatches(searchTerm);

    // Cleanup to reset highlights when component re-renders or unmounts
    return () => {
      document.querySelectorAll(".highlighted").forEach((el) => {
        const element = el as HTMLElement;
        const text = element.textContent || "";
        element.innerHTML = text;
        element.classList.remove("highlighted");
      });
    };
  }, [searchTerm, datasetDocument]);

  useEffect(() => {
    if (!transformedDataset) return;

    const spans = document.querySelectorAll(".string-value");

    spans.forEach((el) => {
      if (el.textContent?.includes('<code class="puretext">')) {
        // Inject as HTML so it renders code block correctly
        el.innerHTML = el.textContent ?? "";
      }
    });
  }, [transformedDataset]);

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

    // setPreviewOpen(false);     // IMPORTANT: Keep modal closed for now

    // This callback will be triggered by the legacy script when data is ready
    // (window as any).__onPreviewReady = (decodedData: any) => {
    //   console.log("✅ Data is ready! Opening modal.");
    //   setReadyPreviewData(decodedData); // Store the final data for the modal
    //   setIsPreviewLoading(false);      // Hide the spinner
    //   setPreviewOpen(true);            // NOW it's time to open the modal
    // };

    const is2DPreviewCandidate = (obj: any): boolean => {
      if (typeof window !== "undefined" && (window as any).__previewType) {
        // console.log("preview type: 2d");
        return (window as any).__previewType === "2d";
      }
      // if (window.__previewType) {
      //   console.log("work~~~~~~~");
      //   return window.__previewType === "2d";
      // }
      console.log("is 2d preview candidate !== 2d");
      console.log("obj", obj);
      // if (typeof obj === "string" && obj.includes("db=optics-at-martinos")) {
      //   return false;
      // }
      // if (typeof obj === "string" && obj.endsWith(".jdb")) {
      //   return true;
      // }
      if (!obj || typeof obj !== "object") {
        return false;
      }
      console.log("=======after first condition");
      if (!obj._ArrayType_ || !obj._ArraySize_ || !obj._ArrayZipData_) {
        console.log("inside second condition");
        return false;
      }
      const dim = obj._ArraySize_;
      console.log("array.isarray(dim)", Array.isArray(dim));
      console.log("dim.length", dim.length === 1 || dim.length === 2);

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
      // return match ? decodeURIComponent(match[1]) : url;
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
    console.log("🔍 Extracted fileName:", fileName);

    const isPreviewableFile = (fileName: string): boolean => {
      return /\.(nii\.gz|jdt|jdb|bmsh|jmsh|bnii)$/i.test(fileName);
    };
    console.log("🧪 isPreviewableFile:", isPreviewableFile(fileName));

    // test for add spinner
    // if (isInternal) {
    //   if (is2DPreviewCandidate(dataOrUrl)) {
    //     // inline 2D
    //     window.dopreview(dataOrUrl, idx, true);
    //   } else {
    //     // 3D
    //     window.previewdata(dataOrUrl, idx, true, []);
    //   }
    // } else {
    //   // external
    //   window.previewdataurl(dataOrUrl, idx);
    // }

    // for test so command out the below
    // setPreviewIndex(idx);
    // setPreviewDataKey(dataOrUrl);
    // setPreviewIsInternal(isInternal);
    // setPreviewOpen(true);

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
          if (panel) panel.style.display = "block"; // 🔓 Show it!
          setPreviewOpen(false); // ⛔ Don't open modal
          // setPreviewLoading(false); // stop spinner
        } else {
          console.log("🎬 3D data → rendering in modal");
          (window as any).previewdata(dataOrUrl, idx, true, []);
          // add spinner
          // setPreviewDataKey(dataOrUrl);
          // setPreviewOpen(true);
          // setPreviewIsInternal(true);
        }
      } catch (err) {
        console.error("❌ Error in internal preview:", err);
        // setPreviewLoading(false); // add spinner
      }
    } else {
      // external
      // if (/\.(nii\.gz|jdt|jdb|bmsh|jmsh|bnii)$/i.test(dataOrUrl)) {
      const fileName =
        typeof dataOrUrl === "string" ? extractFileName(dataOrUrl) : "";
      if (isPreviewableFile(fileName)) {
        (window as any).previewdataurl(dataOrUrl, idx);
        const is2D = is2DPreviewCandidate(dataOrUrl);
        const panel = document.getElementById("chartpanel");
        console.log("is2D", is2D);
        console.log("panel", panel);

        if (is2D) {
          console.log("📊 2D data → rendering inline with dopreview()");
          if (panel) panel.style.display = "block"; // 🔓 Show it!
          setPreviewOpen(false); // ⛔ Don't open modal
        } else {
          if (panel) panel.style.display = "none"; // 🔒 Hide chart panel on 3D external
        }
        //add spinner
        // setPreviewDataKey(dataOrUrl);
        // setPreviewOpen(true);
        // setPreviewIsInternal(false);
      } else {
        console.warn("⚠️ Unsupported file format for preview:", dataOrUrl);
        // setPreviewLoading(false); // add spinner
      }
    }
  };

  // const handleClosePreview = () => {
  //   console.log("🛑 Closing preview modal.");
  //   setPreviewOpen(false);
  //   setPreviewDataKey(null);

  //   // Stop any Three.js rendering when modal closes
  //   if (typeof (window as any).update === "function") {
  //     cancelAnimationFrame((window as any).reqid);
  //   }

  //   const panel = document.getElementById("chartpanel");
  //   if (panel) panel.style.display = "none"; // 🔒 Hide 2D chart if modal closes
  // };
  const handleClosePreview = () => {
    console.log("🛑 Closing preview modal.");
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

    // Remove canvas children
    // const canvasDiv = document.getElementById("canvas");
    // if (canvasDiv) {
    //   while (canvasDiv.firstChild) {
    //     canvasDiv.removeChild(canvasDiv.firstChild);
    //   }
    // }

    // Reset Three.js global refs
    window.scene = undefined;
    window.camera = undefined;
    window.renderer = undefined;
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHighlightedIndex(-1);
    highlightMatches(e.target.value);
  };

  const highlightMatches = (keyword: string) => {
    const spans = document.querySelectorAll(
      ".react-json-view span.string-value, .react-json-view span.object-key"
    );

    // Clean up all existing highlights
    spans.forEach((el) => {
      const element = el as HTMLElement;
      if (originalTextMap.has(element)) {
        element.innerHTML = originalTextMap.get(element)!; // Restore original HTML
        element.classList.remove("highlighted");
      }
    });

    // Clear old state
    setMatches([]);
    setHighlightedIndex(-1);
    setExpandedPaths([]);
    setOriginalTextMap(new Map());

    if (!keyword.trim() || keyword.length < 3) return;

    const regex = new RegExp(`(${keyword})`, "gi");
    const matchedElements: HTMLElement[] = [];
    const matchedPaths: Set<string> = new Set();
    const newOriginalMap = new Map<HTMLElement, string>();

    spans.forEach((el) => {
      const element = el as HTMLElement;
      const original = element.innerHTML;
      const text = element.textContent || "";

      if (text.toLowerCase().includes(keyword.toLowerCase())) {
        newOriginalMap.set(element, original); // Store original HTML
        const highlighted = text.replace(
          regex,
          `<mark class="highlighted" style="background-color: yellow; color: black;">$1</mark>`
        );
        element.innerHTML = highlighted;
        matchedElements.push(element);

        const parent = element.closest(".variable-row");
        const path = parent?.getAttribute("data-path");
        if (path) matchedPaths.add(path);
      }
    });

    // Update state
    setOriginalTextMap(newOriginalMap);
    setMatches(matchedElements);
    setExpandedPaths(Array.from(matchedPaths));
  };

  const findNext = () => {
    if (matches.length === 0) return;

    setHighlightedIndex((prevIndex) => {
      const nextIndex = (prevIndex + 1) % matches.length;

      matches.forEach((match) => {
        match
          .querySelector("mark")
          ?.setAttribute("style", "background: yellow; color: black;");
      });

      const current = matches[nextIndex];
      current.scrollIntoView({ behavior: "smooth", block: "center" });

      current
        .querySelector("mark")
        ?.setAttribute("style", "background: orange; color: black;");

      return nextIndex;
    });
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
  console.log("datasetDocument", datasetDocument);
  const onekey = datasetDocument
    ? datasetDocument.hasOwnProperty("README")
      ? "README"
      : datasetDocument.hasOwnProperty("dataset_description.json")
      ? "dataset_description.json"
      : "_id"
    : "_id";

  return (
    <>
      {/* 🔧 Inline CSS for string formatting */}
      <style>
        {`
		code.puretext {
		white-space: pre-wrap;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 4;
		overflow: hidden;
		text-overflow: ellipsis;
		font-family: monospace;
		color: #d14;
		font-size: 14px;
		background-color: transparent;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	code.puretext:hover, code.puretext:focus {
		-webkit-line-clamp: unset;
		overflow: visible;
		background-color: #f0f0f0;
	}`}
      </style>
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
          {/* ✅ Dataset Title (From dataset_description.json) */}
          <Typography
            variant="h4"
            color={Colors.darkPurple}
            sx={{ fontWeight: "bold", mb: 1 }}
          >
            {datasetDocument?.["dataset_description.json"]?.Name ??
              `Dataset: ${docId}`}
          </Typography>

          {/* ✅ Dataset Author (If Exists) */}
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

          {/* ✅ Breadcrumb Navigation (🏠 Home → Database → Dataset) */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              marginBottom: 2,
            }}
          >
            {/* 🏠 Home Icon Button */}
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
          {aiSummary && (
            <Typography
              sx={{
                color: Colors.darkPurple,
                fontWeight: "bold",
              }}
            >
              AI Summary
            </Typography>
          )}
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
              {/* Download Dataset (1 Mb) */}
              {/* Download Dataset ({(jsonSize / 1024).toFixed(0)} MB) */}
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
              {/* (links: {externalLinks.length}) */}
              {externalLinks.length > 0 &&
                ` (links: ${externalLinks.length}, total: ${formatSize(
                  totalFileSize
                )})`}
            </Button>

            <Box display="flex" alignItems="center" gap={1} sx={{ ml: "auto" }}>
              <TextField
                size="small"
                variant="outlined"
                placeholder="Find keyword in dataset"
                value={searchTerm}
                onChange={handleSearch}
                sx={{ width: { xs: "auto", sm: "250px" } }}
              />
              <Button
                variant="contained"
                onClick={findNext}
                disabled={matches.length === 0}
                sx={{
                  padding: "8px",
                }}
              >
                Find Next
              </Button>
            </Box>
          </Box>
        </Box>

        <div
          id="chartpanel"
          style={{
            display: "none",
            marginTop: "16px",
            background: "#555",
            color: "#f5f5f5",
            padding: "12px",
            borderRadius: "8px",
            position: "relative",
          }}
        ></div>
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
              md: "960px", // fixed height container
            },
          }}
        >
          {/* ✅ JSON Viewer (left panel) */}
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
            <ReactJson
              src={transformedDataset || datasetDocument}
              name={false}
              enableClipboard={true}
              displayDataTypes={false}
              displayObjectSize={true}
              collapsed={searchTerm.length >= 3 ? false : 1} // 🔍 Expand during search
              style={{ fontSize: "14px", fontFamily: "monospace" }}
            />
          </Box>

          {/* ✅ Data panels (right panel) */}
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
              gap: 2,
            }}
          >
            <Box
              sx={{
                backgroundColor: Colors.lightBlue,
                padding: 2,
                borderRadius: "8px",
                flex: 1,
                // overflowY: "auto",
              }}
            >
              {/* ✅ Collapsible header */}
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
                {/* ✅ Scrollable area */}
                <Box
                  sx={{
                    maxHeight: "400px",
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
                          {link.arraySize
                            ? `[${link.arraySize.join("x")}]`
                            : ""}
                        </Typography>
                        <Button
                          variant="contained"
                          size="small"
                          sx={{
                            backgroundColor: "#1976d2",
                            flexShrink: 0,
                            minWidth: "70px",
                            fontSize: "0.7rem",
                            padding: "2px 6px",
                            lineHeight: 1,
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
                backgroundColor: "#eaeaea",
                padding: 2,
                borderRadius: "8px",
                flex: 1,
                // overflowY: "auto",
              }}
            >
              {/* ✅ Header with toggle */}
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
                    maxHeight: "400px",
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
                        /\.(nii(\.gz)?|bnii|jdt|jdb|jmsh|bmsh)$/i.test(
                          fileName
                        );

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
                                backgroundColor: "#1976d2",
                                minWidth: "70px",
                                fontSize: "0.7rem",
                                padding: "2px 6px",
                                lineHeight: 1,
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
                                  minWidth: "65px",
                                  fontSize: "0.7rem",
                                  padding: "2px 6px",
                                  lineHeight: 1,
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
        </Box>
        {/* ✅ ADD FLASHCARDS COMPONENT HERE ✅ */}

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

export default DatasetDetailPage;
