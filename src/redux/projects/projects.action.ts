import {
  CreateProjectPayload,
  UpdateProjectPayload,
  DeleteProjectPayload,
  GetProjectPayload,
} from "./types/projects.interface";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { ProjectsService } from "services/projects.service";

// Get all user's projects
export const getUserProjects = createAsyncThunk(
  "projects/getUserProjects",
  async (_, { rejectWithValue }) => {
    try {
      const response = await ProjectsService.getUserProjects();
      return response.projects;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch projects");
    }
  }
);

// Create new project
export const createProject = createAsyncThunk(
  "projects/createProject",
  async (payload: CreateProjectPayload, { rejectWithValue }) => {
    try {
      const response = await ProjectsService.createProject(payload);
      return response.project;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to create project");
    }
  }
);

// Get specific project
export const getProject = createAsyncThunk(
  "projects/getProject",
  async (payload: GetProjectPayload, { rejectWithValue }) => {
    try {
      const response = await ProjectsService.getProject(payload.projectId);
      return response.project;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch project");
    }
  }
);

// Update project
export const updateProject = createAsyncThunk(
  "projects/updateProject",
  async (payload: UpdateProjectPayload, { rejectWithValue }) => {
    try {
      const response = await ProjectsService.updateProject(payload);
      return response.project;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to update project");
    }
  }
);

// Delete project
export const deleteProject = createAsyncThunk(
  "projects/deleteProject",
  async (payload: DeleteProjectPayload, { rejectWithValue }) => {
    try {
      await ProjectsService.deleteProject(payload.projectId);
      return payload.projectId;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to delete project");
    }
  }
);
