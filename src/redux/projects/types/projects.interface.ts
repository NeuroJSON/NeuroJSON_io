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
    | "matlab"
    | "dicom"
    | "nirs"
    | "array"
    | "other";
  content?: string;
  contentType?: string;
  sourcePath?: string;
  isUserMeta?: boolean;
  source?: "user" | "ai" | "output";
  generatedAt?: string;
  note?: string;
  loading?: boolean;
}

// Extractor State
export interface ExtractorState {
  files: FileItem[];
  selectedIds: string[];
  expandedIds: string[];
  baseDirectoryPath?: string;
  evidenceBundle?: any; // ✅ Add this
  trioGenerated?: boolean; // ✅ Add this
}

// add
export interface EvidenceBundle {
  root: string;
  counts_by_ext: Record<string, number>;
  all_files: string[];
  documents: Array<{
    relpath: string;
    filename: string;
    type: string;
    content: string;
  }>;
  user_hints: {
    user_text: string;
    modality_hint: string;
    n_subjects: number | null;
  };
}

// Project Interface
export interface Project {
  id: number;
  public_id: string; // ← ADD
  user_id: number;
  name: string;
  description: string | null;
  extractor_state: ExtractorState;
  created_at: string;
  updated_at: string;
  file_count?: number; // Added by backend (not included in database)
}

// Redux State
export interface ProjectsState {
  projects: Project[];
  currentProject: Project | null;
  error: string | null;
  loading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
}

// API Response Types
export interface GetUserProjectsResponse {
  projects: Project[];
  count: number;
}

export interface CreateProjectResponse {
  message: string;
  project: Project;
}

export interface GetProjectResponse {
  project: Project;
}

export interface UpdateProjectResponse {
  message: string;
  project: Project;
}

export interface DeleteProjectResponse {
  message: string;
}

// Payload Types
export interface CreateProjectPayload {
  name?: string;
  description?: string;
}

export interface GetProjectPayload {
  // projectId: number;
  projectId: string;
}

export interface UpdateProjectPayload {
  projectId: string; // ← was number
  name?: string;
  description?: string;
  extractor_state?: ExtractorState;
}

export interface DeleteProjectPayload {
  projectId: string; // ← was number
}

// export interface LLMProvider {
//   name: string;
//   baseUrl: string;
//   models: Array<{ id: string; name: string }>;
//   noApiKey?: boolean;
//   customUrl?: boolean;
//   isAnthropic?: boolean;
// }
