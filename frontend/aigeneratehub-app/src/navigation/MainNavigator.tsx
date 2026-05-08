import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types/navigation.types';
import { HomeScreen }        from '../screens/main/HomeScreen';
import { ModelSelectScreen } from '../screens/main/ModelSelectScreen';
import { GeneratingScreen }  from '../screens/main/GeneratingScreen';
import { ResultScreen }      from '../screens/main/ResultScreen';
import { HistoryScreen }     from '../screens/main/HistoryScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"        component={HomeScreen} />
      <Stack.Screen name="ModelSelect" component={ModelSelectScreen} />
      <Stack.Screen
        name="Generating"
        component={GeneratingScreen}
        options={{ gestureEnabled: false }}
      />
      <Stack.Screen name="Result"   component={ResultScreen} />
      <Stack.Screen name="History"  component={HistoryScreen} />
    </Stack.Navigator>
  );
}
