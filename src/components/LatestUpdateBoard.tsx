import { Box, Chip, Typography, Link as MuiLink } from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchLatestUpdate } from "redux/neurojson/neurojson.action";
import { DatasetChange } from "redux/neurojson/types/neurojson.interface";
import { RootState } from "redux/store";
import RoutesEnum from "types/routes.enum";

const MAX_DATASETS = 5;

// Colors per change type (light enough for the dark hero background).
const changeColor: Record<DatasetChange["changeType"], string> = {
  added: Colors.lightGreen,
  updated: Colors.accent,
  deleted: "#ff8a80",
};
const changeSign: Record<DatasetChange["changeType"], string> = {
  added: "+",
  updated: "~",
  deleted: "−",
};

const formatDate = (iso: string | null): string => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const LatestUpdateBoard: React.FC = () => {
  const dispatch = useAppDispatch();
  const latest = useAppSelector(
    (state: RootState) => state.neurojson.latestUpdate
  );

  useEffect(() => {
    dispatch(fetchLatestUpdate());
  }, [dispatch]);

  // Nothing has ever changed → render nothing (keeps the hero uncluttered).
  if (!latest || latest.historyId === null || latest.datasets.length === 0) {
    return null;
  }

  const { changes, datasets } = latest;
  const shown = datasets.slice(0, MAX_DATASETS);
  const remaining = datasets.length - shown.length;

  const countChip = (
    label: string,
    n: number,
    type: DatasetChange["changeType"]
  ) =>
    n > 0 ? (
      <Chip
        key={type}
        label={`${changeSign[type]}${n} ${label}`}
        size="small"
        sx={{
          height: 22,
          backgroundColor: "transparent",
          color: changeColor[type],
          border: `1px solid ${changeColor[type]}`,
          fontWeight: 600,
          "& .MuiChip-label": { px: "8px", fontSize: "0.78rem" },
        }}
      />
    ) : null;

  return (
    <Box sx={{ textAlign: "center", mt: 2, color: Colors.lightGray }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: 1,
          mb: 0.5,
        }}
      >
        <Typography sx={{ fontSize: "0.9rem", color: Colors.lightGray }}>
          Latest update · {formatDate(latest.updatedAt)}
        </Typography>
        {countChip("added", changes.added, "added")}
        {countChip("updated", changes.updated, "updated")}
        {countChip("deleted", changes.deleted, "deleted")}
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 1,
          fontSize: "0.8rem",
        }}
      >
        {shown.map((d, i) => (
          <MuiLink
            key={`${d.dbname}/${d.dsname}/${i}`}
            component={Link}
            to={`${RoutesEnum.DATABASES}/${d.dbname}/${d.dsname}`}
            underline="hover"
            sx={{
              color: changeColor[d.changeType],
              fontFamily: "monospace",
              fontSize: "0.78rem",
              wordBreak: "break-all",
            }}
          >
            {d.dbname}/{d.dsname} ({d.changeType})
          </MuiLink>
        ))}
        {remaining > 0 && (
          <Typography component="span" sx={{ fontSize: "0.78rem" }}>
            +{remaining} more
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default LatestUpdateBoard;
