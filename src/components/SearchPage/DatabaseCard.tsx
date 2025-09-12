import {
  Box,
  Typography,
  Chip,
  Card,
  CardContent,
  Stack,
  Avatar,
} from "@mui/material";
import { Colors } from "design/theme";
import React from "react";
import { Link } from "react-router-dom";
import RoutesEnum from "types/routes.enum";
import { modalityValueToEnumLabel } from "utils/SearchPageFunctions/modalityLabels";

type Props = {
  dbName?: string;
  fullName?: string;
  datasets?: number;
  modalities?: string[];
  logo?: string;
  keyword?: string;
  onChipClick: (key: string, value: string) => void;
};

const DatabaseCard: React.FC<Props> = ({
  dbName,
  fullName,
  datasets,
  modalities,
  logo,
  keyword,
  onChipClick,
}) => {
  const databaseLink = `${RoutesEnum.DATABASES}/${dbName}`;
  // keyword hightlight functional component
  const highlightKeyword = (text: string, keyword?: string) => {
    if (!keyword || !text?.toLowerCase().includes(keyword.toLowerCase())) {
      return text;
    }

    const regex = new RegExp(`(${keyword})`, "gi"); // for case-insensitive and global
    const parts = text.split(regex);

    return (
      <>
        {parts.map((part, i) =>
          part.toLowerCase() === keyword.toLowerCase() ? (
            <mark
              key={i}
              style={{ backgroundColor: "yellow", fontWeight: 600 }}
            >
              {part}
            </mark>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </>
    );
  };

  // for datatype rendering
  const isClickableModality = (raw: string) =>
    !!modalityValueToEnumLabel[raw.toLowerCase()];

  const renderDatatype = (raw: string, idx: number) => {
    const key = raw.toLowerCase();
    const label = modalityValueToEnumLabel[key];

    if (label) {
      // Clickable modality → drives the "modality" filter
      return (
        <Chip
          key={`${key}-${idx}`}
          label={key}
          variant="outlined"
          onClick={() => onChipClick("modality", key)} // pass normalized key
          sx={{
            "& .MuiChip-label": { px: "6px", fontSize: "0.8rem" },
            height: 24,
            color: Colors.darkPurple,
            border: `1px solid ${Colors.darkPurple}`,
            fontWeight: "bold",
            transition: "all 0.2s ease",
            "&:hover": {
              backgroundColor: `${Colors.purple} !important`,
              color: "white",
              borderColor: Colors.purple,
            },
          }}
        />
      );
    }

    // Not a modality → render as plain text (or a disabled/outlined chip if you prefer)
    return (
      <Typography key={`${key}-${idx}`} variant="body2" sx={{ mt: 1, mr: 1 }}>
        {raw}
      </Typography>
    );
  };

  return (
    <Card sx={{ mb: 3, position: "relative" }}>
      <CardContent>
        <Box
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            gap: 2,
          }}
        >
          {/* Logo as Avatar */}
          <Box sx={{ display: "flex", alignItems: "center" }}>
            {logo && (
              <Avatar
                variant="square"
                src={logo}
                alt={fullName || "Database Logo"}
                sx={{
                  width: 60,
                  height: 60,
                  mb: 1,
                  "& img": {
                    objectFit: "contain", // show full image inside
                  },
                }}
              />
            )}
          </Box>
          {/* database card */}
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 600,
                color: Colors.darkPurple,
                textDecoration: "none",
                ":hover": { textDecoration: "underline" },
              }}
              component={Link}
              to={databaseLink}
              target="_blank"
            >
              Database:{" "}
              {highlightKeyword(fullName || "Untitled Database", keyword)}
            </Typography>
            <Stack spacing={2} margin={1}>
              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                gap={1}
                alignItems="center"
              >
                <Typography variant="body2" mt={1}>
                  <strong>Data Type:</strong>
                </Typography>

                {Array.isArray(modalities) && modalities.length > 0 ? (
                  modalities.map(renderDatatype)
                ) : (
                  // (
                  //   modalities.map((mod, idx) => (
                  //     <Chip
                  //       key={idx}
                  //       label={mod}
                  //       variant="outlined"
                  //       onClick={() => onChipClick("modality", mod)}
                  //       sx={{
                  //         "& .MuiChip-label": {
                  //           paddingX: "6px",
                  //           fontSize: "0.8rem",
                  //         },
                  //         height: "24px",
                  //         color: Colors.darkPurple,
                  //         border: `1px solid ${Colors.darkPurple}`,
                  //         fontWeight: "bold",
                  //         transition: "all 0.2s ease",
                  //         "&:hover": {
                  //           backgroundColor: `${Colors.purple} !important`,
                  //           color: "white",
                  //           borderColor: Colors.purple,
                  //         },
                  //       }}
                  //     />
                  //   ))
                  // )
                  <Typography variant="body2" mt={1}>
                    N/A
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                <Typography variant="body2" mt={1}>
                  <strong>Datasets:</strong> {datasets ?? "N/A"}
                </Typography>
              </Stack>
            </Stack>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default DatabaseCard;
