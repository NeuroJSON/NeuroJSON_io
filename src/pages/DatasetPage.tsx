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
	Select,
	MenuItem,
	FormControl,
	InputLabel,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

const DatasetPage: React.FC = () => {
	const navigate = useNavigate();
	const { dbName } = useParams<{ dbName: string }>();
	const dispatch = useAppDispatch();
	const { loading, error, data, limit, hasMore } = useAppSelector(
		(state: { neurojson: any }) => state.neurojson
	);
	const [currentOffset, setCurrentOffset] = useState(0);
	const [pageSize, setPageSize] = useState(10);

	useEffect(() => {
		if (dbName) {
			dispatch(fetchDbInfo(dbName.toLowerCase()));
			dispatch(
				loadPaginatedData({
					dbName: dbName.toLowerCase(),
					offset: 0,
					limit: pageSize,
				})
			);
		}
	}, [dbName, dispatch, pageSize]);

	const loadMoreData = () => {
		if (dbName && !loading) {
			const nextOffset = currentOffset + pageSize;
			setCurrentOffset(nextOffset);
			dispatch(
				loadPaginatedData({
					dbName: dbName.toLowerCase(),
					offset: nextOffset,
					limit: pageSize,
				})
			);
		}
	};

	const handlePageSizeChange = (event: any) => {
		setPageSize(event.target.value);
		setCurrentOffset(0); // Reset offset when changing page size
	};

	return (
		<Box sx={{ padding: { xs: 2, md: 4 } }}>
			<Box
				sx={{
					display: "flex",
					alignItems: "center",
					gap: 2,
					justifyContent: "space-between",
				}}
			>
				<Typography
					variant="h1"
					gutterBottom
					sx={{
						color: Colors.primary.dark,
						fontWeight: 700,
						fontSize: "2rem",
					}}
				>
					Database: {dbName || "N/A"}
				</Typography>

				<Box sx={{ mb: 3, display: "flex", alignItems: "center" }}>
					<FormControl
						size="small"
						sx={{
							minWidth: 150,
							backgroundColor: Colors.white,
							borderRadius: 1,
							boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
							"& .MuiInputLabel-root": {
								color: Colors.textSecondary,
								fontWeight: 500,
							},
							"& .MuiOutlinedInput-root": {
								transition: "all 0.2s ease-in-out",
								"& fieldset": {
									borderColor: Colors.primary.main,
									borderWidth: 2,
								},
								"&:hover fieldset": {
									borderColor: Colors.primary.dark,
									borderWidth: 2,
								},
								"&.Mui-focused fieldset": {
									borderColor: Colors.primary.dark,
									borderWidth: 2,
								},
							},
						}}
					>
						<InputLabel>Items per page</InputLabel>
						<Select
							value={pageSize}
							label="Items per page"
							onChange={handlePageSizeChange}
							sx={{
								color: Colors.textPrimary,
								fontWeight: 500,
								"& .MuiSelect-icon": {
									color: Colors.primary.main,
									transition: "transform 0.2s ease-in-out",
								},
								"&:hover .MuiSelect-icon": {
									transform: "rotate(180deg)",
									color: Colors.primary.dark,
								},
							}}
						>
							<MenuItem value={10} sx={{ fontWeight: 500 }}>
								10 items
							</MenuItem>
							<MenuItem value={25} sx={{ fontWeight: 500 }}>
								25 items
							</MenuItem>
							<MenuItem value={50} sx={{ fontWeight: 500 }}>
								50 items
							</MenuItem>
							<MenuItem value={100} sx={{ fontWeight: 500 }}>
								100 items
							</MenuItem>
						</Select>
					</FormControl>
				</Box>
			</Box>

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
									<Button
										onClick={() =>
											navigate(`${RoutesEnum.DATABASES}/${dbName}/${doc.id}`)
										}
										sx={{
											fontSize: "1.25rem",
											margin: 0,
											color: Colors.primary.main,
											textTransform: "none",
											justifyContent: "flex-start",
										}}
									>
										{doc.value.name || "Untitled"}
									</Button>

									<Typography
										color={Colors.textSecondary}
										variant="body2"
										sx={{ mb: 2, marginLeft: 1 }}
									>
										ID: {doc.id}
									</Typography>

									<Stack spacing={2} margin={1}>
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
											{Array.isArray(doc.value.info?.Authors)
												? doc.value.info.Authors.join(", ")
												: doc.value.info?.Authors || "Unknown"}
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

			{!loading && (
				<Box sx={{ textAlign: "center", mt: 3 }}>
					<Button
						variant="contained"
						onClick={loadMoreData}
						disabled={data.length >= limit}
						sx={{
							backgroundColor: Colors.primary.main,
							color: Colors.white,
							"&:hover": {
								backgroundColor: Colors.primary.dark,
							},
						}}
					>
						Load More ({data.length} of {limit} items)
						{data.length >= limit && " - Limit Reached"}
					</Button>
				</Box>
			)}
		</Box>
	);
};

export default DatasetPage;
