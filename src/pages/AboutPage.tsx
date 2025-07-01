import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Box, Typography, Container, Button } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

const AboutPage: React.FC = () => {
  return (
    <Box>
      <Box
        sx={{
          backgroundColor: Colors.white,
          padding: 3,
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            textAlign: "center",
            mt: 3,
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: Colors.darkPurple,
              mb: 2,
            }}
          >
            What is NeuroJSON?
          </Typography>
          <Typography
            variant="body1"
            paragraph
            sx={{
              fontSize: "1.2rem",
              color: Colors.darkPurple,
            }}
          >
            NeuroJSON aims to develop JSON-based neuroimaging data exchange
            formats that are readable, searchable, shareable, can be readily
            validated and served in the web and cloud.
          </Typography>

          <Box
            sx={{
              mt: 4,
              boxShadow: 3,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <video
              controls
              width="100%"
              style={{ maxHeight: "500px", objectFit: "cover" }}
            >
              <source src="/video/tiger.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "flex-end",
              mt: 2,
            }}
          >
            <Button
              variant="outlined"
              href="https://neurojson.org/wiki/index.cgi?wiki#code"
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                color: Colors.purple,
                borderColor: Colors.purple,
                fontSize: "small",
                mt: 2,
                "&:hover": {
                  transform: "scale(1.05)",
                  borderColor: Colors.purple,
                },
              }}
            >
              Learn more about NeuroJSON
              <KeyboardArrowRightIcon />
            </Button>
          </Box>
        </Container>
      </Box>
      <Box
        sx={{
          backgroundColor: Colors.darkPurple,
          paddingTop: 5,
          paddingBottom: 10,
        }}
      >
        <Container
          maxWidth="md"
          sx={{
            textAlign: "center",
          }}
        >
          <Typography
            variant="h4"
            sx={{
              fontWeight: "bold",
              color: Colors.lightGray,
            }}
          >
            Getting Started with NeuroJSON
          </Typography>
          <Box
            sx={{
              mt: 4,
              boxShadow: 3,
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <video
              controls
              width="100%"
              style={{ maxHeight: "500px", objectFit: "cover" }}
            >
              <source src="/video/tiger.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AboutPage;
