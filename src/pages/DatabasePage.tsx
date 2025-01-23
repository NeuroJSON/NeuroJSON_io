import { fetchDatabases } from "../services/couchDb.service";
import {
	Box,
	Typography,
	Button,
	CircularProgress,
	Alert,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DatabasePage: React.FC = () => {
	const [databases, setDatabases] = useState<string[] | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		const loadDatabases = async () => {
			try {
				setError(null);
				setLoading(true);
				const data = await fetchDatabases();
				setDatabases(data);
			} catch (err) {
				console.error("Error loading databases:", err);
				setError("Failed to load databases. Please try again.");
			} finally {
				setLoading(false);
			}
		};

		loadDatabases();
	}, []);

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
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Box sx={{ textAlign: "center", padding: 4 }}>
				<Alert severity="error">{error}</Alert>
			</Box>
		);
	}

	if (!databases || databases.length === 0) {
		return (
			<Box sx={{ textAlign: "center", padding: 4 }}>
				<Typography variant="h5" color="textSecondary">
					No Databases Found
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ padding: 4 }}>
			<Typography variant="h4" gutterBottom>
				Databases
			</Typography>
			<Box
				sx={{
					display: "grid",
					gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
					gap: 2,
				}}
			>
				{databases.map((dbName) => (
					<Button
						key={dbName}
						variant="contained"
						sx={{
							padding: 2,
							textTransform: "none",
							fontWeight: "bold",
							backgroundColor: "#7b81a5",
							color: "#fff",
							"&:hover": { backgroundColor: "#5c6386" },
						}}
						onClick={() => navigate(`/databases/${dbName}`)} // Navigate to DatasetPage with dbName
					>
						{dbName}
					</Button>
				))}
			</Box>
		</Box>
	);
};

export default DatabasePage;
