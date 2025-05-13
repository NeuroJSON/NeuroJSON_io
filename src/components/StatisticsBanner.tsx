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
      <Box
        sx={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        <StorageIcon
          sx={{
            marginRight: 1,
            verticalAlign: "middle",
            color: Colors.lightGray,
            fontSize: "2.5rem",
          }}
        />
        <Box>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "bold",
              textAlign: "center",
              fontSize: "1.4rem",
            }}
          >
            {databaseCount.toLocaleString()}
          </Typography>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "medium",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            Databases
          </Typography>
        </Box>
      </Box>

      {/* Datasets */}
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <ContentPasteSearchIcon
          sx={{
            marginRight: 1,
            verticalAlign: "middle",
            color: Colors.lightGray,
            fontSize: "2.5rem",
          }}
        />
        <Box>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "bold",
              textAlign: "center",
              fontSize: "1.4rem",
            }}
          >
            {formatNumber(datasetStat?.num)}
          </Typography>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "medium",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            Datasets
          </Typography>
        </Box>
      </Box>
      {/* Subjects */}
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <PeopleAltIcon
          sx={{
            marginRight: 1,
            verticalAlign: "middle",
            color: Colors.lightGray,
            fontSize: "2.5rem",
          }}
        />
        <Box>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "bold",
              textAlign: "center",
              fontSize: "1.4rem",
            }}
          >
            {formatNumber(subjectStat?.num)}
          </Typography>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "medium",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            Subjects
          </Typography>
        </Box>
      </Box>
      {/* Links */}
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <DatasetLinkedIcon
          sx={{
            marginRight: 1,
            verticalAlign: "middle",
            color: Colors.lightGray,
            fontSize: "2.5rem",
          }}
        />
        <Box>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "bold",
              textAlign: "center",
              fontSize: "1.4rem",
            }}
          >
            {totalLinks.toLocaleString() ?? "-"}
          </Typography>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "medium",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            Links
          </Typography>
        </Box>
      </Box>
      {/* Size */}
      <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
        <TopicIcon
          sx={{
            marginRight: 1,
            verticalAlign: "middle",
            color: Colors.lightGray,
            fontSize: "2.5rem",
          }}
        />
        <Box>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "bold",
              textAlign: "center",
              fontSize: "1.4rem",
            }}
          >
            {totalSizeTB ?? "-"}&nbsp;TB
          </Typography>
          <Typography
            sx={{
              color: Colors.green,
              fontWeight: "medium",
              fontSize: "0.9rem",
              textAlign: "center",
            }}
          >
            Size
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default StatisticsBanner;
