import {
  GetUserProjectsResponse,
  CreateProjectResponse,
  CreateProjectPayload,
  GetProjectResponse,
  UpdateProjectResponse,
  UpdateProjectPayload,
  DeleteProjectResponse,
} from "../redux/projects/types/projects.interface";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

export const ProjectsService = {
  // Get all user's projects
  getUserProjects: async (): Promise<GetUserProjectsResponse> => {
    const response = await fetch(`${API_URL}/projects/me/projects`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch projects");
    }

    return data;
  },

  // Create new project
  createProject: async (
    payload: CreateProjectPayload
  ): Promise<CreateProjectResponse> => {
    const response = await fetch(`${API_URL}/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to create project");
    }

    return data;
  },

  // Get specific project
  getProject: async (projectId: number): Promise<GetProjectResponse> => {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch project");
    }

    return data;
  },

  // Update project
  updateProject: async (
    payload: UpdateProjectPayload
  ): Promise<UpdateProjectResponse> => {
    const { projectId, ...updates } = payload;

    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to update project");
    }

    return data;
  },

  // Delete project
  deleteProject: async (projectId: number): Promise<DeleteProjectResponse> => {
    const response = await fetch(`${API_URL}/projects/${projectId}`, {
      method: "DELETE",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to delete project");
    }

    return data;
  },
};
