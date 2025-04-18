import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from "react-redux";
import store from "./redux/store";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import theme from "./design/theme";
import * as preview from "./utils/preview.js";

import { previewdataurl, previewdata, dopreview, drawpreview, update, initcanvas, createStats, setControlAngles, setcrosssectionsizes } from "./utils/preview.js";

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
