import {
  CreateCollectionPayload,
  UpdateCollectionPayload,
  DeleteCollectionPayload,
  GetCollectionPayload,
  AddDatasetToCollectionPayload,
  RemoveDatasetFromCollectionPayload,
  GetDatasetCollectionsPayload,
} from "./types/collections.interface";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { CollectionsService } from "services/collections.service";

// Get all user's collections
export const getUserCollections = createAsyncThunk(
  "collections/getUserCollections",
  async (_, { rejectWithValue }) => {
    try {
      const response = await CollectionsService.getUserCollections();
      return response.collections;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch collections");
    }
  }
);

// Create new collection
export const createCollection = createAsyncThunk(
  "collections/createCollection",
  async (payload: CreateCollectionPayload, { rejectWithValue }) => {
    try {
      const response = await CollectionsService.createCollection(payload);
      return response.collection;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create collection");
    }
  }
);

// Get specific collection
export const getCollection = createAsyncThunk(
  "collections/getCollection",
  async (payload: GetCollectionPayload, { rejectWithValue }) => {
    try {
      const response = await CollectionsService.getCollection(
        payload.collectionId
      );
      return response.collection;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch collection");
    }
  }
);

// Add dataset to collection
export const addDatasetToCollection = createAsyncThunk(
  "collections/addDatasetToCollection",
  async (payload: AddDatasetToCollectionPayload, { rejectWithValue }) => {
    try {
      await CollectionsService.addDatasetToCollection(payload);
      return payload;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to add dataset to collection"
      );
    }
  }
);

// Remove dataset from collection
export const removeDatasetFromCollection = createAsyncThunk(
  "collections/removeDatasetFromCollection",
  async (payload: RemoveDatasetFromCollectionPayload, { rejectWithValue }) => {
    try {
      await CollectionsService.removeDatasetFromCollection(payload);
      return payload;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to remove dataset from collection"
      );
    }
  }
);

// Update collection
export const updateCollection = createAsyncThunk(
  "collections/updateCollection",
  async (payload: UpdateCollectionPayload, { rejectWithValue }) => {
    try {
      const response = await CollectionsService.updateCollection(payload);
      return response.collection;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update collection");
    }
  }
);

// Delete collection
export const deleteCollection = createAsyncThunk(
  "collections/deleteCollection",
  async (payload: DeleteCollectionPayload, { rejectWithValue }) => {
    try {
      await CollectionsService.deleteCollection(payload.collectionId);
      return payload.collectionId;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete collection");
    }
  }
);

// Get which collections contain a specific dataset (for "Add to Collection" menu)
export const getDatasetCollections = createAsyncThunk(
  "collections/getDatasetCollections",
  async (payload: GetDatasetCollectionsPayload, { rejectWithValue }) => {
    try {
      const response = await CollectionsService.getDatasetCollections(payload);
      return response.collections;
    } catch (error: any) {
      return rejectWithValue(
        error.message || "Failed to fetch dataset collections"
      );
    }
  }
);
