import { RootState } from "../store";
import { DatasetActivityStatus } from "./types/activities.interface";

// Main selector
export const ActivitiesSelector = (state: RootState) => state.activities;

// Helper to get dataset key
const getDatasetKey = (dbName: string, datasetId: string): string => {
  return `${dbName}:${datasetId}`;
};

// Get activity status for a specific dataset
export const selectDatasetActivityStatus = (
  state: RootState,
  dbName: string,
  datasetId: string
): DatasetActivityStatus | undefined => {
  const key = getDatasetKey(dbName, datasetId);
  return state.activities.datasetActivities[key];
};

// Check if dataset is liked
export const selectIsDatasetLiked = (
  state: RootState,
  dbName: string,
  datasetId: string
): boolean => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.isLiked || false;
};

// Check if dataset is saved
export const selectIsDatasetSaved = (
  state: RootState,
  dbName: string,
  datasetId: string
): boolean => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.isSaved || false;
};

// Get comments for a dataset
export const selectDatasetComments = (
  state: RootState,
  dbName: string,
  datasetId: string
) => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.comments || [];
};

// Get views count for a dataset
export const selectDatasetViewsCount = (
  state: RootState,
  dbName: string,
  datasetId: string
): number => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.viewsCount || 0;
};

// Get likes count for a dataset
export const selectDatasetLikesCount = (
  state: RootState,
  dbName: string,
  datasetId: string
): number => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.likesCount || 0;
};

// Get loading states
export const selectIsLikeLoading = (
  state: RootState,
  dbName: string,
  datasetId: string
): boolean => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.isLoadingLike || false;
};

export const selectIsSaveLoading = (
  state: RootState,
  dbName: string,
  datasetId: string
): boolean => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.isLoadingSave || false;
};

export const selectAreCommentsLoading = (
  state: RootState,
  dbName: string,
  datasetId: string
): boolean => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.isLoadingComments || false;
};

export const selectAreStatsLoading = (
  state: RootState,
  dbName: string,
  datasetId: string
): boolean => {
  const status = selectDatasetActivityStatus(state, dbName, datasetId);
  return status?.isLoadingStats || false;
};

// Get most viewed datasets
export const selectMostViewedDatasets = (state: RootState) => {
  return state.activities.mostViewedDatasets;
};

// Get user's saved datasets
export const selectUserSavedDatasets = (state: RootState) => {
  return state.activities.userSavedDatasets;
};

// Get user's liked datasets
export const selectUserLikedDatasets = (state: RootState) => {
  return state.activities.userLikedDatasets;
};

// Get error
export const selectActivitiesError = (state: RootState): string | null => {
  return state.activities.error;
};

// Get global loading state
export const selectActivitiesLoading = (state: RootState): boolean => {
  return state.activities.loading;
};

// import { RootState } from "../store";

// export const ActivitiesSelector = (state: RootState) => state.activities;
