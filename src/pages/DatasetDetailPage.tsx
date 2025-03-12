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


interface ExternalDataLink {
	name: string;
	size: string;
	path: string;
	url: string;
}

const DatasetDetailPage: React.FC = () => {
	const { dbName, docId } = useParams<{ dbName: string; docId: string }>();
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	// const {
	// 	selectedDocument: document,
	// 	loading,
	// 	error,
	// } = useAppSelector(NeurojsonSelector);
	const {
		selectedDocument: datasetDocument,
		loading,
		error,
	} = useAppSelector(NeurojsonSelector);

	const [externalLinks, setExternalLinks] = useState<ExternalDataLink[]>([]);
	const [isExpanded, setIsExpanded] = useState(false);
	const [searchTerm, setSearchTerm] = useState("");
	const [matches, setMatches] = useState<HTMLElement[]>([]);
	const [highlightedIndex, setHighlightedIndex] = useState(-1);

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
						});
					} else if (typeof obj[key] === "object") {
						links.push(...extractDataLinks(obj[key], `${path}/${key}`));
					}
				}
			}
		}

		return links;
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
			// Extract external links
			const links = extractDataLinks(datasetDocument, "");
			setExternalLinks(links);
		}
	}, [datasetDocument]);
	

	// Function to handle the "Preview" functionality
	// const handlePreview = (url: string) => {
	// 	// Open the preview window or render the preview modal
	// 	window.alert(`Preview functionality triggered for URL: ${url}`);
	// };

	const [previewOpen, setPreviewOpen] = useState(false);
	const [previewDataKey, setPreviewDataKey] = useState<any>(null);
	

	useEffect(() => {
		if (searchTerm) {
			highlightMatches(searchTerm);
		}
	}, [searchTerm, datasetDocument]); // ✅ Run search when dataset loads	
	


	// const handlePreview = (key: any) => {
	// 	setPreviewDataKey(key);
	// 	setPreviewOpen(true);
	// };

	const handlePreview = (url: string) => {
	
		// Check if the file is NIfTI (.nii, .nii.gz), JData (.jdt, .jdb), or Mesh (.bmsh, .jmsh)
		if (/\.(nii|nii\.gz|jdt|jdb|bmsh|jmsh|bnii)$/i.test(url)) {
			if (typeof (window as any).previewdataurl === "function") {
				(window as any).previewdataurl(url, 0); // Calls preview immediately
			} else {
				console.error("❌ previewdataurl() is not defined!");
			}
		} else {
			console.warn("⚠️ Unsupported file format for preview:", url);
		}
	
		setPreviewDataKey(url); // Store the preview key
		setPreviewOpen(true); // Open the preview modal
	};
	  
	// const handleClosePreview = () => {
	// 	setPreviewOpen(false);
	// 	setPreviewDataKey(null);
	// };

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
		if (!keyword.trim()) {
			// ✅ Clear highlights when search is empty
			document.querySelectorAll(".highlighted").forEach((el) => {
				const element = el as HTMLElement;
				if (element.dataset.originalText) {
					element.innerText = element.dataset.originalText;
				}
				element.classList.remove("highlighted");
			});
			setMatches([]);
			setHighlightedIndex(-1);
			return;
		}

		const nodes: HTMLElement[] = [];
		const elements = document.querySelectorAll(".react-json-view span"); // ✅ Select JSON values only

		elements.forEach((el) => {
			const element = el as HTMLElement;
			if (!element.textContent) return; // Skip empty elements

			const regex = new RegExp(`(${keyword})`, "gi");
			const originalText = element.dataset.originalText || element.textContent;

			if (originalText.toLowerCase().includes(keyword.toLowerCase())) {
				if (!element.dataset.originalText) {
					element.dataset.originalText = originalText;
				}

				// ✅ Safe highlight without breaking structure
				element.innerHTML = originalText.replace(
					regex,
					`<mark class="highlighted" style="background-color: lightyellow; color: black;">$1</mark>`
				);

				nodes.push(element);
			}
		});

		setMatches(nodes); // ✅ Store matches for "Find Next"
		setHighlightedIndex(-1);
	};


	const findNext = () => {
		if (matches.length === 0) return;

		setHighlightedIndex((prevIndex) => {
			const nextIndex = (prevIndex + 1) % matches.length;

			matches.forEach((match) => {
				match.style.backgroundColor = "lightyellow"; // Reset all highlights
			});

			matches[nextIndex].scrollIntoView({ behavior: "smooth", block: "center" });
			matches[nextIndex].style.backgroundColor = "orange"; // Highlight current match

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

			{/* <Typography variant="h4" gutterBottom color={Colors.primary.main}>
				Dataset: {docId}
			</Typography> */}

			{/* <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
				<Typography variant="h4" color={Colors.primary.main}>
					Dataset: {docId}
				</Typography> */}

				{/* 🔍 Search Box & Find Next Button
				<Box display="flex" alignItems="center" gap={1}>
					<TextField
						size="small"
						variant="outlined"
						placeholder="Find keyword in dataset"
						value={searchTerm}
						onChange={handleSearch}
						sx={{ width: "250px" }}
					/>
					<Button variant="contained" onClick={findNext} disabled={matches.length === 0}>
						Find Next
					</Button>
				</Box>
			</Box> */}

			<Box 
				sx={{ 
					position: "sticky", // ✅ Keeps title & search bar fixed
					top: 0, // ✅ Sticks to the top
					backgroundColor: "white", // ✅ Ensures smooth UI
					zIndex: 10, // ✅ Keeps it above scrollable content
					paddingBottom: 2, // ✅ Adds space for clarity
					borderBottom: `1px solid ${Colors.lightGray}`, // ✅ Adds subtle separator
				}}>

				<Box display="flex" alignItems="center" justifyContent="space-between">
					<Typography variant="h4" color={Colors.primary.main}>
						Dataset: {docId}
					</Typography>

					{/* 🔍 Search Box & Find Next Button */}
					<Box display="flex" alignItems="center" gap={1}>
						<TextField
							size="small"
							variant="outlined"
							placeholder="Find keyword in dataset"
							value={searchTerm}
							onChange={handleSearch}
							sx={{ width: "250px" }}
						/>
						<Button variant="contained" onClick={findNext} disabled={matches.length === 0}>
							Find Next
						</Button>
					</Box>
				</Box>
			</Box>



			<Box
				sx={{
					backgroundColor: "#f5f5f5",
					padding: 2,
					borderRadius: "8px",
					overflowX: "auto",
					maxHeight: "calc(100vh - 150px)", // ✅ Adjusts height dynamically
					boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
				}}
			>
				{/* {document ? (
					<ReactJson
						src={document}
						name={false}
						enableClipboard={true}
						displayDataTypes={false}
						displayObjectSize={true}
						collapsed={2}
						style={{ fontSize: "14px", fontFamily: "monospace" }}
					/>
				) : (
					<Typography sx={{ textAlign: "center", marginTop: 4 }}>
						No data available for this dataset.
					</Typography>
				)} */}
				{datasetDocument ? (
					<ReactJson
						src={datasetDocument}
						name={false}
						enableClipboard={true}
						displayDataTypes={false}
						displayObjectSize={true}
						collapsed={2}
						style={{ fontSize: "14px", fontFamily: "monospace" }}
					/>
				) : (
					<Typography sx={{ textAlign: "center", marginTop: 4 }}>
						No data available for this dataset.
					</Typography>
				)}
			</Box>
			
			{externalLinks.length > 0 && (
				<Box sx={{ marginTop: 4 }}>
					<Box
						onClick={() => setIsExpanded(!isExpanded)}
						sx={{
							display: "flex",
							alignItems: "center",
							cursor: "pointer",
							marginBottom: 2,
						}}
					>
						<Typography
							variant="h5"
							color={Colors.primary.dark}
							sx={{ marginRight: 1 }}
						>
							External Data ({externalLinks.length} links)
						</Typography>
						{isExpanded ? <ExpandLess /> : <ExpandMore />}
					</Box>

					<Collapse in={isExpanded}>
						<Box
							sx={{
								backgroundColor: Colors.white,
								border: `1px solid ${Colors.lightGray}`,
								borderRadius: "8px",
								padding: 2,
								boxShadow: "0px 2px 4px rgba(0,0,0,0.05)",
							}}
						>
							<Box
								sx={{
									display: "flex",
									justifyContent: "space-between",
									alignItems: "center",
									marginBottom: 2,
									padding: "0 1rem",
								}}
							>
								<Button
									variant="contained"
									sx={{
										backgroundColor: Colors.primary.main,
										"&:hover": {
											backgroundColor: Colors.primary.dark,
										},
									}}
									onClick={() =>
										externalLinks.forEach((link) =>
											window.open(link.url, "_blank")
										)
									}
								>
									Download All Files
								</Button>
								<Typography variant="body2" color={Colors.textSecondary}>
									Total Size:{" "}
									{externalLinks
										.reduce((acc, link) => {
											const sizeMatch = link.size.match(/(\d+(\.\d+)?)/);
											const sizeInMB = sizeMatch ? parseFloat(sizeMatch[1]) : 0;
											return acc + sizeInMB;
										}, 0)
										.toFixed(2)}{" "}
									MB
								</Typography>
							</Box>

							<Box
								sx={{
									maxHeight: "400px",
									overflowY: "auto",
									"&::-webkit-scrollbar": {
										width: "8px",
									},
									"&::-webkit-scrollbar-track": {
										background: Colors.lightGray,
										borderRadius: "4px",
									},
									"&::-webkit-scrollbar-thumb": {
										background: Colors.primary.light,
										borderRadius: "4px",
									},
								}}
							>
								<Box
									sx={{
										display: "grid",
										gridTemplateColumns: "repeat(3, 1fr)",
										gap: 2,
										padding: 1,
									}}
								>
									{externalLinks.map((link, index) => (
										<Box
											key={index}
											sx={{
												padding: 2,
												border: `1px solid ${Colors.lightGray}`,
												borderRadius: "8px",
												display: "flex",
												flexDirection: "column",
												justifyContent: "space-between",
												backgroundColor: Colors.white,
												"&:hover": {
													backgroundColor: Colors.lightGray,
												},
											}}
										>
											<Box>
												<Typography
													color={Colors.textPrimary}
													sx={{
														fontWeight: 500,
														fontFamily: theme.typography.fontFamily,
													}}
												>
													{link.name}
												</Typography>
												<Typography
													variant="body2"
													color={Colors.textSecondary}
													sx={{ fontFamily: theme.typography.fontFamily }}
												>
													Size: {link.size}
												</Typography>
											</Box>
											<Box sx={{ display: "flex", gap: 1, marginTop: 2 }}>
												<Button
													variant="contained"
													size="small"
													sx={{
														backgroundColor: Colors.primary.main,
														"&:hover": {
															backgroundColor: Colors.primary.dark,
														},
													}}
													onClick={() => window.open(link.url, "_blank")}
												>
													Download
												</Button>
												<Button
													variant="outlined"
													size="small"
													sx={{
														color: Colors.secondary.main,
														borderColor: Colors.secondary.main,
														"&:hover": {
															borderColor: Colors.secondary.dark,
															color: Colors.secondary.dark,
														},
													}}
													// onClick={() => console.log("preview")}
													onClick={() => window.open(link.url)}
												>
											
													View
												</Button>
												<Button
													variant="outlined"
													size="small"
													sx={{
														color: Colors.primary.main,
														borderColor: Colors.primary.main,
														"&:hover": {
															borderColor: Colors.primary.dark,
															color: Colors.primary.dark,
														},
													}}
													onClick={() => handlePreview(link.url)}
												>
													Preview
												</Button>
											</Box>
										</Box>
									))}
								</Box>
							</Box>
						</Box>
					</Collapse>
				</Box>
			)}
			{/* ✅ ADD FLASHCARDS COMPONENT HERE ✅ */}

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
				onClose={handleClosePreview}
    		/>
		</Box>
	);
};

export default DatasetDetailPage;
