import { Container } from "@mui/material";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import NeuroJsonGraph from "modules/universe/NeuroJsonGraph";
import React, { useEffect } from "react";
import { fetchRegistry } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";

const Home: React.FC = () => {
	const dispatch = useAppDispatch();
	const { registry } = useAppSelector(NeurojsonSelector);

	useEffect(() => {
		dispatch(fetchRegistry());
	}, [dispatch]);
	return (
		<Container>{registry && <NeuroJsonGraph registry={registry} />}</Container>
	);
};

export default Home;
