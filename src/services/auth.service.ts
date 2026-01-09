import {
  SignupResponse,
  LoginResponse,
  LoginErrorResponse,
  LoginCredentials,
  SignupData,
  User,
  ChangePasswordData,
} from "redux/auth/types/auth.interface";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1";

export const AuthService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponse> => {
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
      // NEW: Check if it's the unverified email error (403)
      if (response.status === 403 && data.requiresVerification) {
        // Create a typed error that includes the full error response
        const error = new Error(
          data.message || "Email not verified"
        ) as Error & {
          data: LoginErrorResponse;
        };
        error.data = data as LoginErrorResponse;
        throw error;
      }
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

  logout: async (): Promise<void> => {
    const response = await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error("Logout failed");
    }
  },
  signup: async (signupData: SignupData): Promise<SignupResponse> => {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(signupData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Signup failed");
    }

    return data;
  },
  changePassword: async (passwordData: ChangePasswordData): Promise<string> => {
    const response = await fetch(`${API_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(passwordData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Failed to change password");
    }

    return data.message;
  },
};
