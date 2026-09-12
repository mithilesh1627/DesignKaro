import { create } from "zustand";

export interface UserProfile {
  username: string;
  full_name?: string;
  bio?: string;
  experience_level: string;
  current_rank: string;
  target_qps: number;
}

export interface User {
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  created_at: string;
  profile?: UserProfile;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  setAuth: (user, accessToken, refreshToken) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dk_access_token", accessToken);
      localStorage.setItem("dk_refresh_token", refreshToken);
    }
    set({ user, accessToken, refreshToken, isAuthenticated: true });
  },
  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("dk_access_token");
      localStorage.removeItem("dk_refresh_token");
    }
    set({ user: null, accessToken: null, refreshToken: null, isAuthenticated: false });
  },
}));
