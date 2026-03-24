// Comment from the database
export interface Comment {
  id: number;
  user_id: number;
  dataset_id: number;
  body: string;
  created_at: string;
  updated_at: string;
  // When comments are fetched with user info included
  User?: {
    id: number;
    username: string;
  };
}

// Dataset from the database
export interface Dataset {
  id: number;
  couch_db: string;
  ds_id: string;
  views_count: number;
}

// Like relationship
export interface DatasetLike {
  id: number;
  user_id: number;
  dataset_id: number;
  created_at: string;
}

// Saved dataset relationship
export interface SavedDataset {
  id: number;
  user_id: number;
  dataset_id: number;
  created_at: string;
}

// View history
export interface ViewHistory {
  id: number;
  user_id: number;
  dataset_id: number;
  viewed_at: string;
}

// Activity status for a specific dataset (frontend state)
export interface DatasetActivityStatus {
  isLiked: boolean;
  isSaved: boolean;
  comments: Comment[];
  viewsCount: number;
  likesCount: number;
  isLoadingLike: boolean;
  isLoadingSave: boolean;
  isLoadingComments: boolean;
  isLoadingStats: boolean;
}

// Redux state (for initial state and update)
export interface ActivitiesState {
  // Key format: "dbName:datasetId"
  datasetActivities: Record<string, DatasetActivityStatus>;
  mostViewedDatasets: MostViewedDataset[];
  userSavedDatasets: UserSavedDataset[];
  userLikedDatasets: UserLikedDataset[];
  error: string | null;
  loading: boolean;
}

// Action payloads
export interface LikeDatasetPayload {
  dbName: string;
  datasetId: string;
}

export interface SaveDatasetPayload {
  dbName: string;
  datasetId: string;
}

export interface AddCommentPayload {
  dbName: string;
  datasetId: string;
  body: string;
}

export interface UpdateCommentPayload {
  commentId: number;
  body: string;
}

export interface DeleteCommentPayload {
  commentId: number;
}

export interface GetCommentsPayload {
  dbName: string;
  datasetId: string;
}

export interface GetDatasetStatsPayload {
  dbName: string;
  datasetId: string;
}

export interface GetMostViewedDatasetsPayload {
  limit?: number;
}

// API Response interfaces
export interface GetCommentsResponse {
  comments: Comment[];
}

export interface AddCommentResponse {
  message: string;
  comment: Comment;
}

export interface UpdateCommentResponse {
  message: string;
  comment: Comment;
}

export interface DeleteCommentResponse {
  message: string;
}

export interface LikeResponse {
  message: string;
}

export interface UnlikeResponse {
  message: string;
}

export interface SaveResponse {
  message: string;
}

export interface UnsaveResponse {
  message: string;
}

export interface GetDatasetStatsResponse {
  viewsCount: number;
  likesCount: number;
  dataset: Dataset | null;
}

export interface MostViewedDataset {
  id: number;
  couch_db: string;
  ds_id: string;
  views_count: number;
}

export interface GetMostViewedDatasetsResponse {
  mostViewed: MostViewedDataset[];
  datasetsCount: number;
}

// Add
export interface CheckUserActivityPayload {
  dbName: string;
  datasetId: string;
}

export interface CheckUserActivityResponse {
  isLiked: boolean;
  isSaved: boolean;
}

export interface UserSavedDataset {
  id: number;
  couch_db: string;
  ds_id: string;
  views_count: number;
  saved_at: string;
}

export interface UserLikedDataset {
  id: number;
  couch_db: string;
  ds_id: string;
  views_count: number;
  liked_at: string;
}

export interface GetUserSavedDatasetsResponse {
  savedDatasets: UserSavedDataset[];
  count: number;
}

export interface GetUserLikedDatasetsResponse {
  likedDatasets: UserLikedDataset[];
  count: number;
}
