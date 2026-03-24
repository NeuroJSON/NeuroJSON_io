// src/redux/projects/projects.slice.ts
import {
  getUserProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
} from "./projects.action";
import { ProjectsState } from "./types/projects.interface";
import { createSlice } from "@reduxjs/toolkit";

const initialState: ProjectsState = {
  projects: [],
  currentProject: null,
  error: null,
  loading: false,
  isCreating: false,
  isUpdating: false,
};

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentProject: (state) => {
      state.currentProject = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Get User Projects
      .addCase(getUserProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getUserProjects.fulfilled, (state, action) => {
        state.projects = action.payload;
        state.loading = false;
      })
      .addCase(getUserProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Create Project
      .addCase(createProject.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects = [action.payload, ...state.projects];
        //   state.currentProject = action.payload;
        state.isCreating = false;
      })
      .addCase(createProject.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })

      // Get Project
      .addCase(getProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProject.fulfilled, (state, action) => {
        state.currentProject = action.payload;
        state.loading = false;
      })
      .addCase(getProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })

      // Update Project
      .addCase(updateProject.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateProject.fulfilled, (state) => {
        state.isUpdating = false;
        // Component will refetch projects list
      })
      .addCase(updateProject.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })

      // Delete Project
      .addCase(deleteProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteProject.fulfilled, (state) => {
        state.loading = false;
        // Component will refetch or navigate away
      })
      .addCase(deleteProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, clearCurrentProject } = projectsSlice.actions;

export default projectsSlice.reducer;
