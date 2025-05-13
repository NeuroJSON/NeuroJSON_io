import { Box, Typography, Slide } from "@mui/material";
import WorkflowDetailCard from "components/WorkflowDetailCard";
import { Colors } from "design/theme";
import React, { useState } from "react";

type CardType = "data-portals" | "json-conversion" | "database" | "rest-api";

const cards: { type: CardType; src: string }[] = [
  { type: "data-portals", src: "/img/section4/workflow1.png" },
  { type: "json-conversion", src: "/img/section4/workflow2.png" },
  { type: "database", src: "/img/section4/workflow3.png" },
  { type: "rest-api", src: "/img/section4/workflow4.png" },
];

const Section4: React.FC = () => {
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);

  return (
    <Box
      sx={{
        zIndex: "2",
        position: "relative",
        width: "100%",
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100%25' height='100%25' viewBox='0 0 1200 800'%3E%3Cdefs%3E%3CradialGradient id='a' cx='0' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2371feed'/%3E%3Cstop offset='1' stop-color='%2371feed' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='b' cx='1200' cy='800' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23abb2f9'/%3E%3Cstop offset='1' stop-color='%23abb2f9' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='c' cx='600' cy='0' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%231fa0f6'/%3E%3Cstop offset='1' stop-color='%231fa0f6' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='d' cx='600' cy='800' r='600' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%23FFFFFF'/%3E%3Cstop offset='1' stop-color='%23FFFFFF' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='e' cx='0' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%2302DEC4'/%3E%3Cstop offset='1' stop-color='%2302DEC4' stop-opacity='0'/%3E%3C/radialGradient%3E%3CradialGradient id='f' cx='1200' cy='0' r='800' gradientUnits='userSpaceOnUse'%3E%3Cstop offset='0' stop-color='%235865F2'/%3E%3Cstop offset='1' stop-color='%235865F2' stop-opacity='0'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect fill='url(%23a)' width='1200' height='800'/%3E%3Crect fill='url(%23b)' width='1200' height='800'/%3E%3Crect fill='url(%23c)' width='1200' height='800'/%3E%3Crect fill='url(%23d)' width='1200' height='800'/%3E%3Crect fill='url(%23e)' width='1200' height='800'/%3E%3Crect fill='url(%23f)' width='1200' height='800'/%3E%3C/svg%3E")`,
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        minHeight: "100vh",
        display: "flex",
        flexDirection: { xs: "column", md: "row-reverse" },
        alignItems: "center",
        justifyContent: "center",
        gap: 15,
        px: { xs: 2, md: 6 },
        py: { xs: 8, md: 12 },
      }}
    >
      {/* title and text container */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          maxWidth: "600px",
          alignItems: { xs: "center", md: "flex-start" },
          textAlign: { xs: "center", md: "left" },
          gap: 4,
          mt: { xs: 4, md: 4 },
          px: 2,
        }}
      >
        <Typography
          variant="h3"
          sx={{ color: Colors.lightGray, fontWeight: "bold" }}
        >
          Platform Workflow
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography variant="h6" sx={{ color: Colors.lightGray }}>
            click each card to learn more
          </Typography>
          <img
            src={`${process.env.PUBLIC_URL}/img/section4/click_icon.png`}
            style={{ width: "50px", height: "auto", display: "block" }}
          />
        </Box>
        {selectedCard && (
          <Slide direction="left" in={!!selectedCard} timeout={400}>
            <div>
              <WorkflowDetailCard type={selectedCard} />
            </div>
          </Slide>
        )}
      </Box>

      {/* img container */}
      <Box
        sx={{
          marginTop: 3,
        }}
      >
        {cards.map((card, index, arr) => (
          <Box
            key={index}
            onClick={() => setSelectedCard(card.type)}
            sx={{
              maxWidth: "700px",
              width: "100%",
              cursor: "pointer",
              position: "relative",
              zIndex: arr.length - index,
              marginTop: index === 0 ? 0 : "-20px", // adjust overlap
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
              style={{
                width: "100%",
                height: "auto",
                display: "block",
                minWidth: "300px",
              }}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default Section4;
