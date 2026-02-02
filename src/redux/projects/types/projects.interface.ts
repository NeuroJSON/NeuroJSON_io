export interface FileItem {
  id: string;
  name: string;
  type: "file" | "folder" | "zip";
  parentId: string | null;
  fileType?:
    | "text"
    | "nifti"
    | "hdf5"
    | "neurojsonText"
    | "neurojsonBinary"
    | "office"
    | "meta"
    | "other";
  content?: string;
  contentType?: string;
  sourcePath?: string;
  isUserMeta?: boolean;
  note?: string;
  loading?: boolean;
}

export interface ExtractorState {
  files: FileItem[];
  selectedIds: string[];
  expandedIds: string[];
}

export interface Project {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  extractor_state: ExtractorState;
  created_at: string;
  updated_at: string;
  file_count?: number; // Added by backend (not included in database)
}

export interface LLMProvider {
  name: string;
  baseUrl: string;
  models: Array<{ id: string; name: string }>;
  noApiKey?: boolean;
  customUrl?: boolean;
  isAnthropic?: boolean;
}
