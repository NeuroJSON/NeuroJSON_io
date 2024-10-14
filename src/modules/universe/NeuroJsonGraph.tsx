import ForceGraph3D from "3d-force-graph";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useRef } from "react";
import { fetchRegistry } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";
import * as THREE from "three";
import {
	CSS2DObject,
	CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { Database } from "types/responses/registry.interface";

interface NodeObject {
	id: string;
	name: string;
	dbname: string;
	color: string;
	datatype: string[];
	support: string;
	url: string;
}

const NeuroJsonGraph: React.FC<{ registry: Database[] }> = ({ registry }) => {
	const graphRef = useRef<HTMLDivElement>(null);

	const { loading, error } = useAppSelector(NeurojsonSelector);

	useEffect(() => {
		if (graphRef.current && registry) {
			const graphData = {
				nodes: registry.map((db: Database) => ({
					id: db.id,
					name: db.fullname || db.name,
					dbname: db.name,
					color: "rgba(255,255,255,0.8)",
					datatype: db.datatype,
					support: db.support,
					url: db.url,
				})),
				links: [],
			};

			const Graph = ForceGraph3D()(graphRef.current)
				.graphData(graphData)
				.nodeRelSize(2)
				.nodeColor(
					(node) => (node as NodeObject).color || "rgba(255,255,255,0.8)"
				)
				.linkWidth(1)
				.backgroundColor(Colors.primary.light)
				.nodeLabel("name")
				.nodeThreeObject((node) => {
					const nodeEl = document.createElement("span");
					const castNode = node as NodeObject;
					nodeEl.textContent = castNode.dbname || "Unnamed";
					nodeEl.className = "orglabel";
					return new CSS2DObject(nodeEl);
				});

			// Initialize CSS2DRenderer for 2D labels
			const labelRenderer = new CSS2DRenderer();
			labelRenderer.setSize(window.innerWidth, window.innerHeight);
			labelRenderer.domElement.style.position = "absolute";
			labelRenderer.domElement.style.top = "0px";
			graphRef.current?.appendChild(labelRenderer.domElement);

			// Simple render without overriding WebGLRenderer behavior
			Graph.renderer().domElement.addEventListener("render", (e) => {
				labelRenderer.render(Graph.scene(), Graph.camera());
			});

			// Handle window resize
			const resizeGraph = () => {
				Graph.width(window.innerWidth).height(window.innerHeight);
				labelRenderer.setSize(window.innerWidth, window.innerHeight);
			};
			resizeGraph();
			window.addEventListener("resize", resizeGraph);

			return () => {
				window.removeEventListener("resize", resizeGraph);
			};
		}
	}, [registry]);

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<div
			ref={graphRef}
			style={{
				width: "100%",
				height: "100vh",
				backgroundColor: Colors.primary.dark,
				position: "relative",
			}}
		/>
	);
};

export default NeuroJsonGraph;
