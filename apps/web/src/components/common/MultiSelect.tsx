import { CSSProperties, useState, useRef, useEffect, useMemo } from 'react';

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  id: string;
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
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
  },
  triggerActive: {
    borderColor: 'var(--color-accent)',
  },
  triggerText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  arrow: {
    flexShrink: 0,
    transition: 'transform 0.15s ease',
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
    maxHeight: 280,
    display: 'flex',
    flexDirection: 'column',
  },
  searchContainer: {
    padding: 'var(--space-sm)',
    borderBottom: '1px solid var(--color-border)',
  },
  searchInput: {
    width: '100%',
    padding: '6px 8px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    fontSize: 12,
    outline: 'none',
    boxSizing: 'border-box',
  },
  actionsRow: {
    display: 'flex',
    gap: 'var(--space-sm)',
    padding: 'var(--space-xs) var(--space-sm)',
    borderBottom: '1px solid var(--color-border)',
  },
  actionButton: {
    flex: 1,
    padding: '4px 8px',
    fontSize: 11,
    fontWeight: 500,
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'background-color 0.1s ease',
  },
  selectAllButton: {
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-secondary)',
  },
  clearButton: {
    backgroundColor: 'transparent',
    color: 'var(--color-text-muted)',
  },
  optionsList: {
    overflowY: 'auto',
    maxHeight: 180,
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm) var(--space-md)',
    cursor: 'pointer',
    fontSize: 13,
    color: 'var(--color-text-primary)',
    transition: 'background-color 0.1s ease',
  },
  optionHover: {
    backgroundColor: 'var(--color-bg-tertiary)',
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    border: '2px solid var(--color-border)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.1s ease',
  },
  checkboxChecked: {
    backgroundColor: 'var(--color-accent)',
    borderColor: 'var(--color-accent)',
  },
  checkmark: {
    color: 'var(--color-bg-primary)',
    fontSize: 10,
    fontWeight: 'bold',
  },
  noResults: {
    padding: 'var(--space-md)',
    textAlign: 'center',
    color: 'var(--color-text-muted)',
    fontSize: 12,
  },
};

export function MultiSelect({
  id,
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select...',
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Filter options based on search query
  const filteredOptions = useMemo(() => {
    if (!searchQuery.trim()) return options;
    const query = searchQuery.toLowerCase();
    return options.filter((opt) => opt.label.toLowerCase().includes(query));
  }, [options, searchQuery]);

  const allSelected = selected.length === options.length;
  const noneSelected = selected.length === 0;

  const getDisplayText = () => {
    if (noneSelected || allSelected) {
      return placeholder;
    }
    if (selected.length === 1) {
      return options.find((o) => o.value === selected[0])?.label || placeholder;
    }
    return `${selected.length} selected`;
  };

  const handleToggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleSelectAll = () => {
    onChange(options.map((o) => o.value));
  };

  const handleClearAll = () => {
    onChange([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        setIsOpen(false);
        setSearchQuery('');
        triggerRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex((prev) => Math.min(prev + 1, filteredOptions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex((prev) => Math.max(prev - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < filteredOptions.length) {
          handleToggleOption(filteredOptions[focusedIndex].value);
        }
        break;
    }
  };

  const hasActiveSelection = !noneSelected && !allSelected;

  return (
    <div style={styles.container} ref={containerRef}>
      <label htmlFor={id} style={styles.label}>
        {label}
      </label>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        style={{
          ...styles.trigger,
          ...(hasActiveSelection ? styles.triggerActive : {}),
        }}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${label}: ${getDisplayText()}`}
      >
        <span style={styles.triggerText}>{getDisplayText()}</span>
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
      {isOpen && (
        <div style={styles.dropdown} role="listbox" aria-label={label}>
          {/* Search within filter */}
          <div style={styles.searchContainer}>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              style={styles.searchInput}
              aria-label={`Search ${label} options`}
            />
          </div>

          {/* Select all / Clear actions */}
          <div style={styles.actionsRow}>
            <button
              type="button"
              style={{ ...styles.actionButton, ...styles.selectAllButton }}
              onClick={handleSelectAll}
              aria-label="Select all options"
            >
              Select all
            </button>
            <button
              type="button"
              style={{ ...styles.actionButton, ...styles.clearButton }}
              onClick={handleClearAll}
              aria-label="Clear selection"
            >
              Clear
            </button>
          </div>

          {/* Options list */}
          <div style={styles.optionsList}>
            {filteredOptions.length === 0 ? (
              <div style={styles.noResults}>No matching options</div>
            ) : (
              filteredOptions.map((option, index) => {
                const isChecked = selected.includes(option.value);
                const isFocused = focusedIndex === index;
                return (
                  <div
                    key={option.value}
                    style={{
                      ...styles.option,
                      ...(isFocused ? styles.optionHover : {}),
                    }}
                    onClick={() => handleToggleOption(option.value)}
                    onMouseEnter={() => setFocusedIndex(index)}
                    role="option"
                    aria-selected={isChecked}
                  >
                    <div
                      style={{
                        ...styles.checkbox,
                        ...(isChecked ? styles.checkboxChecked : {}),
                      }}
                    >
                      {isChecked && <span style={styles.checkmark}>✓</span>}
                    </div>
                    <span>{option.label}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
