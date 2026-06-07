import { CSSProperties } from 'react';
import { useScanStatus } from '../../context/ScanStatusContext';

const styles: Record<string, CSSProperties> = {
  banner: {
    position: 'fixed',
    top: 12,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 20px',
    backgroundColor: 'rgba(99, 102, 241, 0.95)',
    color: 'white',
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 500,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
    zIndex: 1000,
    // Slow pulsing animation
    animation: 'scanBannerPulse 1.5s ease-in-out infinite',
  },
  spinner: {
    width: 14,
    height: 14,
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: 'white',
    borderRadius: '50%',
    animation: 'scanSpinner 0.8s linear infinite',
  },
  text: {
    letterSpacing: '0.02em',
  },
};

// Inject keyframes for animations
const injectStyles = () => {
  const styleId = 'scan-banner-styles';
  if (document.getElementById(styleId)) return;
  
  const styleSheet = document.createElement('style');
  styleSheet.id = styleId;
  styleSheet.textContent = `
    @keyframes scanBannerPulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
    
    @keyframes scanSpinner {
      to {
        transform: rotate(360deg);
      }
    }
  `;
  document.head.appendChild(styleSheet);
};

export function ScanStatusBanner() {
  const { isScanning } = useScanStatus();
  
  // Inject styles on first render
  if (typeof document !== 'undefined') {
    injectStyles();
  }
  
  if (!isScanning) {
    return null;
  }
  
  return (
    <div
      style={styles.banner}
      role="status"
      aria-live="polite"
      aria-label="Scan in progress"
      data-testid="scan-status-banner"
    >
      <div style={styles.spinner} aria-hidden="true" />
      <span style={styles.text}>Scanning In Progress</span>
    </div>
  );
}
