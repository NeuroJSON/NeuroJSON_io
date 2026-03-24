import { Folder, Visibility, Add, Delete, Edit } from "@mui/icons-material";
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
  Checkbox,
  FormControlLabel,
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
  updateCollection,
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
  // edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<{
    id: number;
    name: string;
    description: string;
    is_public: boolean;
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

  // Open edit dialog
  const handleEditClick = (collection: any) => {
    setEditingCollection({
      id: collection.id,
      name: collection.name,
      description: collection.description || "",
      is_public: collection.is_public || false,
    });
    setEditDialogOpen(true);
  };

  // Submit edit
  const handleEditSubmit = async () => {
    if (!editingCollection || !editingCollection.name.trim()) return;

    try {
      await dispatch(
        updateCollection({
          collectionId: editingCollection.id,
          name: editingCollection.name.trim(),
          description: editingCollection.description.trim() || undefined,
          is_public: editingCollection.is_public,
        })
      ).unwrap();

      // Refetch collections
      dispatch(getUserCollections());

      handleEditClose();
    } catch (error) {
      console.error("Error updating collection:", error);
    }
  };

  // Close edit dialog
  const handleEditClose = () => {
    setEditDialogOpen(false);
    setEditingCollection(null);
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
            background: `linear-gradient(
              135deg,
              ${Colors.purple} 0%,
              ${Colors.secondaryPurple} 100%
            )`,
            color: "#fff",
            textTransform: "none",

            // keep gradient on hover
            "&:hover": {
              background: `linear-gradient(
                135deg,
                ${Colors.secondaryPurple} 0%,
                ${Colors.purple} 100%
              )`,
            },
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
                          <Folder
                            sx={{ color: Colors.darkGreen, fontSize: 20 }}
                          />
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
                    {/* Edit button */}
                    <IconButton
                      size="small"
                      onClick={() => handleEditClick(collection)}
                      sx={{
                        color: Colors.purple,
                        "&:hover": {
                          backgroundColor: "rgba(128, 90, 213, 0.1)",
                        },
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    {/* view button */}
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

      {/* Create Collection Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCreateClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: Colors.darkPurple }}>
          Create New Collection
        </DialogTitle>
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
            sx={{
              mb: 2,
              mt: 1,
              // focused label color
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },

              // focused outline color
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },

              // optional: hover outline color
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
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
            sx={{
              // focused label color
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },

              // focused outline color
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },

              // optional: hover outline color
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleCreateClose}
            sx={{
              color: Colors.purple,
              "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.08)" }, // optional
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!newCollectionName.trim() || isCreating}
            sx={{
              background: `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`,
              color: "#fff",
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`,
              },
              "&.Mui-disabled": {
                background: "linear-gradient(135deg, #e0e0e0 0%, #cfcfcf 100%)",
                color: "#9e9e9e",
                cursor: "not-allowed",
                boxShadow: "none",
              },
            }}
          >
            {isCreating ? <CircularProgress size={20} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteCancel}>
        <DialogTitle sx={{ color: Colors.darkPurple }}>
          Delete Collection?
        </DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{collectionToDelete?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            The datasets will not be deleted, only the collection.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDeleteCancel}
            sx={{
              color: Colors.purple,
              "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.08)" }, // optional
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
            {loading ? <CircularProgress size={20} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
      {/* Edit Collection Dialog */}
      <Dialog
        open={editDialogOpen}
        onClose={handleEditClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ color: Colors.darkPurple }}>
          Edit Collection
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Collection Name"
            fullWidth
            variant="outlined"
            value={editingCollection?.name || ""}
            onChange={(e) =>
              setEditingCollection(
                editingCollection
                  ? { ...editingCollection, name: e.target.value }
                  : null
              )
            }
            sx={{
              mb: 2,
              mt: 1,
              // focused label color
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },
              // focused outline color
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
              // optional: hover outline color
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
          <TextField
            margin="dense"
            label="Description (optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={editingCollection?.description || ""}
            onChange={(e) =>
              setEditingCollection(
                editingCollection
                  ? { ...editingCollection, description: e.target.value }
                  : null
              )
            }
            sx={{
              mb: 2,
              // focused label color
              "& .MuiInputLabel-root.Mui-focused": {
                color: Colors.purple,
              },

              // focused outline color
              "& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },

              // optional: hover outline color
              "& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline":
                {
                  borderColor: Colors.purple,
                },
            }}
          />
          {/* <Box display="flex" alignItems="center" gap={1}>
            <input
              type="checkbox"
              id="is_public"
              checked={editingCollection?.is_public || false}
              onChange={(e) =>
                setEditingCollection(
                  editingCollection
                    ? { ...editingCollection, is_public: e.target.checked }
                    : null
                )
              }
              style={{ width: 18, height: 18, cursor: "pointer" }}
            />
            <label
              htmlFor="is_public"
              style={{ cursor: "pointer", fontSize: "0.875rem" }}
            >
              Make this collection public
            </label>
          </Box> */}
          {/* ✅ Replace HTML checkbox with Material-UI Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={editingCollection?.is_public || false}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setEditingCollection(
                    editingCollection
                      ? { ...editingCollection, is_public: e.target.checked }
                      : null
                  )
                }
                sx={{
                  color: Colors.purple,
                  "&.Mui-checked": {
                    color: Colors.purple,
                  },
                }}
              />
            }
            label="Make this collection public"
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            Public collections can be viewed by others (feature coming soon)
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleEditClose}
            sx={{
              color: Colors.purple,
              "&:hover": { backgroundColor: "rgba(128, 90, 213, 0.08)" },
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEditSubmit}
            variant="contained"
            disabled={!editingCollection?.name.trim() || loading}
            sx={{
              background: `linear-gradient(135deg, ${Colors.rose} 0%, ${Colors.purple} 100%)`,
              color: "#fff",
              "&:hover": {
                background: `linear-gradient(135deg, ${Colors.purple} 0%, ${Colors.rose} 100%)`,
              },
              "&.Mui-disabled": {
                background: "linear-gradient(135deg, #e0e0e0 0%, #cfcfcf 100%)",
                color: "#9e9e9e",
                cursor: "not-allowed",
                boxShadow: "none",
              },
            }}
          >
            {loading ? <CircularProgress size={20} /> : "Save Changes"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CollectionsTab;
