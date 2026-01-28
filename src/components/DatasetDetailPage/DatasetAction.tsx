import AddIcon from "@mui/icons-material/Add";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import CheckIcon from "@mui/icons-material/Check";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Snackbar,
  Alert,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tooltip,
} from "@mui/material";
import { Colors } from "design/theme";
import React, { useState } from "react";

interface DatasetActionsProps {
  isLiked: boolean;
  isSaved: boolean;
  likesCount: number;
  viewsCount: number;
  isLikeLoading: boolean;
  isSaveLoading: boolean;
  isAuthenticated: boolean;
  onLikeToggle: () => void;
  // onSaveToggle: () => void;
  // New collection props
  collections: Array<{ id: number; name: string; isInCollection: boolean }>;
  onCreateCollection: (name: string, description?: string) => void;
  onAddToCollection: (collectionId: number) => void;
  // onRemoveFromCollection: (collectionId: number) => void;
  isLoadingCollections: boolean;
}

const DatasetActions: React.FC<DatasetActionsProps> = ({
  isLiked,
  isSaved,
  likesCount,
  viewsCount,
  isLikeLoading,
  isSaveLoading,
  isAuthenticated,
  onLikeToggle,
  // onSaveToggle,
  // Collections props
  collections,
  onCreateCollection,
  onAddToCollection,
  // onRemoveFromCollection,
  isLoadingCollections,
}) => {
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  // Collection menu state
  const [saveMenuAnchor, setSaveMenuAnchor] = useState<null | HTMLElement>(
    null
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionDescription, setNewCollectionDescription] = useState("");
  const [showAlreadyInMessage, setShowAlreadyInMessage] = useState(false);
  const [selectedCollectionName, setSelectedCollectionName] = useState("");

  const handleUnauthenticatedClick = () => {
    setShowLoginAlert(true);
  };

  // Handle save button click - open menu instead of toggle
  const handleSaveClick = (event: React.MouseEvent<HTMLElement>) => {
    if (!isAuthenticated) {
      handleUnauthenticatedClick();
      return;
    }
    setSaveMenuAnchor(event.currentTarget);
  };

  // Close menu
  const handleCloseMenu = () => {
    setSaveMenuAnchor(null);
    setShowAlreadyInMessage(false);
  };

  // Toggle dataset in/out of collection
  const handleCollectionClick = (
    collectionId: number,
    isInCollection: boolean,
    collectionName: string
  ) => {
    if (isInCollection) {
      setSelectedCollectionName(collectionName);
      setShowAlreadyInMessage(true);
      setTimeout(() => setShowAlreadyInMessage(false), 3000);
      // handleCloseMenu();
    } else {
      onAddToCollection(collectionId);
      handleCloseMenu();
      setShowAlreadyInMessage(false);
    }
    // handleCloseMenu();
  };

  // Open create dialog
  const handleCreateNew = () => {
    setCreateDialogOpen(true);
    handleCloseMenu();
  };

  // Create new collection
  const handleCreateSubmit = () => {
    if (newCollectionName.trim()) {
      onCreateCollection(
        newCollectionName.trim(),
        newCollectionDescription.trim() || undefined
      );
      setNewCollectionName("");
      setNewCollectionDescription("");
      setCreateDialogOpen(false);
    }
  };

  // Cancel create dialog
  const handleCreateCancel = () => {
    setNewCollectionName("");
    setNewCollectionDescription("");
    setCreateDialogOpen(false);
  };

  return (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
          mt: 2,
          mb: 2,
        }}
      >
        {/* Like Button */}
        <Button
          variant={isLiked ? "contained" : "outlined"}
          startIcon={
            isLikeLoading ? (
              <CircularProgress size={20} />
            ) : isLiked ? (
              <FavoriteIcon />
            ) : (
              <FavoriteBorderIcon />
            )
          }
          onClick={isAuthenticated ? onLikeToggle : handleUnauthenticatedClick}
          disabled={isLikeLoading}
          sx={{
            color: isLiked ? Colors.white : Colors.purple,
            backgroundColor: isLiked ? Colors.purple : "transparent",
            borderColor: Colors.purple,
            "&:hover": {
              backgroundColor: isLiked
                ? Colors.secondaryPurple
                : "rgba(128, 90, 213, 0.1)",
              borderColor: Colors.secondaryPurple,
            },
            "&:disabled": {
              opacity: 0.6,
            },
          }}
        >
          {isLiked ? "Liked" : "Like"} {likesCount > 0 && `(${likesCount})`}
        </Button>

        {/* Save Button */}
        {/* <Button
          variant={isSaved ? "contained" : "outlined"}
          startIcon={
            isSaveLoading ? (
              <CircularProgress size={20} />
            ) : isSaved ? (
              <BookmarkIcon />
            ) : (
              <BookmarkBorderIcon />
            )
          }
          onClick={isAuthenticated ? onSaveToggle : handleUnauthenticatedClick}
          disabled={isSaveLoading}
          sx={{
            color: isSaved ? Colors.white : Colors.purple,
            backgroundColor: isSaved ? Colors.purple : "transparent",
            borderColor: Colors.purple,
            "&:hover": {
              backgroundColor: isSaved
                ? Colors.secondaryPurple
                : "rgba(128, 90, 213, 0.1)",
              borderColor: Colors.secondaryPurple,
            },
            "&:disabled": {
              opacity: 0.6,
            },
          }}
        >
          {isSaved ? "Saved" : "Save"}
        </Button> */}

        {/* Save Button - Now opens menu */}
        <Button
          variant={isSaved ? "contained" : "outlined"}
          startIcon={
            isSaveLoading || isLoadingCollections ? (
              <CircularProgress size={20} />
            ) : isSaved ? (
              <BookmarkIcon />
            ) : (
              <BookmarkBorderIcon />
            )
          }
          onClick={handleSaveClick}
          disabled={isSaveLoading || isLoadingCollections}
          sx={{
            color: isSaved ? Colors.white : Colors.purple,
            backgroundColor: isSaved ? Colors.purple : "transparent",
            borderColor: Colors.purple,
            "&:hover": {
              backgroundColor: isSaved
                ? Colors.secondaryPurple
                : "rgba(128, 90, 213, 0.1)",
              borderColor: Colors.secondaryPurple,
            },
            "&:disabled": {
              opacity: 0.6,
            },
          }}
        >
          {isSaved ? "Saved" : "Save"}
        </Button>

        {/* Collections Menu */}
        <Menu
          anchorEl={saveMenuAnchor}
          open={Boolean(saveMenuAnchor)}
          onClose={handleCloseMenu}
          anchorOrigin={{
            vertical: "bottom",
            horizontal: "left",
          }}
          transformOrigin={{
            vertical: "top",
            horizontal: "left",
          }}
          slotProps={{
            paper: {
              sx: { minWidth: 250 }, // Make menu wider for message
            },
          }}
        >
          <MenuItem disabled sx={{ fontSize: "0.875rem", fontWeight: "bold" }}>
            Save to Collection
          </MenuItem>
          <Divider />

          {/* ✅ Show message inside menu */}
          {showAlreadyInMessage && (
            <>
              <Box
                sx={{
                  mx: 2,
                  my: 1,
                  p: 1.5,
                  backgroundColor: "rgba(128, 90, 213, 0.1)",
                  border: `1px solid ${Colors.purple}`,
                  borderRadius: 1,
                }}
              >
                <Typography variant="caption" sx={{ color: Colors.purple }}>
                  ✓ Already in "{selectedCollectionName}"
                </Typography>
              </Box>
              <Divider />
            </>
          )}

          {collections.length === 0 ? (
            <MenuItem
              disabled
              sx={{ fontSize: "0.875rem", fontStyle: "italic" }}
            >
              No collections yet
            </MenuItem>
          ) : (
            collections.map((collection) => (
              <MenuItem
                key={collection.id}
                onClick={() =>
                  handleCollectionClick(
                    collection.id,
                    collection.isInCollection,
                    collection.name
                  )
                }
                sx={{ fontSize: "0.875rem" }}
              >
                {collection.isInCollection && (
                  <ListItemIcon sx={{ minWidth: 28 }}>
                    <CheckIcon fontSize="small" sx={{ color: Colors.purple }} />
                  </ListItemIcon>
                )}
                <ListItemText
                  inset={!collection.isInCollection}
                  primary={collection.name}
                />
              </MenuItem>
            ))
          )}

          <Divider />
          <MenuItem onClick={handleCreateNew} sx={{ fontSize: "0.875rem" }}>
            <ListItemIcon sx={{ minWidth: 28 }}>
              <AddIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Create new collection" />
          </MenuItem>
        </Menu>

        {/* Views Count Display */}
        {viewsCount > 0 && (
          <Typography
            sx={{
              color: Colors.textSecondary,
              fontSize: "0.9rem",
              ml: 1,
            }}
          >
            {viewsCount} {viewsCount === 1 ? "view" : "views"}
          </Typography>
        )}
      </Box>

      {/* Create Collection Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={handleCreateCancel}
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
          <Button onClick={handleCreateCancel}>Cancel</Button>
          <Button
            onClick={handleCreateSubmit}
            variant="contained"
            disabled={!newCollectionName.trim()}
            sx={{
              backgroundColor: Colors.purple,
              "&:hover": { backgroundColor: Colors.secondaryPurple },
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Login Alert */}
      <Snackbar
        open={showLoginAlert}
        autoHideDuration={4000}
        onClose={() => setShowLoginAlert(false)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setShowLoginAlert(false)}
          severity="info"
          sx={{ width: "100%" }}
        >
          Please log in to like or save datasets
        </Alert>
      </Snackbar>
    </>
  );
};

export default DatasetActions;
