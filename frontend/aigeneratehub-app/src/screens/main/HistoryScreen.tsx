import React from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getGenerationHistory } from '../../api/generate.api';
import type { GenerationHistoryItem } from '../../types/api.types';
import type { HistoryScreenProps } from '../../types/navigation.types';

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
}

function HistoryCard({ item, onPress }: { item: GenerationHistoryItem; onPress: () => void }) {
  const failed = item.status === 'failed';
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      disabled={failed || !item.imageUrl}
      activeOpacity={0.8}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
          <Text style={styles.placeholderText}>{failed ? 'Failed' : '...'}</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.model}>{item.aiModel}</Text>
        {failed && <Text style={styles.failed}>Generation failed</Text>}
      </View>
    </TouchableOpacity>
  );
}

export function HistoryScreen({ navigation }: HistoryScreenProps) {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['generationHistory'],
    queryFn: () => getGenerationHistory(),
  });

  const items = data?.items ?? [];

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>My Generations</Text>
        <View style={styles.backBtn} />
      </View>

      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#3B82F6" size="large" />
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load history.</Text>
          <TouchableOpacity onPress={() => refetch()} style={styles.retryBtn}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No generations yet.</Text>
          <Text style={styles.emptySubtext}>Generate your first image from the Home screen!</Text>
        </View>
      )}

      {!isLoading && !isError && items.length > 0 && (
        <FlatList<GenerationHistoryItem>
          data={items}
          keyExtractor={(item) => item.requestId}
          numColumns={2}
          contentContainerStyle={styles.grid}
          renderItem={({ item }) => (
            <HistoryCard
              item={item}
              onPress={() => {
                if (item.imageUrl) {
                  navigation.navigate('Result', { imageUrl: item.imageUrl });
                }
              }}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  backBtn: {
    width: 60,
  },
  backText: {
    color: '#3B82F6',
    fontSize: 15,
  },
  title: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  grid: {
    padding: 8,
  },
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
  },
  thumbnailPlaceholder: {
    backgroundColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#64748B',
    fontSize: 13,
  },
  cardInfo: {
    padding: 8,
    gap: 2,
  },
  date: {
    color: '#94A3B8',
    fontSize: 12,
  },
  model: {
    color: '#CBD5E1',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  failed: {
    color: '#EF4444',
    fontSize: 11,
  },
  emptyText: {
    color: '#F1F5F9',
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtext: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 15,
  },
  retryBtn: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
  },
});
