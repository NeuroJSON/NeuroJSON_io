import { RateReview } from "@mui/icons-material";
import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ReviewListItem,
  ReviewService,
  SubmissionStatus,
} from "services/review.service";
import { formatBytes } from "utils/formatBytes";

// Reviewer queue (shown only to reviewers). Pending = oldest first.
const FILTERS: { value: SubmissionStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "changes_requested", label: "Changes requested" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const formatDate = (d: string | null) =>
  d
    ? new Date(d).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "—";

const ReviewTab: React.FC = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SubmissionStatus>("pending");
  const [rows, setRows] = useState<ReviewListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    ReviewService.list(status)
      .then(setRows)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [status]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review queue
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Datasets submitted for review. Open one to read it and record a
        decision.
      </Typography>

      <Tabs
        value={status}
        onChange={(_, v) => setStatus(v)}
        variant="scrollable"
        sx={{
          mb: 2,
          "& .MuiTab-root.Mui-selected": { color: Colors.purple },
          "& .MuiTabs-indicator": { backgroundColor: Colors.purple },
        }}
      >
        {FILTERS.map((f) => (
          <Tab key={f.value} value={f.value} label={f.label} />
        ))}
      </Tabs>

      {loading ? (
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : rows.length === 0 ? (
        <Box textAlign="center" py={6}>
          <RateReview sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            Nothing here right now.
          </Typography>
        </Box>
      ) : (
        <Paper variant="outlined">
          <List>
            {rows.map((r, i) => (
              <React.Fragment key={r.submission_id}>
                {i > 0 && <Divider />}
                <ListItem
                  onClick={() => navigate(`/reviews/${r.submission_id}`)}
                  sx={{
                    py: 2,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  <ListItemText
                    primary={
                      <Box
                        display="flex"
                        alignItems="center"
                        gap={1}
                        flexWrap="wrap"
                      >
                        <Typography
                          variant="subtitle1"
                          fontWeight="medium"
                          sx={{ color: Colors.purple }}
                        >
                          {r.dataset_name || "(unnamed dataset)"}
                        </Typography>
                        {r.raw_zip_size != null && (
                          <Chip
                            label={`ZIP · ${formatBytes(
                              Number(r.raw_zip_size)
                            )}`}
                            size="small"
                            sx={{ height: 20 }}
                          />
                        )}
                        {r.is_own && (
                          <Chip
                            label="Your upload"
                            size="small"
                            variant="outlined"
                            sx={{ height: 20 }}
                          />
                        )}
                      </Box>
                    }
                    secondary={`${r.owner_username} (${
                      r.owner_email
                    }) · submitted ${formatDate(r.submitted_at)}${
                      r.reviewed_at
                        ? ` · reviewed ${formatDate(r.reviewed_at)}`
                        : ""
                    }`}
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default ReviewTab;
