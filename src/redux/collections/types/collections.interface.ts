// Collection from the database
export interface Collection {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  datasets_count?: number;
  datasets?: CollectionDataset[];
}

// Dataset within a collection (with junction table data)
export interface CollectionDataset {
  id: number;
  couch_db: string;
  ds_id: string;
  views_count: number;
  CollectionDataset?: {
    created_at: string; // When added to collection
  };
}

// Redux state
export interface CollectionsState {
  collections: Collection[]; // All user's collections
  currentCollection: Collection | null; // Currently viewing collection
  datasetCollections: Collection[]; // Collections containing a specific dataset (for menu)
  error: string | null;
  loading: boolean;
  isCreating: boolean;
  isAdding: boolean;
}

// Action payloads
export interface CreateCollectionPayload {
  name: string;
  description?: string;
  is_public?: boolean;
}

export interface UpdateCollectionPayload {
  collectionId: number;
  name?: string;
  description?: string;
  is_public?: boolean;
}

export interface DeleteCollectionPayload {
  collectionId: number;
}

export interface GetCollectionPayload {
  collectionId: number;
}

export interface AddDatasetToCollectionPayload {
  collectionId: number;
  dbName: string;
  datasetId: string;
}

export interface RemoveDatasetFromCollectionPayload {
  collectionId: number;
  datasetId: number; // Dataset.id (not ds_id)
}

export interface GetDatasetCollectionsPayload {
  dbName: string;
  datasetId: string;
}

// API Response interfaces
export interface GetUserCollectionsResponse {
  collections: Collection[];
  count: number;
}

export interface CreateCollectionResponse {
  message: string;
  collection: Collection;
}

export interface GetCollectionResponse {
  collection: Collection;
}

export interface AddDatasetResponse {
  message: string;
}

export interface RemoveDatasetResponse {
  message: string;
}

export interface UpdateCollectionResponse {
  message: string;
  collection: Collection;
}

export interface DeleteCollectionResponse {
  message: string;
}

export interface GetDatasetCollectionsResponse {
  collections: Collection[];
  count: number;
}
