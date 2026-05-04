// ── Auth ──────────────────────────────────────────────────
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
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
  model: string;
}

export interface AiModel {
  id: string;
  name: string;
  description?: string;
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

/** A single item in the user's generation history */
export interface GenerationHistoryItem {
  requestId: string;
  status: 'completed' | 'failed';
  imageUrl?: string;
  mainTemplateId: string;
  objectTemplateIds: string[];
  aiModel: string;
  generationMs?: number;
  createdAt: string;
}

export interface ApiErrorBody {
  success: false;
  error: { code: string; message: string; requestId?: string };
}
