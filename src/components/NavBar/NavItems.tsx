import { Toolbar, Grid, Button, Typography, Box, Tooltip } from "@mui/material";
import UserButton from "components/User/UserButton";
import UserLogin from "components/User/UserLogin";
import UserSignup from "components/User/UserSignup";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { loginUser, getCurrentUser, logoutUser } from "redux/auth/auth.action";
import { AuthSelector } from "redux/auth/auth.selector";
import { RootState } from "redux/store";
import RoutesEnum from "types/routes.enum";

const NavItems: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  // get auth state from redux
  // const auth = useAppSelector((state: RootState) => state.auth);
  const auth = useAppSelector(AuthSelector);
  const { isLoggedIn, user } = auth;
  const userName = user?.username || "";

  // Modal state
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  // const [isLoggedIn, setIsLoggedIn] = useState(false);
  // const [userName, setUserName] = useState("");

  // Load user info from localStorage on component mount
  // useEffect(() => {
  //   const savedUsername = localStorage.getItem("username");
  //   const savedLoginStatus = localStorage.getItem("isLoggedIn");

  //   if (savedLoginStatus === "true" && savedUsername) {
  //     setUserName(savedUsername);
  //     setIsLoggedIn(true);
  //   }
  // }, []);

  // const handleLoginSuccess = (username: string) => {
  //   setUserName(username);
  //   setIsLoggedIn(true);

  //   // Store user info in localStorage to persist across page refreshes
  //   localStorage.setItem("username", username);
  //   localStorage.setItem("isLoggedIn", "true");

  //   // Cookie-based auth: The authentication cookie is automatically sent
  //   // with subsequent requests, so no need to store tokens manually
  // };

  const handleSignupSuccess = (name: string) => {
    // setUserName(name);
    // setIsLoggedIn(true);
    // TODO: Store auth token in localStorage or context
    // localStorage.setItem('authToken', token);
  };

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/");
    // Call backend logout endpoint to clear the cookie
    // fetch("http://localhost:5000/api/v1/auth/logout", {
    //   method: "POST",
    //   credentials: "include", // Send cookies with request
    // }).catch((err) => console.error("Logout error:", err));
  };

  return (
    // <Toolbar sx={{ marginTop: "0.5rem" }}>
    //   <Grid
    //     container
    //     alignItems="center"
    //     sx={{
    //       maxWidth: "100%",
    //     }}
    //   >
    //     <Grid item xs={12} sm={12} md={5} lg={5}>
    <>
      <Toolbar
        sx={{
          mt: "0.5rem",
          display: "grid",
          gridTemplateColumns: { xs: "auto 1fr auto", md: "auto 1fr auto" },
          gridAutoRows: { xs: "auto auto", md: "auto" },
          alignItems: "center",
          columnGap: { xs: 1, md: 3 },
          rowGap: { xs: 0.5, md: 0 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            minWidth: 0,
            gridColumn: "1",
            gridRow: "1",
          }}
        >
          <Box
            component="img"
            src={`${process.env.PUBLIC_URL}/img/logo_updated.png`}
            alt="logo"
            onClick={() => navigate("/")}
            sx={{
              height: { xs: 50, sm: 65, md: 80 },
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
                  xs: "1.6rem", // font size on mobile
                  sm: "2.1rem",
                  md: "2.5rem",
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
                  xs: "0.85rem", // smaller subtitle on phones
                  sm: "1rem",
                  md: "1.2rem",
                },
              }}
            >
              Free Data Worth Sharing
            </Typography>
          </Button>
          {/* </Box> */}
        </Box>
        {/* // </Grid> */}

        {/* Navigation links*/}
        {/* <Grid item xs={12} md="auto">
          <Grid
            container
            spacing={{ xs: 2, md: 5 }}
            direction={{ xs: "row", sm: "row" }} // row on mobile
            justifyContent="center"
            alignItems="center"
            sx={{
              mb: { xs: 1 },
              rowGap: { xs: 1, sm: 2 },
            }}
          > */}
        <Box
          sx={{
            display: "flex",
            // gap: { xs: 2, md: 5 },
            alignItems: "center",
            justifyContent: "center",
            flexWrap: "wrap",
            columnGap: { xs: 2, md: 5 },
            rowGap: { xs: 1, md: 0 },
            width: "100%",
            gridColumn: { xs: "1 / -1", md: "2" },
            gridRow: { xs: "2", md: "1" },
            textAlign: "center",
          }}
        >
          {[
            { text: "About", url: RoutesEnum.ABOUT },
            { text: "Wiki", url: "https://neurojson.org/Wiki" },
            { text: "Search", url: RoutesEnum.SEARCH },
            { text: "Databases", url: RoutesEnum.DATABASES },
            {
              text: "V1",
              url: "https://neurojson.io/v1",
              tooltip: "Visit the previous version of website",
            },
          ].map(({ text, url, tooltip }) => (
            <Grid item key={text}>
              {tooltip ? (
                <Tooltip
                  title={tooltip}
                  arrow
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
                </Tooltip>
              ) : url?.startsWith("https") ? (
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
                      fontSize: {
                        xs: "0.8rem", // font size on mobile
                        sm: "1rem",
                      },
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
                      fontSize: {
                        xs: "0.8rem", // font size on mobile
                        sm: "1rem",
                      },
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
        </Box>

        {/* User Button */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gridColumn: { xs: "3", md: "3" },
            gridRow: { xs: "1", md: "1" },
          }}
        >
          <UserButton
            isLoggedIn={isLoggedIn}
            userName={userName}
            onLogout={handleLogout}
            onOpenLogin={() => setLoginOpen(true)}
            onOpenSignup={() => setSignupOpen(true)}
          />
        </Box>
        {/* </Grid> */}
        {/* </Grid> */}
        {/* </Grid> */}
        {/* </Grid> */}
      </Toolbar>
      <UserLogin
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToSignup={() => {
          setLoginOpen(false);
          setSignupOpen(true);
        }}
        // onLoginSuccess={handleLoginSuccess}
      />
      <UserSignup
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSwitchToLogin={() => {
          setSignupOpen(false);
          setLoginOpen(true);
        }}
        onSignupSuccess={handleSignupSuccess}
      />
    </>
  );
};

export default NavItems;
