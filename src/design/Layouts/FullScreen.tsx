import { AppBar, Box, Button, Grid, Toolbar, Typography } from "@mui/material";
import { Colors } from "design/theme";
import useIsLargeScreen from "hooks/useIsLargeScreen";
import { Outlet, useNavigate } from "react-router-dom";

const FullScreen = () => {
	const isLargeScreen = useIsLargeScreen();
	const navigate = useNavigate();

	const justifyContentValue = isLargeScreen ? "flex-start" : "space-between";

	return (
		<>
			<AppBar
				position="fixed"
				sx={{
					maxWidth: "100vw",
					width: "100%",
					overflowX: "hidden",
					backgroundColor: Colors.primary.main,
					transition: "background 0.3s ease-in-out",
					backdropFilter: "blur(2.5px)",
					borderBottom: `2px solid ${Colors.primary.dark}`,
					left: "0",
					height: "6rem",
				}}
			>
				<Toolbar sx={{ marginTop: "0.5rem" }}>
					<Grid
						container
						alignItems="center"
						justifyContent={justifyContentValue}
						sx={{ maxWidth: "100%" }}
					>
						<Grid item sm={12} md={12} lg={5}>
							<Button
								sx={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexDirection: "column",
								}}
								onClick={() => navigate("/")}
							>
								<Typography variant="h1" sx={{ color: Colors.white }}>
									NeuroJSON.io
								</Typography>
								<Typography variant="h2">Free Data Worth Sharing</Typography>
							</Button>
						</Grid>

						{[
							{ text: "Mission", url: "https://neurojson.org/Doc/Start" },
							{
								text: "Get Started",
								url: "https://neurojson.org/Doc/Start/User",
							},
							{
								text: "Contribute",
								url: "https://neurojson.org/Doc/Start/Contributor",
							},
							{ text: "Tools", url: "https://neurojson.org/#software" },
							{ text: "Search", url: null },
							{
								text: "Forum",
								url: "https://github.com/orgs/NeuroJSON/discussions",
							},
							{ text: "About", url: "https://neurojson.org/#people" },
						].map(({ text, url }) => (
							<Grid item sm={3} md={2} lg={1} key={text} mt={"3rem"}>
								{url ? (
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
												transition: "color 0.3s ease, transform 0.3s ease",
												"&:hover": {
													color: Colors.white,
													transform: "scale(1.05)",
													cursor: "pointer",
												},
											}}
										>
											{text}
										</Typography>
									</a>
								) : (
									<Typography
										align="center"
										fontWeight={600}
										lineHeight={"1.5rem"}
										letterSpacing={"0.05rem"}
										sx={{
											transition: "color 0.3s ease, transform 0.3s ease",
											"&:hover": {
												color: Colors.white,
												transform: "scale(1.05)",
												cursor: "pointer",
											},
										}}
									>
										{text}
									</Typography>
								)}
							</Grid>
						))}
					</Grid>
				</Toolbar>
			</AppBar>
			<Box
				sx={{
					width: "100%",
					height: "calc(100vh - 6rem)",
					boxSizing: "border-box",
					marginTop: "6rem",
					backgroundColor: Colors.lightGray,
					overflow: "auto",
				}}
			>
				<Outlet />
			</Box>
		</>
	);
};

export default FullScreen;
