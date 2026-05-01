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
