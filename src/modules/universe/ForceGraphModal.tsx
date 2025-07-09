import NeuroJsonGraph from "./NeuroJsonGraph";
import { NodeObject } from "./NeuroJsonGraph";
import CloseIcon from "@mui/icons-material/Close";
import {
  Modal,
  Box,
  IconButton,
  Button,
  Typography,
  CircularProgress,
} from "@mui/material";
import FilterMenu from "components/NodesFilter/FilterMenu";
import { Colors } from "design/theme";
import React, { useState } from "react";

interface ForceGraphModalProps {
  registry: any[] | null;
  filteredRegistry: any[];
  filterKeyword: string;
  selectedModalities: string[];
  setFilterKeyword: (keyword: string) => void;
  setSelectedModalities: (modalities: string[]) => void;
  onNodeClick: (node: NodeObject) => void;
}

const ForceGraphModal: React.FC<ForceGraphModalProps> = ({
  registry,
  filteredRegistry,
  filterKeyword,
  selectedModalities,
  setFilterKeyword,
  setSelectedModalities,
  onNodeClick,
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        fullWidth
        variant="outlined"
        onClick={() => setOpen(true)}
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
      >
        Launch Graph Viewer
      </Button>
      <Modal open={open} onClose={() => setOpen(false)}>
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='0' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2371feed'/%3E%3Cstop offset='1' stop-color='%2371feed' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='1200' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23abb2f9'/%3E%3Cstop offset='1' stop-color='%23abb2f9' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='600' cy='0' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%231fa0f6'/%3E%3Cstop offset='1' stop-color='%231fa0f6' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='600' cy='800' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23FFFFFF'/%3E%3Cstop offset='1' stop-color='%23FFFFFF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='e' cx='0' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2302DEC4'/%3E%3Cstop offset='1' stop-color='%2302DEC4' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f' cx='1200' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%235865F2'/%3E%3Cstop offset='1' stop-color='%235865F2' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' width='1200' height='800'/%3E%3Crect fill='url(%23c)' width='1200' height='800'/%3E%3Crect fill='url(%23d)' width='1200' height='800'/%3E%3Crect fill='url(%23e)' width='1200' height='800'/%3E%3Crect fill='url(%23f)' width='1200' height='800'/%3E%3C/svg%3E")`,
            backgroundAttachment: "fixed",
            backgroundSize: "cover",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          }}
        >
          <IconButton
            onClick={() => setOpen(false)}
            sx={{
              position: "absolute",
              top: 20,
              right: 20,
              color: "white",
              zIndex: 9999,
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Filter Menu Button */}
          <Box sx={{ position: "absolute", top: 20, left: 20, zIndex: 100 }}>
            <FilterMenu
              onKeywordFilter={setFilterKeyword}
              onModalitiesFilter={setSelectedModalities}
              filterKeyword={filterKeyword}
              homeSelectedModalities={selectedModalities}
            />
          </Box>

          {/* 3D graph */}
          <Box
            sx={{
              flex: 1,
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              <Box sx={{ textAlign: "center", ml: 30 }}>
                <Typography variant="h6" color={Colors.darkPurple}>
                  No matching nodes found
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Modal>
    </>
  );
};

export default ForceGraphModal;
