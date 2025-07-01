import { Box, Typography } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

const AboutPage: React.FC = () => {
  return (
    <Box>
      <Typography sx={{ color: Colors.green }}>about page</Typography>
    </Box>
  );
};

export default AboutPage;
