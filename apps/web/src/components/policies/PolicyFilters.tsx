import { CSSProperties, useMemo } from 'react';
import { MultiSelect, MultiSelectOption } from '../common/MultiSelect';
import { SingleSelect, SingleSelectOption } from '../common/SingleSelect';
import { DateTimeRange, DateTimeRangeValue } from '../common/DateTimeRange';
import type { Severity } from '../../types/domain';

export interface PolicyFiltersState {
  search: string;
  severities: Severity[];
  enabled: 'ENABLED' | 'DISABLED' | null;
  types: 'SYSTEM' | 'CUSTOM' | null;
  createdRange: DateTimeRangeValue;
  hasRemediation: 'YES' | 'NO' | null;
}

interface PolicyFiltersProps {
  filters: PolicyFiltersState;
  onFiltersChange: (filters: PolicyFiltersState) => void;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-md)',
    padding: 'var(--space-md)',
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    marginBottom: 'var(--space-lg)',
  },
  filtersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-md)',
    alignItems: 'flex-end',
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  searchField: {
    flex: '1 1 200px',
    minWidth: 200,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: 'var(--color-text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  input: {
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'var(--color-bg-tertiary)',
    color: 'var(--color-text-primary)',
    fontSize: 13,
    minWidth: 180,
    minHeight: 36,
    boxSizing: 'border-box',
  },
  activeFiltersRow: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 'var(--space-sm)',
    alignItems: 'center',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
    padding: '4px 8px',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-bg-primary)',
    borderRadius: 'var(--radius-sm)',
    fontSize: 12,
    fontWeight: 500,
  },
  chipRemove: {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    opacity: 0.8,
  },
  clearAllButton: {
    padding: '4px 10px',
    borderRadius: 'var(--radius-sm)',
    border: '1px solid var(--color-border)',
    backgroundColor: 'transparent',
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
};

