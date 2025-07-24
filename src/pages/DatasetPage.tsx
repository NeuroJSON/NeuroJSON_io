import {
  fetchDbInfo,
  loadPaginatedData,
} from "../redux/neurojson/neurojson.action";
import { Row } from "../redux/neurojson/types/neurojson.interface";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Link,
  Chip,
  Stack,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import RoutesEnum from "types/routes.enum";

const DatasetPage: React.FC = () => {
  const navigate = useNavigate();
  const { dbName } = useParams<{ dbName: string }>();
  const dispatch = useAppDispatch();
  const { loading, error, data, limit, hasMore } = useAppSelector(
    (state: { neurojson: any }) => state.neurojson
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const totalPages = Math.ceil(limit / pageSize);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (dbName) {
      dispatch(fetchDbInfo(dbName.toLowerCase()));
      dispatch(
        loadPaginatedData({
          dbName: dbName.toLowerCase(),
          offset: (currentPage - 1) * pageSize,
          limit: pageSize,
        })
      );
    }
  }, [dbName, dispatch, currentPage, pageSize]);

  const handlePageChange = (page: number) => {
    if (!dbName || loading) return;

    setCurrentPage(page);
    dispatch(
      loadPaginatedData({
        dbName: dbName.toLowerCase(),
        offset: (page - 1) * pageSize,
        limit: pageSize,
      })
    );
  };

  const handlePageSizeChange = (event: any) => {
    setPageSize(event.target.value);
    setCurrentPage(1); // Reset offset when changing page size
  };

  const getVisiblePageNumbers = () => {
    const visiblePages: (number | string)[] = [];
    const maxVisible = 6;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) visiblePages.push(i);
    } else {
      const start = Math.max(2, currentPage - 2);
      const end = Math.min(totalPages - 1, currentPage + 2);

      visiblePages.push(1);
      if (start > 2) visiblePages.push("...");

      for (let i = start; i <= end; i++) visiblePages.push(i);
      if (end < totalPages - 1) visiblePages.push("...");

      visiblePages.push(totalPages);
    }

    return visiblePages;
  };

  const handlePrevNextPage = (direction: "prev" | "next") => {
    if (direction === "prev" && currentPage > 1) {
      handlePageChange(currentPage - 1);
    } else if (direction === "next" && currentPage < totalPages) {
      handlePageChange(currentPage + 1);
    }
  };

  const filteredData = data.filter((doc: Row) =>
    (doc.value.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ padding: { xs: 2, md: 4 } }}>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 2,
          mb: 3,
        }}
      >
        {/* Left: Title */}
        <Typography
          variant="h1"
          gutterBottom
          sx={{
            color: Colors.green,
            fontWeight: 700,
            fontSize: "2rem",
          }}
        >
          Database: {dbName || "N/A"}
        </Typography>

        {/* Right: Total + Dropdown + Pagination */}
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 3,
          }}
        >
          {/* Left: Total datasets */}
          <Typography
            sx={{
              fontWeight: 600,
              fontSize: "1.2rem",
              color: Colors.white,
            }}
          >
            Total datasets: {limit}
          </Typography>

          {/* Search in page input */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Typography
              sx={{ fontWeight: 500, fontSize: "1rem", color: Colors.white }}
            >
              Search in page:
            </Typography>
            <input
              type="text"
              placeholder="Filter results in this page"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "4px",
                border: `2px solid ${Colors.primary.main}`,
                fontSize: "0.95rem",
                minWidth: "200px",
              }}
            />
          </Box>

          {/* Right: Label + Select in one line */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
            }}
          ></Box>
          <Typography
            sx={{
              fontWeight: 500,
              fontSize: "1rem",
              color: Colors.white,
              minWidth: "150px",
            }}
          >
            Dataset per page:
          </Typography>
          {/* Dataset per page dropdown */}
          <FormControl
            size="small"
            sx={{
              minWidth: 160,
              backgroundColor: Colors.white,
              borderRadius: 1,
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              "& .MuiInputLabel-root": {
                color: Colors.textSecondary,
                fontWeight: 500,
                zIndex: 1, // ✅ ensures label is above the select box
              },
              "& .MuiOutlinedInput-root": {
                "& fieldset": {
                  borderColor: Colors.primary.main,
                },
              },
            }}
          >
            <Select
              value={pageSize}
              label="Dataset per page"
              onChange={handlePageSizeChange}
              sx={{
                fontWeight: 500,
                "& .MuiSelect-icon": {
                  color: Colors.primary.main,
                },
              }}
            >
              <MenuItem value={10}>10</MenuItem>
              <MenuItem value={25}>25</MenuItem>
              <MenuItem value={50}>50</MenuItem>
              <MenuItem value={100}>100</MenuItem>
            </Select>
          </FormControl>

          {/* Pagination buttons */}
          {!loading && (
            <Box
              sx={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Button
                onClick={() => handlePrevNextPage("prev")}
                disabled={currentPage === 1}
                sx={{
                  minWidth: "36px",
                  backgroundColor: Colors.primary.main,
                  color: "white",
                  "&:disabled": { backgroundColor: "#ccc" },
                }}
              >
                &lt;
              </Button>

              {getVisiblePageNumbers().map((item, idx) =>
                item === "..." ? (
                  <Typography
                    key={idx}
                    sx={{
                      px: 1.5,
                      fontSize: "1rem",
                      color: Colors.textSecondary,
                    }}
                  >
                    ...
                  </Typography>
                ) : (
                  <Button
                    key={item}
                    variant={item === currentPage ? "contained" : "outlined"}
                    onClick={() => handlePageChange(Number(item))}
                    sx={{
                      minWidth: "36px",
                      padding: "4px 8px",
                      fontWeight: item === currentPage ? "bold" : "normal",
                      backgroundColor:
                        item === currentPage ? Colors.primary.main : "white",
                      color:
                        item === currentPage ? "white" : Colors.primary.main,
                      borderColor: Colors.primary.main,
                    }}
                  >
                    {item}
                  </Button>
                )
              )}

              <Button
                onClick={() => handlePrevNextPage("next")}
                disabled={currentPage === totalPages}
                sx={{
                  minWidth: "36px",
                  backgroundColor: Colors.primary.main,
                  color: "white",
                  "&:disabled": { backgroundColor: "#ccc" },
                }}
              >
                &gt;
              </Button>
            </Box>
          )}
        </Box>
      </Box>

      {error && (
        <Alert
          severity="error"
          sx={{
            marginBottom: 2,
            color: Colors.error,
          }}
        >
          {error}
        </Alert>
      )}

      {loading && (
        <CircularProgress
          sx={{
            display: "block",
            margin: "16px auto",
            color: Colors.primary.main,
          }}
        />
      )}

      {!loading && !error && data.length > 0 && (
        <Grid container spacing={3}>
          {filteredData.map((doc: any, index: number) => {
            const datasetIndex = (currentPage - 1) * pageSize + index + 1;
            return (
              <Grid item xs={12} sm={6} key={doc.id}>
                <Card
                  sx={{
                    position: "relative", // ✅ allows absolute positioning of the number
                    backgroundColor: Colors.white,
                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Dataset index number on top-right corner */}
                  <Box
                    sx={{
                      position: "absolute",
                      bottom: 8,
                      right: 12,
                      fontSize: "1rem",
                      fontWeight: "bold",
                      color: Colors.darkPurple,
                    }}
                  >
                    {datasetIndex}
                  </Box>
                  <CardContent sx={{ flex: 1 }}>
                    <Button
                      onClick={() =>
                        navigate(
                          `${RoutesEnum.DATABASES}/${encodeURIComponent(
                            dbName ?? ""
                          )}/${encodeURIComponent(doc.id ?? "")}`
                        )
                      }
                      sx={{
                        fontSize: "1.25rem",
                        margin: 0,
                        color: Colors.darkPurple,
                        textTransform: "none",
                        justifyContent: "flex-start",
                      }}
                    >
                      {doc.value.name || "Untitled"}
                    </Button>

                    <Typography
                      color={Colors.textSecondary}
                      variant="body2"
                      sx={{ mb: 2, marginLeft: 1 }}
                    >
                      ID: {doc.id}
                    </Typography>

                    <Stack spacing={2} margin={1}>
                      <Stack
                        direction="row"
                        spacing={1}
                        flexWrap="wrap"
                        gap={1}
                      >
                        {doc.value.subj && (
                          <Chip
                            label={`${doc.value.subj.length} subjects`}
                            size="small"
                            sx={{
                              backgroundColor: Colors.purple,
                              color: Colors.white,
                            }}
                          />
                        )}
                        {doc.value.modality &&
                          doc.value.modality.map((mod: string) => (
                            <Chip
                              key={mod}
                              label={mod}
                              size="small"
                              sx={{
                                backgroundColor: Colors.purpleGrey,
                                color: Colors.white,
                              }}
                            />
                          ))}
                      </Stack>

                      <Typography variant="body2" color={Colors.textSecondary}>
                        <strong>Summary:</strong>{" "}
                        {doc.value.readme || "No description available"}
                      </Typography>

                      <Typography variant="body2" color={Colors.textPrimary}>
                        <strong>Authors:</strong>{" "}
                        {Array.isArray(doc.value.info?.Authors)
                          ? doc.value.info.Authors.join(", ")
                          : doc.value.info?.Authors || "Unknown"}
                      </Typography>

                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="body2" color={Colors.textPrimary}>
                          <strong>Size:</strong>{" "}
                          {doc.value.length
                            ? `${(doc.value.length / 1024 / 1024).toFixed(
                                2
                              )} MB`
                            : "Unknown"}
                        </Typography>

                        {doc.value.info?.DatasetDOI && (
                          <Link
                            href={doc.value.info.DatasetDOI}
                            target="_blank"
                            rel="noopener"
                          >
                            <Chip
                              label="DOI"
                              size="small"
                              clickable
                              sx={{
                                backgroundColor: Colors.accent,
                                color: Colors.white,
                              }}
                            />
                          </Link>
                        )}
                      </Stack>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {!loading && !error && data.length === 0 && (
        <Typography
          variant="body1"
          color={Colors.textSecondary}
          align="center"
          sx={{ mt: 4 }}
        >
          No database information available.
        </Typography>
      )}
    </Box>
  );
};

export default DatasetPage;
