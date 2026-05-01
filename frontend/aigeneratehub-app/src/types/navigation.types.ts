import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Generating: undefined;
  Result: { imageUrl: string };
};

export type LoginScreenProps      = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps   = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type HomeScreenProps       = NativeStackScreenProps<MainStackParamList, 'Home'>;
export type GeneratingScreenProps = NativeStackScreenProps<MainStackParamList, 'Generating'>;
export type ResultScreenProps     = NativeStackScreenProps<MainStackParamList, 'Result'>;
