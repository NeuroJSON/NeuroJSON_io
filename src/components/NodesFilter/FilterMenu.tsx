import KeywordFilter from "./KeywordFilter";
import ModalitiesFilter from "./ModalitiesFilter";
import FilterListIcon from "@mui/icons-material/FilterList";
import {
  IconButton,
  Menu,
  MenuItem,
  Box,
  Typography,
  Divider,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useState, useEffect } from "react";

interface FilterMenuProps {
  onKeywordFilter: (query: string) => void;
  onModalitiesFilter: (selectedModalities: string[]) => void;
  filterKeyword: string; // receive from parent
  homeSelectedModalities: string[]; // receive from parent
}

const FilterMenu: React.FC<FilterMenuProps> = ({
  onKeywordFilter,
  onModalitiesFilter,
  filterKeyword, //receive from home parent
  homeSelectedModalities, // receive from parent
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  //   const [filterType, setFilterType] = useState<string | null>(null);
  const [menuKey, setMenuKey] = useState(0); // Forces re-render

  useEffect(() => {
    const handleResize = () => {
      setMenuKey((prevKey) => prevKey + 1);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Handle menu open and close
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    // setFilterType(null); //reset menu state when closing
  };

  return (
    <Box>
      {/* Filter Icon Button */}
      <IconButton onClick={handleClick}>
        <FilterListIcon sx={{ color: Colors.lightGray }} />
        <Typography sx={{ color: Colors.lightGray, fontWeight: "bold" }}>
          Databases Filter
        </Typography>
      </IconButton>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        // sx={{ padding: "10px" }}
        disablePortal // Ensures positioning inside the DOM
        sx={{
          transition: "transform 0.3s ease, opacity 0.3s ease",
          transformOrigin: "top right",
        }}
      >
        {/* unified panel version */}
        <Box sx={{ minWidth: 300, padding: "10px" }}>
          {/* Keyword Filter */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              //   position: "relative",
              gap: "2px",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              Filter by Keyword
            </Typography>
            <KeywordFilter
              onFilter={onKeywordFilter}
              filterKeyword={filterKeyword}
            />
          </Box>

          <Divider sx={{ marginY: 2 }} />

          {/* Modalities Filter */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              position: "relative",
              gap: "2px",
            }}
          >
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              Filter by Modalities
            </Typography>
            <ModalitiesFilter
              onFilter={onModalitiesFilter}
              homeSeletedModalities={homeSelectedModalities}
            />
          </Box>
        </Box>

        {/* split panel version*/}
        {/* <Box sx={{ display: "flex", minWidth: 400, padding: "10px" }}>
          Left Side - Filter Options
          <Box sx={{ width: "40%", paddingRight: "10px" }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              Filter Options
            </Typography>
            <Divider sx={{ marginY: 1 }} />
            <MenuItem
              onClick={() => setFilterType("keyword")}
              selected={filterType === "keyword"}
            >
              Filter by Keyword
            </MenuItem>
            <MenuItem
              onClick={() => setFilterType("modalities")}
              selected={filterType === "modalities"}
            >
              Filter by Modalities
            </MenuItem>
          </Box>
          Right Side - Dynamic Filter Panel
          <Box sx={{ width: "60%", paddingLeft: "10px" }}>
            {filterType === "keyword" && (
              <KeywordFilter onFilter={onKeywordFilter} />
            )}
            {filterType === "modalities" && (
              <ModalitiesFilter onFilter={onModalitiesFilter} />
            )}
            {!filterType && (
              <Typography variant="body2" sx={{ color: Colors.textSecondary }}>
                Select a filter option on the left.
              </Typography>
            )}
          </Box>
        </Box> */}
      </Menu>
    </Box>
  );
};

export default FilterMenu;
