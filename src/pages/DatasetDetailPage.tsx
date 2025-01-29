import { fetchDocumentById } from "../services/couchDb.service";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  Card,
  CardContent,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import ReactJson from "react-json-view";
import { useParams, useNavigate } from "react-router-dom";

interface ExternalDataLink {
  name: string;
  size: string;
  path: string;
  url: string;
}

const DatasetDetailPage: React.FC = () => {
  const { dbName, docId } = useParams<{ dbName: string; docId: string }>();
  const navigate = useNavigate();
  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [externalLinks, setExternalLinks] = useState<ExternalDataLink[]>([]);

  // Recursive function to find `_DataLink_`
const extractDataLinks = (obj: any, path: string): ExternalDataLink[] => {
	const links: ExternalDataLink[] = [];
  
	if (typeof obj === "object" && obj !== null) {
	  for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
		  if (key === "_DataLink_" && typeof obj[key] === "string") {
			// Use regex to remove anything starting from ':$' (non-greedy)
			let correctedUrl = obj[key].replace(/:\$.*$/, ""); // Replace `:$<anything>` with ''
  
			const sizeMatch = obj[key].match(/size=(\d+)/); // Extract size from the link
			const size = sizeMatch
			  ? `${(parseInt(sizeMatch[1], 10) / 1024 / 1024).toFixed(2)} MB`
			  : "Unknown Size";
  
			const subMatch = path.match(/sub-\d+/); // Match the sub-field path
			const subPath = subMatch ? subMatch[0] : "Unknown Sub";
  
			links.push({
			  name: `NIFTIData (${size}) [/${subPath}]`,
			  size,
			  path: subPath,
			  url: correctedUrl, // Use the corrected URL
			});
		  } else if (typeof obj[key] === "object") {
			links.push(...extractDataLinks(obj[key], `${path}/${key}`));
		  }
		}
	  }
	}
  
	return links;
  };
  

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        setLoading(true);
        if (dbName && docId) {
          const data = await fetchDocumentById(dbName, docId);
          setDocument(data);

          // Extract external links
          const links = extractDataLinks(data, "");
          setExternalLinks(links);
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

      {/* External Data Section */}
      {externalLinks.length > 0 && (
        <Box sx={{ marginTop: 4 }}>
          <Typography variant="h5" gutterBottom>
            External Data ({externalLinks.length} links)
          </Typography>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
              gap: 2,
            }}
          >
            {externalLinks.map((link, index) => (
              <Card
                key={index}
                sx={{
                  border: "1px solid #ddd",
                  borderRadius: "8px",
                  padding: 2,
                  backgroundColor: "#f9f9f9",
                }}
              >
                <CardContent>
                  <Typography>{link.name}</Typography>
                  <Box sx={{ marginTop: 2, display: "flex", gap: 1 }}>
                    <Button
                      variant="contained"
                      size="small"
                      onClick={() => window.open(link.url, "_blank")}
                    >
                      Download
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => console.log("Preview", link.url)}
                    >
                      Preview
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => console.log("URL", link.url)}
                    >
                      URL
                    </Button>
                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      onClick={() => console.log("Close", link.url)}
                    >
                      Close
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default DatasetDetailPage;
