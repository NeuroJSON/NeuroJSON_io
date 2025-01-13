import React, { useEffect, useCallback, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { loadPaginatedData, resetData } from "../redux/neurojson/neurojson.slice";
import { RootState, AppDispatch } from "../redux/store";
import {
  Box,
  Button,
  Typography,
  CircularProgress,
  Alert,
} from "@mui/material";
import ReactJson from "react-json-view"; // Import the JSON viewer library

const DatasetPage: React.FC = () => {
  const { dbName } = useParams<{ dbName: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading, error, hasMore, offset } = useSelector((state: RootState) => state.neurojson);
  const limit = 100; // Number of items to load per page

  const [selectedDataset, setSelectedDataset] = useState<any>(null); // State for selected dataset

  // Fetch initial data when the component mounts
  useEffect(() => {
    if (dbName) {
      console.log("Triggering initial data fetch for dbName:", dbName);
      dispatch(resetData());
      dispatch(loadPaginatedData({ dbName, offset: 0, limit }));
    }
  }, [dbName, dispatch]);

  // Log updated data for debugging
  useEffect(() => {
    console.log("Updated data:", data);
  }, [data]);

  // Load more data when scrolling near the bottom
  const loadMoreData = useCallback(() => {
    if (!loading && hasMore && dbName) {
      console.log("Loading more data:", { dbName, offset, limit });
      dispatch(loadPaginatedData({ dbName, offset, limit }));
    }
  }, [loading, hasMore, dbName, offset, dispatch]);

  // Safeguard: Ensure data is an array
  const validData = Array.isArray(data) ? data : [];

  // Log state outside of rendering for debugging
  if (loading) console.log("Loading status:", loading);
  if (error) console.log("Error:", error);
  if (!loading && validData.length === 0) console.log("No datasets found for this database.");

  return (
    <Box sx={{ padding: 4 }}>
      <Typography variant="h4" gutterBottom>
        Datasets in {dbName}
      </Typography>

      {/* Render loading indicator */}
      {loading && validData.length === 0 && (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <CircularProgress />
        </Box>
      )}

      {/* Render error message */}
      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Render datasets */}
      {validData.length > 0 ? (
        <>
          <Box sx={{ marginBottom: 2 }}>
            {validData.map((dataset, index) => (
              <Button
                key={dataset._id || index}
                variant="outlined"
                onClick={() => navigate(`/databases/${dbName}/${dataset._id}`)} // Navigate to DatasetDetailPage
                sx={{
                  display: "block",
                  textAlign: "left",
                  width: "100%",
                  marginBottom: "8px",
                }}
              >
                {dataset._id}
              </Button>
            ))}
          </Box>

          {/* Load more datasets */}
          {hasMore && (
            <Button
              variant="contained"
              onClick={loadMoreData}
              sx={{ marginTop: 2 }}
              disabled={loading}
            >
              {loading ? "Loading..." : "Load More"}
            </Button>
          )}

          {/* Display the selected dataset details as a JSON tree */}
          {selectedDataset && (
            <Box sx={{ marginTop: 4 }}>
              <Typography variant="h5" gutterBottom>
                Selected Dataset Details
              </Typography>
              <ReactJson
                src={selectedDataset} // Show selected dataset
                name={false}
                collapsed={2} // Collapse levels by default
                enableClipboard={true}
                displayDataTypes={false}
                theme="monokai"
              />
            </Box>
          )}
        </>
      ) : (
        // Render "No datasets found" message
        !loading && (
          <Typography sx={{ textAlign: "center", mt: 4 }}>
            No datasets found for this database.
          </Typography>
        )
      )}
    </Box>
  );
};

export default DatasetPage;

