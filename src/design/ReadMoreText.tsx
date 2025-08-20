import { Colors } from "./theme";
import { Box, Typography, Button } from "@mui/material";
import React, { useState } from "react";

const ReadMoreText: React.FC<{ text: string }> = ({ text }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Box sx={{ position: "relative" }}>
      <Typography
        variant="body1"
        sx={{
          display: "-webkit-box",
          WebkitLineClamp: expanded ? "unset" : 3, // show only 3 lines
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {text}
      </Typography>

      <Button
        size="small"
        sx={{
          mt: 1,
          fontWeight: 600,
          textTransform: "uppercase",
          fontSize: "0.8rem",
          color: Colors.purple,
          "&:hover": {
            color: Colors.secondaryPurple,
            transform: "scale(1.05)",
          },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? "Read Less" : "Read More"}
      </Button>
    </Box>
  );
};

export default ReadMoreText;
