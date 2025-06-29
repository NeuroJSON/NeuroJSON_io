import ArrowCircleDownIcon from "@mui/icons-material/ArrowCircleDown";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { Typography, Box, IconButton, Dialog } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { useState } from "react";

interface Section3Props {
  scrollToNext: () => void;
}

const Section3: React.FC<Section3Props> = ({ scrollToNext }) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  return (
    <Box
      sx={{
        zIndex: "2",
        position: "relative",
        width: "100%",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 2000 1500'%3E%3Cdefs%3E%3CradialGradient id='a' gradientUnits='objectBoundingBox'%3E%3Cstop offset='0' stop-color='%23000000'/%3E%3Cstop offset='1' stop-color='%235865F2'/%3E%3C/radialGradient%3E%3ClinearGradient id='b' gradientUnits='userSpaceOnUse' x1='0' y1='750' x2='1550' y2='750'%3E%3Cstop offset='0' stop-color='%232c3379'/%3E%3Cstop offset='1' stop-color='%235865F2'/%3E%3C/linearGradient%3E%3Cpath id='s' fill='url(%23b)' d='M1549.2 51.6c-5.4 99.1-20.2 197.6-44.2 293.6c-24.1 96-57.4 189.4-99.3 278.6c-41.9 89.2-92.4 174.1-150.3 253.3c-58 79.2-123.4 152.6-195.1 219c-71.7 66.4-149.6 125.8-232.2 177.2c-82.7 51.4-170.1 94.7-260.7 129.1c-90.6 34.4-184.4 60-279.5 76.3C192.6 1495 96.1 1502 0 1500c96.1-2.1 191.8-13.3 285.4-33.6c93.6-20.2 185-49.5 272.5-87.2c87.6-37.7 171.3-83.8 249.6-137.3c78.4-53.5 151.5-114.5 217.9-181.7c66.5-67.2 126.4-140.7 178.6-218.9c52.3-78.3 96.9-161.4 133-247.9c36.1-86.5 63.8-176.2 82.6-267.6c18.8-91.4 28.6-184.4 29.6-277.4c0.3-27.6 23.2-48.7 50.8-48.4s49.5 21.8 49.2 49.5c0 0.7 0 1.3-0.1 2L1549.2 51.6z'/%3E%3Cg id='g'%3E%3Cuse href='%23s' transform='scale(0.12) rotate(60)'/%3E%3Cuse href='%23s' transform='scale(0.2) rotate(10)'/%3E%3Cuse href='%23s' transform='scale(0.25) rotate(40)'/%3E%3Cuse href='%23s' transform='scale(0.3) rotate(-20)'/%3E%3Cuse href='%23s' transform='scale(0.4) rotate(-30)'/%3E%3Cuse href='%23s' transform='scale(0.5) rotate(20)'/%3E%3Cuse href='%23s' transform='scale(0.6) rotate(60)'/%3E%3Cuse href='%23s' transform='scale(0.7) rotate(10)'/%3E%3Cuse href='%23s' transform='scale(0.835) rotate(-40)'/%3E%3Cuse href='%23s' transform='scale(0.9) rotate(40)'/%3E%3Cuse href='%23s' transform='scale(1.05) rotate(25)'/%3E%3Cuse href='%23s' transform='scale(1.2) rotate(8)'/%3E%3Cuse href='%23s' transform='scale(1.333) rotate(-60)'/%3E%3Cuse href='%23s' transform='scale(1.45) rotate(-30)'/%3E%3Cuse href='%23s' transform='scale(1.6) rotate(10)'/%3E%3C/g%3E%3C/defs%3E%3Cg transform='translate(100 0)'%3E%3Cg transform='translate(0 210)'%3E%3Ccircle fill='url(%23a)' r='3000'/%3E%3Cg opacity='0.5'%3E%3Ccircle fill='url(%23a)' r='2000'/%3E%3Ccircle fill='url(%23a)' r='1800'/%3E%3Ccircle fill='url(%23a)' r='1700'/%3E%3Ccircle fill='url(%23a)' r='1651'/%3E%3Ccircle fill='url(%23a)' r='1450'/%3E%3Ccircle fill='url(%23a)' r='1250'/%3E%3Ccircle fill='url(%23a)' r='1175'/%3E%3Ccircle fill='url(%23a)' r='900'/%3E%3Ccircle fill='url(%23a)' r='750'/%3E%3Ccircle fill='url(%23a)' r='500'/%3E%3Ccircle fill='url(%23a)' r='380'/%3E%3Ccircle fill='url(%23a)' r='250'/%3E%3C/g%3E%3Cg transform='rotate(-176.4 0 0)'%3E%3Cuse href='%23g' transform='rotate(10)'/%3E%3Cuse href='%23g' transform='rotate(120)'/%3E%3Cuse href='%23g' transform='rotate(240)'/%3E%3C/g%3E%3Ccircle fill='url(%23a)' r='3000'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        minHeight: "100vh",
        display: "flex",
        flexDirection: { xs: "column", md: "row-reverse" },
        alignItems: "center",
        justifyContent: "center",
        gap: { xs: 5, md: 15 },
        px: { xs: 2, md: 6 },
        py: { xs: 12, md: 12 },
      }}
    >
      {/* title and text */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "600px",
          alignItems: "center",
          textAlign: { xs: "center", md: "left" },
          gap: 4,
          mt: { xs: 4, md: 4 },
          px: 2,
        }}
      >
        <Typography
          variant="h3"
          sx={{
            fontWeight: "bold",
            color: Colors.lightGray,
          }}
        >
          Visualize data via our preview tools
        </Typography>
        <Typography
          variant="h6"
          sx={{
            color: Colors.lightGray,
            width: "100%",
            display: { xs: "none", sm: "block", md: "block", lg: "block" },
          }}
        >
          Preview and explore neuroimaging data with interactive visualization
          tools directly in NeuroJSON.io. Adjust display modes, customize
          colormaps, slice across dimensions, and interactively rotate and zoom
          models.
        </Typography>
      </Box>

      <Box
        sx={{
          flex: 1,
          maxWidth: "600px",
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mt: { xs: 4, md: 2 },
          mb: { xs: 8, md: 0 },
          cursor: "pointer",
        }}
        onClick={handleOpen}
      >
        <img
          src={`${process.env.PUBLIC_URL}/img/3cards_vertical.png`}
          alt="rendering feature info cards"
          style={{
            width: "100%",
            height: "auto",
          }}
        ></img>
      </Box>

      {/* video dialog */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <Box sx={{ p: 4, position: "relative" }}>
          {/* close button in top-right */}
          <IconButton
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 2,
              right: 2,
              zIndex: 10,
            }}
          >
            <CloseIcon />
          </IconButton>

          <video controls style={{ width: "100%", borderRadius: "4px" }}>
            <source
              src="https://neurojson.org/tutorials/overview/neurojsonio_volume_render_short.mp4"
              type="video/mp4"
            />
            Your browser does not support the video tag.
          </video>
        </Box>
      </Dialog>

      {/* Scroll Arrow to Section4 */}
      <Box
        sx={{
          position: "absolute",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: "2rem",
          zIndex: 1000,
          bottom: "1rem",
          left: 0,
          right: 0,
          width: "100%",
          paddingBottom: "2rem",
          mb: 3,
        }}
      >
        <IconButton onClick={scrollToNext}>
          <ArrowCircleDownIcon sx={{ fontSize: 40, color: Colors.lightGray }} />
        </IconButton>
      </Box>
    </Box>
  );
};

export default Section3;
