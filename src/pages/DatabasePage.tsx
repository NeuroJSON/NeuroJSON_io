import {
	Box,
	Typography,
	Button,
	Container,
	CircularProgress,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRegistry } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";
import { Database } from "types/responses/registry.interface";

const DatabasePage: React.FC = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { registry } = useAppSelector(NeurojsonSelector);

	useEffect(() => {
		dispatch(fetchRegistry());
	}, [dispatch]);

	if (!registry || registry.length === 0) {
		return (
			<Container maxWidth="md">
				<Box
					sx={{
						textAlign: "center",
						padding: 8,
						backgroundColor: Colors.lightGray,
						borderRadius: 2,
						margin: "2rem auto",
					}}
				>
					<Typography variant="h2" color={Colors.secondary.main} gutterBottom>
						No Databases Found
					</Typography>
					<Typography variant="body1" color={Colors.textSecondary}>
						Please check back later or contact support if this persists.
					</Typography>
				</Box>
			</Container>
		);
	}

	return (
		<Container maxWidth="lg">
			<Box sx={{ padding: { xs: 2, md: 4 } }}>
				<Typography variant="h1" gutterBottom>
					Databases
				</Typography>
				<Box
					sx={{
						display: "grid",
						gridTemplateColumns: {
							xs: "1fr",
							sm: "repeat(2, 1fr)",
							md: "repeat(3, 1fr)",
							lg: "repeat(4, 1fr)",
						},
						gap: 3,
						mt: 4,
					}}
				>
					{registry.map((db) => (
						<Button
							key={db.id}
							variant="contained"
							sx={{
								padding: 3,
								textTransform: "none",
								fontWeight: 600,
								backgroundColor: Colors.primary.main,
								color: Colors.white,
								borderRadius: 2,
								transition: "all 0.3s ease",
								height: "100px",
								display: "flex",
								flexDirection: "column",
								justifyContent: "center",
								"&:hover": {
									backgroundColor: Colors.primary.dark,
									transform: "translateY(-2px)",
									boxShadow: 3,
								},
							}}
							onClick={() => navigate(`/databases/${db.name}`)}
						>
							<Typography variant="h6" component="span">
								{db.name}
							</Typography>
						</Button>
					))}
				</Box>
			</Box>
		</Container>
	);
};

export default DatabasePage;
