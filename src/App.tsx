import { GlobalStyles } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import Routes from "components/Routes";
import theme from "design/theme";
import { useGAPageviews } from "hooks/useGAPageviews";
import { BrowserRouter } from "react-router-dom";

function GATracker() {
  useGAPageviews();
  return null;
}

const App = () => {
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
