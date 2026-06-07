import { apiClient } from './apiClient';
import type { ScanRun } from '../types/domain';

export interface ScanStatusResponse {
  status: 'IDLE' | 'RUNNING';
  scanId?: string;
  startedAt?: string;
  lastCompleted?: {
    scanId: string;
    completedAt: string;
    alertsCreatedCount: number;
  } | null;
}

export const scansService = {
  startScan: (): Promise<ScanRun> => {
    return apiClient.post<ScanRun>('/scans');
  },
  
  getAll: (): Promise<ScanRun[]> => {
    return apiClient.get<ScanRun[]>('/scans');
  },
  
  getById: (id: string): Promise<ScanRun> => {
    return apiClient.get<ScanRun>(`/scans/${id}`);
  },
  
  getStatus: (): Promise<ScanStatusResponse> => {
    return apiClient.get<ScanStatusResponse>('/scans/status');
  },
};

