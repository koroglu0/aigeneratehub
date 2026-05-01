import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types/api.types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setAuth: async (token, user) => {
    await SecureStore.setItemAsync('auth_token', token);
    set({ token, user });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null });
  },
}));
