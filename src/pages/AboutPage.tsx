import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import {
  Box,
  Typography,
  Container,
  Button,
  Grid,
  Tooltip,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useRef } from "react";

const AboutPage: React.FC = () => {
  const searchVideoRef = useRef<HTMLDivElement | null>(null);
  const previewVideoRef = useRef<HTMLDivElement | null>(null);
  const downloadVideoRef = useRef<HTMLDivElement | null>(null);
  const apiVideoRef = useRef<HTMLDivElement | null>(null);

  const videoData = [
    {
      src: "search.png",
      alt: "search icon",
      tip: "Search tutotial video",
      video: "search_video.mp4",
      ref: searchVideoRef,
    },
    {
      src: "preview.png",
      alt: "preview icon",
      tip: "Preview tutotial video",
      video: "preview_video.mp4",
      ref: previewVideoRef,
    },
    {
      src: "api.png",
      alt: "api icon",
      tip: "Rest API - Python tutotial video",
      video: "python_api_video.mp4",
      ref: apiVideoRef,
    },
    {
      src: "download.png",
      alt: "download icon",
      tip: "Download tutotial video",
      video: "download_video.mp4",
      ref: downloadVideoRef,
    },
  ];

  const TutorialVideoItem = ({
    title,
    videoUrl,
  }: {
    title: string;
    videoUrl: string;
  }) => (
    <Box
      sx={{
        mb: 6,
        boxShadow: 3,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {/* <Typography
        variant="h6"
        sx={{
          mb: 1,
          color: Colors.darkPurple,
          fontWeight: "medium",
        }}
      >
        {title}
      </Typography> */}
      <video
        controls
        width="100%"
        style={{ maxHeight: "500px", objectFit: "cover" }}
      >
        <source src={videoUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    </Box>
  );
  return (
    <Box>
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
                    src="https://neurojson.io/io/download/static/videos/introduction.mp4"
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
          {videoData.map(({ src, alt, tip, ref }) => (
            <Tooltip
              title={tip}
              arrow
              key={src}
              componentsProps={{
                tooltip: {
                  sx: {
                    bgcolor: Colors.lightGray,
                    color: Colors.darkPurple,
                  },
                },
                arrow: {
                  sx: {
                    color: Colors.lightGray,
                  },
                },
              }}
            >
              <Box
                component="img"
                src={`${process.env.PUBLIC_URL}/img/about_page/${src}`}
                alt={alt}
                // onClick={() =>
                //   ref?.current?.scrollIntoView({ behavior: "smooth" })

                // }
                onClick={() => {
                  if (ref?.current) {
                    const offset = 80; // adjust this to match your fixed navbar height
                    const top = ref.current.offsetTop - offset;
                    window.scrollTo({ top, behavior: "smooth" });
                  }
                }}
                sx={{
                  width: {
                    xs: "25%",
                    sm: "25%",
                    md: "15%",
                  },
                  height: "auto",
                  cursor: "pointer",
                  transition: "transform 0.3s",
                  "&:hover": { transform: "scale(1.1)" },
                }}
              />
            </Tooltip>
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
          maxWidth="lg"
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
          <Grid container spacing={5} sx={{ mt: 3 }}>
            <Grid item xs={12} sm={6} ref={searchVideoRef}>
              <TutorialVideoItem
                title="Search tutorial"
                videoUrl="https://neurojson.io/io/download/static/videos/search_video.mp4"
              />
            </Grid>

            <Grid item xs={12} sm={6} ref={previewVideoRef}>
              <TutorialVideoItem
                title="Preview tutorial"
                videoUrl="https://neurojson.io/io/download/static/videos/preview.mp4"
              />
            </Grid>

            <Grid item xs={12} sm={6} ref={apiVideoRef}>
              <TutorialVideoItem
                title="Rest API - Python tutorial"
                videoUrl="https://neurojson.io/io/download/static/videos/python_api.mp4"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TutorialVideoItem
                title="Rest API - Matlab tutorial"
                videoUrl="https://neurojson.io/io/download/static/videos/matlab_api.mp4"
              />
            </Grid>

            <Grid item xs={12} sm={6} ref={downloadVideoRef}>
              <TutorialVideoItem
                title="Download tutorial"
                videoUrl="https://neurojson.io/io/download/static/videos/download.mp4"
              />
            </Grid>
          </Grid>
        </Container>
      </Box>
    </Box>
  );
};

export default AboutPage;
