import ForceGraph3D from "3d-force-graph";
import { Colors } from "design/theme";
import React, { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
  standard: string[];
}

const NeuroJsonGraph: React.FC<{
  registry: Database[];
  onNodeClick?: (node: NodeObject) => void;
}> = ({ registry, onNodeClick }) => {
  const navigate = useNavigate();
  const graphRef = useRef<HTMLDivElement>(null);

  // Define the datatype to color mapping
  const DATA_TYPE_COLORS: Record<string, [number, number, number]> = {
    mri: [79, 51, 130],
    fmri: [10, 81, 20],
    pet: [0, 105, 192],
    meg: [156, 57, 0],
    eeg: [134, 31, 55],
    ieeg: [18, 109, 62],
    beh: [12, 93, 210],
    fmap: [255, 255, 59],
    dwi: [200, 9, 12],
    fnirs: [255, 193, 7],
    phenotype: [255, 87, 34],
  };

  // Function to blend colors based on datatypes
  const blendColors = (datatypes: string[]): string => {
    if (datatypes.length === 0) return "rgb(255,255,255)"; // Default white

    let totalR = 0,
      totalG = 0,
      totalB = 0;
    let count = 0;

    datatypes.forEach((type) => {
      const color = DATA_TYPE_COLORS[type];
      if (color) {
        totalR += color[0];
        totalG += color[1];
        totalB += color[2];
        count++;
      }
    });

    if (count === 0) count = 1; // Prevent division by zero

    const avgR = Math.floor(totalR / count);
    const avgG = Math.floor(totalG / count);
    const avgB = Math.floor(totalB / count);

    return `rgb(${avgR}, ${avgG}, ${avgB})`;
  };

  // Custom random number generator for link connection usage
  const mulberry32 = (a: number) => {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const rngfun = mulberry32(0x123456789);

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

    // create a colorlist after blend colors for nodes
    let colorlist: { brightness: number; index: number; color: string }[] =
      registry.map((db, index) => {
        const colorStr = blendColors(db.datatype); // Get color in "rgb(R,G,B)" format
        const match = colorStr.match(/\d+/g); // Get numbers from "rgb(R,G,B)"
        if (!match)
          return { brightness: 255, index, color: "rgb(255, 255, 255)" }; // Default to white if extraction fails

        const [r, g, b] = match.map(Number); // Convert to numbers
        const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b; // Compute brightness

        return { brightness, index, color: colorStr };
      });

    // Sort nodes by brightness
    colorlist.sort((a, b) => a.brightness - b.brightness);

    // Prepare graph data
    const graphData = {
      nodes: registry.map((db) => {
        const color = blendColors(db.datatype);
        let size =
          db.datasets > 100 ? Math.log(db.datasets) * 2.5 : db.datasets / 6;
        size = Math.max(size, 4);

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
          standard: db.standard || [],
        };
      }),

      links: colorlist.flatMap(({ index, color }, colorIdx) => {
        const node = registry[index];
        // Determine number of connections
        const scaledDatasets =
          node.datasets > 100 ? Math.log(node.datasets) : node.datasets;
        const conn =
          1 + Math.round(rngfun() * Math.max(1, scaledDatasets / 20));

        const connections: {
          source: string;
          target: string;
          color: string;
          visible: boolean;
        }[] = [];

        for (let j = -conn; j <= conn; j++) {
          if (j === 0) continue;
          const targetColorIdx = colorIdx + j;
          if (targetColorIdx < 0 || targetColorIdx >= colorlist.length)
            continue; // Prevent out-of-bounds errors
          const targetIdx = colorlist[targetColorIdx].index; // Get registry node index in colorlist order
          const targetNode = registry[targetIdx]; // Get target node info in registry

          connections.push({
            source: node.id,
            target: targetNode.id,
            color: blendColors(node.datatype),
            visible: true,
          });
        }

        return connections;
      }),
    };

    // Initialize 3D Force Graph
    const Graph = new ForceGraph3D(graphRef.current)
      .graphData(graphData)
      .nodeRelSize(2)
      .nodeColor((node) => (node as NodeObject).color)
      .linkWidth(1)
      .backgroundColor("rgba(0,0,0,0)")
      .nodeLabel("name")
      .onNodeHover((node) => {
        // Change cursor on hover
        graphRef.current!.style.cursor = node ? "pointer" : "default";
      })
      .onNodeClick((node) => {
        const castNode = node as NodeObject;
        if (onNodeClick) {
          onNodeClick(castNode);
        }
        // navigate(`/databases/${castNode.id}`);
      })
      .nodeThreeObject((node) => {
        const castNode = node as NodeObject;

        // Create a group to hold sphere and glow
        const group = new THREE.Group();

        // Create a 3D sphere for the node
        const sphereGeometry = new THREE.SphereGeometry(
          (castNode as any).size,
          16,
          16
        );
        const sphereMaterial = new THREE.MeshBasicMaterial({
          color: (castNode as any).color,
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        group.add(sphere);

        // Create glow effect
        const glowGeometry = new THREE.SphereGeometry(
          (castNode as any).size * 1.2,
          16,
          16
        );
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: (castNode as any).color,
          transparent: true,
          opacity: 0.5,
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);

        // Animate glow
        const animate = () => {
          glow.scale.setScalar(1 + Math.sin(Date.now() * 0.003) * 0.1);
          requestAnimationFrame(animate);
        };
        animate();

        group.add(glow);

        // Add label as CSS2DObject
        const label = new CSS2DObject(document.createElement("div"));
        label.element.textContent = castNode.dbname || "Unnamed";
        label.element.style.color = Colors.lightYellow;
        label.element.style.fontSize = "16px";
        label.element.style.pointerEvents = "none";
        label.position.set(0, 10, 0);
        group.add(label);

        return group;
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
