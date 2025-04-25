import { Box, Typography, Button, Container } from "@mui/material";
import Section1 from "components/HomePageComponents/Section1";
import Section2 from "components/HomePageComponents/Section2";
import NodeInfoPanel from "components/NodeInfoPanel";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import { NodeObject } from "modules/universe/NeuroJsonGraph";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchRegistry } from "redux/neurojson/neurojson.action";
import { NeurojsonSelector } from "redux/neurojson/neurojson.selector";

const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { registry, loading } = useAppSelector(NeurojsonSelector);

  // State for selected node and panel visibility
  const [selectedNode, setSelectedNode] = useState<NodeObject | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [filterKeyword, setFilterKeyword] = useState<string>(""); // State for filter input
  const [selectedModalities, setSelectedModalities] = useState<string[]>([]);

  useEffect(() => {
    dispatch(fetchRegistry());
  }, [dispatch]);

  // Handle node click: Set selected node and open panel
  const handleNodeClick = useCallback((node: NodeObject) => {
    setSelectedNode(node);
    setPanelOpen(true);
  }, []);

  // filter logic
  const filteredRegistry = useMemo(() => {
    return registry
      ? registry.filter((node) => {
          const matchKeyword = node.name
            .toLowerCase()
            .includes(filterKeyword.toLowerCase());
          const matchModalities =
            selectedModalities.length === 0 ||
            selectedModalities.some((modality) =>
              Array.isArray(node.datatype)
                ? node.datatype.includes(modality)
                : node.datatype === modality
            );
          return matchKeyword && matchModalities;
        })
      : [];
  }, [registry, filterKeyword, selectedModalities]);

  return (
    <Container // container for the home page
      style={{
        minWidth: "100%",
        maxHeight: "99%",
        padding: 0,
        overflow: "hidden",
        position: "relative",
        minHeight: "500px",
        // minHeight: "100vh",
      }}
    >
      {/* section 1 */}
      <Section1 />

      {/* section 2 */}
      <Section2
        registry={registry}
        filteredRegistry={filteredRegistry}
        filterKeyword={filterKeyword}
        selectedModalities={selectedModalities}
        setFilterKeyword={setFilterKeyword}
        setSelectedModalities={setSelectedModalities}
        onNodeClick={handleNodeClick}
      />

      {/* section 3 */}
      <Box
        sx={{
          zIndex: "2",
          position: "relative",
          width: "100%",
          backgroundColor: Colors.lightGray,
          padding: "5rem 7rem",
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
        }}
      >
        <img src="/workflow.png" alt="workflow" width="90%" height="auto"></img>
      </Box>

      <NodeInfoPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        nodeData={selectedNode}
      />
    </Container>
  );
};

export default Home;
