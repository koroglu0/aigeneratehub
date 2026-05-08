import React from 'react';
import {
  View,
  Text,
  FlatList,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { getMainTemplates, getObjectTemplates } from '../../api/templates.api';
import { useSelectionStore } from '../../store/useSelectionStore';
import { MainTemplateCard } from '../../components/templates/MainTemplateCard';
import { ObjectTemplateBadge } from '../../components/templates/ObjectTemplateBadge';
import { Button } from '../../components/common/Button';
import { Loader } from '../../components/common/Loader';
import { MAX_OBJECT_TEMPLATES } from '../../utils/constants';
import type { HomeScreenProps } from '../../types/navigation.types';
import type { MainTemplate } from '../../types/template.types';

export function HomeScreen({ navigation }: HomeScreenProps) {
  const {
    selectedMainTemplateId,
    selectedObjectTemplateIds,
    setMainTemplate,
    toggleObjectTemplate,
  } = useSelectionStore();

  const mainQuery = useQuery({
    queryKey: ['mainTemplates'],
    queryFn: getMainTemplates,
  });

  const objectQuery = useQuery({
    queryKey: ['objectTemplates'],
    queryFn: getObjectTemplates,
  });

  if (mainQuery.isLoading) return <Loader message="Loading templates..." />;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={styles.header}>Choose a Template</Text>
          <TouchableOpacity onPress={() => navigation.navigate('History')} style={styles.historyBtn}>
            <Text style={styles.historyBtnText}>History</Text>
          </TouchableOpacity>
        </View>

        <FlatList<MainTemplate>
          data={mainQuery.data ?? []}
          keyExtractor={(item) => item.id}
          numColumns={2}
          renderItem={({ item }) => (
            <MainTemplateCard
              template={item}
              selected={selectedMainTemplateId === item.id}
              onPress={setMainTemplate}
            />
          )}
          contentContainerStyle={styles.gridContent}
          style={styles.grid}
        />

        <View style={styles.objectsSection}>
          <Text style={styles.objectsLabel}>
            Add Objects{' '}
            <Text style={styles.objectsCount}>
              ({selectedObjectTemplateIds.length}/{MAX_OBJECT_TEMPLATES})
            </Text>
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.badgesRow}
          >
            {(objectQuery.data ?? []).map((t) => (
              <ObjectTemplateBadge
                key={t.id}
                template={t}
                selected={selectedObjectTemplateIds.includes(t.id)}
                onPress={toggleObjectTemplate}
                disabled={
                  selectedObjectTemplateIds.length >= MAX_OBJECT_TEMPLATES &&
                  !selectedObjectTemplateIds.includes(t.id)
                }
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.fabContainer}>
          <Button
            label="Next: Choose Model"
            onPress={() => navigation.navigate('ModelSelect')}
            disabled={!selectedMainTemplateId}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flex: 1,
  },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 32,
    paddingBottom: 8,
  },
  historyBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  historyBtnText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '600',
  },
  grid: {
    flex: 1,
  },
  gridContent: {
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  objectsSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  objectsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#CBD5E1',
    marginBottom: 10,
  },
  objectsCount: {
    color: '#64748B',
    fontWeight: '400',
  },
  badgesRow: {
    paddingRight: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  fabContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
});
