import {
  AuthResponse,
  LoginCredentials,
  SignupData,
  User,
} from "redux/auth/types/auth.interface";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

export const AuthService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(credentials),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Login failed");
    }
    return data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: "GET",
      credentials: "include",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to fetch user");
    }

    return data.user;
  },
};
