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
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React from "react";
import { useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchDbInfo } from "redux/neurojson/neurojson.action";
import { RootState } from "redux/store";
import RoutesEnum from "types/routes.enum";
import { modalityValueToEnumLabel } from "utils/SearchPageFunctions/modalityLabels";

type Props = {
  dbId?: string;
  fullName?: string;
  datasets?: number;
  modalities?: string[];
  logo?: string;
  keyword?: string;
  onChipClick: (key: string, value: string) => void;
};

const DatabaseCard: React.FC<Props> = ({
  dbId,
  fullName,
  datasets,
  modalities,
  logo,
  keyword,
  onChipClick,
}) => {
  const dispatch = useAppDispatch();
  const dbInfo = useAppSelector((state: RootState) => state.neurojson.dbInfo);
  // console.log("dbInfo", dbInfo);
  useEffect(() => {
    if (dbId) {
      dispatch(fetchDbInfo(dbId.toLowerCase()));
    }
  }, [dbId, dispatch]);
  const databaseLink = `${RoutesEnum.DATABASES}/${dbId}`;
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
    <Card
      sx={{
        mb: 3,
        position: "relative",
        transition: "all .2s ease",
        borderStyle: "dashed",
        borderColor: "divider",
        backgroundColor: "#FCFCFF",
        boxShadow: 0,
        width: { xs: "350px", md: "200px" },
      }}
    >
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
          <Box>
            <Box sx={{ display: "flex", gap: 1, alignItems: "flex-start" }}>
              <Box sx={{ display: "flex", alignItems: "center" }}>
                {logo && (
                  <Avatar
                    variant="square"
                    src={logo}
                    alt={fullName || "Database Logo"}
                    sx={{
                      width: 40,
                      height: 40,
                      mb: 1,
                      "& img": {
                        objectFit: "contain", // show full image inside
                      },
                    }}
                  />
                )}
              </Box>
              <Typography
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
                {highlightKeyword(fullName || "Untitled Database", keyword)}
              </Typography>
            </Box>

            <Stack spacing={0.5}>
              <Stack
                direction="row"
                spacing={0.5}
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
                  <Typography variant="body2" mt={1}>
                    N/A
                  </Typography>
                )}
              </Stack>

              <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                <Typography variant="body2" mt={1}>
                  <strong>Datasets:</strong> {datasets ?? "N/A"}
                  {/* <strong>Datasets:</strong>{" "}
                  {dbInfo?.doc_count != null ? dbInfo.doc_count - 1 : "N/A"} */}
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
