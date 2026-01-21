import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import {
  Toolbar,
  Grid,
  Button,
  Typography,
  Box,
  Tooltip,
  Menu,
  MenuItem,
} from "@mui/material";
import UserButton from "components/User/UserButton";
import UserLogin from "components/User/UserLogin";
import UserSignup from "components/User/UserSignup";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { logoutUser } from "redux/auth/auth.action";
import { AuthSelector } from "redux/auth/auth.selector";
import { RootState } from "redux/store";
import RoutesEnum from "types/routes.enum";

const NavItems: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const auth = useAppSelector(AuthSelector);
  const { isLoggedIn, user } = auth;
  const userName = user?.username || "";

  // Modal state
  const [loginOpen, setLoginOpen] = useState(false);
  const [signupOpen, setSignupOpen] = useState(false);

  // Resources dropdown state
  const [resourcesAnchor, setResourcesAnchor] = useState<null | HTMLElement>(
    null
  );
  const resourcesOpen = Boolean(resourcesAnchor);

  const handleLogout = () => {
    dispatch(logoutUser());
    navigate("/");
  };

  const handleResourcesClick = (event: React.MouseEvent<HTMLElement>) => {
    setResourcesAnchor(event.currentTarget);
  };

  const handleResourcesClose = () => {
    setResourcesAnchor(null);
  };

  const resourcesMenu = [
    {
      category: "Converter",
      items: [
        {
          text: "neuroj for Python",
          url: "https://neurojson.org/Page/python-jdata",
        },
        { text: "neuroj for shell", url: "https://neurojson.org/Page/neuroj" },
      ],
    },
    {
      category: "MATLAB/Octave",
      items: [
        { text: "jsonlab", url: "https://neurojson.org/Page/jsonlab" },
        { text: "jdict", url: "https://neurojson.org/Page/jdict" },
        { text: "jnifty", url: "https://neurojson.org/Page/jnifty" },
        { text: "jsnirfy", url: "https://neurojson.org/Page/jsnirfy" },
        { text: "zmat", url: "https://neurojson.org/Page/zmat" },
        { text: "easyh5", url: "https://neurojson.org/Page/easyh5" },
      ],
    },
    {
      category: "Python",
      items: [
        { text: "jdata", url: "https://neurojson.org/Page/python-jdata" },
        { text: "bjdata", url: "https://neurojson.org/Page/python-bjdata" },
      ],
    },
    {
      category: "Format Specifications",
      items: [
        { text: "JData", url: "https://neurojson.org/Page/JData_Format" },
        { text: "BJData", url: "https://neurojson.org/Page/BJData_Format" },
        { text: "JNIfTI", url: "https://neurojson.org/Page/JNIfTI_Format" },
        { text: "JSNIRF", url: "https://neurojson.org/Page/JSNIRF_Format" },
        { text: "JMesh", url: "https://neurojson.org/Page/JMesh_Format" },
        { text: "JGIFTI", url: "https://github.com/NeuroJSON/jgifti" },
      ],
    },
  ];

  return (
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
          {/* {[
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
          ))} */}

          {[
            { text: "About", url: RoutesEnum.ABOUT },
            { text: "Wiki", url: "https://neurojson.org/Wiki" },
            { text: "Search", url: RoutesEnum.SEARCH },
            { text: "Databases", url: RoutesEnum.DATABASES },
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
                      fontSize: {
                        xs: "0.8rem",
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
                        xs: "0.8rem",
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

          {/* Resources Dropdown */}
          <Grid item>
            <Box
              onClick={handleResourcesClick}
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                cursor: "pointer",
              }}
            >
              <Typography
                align="center"
                fontWeight={600}
                lineHeight={"1.5rem"}
                letterSpacing={"0.05rem"}
                sx={{
                  fontSize: {
                    xs: "0.8rem",
                    sm: "1rem",
                  },
                  color: Colors.white,
                  transition: "color 0.3s ease, transform 0.3s ease",
                  textTransform: "uppercase",
                  "&:hover": {
                    transform: "scale(1.2)",
                  },
                }}
              >
                Resources
              </Typography>
              <KeyboardArrowDownIcon
                sx={{
                  color: Colors.white,
                  fontSize: "1.2rem",
                  transition: "transform 0.3s ease",
                  transform: resourcesOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
              />
            </Box>
          </Grid>
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

      {/* Resources Dropdown Menu */}
      <Menu
        anchorEl={resourcesAnchor}
        open={resourcesOpen}
        onClose={handleResourcesClose}
        PaperProps={{
          sx: {
            bgcolor: Colors.darkPurple,
            color: Colors.white,
            minWidth: "280px",
            maxHeight: "500px",
            mt: 1,
          },
        }}
      >
        {resourcesMenu.map((section, sectionIndex) => (
          <Box key={section.category}>
            {sectionIndex > 0 && (
              <Box
                sx={{
                  borderTop: `1px solid ${Colors.lightGray}40`,
                  mx: 1,
                  my: 0.5,
                }}
              />
            )}
            <MenuItem
              disabled
              sx={{
                color: Colors.green,
                fontWeight: 700,
                fontSize: "0.85rem",
                opacity: "1 !important",
                "&.Mui-disabled": {
                  opacity: 1,
                },
              }}
            >
              {section.category}
            </MenuItem>
            {section.items.map((item) => (
              <MenuItem
                key={item.text}
                onClick={() => {
                  if (item.url) {
                    window.open(item.url, "_blank");
                    handleResourcesClose();
                  }
                }}
                sx={{
                  pl: 3,
                  fontSize: "0.9rem",
                  color: item.url ? Colors.white : Colors.lightGray,
                  cursor: item.url ? "pointer" : "default",
                  "&:hover": {
                    bgcolor: item.url ? Colors.purpleGrey : "transparent",
                    color: item.url ? Colors.darkPurple : Colors.lightGray,
                  },
                }}
              >
                {item.text}
              </MenuItem>
            ))}
          </Box>
        ))}
      </Menu>
      <UserLogin
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onSwitchToSignup={() => {
          setLoginOpen(false);
          setSignupOpen(true);
        }}
      />
      <UserSignup
        open={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSwitchToLogin={() => {
          setSignupOpen(false);
          setLoginOpen(true);
        }}
      />
    </>
  );
};

export default NavItems;
