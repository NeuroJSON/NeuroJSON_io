import { AppBar, Box, Grid, Toolbar, Typography } from "@mui/material";
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
					backgroundColor: "transparent",
					transition: "background 0.3s ease-in-out",
					background: "#7b81a5",
					backdropFilter: "blur(2.5px)",
					borderBottom: `2px solid ${Colors.primary.main}`,
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
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									flexDirection: "column",
								}}
							>
								<Typography variant="h1" fontSize={"2rem"} fontWeight={800}>
									NeuroJSON.io
								</Typography>
								<Typography variant="h2" fontSize={"1.5rem"}>
									Free Data Worth Sharing
								</Typography>
							</Box>
						</Grid>

						{/* Mission */}
						<Grid item sm={3} md={2} lg={1}>
							<Typography
								align="center"
								margin={"0.75rem"}
								fontWeight={600}
								lineHeight={"1.5rem"}
								letterSpacing={"0.05rem"}
								sx={{
									transition: "color 0.3s ease, transform 0.3s ease",
									"&:hover": {
										color: Colors.primary.light,
										transform: "scale(1.05)",
										cursor: "pointer",
									},
								}}
							>
								Mission
							</Typography>
						</Grid>

						{/* Get Started */}
						<Grid item sm={3} md={2} lg={1}>
							<Typography
								align="center"
								margin={"0.75rem"}
								fontWeight={600}
								lineHeight={"1.5rem"}
								letterSpacing={"0.05rem"}
								sx={{
									transition: "color 0.3s ease, transform 0.3s ease",
									"&:hover": {
										color: Colors.primary.light,
										transform: "scale(1.05)",
										cursor: "pointer",
									},
								}}
							>
								Get Started
							</Typography>
						</Grid>

						{/* Contribute */}
						<Grid item sm={3} md={2} lg={1}>
							<Typography
								align="center"
								margin={"0.75rem"}
								fontWeight={600}
								lineHeight={"1.5rem"}
								letterSpacing={"0.05rem"}
								sx={{
									transition: "color 0.3s ease, transform 0.3s ease",
									"&:hover": {
										color: Colors.primary.light,
										transform: "scale(1.05)",
										cursor: "pointer",
									},
								}}
							>
								Contribute
							</Typography>
						</Grid>

						{/* Tools */}
						<Grid item sm={3} md={2} lg={1}>
							<Typography
								align="center"
								margin={"0.75rem"}
								fontWeight={600}
								lineHeight={"1.5rem"}
								letterSpacing={"0.05rem"}
								sx={{
									transition: "color 0.3s ease, transform 0.3s ease",
									"&:hover": {
										color: Colors.primary.light,
										transform: "scale(1.05)",
										cursor: "pointer",
									},
								}}
							>
								Tools
							</Typography>
						</Grid>

						{/* Search */}
						<Grid item sm={6} md={2} lg={1}>
							<Typography
								align="center"
								margin={"0.75rem"}
								fontWeight={600}
								lineHeight={"1.5rem"}
								letterSpacing={"0.05rem"}
								sx={{
									transition: "color 0.3s ease, transform 0.3s ease",
									"&:hover": {
										color: Colors.primary.light,
										transform: "scale(1.05)",
										cursor: "pointer",
									},
								}}
							>
								Search
							</Typography>
						</Grid>

						{/* Forum */}
						<Grid item sm={6} md={2} lg={1}>
							<Typography
								align="center"
								margin={"0.75rem"}
								fontWeight={600}
								lineHeight={"1.5rem"}
								letterSpacing={"0.05rem"}
								sx={{
									transition: "color 0.3s ease, transform 0.3s ease",
									"&:hover": {
										color: Colors.primary.light,
										transform: "scale(1.05)",
										cursor: "pointer",
									},
								}}
							>
								Forum
							</Typography>
						</Grid>

						{/* About */}
						<Grid item sm={6} md={2} lg={1}>
							<Typography
								align="center"
								margin={"0.75rem"}
								fontWeight={600}
								lineHeight={"1.5rem"}
								letterSpacing={"0.05rem"}
								sx={{
									transition: "color 0.3s ease, transform 0.3s ease",
									"&:hover": {
										color: Colors.primary.light,
										transform: "scale(1.05)",
										cursor: "pointer",
									},
								}}
							>
								About
							</Typography>
						</Grid>
					</Grid>
				</Toolbar>
			</AppBar>
			<Box
				sx={{
					width: "100%",
					minHeight: "calc(100vh - 6rem)", // Ensure full height minus the AppBar height (6rem)
					boxSizing: "border-box",
					marginTop: "6rem",
					background: "#f0f0f0",
				}}
			>
				<Outlet />
			</Box>
		</>
	);
};

export default FullScreen;
