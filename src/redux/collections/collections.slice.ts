import {
  getUserCollections,
  createCollection,
  getCollection,
  addDatasetToCollection,
  removeDatasetFromCollection,
  updateCollection,
  deleteCollection,
  getDatasetCollections,
} from "./collections.action";
import { CollectionsState } from "./types/collections.interface";
import { createSlice } from "@reduxjs/toolkit";

const initialState: CollectionsState = {
  collections: [],
  currentCollection: null,
  datasetCollections: [],
  error: null,
  loading: false,
  isCreating: false,
  isAdding: false,
};

const collectionsSlice = createSlice({
  name: "collections",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentCollection: (state) => {
      state.currentCollection = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get User Collections
      .addCase(getUserCollections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserCollections.fulfilled, (state, action) => {
        state.collections = action.payload;
        state.loading = false;
      })
      .addCase(getUserCollections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create Collection
      .addCase(createCollection.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createCollection.fulfilled, (state, action) => {
        state.collections = [action.payload, ...state.collections];
        state.isCreating = false;
      })
      .addCase(createCollection.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })

      // Get Collection
      .addCase(getCollection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getCollection.fulfilled, (state, action) => {
        state.currentCollection = action.payload;
        state.loading = false;
      })
      .addCase(getCollection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Add Dataset to Collection
      .addCase(addDatasetToCollection.pending, (state) => {
        state.isAdding = true;
        state.error = null;
      })
      .addCase(addDatasetToCollection.fulfilled, (state, action) => {
        state.isAdding = false;
        // Component will refetch collections list
      })
      .addCase(addDatasetToCollection.rejected, (state, action) => {
        state.isAdding = false;
        state.error = action.payload as string;
      })

      // Remove Dataset from Collection
      .addCase(removeDatasetFromCollection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(removeDatasetFromCollection.fulfilled, (state) => {
        state.loading = false;
        // Component will refetch collections list
      })
      .addCase(removeDatasetFromCollection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update Collection
      .addCase(updateCollection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateCollection.fulfilled, (state) => {
        state.loading = false;
        // Component will refetch collections list
      })
      .addCase(updateCollection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Delete Collection
      .addCase(deleteCollection.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteCollection.fulfilled, (state) => {
        state.loading = false;
        // Component will refetch or navigate away
      })
      .addCase(deleteCollection.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Get Dataset Collections (for "Add to Collection" menu)
      .addCase(getDatasetCollections.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getDatasetCollections.fulfilled, (state, action) => {
        state.datasetCollections = action.payload;
        state.loading = false;
      })
      .addCase(getDatasetCollections.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentCollection } = collectionsSlice.actions;

export default collectionsSlice.reducer;
