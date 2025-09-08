import {
  fetchRegistry,
  loadAllDocuments,
  loadPaginatedData,
  fetchDbInfo,
  fetchDocumentDetails,
  fetchDbStats,
  fetchMetadataSearchResults,
  fetchDbInfoByDatasetId,
} from "./neurojson.action";
import { DBDatafields, INeuroJsonState } from "./types/neurojson.interface";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// import { stat } from "fs";

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
  datasetViewInfo: null,
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
          state.loading = false;
          state.error = null;
          state.limit = action.payload.total_rows;
          state.offset = action.payload.offset;
          state.data = action.payload.rows; // Always replace data, not merge
          state.hasMore =
            action.payload.offset + action.payload.rows.length <
            action.payload.total_rows;
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
      })
      .addCase(fetchDbInfoByDatasetId.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        fetchDbInfoByDatasetId.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.datasetViewInfo = action.payload;
        }
      )
      .addCase(fetchDbInfoByDatasetId.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetData, setLoading } = neurojsonSlice.actions;

export default neurojsonSlice.reducer;
