import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  nome: string;
  role: string;
  avatar?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (email, password) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('ca_token', data.access_token);
        set({ user: data.user, token: data.access_token, isAuthenticated: true });
      },

      logout: () => {
        localStorage.removeItem('ca_token');
        localStorage.removeItem('ca_user');
        set({ user: null, token: null, isAuthenticated: false });
        window.location.href = '/login';
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: 'ca_auth',
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
    },
  ),
);
