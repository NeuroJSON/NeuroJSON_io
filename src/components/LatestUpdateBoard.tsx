import { Box, Typography, Link as MuiLink } from "@mui/material";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { fetchLatestUpdate } from "redux/neurojson/neurojson.action";
import { DatasetChange } from "redux/neurojson/types/neurojson.interface";
import { RootState } from "redux/store";
import RoutesEnum from "types/routes.enum";

const MAX_DATASETS = 5;

// Palette for this component (integrated with the dark navy/purple hero).
// Green-family accents only — no red styling.
const C = {
  primary: "#F4F4FF", // near-white
  muted: "#a0a5c2", // primary.light
  link: "#a0a5c2", // primary.light (lightGreen on hover)
  lightGreen: "#16FDE2",
};

type ChangeType = DatasetChange["changeType"];

// Status badges share one consistent green; the change type is conveyed by the
// badge text (Added / Updated / Deleted), not by color.
const BADGE_TEXT = C.lightGreen;
const BADGE_BG = "rgba(22, 253, 226, 0.10)";
const changeSign: Record<ChangeType, string> = {
  added: "+",
  updated: "~",
  deleted: "−",
};
const badgeLabel: Record<ChangeType, string> = {
  added: "Added",
  updated: "Updated",
  deleted: "Deleted",
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

const signed = (n: number): string =>
  `${n > 0 ? "+" : n < 0 ? "−" : ""}${Math.abs(n)}`;

const signedBytes = (n: number): string => {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  let v = Math.abs(n);
  const units = ["B", "KB", "MB", "GB", "TB", "PB"];
  let u = 0;
  while (v >= 1024 && u < units.length - 1) {
    v /= 1024;
    u += 1;
  }
  return `${sign}${v.toFixed(v < 10 && u > 0 ? 1 : 0)} ${units[u]}`;
};

// A single metric: medium-weight number + slightly smaller label.
const Metric: React.FC<{
  value: string;
  label: string;
  numberColor: string;
  labelColor: string;
}> = ({ value, label, numberColor, labelColor }) => (
  <Box sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.5 }}>
    <Typography
      component="span"
      sx={{
        fontFamily: "Ubuntu",
        fontSize: "0.875rem",
        fontWeight: 500,
        color: numberColor,
      }}
    >
      {value}
    </Typography>
    <Typography
      component="span"
      sx={{
        fontFamily: "Ubuntu",
        fontSize: "0.8125rem",
        fontWeight: 500,
        color: labelColor,
      }}
    >
      {label}
    </Typography>
  </Box>
);

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

  const { changes, deltas, datasets } = latest;
  const shown = datasets.slice(0, MAX_DATASETS);
  const remaining = datasets.length - shown.length;

  // Dataset-change metrics (semantic color); subject/file/size deltas (neutral).
  const datasetMetrics = (["added", "updated", "deleted"] as ChangeType[])
    .filter((t) => changes[t] > 0)
    .map((t) => {
      const n = changes[t];
      return {
        key: t,
        value: `${changeSign[t]}${n}`,
        label: n === 1 ? "Dataset" : "Datasets",
      };
    });

  return (
    <Box
      sx={{
        maxWidth: 620,
        mx: "auto",
        mt: 2.5,
        px: 1,
        textAlign: "left",
      }}
    >
      {/* Line 1 — "Latest update · <date>" */}
      <Typography
        sx={{ fontFamily: "Ubuntu", fontSize: "0.875rem", fontWeight: 500, mb: 1 }}
      >
        <Box component="span" sx={{ color: C.primary }}>
          Latest update
        </Box>
        <Box component="span" sx={{ color: C.muted }}>
          {" · "}
          {formatDate(latest.updatedAt)}
        </Box>
      </Typography>

      {/* Line 2 — metrics, evenly spaced, lightweight (no bordered chips) */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          alignItems: "center",
          columnGap: 3,
          rowGap: 0.5,
          mb: 1.25,
        }}
      >
        {datasetMetrics.map((m) => (
          <Metric
            key={m.key}
            value={m.value}
            label={m.label}
            numberColor={C.primary}
            labelColor={C.muted}
          />
        ))}
        {deltas && deltas.subjects !== 0 && (
          <Metric
            value={signed(deltas.subjects)}
            label={Math.abs(deltas.subjects) === 1 ? "Subject" : "Subjects"}
            numberColor={C.primary}
            labelColor={C.muted}
          />
        )}
        {deltas && deltas.files !== 0 && (
          <Metric
            value={signed(deltas.files)}
            label={Math.abs(deltas.files) === 1 ? "File" : "Files"}
            numberColor={C.primary}
            labelColor={C.muted}
          />
        )}
        {deltas && deltas.sizeBytes !== 0 && (
          <Metric
            value={signedBytes(deltas.sizeBytes)}
            label=""
            numberColor={C.primary}
            labelColor={C.muted}
          />
        )}
      </Box>

      {/* Line 3+ — affected datasets, left-aligned; badge next to the name */}
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 0.75,
          textAlign: "left",
        }}
      >
        {shown.map((d, i) => (
          <Box
            key={`${d.dbname}/${d.dsname}/${i}`}
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              gap: 1,
            }}
          >
            <MuiLink
              component={Link}
              to={`${RoutesEnum.DATABASES}/${d.dbname}/${d.dsname}`}
              underline="hover"
              sx={{
                color: C.link,
                fontFamily: "Ubuntu",
                fontWeight: 500,
                fontSize: "0.8125rem",
                wordBreak: "break-all",
                "&:hover": { color: C.lightGreen },
              }}
            >
              {d.dbname}/{d.dsname}
            </MuiLink>
            <Box
              component="span"
              sx={{
                flexShrink: 0,
                px: 1,
                py: 0.25,
                borderRadius: "999px",
                fontFamily: "Ubuntu",
                fontSize: "0.75rem",
                fontWeight: 500,
                lineHeight: 1.6,
                color: BADGE_TEXT,
                backgroundColor: BADGE_BG,
              }}
            >
              {badgeLabel[d.changeType]}
            </Box>
          </Box>
        ))}
        {remaining > 0 && (
          <Typography
            sx={{
              fontFamily: "Ubuntu",
              fontWeight: 500,
              fontSize: "0.78rem",
              color: C.muted,
              mt: 0.25,
            }}
          >
            +{remaining} more
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default LatestUpdateBoard;
