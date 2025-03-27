import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import {
	Box,
	Typography,
	CircularProgress,
	Alert,
	Button,
	Card,
	CardContent,
	Collapse,
} from "@mui/material";
import theme, { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useState } from "react";
import ReactJson from "react-json-view";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDocumentDetails } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";
import PreviewModal from "../components/PreviewModal";
import DatasetFlashcards from "../components/DatasetFlashcards";
import { TextField } from "@mui/material";
import CloudDownloadIcon from "@mui/icons-material/CloudDownload";
import DescriptionIcon from "@mui/icons-material/Description";


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
	const [previewIsInternal, setPreviewIsInternal] = useState(false);
	const [isExternalExpanded, setIsExternalExpanded] = useState(true);
	const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
	const [originalTextMap, setOriginalTextMap] = useState<Map<HTMLElement, string>>(new Map());
	const [jsonViewerKey, setJsonViewerKey] = useState(0);



	// Recursive function to find `_DataLink_`
	const extractDataLinks = (obj: any, path: string): ExternalDataLink[] => {
		const links: ExternalDataLink[] = [];

		if (typeof obj === "object" && obj !== null) {
			for (const key in obj) {
				if (obj.hasOwnProperty(key)) {
					if (key === "_DataLink_" && typeof obj[key] === "string") {
						let correctedUrl = obj[key].replace(/:\$.*$/, "");

						const sizeMatch = obj[key].match(/size=(\d+)/);
						const size = sizeMatch
							? `${(parseInt(sizeMatch[1], 10) / 1024 / 1024).toFixed(2)} MB`
							: "Unknown Size";

						const subMatch = path.match(/sub-\d+/);
						const subPath = subMatch ? subMatch[0] : "Unknown Sub";

						links.push({
							name: `NIFTIData (${size}) [/${subPath}]`,
							size,
							path: subPath,
							url: correctedUrl,
							index: links.length,
						});
					} else if (typeof obj[key] === "object") {
						links.push(...extractDataLinks(obj[key], `${path}/${key}`));
					}
				}
			}
		}

		return links;
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
						index: internalLinks.length,
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
						index: internalLinks.length,
						arraySize: obj.NIFTIData._ArraySize_,
					});
				}
			} else if (obj.hasOwnProperty("_ArraySize_") && !path.match("_EnumValue_$")) {
				if (
					obj.hasOwnProperty("_ArrayZipData_") &&
					typeof obj["_ArrayZipData_"] === "string"
				) {
					internalLinks.push({
						name: `JData`,
						data: obj,
						index: internalLinks.length,
						arraySize: obj._ArraySize_,
					});
				}
			} else {
				Object.keys(obj).forEach((key) => {
					if (typeof obj[key] === "object") {
						internalLinks.push(...extractInternalData(obj[key], `${path}.${key.replace(/\./g, "\\.")}`));
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
			}
		};

		fetchData();
	}, [dbName, docId, dispatch]);

	useEffect(() => {
		if (datasetDocument) {
			// ✅ Extract External Data & Assign `index`
			const links = extractDataLinks(datasetDocument, "").map((link, index) => ({
				...link,
				index, // ✅ Assign index correctly
			}));
	
			// ✅ Extract Internal Data & Assign `index`
			const internalData = extractInternalData(datasetDocument).map((data, index) => ({
				...data,
				index, // ✅ Assign index correctly
			}));
	
			console.log("🟢 Extracted external links:", links);
			console.log("🟢 Extracted internal data:", internalData);
	
			setExternalLinks(links);
			setInternalLinks(internalData);

			// ✅ Construct download script dynamically
			const script = `curl -L --create-dirs "https://neurojson.io:7777/${dbName}/${docId}" -o "${docId}.json"`;
			setDownloadScript(script);
		}
	}, [datasetDocument]);	

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
	
	const handleDownloadDataset = () => {
		if (!datasetDocument) return;
		const jsonData = JSON.stringify(datasetDocument, null, 2);
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

	const handlePreview = (dataOrUrl: string | any, idx: number, isInternal: boolean = false) => {
		console.log("🟢 Preview button clicked for:", dataOrUrl, "Index:", idx, "Is Internal:", isInternal);
		console.log("🟢 Preview button clicked:", {
			dataOrUrl,
			idx,
			isInternal,
			urlMatch: /\.(nii\.gz|jdt|jdb|bmsh|jmsh|bnii)$/i.test(dataOrUrl),
		  });
		  
	
		// if (isInternal) {
		// 	try {
		// 		// ✅ Create a writable deep copy to avoid modifying read-only properties
		// 		const writableData = JSON.parse(JSON.stringify(dataOrUrl));
	
		// 		if (typeof (window as any).previewdata === "function") {
		// 			console.log("✅ Calling previewdata() for internal data:", writableData);
		// 			(window as any).previewdata(writableData, idx, false);  // ✅ Pass writable copy
		// 		} else {
		// 			console.error("❌ previewdata() is not defined!");
		// 		}
		// 	} catch (error) {
		// 		console.error("❌ Error processing internal data:", error);
		// 	}
		// }
		if (isInternal) {
			try {
			  // 🔐 Step 1: Ensure global intdata exists
			  if (!(window as any).intdata) {
				(window as any).intdata = [];
			  }
		  
			  // 🔐 Step 2: Ensure intdata[idx] is at least a 4-element array
			  if (!(window as any).intdata[idx]) {
				(window as any).intdata[idx] = ["", "", null, `Internal ${idx}`];
			  }
		  
			  // 🔐 Step 3: Replace the [2] slot with your actual data
			  (window as any).intdata[idx][2] = JSON.parse(JSON.stringify(dataOrUrl));
		  
			  // ✅ Call previewdata
			  console.log("🧪 Calling previewdata with intdata[idx]:", (window as any).intdata[idx]);
			  (window as any).previewdata((window as any).intdata[idx][2], idx, true, []);
			} catch (err) {
			  console.error("❌ Error in internal preview:", err);
			}
		} else {
			// ✅ External Data Preview
			if (/\.(nii\.gz|jdt|jdb|bmsh|jmsh|bnii)$/i.test(dataOrUrl)) {
				if (typeof (window as any).previewdataurl === "function") {
					console.log("✅ Calling previewdataurl() for:", dataOrUrl);
					(window as any).previewdataurl(dataOrUrl, idx);
				} else {
					console.error("❌ previewdataurl() is not defined!");
				}
			} else {
				console.warn("⚠️ Unsupported file format for preview:", dataOrUrl);
			}
		}
	
		setPreviewDataKey(dataOrUrl); // ✅ Store the preview key
		setPreviewOpen(true);   // ✅ Open the preview modal
		setPreviewIsInternal(isInternal); // ✅ Save it
	};

	const handleClosePreview = () => {
		console.log("🛑 Closing preview modal.");
		setPreviewOpen(false);
		setPreviewDataKey(null);
	
		// Stop any Three.js rendering when modal closes
		if (typeof (window as any).update === "function") {
			cancelAnimationFrame((window as any).reqid);
		}
	};

	const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
		setHighlightedIndex(-1);
		highlightMatches(e.target.value);
	};	
	
	const highlightMatches = (keyword: string) => {
		// ✅ Step 1: Clean up all existing highlights
		document.querySelectorAll(".highlighted").forEach((el) => {
		  const element = el as HTMLElement;
		  const text = element.textContent || "";
		  element.innerHTML = text; // ❗ This clears out <mark> completely
		  element.classList.remove("highlighted");
		});
	  
		setOriginalTextMap(new Map()); // ✅ Also clear stored originals
	  
		// ✅ Step 2: Early exit if search is too short
		if (!keyword.trim() || keyword.length < 3) {
		  setMatches([]);
		  setHighlightedIndex(-1);
		  setExpandedPaths([]);
		  return;
		}
	  
		// ✅ Step 3: Highlight matching keys/values
		const matchedElements: HTMLElement[] = [];
		const matchedPaths: Set<string> = new Set();
		const newOriginalMap = new Map<HTMLElement, string>();
	  
		const spans = document.querySelectorAll(
		  ".react-json-view span.string-value, .react-json-view span.object-key"
		);
	  
		const regex = new RegExp(`(${keyword})`, "gi");
	  
		spans.forEach((el) => {
		  const element = el as HTMLElement;
		  const text = element.textContent || "";
	  
		  if (text.toLowerCase().includes(keyword.toLowerCase())) {
			newOriginalMap.set(element, text);
	  
			// Highlight match
			const highlighted = text.replace(
			  regex,
			  `<mark class="highlighted" style="background-color: yellow; color: black;">$1</mark>`
			);
			element.innerHTML = highlighted;
			matchedElements.push(element);
	  
			// ✅ Collect path for expansion
			const parent = element.closest(".variable-row");
			const path = parent?.getAttribute("data-path");
			if (path) matchedPaths.add(path);
		  }
		});
	  
		// ✅ Step 4: Update React state
		setOriginalTextMap(newOriginalMap);
		setMatches(matchedElements);
		setHighlightedIndex(-1);
		setExpandedPaths(Array.from(matchedPaths));
	  };		

	  const findNext = () => {
		if (matches.length === 0) return;
	  
		setHighlightedIndex((prevIndex) => {
		  const nextIndex = (prevIndex + 1) % matches.length;
	  
		  matches.forEach((match) => {
			match.querySelector("mark")?.setAttribute("style", "background: yellow; color: black;");
		  });
	  
		  const current = matches[nextIndex];
		  current.scrollIntoView({ behavior: "smooth", block: "center" });
	  
		  current.querySelector("mark")?.setAttribute("style", "background: orange; color: black;");
	  
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

	return (
		<Box sx={{ padding: 4 }}>
			<Button
				variant="contained"
				onClick={() => navigate(-1)}
				sx={{ marginBottom: 2, backgroundColor: Colors.primary.main }}
			>
				Back
			</Button>

			<Box 
				sx={{ 
					position: "sticky", // ✅ Keeps title & search bar fixed
					top: 0, // ✅ Sticks to the top
					backgroundColor: "white", // ✅ Ensures smooth UI
					zIndex: 10, // ✅ Keeps it above scrollable content
					paddingBottom: 2, // ✅ Adds space for clarity
					borderBottom: `1px solid ${Colors.lightGray}`, // ✅ Adds subtle separator
				}}>

				{/* ✅ Dataset Title (From dataset_description.json) */}
				<Typography
					variant="h4"
					color={Colors.primary.main}
					sx={{ fontWeight: "bold", mb: 1 }}
				>
					{datasetDocument?.["dataset_description.json"]?.Name ?? `Dataset: ${docId}`}
				</Typography>

				{/* ✅ Dataset Author (If Exists) */}
				{datasetDocument?.["dataset_description.json"]?.Authors && (
				<Typography variant="h6" sx={{ fontStyle: "italic", color: Colors.textSecondary }}>
					{Array.isArray(datasetDocument["dataset_description.json"].Authors)
						? datasetDocument["dataset_description.json"].Authors.join(", ")
						: datasetDocument["dataset_description.json"].Authors}
				</Typography>
    )}

				{/* ✅ Breadcrumb Navigation (🏠 Home → Database → Dataset) */}
				<Box sx={{ display: "flex", alignItems: "center", marginBottom: 2 }}>
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
						<Typography variant="h5" color={Colors.primary.main} sx={{ fontWeight: "bold" }}>
							🏠
						</Typography>
					</Button>

					<Typography variant="h5" sx={{ marginX: 1, fontWeight: "bold" }}>
						»
					</Typography>

					{/* Database Name (Clickable) */}
					<Button
						onClick={() => navigate(`/RoutesEnum.DATABASES/${dbName}`)}
						sx={{
							textTransform: "none",
							fontSize: "1.2rem",
							fontWeight: "bold",
							color: Colors.primary.dark,
						}}
					>
						{dbName?.toLowerCase()}
					</Button>

					<Typography variant="h5" sx={{ marginX: 1, fontWeight: "bold" }}>
						»
					</Typography>

					{/* Dataset Name (_id field) */}
					<Typography variant="h5" sx={{ fontWeight: "bold", color: Colors.textPrimary }}>
						{docId}
					</Typography>
				</Box>

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
							backgroundColor: "#ffb300",
							color: "black",
							"&:hover": { backgroundColor: "#ff9100" },
						}}
					>
						Download Dataset (1 Mb)
						</Button>

						<Button
							variant="contained"
							startIcon={<DescriptionIcon />}
							onClick={handleDownloadScript}
							sx={{
								backgroundColor: "#ffb300",
								color: "black",
								"&:hover": { backgroundColor: "#ff9100" },
							}}
						>
							Script to Download All Files (138 Bytes) (links: 0)
						</Button>

						<Box display="flex" alignItems="center" gap={1} sx={{ ml: "auto" }}>
							<TextField
								size="small"
								variant="outlined"
								placeholder="Find keyword in dataset"
								value={searchTerm}
								onChange={handleSearch}
								sx={{ width: "250px" }}
							/>
							<Button variant="contained" onClick={findNext}
  								disabled={matches.length === 0}>
								Find Next
							</Button>
						</Box>
				</Box>
			</Box>

			<Box sx={{ display: "flex", gap: 2, alignItems: "flex-start", marginTop: 2 }}>
  {/* ✅ JSON Viewer (left panel) */}
  <Box sx={{ flex: 3, backgroundColor: "#f5f5f5", padding: 2, borderRadius: "8px", overflowX: "auto" }}>
    <ReactJson
      src={datasetDocument}
      name={false}
      enableClipboard={true}
      displayDataTypes={false}
      displayObjectSize={true}
	  collapsed={searchTerm.length >= 3 ? false : 1} // 🔍 Expand during search    
	  style={{ fontSize: "14px", fontFamily: "monospace" }}
    />
  </Box>

  {/* ✅ Data panels (right panel) */}
  <Box sx={{ flex: 2, display: "flex", flexDirection: "column", gap: 2 }}>
<Box sx={{ backgroundColor: "#cdddf6", padding: 2, borderRadius: "8px", marginTop: 4 }}>
  {/* ✅ Collapsible header */}
  <Box
    sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
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
        marginTop: 2,
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
              mt: 1,
              p: 1.5,
              bgcolor: "white",
              borderRadius: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              border: "1px solid #bbb",
            }}
          >
            <Typography sx={{ flexGrow: 1 }}>
              {link.name} {link.arraySize ? `[${link.arraySize.join("x")}]` : ""}
            </Typography>
            <Button
              variant="contained"
              size="small"
              sx={{ backgroundColor: "#1976d2" }}
              onClick={() => handlePreview(link.data, link.index, true)}
            >
              Preview
            </Button>
          </Box>
        ))
      ) : (
        <Typography sx={{ fontStyle: "italic", mt: 1 }}>No internal data found.</Typography>
      )}
    </Box>
  </Collapse>
