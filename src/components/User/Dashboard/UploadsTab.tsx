import { CloudUpload, OpenInNew, Visibility } from "@mui/icons-material";
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
import { formatBytes } from "utils/formatBytes";

type SubStatus = Exclude<UploadRecord["status"], null>;

const STATUS_CHIP: Record<
  SubStatus,
  {
    label: string;
    color?: "default" | "info" | "warning" | "success" | "error";
    sx?: object;
  }
> = {
  draft: { label: "Draft", color: "default" },
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

// Raw ZIP state of the latest version (null = no raw data → no chip).
const rawChip = (r: UploadRecord) => {
  if (r.raw_upload_active) {
    return {
      label: "ZIP uploading",
      sx: { color: Colors.purple, borderColor: Colors.purple },
      variant: "outlined" as const,
    };
  }
  if (r.raw_zip_size != null) {
    return { label: `ZIP · ${formatBytes(Number(r.raw_zip_size))}` };
  }
  if (r.raw_zip_expected) {
    return {
      label: "ZIP missing",
      color: "warning" as const,
      variant: "outlined" as const,
    };
  }
  return null;
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

  const formatDate = (d: string | null) =>
    d
      ? new Date(d).toLocaleDateString("en-US", {
          year: "numeric",
          month: "short",
          day: "numeric",
        })
      : "";

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
              const chip = r.status ? STATUS_CHIP[r.status] : null;
              return (
                <React.Fragment key={r.internal_id}>
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
                            <Typography
                              variant="subtitle1"
                              fontWeight="medium"
                              onClick={() =>
                                navigate(`/uploads/${r.internal_id}`)
                              }
                              sx={{
                                cursor: "pointer",
                                color: Colors.purple,
                                "&:hover": { textDecoration: "underline" },
                              }}
                            >
                              {r.dataset_name || "(unnamed dataset)"}
                            </Typography>
                            <Chip
                              label={r.dataset_id || "ID: not yet assigned"}
                              size="small"
                              sx={{ height: 20 }}
                            />
                            {chip && (
                              <Chip
                                label={chip.label}
                                color={chip.color}
                                size="small"
                                sx={{ height: 20, ...(chip.sx || {}) }}
                              />
                            )}
                            {(() => {
                              const raw = rawChip(r);
                              return (
                                raw && (
                                  <Chip
                                    label={raw.label}
                                    size="small"
                                    variant={raw.variant}
                                    color={raw.color}
                                    sx={{ height: 20, ...(raw.sx || {}) }}
                                  />
                                )
                              );
                            })()}
                          </Box>
                        }
                        secondary={`Submitted ${formatDate(r.created_at)}${
                          r.updated_at && r.updated_at !== r.created_at
                            ? ` · updated ${formatDate(r.updated_at)}`
                            : ""
                        }`}
                      />
                      {r.status === "changes_requested" && (
                        <Typography
                          variant="body2"
                          sx={{
                            mt: 0.5,
                            color: Colors.darkOrange,
                            fontWeight: 600,
                          }}
                        >
                          Action needed: update and resubmit for review
                        </Typography>
                      )}
                    </Box>
                    <Box display="flex" gap={1}>
                      {r.status === "promoted" && r.promoted_db && r.dataset_id && (
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
                      {/* All actions (Update, Submit, settings) live on the
                          upload detail page, which also shows review state. */}
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<OpenInNew />}
                        onClick={() => navigate(`/uploads/${r.internal_id}`)}
                        sx={{
                          color: Colors.purple,
                          borderColor: Colors.purple,
                          "&:hover": {
                            borderColor: Colors.secondaryPurple,
                            backgroundColor: "rgba(128, 90, 213, 0.1)",
                          },
                        }}
                      >
                        Open
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
