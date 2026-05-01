import React from 'react';
import { TouchableOpacity, Text, Image, StyleSheet, View } from 'react-native';
import type { ObjectTemplate } from '../../types/template.types';

interface ObjectTemplateBadgeProps {
  template: ObjectTemplate;
  selected: boolean;
  onPress: (id: string) => void;
  disabled?: boolean;
}

export function ObjectTemplateBadge({
  template,
  selected,
  onPress,
  disabled = false,
}: ObjectTemplateBadgeProps) {
  return (
    <TouchableOpacity
      onPress={() => onPress(template.id)}
      disabled={disabled && !selected}
      activeOpacity={0.8}
      style={[
        styles.chip,
        selected && styles.chipSelected,
        disabled && !selected && styles.chipDisabled,
      ]}
    >
      <View style={styles.inner}>
        <Image source={{ uri: template.iconUrl }} style={styles.icon} resizeMode="contain" />
        <Text style={[styles.label, selected && styles.labelSelected]}>{template.name}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    marginRight: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#334155',
    backgroundColor: '#1E293B',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipSelected: {
    backgroundColor: '#3B82F6',
    borderColor: '#3B82F6',
  },
  chipDisabled: {
    opacity: 0.4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  icon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: '#334155',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#CBD5E1',
  },
  labelSelected: {
    color: '#FFFFFF',
  },
});
