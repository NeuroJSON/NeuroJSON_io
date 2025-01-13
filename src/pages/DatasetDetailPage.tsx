import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { fetchDocumentById } from "../services/couchDbService";
import { Box, Typography, CircularProgress, Alert, Button } from "@mui/material";
import ReactJson from "react-json-view";

const DatasetDetailPage: React.FC = () => {
  const { dbName, docId } = useParams<{ dbName: string; docId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);
        if (dbName && docId) {
          const data = await fetchDocumentById(dbName, docId);
          setDocument(data);
        }
      } catch (err) {
        console.error("Error fetching document:", err);
        setError("Failed to load dataset details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dbName, docId]);

  if (loading) {
    return (
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
    );
  }

  if (error) {
    return (
      <Box sx={{ textAlign: "center", padding: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ padding: 4 }}>
      {/* Back Button */}
      <Button
        variant="contained"
        onClick={() => navigate(-1)} // Navigates back to the previous page
        sx={{ marginBottom: 2 }}
      >
        Back
      </Button>

      <Typography variant="h4" gutterBottom>
        Dataset: {docId}
      </Typography>

      <Box
        sx={{
          backgroundColor: "#f5f5f5",
          padding: 2,
          borderRadius: "8px",
          overflowX: "auto",
          boxShadow: "0px 4px 6px rgba(0, 0, 0, 0.1)", // Add some shadow for better UI
        }}
      >
        {/* Check if document is available */}
        {document ? (
          <ReactJson
            src={document}
            name={false}
            enableClipboard={true}
            displayDataTypes={false}
            displayObjectSize={true}
            collapsed={2} // Collapse nested levels by default
            style={{ fontSize: "14px", fontFamily: "monospace" }}
          />
        ) : (
          <Typography sx={{ textAlign: "center", marginTop: 4 }}>
            No data available for this dataset.
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default DatasetDetailPage;

