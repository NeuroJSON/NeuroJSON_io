import {
	fetchDbInfo,
	loadPaginatedData,
} from "../redux/neurojson/neurojson.action";
import {
	Box,
	Typography,
	CircularProgress,
	Alert,
	Card,
	CardContent,
	Grid,
	Link,
	Chip,
	Stack,
	Button,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect } from "react";
import { useParams } from "react-router-dom";

const DatasetPage: React.FC = () => {
	const { dbName } = useParams<{ dbName: string }>();
	const dispatch = useAppDispatch();
	const { loading, error, data, offset, limit, hasMore } = useAppSelector(
		(state: { neurojson: any }) => state.neurojson
	);

	useEffect(() => {
		if (dbName) {
			dispatch(fetchDbInfo(dbName.toLowerCase()));
			dispatch(
				loadPaginatedData({
					dbName: dbName.toLowerCase(),
					offset: 0,
					limit: 5,
				})
			);
		}
	}, [dbName, dispatch]);

	const loadMoreData = () => {
		if (dbName && hasMore && !loading) {
			dispatch(
				loadPaginatedData({ dbName: dbName.toLowerCase(), offset, limit })
			);
		}
	};

	return (
		<Box sx={{ padding: { xs: 2, md: 4 } }}>
			<Typography variant="h1" gutterBottom>
				Database: {dbName || "N/A"}
			</Typography>

			{error && (
				<Alert
					severity="error"
					sx={{
						marginBottom: 2,
						color: Colors.error,
					}}
				>
					{error}
				</Alert>
			)}

			{loading && (
				<CircularProgress
					sx={{
						display: "block",
						margin: "16px auto",
						color: Colors.primary.main,
					}}
				/>
			)}

			{!loading && !error && data.length > 0 && (
				<Grid container spacing={3}>
					{data.map((doc: any) => (
						<Grid item xs={12} sm={6} key={doc.id}>
							<Card
								sx={{
									backgroundColor: Colors.white,
									boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
									height: "100%",
									display: "flex",
									flexDirection: "column",
								}}
							>
								<CardContent sx={{ flex: 1 }}>
									<Typography
										variant="h2"
										component="div"
										sx={{ fontSize: "1.25rem", mb: 1 }}
									>
										<Link
											href={`/db/${dbName}/${doc.id}`}
											underline="hover"
											sx={{ color: Colors.primary.main }}
										>
											{doc.value.name || "Untitled"}
										</Link>
									</Typography>

									<Typography
										color={Colors.textSecondary}
										variant="body2"
										sx={{ mb: 2 }}
									>
										ID: {doc.id}
									</Typography>

									<Stack spacing={2}>
										<Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
											{doc.value.subj && (
												<Chip
													label={`${doc.value.subj.length} subjects`}
													size="small"
													sx={{
														backgroundColor: Colors.primary.light,
														color: Colors.white,
													}}
												/>
											)}
											{doc.value.modality &&
												doc.value.modality.map((mod: string) => (
													<Chip
														key={mod}
														label={mod}
														size="small"
														sx={{
															backgroundColor: Colors.secondary.light,
															color: Colors.white,
														}}
													/>
												))}
										</Stack>

										<Typography variant="body2" color={Colors.textSecondary}>
											<strong>Summary:</strong>{" "}
											{doc.value.readme || "No description available"}
										</Typography>

										<Typography variant="body2" color={Colors.textPrimary}>
											<strong>Authors:</strong>{" "}
											{doc.value.info?.Authors?.join(", ") || "Unknown"}
										</Typography>

										<Stack direction="row" spacing={2} alignItems="center">
											<Typography variant="body2" color={Colors.textPrimary}>
												<strong>Size:</strong>{" "}
												{doc.value.length
													? `${(doc.value.length / 1024 / 1024).toFixed(2)} MB`
													: "Unknown"}
											</Typography>

											{doc.value.info?.DatasetDOI && (
												<Link
													href={doc.value.info.DatasetDOI}
													target="_blank"
													rel="noopener"
												>
													<Chip
														label="DOI"
														size="small"
														clickable
														sx={{
															backgroundColor: Colors.accent,
															color: Colors.white,
														}}
													/>
												</Link>
											)}
										</Stack>
									</Stack>
								</CardContent>
							</Card>
						</Grid>
					))}
				</Grid>
			)}

			{!loading && !error && data.length === 0 && (
				<Typography
					variant="body1"
					color={Colors.textSecondary}
					align="center"
					sx={{ mt: 4 }}
				>
					No database information available.
				</Typography>
			)}

			{hasMore && !loading && (
				<Box sx={{ textAlign: "center", mt: 3 }}>
					<Button
						variant="contained"
						onClick={loadMoreData}
						sx={{
							backgroundColor: Colors.primary.main,
							color: Colors.white,
							"&:hover": {
								backgroundColor: Colors.primary.dark,
							},
						}}
					>
						Load More
					</Button>
				</Box>
			)}
		</Box>
	);
};

export default DatasetPage;
