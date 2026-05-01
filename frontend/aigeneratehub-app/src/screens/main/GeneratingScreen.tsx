import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Alert, BackHandler, StyleSheet } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import uuid from 'react-native-uuid';
import { postGenerate, getGenerationStatus } from '../../api/generate.api';
import { useAuthStore } from '../../store/useAuthStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { Loader } from '../../components/common/Loader';
import { POLL_INTERVAL } from '../../utils/constants';
import type { GeneratingScreenProps } from '../../types/navigation.types';

const STATUS_MESSAGES = [
  'AI is mixing your templates...',
  'Composing the scene...',
  'Adding final touches...',
  'Almost there...',
];

function buildErrorMessage(error: unknown): { title: string; body: string } {
  if (axios.isAxiosError(error)) {
    if (!error.response) {
      return {
        title: 'Network Error',
        body: `Server could not be reached.\n\nURL: ${error.config?.baseURL ?? ''}${error.config?.url ?? ''}\nReason: ${error.message}`,
      };
    }

    const status = error.response.status;
    const data = error.response.data as Record<string, unknown> | undefined;
    const errObj = data?.error as Record<string, string> | undefined;
    const code = errObj?.code ?? 'UNKNOWN';
    const msg = errObj?.message ?? (data?.message as string) ?? JSON.stringify(data);
    const reqId = errObj?.requestId;

    return {
      title: `Request Failed [${status}]`,
      body: [msg, `Code: ${code}`, reqId ? `Request ID: ${reqId}` : null]
        .filter(Boolean)
        .join('\n'),
    };
  }

  if (error instanceof Error) {
    return { title: 'Error', body: error.message };
  }

  return { title: 'Unexpected Error', body: String(error) };
}

export function GeneratingScreen({ navigation }: GeneratingScreenProps) {
  const { user } = useAuthStore();
  const { selectedMainTemplateId, selectedObjectTemplateIds, clearSelections } =
    useSelectionStore();

  const [requestId, setRequestId] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const idempotencyKey = useRef<string>(uuid.v4() as string);
  const errorShown = useRef(false);

  // ── Block Android hardware back button ──────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // ── Cycle status messages ───────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  const showErrorAndGoHome = useCallback(
    (error: unknown) => {
      if (errorShown.current) return;
      errorShown.current = true;
      const { title, body } = buildErrorMessage(error);
      Alert.alert(title, body, [{ text: 'OK', onPress: () => navigation.replace('Home') }]);
    },
    [navigation],
  );

  // ── STEP 1: POST /api/v1/generate ──────────────────────────────
  const generateMutation = useMutation({
    mutationFn: () =>
      postGenerate(
        {
          mainTemplateId: selectedMainTemplateId!,
          objectTemplateIds: selectedObjectTemplateIds,
          userId: user!.id,
        },
        idempotencyKey.current,
      ),
    onSuccess: ({ data, status }) => {
      if (status === 200 && data.status === 'completed') {
        clearSelections();
        navigation.replace('Result', { imageUrl: data.imageUrl! });
      } else if (status === 202) {
        setRequestId(data.requestId);
      }
    },
    onError: showErrorAndGoHome,
  });

  // Fire the mutation exactly once when screen mounts
  useEffect(() => {
    if (!selectedMainTemplateId || !user) {
      navigation.replace('Home');
      return;
    }
    generateMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── STEP 2: Poll GET /api/v1/generate/{requestId} ──────────────
  const pollingQuery = useQuery({
    queryKey: ['generationStatus', requestId],
    queryFn: () => getGenerationStatus(requestId!),
    enabled: requestId !== null,
    retry: 3,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return POLL_INTERVAL;
    },
  });

  // ── React to polling data ───────────────────────────────────────
  useEffect(() => {
    const data = pollingQuery.data;
    if (!data) return;

    if (data.status === 'completed' && data.imageUrl) {
      clearSelections();
      navigation.replace('Result', { imageUrl: data.imageUrl });
    } else if (data.status === 'failed') {
      if (errorShown.current) return;
      errorShown.current = true;
      Alert.alert(
        'Generation Failed',
        data.errorMessage ?? 'Image generation failed on the server. Please try again.',
        [{ text: 'OK', onPress: () => navigation.replace('Home') }],
      );
    }
  }, [pollingQuery.data, clearSelections, navigation]);

  // ── React to polling network/server errors ──────────────────────
  useEffect(() => {
    if (pollingQuery.isError) {
      showErrorAndGoHome(pollingQuery.error);
    }
  }, [pollingQuery.isError, pollingQuery.error, showErrorAndGoHome]);

  return (
    <View style={styles.container}>
      <Loader message={STATUS_MESSAGES[messageIndex]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
});
