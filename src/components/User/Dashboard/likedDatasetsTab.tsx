import { Favorite, Visibility } from "@mui/icons-material";
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

// You'll need to create these actions
// import { getUserLikedDatasets } from "redux/activities/activities.action";
// import { selectUserLikedDatasets } from "redux/activities/activities.selector";

interface LikedDatasetsTabProps {
  userId: number;
}

const LikedDatasetsTab: React.FC<LikedDatasetsTabProps> = ({ userId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // Temporary mock data - replace with actual Redux selector
  const likedDatasets = [
    {
      id: 1,
      couch_db: "openneuro",
      ds_id: "ds000001",
      liked_at: "2024-01-10T08:15:00Z",
    },
    {
      id: 2,
      couch_db: "openneuro",
      ds_id: "ds000003",
      liked_at: "2024-01-18T16:45:00Z",
    },
  ];
  const loading = false;
  const error = null;

  useEffect(() => {
    // Fetch user's liked datasets
    // dispatch(getUserLikedDatasets(userId));
  }, [userId, dispatch]);

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

  if (likedDatasets.length === 0) {
    return (
      <Box textAlign="center" py={6}>
        <Favorite sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No Liked Datasets
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Datasets you like will appear here
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Liked Datasets
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        You have liked {likedDatasets.length}{" "}
        {likedDatasets.length === 1 ? "dataset" : "datasets"}
      </Typography>

      <Paper variant="outlined">
        <List>
          {likedDatasets.map((dataset, index) => (
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
                    secondary={`Liked on ${formatDate(dataset.liked_at)}`}
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

export default LikedDatasetsTab;
