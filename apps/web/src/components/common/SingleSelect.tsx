import { CSSProperties, useState, useRef, useEffect } from 'react';

export interface SingleSelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SingleSelectProps {
  id?: string;
  label?: string;
  options: SingleSelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
  compact?: boolean; // For use in side panels with less padding
}

const styles: Record<string, CSSProperties> = {
  container: {
    position: 'relative',
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
  trigger: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    fontSize: 13,
    cursor: 'pointer',
    minWidth: 140,
    minHeight: 36,
    gap: 'var(--space-sm)',
    transition: 'border-color var(--transition-fast)',
  },
  triggerCompact: {
    padding: '6px 10px',
    minHeight: 32,
    minWidth: 120,
  },
  triggerDisabled: {
    opacity: 0.6,
    cursor: 'not-allowed',
    backgroundColor: 'var(--color-bg-primary)',
  },
  triggerText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1,
  },
  arrow: {
    flexShrink: 0,
    transition: 'transform 0.15s ease',
    color: 'var(--color-text-muted)',
  },
  arrowOpen: {
    transform: 'rotate(180deg)',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
    zIndex: 100,
    maxHeight: 240,
    overflowY: 'auto',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 'var(--space-sm) var(--space-md)',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    transition: 'background-color 0.1s ease',
  },
  optionHover: {
    backgroundColor: 'var(--color-bg-tertiary)',
  },
  optionSelected: {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    color: 'var(--color-accent)',
  },
  optionDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  noOptions: {
    padding: 'var(--space-md)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: 12,
  },
};

export function SingleSelect({
  id,
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabled = false,
  'aria-label': ariaLabel,
  compact = false,
}: SingleSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset focused index when dropdown opens
  useEffect(() => {
    if (isOpen) {
      const currentIndex = options.findIndex(o => o.value === value);
      setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
    }
  }, [isOpen, options, value]);

  const selectedOption = options.find(o => o.value === value);
  const displayText = selectedOption?.label || placeholder;
  const enabledOptions = options.filter(o => !o.disabled);

  const handleSelect = (optionValue: string) => {
    const option = options.find(o => o.value === optionValue);
    if (option?.disabled) return;
    
    onChange(optionValue);
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;

    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev + 1;
          while (next < options.length && options[next]?.disabled) {
            next++;
          }
          return next < options.length ? next : prev;
        });
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => {
          let next = prev - 1;
          while (next >= 0 && options[next]?.disabled) {
            next--;
          }
          return next >= 0 ? next : prev;
        });
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length && !options[focusedIndex]?.disabled) {
          handleSelect(options[focusedIndex].value);
        }
        break;
    }
  };

  return (
    <div style={styles.container} ref={containerRef}>
      {label && (
        <label htmlFor={id} style={styles.label}>
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        style={{
          ...styles.trigger,
          ...(compact ? styles.triggerCompact : {}),
          ...(disabled ? styles.triggerDisabled : {}),
        }}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel || `${label}: ${displayText}`}
      >
        <span style={styles.triggerText}>{displayText}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="none"
          style={{ ...styles.arrow, ...(isOpen ? styles.arrowOpen : {}) }}
        >
          <path
            d="M3 4.5L6 7.5L9 4.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      {isOpen && enabledOptions.length > 0 && (
        <div style={styles.dropdown} role="listbox" aria-label={label || ariaLabel}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = focusedIndex === index;
            const isDisabled = option.disabled;
            
            return (
              <div
                key={option.value}
                style={{
                  ...styles.option,
                  ...(isFocused && !isDisabled ? styles.optionHover : {}),
                  ...(isSelected ? styles.optionSelected : {}),
                  ...(isDisabled ? styles.optionDisabled : {}),
                }}
                onClick={() => !isDisabled && handleSelect(option.value)}
                onMouseEnter={() => !isDisabled && setFocusedIndex(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={isDisabled}
              >
                <span>{option.label}</span>
              </div>
            );
          })}
        </div>
      )}
      {isOpen && enabledOptions.length === 0 && (
        <div style={styles.dropdown}>
          <div style={styles.noOptions}>No options available</div>
        </div>
      )}
    </div>
  );
}
