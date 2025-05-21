import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import SearchIcon from "@mui/icons-material/Search";
import {
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  IconButton,
} from "@mui/material";
import StatisticsBanner from "components/StatisticsBanner";
import { Colors } from "design/theme";
import pako from "pako";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

interface Section1Props {
  scrollToNext: () => void;
}

const Section1: React.FC<Section1Props> = ({ scrollToNext }) => {
  const [keyword, setKeyword] = useState("");
  const navigate = useNavigate();

  const handleSearch = () => {
    if (!keyword.trim()) return;

    const queryData = { keyword };
    const deflated = pako.deflate(JSON.stringify(queryData));
    const encoded = btoa(String.fromCharCode(...deflated));

    navigate(`/search#query=${encoded}`);
  };

  return (
    <Box
      sx={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 1500'%3E%3Cdefs%3E%3CradialGradient id='a' gradientUnits='objectBoundingBox'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='1' stop-color='%235865F2'/%3E%3C/radialGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='0' y1='750' x2='1550' y2='750'%3E%3Cstop offset='0' stop-color='%232c3379'/%3E%3Cstop offset='1' stop-color='%235865F2'/%3E%3C/linearGradient%3E%3Cpath id='s' fill='url(%23b)' d='M1549.2 51.6c-5.4 99.1-20.2 197.6-44.2 293.6c-24.1 96-57.4 189.4-99.3 278.6c-41.9 89.2-92.4 174.1-150.3 253.3c-58 79.2-123.4 152.6-195.1 219c-71.7 66.4-149.6 125.8-232.2 177.2c-82.7 51.4-170.1 94.7-260.7 129.1c-90.6 34.4-184.4 60-279.5 76.3C192.6 1495 96.1 1502 0 1500c96.1-2.1 191.8-13.3 285.4-33.6c93.6-20.2 185-49.5 272.5-87.2c87.6-37.7 171.3-83.8 249.6-137.3c78.4-53.5 151.5-114.5 217.9-181.7c66.5-67.2 126.4-140.7 178.6-218.9c52.3-78.3 96.9-161.4 133-247.9c36.1-86.5 63.8-176.2 82.6-267.6c18.8-91.4 28.6-184.4 29.6-277.4c0.3-27.6 23.2-48.7 50.8-48.4s49.5 21.8 49.2 49.5c0 0.7 0 1.3-0.1 2L1549.2 51.6z'/%3E%3Cg id='g'%3E%3Cuse href='%23s' transform='scale(0.12) rotate(60)'/%3E%3Cuse href='%23s' transform='scale(0.2) rotate(10)'/%3E%3Cuse href='%23s' transform='scale(0.25) rotate(40)'/%3E%3Cuse href='%23s' transform='scale(0.3) rotate(-20)'/%3E%3Cuse href='%23s' transform='scale(0.4) rotate(-30)'/%3E%3Cuse href='%23s' transform='scale(0.5) rotate(20)'/%3E%3Cuse href='%23s' transform='scale(0.6) rotate(60)'/%3E%3Cuse href='%23s' transform='scale(0.7) rotate(10)'/%3E%3Cuse href='%23s' transform='scale(0.835) rotate(-40)'/%3E%3Cuse href='%23s' transform='scale(0.9) rotate(40)'/%3E%3Cuse href='%23s' transform='scale(1.05) rotate(25)'/%3E%3Cuse href='%23s' transform='scale(1.2) rotate(8)'/%3E%3Cuse href='%23s' transform='scale(1.333) rotate(-60)'/%3E%3Cuse href='%23s' transform='scale(1.45) rotate(-30)'/%3E%3Cuse href='%23s' transform='scale(1.6) rotate(10)'/%3E%3C/g%3E%3C/defs%3E%3Cg transform='translate(400 0)'%3E%3Cg %3E%3Ccircle fill='url(%23a)' r='3000'/%3E%3Cg opacity='0.5'%3E%3Ccircle fill='url(%23a)' r='2000'/%3E%3Ccircle fill='url(%23a)' r='1800'/%3E%3Ccircle fill='url(%23a)' r='1700'/%3E%3Ccircle fill='url(%23a)' r='1651'/%3E%3Ccircle fill='url(%23a)' r='1450'/%3E%3Ccircle fill='url(%23a)' r='1250'/%3E%3Ccircle fill='url(%23a)' r='1175'/%3E%3Ccircle fill='url(%23a)' r='900'/%3E%3Ccircle fill='url(%23a)' r='750'/%3E%3Ccircle fill='url(%23a)' r='500'/%3E%3Ccircle fill='url(%23a)' r='380'/%3E%3Ccircle fill='url(%23a)' r='250'/%3E%3C/g%3E%3Cg transform='rotate(-273.6 0 0)'%3E%3Cuse href='%23g' transform='rotate(10)'/%3E%3Cuse href='%23g' transform='rotate(120)'/%3E%3Cuse href='%23g' transform='rotate(240)'/%3E%3C/g%3E%3Ccircle fill-opacity='0.79' fill='url(%23a)' r='3000'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        overflow: "auto",
        width: "100%",
        minHeight: "calc(90vh - 6rem)",
      }}
    >
      <Grid
        container
        direction="column"
        alignItems="center"
        justifyContent="center"
        spacing={4}
        sx={{ mt: "3rem", width: "100%" }}
      >
        {/* first row: logo and text */}
        <Grid
          item
          sx={{
            width: { xs: "80%", sm: "80%", md: "60%", lg: "60%" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
            }}
          >
            <Box
              component="img"
              // src={`${process.env.PUBLIC_URL}/img/3d_graph_logo.png`}
              src={`${process.env.PUBLIC_URL}/img/section1_logo_colored.png`}
              // src={`${process.env.PUBLIC_URL}/img/section1_logo_contained.png`}
              alt="logo"
              height="auto"
              sx={{
                height: "150px",
                width: "auto",
                display: {
                  xs: "none",
                  sm: "none",
                  md: "block",
                },
              }}
            ></Box>
            <Typography
              variant="h4"
              sx={{
                color: Colors.lightGray,
                fontWeight: "bold",
                height: "auto",
                display: {
                  xs: "none",
                  sm: "none",
                  md: "block",
                },
              }}
            >
              Efficiently manage and explore your databases and datasets with
              ease.
            </Typography>
          </Box>
        </Grid>

        {/* search row */}
        <Grid
          item
          sx={{ width: { xs: "80%", sm: "80%", md: "60%", lg: "60%" } }}
        >
          <Box sx={{ display: "flex", gap: 2 }}>
            <TextField
              fullWidth
              label="Search by keyword"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
              sx={{
                backgroundColor: Colors.white,
                borderRadius: "8px",
                "& .MuiInputLabel-root": {
                  color: "gray", // label text color
                },
                "& .MuiInputBase-input": {
                  color: Colors.purple, // text inside the input
                },
                "& label.Mui-focused": {
                  color: Colors.darkGreen, // label color when focused
                  fontWeight: "bold",
                  padding: "5px",
                  borderRadius: "5px",
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "none", // default border color
                  },
                  "&:hover fieldset": {
                    // borderColor: Colors.pink, // hover border color
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: Colors.darkGreen, // border when focused
                  },
                },
              }}
            />
            <Button
              onClick={handleSearch}
              sx={{
                color: Colors.white,
                backgroundColor: Colors.purple,
                "&:hover": {
                  backgroundColor: Colors.purple,
                  transform: "scale(1.05)",
                },
              }}
            >
              <SearchIcon />
            </Button>
          </Box>
        </Grid>

        {/* statistics banner row*/}
        <Grid
          item
          sx={{
            width: "80%",
            mb: { xs: 10, sm: 10, md: 14, lg: 14 },
          }}
        >
          <StatisticsBanner />
        </Grid>
      </Grid>

      {/* Scroll Arrow */}
      <Box
        sx={{
          mb: 2,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <IconButton onClick={scrollToNext}>
          <ExpandMoreIcon sx={{ fontSize: 40, color: Colors.lightGray }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Section1;
