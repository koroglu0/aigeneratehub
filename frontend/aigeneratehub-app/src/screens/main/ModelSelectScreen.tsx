import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getAvailableModels } from '../../api/models.api';
import { useSelectionStore } from '../../store/useSelectionStore';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import type { ModelSelectScreenProps } from '../../types/navigation.types';
import type { AiModel } from '../../types/api.types';

export function ModelSelectScreen({ navigation }: ModelSelectScreenProps) {
  const { selectedModel, setModel } = useSelectionStore();

  const modelsQuery = useQuery({
    queryKey: ['availableModels'],
    queryFn: getAvailableModels,
    staleTime: 10 * 60 * 1000,
  });

  if (modelsQuery.isLoading) return <Loader message="Loading models..." />;

  if (modelsQuery.isError) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Could not load models.{'\n'}Pull-to-retry or go back.
          </Text>
          <Button label="Retry" onPress={() => modelsQuery.refetch()} />
        </View>
      </SafeAreaView>
    );
  }

  const models = modelsQuery.data ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.header}>Choose a Model</Text>
        <Text style={styles.subheader}>Pollinations.ai — free tier</Text>

        <FlatList<AiModel>
          data={models}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const isSelected = selectedModel === item.id;
            return (
              <TouchableOpacity
                style={[styles.row, isSelected && styles.rowSelected]}
                onPress={() => setModel(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.rowText}>
                  <Text style={styles.modelName}>{item.name}</Text>
                  {item.description ? (
                    <Text style={styles.modelDesc} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}
                </View>
                <View style={[styles.radio, isSelected && styles.radioSelected]}>
                  {isSelected ? <View style={styles.radioDot} /> : null}
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
        />

        <View style={styles.footer}>
          <Button
            label="Generate Visual"
            onPress={() => navigation.navigate('Generating')}
            disabled={!selectedModel}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0F172A' },
  container: { flex: 1 },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subheader: {
    fontSize: 12,
    color: '#64748B',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  listContent: { paddingHorizontal: 12, paddingBottom: 8 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 14,
    marginVertical: 5,
    marginHorizontal: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  rowSelected: { borderColor: '#3B82F6' },
  rowText: { flex: 1, paddingRight: 12 },
  modelName: { fontSize: 15, fontWeight: '600', color: '#F1F5F9' },
  modelDesc: { fontSize: 12, color: '#94A3B8', marginTop: 4 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#475569',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#3B82F6' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#3B82F6' },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    gap: 16,
  },
  errorText: {
    color: '#F1F5F9',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 12,
  },
});
