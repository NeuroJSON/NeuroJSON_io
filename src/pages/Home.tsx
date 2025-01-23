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
		<Container style={{ width: "100%", height: "100vh", padding: 0 }}>
			{registry && registry.length > 0 ? (
				<NeuroJsonGraph registry={registry} />
			) : (
				<div>No data available to display</div>
			)}
		</Container>
	);
};

export default Home;
