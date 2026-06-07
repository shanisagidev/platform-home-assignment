import { apiClient } from './apiClient';
import type { Alert, AlertStatus, Severity, Assignee, AlertComment, AlertAuditEvent } from '../types/domain';

interface AlertFilters {
  status?: AlertStatus;
  severity?: string;
  policyId?: string;
  runId?: string;
}

interface AlertUpdateData {
  status?: AlertStatus;
  severity?: Severity;
  assignedToId?: string | null;
}

export const alertsService = {
  getAll: (filters?: AlertFilters): Promise<Alert[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.severity) params.append('severity', filters.severity);
    if (filters?.policyId) params.append('policyId', filters.policyId);
    if (filters?.runId) params.append('runId', filters.runId);
    
    const query = params.toString();
    return apiClient.get<Alert[]>(`/alerts${query ? `?${query}` : ''}`);
  },
  
  getById: (id: string): Promise<Alert> => {
    return apiClient.get<Alert>(`/alerts/${id}`);
  },
  
  update: (id: string, data: AlertUpdateData): Promise<Alert> => {
    return apiClient.patch<Alert>(`/alerts/${id}`, data);
  },
  
  updateStatus: (id: string, status: AlertStatus): Promise<Alert> => {
    return apiClient.patch<Alert>(`/alerts/${id}/status`, { status });
  },
  
  addComment: (id: string, message: string): Promise<AlertComment> => {
    return apiClient.post<AlertComment>(`/alerts/${id}/comments`, { message });
  },
  
  remediate: (id: string, note?: string): Promise<Alert> => {
    return apiClient.post<Alert>(`/alerts/${id}/remediate`, { note });
  },
  
  getAuditEvents: (id: string): Promise<AlertAuditEvent[]> => {
    return apiClient.get<AlertAuditEvent[]>(`/alerts/${id}/audit`);
  },
};

export const assigneesService = {
  getAll: (): Promise<Assignee[]> => {
    return apiClient.get<Assignee[]>('/assignees');
  },
};

