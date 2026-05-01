import { useMutation } from '@tanstack/react-query';
import { login, register, getMeWithToken } from '../api/auth.api';
import { useAuthStore } from '../store/useAuthStore';
import type { LoginRequest, RegisterRequest } from '../types/api.types';

export function useAuth() {
  const { setAuth } = useAuthStore();

  const loginMutation = useMutation({
    mutationFn: async (body: LoginRequest) => {
      const { token } = await login(body);
      const user = await getMeWithToken(token);
      return { token, user };
    },
    onSuccess: ({ token, user }) => {
      setAuth(token, user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (body: RegisterRequest) => {
      await register(body);
      const { token } = await login({ email: body.email, password: body.password });
      const user = await getMeWithToken(token);
      return { token, user };
    },
    onSuccess: ({ token, user }) => {
      setAuth(token, user);
    },
  });

  return { loginMutation, registerMutation };
}
