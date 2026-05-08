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
import type { RegisterScreenProps } from '../../types/navigation.types';
import axios from 'axios';

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState('');

  const { registerMutation } = useAuth();

  const handleRegister = () => {
    setFormError('');
    registerMutation.mutate(
      { displayName, email, password },
      {
        onError: (error) => {
          if (axios.isAxiosError(error)) {
            if (!error.response) {
              setFormError(`Network Error: ${error.message} (URL: ${error.config?.baseURL}${error.config?.url})`);
            } else {
              const status = error.response.status;
              const raw = JSON.stringify(error.response.data);
              const msg = error.response.data?.error?.message ?? error.response.data?.message ?? raw;
              setFormError(`[${status}] ${msg}`);
            }
          } else if (error instanceof Error) {
            setFormError(error.message);
          } else {
            setFormError(String(error));
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
        <Text style={styles.title}>Create Account</Text>
        <Text style={styles.subtitle}>Join AI Generate Hub</Text>

        <Input
          label="Name"
          value={displayName}
          onChangeText={setDisplayName}
          placeholder="Your name"
        />
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
          label="Create Account"
          onPress={handleRegister}
          loading={registerMutation.isPending}
          disabled={!displayName || !email || !password}
        />

        <TouchableOpacity
          style={styles.linkContainer}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={styles.linkText}>
            Already have an account?{' '}
            <Text style={styles.link}>Sign In</Text>
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
