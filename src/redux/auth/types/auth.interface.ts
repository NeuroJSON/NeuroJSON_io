export interface User {
  id: number;
  username: string;
  email: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: User;
}

export interface IAuthState {
  user: User | null;
  isLoggedIn: boolean;
  loading: boolean;
  error: string | null;
}
