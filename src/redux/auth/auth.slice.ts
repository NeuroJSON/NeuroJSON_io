import {
  loginUser,
  getCurrentUser,
  logoutUser,
  signupUser,
  changePassword,
  forgotPassword,
  resetPassword,
} from "./auth.action";
import {
  IAuthState,
  User,
  LoginResponse,
  SignupResponse,
  LoginErrorResponse,
  ForgotPasswordResponse,
  ResetPasswordResponse,
} from "./types/auth.interface";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Type guard function
export function isLoginErrorResponse(error: any): error is LoginErrorResponse {
  return (
    typeof error === "object" &&
    error !== null &&
    "requiresVerification" in error &&
    "message" in error
  );
}

const initialState: IAuthState = {
  user: null,
  isLoggedIn: false,
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // login
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        loginUser.fulfilled,
        (state, action: PayloadAction<LoginResponse>) => {
          state.loading = false;
          state.isLoggedIn = true;
          state.user = action.payload.user;
          state.error = null;
        }
      )
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        // state.error = action.payload as string;
        const errorPayload = action.payload;

        // Check if it's LoginErrorResponse (email not verified)
        if (isLoginErrorResponse(errorPayload)) {
          // TypeScript now knows errorPayload is LoginErrorResponse
          state.error = errorPayload.message;
          // state.unverifiedEmail = errorPayload.email;  // if you add this to state
        } else {
          state.error = errorPayload as string;
        }
      })
      // Get Current User
      .addCase(getCurrentUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        getCurrentUser.fulfilled,
        (state, action: PayloadAction<User>) => {
          state.loading = false;
          state.isLoggedIn = true;
          state.user = action.payload;
          state.error = null;
        }
      )
      .addCase(getCurrentUser.rejected, (state, action) => {
        state.loading = false;
        state.isLoggedIn = false;
        state.user = null;
        state.error = action.payload as string;
      })
      // Logout
      .addCase(logoutUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.loading = false;
        state.isLoggedIn = false;
        state.user = null;
        state.error = null;
      })
      .addCase(logoutUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Signup
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        signupUser.fulfilled,
        (state, action: PayloadAction<SignupResponse>) => {
          state.loading = false;

          // state.isLoggedIn = true;
          // state.user = action.payload;
          if (action.payload.requiresVerification) {
            state.isLoggedIn = false;
            state.user = null;
          } else {
            state.isLoggedIn = true;
            state.user = action.payload.user;
          }
          state.error = null;
        }
      )
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Change Password
      .addCase(changePassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(changePassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // Password changed successfully - no state update needed
      })
      .addCase(changePassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Forgot Password
      .addCase(forgotPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(forgotPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // Success - no state update needed
      })
      .addCase(forgotPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // Reset Password
      .addCase(resetPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetPassword.fulfilled, (state) => {
        state.loading = false;
        state.error = null;
        // Success - no state update needed
      })
      .addCase(resetPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError } = authSlice.actions;

export default authSlice.reducer;
