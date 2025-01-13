import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import {
  fetchPaginatedDocument,
  fetchDocuments,
  fetchDocumentById,
} from "../../services/couchDbService";

interface LoadPaginatedDataPayload {
  dbName: string;
  offset: number;
  limit: number;
}

interface INeuroJsonState {
  loading: boolean;
  data: any[]; // Paginated dataset (documents from CouchDB)
  selectedDocument: any | null; // Holds a single document's details
  error: string | null;
  offset: number; // Tracks the pagination offset
  limit: number; // Number of items to fetch per request (chunk size)
  hasMore: boolean; // Indicates if more data is available
}

const initialState: INeuroJsonState = {
  loading: false,
  data: [],
  selectedDocument: null,
  error: null,
  offset: 0,
  limit: 100, // Default chunk size
  hasMore: true, // Initially assume there is more data
};

/**
 * Async thunk to fetch paginated data.
 */
export const loadPaginatedData = createAsyncThunk(
  "neurojson/loadPaginatedData",
  async (
    { dbName, offset, limit }: LoadPaginatedDataPayload,
    { rejectWithValue }
  ) => {
    try {
      const dataChunk = await fetchPaginatedDocument(dbName, offset, limit);

      if (dataChunk.length === 0) {
        return rejectWithValue("No more data to load.");
      }

      return dataChunk;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to load data.");
    }
  }
);

/**
 * Async thunk to fetch all documents from a database (non-paginated).
 */
export const loadAllDocuments = createAsyncThunk(
  "neurojson/loadAllDocuments",
  async (dbName: string, { rejectWithValue }) => {
    try {
      const data = await fetchDocuments(dbName);
      return data;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to load documents.");
    }
  }
);

/**
 * Async thunk to fetch a single document's details by its ID.
 */
export const fetchDocumentDetails = createAsyncThunk(
  "neurojson/fetchDocumentDetails",
  async (
    { dbName, docId }: { dbName: string; docId: string },
    { rejectWithValue }
  ) => {
    try {
      const data = await fetchDocumentById(dbName, docId);
      return data;
    } catch (error: any) {
      console.error("Failed to fetch document details:", error);
      return rejectWithValue("Failed to fetch document details.");
    }
  }
);

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
      state.hasMore = true; // Reset pagination availability
    },
  },
  extraReducers: (builder) => {
    // Handle paginated data loading
    builder
      .addCase(loadPaginatedData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loadPaginatedData.fulfilled,
        (state, action: PayloadAction<any[]>) => {
          const uniqueEntries = action.payload.filter(
            (newItem) =>
              !state.data.some((existingItem) => existingItem._id === newItem._id)
          );

          state.loading = false;

          if (uniqueEntries.length > 0) {
            state.data = [...state.data, ...uniqueEntries];
            state.offset += uniqueEntries.length;
            state.hasMore = true;
          } else {
            state.hasMore = false; // No new unique data to add
          }
        }
      )
      .addCase(loadPaginatedData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.hasMore = false; // No more data to load
      });

    // Handle non-paginated data loading
    builder
      .addCase(loadAllDocuments.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loadAllDocuments.fulfilled,
        (state, action: PayloadAction<any[]>) => {
          state.loading = false;
          state.data = action.payload; // Overwrite existing data
          state.hasMore = false; // All data is loaded
        }
      )
      .addCase(loadAllDocuments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
        state.hasMore = false;
      });

    // Handle fetching a single document's details
    builder
      .addCase(fetchDocumentDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
        state.selectedDocument = null;
      })
      .addCase(
        fetchDocumentDetails.fulfilled,
        (state, action: PayloadAction<any>) => {
          state.loading = false;
          state.selectedDocument = action.payload; // Store the fetched document details
        }
      )
      .addCase(fetchDocumentDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { resetData } = neurojsonSlice.actions;

export default neurojsonSlice.reducer;

