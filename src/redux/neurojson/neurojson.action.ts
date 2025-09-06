import { createAsyncThunk } from "@reduxjs/toolkit";
import { fetchDocuments } from "services/couchDb.service";
import { NeurojsonService } from "services/neurojson.service";

export const fetchRegistry = createAsyncThunk(
  "neurojson/fetchRegistry",
  async () => {
    const response = await NeurojsonService.getRegistry();
    return response.database;
  }
);

export const fetchDbInfo = createAsyncThunk(
  "neurojson/fetchDbInfo",
  async (dbName: string) => {
    const response = await NeurojsonService.getDbInfo(dbName);
    return response;
  }
);

export const loadPaginatedData = createAsyncThunk(
  "neurojson/loadPaginatedData",
  async (
    {
      dbName,
      offset,
      limit,
    }: { dbName: string; offset: number; limit: number },
    { rejectWithValue, dispatch, getState }
  ) => {
    try {
      const state = getState() as any;
      const currentData = state.neurojson.data;
      if (currentData.length > 0 && currentData[0]?.dbName !== dbName) {
        dispatch({ type: "neurojson/resetData" });
      }

      const response = await NeurojsonService.getPaginatedData(
        dbName,
        offset,
        limit
      );

      if (response.rows.length === 0) {
        return rejectWithValue("No more data to load.");
      }

      response.rows = response.rows.map((row) => ({
        ...row,
        dbName,
      }));

      return response;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to load data.");
    }
  }
);

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

export const fetchDocumentDetails = createAsyncThunk(
  "neurojson/fetchDocumentDetails",
  async (
    { dbName, docId }: { dbName: string; docId: string },
    { rejectWithValue }
  ) => {
    try {
      const data = await NeurojsonService.getDocumentById(dbName, docId);
      return data;
    } catch (error: any) {
      return rejectWithValue("Failed to fetch document details.");
    }
  }
);

export const fetchDbStats = createAsyncThunk(
  "neurojson/fetchDbStats",
  async (_, { rejectWithValue }) => {
    try {
      const response = await NeurojsonService.getDbStats();
      return response;
    } catch (error: any) {
      return rejectWithValue("Failed to fetch db stats");
    }
  }
);

export const fetchMetadataSearchResults = createAsyncThunk(
  "neurojson/fetchMetadataSearchResults",
  async (formData: any, { rejectWithValue }) => {
    try {
      const data = await NeurojsonService.getMetadataSearchResults(formData);
      return data;
    } catch (error: any) {
      return rejectWithValue("Failed to fetch metadata search results");
    }
  }
);

export const fetchDbInfoByDatasetId = createAsyncThunk(
  "neurojson/fetchDbInfoByDatasetId",
  async (
    { dbName, docId }: { dbName: string; docId: string },
    { rejectWithValue }
  ) => {
    try {
      const data = await NeurojsonService.getDbInfoByDatasetId(dbName, docId);
      console.log("data in action", data);
      return { ...data, dbName, docId };
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch dataset info.");
    }
  }
);
