import apiClient from './axios.instance';
import type { AiModel } from '../types/api.types';

interface PagedResponse<T> {
  items: T[];
  count: number;
  lastKey: string | null;
}

export const getAvailableModels = () =>
  apiClient
    .get<{ success: true; data: PagedResponse<AiModel> }>('/api/v1/models')
    .then((r) => r.data.data.items);
