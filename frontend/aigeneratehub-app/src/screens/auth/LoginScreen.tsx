import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { handleApiError } from '../../utils/errorHandler';
import type { LoginScreenProps } from '../../types/navigation.types';
import axios from 'axios';

export function LoginScreen({ navigation }: LoginScreenProps) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { loginMutation } = useAuth();

  const handleLogin = () => {
    setFormError('');
    loginMutation.mutate(
      { email, password },
      {
        onError: (error) => {
          if (axios.isAxiosError(error) && (error.response?.status === 400 || error.response?.status === 401)) {
            const msg = error.response?.data?.error?.message ?? 'Invalid email or password.';
            setFormError(msg);
          } else {
            handleApiError(error);
          }
        },
      },
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>AI Generate Hub</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
        />
        <Input
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          secureTextEntry
        />

        {formError ? <Text style={styles.formError}>{formError}</Text> : null}

        <Button
          label="Sign In"
          onPress={handleLogin}
          loading={loginMutation.isPending}
          disabled={!email || !password}
        />

        <TouchableOpacity
          style={styles.linkContainer}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.linkText}>
            Don't have an account?{' '}
            <Text style={styles.link}>Sign Up</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 36,
  },
  formError: {
    fontSize: 13,
    color: '#EF4444',
    marginBottom: 12,
    textAlign: 'center',
  },
  linkContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    fontSize: 14,
    color: '#64748B',
  },
  link: {
    color: '#3B82F6',
    fontWeight: '600',
  },
});
