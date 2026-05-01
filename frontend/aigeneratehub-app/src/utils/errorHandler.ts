import { Alert } from 'react-native';
import axios from 'axios';
import type { ApiErrorBody } from '../types/api.types';

const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMIT_EXCEEDED: 'You are generating too fast. Please wait a minute.',
  UNAUTHORIZED:        'Your session has expired. Please log in again.',
  TEMPLATE_NOT_FOUND:  'One of the selected templates is no longer available.',
};

export function handleApiError(error: unknown): void {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;

    if (body?.error) {
      const { code, message } = body.error;
      const friendly = ERROR_MESSAGES[code] ?? message;
      Alert.alert('Error', friendly);
      return;
    }

    // Network errors (no response)
    if (!error.response) {
      Alert.alert('Network Error', 'Could not reach the server. Please check your connection.');
      return;
    }
  }

  // Fallback for unexpected errors
  Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
}
