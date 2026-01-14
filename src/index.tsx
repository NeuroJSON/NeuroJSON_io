import App from "./App";
import theme from "./design/theme";
import store from "./redux/store";
// add
import * as preview from "./utils/preview.js";
import {
  previewdataurl,
  previewdata,
  dopreview,
  drawpreview,
  update,
  initcanvas,
  createStats,
  setControlAngles,
  setcrosssectionsizes,
} from "./utils/preview.js";
import { CssBaseline } from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
// import axios from "axios";
import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";

// ----- new ------
// Configure axios base URL from environment variable
// axios.defaults.baseURL =
//   process.env.REACT_APP_API_URL || "http://localhost:5000";
// axios.defaults.withCredentials = true; // Important for cookies!

// Log for debugging (optional)
// console.log("🚀 Environment:", process.env.NODE_ENV);
// console.log("🚀 API URL:", process.env.REACT_APP_API_URL);
// ------ end------
// Get the root element
const rootElement = document.getElementById("root") as HTMLElement;

// Create the root for rendering React
const root = ReactDOM.createRoot(rootElement);

// Expose dopreview globally
(window as any).previewdataurl = previewdataurl;
(window as any).previewdata = previewdata;
(window as any).dopreview = dopreview;
(window as any).drawpreview = drawpreview;
(window as any).initcanvas = initcanvas;
(window as any).update = update;
(window as any).createStats = createStats;
(window as any).setControlAngles = setControlAngles;
(window as any).setcrosssectionsizes = setcrosssectionsizes;

// Render the application
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
