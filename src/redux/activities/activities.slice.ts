import {
  likeDataset,
  unlikeDataset,
  saveDataset,
  unsaveDataset,
  getComments,
  addComment,
  updateComment,
  deleteComment,
  getDatasetStats,
  getMostViewedDatasets,
  checkUserActivity,
  getUserLikedDatasets,
  getUserSavedDatasets,
} from "./activities.action";
import { ActivitiesState } from "./types/activities.interface";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Helper function to get dataset key
const getDatasetKey = (dbName: string, datasetId: string): string => {
  return `${dbName}:${datasetId}`;
};

// Helper function to get or initialize dataset activity status
const getOrInitStatus = (state: ActivitiesState, key: string) => {
  if (!state.datasetActivities[key]) {
    state.datasetActivities[key] = {
      isLiked: false,
      isSaved: false,
      comments: [],
      viewsCount: 0,
      likesCount: 0,
      isLoadingLike: false,
      isLoadingSave: false,
      isLoadingComments: false,
      isLoadingStats: false,
    };
  }
  return state.datasetActivities[key];
};

const initialState: ActivitiesState = {
  datasetActivities: {},
  mostViewedDatasets: [],
  userSavedDatasets: [],
  userLikedDatasets: [],
  error: null,
  loading: false,
};

const activitiesSlice = createSlice({
  name: "activities",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    // Initialize dataset activity status (useful when navigating to a dataset page)
    initializeDatasetStatus: (
      state,
      action: PayloadAction<{ dbName: string; datasetId: string }>
    ) => {
      const { dbName, datasetId } = action.payload;
      const key = getDatasetKey(dbName, datasetId);
      getOrInitStatus(state, key);
    },
  },
  extraReducers: (builder) => {
    builder
      // Like Dataset
      .addCase(likeDataset.pending, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingLike = true;
        state.error = null;
      })
      .addCase(likeDataset.fulfilled, (state, action) => {
        const { dbName, datasetId } = action.payload;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLiked = true;
        status.isLoadingLike = false;
      })
      .addCase(likeDataset.rejected, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingLike = false;
        state.error = action.payload as string;
      })
      // Unlike Dataset
      .addCase(unlikeDataset.pending, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingLike = true;
        state.error = null;
      })
      .addCase(unlikeDataset.fulfilled, (state, action) => {
        const { dbName, datasetId } = action.payload;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLiked = false;
        status.isLoadingLike = false;
      })
      .addCase(unlikeDataset.rejected, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingLike = false;
        state.error = action.payload as string;
      })
      // Save Dataset
      .addCase(saveDataset.pending, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingSave = true;
        state.error = null;
      })
      .addCase(saveDataset.fulfilled, (state, action) => {
        const { dbName, datasetId } = action.payload;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isSaved = true;
        status.isLoadingSave = false;
      })
      .addCase(saveDataset.rejected, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingSave = false;
        state.error = action.payload as string;
      })
      // Unsave Dataset
      .addCase(unsaveDataset.pending, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingSave = true;
        state.error = null;
      })
      .addCase(unsaveDataset.fulfilled, (state, action) => {
        const { dbName, datasetId } = action.payload;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isSaved = false;
        status.isLoadingSave = false;
      })
      .addCase(unsaveDataset.rejected, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingSave = false;
        state.error = action.payload as string;
      })
      // Get Comments
      .addCase(getComments.pending, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingComments = true;
        state.error = null;
      })
      .addCase(getComments.fulfilled, (state, action) => {
        const { dbName, datasetId, comments } = action.payload;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.comments = comments;
        status.isLoadingComments = false;
      })
      .addCase(getComments.rejected, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingComments = false;
        state.error = action.payload as string;
      })
      // Add Comment
      .addCase(addComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        const { dbName, datasetId, comment } = action.payload;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.comments = [comment, ...status.comments];
        state.loading = false;
      })
      .addCase(addComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Update Comment
      .addCase(updateComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateComment.fulfilled, (state, action) => {
        const { comment } = action.payload;
        // Find and update the comment in all datasets
        Object.values(state.datasetActivities).forEach((status) => {
          const index = status.comments.findIndex((c) => c.id === comment.id);
          if (index !== -1) {
            status.comments[index] = comment;
          }
        });
        state.loading = false;
      })
      .addCase(updateComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Delete Comment
      .addCase(deleteComment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        const { commentId } = action.payload;
        // Remove the comment from all datasets
        Object.values(state.datasetActivities).forEach((status) => {
          status.comments = status.comments.filter((c) => c.id !== commentId);
        });
        state.loading = false;
      })
      .addCase(deleteComment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Get Dataset Stats
      .addCase(getDatasetStats.pending, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingStats = true;
        state.error = null;
      })
      .addCase(getDatasetStats.fulfilled, (state, action) => {
        const { dbName, datasetId, viewsCount, likesCount } = action.payload;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.viewsCount = viewsCount;
        status.likesCount = likesCount;
        status.isLoadingStats = false;
      })
      .addCase(getDatasetStats.rejected, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingStats = false;
        state.error = action.payload as string;
      })
      // Get Most Viewed Datasets
      .addCase(getMostViewedDatasets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getMostViewedDatasets.fulfilled, (state, action) => {
        state.mostViewedDatasets = action.payload.mostViewed;
        state.loading = false;
      })
      .addCase(getMostViewedDatasets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Check User Activity
      .addCase(checkUserActivity.pending, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingLike = true;
        status.isLoadingSave = true;
        state.error = null;
      })
      .addCase(checkUserActivity.fulfilled, (state, action) => {
        const { dbName, datasetId, isLiked, isSaved } = action.payload;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLiked = isLiked;
        status.isSaved = isSaved;
        status.isLoadingLike = false;
        status.isLoadingSave = false;
      })
      .addCase(checkUserActivity.rejected, (state, action) => {
        const { dbName, datasetId } = action.meta.arg;
        const key = getDatasetKey(dbName, datasetId);
        const status = getOrInitStatus(state, key);
        status.isLoadingLike = false;
        status.isLoadingSave = false;
        state.error = action.payload as string;
      })
      // Get User Saved Datasets
      .addCase(getUserSavedDatasets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserSavedDatasets.fulfilled, (state, action) => {
        state.userSavedDatasets = action.payload;
        state.loading = false;
      })
      .addCase(getUserSavedDatasets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Get User Liked Datasets
      .addCase(getUserLikedDatasets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserLikedDatasets.fulfilled, (state, action) => {
        state.userLikedDatasets = action.payload;
        state.loading = false;
      })
      .addCase(getUserLikedDatasets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, initializeDatasetStatus } = activitiesSlice.actions;

export default activitiesSlice.reducer;
