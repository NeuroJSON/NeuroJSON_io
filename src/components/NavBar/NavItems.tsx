import { Toolbar, Grid, Button, Typography } from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { useNavigate, Link } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

// import useIsLargeScreen from "hooks/useIsLargeScreen";

const NavItems: React.FC = () => {
  //   const isLargeScreen = useIsLargeScreen();
  //   const justifyContentValue = isLargeScreen ? "flex-start" : "space-between";

  const navigate = useNavigate();

  return (
    <Toolbar sx={{ marginTop: "0.5rem" }}>
      <Grid
        container
        alignItems="center"
        // justifyContent={justifyContentValue}
        sx={{ maxWidth: "100%" }}
      >
        <Grid item sm={12} md={5} lg={5}>
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
              }}
            >
              NeuroJSON.io
            </Typography>
            <Typography
              variant="h2"
              sx={{
                color: Colors.lightGray,
              }}
            >
              Free Data Worth Sharing
            </Typography>
          </Button>
        </Grid>

        {/* Navigation links*/}
        <Grid item paddingLeft="2rem">
          <Grid container spacing={3} justifyContent="center">
            {[
              { text: "ABOUT", url: "https://neurojson.org/Doc/Start" },
              { text: "WIKI", url: "https://neurojson.org/Wiki" },
              { text: "SEARCH", url: RoutesEnum.SEARCH },
              { text: "DATABASES", url: RoutesEnum.DATABASES },
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
                        "&:hover": {
                          color: Colors.green,
                          transform: "scale(1.05)",
                          cursor: "pointer",
                          boxShadow: `0px 0px 15px ${Colors.green}`,
                          borderRadius: "5px",
                          padding: "5px",
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
                        "&:hover": {
                          color: Colors.green,
                          transform: "scale(1.05)",
                          cursor: "pointer",
                          boxShadow: `0px 0px 15px ${Colors.green}`,
                          borderRadius: "5px",
                          padding: "5px",
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
