import { Toolbar, Grid, Button, Typography, Box } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

const NavItems: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Toolbar sx={{ marginTop: "0.5rem" }}>
      <Grid
        container
        alignItems="center"
        sx={{
          maxWidth: "100%",
        }}
      >
        <Grid item xs={12} sm={12} md={5} lg={5}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2, // space between image and text
            }}
          >
            <Box
              component="img"
              src={`${process.env.PUBLIC_URL}/img/logo_updated.png`}
              alt="logo"
              onClick={() => navigate("/")}
              height="auto"
              sx={{
                height: "80px",
                width: "auto",
                display: { xs: "block", sm: "block", md: "none" },
              }}
            ></Box>
            <Button
              disableRipple
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "column",
                backgroundColor: "transparent",
                "&:hover": {
                  backgroundColor: "transparent",
                },
              }}
              onClick={() => navigate("/")}
            >
              <Typography
                variant="h1"
                sx={{
                  color: Colors.yellow,
                  fontSize: {
                    xs: "2.2rem", // font size on mobile
                    sm: "2.5rem",
                  },
                }}
              >
                NeuroJSON.io
              </Typography>
              <Typography
                variant="h2"
                sx={{
                  color: Colors.lightGray,
                  fontSize: {
                    xs: "1rem", // font size on mobile
                    sm: "1.2rem",
                  },
                }}
              >
                Free Data Worth Sharing
              </Typography>
            </Button>
          </Box>
        </Grid>

        {/* Navigation links*/}
        <Grid item xs={12} md="auto">
          <Grid
            container
            spacing={3}
            justifyContent="center"
            sx={{ mb: { xs: 1 } }}
          >
            {[
              // { text: "ABOUT", url: "https://neurojson.org/Doc/Start" },
              { text: "About", url: RoutesEnum.ABOUT },
              { text: "Wiki", url: "https://neurojson.org/Wiki" },
              { text: "Search", url: RoutesEnum.SEARCH },
              { text: "Databases", url: RoutesEnum.DATABASES },
              { text: "V1", url: "https://neurojson.io/v1" },
            ].map(({ text, url }) => (
              <Grid item key={text}>
                {url?.startsWith("https") ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ textDecoration: "none" }}
                  >
                    <Typography
                      align="center"
                      fontWeight={600}
                      lineHeight={"1.5rem"}
                      letterSpacing={"0.05rem"}
                      sx={{
                        color: Colors.white,
                        transition: "color 0.3s ease, transform 0.3s ease",
                        textTransform: "uppercase",
                        "&:hover": {
                          transform: "scale(1.2)",
                          cursor: "pointer",
                        },
                      }}
                    >
                      {text}
                    </Typography>
                  </a>
                ) : (
                  <Link to={url} style={{ textDecoration: "none" }}>
                    <Typography
                      align="center"
                      fontWeight={600}
                      lineHeight={"1.5rem"}
                      letterSpacing={"0.05rem"}
                      sx={{
                        color: Colors.white,
                        transition: "color 0.3s ease, transform 0.3s ease",
                        textTransform: "uppercase",
                        "&:hover": {
                          transform: "scale(1.2)",
                          cursor: "pointer",
                        },
                      }}
                    >
                      {text}
                    </Typography>
                  </Link>
                )}
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>
    </Toolbar>
  );
};

export default NavItems;
