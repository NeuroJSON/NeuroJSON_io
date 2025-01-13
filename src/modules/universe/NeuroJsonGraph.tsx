import ForceGraph3D from "3d-force-graph";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import {
	CSS2DObject,
	CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { Database } from "types/responses/registry.interface";

// Define the interface for NodeObject
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

	// Debug log for registry data
	useEffect(() => {
		console.log("From NeuroJsonGraph, registry:", registry);
	}, [registry]);

	useEffect(() => {
		// Ensure registry and graphRef are properly initialized
		if (!registry || registry.length === 0) {
			console.error("Registry is empty or undefined:", registry);
			return;
		}

		if (!graphRef.current) {
			console.error("Graph ref is null");
			return;
		}

		// Prepare graph data
		const graphData = {
			nodes: registry.map((db) => ({
				id: db.id,
				name: db.fullname || db.name,
				dbname: db.name,
				color: "rgba(255,255,255,1)", // White color for nodes
				datatype: db.datatype,
				support: db.support,
				url: db.url,
			})),
			links: [], // Add links if needed
		};

		// Initialize 3D Force Graph
		const Graph = new ForceGraph3D(graphRef.current)
			.graphData(graphData)
			.nodeRelSize(2)
			.nodeColor((node) => (node as NodeObject).color || "rgba(255,255,255,1)") // White nodes
			.backgroundColor("rgba(0,0,0,0)") // Transparent background
			.nodeLabel("name")
			.nodeThreeObject((node) => {
				const castNode = node as NodeObject;

				// Create a 3D sphere for the node
				const sphereGeometry = new THREE.SphereGeometry(5, 16, 16); // Radius 5
				const sphereMaterial = new THREE.MeshBasicMaterial({
					color: "white",
				});
				const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

				// Add label as CSS2DObject
				const label = new CSS2DObject(document.createElement("div"));
				label.element.textContent = castNode.dbname || "Unnamed";
				label.element.style.color = "white";
				label.element.style.fontSize = "10px";
				label.element.style.pointerEvents = "none"; // Prevent interaction
				label.position.set(0, 10, 0); // Position label above the node
				sphere.add(label);

				return sphere;
			});

		// Initialize CSS2DRenderer for 2D labels
		const labelRenderer = new CSS2DRenderer();
		labelRenderer.setSize(window.innerWidth, window.innerHeight);
		labelRenderer.domElement.style.position = "absolute";
		labelRenderer.domElement.style.top = "0px";
		labelRenderer.domElement.style.pointerEvents = "none"; // Prevent interaction
		graphRef.current?.appendChild(labelRenderer.domElement);

		// Animate label rendering
		const animate = () => {
			requestAnimationFrame(animate);
			labelRenderer.render(Graph.scene(), Graph.camera());
		};
		animate();

		// Handle window resize
		const resizeGraph = () => {
			Graph.width(window.innerWidth).height(window.innerHeight);
			labelRenderer.setSize(window.innerWidth, window.innerHeight);
		};
		resizeGraph();
		window.addEventListener("resize", resizeGraph);

		// Cleanup on component unmount
		return () => {
			window.removeEventListener("resize", resizeGraph);
			if (graphRef.current) {
				graphRef.current.removeChild(labelRenderer.domElement);
			}
		};
	}, [registry]);

	return (
		<div
			ref={graphRef}
			style={{
				width: "100%",
				height: "100vh",
				backgroundColor: "transparent",
				position: "relative",
			}}
		/>
	);
};

export default NeuroJsonGraph;
