import { ThemeProvider } from "@mui/material/styles";
import Routes from "components/Routes";
import theme from "design/theme";
import { BrowserRouter } from "react-router-dom";

const App = () => {
	return (
		<ThemeProvider theme={theme}>
			<BrowserRouter>
				<Routes />
			</BrowserRouter>
		</ThemeProvider>
	);
};

export default App;
