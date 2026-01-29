import { Folder, Visibility, Add, Delete } from "@mui/icons-material";
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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";
import { Colors } from "design/theme";
import { useAppDispatch } from "hooks/useAppDispatch";
import { useAppSelector } from "hooks/useAppSelector";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  getUserCollections,
  createCollection,
  deleteCollection,
} from "redux/collections/collections.action";
import {
  selectUserCollections,
  selectCollectionsLoading,
  selectCollectionsError,
  selectIsCreatingCollection,
} from "redux/collections/collections.selector";

interface CollectionsTabProps {
  userId: number;
}

const CollectionsTab: React.FC<CollectionsTabProps> = ({ userId }) => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const collections = useAppSelector(selectUserCollections);
  const loading = useAppSelector(selectCollectionsLoading);
  const error = useAppSelector(selectCollectionsError);
  const isCreating = useAppSelector(selectIsCreatingCollection);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<{
    id: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    dispatch(getUserCollections());
  }, [dispatch]);

  const handleViewCollection = (collectionId: number) => {
    navigate(`/collections/${collectionId}`);
  };

  const handleCreateOpen = () => {
    setCreateDialogOpen(true);
  };

  const handleCreateClose = () => {
    setNewCollectionName("");
    setNewCollectionDescription("");
    setCreateDialogOpen(false);
  };

  const handleCreateSubmit = async () => {
    if (!newCollectionName.trim()) return;

    try {
      await dispatch(
        createCollection({
          name: newCollectionName.trim(),
          description: newCollectionDescription.trim() || undefined,
        })
      ).unwrap();

      handleCreateClose();
    } catch (error) {
      console.error("Error creating collection:", error);
    }
  };

  const handleDeleteClick = (collectionId: number, collectionName: string) => {
    setCollectionToDelete({ id: collectionId, name: collectionName });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!collectionToDelete) return;

    try {
      await dispatch(
        deleteCollection({ collectionId: collectionToDelete.id })
      ).unwrap();
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);

      // Refetch collections after delete
      dispatch(getUserCollections());
    } catch (error) {
      console.error("Error deleting collection:", error);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setCollectionToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && collections.length === 0) {
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
      {/* Header with Create Button */}
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Box>
          <Typography variant="h6" gutterBottom>
            My Collections
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Organize your datasets into collections
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateOpen}
          sx={{
            backgroundColor: Colors.purple,
            "&:hover": { backgroundColor: Colors.secondaryPurple },
          }}
        >
          New Collection
        </Button>
      </Box>

      {/* Empty State */}
      {collections.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Folder sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Collections Yet
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Create collections to organize your datasets
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateOpen}
            sx={{
              backgroundColor: Colors.purple,
              "&:hover": { backgroundColor: Colors.secondaryPurple },
            }}
          >
            Create Your First Collection
          </Button>
        </Box>
      ) : (
        // Collections List
        <Paper variant="outlined">
          <List>
            {collections.map((collection, index) => (
              <React.Fragment key={collection.id}>
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
                          <Folder sx={{ color: Colors.purple, fontSize: 20 }} />
                          <Typography variant="subtitle1" fontWeight="medium">
                            {collection.name}
                          </Typography>
                          <Chip
                            label={`${collection.datasets_count || 0} ${
                              collection.datasets_count === 1
                                ? "dataset"
                                : "datasets"
                            }`}
                            size="small"
                            sx={{ height: 20 }}
                          />
                        </Box>
                      }
                      secondary={
                        <>
                          {collection.description && (
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{ mt: 0.5 }}
                            >
                              {collection.description}
                            </Typography>
                          )}
                          <Typography variant="caption" color="text.secondary">
                            Created {formatDate(collection.created_at)}
                          </Typography>
                        </>
                      }
                    />
                  </Box>
                  <Box display="flex" gap={1}>
                    <Button
                      variant="outlined"
                      size="small"
                      startIcon={<Visibility />}
                      onClick={() => handleViewCollection(collection.id)}
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
                        handleDeleteClick(collection.id, collection.name)
                      }
                      sx={{
                        color: "error.main",
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

      {/* Create Collection Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCreateClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Create New Collection</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Collection Name"
            type="text"
            fullWidth
            variant="outlined"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={newCollectionDescription}
            onChange={(e) => setNewCollectionDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCreateClose}>Cancel</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!newCollectionName.trim() || isCreating}
            sx={{
              backgroundColor: Colors.purple,
              "&:hover": { backgroundColor: Colors.secondaryPurple },
            }}
          >
            {isCreating ? <CircularProgress size={20} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle>Delete Collection?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{collectionToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The datasets will not be deleted, only the collection.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollectionsTab;
