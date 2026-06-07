export interface ScanRun {
  id: string;
  status: 'RUNNING' | 'COMPLETED';
  startedAt: string;
  completedAt?: string;
  scannedAssetsCount: number;
  alertsCreatedCount: number;
}

