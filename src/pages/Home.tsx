import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  CircularProgress,
} from "@mui/material";
import NodeInfoPanel from "components/NodeInfoPanel";
import FilterMenu from "components/NodesFilter/FilterMenu";
import StatisticsBanner from "components/StatisticsBanner";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import NeuroJsonGraph from "modules/universe/NeuroJsonGraph";
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
    <Container
      style={{
        minWidth: "100%",
        maxHeight: "99%",
        padding: 0,
        overflow: "hidden",
        position: "relative",
        minHeight: "500px", // make sure the view databases card won't be cut when no nodes showing
        // display: "flex",
        // flexDirection: "column",
        // minHeight: "100vh",
      }}
    >
      <Box // add box for group StatisticsBanner and 3d-graph
        sx={{
          flex: "2",
          width: "100%",
          position: "relative",
          overflow: "hidden",
          // minHeight: "100vh",
          // minHeight: "90%",
          // maxHeight: "80vh",
        }}
      >
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
        <StatisticsBanner />
      </Box>

      <Box
        sx={{
          overflow: "hidden",
          maxWidth: "35%",
          // width: "100%",
          zIndex: 3,
          position: "absolute",
          top: "5%",
          left: "1%",
          backgroundColor: "rgba(97, 109, 243, 0.4)",
          // backgroundColor: "rgba(160, 165, 194, 0.4)",
          backdropFilter: "blur(10px)",
          // backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1600 900'%3E%3Cpolygon fill='%235865f2' points='957 450 539 900 1396 900'/%3E%3Cpolygon fill='%2302dec4' points='957 450 872.9 900 1396 900'/%3E%3Cpolygon fill='%234c59d1' points='-60 900 398 662 816 900'/%3E%3Cpolygon fill='%2347e3a9' points='337 900 398 662 816 900'/%3E%3Cpolygon fill='%23424eb1' points='1203 546 1552 900 876 900'/%3E%3Cpolygon fill='%2377e789' points='1203 546 1552 900 1162 900'/%3E%3Cpolygon fill='%23394392' points='641 695 886 900 367 900'/%3E%3Cpolygon fill='%23a3e768' points='587 900 641 695 886 900'/%3E%3Cpolygon fill='%23303773' points='1710 900 1401 632 1096 900'/%3E%3Cpolygon fill='%23d1e449' points='1710 900 1401 632 1365 900'/%3E%3Cpolygon fill='%23282c56' points='1210 900 971 687 725 900'/%3E%3Cpolygon fill='%23ffdd31' points='943 900 1210 900 971 687'/%3E%3C/svg%3E")`,
          // backgroundAttachment: "local",
          // backgroundSize: "cover",
          padding: { xs: "1rem", sm: "1rem", md: "1.5rem" }, // Responsive padding
          borderRadius: "8px",
          flexShrink: 0,
          // minHeight: "800px",
        }}
      >
        {/* Header Section */}
        <Typography
          variant="h3"
          gutterBottom
          sx={{ color: Colors.lightGray, fontWeight: "medium" }}
        >
          Discover NeuroJSON.io
        </Typography>
        <Typography variant="body1" sx={{ color: Colors.lightGray }}>
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
