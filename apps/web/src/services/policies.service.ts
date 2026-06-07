import { apiClient } from './apiClient';
import type { Policy, PolicyCreateData, PolicyUpdateData } from '../types/domain';

export const policiesService = {
  getAll: (): Promise<Policy[]> => {
    return apiClient.get<Policy[]>('/policies');
  },
  
  getById: (id: string): Promise<Policy> => {
    return apiClient.get<Policy>(`/policies/${id}`);
  },
  
  create: (data: PolicyCreateData): Promise<Policy> => {
    return apiClient.post<Policy>('/policies', data);
  },
  
  update: (id: string, data: PolicyUpdateData): Promise<Policy> => {
    return apiClient.patch<Policy>(`/policies/${id}`, data);
  },
  
  toggleEnabled: (id: string, enabled: boolean): Promise<Policy> => {
    return apiClient.patch<Policy>(`/policies/${id}`, { enabled });
  },
  
  delete: (id: string): Promise<void> => {
    return apiClient.delete(`/policies/${id}`);
  },
};
