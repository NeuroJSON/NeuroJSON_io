import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Box, Button, IconButton } from "@mui/material";
import { Colors } from "design/theme";
import ForceGraphModal from "modules/universe/ForceGraphModal";
import { NodeObject } from "modules/universe/NeuroJsonGraph";
import React from "react";
import { useNavigate } from "react-router-dom";

interface Section2Props {
  registry: any[] | null;
  filteredRegistry: any[];
  filterKeyword: string;
  selectedModalities: string[];
  setFilterKeyword: (keyword: string) => void;
  setSelectedModalities: (modalities: string[]) => void;
  onNodeClick: (node: NodeObject) => void;
  scrollToNext: () => void;
}

const Section2: React.FC<Section2Props> = ({
  registry,
  filteredRegistry,
  filterKeyword,
  selectedModalities,
  setFilterKeyword,
  setSelectedModalities,
  onNodeClick,
  scrollToNext,
}) => {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        zIndex: "2",
        position: "relative",
        width: "100%",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='0' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2371feed'/%3E%3Cstop offset='1' stop-color='%2371feed' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='1200' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23abb2f9'/%3E%3Cstop offset='1' stop-color='%23abb2f9' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='600' cy='0' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%231fa0f6'/%3E%3Cstop offset='1' stop-color='%231fa0f6' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='600' cy='800' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23FFFFFF'/%3E%3Cstop offset='1' stop-color='%23FFFFFF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='e' cx='0' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2302DEC4'/%3E%3Cstop offset='1' stop-color='%2302DEC4' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f' cx='1200' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%235865F2'/%3E%3Cstop offset='1' stop-color='%235865F2' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' width='1200' height='800'/%3E%3Crect fill='url(%23c)' width='1200' height='800'/%3E%3Crect fill='url(%23d)' width='1200' height='800'/%3E%3Crect fill='url(%23e)' width='1200' height='800'/%3E%3Crect fill='url(%23f)' width='1200' height='800'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        minHeight: "100vh",
        display: "flex",
        flexDirection: { xs: "column", md: "row-reverse" },
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        px: { xs: 2, md: 6 },
        py: { xs: 12, md: 12 },
        mt: { xs: 2, md: 8 },
      }}
    >
      {/* title, text and buttons */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: { xs: "center", md: "left" },
          gap: 4,
          mt: { xs: 4, md: 4 },
          px: 2,
        }}
      >
        {/* title and text */}
        <Box
          sx={{
            flex: 1,
            maxWidth: "600px",
            textAlign: { xs: "center", md: "left" },
            alignItems: { xs: "center", md: "flex-start" },
            display: "flex",
            flexDirection: "column",
            gap: 3,
          }}
        >
          <Typography
            variant="h3"
            sx={{
              color: Colors.lightGray,
              fontWeight: "bold",
            }}
          >
            Discover and Explore
          </Typography>
          <Typography
            variant="h6"
            sx={{
              color: Colors.lightGray,
              width: "100%",
              display: { xs: "none", sm: "block", md: "block", lg: "block" },
            }}
          >
            Dive into our interactive 3D graph to explore neuroimaging
            databases. Visualize meaningful connections, filter by modality, and
            access rich metadata instantly.
          </Typography>
        </Box>

        {/* buttons */}
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            width: { xs: "100%", sm: "50%", md: "30%", lg: "100%" },
            maxWidth: "200px",
            mb: 2,
            alignItems: "stretch",
          }}
        >
          <Button
            fullWidth
            variant="outlined"
            sx={{
              color: Colors.lightGray,
              borderColor: Colors.lightGray,
              transition: "all 0.3s ease",
              marginTop: 4,
              "&:hover": {
                transform: "scale(1.05)",
                borderColor: Colors.lightGray,
              },
            }}
            onClick={() => navigate("/databases")}
          >
            View All Databases
          </Button>

          <ForceGraphModal
            registry={registry}
            filteredRegistry={filteredRegistry}
            filterKeyword={filterKeyword}
            selectedModalities={selectedModalities}
            setFilterKeyword={setFilterKeyword}
            setSelectedModalities={setSelectedModalities}
            onNodeClick={onNodeClick}
          />
        </Box>
      </Box>

      <Box
        sx={{
          flex: 1,
          maxWidth: "600px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mt: { xs: 4, md: 0 },
          mb: { xs: 8, md: 0 },
        }}
      >
        <img
          src={`${process.env.PUBLIC_URL}/img/static_nodes.png`}
          alt="3d_graph"
          width="100%"
          height="auto"
        ></img>
      </Box>

      {/* Scroll Arrow */}
      <Box
        sx={{
          position: "absolute",
          bottom: "1rem",
          left: 0,
          right: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingBottom: "2rem",
          mt: 4,
          zIndex: 1000,
        }}
      >
        <IconButton onClick={scrollToNext}>
          <ExpandMoreIcon sx={{ fontSize: 40, color: Colors.darkPurple }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Section2;
