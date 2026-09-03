import ContentPasteSearchIcon from "@mui/icons-material/ContentPasteSearch";
import DatasetLinkedIcon from "@mui/icons-material/DatasetLinked";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";
import StorageIcon from "@mui/icons-material/Storage";
import TopicIcon from "@mui/icons-material/Topic";
import { Box, Typography } from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect } from "react";
import { fetchDbStats } from "redux/neurojson/neurojson.action";
import { RootState } from "redux/store";

const iconStyle = {
  marginRight: 1,
  verticalAlign: "middle",
  color: Colors.lightGray,
  fontSize: {
    xs: "2rem",
    sm: "2.5rem",
  },
};

const numberTextStyle = {
  color: Colors.lightGreen,
  fontWeight: "medium",
  textAlign: "center",
  fontSize: {
    xs: "1rem",
    sm: "1.4rem",
  },
};

const labelTextStyle = {
  color: Colors.lightGreen,
  fontWeight: "medium",
  textAlign: "center",
  fontSize: {
    xs: "0.6rem",
    sm: "0.9rem",
  },
};

const StatisticsBanner: React.FC = () => {
  const dispatch = useAppDispatch();
  // dbStats is now the flat snapshot { datasets, subjects, files, sizeBytes,
  // lastSynced } from the latest successful stats_history row.
  const dbstats = useAppSelector((state: RootState) => state.neurojson.dbStats);
  const registry = useAppSelector(
    (state: RootState) => state.neurojson.registry
  );

  const databaseCount = registry?.length ?? "-";
  const totalSizeTB = dbstats
    ? Math.floor(dbstats.sizeBytes / 1024 ** 4)
    : "-";

  // format numbers with commas
  const formatNumber = (num: number | undefined) =>
    num?.toLocaleString() ?? "—";

  useEffect(() => {
    dispatch(fetchDbStats());
  }, [dispatch]);

  const StatItem = ({
    icon,
    number,
    label,
  }: {
    icon: React.ReactNode;
    number: string;
    label: string;
  }) => (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        textAlign: {
          xs: "left",
          sm: "center",
        },
      }}
    >
      <Box sx={iconStyle}>{icon}</Box>
      <Box>
        <Typography sx={numberTextStyle}>{number}</Typography>
        <Typography sx={labelTextStyle}>{label}</Typography>
      </Box>
    </Box>
  );

  return (
    <Box
      sx={{
        zIndex: 100,
        padding: "1rem",
        display: "flex",
        flexWrap: "wrap",
        justifyContent: {
          xs: "flex-start",
          sm: "center",
        },
        gap: "2rem",
      }}
    >
      {/* Databases */}
      <StatItem
        icon={<StorageIcon fontSize="inherit" />}
        number={databaseCount.toLocaleString()}
        label="Databases"
      />
      {/* Datasets */}
      <StatItem
        icon={<ContentPasteSearchIcon fontSize="inherit" />}
        number={formatNumber(dbstats?.datasets)}
        label="Datasets"
      />
      {/* Subjects */}
      <StatItem
        icon={<PeopleAltIcon fontSize="inherit" />}
        number={formatNumber(dbstats?.subjects)}
        label="Subjects"
      />
      {/* Links */}
      <StatItem
        icon={<DatasetLinkedIcon fontSize="inherit" />}
        number={formatNumber(dbstats?.files)}
        label="Links"
      />
      {/* Size */}
      <StatItem
        icon={<TopicIcon fontSize="inherit" />}
        number={`${totalSizeTB ?? "-"} TB`}
        label="Size"
      />
    </Box>
  );
};

export default StatisticsBanner;
