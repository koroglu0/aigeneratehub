import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  ModelSelect: undefined;
  Generating: undefined;
  Result: { imageUrl: string };
  History: undefined;
};

export type LoginScreenProps        = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps     = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type HomeScreenProps         = NativeStackScreenProps<MainStackParamList, 'Home'>;
export type ModelSelectScreenProps  = NativeStackScreenProps<MainStackParamList, 'ModelSelect'>;
export type GeneratingScreenProps   = NativeStackScreenProps<MainStackParamList, 'Generating'>;
export type ResultScreenProps       = NativeStackScreenProps<MainStackParamList, 'Result'>;
export type HistoryScreenProps      = NativeStackScreenProps<MainStackParamList, 'History'>;
