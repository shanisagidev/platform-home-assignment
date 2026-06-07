import { useState, useEffect, useCallback } from 'react';
import { alertsService } from '../services/alerts.service';
import type { Alert, AlertStatus, Severity, AlertComment } from '../types/domain';

interface UseAlertsOptions {
  status?: AlertStatus;
  autoRefresh?: boolean;
}

export function useAlerts(options: UseAlertsOptions = {}) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await alertsService.getAll(
        options.status ? { status: options.status } : undefined
      );
      setAlerts(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch alerts');
    } finally {
      setLoading(false);
    }
  }, [options.status]);
  
  // Silent refresh - updates alerts without showing loading state
  const silentRefresh = useCallback(async () => {
    try {
      const data = await alertsService.getAll(
        options.status ? { status: options.status } : undefined
      );
      setAlerts(data);
      return data;
    } catch (err) {
      console.error('Silent refresh error:', err);
      return null;
    }
  }, [options.status]);
  
  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);
  
  const updateStatus = useCallback(async (id: string, status: AlertStatus) => {
    const updated = await alertsService.updateStatus(id, status);
    setAlerts(prev => prev.map(a => (a.id === id ? updated : a)));
    return updated;
  }, []);
  
  const updateAlert = useCallback(async (id: string, data: { status?: AlertStatus; severity?: Severity; assignedToId?: string | null }) => {
    const updated = await alertsService.update(id, data);
    setAlerts(prev => prev.map(a => (a.id === id ? updated : a)));
    return updated;
  }, []);
  
  const addComment = useCallback(async (id: string, message: string): Promise<AlertComment> => {
    const comment = await alertsService.addComment(id, message);
    // Refetch the alert to get updated comments list
    const updated = await alertsService.getById(id);
    setAlerts(prev => prev.map(a => (a.id === id ? updated : a)));
    return comment;
  }, []);
  
  const remediate = useCallback(async (id: string, note?: string) => {
    const updated = await alertsService.remediate(id, note);
    setAlerts(prev => prev.map(a => (a.id === id ? updated : a)));
    return updated;
  }, []);
  
  // Update a single alert in the list (used by polling sync)
  const updateAlertInList = useCallback((alert: Alert) => {
    setAlerts(prev => prev.map(a => (a.id === alert.id ? alert : a)));
  }, []);
  
  return {
    alerts,
    loading,
    error,
    refresh: fetchAlerts,
    silentRefresh,
    updateStatus,
    updateAlert,
    addComment,
    remediate,
    updateAlertInList,
  };
}

