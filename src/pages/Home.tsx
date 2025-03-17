import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  CircularProgress,
} from "@mui/material";
import NodeInfoPanel from "components/NodeInfoPanel";
// import KeywordFilter from "components/NodesFilter/KeywordFilter";
// import ModalitiesFilter from "components/NodesFilter/ModalitiesFilter";
import FilterMenu from "components/NodesFilter/FilterMenu";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import NeuroJsonGraph from "modules/universe/NeuroJsonGraph";
import { NodeObject } from "modules/universe/NeuroJsonGraph";
import React, { useEffect, useState } from "react";
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
  const handleNodeClick = (node: NodeObject) => {
    setSelectedNode(node);
    setPanelOpen(true);
  };

  // const filteredRegistry = registry
  //   ? registry.filter((node) =>
  //       node.name.toLowerCase().includes(filterKeyword.toLowerCase())
  //     )
  //   : [];

  // filter logic
  const filteredRegistry = registry
    ? registry.filter((node) => {
        const matchKeyword = node.name
          .toLowerCase()
          .includes(filterKeyword.toLowerCase());
        const matchModalities =
          selectedModalities.length === 0 ||
          // selectedModalities.some((modality) =>
          //   node.datatype.includes(modality)
          // );
          selectedModalities.some((modality) =>
            Array.isArray(node.datatype)
              ? node.datatype.includes(modality)
              : node.datatype === modality
          );

        return matchKeyword && matchModalities;
      })
    : [];

  // const handleModalitiesFilter = (modalities: string[]) => {
  //   setSelectedModalities(modalities);
  // };

  return (
    <Container
      style={{
        minWidth: "100%",
        maxHeight: "99%",
        padding: 0,
        overflow: "hidden",
        position: "relative",
        minHeight: "500px", // make sure the view databases card won't be cut when no nodes showing
      }}
    >
      {/* <Box sx={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <KeywordFilter onFilter={(query: string) => setFilterKeyword(query)} />
      </Box>
      <Box
        sx={{
          position: "absolute",
          top: 100,
          right: 20,
          zIndex: 10,
          backgroundColor: "white",
          p: 2,
          borderRadius: 2,
        }}
      >
        <ModalitiesFilter onFilter={handleModalitiesFilter} />
      </Box> */}

      {/* Filter Menu Button */}
      <Box sx={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <FilterMenu
          onKeywordFilter={setFilterKeyword}
          onModalitiesFilter={setSelectedModalities}
          filterKeyword={filterKeyword}
          homeSelectedModalities={selectedModalities}
        />
      </Box>
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
        ) : filteredRegistry.length > 0 ? (
          <NeuroJsonGraph
            registry={filteredRegistry}
            onNodeClick={handleNodeClick}
          />
        ) : (
          <Box sx={{ textAlign: "center", mt: 4 }}>
            <Typography variant="h6" color={Colors.textSecondary}>
              No matching nodes found
            </Typography>
          </Box>
        )}
      </Box>

      <Box
        sx={{
          overflow: "hidden",
          maxWidth: "35%",
          zIndex: "3",
          position: "absolute",
          top: "6%",
          left: "1%",
          backgroundColor: "rgba(97, 109, 243, 0.1)",
          backdropFilter: "blur(10px)",
          boxShadow: `0px 0px 5px ${Colors.lightYellow}`,
          padding: "1.5rem",
          borderRadius: "8px",
        }}
      >
        {/* Header Section */}
        <Typography variant="h3" gutterBottom sx={{ color: Colors.white }}>
          Discover NeuroJSON.io
        </Typography>
        <Typography variant="body1" sx={{ color: Colors.white }}>
          Efficiently manage and explore your CouchDB databases and datasets
          with ease.
        </Typography>

        {/* Navigation to Database Page */}
        <Box mt={4}>
          <Button
            variant="contained"
            sx={{
              backgroundColor: Colors.green,
              color: Colors.darkPurple,
              fontWeight: "Bold",
              "&:hover": {
                backgroundColor: Colors.darkPurple,
                color: Colors.green,
                boxShadow: `0px 0px 15px ${Colors.darkGreen}`,
              },
            }}
            onClick={() => navigate("/databases")}
          >
            View Databases
          </Button>
        </Box>
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
