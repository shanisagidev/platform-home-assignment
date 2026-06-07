import { apiClient } from './apiClient';

interface ResetResponse {
  success: boolean;
  message: string;
}

export const adminService = {
  resetEnvironment: (): Promise<ResetResponse> => {
    return apiClient.post<ResetResponse>('/admin/reset');
  },
};




