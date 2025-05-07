import { Box, Typography } from "@mui/material";
import React from "react";

const Section4: React.FC = () => {
  return (
    <Box
      sx={{
        zIndex: "2",
        position: "relative",
        width: "100%",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='0' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2371feed'/%3E%3Cstop offset='1' stop-color='%2371feed' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='1200' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23abb2f9'/%3E%3Cstop offset='1' stop-color='%23abb2f9' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='600' cy='0' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%231fa0f6'/%3E%3Cstop offset='1' stop-color='%231fa0f6' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='600' cy='800' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23FFFFFF'/%3E%3Cstop offset='1' stop-color='%23FFFFFF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='e' cx='0' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2302DEC4'/%3E%3Cstop offset='1' stop-color='%2302DEC4' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f' cx='1200' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%235865F2'/%3E%3Cstop offset='1' stop-color='%235865F2' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' width='1200' height='800'/%3E%3Crect fill='url(%23c)' width='1200' height='800'/%3E%3Crect fill='url(%23d)' width='1200' height='800'/%3E%3Crect fill='url(%23e)' width='1200' height='800'/%3E%3Crect fill='url(%23f)' width='1200' height='800'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        padding: "5rem 7rem",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          maxWidth: "43%",
          position: "relative",
        }}
      >
        {[
          {
            src: "/img/section4_data_portals.png",
            onClick: () => console.log("Data Portals clicked"),
          },
          {
            src: "/img/section4_json_conversion.png",
            onClick: () => console.log("JSON Conversion clicked"),
          },
          {
            src: "/img/section4_database.png",
            onClick: () => console.log("Database clicked"),
          },
          {
            src: "/img/section4_platform.png",
            onClick: () => console.log("Platform clicked"),
          },
        ].map((card, index, arr) => (
          <Box
            key={index}
            onClick={card.onClick}
            sx={{
              width: "100%",
              cursor: "pointer",
              position: "relative",
              zIndex: arr.length - index,
              marginTop: index === 0 ? 0 : "-17px", // adjust overlap
              transition: "transform 0.2s",
              "&:hover": {
                transform: "scale(1.02)",
                zIndex: 5,
              },
            }}
          >
            <img
              src={process.env.PUBLIC_URL + card.src}
              alt={`card-${index}`}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
          </Box>
        ))}
      </Box>
      <Box>
        <Typography variant="h6">click each card to learn more</Typography>
      </Box>
    </Box>
  );
};

export default Section4;
