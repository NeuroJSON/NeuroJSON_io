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
  filterKeyword: string;
  homeSelectedModalities: string[];
}

const FilterMenu: React.FC<FilterMenuProps> = ({
  onKeywordFilter,
  onModalitiesFilter,
  filterKeyword,
  homeSelectedModalities,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
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
  };

  return (
    <Box>
      {/* Filter Icon Button */}
      <IconButton
        onClick={handleClick}
        sx={{
          color: Colors.green,
          backgroundColor: Colors.lightGray,
          transition: "all 0.3s ease",
          "&:hover": {
            backgroundColor: Colors.lightGray,
            transform: "scale(1.05)",
          },
        }}
      >
        <FilterListIcon />
      </IconButton>

      {/* Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        disablePortal // Ensures positioning inside the DOM
        sx={{
          transition: "transform 0.3s ease, opacity 0.3s ease",
          transformOrigin: "top right",
          "& .MuiPaper-root": {
            backgroundColor: Colors.white,
            backdropFilter: "blur(15px)",
          },
        }}
      >
        {/* unified panel */}
        <Box
          sx={{
            minWidth: 300,
            padding: "10px",
          }}
        >
          <Typography
            sx={{
              fontSize: "x-large",
              fontWeight: "bold",
              color: Colors.orange,
            }}
          >
            Databases Filter
          </Typography>

          <Divider
            sx={{
              marginY: 2,
            }}
          />

          {/* Keyword Filter */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ color: Colors.darkGreen, fontWeight: "bold" }}
            >
              Filter by Keyword
            </Typography>
            <KeywordFilter
              onFilter={onKeywordFilter}
              filterKeyword={filterKeyword}
            />
          </Box>

          <Divider
            sx={{
              marginY: 2,
            }}
          />

          {/* Modalities Filter */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
            }}
          >
            <Typography
              variant="subtitle1"
              sx={{ color: Colors.darkGreen, fontWeight: "bold" }}
            >
              Filter by Modalities
            </Typography>
            <ModalitiesFilter
              onFilter={onModalitiesFilter}
              homeSeletedModalities={homeSelectedModalities}
            />
          </Box>
        </Box>
      </Menu>
    </Box>
  );
};

export default FilterMenu;
