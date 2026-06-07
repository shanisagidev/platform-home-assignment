import { CSSProperties, useMemo } from 'react';

export interface DateTimeRangeValue {
  from: string | null; // ISO datetime string or null
  to: string | null;
}

interface DateTimeRangeProps {
  label: string;
  value: DateTimeRangeValue;
  onChange: (value: DateTimeRangeValue) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  row: {
    display: 'flex',
    gap: 'var(--space-xs)',
    alignItems: 'center',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: 2,
  },
  inputLabel: {
    fontSize: 10,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
  },
  input: {
    padding: '6px 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    minWidth: 140,
    colorScheme: 'dark',
  },
  inputError: {
    borderColor: 'var(--color-critical)',
  },
  separator: {
    fontSize: 12,
    color: 'var(--color-text-muted)',
    marginTop: 16,
  },
  error: {
    fontSize: 11,
    color: 'var(--color-critical)',
    marginTop: 2,
  },
  clearButton: {
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 500,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    marginTop: 16,
  },
};

export function DateTimeRange({ label, value, onChange }: DateTimeRangeProps) {
  // Validate: if both set and from > to, show error
  const validationError = useMemo(() => {
    if (value.from && value.to) {
      const fromDate = new Date(value.from);
      const toDate = new Date(value.to);
      if (fromDate > toDate) {
        return 'From date must be before To date';
      }
    }
    return null;
  }, [value.from, value.to]);

  const hasValue = value.from || value.to;

  const handleFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value || null;
    onChange({ ...value, from: newValue });
  };

  const handleToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value || null;
    onChange({ ...value, to: newValue });
  };

  const handleClear = () => {
    onChange({ from: null, to: null });
  };

  return (
    <div style={styles.container}>
      <span style={styles.label}>{label}</span>
      <div style={styles.row}>
        <div style={styles.inputGroup}>
          <label htmlFor={`${label}-from`} style={styles.inputLabel}>
            From
          </label>
          <input
            id={`${label}-from`}
            type="datetime-local"
            value={value.from || ''}
            onChange={handleFromChange}
            style={{
              ...styles.input,
              ...(validationError ? styles.inputError : {}),
            }}
            aria-label={`${label} from date and time`}
          />
        </div>
        <span style={styles.separator}>→</span>
        <div style={styles.inputGroup}>
          <label htmlFor={`${label}-to`} style={styles.inputLabel}>
            To
          </label>
          <input
            id={`${label}-to`}
            type="datetime-local"
            value={value.to || ''}
            onChange={handleToChange}
            style={{
              ...styles.input,
              ...(validationError ? styles.inputError : {}),
            }}
            aria-label={`${label} to date and time`}
          />
        </div>
        {hasValue && (
          <button
            type="button"
            style={styles.clearButton}
            onClick={handleClear}
            aria-label="Clear date range"
          >
            ✕
          </button>
        )}
      </div>
      {validationError && <div style={styles.error}>{validationError}</div>}
    </div>
  );
}

