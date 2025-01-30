import { fetchDbInfo, fetchBidsDocs } from "../services/couchDb.service";
import {
	Box,
	Typography,
	Button,
	CircularProgress,
	Card,
	CardContent,
	CardActionArea,
	Alert,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

// Helper function to recursively extract modalities
const extractModalities = (obj: any, modalitiesSet: Set<string>) => {
	if (typeof obj === "object" && obj !== null) {
		for (const key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (/^[a-zA-Z]+$/.test(key)) {
					// Add strictly alphabetic keys as modalities
					modalitiesSet.add(key);
				} else if (typeof obj[key] === "object") {
					// Recursively traverse nested objects
					extractModalities(obj[key], modalitiesSet);
				}
			}
		}
	}
};

// Process datasets to add Subjects, Modalities, and JSON Size
const processDatasets = (datasets: any[]) => {
	return datasets.map((dataset: any) => {
		// Count Subjects
		const subjects = Object.keys(dataset).filter((key) =>
			key.startsWith("sub-")
		).length;

		// Extract Modalities
		const modalitiesSet = new Set<string>();
		Object.keys(dataset)
			.filter((key) => key.startsWith("sub-")) // Only process `sub-` fields
			.forEach((subKey) => {
				extractModalities(dataset[subKey], modalitiesSet); // Recursively extract modalities
			});

		const modalities = Array.from(modalitiesSet).join(", ");

		// Calculate JSON Size
		const sizeInKB = JSON.stringify(dataset).length / 1024;

		return {
			...dataset,
			subjects,
			modalities,
			sizeInKB: sizeInKB.toFixed(2),
		};
	});
};

const DatasetPage: React.FC = () => {
	const { dbName } = useParams<{ dbName: string }>();
	const navigate = useNavigate();
	const [dbInfo, setDbInfo] = useState<any>(null); // Database metadata
	const [datasets, setDatasets] = useState<any[]>([]); // Dataset list
	const [loading, setLoading] = useState(false); // Loading state
	const [error, setError] = useState<string | null>(null); // Error message
	const [page, setPage] = useState(0); // Current page
	const limit = 25; // Datasets per page

	// Fetch database metadata
	useEffect(() => {
		const loadDbInfo = async () => {
			try {
				setLoading(true);
				setError(null);
				if (dbName) {
					const info = await fetchDbInfo(dbName);
					setDbInfo(info);
				}
			} catch (err) {
				console.error(`[ERROR] Failed to fetch database info:`, err);
				setError("Failed to fetch database information.");
			} finally {
				setLoading(false);
			}
		};

		loadDbInfo();
	}, [dbName]);

	// Fetch datasets for the current page
	useEffect(() => {
		const loadDatasets = async () => {
			try {
				setLoading(true);
				setError(null);
				if (dbName) {
					const docs = await fetchBidsDocs(dbName, page * limit, limit);
					const processedDatasets = processDatasets(docs); // Process datasets
					setDatasets(processedDatasets);
				}
			} catch (err) {
				console.error(`[ERROR] Failed to fetch datasets:`, err);
				setError("Failed to fetch datasets.");
			} finally {
				setLoading(false);
			}
		};

		loadDatasets();
	}, [dbName, page]);

	const handlePageChange = (newPage: number) => {
		setPage(newPage);
	};

	return (
		<Box sx={{ padding: 4 }}>
			<Typography variant="h4" gutterBottom>
				Database: {dbName || "N/A"}
			</Typography>

			{/* Database Metadata */}
			<Typography>Total Datasets: {dbInfo?.doc_count || 0}</Typography>

			{/* Error Message */}
			{error && (
				<Alert severity="error" sx={{ marginBottom: 2 }}>
					{error}
				</Alert>
			)}

			{/* Loading Indicator */}
			{loading && (
				<CircularProgress sx={{ display: "block", margin: "16px auto" }} />
			)}

			{/* Dataset Cards */}
			{!loading && datasets.length > 0 && (
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 2, marginTop: 2 }}>
					{datasets.map((dataset) => (
						<Card
							key={dataset._id}
							sx={{
								width: "300px",
								backgroundColor: "#f9f9f9",
								border: "1px solid #ccc",
								borderRadius: "8px",
							}}
						>
							<CardActionArea
								onClick={() => navigate(`/databases/${dbName}/${dataset._id}`)}
							>
								<CardContent>
									<Typography variant="h6">
										{dataset["dataset_description.json"]?.Name ||
											"Untitled Dataset"}
									</Typography>
									<Typography>Subjects: {dataset.subjects || "N/A"}</Typography>
									<Typography>
										Modalities: {dataset.modalities || "N/A"}
									</Typography>
									<Typography>
										Summary:{" "}
										{dataset["dataset_description.json"]?.Summary ||
											"No summary available"}
									</Typography>
									<Typography>JSON Size: {dataset.sizeInKB} KB</Typography>
								</CardContent>
							</CardActionArea>
						</Card>
					))}
				</Box>
			)}

			{/* No Data Message */}
			{!loading && datasets.length === 0 && !error && (
				<Typography variant="body1" color="textSecondary" align="center">
					No datasets available in this database.
				</Typography>
			)}

			{/* Pagination */}
			{!loading && datasets.length > 0 && (
				<Box sx={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
					{[...Array(Math.ceil((dbInfo?.doc_count || 0) / limit)).keys()].map(
						(index) => (
							<Button
								key={index}
								variant={index === page ? "contained" : "outlined"}
								onClick={() => handlePageChange(index)}
								sx={{ margin: "0 4px" }}
							>
								{index + 1}
							</Button>
						)
					)}
				</Box>
			)}
		</Box>
	);
};

export default DatasetPage;
