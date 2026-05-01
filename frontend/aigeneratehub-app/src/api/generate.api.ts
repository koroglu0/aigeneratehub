import apiClient from './axios.instance';
import type {
  GenerateRequest,
  GenerateResponse,
  GenerationStatusResponse,
} from '../types/api.types';

export const postGenerate = (body: GenerateRequest, idempotencyKey: string) =>
  apiClient
    .post<{ success: true; data: GenerateResponse }>('/api/v1/generate', body, {
      headers: { 'Idempotency-Key': idempotencyKey },
      validateStatus: (status) => status === 200 || status === 202,
    })
    .then(r => ({ status: r.status, data: r.data.data }));

export const getGenerationStatus = (requestId: string) =>
  apiClient
    .get<{ success: true; data: GenerationStatusResponse }>(`/api/v1/generate/${requestId}`)
    .then(r => r.data.data);