const severityOptions: MultiSelectOption[] = [
  { value: 'CRITICAL', label: 'Critical' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

// Single-select options (with empty value for "All")
const enabledOptions: SingleSelectOption[] = [
  { value: '', label: 'All' },
  { value: 'ENABLED', label: 'Enabled' },
  { value: 'DISABLED', label: 'Disabled' },
];

const typeOptions: SingleSelectOption[] = [
  { value: '', label: 'All' },
  { value: 'SYSTEM', label: 'Pre-configured' },
  { value: 'CUSTOM', label: 'Custom' },
];

const hasRemediationOptions: SingleSelectOption[] = [
  { value: '', label: 'All' },
  { value: 'YES', label: 'Has remediation' },
  { value: 'NO', label: 'No remediation' },
];

const formatDateChip = (isoString: string) => {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export function PolicyFilters({ filters, onFiltersChange }: PolicyFiltersProps) {
  // Build active filter chips
  const activeChips = useMemo(() => {
    const chips: { label: string; group: keyof PolicyFiltersState; value?: string }[] = [];

    if (filters.search) {
      chips.push({ label: `Search: "${filters.search}"`, group: 'search' });
    }

    // Multi-select chips (only show if not all selected)
    if (filters.severities.length > 0 && filters.severities.length < severityOptions.length) {
      filters.severities.forEach((s) => {
        const opt = severityOptions.find((o) => o.value === s);
        if (opt) chips.push({ label: `Severity: ${opt.label}`, group: 'severities', value: s });
      });
    }

    // Single-select chips
    if (filters.enabled) {
      const opt = enabledOptions.find((o) => o.value === filters.enabled);
      if (opt) chips.push({ label: `Status: ${opt.label}`, group: 'enabled', value: filters.enabled });
    }

    if (filters.types) {
      const opt = typeOptions.find((o) => o.value === filters.types);
      if (opt) chips.push({ label: `Type: ${opt.label}`, group: 'types', value: filters.types });
    }

    // Created range chips
    if (filters.createdRange.from) {
      chips.push({ label: `Created from: ${formatDateChip(filters.createdRange.from)}`, group: 'createdRange', value: 'from' });
    }
    if (filters.createdRange.to) {
      chips.push({ label: `Created to: ${formatDateChip(filters.createdRange.to)}`, group: 'createdRange', value: 'to' });
    }

    if (filters.hasRemediation) {
      const opt = hasRemediationOptions.find((o) => o.value === filters.hasRemediation);
      if (opt) chips.push({ label: `Remediation: ${opt.label}`, group: 'hasRemediation', value: filters.hasRemediation });
    }

    return chips;
  }, [filters]);

  const hasActiveFilters = activeChips.length > 0;

  const handleClearAll = () => {
    onFiltersChange(defaultPolicyFilters);
  };

  const handleRemoveChip = (group: keyof PolicyFiltersState, value?: string) => {
    if (group === 'search') {
      onFiltersChange({ ...filters, search: '' });
    } else if (group === 'createdRange') {
      if (value === 'from') {
        onFiltersChange({ ...filters, createdRange: { ...filters.createdRange, from: null } });
      } else if (value === 'to') {
        onFiltersChange({ ...filters, createdRange: { ...filters.createdRange, to: null } });
      }
    } else if (group === 'enabled' || group === 'types' || group === 'hasRemediation') {
      // Single-select filters: set to null
      onFiltersChange({ ...filters, [group]: null });
    } else if (group === 'severities' && value) {
      // Multi-select filters: remove from array
      onFiltersChange({
        ...filters,
        severities: filters.severities.filter((v) => v !== value),
      });
    }
  };

  return (
    <div style={styles.container} role="search" aria-label="Filter policies">
      <div style={styles.filtersRow}>
        {/* Search */}
        <div style={{ ...styles.field, ...styles.searchField }}>
          <label htmlFor="policy-search" style={styles.label}>
            Search
          </label>
          <input
            id="policy-search"
            type="text"
            placeholder="Search by name or description..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            style={styles.input}
            aria-label="Search policies by name or description"
          />
        </div>

        {/* Severity multi-select */}
        <MultiSelect
          id="policy-severity-filter"
          label="Severity"
          options={severityOptions}
          selected={filters.severities}
          onChange={(selected) =>
            onFiltersChange({ ...filters, severities: selected as Severity[] })
          }
          placeholder="All Severities"
        />

        {/* Status single-select */}
        <SingleSelect
          id="policy-enabled-filter"
          label="Status"
          options={enabledOptions}
          value={filters.enabled || ''}
          onChange={(value) =>
            onFiltersChange({ ...filters, enabled: (value || null) as 'ENABLED' | 'DISABLED' | null })
          }
          placeholder="All"
        />

        {/* Type single-select */}
        <SingleSelect
          id="policy-type-filter"
          label="Type"
          options={typeOptions}
          value={filters.types || ''}
          onChange={(value) =>
            onFiltersChange({ ...filters, types: (value || null) as 'SYSTEM' | 'CUSTOM' | null })
          }
          placeholder="All"
        />

        {/* Remediation single-select */}
        <SingleSelect
          id="policy-remediation-filter"
          label="Remediation"
          options={hasRemediationOptions}
          value={filters.hasRemediation || ''}
          onChange={(value) =>
            onFiltersChange({ ...filters, hasRemediation: (value || null) as 'YES' | 'NO' | null })
          }
          placeholder="All"
        />
      </div>

      {/* Created date-time range filter */}
      <div style={styles.filtersRow}>
        <DateTimeRange
          label="Created"
          value={filters.createdRange}
          onChange={(createdRange) => onFiltersChange({ ...filters, createdRange })}
        />
      </div>

      {/* Active filters chips */}
      {hasActiveFilters && (
        <div style={styles.activeFiltersRow}>
          {activeChips.map((chip, index) => (
            <span key={`${chip.group}-${chip.value || index}`} style={styles.chip}>
              {chip.label}
              <button
                type="button"
                style={styles.chipRemove}
                onClick={() => handleRemoveChip(chip.group, chip.value)}
                aria-label={`Remove filter: ${chip.label}`}
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3L9 9M9 3L3 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </span>
          ))}
          <button
            type="button"
            style={styles.clearAllButton}
            onClick={handleClearAll}
            aria-label="Clear all filters"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

export const defaultPolicyFilters: PolicyFiltersState = {
  search: '',
  severities: [],
  enabled: null,
  types: null,
  createdRange: { from: null, to: null },
  hasRemediation: null,
};
