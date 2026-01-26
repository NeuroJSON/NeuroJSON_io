import {
  Comment,
  Dataset,
  GetCommentsResponse,
  AddCommentResponse,
  UpdateCommentResponse,
  DeleteCommentResponse,
  LikeResponse,
  UnlikeResponse,
  SaveResponse,
  UnsaveResponse,
  GetDatasetStatsResponse,
  GetMostViewedDatasetsResponse,
} from "../redux/activities/types/activities.interface";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

export const ActivitiesService = {
  // Like a dataset
  likeDataset: async (
    dbName: string,
    datasetId: string
  ): Promise<LikeResponse> => {
    const response = await fetch(
      `${API_URL}/activities/datasets/${dbName}/${datasetId}/like`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to like dataset");
    }

    return data;
  },

  // Unlike a dataset
  unlikeDataset: async (
    dbName: string,
    datasetId: string
  ): Promise<UnlikeResponse> => {
    const response = await fetch(
      `${API_URL}/activities/datasets/${dbName}/${datasetId}/like`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to unlike dataset");
    }

    return data;
  },

  // Save a dataset
  saveDataset: async (
    dbName: string,
    datasetId: string
  ): Promise<SaveResponse> => {
    const response = await fetch(
      `${API_URL}/activities/datasets/${dbName}/${datasetId}/save`,
      {
        method: "POST",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to save dataset");
    }

    return data;
  },

  // Unsave a dataset
  unsaveDataset: async (
    dbName: string,
    datasetId: string
  ): Promise<UnsaveResponse> => {
    const response = await fetch(
      `${API_URL}/activities/datasets/${dbName}/${datasetId}/save`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to unsave dataset");
    }

    return data;
  },

  // Get comments for a dataset
  getComments: async (
    dbName: string,
    datasetId: string
  ): Promise<GetCommentsResponse> => {
    const response = await fetch(
      `${API_URL}/activities/datasets/${dbName}/${datasetId}/comments`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch comments");
    }

    return data;
  },

  // Add a comment
  addComment: async (
    dbName: string,
    datasetId: string,
    body: string
  ): Promise<AddCommentResponse> => {
    const response = await fetch(
      `${API_URL}/activities/datasets/${dbName}/${datasetId}/comments`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ body }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to add comment");
    }

    return data;
  },

  // Update a comment
  updateComment: async (
    commentId: number,
    body: string
  ): Promise<UpdateCommentResponse> => {
    const response = await fetch(
      `${API_URL}/activities/comments/${commentId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ body }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update comment");
    }

    return data;
  },

  // Delete a comment
  deleteComment: async (commentId: number): Promise<DeleteCommentResponse> => {
    const response = await fetch(
      `${API_URL}/activities/comments/${commentId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete comment");
    }

    return data;
  },

  // Get dataset statistics (views count and likes count)
  getDatasetStats: async (
    dbName: string,
    datasetId: string
  ): Promise<GetDatasetStatsResponse> => {
    const response = await fetch(
      `${API_URL}/activities/datasets/${dbName}/${datasetId}/stats`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch dataset statistics");
    }

    return data;
  },

  // Get most viewed datasets
  getMostViewedDatasets: async (
    limit: number = 10
  ): Promise<GetMostViewedDatasetsResponse> => {
    const response = await fetch(
      `${API_URL}/activities/datasets/most-viewed?limit=${limit}`,
      {
        method: "GET",
        credentials: "include",
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch most viewed datasets");
    }

    return data;
  },
};
