import { RootState } from "../store";

// Main selector
export const ProjectsSelector = (state: RootState) => state.projects;

// Get all user's projects
export const selectUserProjects = (state: RootState) => {
  return state.projects.projects;
};

// Get current project being viewed
export const selectCurrentProject = (state: RootState) => {
  return state.projects.currentProject;
};

// Get loading states
export const selectProjectsLoading = (state: RootState): boolean => {
  return state.projects.loading;
};

export const selectIsCreatingProject = (state: RootState): boolean => {
  return state.projects.isCreating;
};

export const selectIsUpdatingProject = (state: RootState): boolean => {
  return state.projects.isUpdating;
};

// Get error
export const selectProjectsError = (state: RootState): string | null => {
  return state.projects.error;
};

// Get project by ID (from cached list)
export const selectProjectById = (state: RootState, projectId: number) => {
  return state.projects.projects.find((p) => p.id === projectId);
};
