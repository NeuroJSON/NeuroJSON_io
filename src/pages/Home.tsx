import { Box, Typography, Button, Container } from "@mui/material";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import NeuroJsonGraph from "modules/universe/NeuroJsonGraph";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchRegistry } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";

const Home: React.FC = () => {
	const dispatch = useAppDispatch();
	const { registry } = useAppSelector(NeurojsonSelector);

	useEffect(() => {
		dispatch(fetchRegistry());
		console.log(registry);
	}, [dispatch]);
	return (
		<Container>
			{registry && <NeuroJsonGraph registry={registry} />}

			<Box sx={{ padding: 4, maxHeight: "100%", maxWidth: "30%" }}>
				{/* Header Section */}
				<Typography variant="h3" gutterBottom>
					Welcome to NeuroJSON IO
				</Typography>
				<Typography variant="body1">
					Manage and explore your CouchDB databases and datasets effortlessly.
				</Typography>

				{/* Navigation to Database Page */}
				<Box mt={4}>
					<Button
						variant="contained"
						color="primary"
						component={Link}
						to="/databases"
					>
						View Databases
					</Button>
				</Box>
			</Box>
		</Container>
	);
};

export default Home;
