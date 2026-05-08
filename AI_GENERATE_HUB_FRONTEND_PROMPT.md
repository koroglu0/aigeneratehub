# AI Generate Hub — React Native Frontend Specification

> **Role:** You are a Senior React Native Frontend Architect.
> **Task:** Build a complete, production-ready mobile application that consumes the AI Generate Hub microservices backend.
> **Constraint:** Follow every specification exactly. Do not substitute technologies, do not omit any section, do not add unrequested dependencies.

---

## Table of Contents

1. [Project Overview & User Flow](#1-project-overview--user-flow)
2. [Technology Stack (Non-Negotiable)](#2-technology-stack-non-negotiable)
3. [Project Structure](#3-project-structure)
4. [TypeScript Types & Interfaces](#4-typescript-types--interfaces)
5. [State Management — Zustand Stores](#5-state-management--zustand-stores)
6. [API Layer — Axios & Endpoints](#6-api-layer--axios--endpoints)
7. [Navigation Architecture](#7-navigation-architecture)
8. [Core Screens](#8-core-screens)
9. [Reusable Components](#9-reusable-components)
10. [The Generation & Polling Flow (Critical)](#10-the-generation--polling-flow-critical)
11. [Error Handling](#11-error-handling)
12. [Configuration Files](#12-configuration-files)
13. [Delivery Checklist](#13-delivery-checklist)

---

## 1. Project Overview & User Flow

**App Name:** AI Generate Hub
**Platform:** iOS & Android (Expo Managed Workflow)
**Purpose:** Allow users to produce AI-generated images by combining visual templates — no prompt writing required.

### Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│  STEP 1  │  Register or log in with email/password (JWT)     │
├─────────────────────────────────────────────────────────────┤
│  STEP 2  │  Home Screen: browse a 2-column grid of          │
│          │  Main Templates (e.g., Victory Day, Birthday)     │
├─────────────────────────────────────────────────────────────┤
│  STEP 3  │  Select exactly ONE Main Template                 │
│          │  (tapping another deselects the previous)         │
├─────────────────────────────────────────────────────────────┤
│  STEP 4  │  Optionally select 0–5 Object Templates from     │
│          │  a horizontal scroll strip (chips/badges)         │
├─────────────────────────────────────────────────────────────┤
│  STEP 5  │  Tap "Generate Visual" (disabled until a Main    │
│          │  Template is chosen)                              │
├─────────────────────────────────────────────────────────────┤
│  STEP 6  │  Generating Screen: full-screen animated loader  │
│          │  fires POST /api/v1/generate with Idempotency-Key │
├─────────────────────────────────────────────────────────────┤
│  STEP 7  │  202 → poll GET /api/v1/generate/{id} every 3s  │
│          │  200 → skip polling, proceed directly            │
├─────────────────────────────────────────────────────────────┤
│  STEP 8  │  Result Screen: show image, save to gallery,     │
│          │  or start a new generation                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack (Non-Negotiable)

| Concern | Library / Tool | Version |
|---|---|---|
| Framework | React Native via **Expo** (managed workflow) | SDK 51+ |
| Language | **TypeScript** — strict mode enabled | 5.x |
| Navigation | **React Navigation** — Native Stack | v6 |
| State Management | **Zustand** | v4 |
| Data Fetching / Polling | **TanStack Query (React Query)** | v5 |
| HTTP Client | **Axios** — request & response interceptors | v1 |
| Styling | **NativeWind v4** (Tailwind for RN); fall back to `StyleSheet` only if unavailable | v4 |
| Secure Storage | **expo-secure-store** | latest |
| UUID | **react-native-uuid** (v4) — Idempotency-Key generation | latest |
| Icons | **@expo/vector-icons** | latest |
| Media | **expo-media-library** — Save to Gallery | latest |
| Linting | **ESLint + Prettier** | latest |

> Do not add any library not listed above.

---

## 3. Project Structure

Create the Expo project at `aigeneratehub-app/` with the following exact structure:

```
aigeneratehub-app/
├── app.json
├── App.tsx
├── babel.config.js
├── package.json
├── tsconfig.json
├── .eslintrc.js
├── .prettierrc
└── src/
    ├── api/
    │   ├── axios.instance.ts       # Axios singleton + interceptors
    │   ├── auth.api.ts             # login, register, getMe
    │   ├── templates.api.ts        # getMainTemplates, getObjectTemplates
    │   └── generate.api.ts         # postGenerate, getGenerationStatus
    │
    ├── components/
    │   ├── common/
    │   │   ├── Button.tsx          # Primary / secondary / disabled variants
    │   │   ├── Input.tsx           # Label + field + error message
    │   │   └── Loader.tsx          # Full-screen spinner with rotating messages
    │   ├── templates/
    │   │   ├── MainTemplateCard.tsx    # Card with selected-border highlight
    │   │   └── ObjectTemplateBadge.tsx # Chip with active/inactive state
    │   └── generate/
    │       └── ImagePreview.tsx    # Renders imageUrl in a full-width card
    │
    ├── hooks/
    │   ├── useAuth.ts              # Login/register mutations + bootstrap token
    │   └── usePolling.ts           # Encapsulates TanStack Query polling logic
    │
    ├── navigation/
    │   ├── RootNavigator.tsx       # Switches between Auth and Main stacks
    │   ├── AuthNavigator.tsx       # Login → Register
    │   └── MainNavigator.tsx       # Home → Generating → Result
    │
    ├── screens/
    │   ├── auth/
    │   │   ├── LoginScreen.tsx
    │   │   └── RegisterScreen.tsx
    │   └── main/
    │       ├── HomeScreen.tsx
    │       ├── GeneratingScreen.tsx
    │       └── ResultScreen.tsx
    │
    ├── store/
    │   ├── useAuthStore.ts
    │   └── useSelectionStore.ts
    │
    ├── types/
    │   ├── api.types.ts            # Request/response shapes
    │   ├── navigation.types.ts     # Route param lists
    │   └── template.types.ts       # Domain models
    │
    └── utils/
        ├── constants.ts            # API_URL, POLL_INTERVAL, MAX_OBJECTS
        └── errorHandler.ts         # handleApiError()
```

---

## 4. TypeScript Types & Interfaces

### `src/types/template.types.ts`

```typescript
export interface MainTemplate {
  id: string;
  name: string;
  thumbnailUrl: string;
  category: string;
}

export interface ObjectTemplate {
  id: string;
  name: string;
  iconUrl: string;
}
```

### `src/types/api.types.ts`

```typescript
// ── Auth ──────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface User {
  id: string;
  email: string;
  name: string;
}

// ── Generation ────────────────────────────────────────────
export interface GenerateRequest {
  mainTemplateId: string;
  objectTemplateIds: string[];
  userId: string;
}

/** Returned on 200 OK (already completed) */
export interface GenerateCompletedResponse {
  requestId: string;
  status: 'completed';
  imageUrl: string;
}

/** Returned on 202 Accepted (still processing) */
export interface GenerateProcessingResponse {
  requestId: string;
  status: 'processing';
}

export type GenerateResponse = GenerateCompletedResponse | GenerateProcessingResponse;

/** Returned by polling endpoint */
export interface GenerationStatusResponse {
  requestId: string;
  status: 'processing' | 'completed' | 'failed';
  imageUrl?: string;
  errorMessage?: string;
}

// ── Generic API Error ──────────────────────────────────────
export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
  };
}
```

### `src/types/navigation.types.ts`

```typescript
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

export type LoginScreenProps    = NativeStackScreenProps<AuthStackParamList, 'Login'>;
export type RegisterScreenProps = NativeStackScreenProps<AuthStackParamList, 'Register'>;
export type HomeScreenProps     = NativeStackScreenProps<MainStackParamList, 'Home'>;
export type GeneratingScreenProps = NativeStackScreenProps<MainStackParamList, 'Generating'>;
export type ResultScreenProps   = NativeStackScreenProps<MainStackParamList, 'Result'>;
```

---

## 5. State Management — Zustand Stores

### `src/store/useAuthStore.ts`

```typescript
import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import type { User } from '../types/api.types';

interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,

  setAuth: (token, user) => {
    SecureStore.setItemAsync('auth_token', token);
    set({ token, user });
  },

  logout: () => {
    SecureStore.deleteItemAsync('auth_token');
    set({ token: null, user: null });
  },
}));
```

### `src/store/useSelectionStore.ts`

```typescript
import { create } from 'zustand';
import { MAX_OBJECT_TEMPLATES } from '../utils/constants';

interface SelectionState {
  selectedMainTemplateId: string | null;
  selectedObjectTemplateIds: string[];
  setMainTemplate: (id: string) => void;
  toggleObjectTemplate: (id: string) => void;
  clearSelections: () => void;
}

export const useSelectionStore = create<SelectionState>((set, get) => ({
  selectedMainTemplateId: null,
  selectedObjectTemplateIds: [],

  setMainTemplate: (id) => set({ selectedMainTemplateId: id }),

  toggleObjectTemplate: (id) => {
    const current = get().selectedObjectTemplateIds;
    if (current.includes(id)) {
      set({ selectedObjectTemplateIds: current.filter((x) => x !== id) });
    } else if (current.length < MAX_OBJECT_TEMPLATES) {
      set({ selectedObjectTemplateIds: [...current, id] });
    }
    // Silently ignore if already at max — UI badge should reflect this
  },

  clearSelections: () =>
    set({ selectedMainTemplateId: null, selectedObjectTemplateIds: [] }),
}));
```

---

## 6. API Layer — Axios & Endpoints

### `src/utils/constants.ts`

```typescript
export const API_URL       = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
export const POLL_INTERVAL  = 3000; // ms
export const MAX_OBJECT_TEMPLATES = 5;
export const SECURE_STORE_TOKEN_KEY = 'auth_token';
```

### `src/api/axios.instance.ts`

```typescript
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import uuid from 'react-native-uuid';
import { API_URL, SECURE_STORE_TOKEN_KEY } from '../utils/constants';
import { useAuthStore } from '../store/useAuthStore';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor ──────────────────────────────────────────
apiClient.interceptors.request.use(async (config) => {
  // 1. Attach JWT if present
  const token = await SecureStore.getItemAsync(SECURE_STORE_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // 2. Attach idempotency / tracing header
  config.headers['X-Request-ID'] = uuid.v4() as string;

  return config;
});

// ── Response interceptor ─────────────────────────────────────────
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync(SECURE_STORE_TOKEN_KEY);
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  },
);

export default apiClient;
```

### `src/api/auth.api.ts`

```typescript
import apiClient from './axios.instance';
import type { LoginRequest, RegisterRequest, AuthResponse, User } from '../types/api.types';

export const login    = (body: LoginRequest)    => apiClient.post<AuthResponse>('/api/v1/users/login', body);
export const register = (body: RegisterRequest) => apiClient.post<AuthResponse>('/api/v1/users/register', body);
export const getMe    = ()                       => apiClient.get<User>('/api/v1/users/me');
```

### `src/api/templates.api.ts`

```typescript
import apiClient from './axios.instance';
import type { MainTemplate, ObjectTemplate } from '../types/template.types';

export const getMainTemplates   = () => apiClient.get<MainTemplate[]>('/api/v1/templates/main');
export const getObjectTemplates = () => apiClient.get<ObjectTemplate[]>('/api/v1/templates/objects');
```

### `src/api/generate.api.ts`

```typescript
import apiClient from './axios.instance';
import type {
  GenerateRequest,
  GenerateResponse,
  GenerationStatusResponse,
} from '../types/api.types';

export const postGenerate = (body: GenerateRequest, idempotencyKey: string) =>
  apiClient.post<GenerateResponse>('/api/v1/generate', body, {
    headers: { 'Idempotency-Key': idempotencyKey },
    // Tell Axios not to throw on 202 so we can inspect it ourselves
    validateStatus: (status) => status === 200 || status === 202,
  });

export const getGenerationStatus = (requestId: string) =>
  apiClient.get<GenerationStatusResponse>(`/api/v1/generate/${requestId}`);
```

---

## 7. Navigation Architecture

### `src/navigation/RootNavigator.tsx`

```typescript
import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SECURE_STORE_TOKEN_KEY } from '../utils/constants';
import { Loader } from '../components/common/Loader';
import { getMe } from '../api/auth.api';

export function RootNavigator() {
  const { token, setAuth, logout } = useAuthStore();
  const [bootstrapping, setBootstrapping] = useState(true);

  // On cold start: restore token from SecureStore and validate it
  useEffect(() => {
    (async () => {
      try {
        const stored = await SecureStore.getItemAsync(SECURE_STORE_TOKEN_KEY);
        if (stored) {
          const { data } = await getMe();
          setAuth(stored, data);
        }
      } catch {
        logout();
      } finally {
        setBootstrapping(false);
      }
    })();
  }, []);

  if (bootstrapping) return <Loader message="Loading..." />;

  return (
    <NavigationContainer>
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
```

### `src/navigation/AuthNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '../types/navigation.types';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { RegisterScreen } from '../screens/auth/RegisterScreen';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login"    component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}
```

### `src/navigation/MainNavigator.tsx`

```typescript
import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../types/navigation.types';
import { HomeScreen }       from '../screens/main/HomeScreen';
import { GeneratingScreen } from '../screens/main/GeneratingScreen';
import { ResultScreen }     from '../screens/main/ResultScreen';

const Stack = createNativeStackNavigator<MainStackParamList>();

export function MainNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home"       component={HomeScreen} />
      <Stack.Screen
        name="Generating"
        component={GeneratingScreen}
        options={{ gestureEnabled: false }} // prevent swipe-back
      />
      <Stack.Screen name="Result" component={ResultScreen} />
    </Stack.Navigator>
  );
}
```

---

## 8. Core Screens

### `src/screens/auth/LoginScreen.tsx`

Full form with field-level error display. On success: call `setAuth` and navigation resolves automatically via `RootNavigator`.

**Requirements:**
- Fields: `email` (keyboardType email-address), `password` (secureTextEntry)
- On 400 from backend: parse `error.response.data.error.message` and show below the form
- Show loading state on the submit button while the mutation is in-flight

### `src/screens/auth/RegisterScreen.tsx`

Same pattern as Login with an additional `name` field. Link at the bottom to navigate to Login.

### `src/screens/main/HomeScreen.tsx`

```
Layout:
┌────────────────────────────────┐
│  Header: "Choose a Template"   │
├────────────────────────────────┤
│                                │
│   FlatList (numColumns=2)      │
│   MainTemplateCard × N         │
│                                │
├────────────────────────────────┤
│  "Add Objects" label           │
│  ─────────────────────────     │
│  ScrollView (horizontal)       │
│  ObjectTemplateBadge × N       │
├────────────────────────────────┤
│  [  Generate Visual  ]  ← FAB  │
│   disabled if no main selected │
└────────────────────────────────┘
```

**Key logic:**
- `useQuery(['mainTemplates'], getMainTemplates)` and `useQuery(['objectTemplates'], getObjectTemplates)`
- Read `selectedMainTemplateId` and `selectedObjectTemplateIds` from `useSelectionStore`
- Tapping a `MainTemplateCard` calls `setMainTemplate(id)`
- Tapping an `ObjectTemplateBadge` calls `toggleObjectTemplate(id)` (store enforces max 5)
- "Generate Visual" button navigates to `Generating` screen

### `src/screens/main/GeneratingScreen.tsx`

See [Section 10](#10-the-generation--polling-flow-critical) for the complete polling implementation.

**UX requirements:**
- `gestureEnabled: false` on the navigator (already set in `MainNavigator`)
- Override Android back button with `useBackHandler` or `BackHandler.addEventListener` to be a no-op
- Cycle through status messages every 3 seconds using `useEffect` + `setInterval`:
  ```
  "AI is mixing your templates..."
  "Composing the scene..."
  "Adding final touches..."
  "Almost there..."
  ```

### `src/screens/main/ResultScreen.tsx`

**Requirements:**
- Read `imageUrl` from `route.params`
- Display image in a large card (`resizeMode: 'cover'`)
- **"Save to Gallery"** button:
  - Request `MediaLibrary.requestPermissionsAsync()`
  - Download via `FileSystem.downloadAsync` to a cache URI
  - Save with `MediaLibrary.saveToLibraryAsync(localUri)`
  - Show success/failure alert
- **"Create New"** button: calls `clearSelections()` and navigates to `Home`

---

## 9. Reusable Components

### `src/components/common/Button.tsx`

```typescript
interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
}
```

- `primary`: filled blue background
- `secondary`: outlined
- `danger`: filled red
- `disabled` or `loading`: reduced opacity, non-interactive

### `src/components/common/Input.tsx`

```typescript
interface InputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: KeyboardTypeOptions;
  error?: string; // renders in red below the field
}
```

### `src/components/common/Loader.tsx`

```typescript
interface LoaderProps {
  message?: string;
}
// Full-screen centered ActivityIndicator + optional message text
```

### `src/components/templates/MainTemplateCard.tsx`

```typescript
interface MainTemplateCardProps {
  template: MainTemplate;
  selected: boolean;
  onPress: (id: string) => void;
}
// Renders thumbnailUrl, name. When selected: 2px solid Primary Blue border.
```

### `src/components/templates/ObjectTemplateBadge.tsx`

```typescript
interface ObjectTemplateBadgeProps {
  template: ObjectTemplate;
  selected: boolean;
  onPress: (id: string) => void;
  disabled?: boolean; // true when 5 already selected and this one is not
}
// Chip style. selected → blue fill + white text. disabled → gray + reduced opacity.
```

### `src/components/generate/ImagePreview.tsx`

```typescript
interface ImagePreviewProps {
  imageUrl: string;
}
// Full-width Image with aspect ratio 1:1, rounded corners, shadow.
```

---

## 10. The Generation & Polling Flow (Critical)

This is the most complex and important flow in the application. Implement it precisely.

### `src/screens/main/GeneratingScreen.tsx`

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Alert, BackHandler, StyleSheet } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import uuid from 'react-native-uuid';
import { postGenerate, getGenerationStatus } from '../../api/generate.api';
import { useAuthStore } from '../../store/useAuthStore';
import { useSelectionStore } from '../../store/useSelectionStore';
import { handleApiError } from '../../utils/errorHandler';
import { Loader } from '../../components/common/Loader';
import { POLL_INTERVAL } from '../../utils/constants';
import type { GeneratingScreenProps } from '../../types/navigation.types';

const STATUS_MESSAGES = [
  'AI is mixing your templates...',
  'Composing the scene...',
  'Adding final touches...',
  'Almost there...',
];

export function GeneratingScreen({ navigation }: GeneratingScreenProps) {
  const { user } = useAuthStore();
  const { selectedMainTemplateId, selectedObjectTemplateIds, clearSelections } = useSelectionStore();

  const [requestId, setRequestId] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);
  const idempotencyKey = useRef<string>(uuid.v4() as string);

  // ── Block Android hardware back button ──────────────────────────
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, []);

  // ── Cycle status messages ───────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % STATUS_MESSAGES.length);
    }, POLL_INTERVAL);
    return () => clearInterval(timer);
  }, []);

  // ── STEP 1: POST /api/v1/generate ──────────────────────────────
  const generateMutation = useMutation({
    mutationFn: () =>
      postGenerate(
        {
          mainTemplateId: selectedMainTemplateId!,
          objectTemplateIds: selectedObjectTemplateIds,
          userId: user!.id,
        },
        idempotencyKey.current,
      ),
    onSuccess: ({ data, status }) => {
      if (status === 200 && data.status === 'completed') {
        // Immediate result — no polling needed
        clearSelections();
        navigation.replace('Result', { imageUrl: data.imageUrl! });
      } else if (status === 202) {
        // Backend accepted the job — begin polling
        setRequestId(data.requestId);
      }
    },
    onError: (error) => {
      handleApiError(error);
      navigation.replace('Home');
    },
  });

  // Fire the mutation exactly once when screen mounts
  useEffect(() => {
    generateMutation.mutate();
  }, []);

  // ── STEP 2: Poll GET /api/v1/generate/{requestId} ──────────────
  const pollingQuery = useQuery({
    queryKey: ['generationStatus', requestId],
    queryFn: () => getGenerationStatus(requestId!).then((r) => r.data),

    // Only start polling after a requestId is available
    enabled: requestId !== null,

    // Poll every 3 seconds; stop automatically when terminal state is reached
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (status === 'completed' || status === 'failed') return false;
      return POLL_INTERVAL;
    },
  });

  // ── React to polling result ─────────────────────────────────────
  useEffect(() => {
    const data = pollingQuery.data;
    if (!data) return;

    if (data.status === 'completed' && data.imageUrl) {
      clearSelections();
      navigation.replace('Result', { imageUrl: data.imageUrl });
    } else if (data.status === 'failed') {
      Alert.alert(
        'Generation Failed',
        data.errorMessage ?? 'Something went wrong. Please try again.',
        [{ text: 'OK', onPress: () => navigation.replace('Home') }],
      );
    }
  }, [pollingQuery.data]);

  return (
    <View style={styles.container}>
      <Loader message={STATUS_MESSAGES[messageIndex]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
});
```

### Flow Diagram

```
GeneratingScreen mounts
        │
        ▼
 generateMutation.mutate()
        │
   ┌────┴────┐
 200 OK    202 Accepted
   │            │
   ▼            ▼
navigate   setRequestId(id)
 Result          │
            pollingQuery
           enabled = true
                │
          every 3 seconds
                │
     ┌──────────┼──────────┐
  processing  completed   failed
     │            │          │
  continue   navigate     Alert
  polling     Result    navigate
                         Home
```

---

## 11. Error Handling

### `src/utils/errorHandler.ts`

```typescript
import { Alert } from 'react-native';
import axios from 'axios';
import type { ApiErrorBody } from '../types/api.types';

const ERROR_MESSAGES: Record<string, string> = {
  RATE_LIMIT_EXCEEDED: 'You are generating too fast. Please wait a minute.',
  UNAUTHORIZED:        'Your session has expired. Please log in again.',
  TEMPLATE_NOT_FOUND:  'One of the selected templates is no longer available.',
};

export function handleApiError(error: unknown): void {
  if (axios.isAxiosError(error)) {
    const body = error.response?.data as ApiErrorBody | undefined;

    if (body?.error) {
      const { code, message } = body.error;
      const friendly = ERROR_MESSAGES[code] ?? message;
      Alert.alert('Error', friendly);
      return;
    }

    // Network errors (no response)
    if (!error.response) {
      Alert.alert('Network Error', 'Could not reach the server. Please check your connection.');
      return;
    }
  }

  // Fallback for unexpected errors
  Alert.alert('Unexpected Error', 'Something went wrong. Please try again.');
}
```

**Error code mapping:**

| Backend Code | Displayed Message |
|---|---|
| `RATE_LIMIT_EXCEEDED` | "You are generating too fast. Please wait a minute." |
| `UNAUTHORIZED` | "Your session has expired. Please log in again." |
| `TEMPLATE_NOT_FOUND` | "One of the selected templates is no longer available." |
| *(any other)* | Use the raw `message` from backend |
| *(no response)* | "Could not reach the server." |

---

## 12. Configuration Files

### `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "baseUrl": ".",
    "paths": {
      "@api/*":        ["src/api/*"],
      "@components/*": ["src/components/*"],
      "@hooks/*":      ["src/hooks/*"],
      "@navigation/*": ["src/navigation/*"],
      "@screens/*":    ["src/screens/*"],
      "@store/*":      ["src/store/*"],
      "@types/*":      ["src/types/*"],
      "@utils/*":      ["src/utils/*"]
    }
  }
}
```

### `babel.config.js`

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      [
        'module-resolver',
        {
          root: ['./'],
          alias: {
            '@api':        './src/api',
            '@components': './src/components',
            '@hooks':      './src/hooks',
            '@navigation': './src/navigation',
            '@screens':    './src/screens',
            '@store':      './src/store',
            '@types':      './src/types',
            '@utils':      './src/utils',
          },
        },
      ],
    ],
  };
};
```

### `package.json` (dependencies section)

```json
{
  "dependencies": {
    "expo": "~51.0.0",
    "expo-secure-store": "~13.0.0",
    "expo-media-library": "~16.0.0",
    "expo-file-system": "~17.0.0",
    "react": "18.2.0",
    "react-native": "0.74.0",
    "@react-navigation/native": "^6.1.0",
    "@react-navigation/native-stack": "^6.9.0",
    "react-native-screens": "~3.31.0",
    "react-native-safe-area-context": "4.10.1",
    "@tanstack/react-query": "^5.0.0",
    "axios": "^1.7.0",
    "zustand": "^4.5.0",
    "nativewind": "^4.0.0",
    "react-native-uuid": "^2.0.2",
    "@expo/vector-icons": "^14.0.0"
  },
  "devDependencies": {
    "@babel/core": "^7.24.0",
    "babel-plugin-module-resolver": "^5.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "~5.3.0",
    "eslint": "^8.57.0",
    "prettier": "^3.2.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0"
  }
}
```

### `App.tsx`

```typescript
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RootNavigator } from '@navigation/RootNavigator';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RootNavigator />
    </QueryClientProvider>
  );
}
```

---

## 13. Delivery Checklist

All files below must contain **complete, runnable TypeScript** — no placeholder comments, no `// TODO`, no `// implement here`.

### Critical Path (must work for the app to function)

- [ ] `src/api/axios.instance.ts` — singleton, JWT interceptor, X-Request-ID, 401 handler
- [ ] `src/store/useAuthStore.ts` — token lifecycle, SecureStore sync
- [ ] `src/store/useSelectionStore.ts` — max-5 enforcement in `toggleObjectTemplate`
- [ ] `src/navigation/RootNavigator.tsx` — cold-start token bootstrap, auth-gated routing
- [ ] `src/screens/main/GeneratingScreen.tsx` — mutation + conditional polling + navigation
- [ ] `src/utils/errorHandler.ts` — error code map, `handleApiError`

### Supporting Files (required for compilation)

- [ ] `src/types/api.types.ts`
- [ ] `src/types/navigation.types.ts`
- [ ] `src/types/template.types.ts`
- [ ] `src/api/auth.api.ts`
- [ ] `src/api/templates.api.ts`
- [ ] `src/api/generate.api.ts`
- [ ] `src/navigation/AuthNavigator.tsx`
- [ ] `src/navigation/MainNavigator.tsx`
- [ ] `src/screens/auth/LoginScreen.tsx`
- [ ] `src/screens/auth/RegisterScreen.tsx`
- [ ] `src/screens/main/HomeScreen.tsx`
- [ ] `src/screens/main/ResultScreen.tsx`
- [ ] `src/components/common/Button.tsx`
- [ ] `src/components/common/Input.tsx`
- [ ] `src/components/common/Loader.tsx`
- [ ] `src/components/templates/MainTemplateCard.tsx`
- [ ] `src/components/templates/ObjectTemplateBadge.tsx`
- [ ] `src/components/generate/ImagePreview.tsx`
- [ ] `src/hooks/useAuth.ts`
- [ ] `src/hooks/usePolling.ts`
- [ ] `src/utils/constants.ts`

### Config Files

- [ ] `tsconfig.json` — strict mode + path aliases
- [ ] `babel.config.js` — NativeWind + module-resolver
- [ ] `App.tsx` — QueryClientProvider wrapping RootNavigator
- [ ] `app.json` — `expo.name`, `expo.slug`, permissions for `MEDIA_LIBRARY`

### Quality Gates

- [ ] TypeScript compiles with zero errors (`tsc --noEmit`)
- [ ] ESLint passes with zero errors
- [ ] No `any` types except where explicitly unavoidable (comment why)
- [ ] All navigation uses typed param lists — no raw `navigation.navigate('Screen', { ... })` without type safety
- [ ] Polling stops correctly (no infinite loop on terminal state)
- [ ] Back button is disabled on `GeneratingScreen` on both iOS and Android

---

*Last updated: 2026-04-30*
