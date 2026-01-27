import {
  LikeDatasetPayload,
  SaveDatasetPayload,
  AddCommentPayload,
  UpdateCommentPayload,
  DeleteCommentPayload,
  GetCommentsPayload,
  GetDatasetStatsPayload,
  GetMostViewedDatasetsPayload,
  CheckUserActivityPayload,
} from "./types/activities.interface";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ActivitiesService } from "services/activities.service";

// Like a dataset
export const likeDataset = createAsyncThunk(
  "activities/likeDataset",
  async (payload: LikeDatasetPayload, { rejectWithValue }) => {
    try {
      await ActivitiesService.likeDataset(payload.dbName, payload.datasetId);
      return payload;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to like dataset");
    }
  }
);

// Unlike a dataset
export const unlikeDataset = createAsyncThunk(
  "activities/unlikeDataset",
  async (payload: LikeDatasetPayload, { rejectWithValue }) => {
    try {
      await ActivitiesService.unlikeDataset(payload.dbName, payload.datasetId);
      return payload;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to unlike dataset");
    }
  }
);

// Save a dataset
export const saveDataset = createAsyncThunk(
  "activities/saveDataset",
  async (payload: SaveDatasetPayload, { rejectWithValue }) => {
    try {
      await ActivitiesService.saveDataset(payload.dbName, payload.datasetId);
      return payload;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to save dataset");
    }
  }
);

// Unsave a dataset
export const unsaveDataset = createAsyncThunk(
  "activities/unsaveDataset",
  async (payload: SaveDatasetPayload, { rejectWithValue }) => {
    try {
      await ActivitiesService.unsaveDataset(payload.dbName, payload.datasetId);
      return payload;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to unsave dataset");
    }
  }
);

// Get comments
export const getComments = createAsyncThunk(
  "activities/getComments",
  async (payload: GetCommentsPayload, { rejectWithValue }) => {
    try {
      const response = await ActivitiesService.getComments(
        payload.dbName,
        payload.datasetId
      );
      return {
        ...payload,
        comments: response.comments,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch comments");
    }
  }
);

// Add a comment
export const addComment = createAsyncThunk(
  "activities/addComment",
  async (payload: AddCommentPayload, { rejectWithValue }) => {
    try {
      const response = await ActivitiesService.addComment(
        payload.dbName,
        payload.datasetId,
        payload.body
      );
      return {
        dbName: payload.dbName,
        datasetId: payload.datasetId,
        comment: response.comment,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to add comment");
    }
  }
);

// Update a comment
export const updateComment = createAsyncThunk(
  "activities/updateComment",
  async (payload: UpdateCommentPayload, { rejectWithValue }) => {
    try {
      const response = await ActivitiesService.updateComment(
        payload.commentId,
        payload.body
      );
      return {
        commentId: payload.commentId,
        comment: response.comment,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update comment");
    }
  }
);

// Delete a comment
export const deleteComment = createAsyncThunk(
  "activities/deleteComment",
  async (payload: DeleteCommentPayload, { rejectWithValue }) => {
    try {
      await ActivitiesService.deleteComment(payload.commentId);
      return payload;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete comment");
    }
  }
);

// Get dataset statistics (views and likes count)
export const getDatasetStats = createAsyncThunk(
  "activities/getDatasetStats",
  async (payload: GetDatasetStatsPayload, { rejectWithValue }) => {
    try {
      const response = await ActivitiesService.getDatasetStats(
        payload.dbName,
        payload.datasetId
      );
      return {
        dbName: payload.dbName,
        datasetId: payload.datasetId,
        viewsCount: response.viewsCount,
        likesCount: response.likesCount,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch dataset stats");
    }
  }
);

// Get most viewed datasets
export const getMostViewedDatasets = createAsyncThunk(
  "activities/getMostViewedDatasets",
  async (payload: GetMostViewedDatasetsPayload = {}, { rejectWithValue }) => {
    try {
      const response = await ActivitiesService.getMostViewedDatasets(
        payload.limit || 10
      );
      return {
        mostViewed: response.mostViewed,
        datasetsCount: response.datasetsCount,
      };
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch most viewed datasets"
      );
    }
  }
);

export const checkUserActivity = createAsyncThunk(
  "activities/checkUserActivity",
  async (payload: CheckUserActivityPayload, { rejectWithValue }) => {
    try {
      const response = await ActivitiesService.checkUserActivity(
        payload.dbName,
        payload.datasetId
      );
      return {
        dbName: payload.dbName,
        datasetId: payload.datasetId,
        isLiked: response.isLiked,
        isSaved: response.isSaved,
      };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to check user activity");
    }
  }
);

// Get user's saved datasets
export const getUserSavedDatasets = createAsyncThunk(
  "activities/getUserSavedDatasets",
  async (_, { rejectWithValue }) => {
    try {
      const response = await ActivitiesService.getUserSavedDatasets();
      return response.savedDatasets;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch saved datasets");
    }
  }
);

// Get user's liked datasets
export const getUserLikedDatasets = createAsyncThunk(
  "activities/getUserLikedDatasets",
  async (_, { rejectWithValue }) => {
    try {
      const response = await ActivitiesService.getUserLikedDatasets();
      return response.likedDatasets;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch liked datasets");
    }
  }
);
