import {
  Box,
  Typography,
  Button,
  Container,
  Grid,
  CircularProgress,
} from "@mui/material";
import SearchBar from "components/HomePageComponents/SearchBar";
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
        <SearchBar />
        {/* Filter Menu Button */}
        {/* <Box sx={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
          <FilterMenu
            onKeywordFilter={setFilterKeyword}
            onModalitiesFilter={setSelectedModalities}
            filterKeyword={filterKeyword}
            homeSelectedModalities={selectedModalities}
          />
        </Box> */}
        <Box
          sx={{
            zIndex: "2",
            position: "relative",
            width: "100%",
            backgroundColor: Colors.white,

            padding: "5rem",
            // overflow: "hidden",
            // backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 1500'%3E%3Cdefs%3E%3CradialGradient id='a' gradientUnits='objectBoundingBox'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='1' stop-color='%235865F2'/%3E%3C/radialGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='0' y1='750' x2='1550' y2='750'%3E%3Cstop offset='0' stop-color='%232c3379'/%3E%3Cstop offset='1' stop-color='%235865F2'/%3E%3C/linearGradient%3E%3Cpath id='s' fill='url(%23b)' d='M1549.2 51.6c-5.4 99.1-20.2 197.6-44.2 293.6c-24.1 96-57.4 189.4-99.3 278.6c-41.9 89.2-92.4 174.1-150.3 253.3c-58 79.2-123.4 152.6-195.1 219c-71.7 66.4-149.6 125.8-232.2 177.2c-82.7 51.4-170.1 94.7-260.7 129.1c-90.6 34.4-184.4 60-279.5 76.3C192.6 1495 96.1 1502 0 1500c96.1-2.1 191.8-13.3 285.4-33.6c93.6-20.2 185-49.5 272.5-87.2c87.6-37.7 171.3-83.8 249.6-137.3c78.4-53.5 151.5-114.5 217.9-181.7c66.5-67.2 126.4-140.7 178.6-218.9c52.3-78.3 96.9-161.4 133-247.9c36.1-86.5 63.8-176.2 82.6-267.6c18.8-91.4 28.6-184.4 29.6-277.4c0.3-27.6 23.2-48.7 50.8-48.4s49.5 21.8 49.2 49.5c0 0.7 0 1.3-0.1 2L1549.2 51.6z'/%3E%3Cg id='g'%3E%3Cuse href='%23s' transform='scale(0.12) rotate(60)'/%3E%3Cuse href='%23s' transform='scale(0.2) rotate(10)'/%3E%3Cuse href='%23s' transform='scale(0.25) rotate(40)'/%3E%3Cuse href='%23s' transform='scale(0.3) rotate(-20)'/%3E%3Cuse href='%23s' transform='scale(0.4) rotate(-30)'/%3E%3Cuse href='%23s' transform='scale(0.5) rotate(20)'/%3E%3Cuse href='%23s' transform='scale(0.6) rotate(60)'/%3E%3Cuse href='%23s' transform='scale(0.7) rotate(10)'/%3E%3Cuse href='%23s' transform='scale(0.835) rotate(-40)'/%3E%3Cuse href='%23s' transform='scale(0.9) rotate(40)'/%3E%3Cuse href='%23s' transform='scale(1.05) rotate(25)'/%3E%3Cuse href='%23s' transform='scale(1.2) rotate(8)'/%3E%3Cuse href='%23s' transform='scale(1.333) rotate(-60)'/%3E%3Cuse href='%23s' transform='scale(1.45) rotate(-30)'/%3E%3Cuse href='%23s' transform='scale(1.6) rotate(10)'/%3E%3C/g%3E%3C/defs%3E%3Cg transform='translate(1020 0)'%3E%3Cg transform='translate(0 360)'%3E%3Ccircle fill='url(%23a)' r='3000'/%3E%3Cg opacity='0.5'%3E%3Ccircle fill='url(%23a)' r='2000'/%3E%3Ccircle fill='url(%23a)' r='1800'/%3E%3Ccircle fill='url(%23a)' r='1700'/%3E%3Ccircle fill='url(%23a)' r='1651'/%3E%3Ccircle fill='url(%23a)' r='1450'/%3E%3Ccircle fill='url(%23a)' r='1250'/%3E%3Ccircle fill='url(%23a)' r='1175'/%3E%3Ccircle fill='url(%23a)' r='900'/%3E%3Ccircle fill='url(%23a)' r='750'/%3E%3Ccircle fill='url(%23a)' r='500'/%3E%3Ccircle fill='url(%23a)' r='380'/%3E%3Ccircle fill='url(%23a)' r='250'/%3E%3C/g%3E%3Cg transform='rotate(-241.2 0 0)'%3E%3Cuse href='%23g' transform='rotate(10)'/%3E%3Cuse href='%23g' transform='rotate(120)'/%3E%3Cuse href='%23g' transform='rotate(240)'/%3E%3C/g%3E%3Ccircle fill='url(%23a)' r='3000'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            // backgroundAttachment: "fixed",
            // backgroundSize: "cover",
            // overflow: "auto",
          }}
        >
          <Box
            sx={{
              zIndex: "3",
              position: "relative",
              width: "100%",
              // backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 1500'%3E%3Cdefs%3E%3CradialGradient id='a' gradientUnits='objectBoundingBox'%3E%3Cstop offset='0' stop-color='%235865F2'/%3E%3Cstop offset='1' stop-color='%23FFFFFF'/%3E%3C/radialGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='0' y1='750' x2='1550' y2='750'%3E%3Cstop offset='0' stop-color='%23acb2f9'/%3E%3Cstop offset='1' stop-color='%23FFFFFF'/%3E%3C/linearGradient%3E%3Cpath id='s' fill='url(%23b)' d='M1549.2 51.6c-5.4 99.1-20.2 197.6-44.2 293.6c-24.1 96-57.4 189.4-99.3 278.6c-41.9 89.2-92.4 174.1-150.3 253.3c-58 79.2-123.4 152.6-195.1 219c-71.7 66.4-149.6 125.8-232.2 177.2c-82.7 51.4-170.1 94.7-260.7 129.1c-90.6 34.4-184.4 60-279.5 76.3C192.6 1495 96.1 1502 0 1500c96.1-2.1 191.8-13.3 285.4-33.6c93.6-20.2 185-49.5 272.5-87.2c87.6-37.7 171.3-83.8 249.6-137.3c78.4-53.5 151.5-114.5 217.9-181.7c66.5-67.2 126.4-140.7 178.6-218.9c52.3-78.3 96.9-161.4 133-247.9c36.1-86.5 63.8-176.2 82.6-267.6c18.8-91.4 28.6-184.4 29.6-277.4c0.3-27.6 23.2-48.7 50.8-48.4s49.5 21.8 49.2 49.5c0 0.7 0 1.3-0.1 2L1549.2 51.6z'/%3E%3Cg id='g'%3E%3Cuse href='%23s' transform='scale(0.12) rotate(60)'/%3E%3Cuse href='%23s' transform='scale(0.2) rotate(10)'/%3E%3Cuse href='%23s' transform='scale(0.25) rotate(40)'/%3E%3Cuse href='%23s' transform='scale(0.3) rotate(-20)'/%3E%3Cuse href='%23s' transform='scale(0.4) rotate(-30)'/%3E%3Cuse href='%23s' transform='scale(0.5) rotate(20)'/%3E%3Cuse href='%23s' transform='scale(0.6) rotate(60)'/%3E%3Cuse href='%23s' transform='scale(0.7) rotate(10)'/%3E%3Cuse href='%23s' transform='scale(0.835) rotate(-40)'/%3E%3Cuse href='%23s' transform='scale(0.9) rotate(40)'/%3E%3Cuse href='%23s' transform='scale(1.05) rotate(25)'/%3E%3Cuse href='%23s' transform='scale(1.2) rotate(8)'/%3E%3Cuse href='%23s' transform='scale(1.333) rotate(-60)'/%3E%3Cuse href='%23s' transform='scale(1.45) rotate(-30)'/%3E%3Cuse href='%23s' transform='scale(1.6) rotate(10)'/%3E%3C/g%3E%3C/defs%3E%3Cg transform='translate(860 0)'%3E%3Cg transform='translate(0 405)'%3E%3Ccircle fill='url(%23a)' r='3000'/%3E%3Cg opacity='0.5'%3E%3Ccircle fill='url(%23a)' r='2000'/%3E%3Ccircle fill='url(%23a)' r='1800'/%3E%3Ccircle fill='url(%23a)' r='1700'/%3E%3Ccircle fill='url(%23a)' r='1651'/%3E%3Ccircle fill='url(%23a)' r='1450'/%3E%3Ccircle fill='url(%23a)' r='1250'/%3E%3Ccircle fill='url(%23a)' r='1175'/%3E%3Ccircle fill='url(%23a)' r='900'/%3E%3Ccircle fill='url(%23a)' r='750'/%3E%3Ccircle fill='url(%23a)' r='500'/%3E%3Ccircle fill='url(%23a)' r='380'/%3E%3Ccircle fill='url(%23a)' r='250'/%3E%3C/g%3E%3Cg transform='rotate(-226.8 0 0)'%3E%3Cuse href='%23g' transform='rotate(10)'/%3E%3Cuse href='%23g' transform='rotate(120)'/%3E%3Cuse href='%23g' transform='rotate(240)'/%3E%3C/g%3E%3Ccircle fill='url(%23a)' r='3000'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='0' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2371feed'/%3E%3Cstop offset='1' stop-color='%2371feed' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='1200' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23abb2f9'/%3E%3Cstop offset='1' stop-color='%23abb2f9' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='600' cy='0' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%231fa0f6'/%3E%3Cstop offset='1' stop-color='%231fa0f6' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='600' cy='800' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23FFFFFF'/%3E%3Cstop offset='1' stop-color='%23FFFFFF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='e' cx='0' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2302DEC4'/%3E%3Cstop offset='1' stop-color='%2302DEC4' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f' cx='1200' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%235865F2'/%3E%3Cstop offset='1' stop-color='%235865F2' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' width='1200' height='800'/%3E%3Crect fill='url(%23c)' width='1200' height='800'/%3E%3Crect fill='url(%23d)' width='1200' height='800'/%3E%3Crect fill='url(%23e)' width='1200' height='800'/%3E%3Crect fill='url(%23f)' width='1200' height='800'/%3E%3C/svg%3E")`,
              backgroundAttachment: "fixed",
              backgroundSize: "cover",
              overflow: "auto",
              borderRadius: "20px",
            }}
          >
            {/* Filter Menu Button */}
            <Box sx={{ position: "absolute", top: 20, left: 20, zIndex: 10 }}>
              <FilterMenu
                onKeywordFilter={setFilterKeyword}
                onModalitiesFilter={setSelectedModalities}
                filterKeyword={filterKeyword}
                homeSelectedModalities={selectedModalities}
              />
            </Box>
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
        </Box>
        {/* <StatisticsBanner /> */}
      </Box>

      {/* Database Card Section */}
      {/* <Box
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
      </Box> */}

      <NodeInfoPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        nodeData={selectedNode}
      />
    </Container>
  );
};

export default Home;
