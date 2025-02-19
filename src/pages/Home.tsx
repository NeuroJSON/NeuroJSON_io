import {
	Box,
	Typography,
	Button,
	Container,
	Grid,
	CircularProgress,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import NeuroJsonGraph from "modules/universe/NeuroJsonGraph";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRegistry } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";
import NodeInfoPanel from "components/NodeInfoPanel";
import { NodeObject } from "modules/universe/NeuroJsonGraph";

const Home: React.FC = () => {
	const navigate = useNavigate();
	const dispatch = useAppDispatch();
	const { registry, loading } = useAppSelector(NeurojsonSelector);

	// State for selected node and panel visibility
	const [selectedNode, setSelectedNode] = useState<NodeObject | null>(null);
	const [panelOpen, setPanelOpen] = useState(false);

	useEffect(() => {
		dispatch(fetchRegistry());
	}, [dispatch]);

	// Handle node click: Set selected node and open panel
	const handleNodeClick = (node: NodeObject) => {
		setSelectedNode(node);
		setPanelOpen(true);
	};

	return (
		<Container
			style={{
				minWidth: "100%",
				maxHeight: "99%",
				padding: 0,
				overflow: "hidden",
				position: "relative",
			}}
		>
			<Box
				sx={{
					zIndex: "2",
					position: "relative",
					width: "100%",
					overflow: "hidden",
				}}
			>
				{!registry ? (
					<Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
						<CircularProgress sx={{ color: Colors.primary.main }} />
					</Box>
				) : registry && registry.length > 0 ? (
					<NeuroJsonGraph registry={registry} onNodeClick={handleNodeClick} />
				) : (
					<Box sx={{ textAlign: "center", mt: 4 }}>
						<Typography variant="h6" color={Colors.textSecondary}>
							No data available to display
						</Typography>
					</Box>
				)}
			</Box>

			<Box
				sx={{
					overflow: "hidden",
					maxWidth: "42%",
					zIndex: "3",
					position: "absolute",
					top: "6%",
					left: "5%",
					backgroundColor: "rgba(255, 255, 255, 0.8)",
					padding: "1.5rem",
					borderRadius: "8px",
					boxShadow: "0 4px 8px rgba(0, 0, 0, 0.1)",
				}}
			>
				{/* Header Section */}
				<Typography
					variant="h3"
					gutterBottom
					sx={{ color: Colors.primary.dark }}
				>
					Discover NeuroJSON IO
				</Typography>
				<Typography variant="body1" sx={{ color: Colors.textSecondary }}>
					Efficiently manage and explore your CouchDB databases and datasets
					with ease.
				</Typography>

				{/* Navigation to Database Page */}
				<Box mt={4}>
					<Button
						variant="contained"
						sx={{
							backgroundColor: Colors.primary.main,
							color: Colors.white,
							"&:hover": {
								backgroundColor: Colors.primary.dark,
							},
						}}
						onClick={() => navigate("/databases")}
					>
						View Databases
					</Button>
				</Box>
			</Box>

			<NodeInfoPanel open={panelOpen} onClose={() => setPanelOpen(false)} nodeData={selectedNode} />
		</Container>
	);
};

export default Home;
