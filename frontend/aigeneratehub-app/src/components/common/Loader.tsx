import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';

interface LoaderProps {
  message?: string;
}

export function Loader({ message }: LoaderProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#3B82F6" />
      {message ? <Text style={styles.message}>{message}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F172A',
  },
  message: {
    marginTop: 20,
    fontSize: 16,
    color: '#CBD5E1',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
