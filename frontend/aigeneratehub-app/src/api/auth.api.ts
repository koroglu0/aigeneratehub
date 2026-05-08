import apiClient from './axios.instance';
import type { LoginRequest, RegisterRequest, User } from '../types/api.types';

interface BackendUser {
  userId: string;
  email: string;
  displayName: string;
}

const mapUser = (d: BackendUser): User => ({
  id: d.userId,
  email: d.email,
  name: d.displayName,
});

export const login = (body: LoginRequest) =>
  apiClient
    .post<{ success: true; data: { token: string; userId: string; expiresIn: number } }>(
      '/api/v1/users/login',
      body,
    )
    .then(r => r.data.data);

export const register = (body: RegisterRequest) =>
  apiClient
    .post<{ success: true; data: BackendUser }>('/api/v1/users/register', body)
    .then(r => r.data.data);

export const getMe = () =>
  apiClient
    .get<{ success: true; data: BackendUser }>('/api/v1/users/me')
    .then(r => mapUser(r.data.data));

export const getMeWithToken = (token: string) =>
  apiClient
    .get<{ success: true; data: BackendUser }>('/api/v1/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    .then(r => mapUser(r.data.data));
