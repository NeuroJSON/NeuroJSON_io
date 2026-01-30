import {
  Home,
  Folder,
  Visibility,
  Delete,
  ArrowBack,
} from "@mui/icons-material";
import {
  Box,
  Container,
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
  IconButton,
  Breadcrumbs,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AuthSelector } from "redux/auth/auth.selector";
import {
  getCollection,
  removeDatasetFromCollection,
} from "redux/collections/collections.action";
import {
  selectCurrentCollection,
  selectCollectionsLoading,
  selectCollectionsError,
} from "redux/collections/collections.selector";

const CollectionDetailPage: React.FC = () => {
  const { collectionId } = useParams<{ collectionId: string }>();
  const { user } = useAppSelector(AuthSelector);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const collection = useAppSelector(selectCurrentCollection);
  const loading = useAppSelector(selectCollectionsLoading);
  const error = useAppSelector(selectCollectionsError);

  // ✅ Add state for delete confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [datasetToDelete, setDatasetToDelete] = React.useState<{
    id: number;
    name: string;
  } | null>(null);

  if (!user) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography sx={{ color: Colors.white }}>
          Please log in to access your dashboard.
        </Typography>
      </Container>
    );
  }

  useEffect(() => {
    if (collectionId) {
      dispatch(getCollection({ collectionId: parseInt(collectionId) }));
    }
  }, [collectionId, dispatch]);

  const handleViewDataset = (dbName: string, datasetId: string) => {
    navigate(`/db/${dbName}/${datasetId}`);
  };

  // Open delete confirmation
  const handleDeleteClick = (datasetId: number, datasetName: string) => {
    setDatasetToDelete({ id: datasetId, name: datasetName });
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!collectionId || !datasetToDelete) return;

    try {
      await dispatch(
        removeDatasetFromCollection({
          collectionId: parseInt(collectionId),
          datasetId: datasetToDelete.id,
        })
      ).unwrap();

      // Refetch collection
      dispatch(getCollection({ collectionId: parseInt(collectionId) }));

      // Close dialog
      setDeleteDialogOpen(false);
      setDatasetToDelete(null);
    } catch (error) {
      console.error("Error removing dataset:", error);
    }
  };

  // Cancel delete
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setDatasetToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && !collection) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Box display="flex" justifyContent="center" p={4}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!collection) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="warning">Collection not found</Alert>
        <Button
          onClick={() => navigate("/dashboard")}
          sx={{ mt: 2, color: Colors.white }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const datasets = collection.datasets || [];

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3, color: Colors.white }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate("/")}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.5,
            color: Colors.white,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          <Home fontSize="small" />
          Home
        </Link>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate("/dashboard")}
          sx={{
            color: Colors.white,
            textDecoration: "none",
            "&:hover": { textDecoration: "underline" },
          }}
        >
          Dashboard
        </Link>
        <Typography color={Colors.white}>{collection.name}</Typography>
      </Breadcrumbs>

      {/* Back Button */}
      <Button
        startIcon={<ArrowBack />}
        onClick={() => navigate("/dashboard")}
        sx={{ mb: 2, color: Colors.white }}
      >
        Back to Dashboard
      </Button>

      {/* Collection Header */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box
          display="flex"
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Box>
            <Box display="flex" alignItems="center" gap={2} mb={1}>
              <Folder sx={{ fontSize: 32, color: Colors.purple }} />
              <Typography variant="h4">{collection.name}</Typography>
            </Box>
            {collection.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
                {collection.description}
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              Created {formatDate(collection.created_at)} • {datasets.length}{" "}
              {datasets.length === 1 ? "dataset" : "datasets"}
            </Typography>
          </Box>
        </Box>
      </Paper>

      {/* Datasets List */}
      {datasets.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center" }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No datasets in this collection
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Add datasets to this collection from any dataset page
          </Typography>
        </Paper>
      ) : (
        <Paper variant="outlined">
          <List>
            {datasets.map((dataset, index) => (
              <React.Fragment key={dataset.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    py: 2,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    "&:hover": {
                      backgroundColor: "rgba(128, 90, 213, 0.05)",
                    },
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
                      secondary={
                        dataset.CollectionDataset?.created_at &&
                        `Added ${formatDate(
                          dataset.CollectionDataset.created_at
                        )}`
                      }
                    />
                  </Box>
                  <Box display="flex" gap={1}>
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
                    <IconButton
                      size="small"
                      onClick={() =>
                        handleDeleteClick(dataset.id, dataset.ds_id)
                      }
                      sx={{
                        color: Colors.rose,
                        "&:hover": {
                          backgroundColor: "rgba(211, 47, 47, 0.1)",
                        },
                      }}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>
      )}

      {/* Delete Dataset from Collection Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Remove Dataset from Collection?</DialogTitle>
        <DialogContent>
          <Typography>
            Remove "{datasetToDelete?.name}" from this collection?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The dataset will not be deleted from NeuroJSON, only removed from
            this collection.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              color: Colors.purple,
              "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.08)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            disabled={loading}
            sx={{
              background: `linear-gradient(
                              135deg,
                              ${Colors.rose} 0%,
                              ${Colors.purple} 100%
                            )`,
              color: "#fff",
              textTransform: "none",

              // keep gradient on hover
              "&:hover": {
                background: `linear-gradient(
                                135deg,
                                ${Colors.purple} 0%,
                                ${Colors.rose} 100%
                              )`,
              },
            }}
          >
            {loading ? <CircularProgress size={20} /> : "Remove"}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default CollectionDetailPage;
