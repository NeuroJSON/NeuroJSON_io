import {
  Box,
  Typography,
  CircularProgress,
  Pagination,
  FormControl,
  Select,
  MenuItem,
  Grid,
  TextField,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material";
import DatasetPageCard from "components/DatasetPageCard";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  fetchDbInfo,
  loadPaginatedData,
} from "redux/neurojson/neurojson.action";

const NewDatasetPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { dbName } = useParams<{ dbName: string }>();
  const { loading, error, data, limit } = useAppSelector(
    (state) => state.neurojson
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(limit / pageSize);
  const [titleFilter, setTitleFilter] = useState("");

  useEffect(() => {
    if (dbName) {
      dispatch(fetchDbInfo(dbName.toLowerCase()));
    }
  }, [dbName, dispatch]);

  useEffect(() => {
    if (dbName) {
      dispatch(
        loadPaginatedData({
          dbName: dbName.toLowerCase(),
          offset: (page - 1) * pageSize,
          limit: pageSize,
        })
      );
    }
  }, [dbName, page, pageSize, dispatch]);

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

  const handlePageSizeChange = (event: SelectChangeEvent<number>) => {
    setPageSize(Number(event.target.value));
    setPage(1);
  };

  const filteredData =
    titleFilter.trim().length < 3
      ? data
      : data.filter((doc) =>
          doc.value?.name
            ?.toLowerCase()
            .includes(titleFilter.trim().toLowerCase())
        );

  return (
    <Box sx={{ p: 4 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: "center",
          mb: 3,
          gap: { xs: 2, sm: 0 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Typography sx={{ color: Colors.green, fontSize: "2rem" }}>
            Database: {dbName || "N/A"}
          </Typography>
          <Typography sx={{ color: Colors.lightGray, fontSize: "1.2rem" }}>
            Total Datasets: {limit}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
          }}
        >
          {/* filter */}
          <Box>
            <Typography sx={{ color: Colors.lightGray }}>
              Search in page
            </Typography>
            <TextField
              variant="outlined"
              fullWidth
              value={titleFilter}
              onChange={(e) => setTitleFilter(e.target.value)}
              sx={{
                borderRadius: "4px",
                backgroundColor: Colors.white,
                input: {
                  color: Colors.darkPurple,
                },
                "& .MuiOutlinedInput-root": {
                  height: 40,
                  width: 140,
                  "&:hover fieldset": {
                    borderColor: Colors.green,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: Colors.green,
                  },
                },
              }}
            />
          </Box>
          {/* dataset per page setting */}
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <Typography sx={{ color: Colors.lightGray }}>
              Datasets per page
            </Typography>
            <FormControl
              size="small"
              sx={{
                minWidth: 140,
                height: 40,
                backgroundColor: Colors.white,
                borderRadius: "4px",
                "& .MuiInputBase-input": {
                  color: Colors.darkPurple,
                },
                "& .MuiOutlinedInput-root": {
                  "& fieldset": {
                    borderColor: "none",
                  },
                  "&:hover fieldset": {
                    borderColor: Colors.darkGreen,
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: Colors.darkGreen,
                  },
                },
              }}
            >
              <Select value={pageSize} onChange={handlePageSizeChange}>
                {[10, 25, 50, 100].map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>
      </Box>

      {/* Pagination */}
      <Box
        sx={{
          mb: 5,
          mt: 2,
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Pagination
          count={totalPages}
          page={page}
          onChange={handlePageChange}
          showFirstButton
          showLastButton
          sx={{
            "& .MuiPaginationItem-root": {
              color: Colors.lightGray,
            },
            "& .MuiPaginationItem-root.Mui-selected": {
              backgroundColor: Colors.purple,
              color: Colors.lightGray,
              fontWeight: "bold",
            },
            "& .MuiPaginationItem-root:hover": {
              backgroundColor: Colors.secondaryPurple,
              color: "white",
            },
          }}
        />
      </Box>

      {/* results */}
      {loading ? (
        <CircularProgress sx={{ display: "block", margin: "32px auto" }} />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <Grid container spacing={3}>
          {filteredData.map((doc, idx) => (
            <DatasetPageCard
              key={doc.id}
              doc={doc}
              index={idx}
              dbName={dbName ?? ""}
              page={page}
              pageSize={pageSize}
            />
          ))}
        </Grid>
      )}
    </Box>
  );
};

export default NewDatasetPage;
