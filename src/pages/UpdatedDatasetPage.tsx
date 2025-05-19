import {
  Box,
  Typography,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Card,
  CardContent,
  Grid,
  Button,
} from "@mui/material";
import { SelectChangeEvent } from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  fetchDbInfo,
  loadPaginatedData,
} from "redux/neurojson/neurojson.action";
import { resetData } from "redux/neurojson/neurojson.slice";
import { Row } from "redux/neurojson/types/neurojson.interface";
import RoutesEnum from "types/routes.enum";

const NewDatasetPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { dbName } = useParams<{ dbName: string }>();
  const { loading, error, data, limit } = useAppSelector(
    (state) => state.neurojson
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const totalPages = Math.ceil(limit / pageSize);

  useEffect(() => {
    if (dbName) {
      dispatch(resetData());
      dispatch(fetchDbInfo(dbName.toLowerCase()));
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

  return (
    <Box sx={{ p: 4 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            // border: "2px yellow solid",
          }}
        >
          <Typography sx={{ color: Colors.green, fontSize: "2rem" }}>
            Database: {dbName || "N/A"}
          </Typography>
          <Typography sx={{ color: Colors.lightGray, fontSize: "1.2rem" }}>
            Total Datasets: {limit}
          </Typography>
        </Box>

        <Box display="flex" alignItems="center" gap={2}>
          <Typography sx={{ color: Colors.lightGray }}>
            Datasets per Page:
          </Typography>
          <FormControl
            size="small"
            sx={{
              minWidth: 140,
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

      {loading ? (
        <CircularProgress sx={{ display: "block", margin: "32px auto" }} />
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : (
        <>
          <Box>
            <Box
              sx={{
                mb: 2,
                mt: 2,
                // border: "2px red solid",
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
                }}
              />
            </Box>
          </Box>
          <Grid container spacing={3}>
            {data.map((doc: Row, idx: number) => {
              const index = (page - 1) * pageSize + idx + 1;
              return (
                <Grid item xs={12} sm={6} key={doc.id}>
                  <Card>
                    <CardContent>
                      <Typography
                        variant="h6"
                        onClick={() =>
                          navigate(
                            `${RoutesEnum.DATABASES}/${encodeURIComponent(
                              dbName ?? ""
                            )}/${encodeURIComponent(doc.id ?? "")}`
                          )
                        }
                        sx={{ cursor: "pointer", color: Colors.darkPurple }}
                      >
                        {doc.value.name || "Untitled Dataset"}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        ID: {doc.id}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </>
      )}
    </Box>
  );
};

export default NewDatasetPage;
