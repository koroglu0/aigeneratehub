import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SECURE_STORE_TOKEN_KEY } from '../utils/constants';
import { Loader } from '../components/common/Loader';
import { getMe } from '../api/auth.api';

export function RootNavigator() {
  const { token, setAuth, logout } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  // On cold start: restore token from SecureStore and validate it
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(SECURE_STORE_TOKEN_KEY);
        if (stored) {
          const user = await getMe();
          await setAuth(stored, user);
        }
      } catch {
        await logout();
      } finally {
        setBootstrapping(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (bootstrapping) return <Loader message="Loading..." />;

  return (
    <NavigationContainer>
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
