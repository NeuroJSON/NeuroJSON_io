import { Bookmark, Visibility } from "@mui/icons-material";
import {
  Box,
  Typography,
  Paper,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  Chip,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getUserSavedDatasets } from "redux/activities/activities.action";
import {
  selectUserSavedDatasets,
  selectActivitiesLoading,
  selectActivitiesError,
} from "redux/activities/activities.selector";

interface SavedDatasetsTabProps {
  userId: number;
}

const SavedDatasetsTab: React.FC<SavedDatasetsTabProps> = ({ userId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Get real data from Redux
  const savedDatasets = useAppSelector(selectUserSavedDatasets);
  const loading = useAppSelector(selectActivitiesLoading);
  const error = useAppSelector(selectActivitiesError);

  useEffect(() => {
    dispatch(getUserSavedDatasets());
  }, [dispatch]);

  const handleViewDataset = (dbName: string, datasetId: string) => {
    navigate(`/db/${dbName}/${datasetId}`);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

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

  if (savedDatasets.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Bookmark sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Saved Datasets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Datasets you save will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Saved Datasets
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        You have {savedDatasets.length} saved{" "}
        {savedDatasets.length === 1 ? "dataset" : "datasets"}
      </Typography>

      <Paper variant="outlined">
        <List>
          {savedDatasets.map((dataset, index) => (
            <React.Fragment key={dataset.id}>
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
                          {dataset.ds_id}
                        </Typography>
                        <Chip
                          label={dataset.couch_db}
                          size="small"
                          sx={{ height: 20 }}
                        />
                      </Box>
                    }
                    secondary={`Saved on ${formatDate(dataset.saved_at)}`}
                  />
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<Visibility />}
                  onClick={() =>
                    handleViewDataset(dataset.couch_db, dataset.ds_id)
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
                  View
                </Button>
              </ListItem>
            </React.Fragment>
          ))}
        </List>
      </Paper>
    </Box>
  );
};

export default SavedDatasetsTab;
