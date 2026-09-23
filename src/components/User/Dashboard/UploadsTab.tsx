import { CloudUpload, Edit, Visibility } from "@mui/icons-material";
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Typography,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UploadRecord, UploadService } from "services/upload.service";

const STATUS_CHIP: Record<
  UploadRecord["status"],
  {
    label: string;
    color?: "default" | "info" | "warning" | "success" | "error";
    sx?: object;
  }
> = {
  // Pending uses the theme purple (not MUI's default blue).
  pending: {
    label: "Pending review",
    sx: { backgroundColor: Colors.purple, color: Colors.white },
  },
  changes_requested: { label: "Changes requested", color: "warning" },
  approved: { label: "Approved — awaiting promotion", color: "info" },
  promoted: { label: "Promoted", color: "success" },
  rejected: { label: "Rejected", color: "error" },
};

const UploadsTab: React.FC = () => {
  const navigate = useNavigate();
  const [rows, setRows] = useState<UploadRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    UploadService.listMine()
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }
  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            My Uploads
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Datasets you have submitted for review.
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<CloudUpload />}
          onClick={() => navigate("/upload")}
          sx={{
            backgroundColor: Colors.purple,
            "&:hover": { backgroundColor: Colors.secondaryPurple },
          }}
        >
          New upload
        </Button>
      </Box>

      {rows.length === 0 ? (
        <Box textAlign="center" py={6}>
          <CloudUpload sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No uploads yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Datasets you submit for review will appear here.
          </Typography>
        </Box>
      ) : (
        <Paper variant="outlined">
          <List>
            {rows.map((r, index) => {
              const chip = STATUS_CHIP[r.status];
              return (
                <React.Fragment key={r.dataset_id}>
                  {index > 0 && <Divider />}
                  <ListItem
                    sx={{
                      py: 2,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <ListItemText
                        primary={
                          <Box display="flex" alignItems="center" gap={1}>
                            <Typography variant="subtitle1" fontWeight="medium">
                              {r.dataset_name || r.dataset_id}
                            </Typography>
                            <Chip
                              label={r.dataset_id}
                              size="small"
                              sx={{ height: 20 }}
                            />
                            <Chip
                              label={chip.label}
                              color={chip.color}
                              size="small"
                              sx={{ height: 20, ...(chip.sx || {}) }}
                            />
                          </Box>
                        }
                        secondary={`Submitted ${formatDate(r.created_at)}${
                          r.updated_at && r.updated_at !== r.created_at
                            ? ` · updated ${formatDate(r.updated_at)}`
                            : ""
                        }`}
                      />
                      {r.review_note && (
                        <Alert
                          severity={
                            r.status === "rejected"
                              ? "error"
                              : r.status === "changes_requested"
                              ? "warning"
                              : "info"
                          }
                          sx={{ mt: 1, fontSize: "0.85rem", py: 0 }}
                        >
                          {r.review_note}
                        </Alert>
                      )}
                    </Box>
                    <Box display="flex" gap={1}>
                      {r.status === "promoted" && r.promoted_db && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Visibility />}
                          onClick={() =>
                            navigate(`/db/${r.promoted_db}/${r.dataset_id}`)
                          }
                          sx={{
                            color: Colors.darkGreen,
                            borderColor: Colors.darkGreen,
                          }}
                        >
                          View
                        </Button>
                      )}
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<Edit />}
                        onClick={() =>
                          navigate(`/upload?datasetId=${r.dataset_id}`)
                        }
                        sx={{
                          color: Colors.purple,
                          borderColor: Colors.purple,
                          "&:hover": {
                            borderColor: Colors.secondaryPurple,
                            backgroundColor: "rgba(128, 90, 213, 0.1)",
                          },
                        }}
                      >
                        Update
                      </Button>
                    </Box>
                  </ListItem>
                </React.Fragment>
              );
            })}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default UploadsTab;
