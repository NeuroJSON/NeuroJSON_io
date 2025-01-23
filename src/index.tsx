// import App from "./App";
// import { ThemeProvider } from "@emotion/react";
// import { CssBaseline } from "@mui/material";
// import theme from "design/theme";
// import ReactDOM from "react-dom/client";
// import { Provider } from "react-redux";
// import store from "redux/store";

// const root = ReactDOM.createRoot(
// 	document.getElementById("root") as HTMLElement
// );

// root.render(
// 	<Provider store={store}>
// 		<ThemeProvider theme={theme}>
// 			<CssBaseline />
// 			<App />
// 		</ThemeProvider>
// 	</Provider>
// );

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Provider } from "react-redux";
import store from "./redux/store";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline } from "@mui/material";
import theme from "./design/theme";

// Get the root element
const rootElement = document.getElementById("root") as HTMLElement;

// Create the root for rendering React
const root = ReactDOM.createRoot(rootElement);

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
