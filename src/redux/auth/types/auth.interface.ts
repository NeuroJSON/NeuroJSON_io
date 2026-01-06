export interface User {
  id: number;
  username: string;
  email: string;
  email_verified: boolean;
  firstName?: string;
  lastName?: string;
  company?: string;
  interests?: string;
  created_at?: string; //  (optional)
  updated_at?: string; //  (optional)
  google_id?: string; //  (optional, for OAuth)
  orcid_id?: string; //  (optional, for OAuth)
  github_id?: string; //  (optional, for OAuth)
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  username: string;
  email: string;
  password: string;
  firstName: string; // ← NEW
  lastName: string; // ← NEW
  company: string; // ← NEW
  interests?: string; // ← NEW
}

// export interface AuthResponse {
//   message: string;
//   user: User;
//   requiresVerification?: boolean;
// }

export interface SignupResponse {
  message: string;
  user: User;
  requiresVerification?: boolean;
}

export interface LoginResponse {
  message: string;
  user: User;
}

export interface LoginErrorResponse {
  message: string;
  requiresVerification: boolean;
  email: string;
}

export interface IAuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
}
