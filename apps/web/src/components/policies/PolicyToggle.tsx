import { CSSProperties, useState } from 'react';

interface PolicyToggleProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
  disabled?: boolean;
}

const styles: Record<string, CSSProperties> = {
  toggle: {
    position: 'relative',
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    cursor: 'pointer',
    transition: 'background-color var(--transition-fast)',
    border: 'none',
  },
  toggleEnabled: {
    backgroundColor: 'var(--color-accent)',
  },
  toggleDisabled: {
    backgroundColor: 'var(--color-border)',
  },
  toggleKnob: {
    position: 'absolute',
    top: 2,
    width: 20,
    height: 20,
    borderRadius: '50%',
    backgroundColor: 'white',
    transition: 'transform var(--transition-fast)',
    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)',
  },
  toggleKnobEnabled: {
    transform: 'translateX(20px)',
  },
  toggleKnobDisabled: {
    transform: 'translateX(0)',
  },
};

export function PolicyToggle({ enabled, onToggle, disabled }: PolicyToggleProps) {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (disabled || isLoading) return;
    
    setIsLoading(true);
    try {
      await onToggle(!enabled);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      style={{
        ...styles.toggle,
        ...(enabled ? styles.toggleEnabled : styles.toggleDisabled),
        opacity: isLoading || disabled ? 0.6 : 1,
        cursor: isLoading || disabled ? 'not-allowed' : 'pointer',
      }}
      onClick={handleClick}
      role="switch"
      aria-checked={enabled}
      aria-label={enabled ? 'Disable policy' : 'Enable policy'}
      disabled={disabled || isLoading}
    >
      <span
        style={{
          ...styles.toggleKnob,
          ...(enabled ? styles.toggleKnobEnabled : styles.toggleKnobDisabled),
        }}
      />
    </button>
  );
}

