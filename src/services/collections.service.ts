import {
  GetUserCollectionsResponse,
  CreateCollectionResponse,
  CreateCollectionPayload,
  GetCollectionResponse,
  AddDatasetResponse,
  AddDatasetToCollectionPayload,
  RemoveDatasetResponse,
  UpdateCollectionResponse,
  UpdateCollectionPayload,
  DeleteCollectionResponse,
  GetDatasetCollectionsResponse,
  RemoveDatasetFromCollectionPayload,
  GetDatasetCollectionsPayload,
} from "../redux/collections/types/collections.interface";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

export const CollectionsService = {
  // Get all user's collections
  getUserCollections: async (): Promise<GetUserCollectionsResponse> => {
    const response = await fetch(`${API_URL}/collections/me/collections`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch collections");
    }

    return data;
  },

  // Create new collection
  createCollection: async (
    payload: CreateCollectionPayload
  ): Promise<CreateCollectionResponse> => {
    const response = await fetch(`${API_URL}/collections/collections`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create collection");
    }

    return data;
  },

  // Get specific collection with datasets
  getCollection: async (
    collectionId: number
  ): Promise<GetCollectionResponse> => {
    const response = await fetch(
      `${API_URL}/collections/collections/${collectionId}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch collection");
    }

    return data;
  },

  // Add dataset to collection
  addDatasetToCollection: async (
    payload: AddDatasetToCollectionPayload
  ): Promise<AddDatasetResponse> => {
    const response = await fetch(
      `${API_URL}/collections/collections/${payload.collectionId}/datasets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          dbName: payload.dbName,
          datasetId: payload.datasetId,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add dataset to collection");
    }

    return data;
  },

  // Remove dataset from collection
  removeDatasetFromCollection: async (
    payload: RemoveDatasetFromCollectionPayload
  ): Promise<RemoveDatasetResponse> => {
    const response = await fetch(
      `${API_URL}/collections/collections/${payload.collectionId}/datasets/${payload.datasetId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.message || "Failed to remove dataset from collection"
      );
    }

    return data;
  },

  // Update collection
  updateCollection: async (
    payload: UpdateCollectionPayload
  ): Promise<UpdateCollectionResponse> => {
    const { collectionId, ...updates } = payload;

    const response = await fetch(
      `${API_URL}/collections/collections/${collectionId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(updates),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update collection");
    }

    return data;
  },

  // Delete collection
  deleteCollection: async (
    collectionId: number
  ): Promise<DeleteCollectionResponse> => {
    const response = await fetch(
      `${API_URL}/collections/collections/${collectionId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete collection");
    }

    return data;
  },

  // Get which collections contain a specific dataset
  getDatasetCollections: async (
    payload: GetDatasetCollectionsPayload
  ): Promise<GetDatasetCollectionsResponse> => {
    const response = await fetch(
      `${API_URL}/collections/datasets/${payload.dbName}/${payload.datasetId}/collections`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch dataset collections");
    }

    return data;
  },
};
