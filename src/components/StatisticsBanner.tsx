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
import { DbStatsItem } from "redux/neurojson/types/neurojson.interface";
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

// function for calculate links and size
const calculateLinksAndSize = (dbStats: DbStatsItem[] | null) => {
  if (!dbStats) return { totalLinks: 0, totalSizeTB: "0.00" };

  const filtered = dbStats.filter(
    (item) => item.view !== "dbinfo" && item.view !== "subjects"
  );

  const totalLinks = filtered.reduce((acc, item) => acc + item.num, 0);
  const totalSizeBytes = filtered.reduce((acc, item) => acc + item.size, 0);
  const totalSizeTB = Math.floor(totalSizeBytes / 1024 ** 4);
  return { totalLinks, totalSizeTB };
};

const StatisticsBanner: React.FC = () => {
  const dispatch = useAppDispatch();
  const dbstats = useAppSelector((state: RootState) => state.neurojson.dbStats);
  const registry = useAppSelector(
    (state: RootState) => state.neurojson.registry
  );

  const databaseCount = registry?.length ?? "-";
  const datasetStat = dbstats?.find((item) => item.view === "dbinfo");
  const subjectStat = dbstats?.find((item) => item.view === "subjects");
  const { totalLinks, totalSizeTB } = calculateLinksAndSize(dbstats);

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
    <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
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
        justifyContent: "center",
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
        number={formatNumber(datasetStat?.num)}
        label="Datasets"
      />
      {/* Subjects */}
      <StatItem
        icon={<PeopleAltIcon fontSize="inherit" />}
        number={formatNumber(subjectStat?.num)}
        label="Subjects"
      />
      {/* Links */}
      <StatItem
        icon={<DatasetLinkedIcon fontSize="inherit" />}
        number={formatNumber(totalLinks)}
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
