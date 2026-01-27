import BookmarkIcon from "@mui/icons-material/Bookmark";
import BookmarkBorderIcon from "@mui/icons-material/BookmarkBorder";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import {
  Box,
  Button,
  CircularProgress,
  Typography,
  Snackbar,
  Alert,
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
  onSaveToggle: () => void;
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
  onSaveToggle,
}) => {
  const [showLoginAlert, setShowLoginAlert] = useState(false);

  const handleUnauthenticatedClick = () => {
    setShowLoginAlert(true);
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
        <Button
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
        </Button>

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
