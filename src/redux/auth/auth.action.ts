import { LoginCredentials, SignupData } from "./types/auth.interface";
import { createAsyncThunk } from "@reduxjs/toolkit";
import { AuthService } from "services/auth.service";

export const loginUser = createAsyncThunk(
  "auth/login",
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const response = await AuthService.login(credentials);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const user = await AuthService.getCurrentUser();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.message || "Failed to fetch user");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await AuthService.logout();
      return null;
    } catch (error: any) {
      return rejectWithValue(error.message || "Logout failed");
    }
  }
);

export const signupUser = createAsyncThunk(
  "auth/register",
  async (signupData: SignupData, { rejectWithValue }) => {
    try {
      console.log("signupdata", signupData);
      const response = await AuthService.signup(signupData);
      return response.user;
    } catch (error: any) {
      return rejectWithValue(error.message || "Signup failed");
    }
  }
);
