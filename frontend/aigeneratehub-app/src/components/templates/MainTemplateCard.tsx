import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import type { MainTemplate } from '../../types/template.types';

interface MainTemplateCardProps {
  template: MainTemplate;
  selected: boolean;
  onPress: (id: string) => void;
}

export function MainTemplateCard({ template, selected, onPress }: MainTemplateCardProps) {
  return (
    <TouchableOpacity
      style={[styles.card, selected && styles.cardSelected]}
      onPress={() => onPress(template.id)}
      activeOpacity={0.8}
    >
      {template.thumbnailUrl ? (
        <Image source={{ uri: template.thumbnailUrl }} style={styles.thumbnail} resizeMode="cover" />
      ) : (
        <View style={styles.thumbnail} />
      )}
      <View style={styles.footer}>
        <Text style={styles.name} numberOfLines={2}>
          {template.name}
        </Text>
        <Text style={styles.category}>{template.category}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 12,
    backgroundColor: '#1E293B',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardSelected: {
    borderColor: '#3B82F6',
  },
  thumbnail: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#334155',
  },
  footer: {
    padding: 10,
  },
  name: {
    fontSize: 13,
    fontWeight: '600',
    color: '#F1F5F9',
    marginBottom: 2,
  },
  category: {
    fontSize: 11,
    color: '#64748B',
  },
});
