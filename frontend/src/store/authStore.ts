import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isAuthenticated: false,

  login: (token, user) => {
    localStorage.setItem('cp_token', token);
    localStorage.setItem('cp_user', JSON.stringify(user));
    set({ token, user, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('cp_token');
    localStorage.removeItem('cp_user');
    set({ token: null, user: null, isAuthenticated: false });
  },

  initialize: () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('cp_token');
      const userStr = localStorage.getItem('cp_user');
      if (token && userStr) {
        try {
          const user = JSON.parse(userStr);
          set({ token, user, isAuthenticated: true });
        } catch (e) {
          localStorage.removeItem('cp_token');
          localStorage.removeItem('cp_user');
        }
      }
    }
  }
}));
