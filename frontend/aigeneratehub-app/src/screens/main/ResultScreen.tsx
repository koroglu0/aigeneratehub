import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { useSelectionStore } from '../../store/useSelectionStore';
import { ImagePreview } from '../../components/generate/ImagePreview';
import { Button } from '../../components/common/Button';
import type { ResultScreenProps } from '../../types/navigation.types';

export function ResultScreen({ route, navigation }: ResultScreenProps) {
  const { imageUrl } = route.params;
  const { clearSelections } = useSelectionStore();

  const handleSaveToGallery = async () => {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Please allow access to your photo library to save the image.',
      );
      return;
    }

    try {
      const fileUri = FileSystem.cacheDirectory + `generated_${Date.now()}.jpg`;
      const { uri } = await FileSystem.downloadAsync(imageUrl, fileUri);
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert('Saved!', 'Image saved to your gallery.');
    } catch {
      Alert.alert('Error', 'Failed to save the image. Please try again.');
    }
  };

  const handleCreateNew = () => {
    clearSelections();
    navigation.navigate('Home');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Your Visual is Ready!</Text>
        <Text style={styles.subtitle}>AI-generated just for you</Text>

        <View style={styles.previewWrapper}>
          <ImagePreview imageUrl={imageUrl} />
        </View>

        <View style={styles.actions}>
          <Button label="Save to Gallery" onPress={handleSaveToGallery} variant="primary" />
          <View style={styles.spacer} />
          <Button label="Create New" onPress={handleCreateNew} variant="secondary" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F1F5F9',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
  },
  previewWrapper: {
    marginBottom: 32,
  },
  actions: {
    gap: 12,
  },
  spacer: {
    height: 4,
  },
});
