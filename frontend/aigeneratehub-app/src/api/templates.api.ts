import apiClient from './axios.instance';
import type { MainTemplate, ObjectTemplate } from '../types/template.types';

interface BackendMainTemplate {
  templateId: string;
  displayName: string;
  category: string;
  thumbnailUrl?: string;
}

interface BackendObjectTemplate {
  objectId: string;
  displayName: string;
  iconUrl?: string;
}

interface PagedResponse<T> {
  items: T[];
  count: number;
  lastKey: string | null;
}

export const getMainTemplates = () =>
  apiClient
    .get<{ success: true; data: PagedResponse<BackendMainTemplate> }>('/api/v1/templates/main')
    .then(r =>
      r.data.data.items.map((t): MainTemplate => ({
        id: t.templateId,
        name: t.displayName,
        category: t.category,
        thumbnailUrl: t.thumbnailUrl ?? undefined,
      })),
    );

export const getObjectTemplates = () =>
  apiClient
    .get<{ success: true; data: PagedResponse<BackendObjectTemplate> }>('/api/v1/templates/objects')
    .then(r =>
      r.data.data.items.map((t): ObjectTemplate => ({
        id: t.objectId,
        name: t.displayName,
        iconUrl: t.iconUrl ?? undefined,
      })),
    );

