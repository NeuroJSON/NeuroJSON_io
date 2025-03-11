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
  standard: string[]; // define type of standard property
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

  // Function to determine color and size based on node size
  //   const size2colorAndSize = (size: number) => {
  //     if (size > 32) return { color: Colors.primary.dark, size: 10 };
  //     if (size > 3) return { color: Colors.primary.main, size: 7 };
  //     return { color: Colors.primary.light, size: 5 };
  //   };
  // Custom random number generator (same as `mulberry32`)
  const mulberry32 = (a: number) => {
    return function () {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };

  const rngfun = mulberry32(0x123456789); // Seeded random function

  //   // Shuffle nodes
  //   const nodenum = registry.length;
  //   const randnode = [...Array(nodenum).keys()];

  // Fisher-Yates Shuffle
  //   for (let i = 0; i < nodenum; i++) {
  //     const j = Math.floor(rngfun() * (i + 1));
  //     [randnode[i], randnode[j]] = [randnode[j], randnode[i]];
  //   }

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

    let colorlist: { brightness: number; index: number }[] = registry.map(
      (db, index) => {
        const colorStr = blendColors(db.datatype); // Get color in "rgb(R,G,B)" format

        // **Extract RGB values from the string**
        const match = colorStr.match(/\d+/g); // Get numbers from "rgb(R,G,B)"
        if (!match) return { brightness: 255, index }; // Default to white if extraction fails

        const [r, g, b] = match.map(Number); // Convert to numbers
        const brightness = 0.2126 * r + 0.7152 * g + 0.0722 * b; // Compute brightness

        return { brightness, index };
      }
    );

    // **2️⃣ Sort nodes by brightness (dark → bright)**
    colorlist.sort((a, b) => a.brightness - b.brightness);

    // // **3️⃣ Create shuffled node list using Fisher-Yates algorithm**
    // const nodenum = registry.length;
    // const randnode = colorlist.map((item) => item.index); // Get sorted indices

    // for (let i = 0; i < nodenum; i++) {
    //   const j = Math.floor(rngfun() * (i + 1));
    //   [randnode[i], randnode[j]] = [randnode[j], randnode[i]];
    // }

    // Prepare graph data
    const graphData = {
      nodes: registry.map((db) => {
        // const { color, size } = size2colorAndSize(db.datasets);
        const color = blendColors(db.datatype);
        const size = db.datasets > 32 ? 10 : db.datasets > 3 ? 7 : 5;

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

      links: registry.flatMap((db, index) => {
        // const color = blendColors(db.datatype);
        // return registry
        //   .filter(
        //     (otherDb) =>
        //       db.id !== otherDb.id &&
        //       db.datatype.some((type) => otherDb.datatype.includes(type))
        //   )
        //   .map((otherDB) => ({
        //     source: db.id,
        //     target: otherDB.id,
        //     color: Colors.lightGray,
        //     visible: true,
        //   }));

        // const connections = [];
        // const nextIndex = (index + 1) % registry.length;
        // // const { color } = size2colorAndSize(db.datasets);
        // const color = blendColors(db.datatype);
        // connections.push({
        //   source: db.id,
        //   target: registry[nextIndex].id,
        //   color: color,
        //   visible: true,
        // });
        // return connections;

        // use original website logic
        const coloridx = index;
        const i = colorlist[coloridx].index; // Get shuffled node index
        const node = registry[i]; // Get actual node

        // Determine number of connections (proportional to dataset size)
        const conn = 1 + Math.round(rngfun() * Math.max(1, node.datasets / 20));
        // const numConnections = 4;
        const connections: {
          source: string;
          target: string;
          color: string;
          visible: boolean;
        }[] = [];

        // for (let j = -conn; j <= conn; j++) {
        //   if (j === 0) continue; // Skip linking to itself
        //   if (coloridx + j >= nodenum) break; // Prevent out-of-bounds errors

        //   const targetNode = registry[randnode[Math.max(0, coloridx + j)]]; // Pick a nearby node from shuffled list

        //   connections.push({
        //     source: node.id,
        //     target: targetNode.id,
        //     color: blendColors(node.datatype), // Match node's color
        //     visible: true, // Make links visible
        //   });
        // }

        for (let j = 1; j <= conn; j++) {
          if (index + j >= registry.length) break; // Prevent out-of-bounds errors

          const targetIdx = colorlist[index + j].index; // Get next closest in brightness
          const targetNode = registry[targetIdx];

          connections.push({
            source: node.id,
            target: targetNode.id,
            color: blendColors(node.datatype), // Keep consistent coloring
            visible: true, // Make links visible
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
      .linkWidth(0.5)
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
          opacity: 0.2,
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
        label.element.style.color = Colors.white;
        label.element.style.fontSize = "12px";
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
