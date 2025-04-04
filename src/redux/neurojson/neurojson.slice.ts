import {
  fetchRegistry,
  loadAllDocuments,
  loadPaginatedData,
  fetchDbInfo,
  fetchDocumentDetails,
  fetchDbStats,
  fetchMetadataSearchResults,
} from "./neurojson.action";
import { DBDatafields, INeuroJsonState } from "./types/neurojson.interface";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { stat } from "fs";

const initialState: INeuroJsonState = {
  loading: false,
  data: [],
  selectedDocument: null,
  error: null,
  offset: 0,
  limit: 100,
  hasMore: true,
  registry: null,
  dbInfo: null, // add dbInfo in neurojson.interface.ts
  dbStats: null,
  searchResults: null,
};

const neurojsonSlice = createSlice({
  name: "neurojson",
  initialState,
  reducers: {
    resetData: (state) => {
      state.data = [];
      state.selectedDocument = null;
      state.offset = 0;
      state.error = null;
      state.loading = false;
      state.hasMore = true;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadPaginatedData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loadPaginatedData.fulfilled,
        (state, action: PayloadAction<DBDatafields>) => {
          // Check if we received fewer items than the limit, indicating we've reached the end
          console.log(action.payload.total_rows);
          state.limit = action.payload.total_rows;
          const reachedEnd = action.payload.rows.length < state.limit;

          // Filter out duplicates while preserving order
          const uniqueEntries = action.payload.rows.filter(
            (newItem) =>
              !state.data.some((existingItem) => existingItem.id === newItem.id)
          );

          state.loading = false;

          if (uniqueEntries.length > 0) {
            // Append new unique entries to existing data
            state.data = [...state.data, ...uniqueEntries];
            state.offset += uniqueEntries.length;
            // Only set hasMore to true if we haven't reached the end
            state.hasMore = !reachedEnd;
          } else {
            // If no new unique entries were found, we've reached the end
            state.hasMore = false;
          }
        }
      )
      .addCase(loadPaginatedData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.hasMore = false;
      })
      .addCase(loadAllDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loadAllDocuments.fulfilled,
        (state, action: PayloadAction<any[]>) => {
          state.loading = false;
          state.data = action.payload;
          state.hasMore = false;
        }
      )
      .addCase(loadAllDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.hasMore = false;
      })
      .addCase(fetchDocumentDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.selectedDocument = null;
      })
      .addCase(
        fetchDocumentDetails.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.selectedDocument = action.payload;
        }
      )
      .addCase(fetchDocumentDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchRegistry.fulfilled, (state, action: PayloadAction<any>) => {
        state.registry = action.payload;
      })
      .addCase(fetchRegistry.rejected, (state, action) => {
        state.registry = null;
        state.error = action.payload as string;
      })
      .addCase(fetchRegistry.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDbInfo.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDbInfo.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.dbInfo = action.payload; // store database info in Redux
      })
      .addCase(fetchDbInfo.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchDbStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDbStats.fulfilled, (state, action: PayloadAction<any>) => {
        state.loading = false;
        state.dbStats = action.payload;
      })
      .addCase(fetchDbStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(fetchMetadataSearchResults.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchMetadataSearchResults.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.searchResults = action.payload;
        }
      )
      .addCase(fetchMetadataSearchResults.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetData, setLoading } = neurojsonSlice.actions;

export default neurojsonSlice.reducer;
