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
	const {
		selectedDocument: document,
		loading,
		error,
	} = useAppSelector(NeurojsonSelector);
	const [externalLinks, setExternalLinks] = useState<ExternalDataLink[]>([]);
	const [isExpanded, setIsExpanded] = useState(false);

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
		if (document) {
			// Extract external links
			const links = extractDataLinks(document, "");
			setExternalLinks(links);
		}
	}, [document]);

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

			<Typography variant="h4" gutterBottom color={Colors.primary.main}>
				Dataset: {docId}
			</Typography>

			<Box
				sx={{
					backgroundColor: "#f5f5f5",
					padding: 2,
					borderRadius: "8px",
					overflowX: "auto",
					boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)",
				}}
			>
				{document ? (
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
													onClick={() => console.log("preview")}
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
		</Box>
	);
};

export default DatasetDetailPage;
