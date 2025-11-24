import { GlobalStyles, CircularProgress, Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import Routes from "components/Routes";
import theme from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useGAPageviews } from "hooks/useGAPageviews";
import { useEffect, useState } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { getCurrentUser } from "redux/auth/auth.action";

function GATracker() {
  useGAPageviews();
  return null;
}

// Component to handle auth checks within Router context
// AuthHandler starts listening for:
//    - Browser back/forward
//    - OAuth callbacks (first login via OAuth)
function AuthHandler() {
  const dispatch = useAppDispatch();
  const location = useLocation();

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      dispatch(getCurrentUser());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [dispatch]);

  // Handle OAuth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const authStatus = searchParams.get("auth");

    if (authStatus === "success") {
      dispatch(getCurrentUser());
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    } else if (authStatus === "error") {
      const errorMessage =
        searchParams.get("message") || "Authentication failed";
      // Clean up URL
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [location.search, dispatch]);

  return null;
}

const App = () => {
  const dispatch = useAppDispatch();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);

  // Check authentication status on app load
  useEffect(() => {
    dispatch(getCurrentUser()).finally(() => {
      setAuthCheckComplete(true);
    });
  }, [dispatch]);

  // Show loading spinner while checking authentication
  if (!authCheckComplete) {
    return (
      <ThemeProvider theme={theme}>
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
        >
          <CircularProgress />
        </Box>
      </ThemeProvider>
    );
  }
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles
        styles={{
          body: {
            overscrollBehavior: "none",
          },
        }}
      />
      <BrowserRouter basename={process.env.PUBLIC_URL}>
        <GATracker />
        <AuthHandler />
        <Routes />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
