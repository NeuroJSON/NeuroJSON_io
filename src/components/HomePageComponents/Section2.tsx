import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowForwardOutlinedIcon from "@mui/icons-material/ArrowForwardOutlined";
import {
  Typography,
  Box,
  Button,
  CircularProgress,
  IconButton,
} from "@mui/material";
import FilterMenu from "components/NodesFilter/FilterMenu";
import { Colors } from "design/theme";
import NeuroJsonGraph from "modules/universe/NeuroJsonGraph";
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
    <Box // white background
      sx={{
        zIndex: "2",
        position: "relative",
        width: "100%",
        // backgroundColor: Colors.white,
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='0' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2371feed'/%3E%3Cstop offset='1' stop-color='%2371feed' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='1200' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23abb2f9'/%3E%3Cstop offset='1' stop-color='%23abb2f9' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='600' cy='0' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%231fa0f6'/%3E%3Cstop offset='1' stop-color='%231fa0f6' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='600' cy='800' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23FFFFFF'/%3E%3Cstop offset='1' stop-color='%23FFFFFF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='e' cx='0' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2302DEC4'/%3E%3Cstop offset='1' stop-color='%2302DEC4' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f' cx='1200' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%235865F2'/%3E%3Cstop offset='1' stop-color='%235865F2' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' width='1200' height='800'/%3E%3Crect fill='url(%23c)' width='1200' height='800'/%3E%3Crect fill='url(%23d)' width='1200' height='800'/%3E%3Crect fill='url(%23e)' width='1200' height='800'/%3E%3Crect fill='url(%23f)' width='1200' height='800'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        // overflow: "auto",
        padding: "1rem",
        // paddingLeft: "7rem",
        minHeight: "100vh",
      }}
    >
      <Box // tri-colors card
        sx={{
          zIndex: "3",
          position: "relative",
          width: "100%",
          background: "none",
          // backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='0' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2371feed'/%3E%3Cstop offset='1' stop-color='%2371feed' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='1200' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23abb2f9'/%3E%3Cstop offset='1' stop-color='%23abb2f9' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='600' cy='0' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%231fa0f6'/%3E%3Cstop offset='1' stop-color='%231fa0f6' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='600' cy='800' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23FFFFFF'/%3E%3Cstop offset='1' stop-color='%23FFFFFF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='e' cx='0' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2302DEC4'/%3E%3Cstop offset='1' stop-color='%2302DEC4' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f' cx='1200' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%235865F2'/%3E%3Cstop offset='1' stop-color='%235865F2' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' width='1200' height='800'/%3E%3Crect fill='url(%23c)' width='1200' height='800'/%3E%3Crect fill='url(%23d)' width='1200' height='800'/%3E%3Crect fill='url(%23e)' width='1200' height='800'/%3E%3Crect fill='url(%23f)' width='1200' height='800'/%3E%3C/svg%3E")`,
          // backgroundAttachment: "fixed",
          // backgroundSize: "cover",
          // overflow: "auto",
          // borderRadius: "20px",
        }}
      >
        {/* Filter Menu Button */}
        <Box sx={{ position: "absolute", top: 20, left: 20, zIndex: 100 }}>
          <FilterMenu
            onKeywordFilter={setFilterKeyword}
            onModalitiesFilter={setSelectedModalities}
            filterKeyword={filterKeyword}
            homeSelectedModalities={selectedModalities}
          />
        </Box>

        {/* title, text and buttons */}
        <Box
          sx={{
            position: { xs: "relative", md: "absolute" },
            top: { md: 80 },
            left: { md: 20 },
            padding: { xs: "80px 20px 0", md: 0 },
          }}
        >
          {/* title and text */}
          <Box
            sx={{
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
                width: "30%",
                display: { xs: "none", sm: "none", md: "none", lg: "block" },
              }}
            >
              Dive into our interactive 3D graph to explore neuroimaging
              databases. Visualize meaningful connections, filter by modality,
              and access rich metadata instantly.
            </Typography>
          </Box>

          {/* top buttons: show only on large screens */}
          <Box
            sx={{
              display: { xs: "flex", md: "flex", lg: "flex" },
              flexDirection: "column",
              width: { xs: "100%", sm: "50%", md: "30%", lg: "15%" },
              maxWidth: "200px",
              mb: 2,
              position: { xs: "relative", md: "absolute" },
              zIndex: 10, // Higher than text and graph
            }}
          >
            <Button
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
          </Box>
        </Box>

        {/* 3d-graph */}
        <Box
          sx={{
            minHeight: "400px",
            marginLeft: 15,
          }}
        >
          {!registry ? (
            <Box sx={{ display: "flex", justifyContent: "center", mt: 4 }}>
              <CircularProgress sx={{ color: Colors.primary.main }} />
            </Box>
          ) : filteredRegistry.length > 0 ? (
            <NeuroJsonGraph
              registry={filteredRegistry}
              onNodeClick={onNodeClick}
            />
          ) : (
            <Box sx={{ textAlign: "center", mt: 25, ml: 30 }}>
              <Typography variant="h6" color={Colors.darkPurple}>
                No matching nodes found
              </Typography>
            </Box>
          )}
        </Box>

        {/* Bottom Buttons - Show only on smaller screens */}
        {/* <Box
          sx={{
            display: { xs: "flex", md: "flex", lg: "none" },
            justifyContent: "center",
            flexDirection: "column",
            alignItems: "center",
            padding: "20px 0",
            width: "100%",
          }}
        >
          <Button
            variant="outlined"
            sx={{
              color: Colors.lightGray,
              borderColor: Colors.lightGray,
              transition: "all 0.3s ease",
              width: "200px",
              "&:hover": {
                transform: "scale(1.05)",
                borderColor: Colors.lightGray,
              },
            }}
            onClick={() => navigate("/databases")}
          >
            View All Databases
          </Button>
        </Box> */}
      </Box>

      {/* Scroll Arrow - fixed inside Section2 */}
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
          <ArrowDownwardIcon sx={{ fontSize: 40, color: Colors.darkPurple }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Section2;
