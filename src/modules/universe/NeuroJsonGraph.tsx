import ForceGraph3D from "3d-force-graph";
import { Colors } from "design/theme";
import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import {
	CSS2DObject,
	CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { Database } from "types/responses/registry.interface";

export interface NodeObject {
	id: string;
	name: string;
	dbname: string;
	color: string;
	datatype: string[];
	support: string;
	url: string;
	datasets: number;
}

const NeuroJsonGraph: React.FC<{ registry: Database[] }> = ({ registry }) => {
	const graphRef = useRef<HTMLDivElement>(null);

	// Function to determine color and size based on node size
	const size2colorAndSize = (size: number) => {
		if (size > 32) return { color: Colors.primary.dark, size: 10 };
		if (size > 3) return { color: Colors.primary.main, size: 7 };
		return { color: Colors.primary.light, size: 5 };
	};

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
			nodes: registry.map((db) => {
				const { color, size } = size2colorAndSize(db.datasets);
				return {
					id: db.id,
					name: db.fullname || db.name,
					dbname: db.name,
					color: color,
					datatype: db.datatype,
					support: db.support,
					url: db.url,
					datasets: db.datasets,
					size: size,
				};
			}),
			links: registry.flatMap((db, index) => {
				const connections = [];
				const nextIndex = (index + 1) % registry.length;
				const { color } = size2colorAndSize(db.datasets);
				connections.push({
					source: db.id,
					target: registry[nextIndex].id,
					color: color,
					visible: true,
				});
				return connections;
			}),
		};

		// Initialize 3D Force Graph
		const Graph = new ForceGraph3D(graphRef.current)
			.graphData(graphData)
			.nodeRelSize(2)
			.nodeColor((node) => (node as NodeObject).color)
			.linkWidth(2) // Set the thickness of the links
			.backgroundColor("rgba(0,0,0,0)") // Transparent background
			.nodeLabel("name")
			.nodeThreeObject((node) => {
				const castNode = node as NodeObject;

				// Create a 3D sphere for the node
				const sphereGeometry = new THREE.SphereGeometry(
					(castNode as any).size,
					16,
					16
				); // Dynamic radius
				const sphereMaterial = new THREE.MeshBasicMaterial({
					color: (castNode as any).color,
				});
				const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);

				// Add label as CSS2DObject
				const label = new CSS2DObject(document.createElement("div"));
				label.element.textContent = castNode.dbname || "Unnamed";
				label.element.style.color = Colors.primary.main;
				label.element.style.fontSize = "12px";
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
		labelRenderer.domElement.style.pointerEvents = "none";
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
				maxHeight: "99%",
				backgroundColor: "transparent",
				position: "relative",
				overflow: "hidden",
			}}
		/>
	);
};

export default NeuroJsonGraph;
