import { useEffect, useRef, useCallback, useState } from 'react';

interface UsePollingOptions {
  interval: number;
  enabled?: boolean;
  pauseOnHidden?: boolean; // Pause when document is hidden
}

export function usePolling(
  callback: () => void | Promise<void>,
  options: UsePollingOptions
) {
  const { interval, enabled = true, pauseOnHidden = true } = options;
  const savedCallback = useRef(callback);
  const intervalRef = useRef<number | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isDocumentVisible, setIsDocumentVisible] = useState(!document.hidden);
  
  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);
  
  // Track document visibility
  useEffect(() => {
    if (!pauseOnHidden) return;
    
    const handleVisibilityChange = () => {
      setIsDocumentVisible(!document.hidden);
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pauseOnHidden]);
  
  const stop = useCallback(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
      setIsPolling(false);
    }
  }, []);
  
  const start = useCallback(() => {
    stop();
    const shouldPoll = enabled && (pauseOnHidden ? isDocumentVisible : true);
    if (shouldPoll) {
      intervalRef.current = window.setInterval(() => {
        savedCallback.current();
      }, interval);
      setIsPolling(true);
    }
  }, [interval, enabled, pauseOnHidden, isDocumentVisible, stop]);
  
  useEffect(() => {
    const shouldPoll = enabled && (pauseOnHidden ? isDocumentVisible : true);
    if (shouldPoll) {
      start();
    } else {
      stop();
    }
    
    return stop;
  }, [enabled, isDocumentVisible, pauseOnHidden, start, stop]);
  
  return { start, stop, isPolling };
}

// Hook for adaptive polling that changes interval based on condition
interface UseAdaptivePollingOptions {
  fastInterval: number;   // Interval when condition is true
  slowInterval: number;   // Interval when condition is false
  shouldPollFast: boolean; // Condition to determine which interval to use
  enabled?: boolean;
  pauseOnHidden?: boolean;
}

export function useAdaptivePolling(
  callback: () => void | Promise<void>,
  options: UseAdaptivePollingOptions
) {
  const { fastInterval, slowInterval, shouldPollFast, enabled = true, pauseOnHidden = true } = options;
  const currentInterval = shouldPollFast ? fastInterval : slowInterval;
  
  return usePolling(callback, {
    interval: currentInterval,
    enabled,
    pauseOnHidden,
  });
}