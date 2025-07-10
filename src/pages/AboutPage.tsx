import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import { Box, Typography, Container, Button, Grid } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";

const icons = [
  { src: "search.png", alt: "search icon" },
  { src: "preview.png", alt: "preview icon" },
  { src: "download.png", alt: "download icon" },
  { src: "api.png", alt: "api icon" },
];

const AboutPage: React.FC = () => {
  return (
    <Box
    // sx={{
    //   position: "relative",
    // }}
    >
      {/*section 1 */}
      <Box
        sx={{
          padding: 3,
          paddingBottom: 10,
          position: "relative",
        }}
      >
        <Container maxWidth="lg">
          <Grid container spacing={4} alignItems="center">
            {/* Left: Text Content */}
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                <Typography
                  variant="h4"
                  sx={{
                    color: Colors.lightGray,
                    fontWeight: "bold",
                    mb: 2,
                  }}
                >
                  About NeuroJSON.io
                </Typography>
                <Typography
                  variant="body1"
                  paragraph
                  sx={{
                    fontSize: "1.2rem",
                    color: Colors.lightGray,
                  }}
                >
                  NeuroJSON aims to develop JSON-based neuroimaging data
                  exchange formats that are readable, searchable, shareable, can
                  be readily validated and served in the web and cloud.
                </Typography>
                <Box>
                  <Button
                    variant="outlined"
                    href="https://neurojson.org/wiki/index.cgi?wiki#code"
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      color: Colors.white,
                      borderColor: Colors.white,
                      fontSize: "small",
                      transition: "all 0.3s ease",
                      mt: 2,
                      "&:hover": {
                        transform: "scale(1.05)",
                        borderColor: Colors.white,
                      },
                    }}
                  >
                    Learn more about NeuroJSON
                    <KeyboardArrowRightIcon />
                  </Button>
                </Box>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box
                sx={{
                  mt: 4,
                  boxShadow: 3,
                  borderRadius: 2,
                  overflow: "hidden",
                  backgroundColor: Colors.lightGray,
                  padding: 0.5,
                }}
              >
                <video
                  controls
                  width="100%"
                  style={{ maxHeight: "500px", objectFit: "cover" }}
                >
                  <source
                    src={`${process.env.PUBLIC_URL}/video/introduction_video.mp4`}
                    type="video/mp4"
                  />
                  Your browser does not support the video tag.
                </video>
              </Box>
            </Grid>
          </Grid>
        </Container>
        {/* icons */}
        <Box
          sx={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            display: "flex",
            flexDirection: "row",
            gap: 4,
            justifyContent: "center",
          }}
        >
          {icons.map(({ src, alt }) => (
            <Box
              key={src}
              component="img"
              src={`${process.env.PUBLIC_URL}/img/about_page/${src}`}
              alt={alt}
              sx={{
                width: {
                  xs: "25%",
                  sm: "25%",
                  md: "15%",
                },
                height: "auto",
              }}
            />
          ))}
        </Box>
      </Box>

      {/* section 2*/}
      <Box
        sx={{
          backgroundColor: Colors.white,
          paddingTop: 10,
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
              color: Colors.darkPurple,
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
              <source
                src={`${process.env.PUBLIC_URL}/video/preview_video.mp4`}
                type="video/mp4"
              />
              Your browser does not support the video tag.
            </video>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default AboutPage;
