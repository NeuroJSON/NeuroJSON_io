import { RootState } from "../store";

// Main selector
export const CollectionsSelector = (state: RootState) => state.collections;

// Get all user's collections
export const selectUserCollections = (state: RootState) => {
  return state.collections.collections;
};

// Get current collection being viewed
export const selectCurrentCollection = (state: RootState) => {
  return state.collections.currentCollection;
};

// Get collections that contain a specific dataset (for menu)
export const selectDatasetCollections = (state: RootState) => {
  return state.collections.datasetCollections;
};

// Get loading states
export const selectCollectionsLoading = (state: RootState): boolean => {
  return state.collections.loading;
};

export const selectIsCreatingCollection = (state: RootState): boolean => {
  return state.collections.isCreating;
};

export const selectIsAddingToCollection = (state: RootState): boolean => {
  return state.collections.isAdding;
};

// Get error
export const selectCollectionsError = (state: RootState): string | null => {
  return state.collections.error;
};

// Get collection by ID (from cached list)
export const selectCollectionById = (
  state: RootState,
  collectionId: number
) => {
  return state.collections.collections.find((c) => c.id === collectionId);
};
