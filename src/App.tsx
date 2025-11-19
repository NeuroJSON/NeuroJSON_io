import { GlobalStyles, CircularProgress, Box } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import Routes from "components/Routes";
import theme from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useGAPageviews } from "hooks/useGAPageviews";
import { useEffect, useState } from "react";
import { BrowserRouter } from "react-router-dom";
import { getCurrentUser } from "redux/auth/auth.action";

function GATracker() {
  useGAPageviews();
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
        <Routes />
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
