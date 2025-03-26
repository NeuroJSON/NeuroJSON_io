import { orange, purple } from "@mui/material/colors";
import { createTheme } from "@mui/material/styles";

const primary = {
  dark: "#5c6386",
  main: "#7b81a5",
  light: "#a0a5c2",
};

const secondary = {
  dark: "#374056",
  main: "#48556B",
  light: "#7487a0",
};

export const Colors = {
  white: "#FFFFFF",
  black: "#000000",
  lightGray: "#f2f2f2",
  darkGray: "#4A4A4A",
  accent: "#D5A021",
  success: "#03BB50",
  error: "#D9534F",
  textPrimary: "#212121",
  textSecondary: "#494747",
  green: "#02DEC4",
  darkGreen: "#49c6ae",
  yellow: "#FFDD31",
  lightYellow: "#FAEBD7",
  purple: "#5865F2",
  darkPurple: "#282C56",
  orange: "#FF9F2F",
  darkOrange: "#E88C25",
  primary,
  secondary,
};

const theme = createTheme({
  typography: {
    fontFamily: ["Raleway", "Ubuntu"].join(","),
    h1: {
      fontFamily: "Raleway",
      fontWeight: 700,
      // fontSize: "2rem",
      fontSize: "2.5rem",
      textTransform: "none",
    },
    h2: {
      fontWeight: 600,
      // fontSize: "1.75rem",
      fontSize: "1.2rem",
      textTransform: "none",
      color: Colors.secondary.main,
    },
    body1: {
      fontSize: "1rem",
      color: Colors.textPrimary,
      fontFamily: "Ubuntu",
    },
    body2: {
      fontSize: "0.875rem",
      color: Colors.textSecondary,
      fontFamily: "Ubuntu",
    },
  },
});

export default theme;
