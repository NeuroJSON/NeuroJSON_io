import React from "react";
import { Box, Typography, Button } from "@mui/material";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <Box sx={{ padding: 4 }}>
      {/* Header Section */}
      <Typography variant="h3" gutterBottom>
        Welcome to NeuroJSON IO
      </Typography>
      <Typography variant="body1">
        Manage and explore your CouchDB databases and datasets effortlessly.
      </Typography>

      {/* Navigation to Database Page */}
      <Box mt={4}>
        <Button variant="contained" color="primary" component={Link} to="/databases">
          View Databases
        </Button>
      </Box>
    </Box>
  );
};

export default Home;