</Box>
	<Box sx={{ backgroundColor: "#eaeaea", padding: 2, borderRadius: "8px", marginTop: 4 }}>
  {/* ✅ Header with toggle */}
  <Box
    sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}
    onClick={() => setIsExternalExpanded(!isExternalExpanded)}
  >
    <Typography variant="h6" sx={{ fontWeight: "bold" }}>
      External Data ({externalLinks.length} links)
    </Typography>
    {isExternalExpanded ? <ExpandLess /> : <ExpandMore />}
  </Box>

  <Collapse in={isExternalExpanded}>
    {/* ✅ Scrollable card container */}
    <Box
      sx={{
        maxHeight: "400px",
        overflowY: "auto",
        marginTop: 2,
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
        externalLinks.map((link, index) => (
          <Box
            key={index}
            sx={{
              mt: 1,
              p: 1.5,
              bgcolor: "white",
              borderRadius: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 2,
              border: "1px solid #ddd",
            }}
          >
            <Typography sx={{ flexGrow: 1 }}>{link.name}</Typography>
            <Box sx={{ display: "flex", gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                sx={{ backgroundColor: "#1976d2" }}
                onClick={() => window.open(link.url, "_blank")}
              >
                Download
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => handlePreview(link.url, link.index, false)}
              >
                Preview
              </Button>
            </Box>
          </Box>
        ))
      ) : (
        <Typography sx={{ fontStyle: "italic", mt: 1 }}>No external links found.</Typography>
      )}
    </Box>
  </Collapse>
</Box>
  </Box>
</Box>
			{/* ✅ ADD FLASHCARDS COMPONENT HERE ✅ */}

			<div id="chartpanel"></div>

			<DatasetFlashcards
				pagename={docId ?? ""}
				docname={datasetDocument?.Name || ""}
				dbname={dbName || ""}
				serverUrl={"https://neurojson.io:7777/"}
				datasetDocument={datasetDocument} 
				onekey={"dataset_description.json"} 
			/>
			{/* Preview Modal Component - Add Here */}
			<PreviewModal
      			isOpen={previewOpen}
				dataKey={previewDataKey}
				isInternal={previewIsInternal}
				onClose={handleClosePreview}
    		/>
			{/* <div id="chartpanel" style={{ display: "none" }}></div> */}
		</Box>
	);
};

export default DatasetDetailPage;
