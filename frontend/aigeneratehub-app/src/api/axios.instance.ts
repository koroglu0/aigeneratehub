import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';
import { API_URL, SECURE_STORE_TOKEN_KEY } from '../utils/constants';
import { useAuthStore } from '../store/useAuthStore';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ──────────────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  // 1. Attach JWT if present
  const token = await SecureStore.getItemAsync(SECURE_STORE_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Attach idempotency / tracing header
  config.headers['X-Request-ID'] = uuid.v4() as string;

  return config;
});

// ── Response interceptor ─────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(SECURE_STORE_TOKEN_KEY);
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
