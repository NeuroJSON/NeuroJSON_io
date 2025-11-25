import { GlobalStyles, CircularProgress, Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import Routes from "components/Routes";
import theme from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useGAPageviews } from "hooks/useGAPageviews";
import { useEffect, useState } from "react";
import React from "react";
import { BrowserRouter, useLocation } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "redux/auth/auth.action";

function GATracker() {
  useGAPageviews();
  return null;
}

// Component to handle auth checks within Router context
// AuthHandler starts listening for:
//    - Browser back/forward
//    - OAuth callbacks (first login via OAuth)
//   - Page restore from back-forward cache (bfcache)
function AuthHandler() {
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const hasProcessedOAuthRef = React.useRef(false);

  // Handle browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      console.log("🔄 Browser navigation detected");
      dispatch(getCurrentUser());

      // If user navigated back to an OAuth callback URL, redirect to home
      const searchParams = new URLSearchParams(window.location.search);
      if (searchParams.get("auth")) {
        console.log("⚠️ Back to OAuth URL - redirecting to home");
        navigate("/", { replace: true });
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [dispatch, navigate]);

  // 🔁 Re-check auth when page is restored from back-forward cache (bfcache)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      // event.persisted === true when coming from bfcache
      if (event.persisted) {
        console.log("🔁 Page restored from bfcache - revalidating auth");
        dispatch(getCurrentUser());
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [dispatch]);

  // Handle OAuth callback
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const authStatus = searchParams.get("auth");

    // Only process OAuth callback once per session
    if (authStatus && !hasProcessedOAuthRef.current) {
      hasProcessedOAuthRef.current = true; // Mark as processed

      if (authStatus === "success") {
        console.log("✅ OAuth success - fetching user");
        dispatch(getCurrentUser());
      } else if (authStatus === "error") {
        const errorMessage =
          searchParams.get("message") || "Authentication failed";
        console.error("❌ OAuth error:", errorMessage);
      }

      // Clean up URL - this removes it from history
      // window.history.replaceState({}, "", window.location.pathname);
      navigate(window.location.pathname, { replace: true });
    }
  }, [location.search, dispatch, navigate]);

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
