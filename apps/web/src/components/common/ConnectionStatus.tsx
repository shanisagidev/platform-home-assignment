import { useState, useEffect, useCallback } from 'react';

const CHECK_INTERVAL = 30000; // Check every 30 seconds
const HEALTH_ENDPOINT = '/api/health';

const styles = {
  banner: {
    position: 'fixed' as const,
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#fbbf24',
    color: '#1a1a1a',
    padding: '12px 24px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    zIndex: 9999,
    animation: 'slideUp 0.3s ease-out',
  },
  icon: {
    fontSize: '18px',
  },
  text: {
    fontSize: '14px',
    fontWeight: 500,
  },
  retryButton: {
    marginLeft: '12px',
    padding: '6px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  },
  reconnected: {
    backgroundColor: '#10b981',
    color: 'white',
  },
};

export function ConnectionStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  const checkConnection = useCallback(async () => {
    try {
      const response = await fetch(HEALTH_ENDPOINT, {
        method: 'GET',
        cache: 'no-store',
      });
      
      if (response.ok) {
        if (!isOnline) {
          // Was offline, now back online
          setShowReconnected(true);
          setTimeout(() => setShowReconnected(false), 3000);
        }
        setIsOnline(true);
      } else {
        setIsOnline(false);
      }
    } catch {
      setIsOnline(false);
    }
  }, [isOnline]);

  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up interval
    const interval = setInterval(checkConnection, CHECK_INTERVAL);

    // Browser online/offline events
    const handleOnline = () => checkConnection();
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  // Show reconnected message briefly
  if (showReconnected) {
    return (
      <div style={{ ...styles.banner, ...styles.reconnected }}>
        <span style={styles.icon}>✓</span>
        <span style={styles.text}>Connection restored</span>
      </div>
    );
  }

  // Only show offline banner if we're currently offline
  if (isOnline) {
    return null;
  }

  return (
    <div style={styles.banner}>
      <span style={styles.icon}>⚠️</span>
      <span style={styles.text}>Connection lost. Retrying...</span>
      <button style={styles.retryButton} onClick={checkConnection}>
        Retry Now
      </button>
    </div>
  );
}

export default ConnectionStatus;
