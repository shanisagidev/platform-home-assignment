import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { scansService, ScanStatusResponse } from '../services/scans.service';
import { useToast } from './ToastContext';

// Poll interval when scanning (faster to detect completion quickly)
const SCAN_POLL_INTERVAL = 1000; // 1 second
// Poll interval when idle (slower to reduce load)
const IDLE_POLL_INTERVAL = 3000; // 3 seconds
// Max consecutive errors before hiding banner (failsafe)
const MAX_CONSECUTIVE_ERRORS = 5;

interface ScanStatusContextType {
  isScanning: boolean;
  scanId?: string;
  startedAt?: string;
  /** Manually trigger a status refresh (e.g., after starting a scan) */
  refreshStatus: () => void;
}

const ScanStatusContext = createContext<ScanStatusContextType | null>(null);

export function ScanStatusProvider({ children }: { children: ReactNode }) {
  const [isScanning, setIsScanning] = useState(false);
  const [scanId, setScanId] = useState<string>();
  const [startedAt, setStartedAt] = useState<string>();
  const { showToast } = useToast();
  
  // Track the last completed scan to detect new completions
  const lastCompletedScanIdRef = useRef<string | null>(null);
  const isFirstPollRef = useRef(true);
  // Track consecutive errors for failsafe
  const consecutiveErrorsRef = useRef(0);
  
  const pollStatus = useCallback(async () => {
    try {
      const status: ScanStatusResponse = await scansService.getStatus();
      
      // Reset error count on successful poll
      consecutiveErrorsRef.current = 0;
      
      // Update scanning state
      const wasScanning = isScanning;
      const nowScanning = status.status === 'RUNNING';
      
      setIsScanning(nowScanning);
      setScanId(status.scanId);
      setStartedAt(status.startedAt);
      
      // Check for newly completed scan
      if (status.lastCompleted && status.lastCompleted.scanId !== lastCompletedScanIdRef.current) {
        // Only show toast if this isn't the first poll (avoid showing stale completion on page load)
        if (!isFirstPollRef.current && !nowScanning && wasScanning) {
          showToast({
            type: 'success',
            title: 'Scan complete',
            message: `${status.lastCompleted.alertsCreatedCount} alerts created`,
            dedupeKey: `scan-complete-${status.lastCompleted.scanId}`,
          });
        }
        lastCompletedScanIdRef.current = status.lastCompleted.scanId;
      }
      
      isFirstPollRef.current = false;
    } catch (error) {
      // Track consecutive errors
      consecutiveErrorsRef.current++;
      console.error('Failed to poll scan status:', error);
      
      // Failsafe: if too many errors while scanning, hide the banner
      // to avoid it being stuck indefinitely
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS && isScanning) {
        console.warn('Too many scan status errors, hiding banner as failsafe');
        setIsScanning(false);
        setScanId(undefined);
        setStartedAt(undefined);
      }
    }
  }, [isScanning, showToast]);
  
  // Set up polling
  useEffect(() => {
    // Initial poll
    pollStatus();
    
    // Set up interval - poll faster when scanning
    const interval = setInterval(pollStatus, isScanning ? SCAN_POLL_INTERVAL : IDLE_POLL_INTERVAL);
    
    return () => clearInterval(interval);
  }, [pollStatus, isScanning]);
  
  const refreshStatus = useCallback(() => {
    pollStatus();
  }, [pollStatus]);
  
  return (
    <ScanStatusContext.Provider value={{ isScanning, scanId, startedAt, refreshStatus }}>
      {children}
    </ScanStatusContext.Provider>
  );
}

export function useScanStatus() {
  const context = useContext(ScanStatusContext);
  if (!context) {
    throw new Error('useScanStatus must be used within a ScanStatusProvider');
  }
  return context;
}
