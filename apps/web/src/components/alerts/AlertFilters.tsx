import { CSSProperties, useMemo } from 'react';
import { MultiSelect, MultiSelectOption } from '../common/MultiSelect';
import { SingleSelect, SingleSelectOption } from '../common/SingleSelect';
import { DateTimeRange, DateTimeRangeValue } from '../common/DateTimeRange';
import type { Severity, AlertStatus, Assignee } from '../../types/domain';
import type { PolicyConfigLabels } from '../../services/policyConfig.service';
import { getLabel } from '../../services/policyConfig.service';

export interface AlertFiltersState {
  search: string;
  // Multi-select filters (OR within group)
  statuses: AlertStatus[];
  severities: Severity[];
  assignees: string[]; // 'UNASSIGNED' or assignee IDs
  // Single-select filters (2-value binary)
  enabled: 'ENABLED' | 'DISABLED' | null;
  types: 'SYSTEM' | 'CUSTOM' | null;
  createdRange: DateTimeRangeValue;
  autoRemediate: 'ON' | 'OFF' | null;
}

interface AlertFiltersProps {
  filters: AlertFiltersState;
  onFiltersChange: (filters: AlertFiltersState) => void;
  assignees: Assignee[];
  configLabels: PolicyConfigLabels | null;
  alertStatuses: string[];
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

// Options for multi-selects
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

const autoRemediateOptions: SingleSelectOption[] = [
  { value: '', label: 'All' },
  { value: 'ON', label: 'ON' },
  { value: 'OFF', label: 'OFF' },
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

export function AlertFilters({ filters, onFiltersChange, assignees, configLabels, alertStatuses }: AlertFiltersProps) {
  // Build options from config-provided statuses
  const statusOptions: MultiSelectOption[] = useMemo(() =>
    alertStatuses.map((s) => ({
      value: s,
      label: getLabel(configLabels?.alertStatuses, s),
    })),
  [alertStatuses, configLabels]);

  const assigneeOptions: MultiSelectOption[] = useMemo(() => [
    { value: 'UNASSIGNED', label: 'Unassigned' },
    ...assignees.map((a) => ({
      value: a.id,
      label: a.name,
    })),
  ], [assignees]);

  // Build active filter chips
  const activeChips = useMemo(() => {
    const chips: { label: string; group: keyof AlertFiltersState; value?: string }[] = [];

    if (filters.search) {
      chips.push({ label: `Search: "${filters.search}"`, group: 'search' });
    }

    // Status chips
    if (filters.statuses.length > 0 && filters.statuses.length < statusOptions.length) {
      filters.statuses.forEach((s) => {
        chips.push({ label: `Status: ${getLabel(configLabels?.alertStatuses, s)}`, group: 'statuses', value: s });
      });
    }

    // Severity chips
    if (filters.severities.length > 0 && filters.severities.length < severityOptions.length) {
      filters.severities.forEach((s) => {
        const opt = severityOptions.find((o) => o.value === s);
        if (opt) chips.push({ label: `Severity: ${opt.label}`, group: 'severities', value: s });
      });
    }

    // Assignee chips
    if (filters.assignees.length > 0 && filters.assignees.length < assigneeOptions.length) {
      filters.assignees.forEach((a) => {
        const opt = assigneeOptions.find((o) => o.value === a);
        if (opt) chips.push({ label: `Assignee: ${opt.label}`, group: 'assignees', value: a });
      });
    }

    // Enabled chip (single-select)
    if (filters.enabled) {
      const opt = enabledOptions.find((o) => o.value === filters.enabled);
      if (opt) chips.push({ label: `Policy Status: ${opt.label}`, group: 'enabled', value: filters.enabled });
    }

    // Type chip (single-select)
    if (filters.types) {
      const opt = typeOptions.find((o) => o.value === filters.types);
      if (opt) chips.push({ label: `Policy Type: ${opt.label}`, group: 'types', value: filters.types });
    }

    // Created range chips
    if (filters.createdRange.from) {
      chips.push({ label: `Created from: ${formatDateChip(filters.createdRange.from)}`, group: 'createdRange', value: 'from' });
    }
    if (filters.createdRange.to) {
      chips.push({ label: `Created to: ${formatDateChip(filters.createdRange.to)}`, group: 'createdRange', value: 'to' });
    }

    // Auto remediate chip (single-select)
    if (filters.autoRemediate) {
      const opt = autoRemediateOptions.find((o) => o.value === filters.autoRemediate);
      if (opt) chips.push({ label: `Auto Remediate: ${opt.label}`, group: 'autoRemediate', value: filters.autoRemediate });
    }

    return chips;
  }, [filters, statusOptions, assigneeOptions]);

  const hasActiveFilters = activeChips.length > 0;

  const handleClearAll = () => {
    onFiltersChange(defaultAlertFilters);
  };

  const handleRemoveChip = (group: keyof AlertFiltersState, value?: string) => {
    if (group === 'search') {
      onFiltersChange({ ...filters, search: '' });
    } else if (group === 'createdRange') {
      if (value === 'from') {
        onFiltersChange({ ...filters, createdRange: { ...filters.createdRange, from: null } });
      } else if (value === 'to') {
        onFiltersChange({ ...filters, createdRange: { ...filters.createdRange, to: null } });
      }
    } else if (group === 'enabled' || group === 'types' || group === 'autoRemediate') {
      // Single-select filters: set to null
      onFiltersChange({ ...filters, [group]: null });
    } else if (value) {
      // Multi-select filters: remove from array
      const currentArray = filters[group] as string[];
      onFiltersChange({
        ...filters,
        [group]: currentArray.filter((v) => v !== value),
      });
    }
  };

  return (
    <div style={styles.container} role="search" aria-label="Filter alerts">
      {/* First row: Search + Alert-specific filters */}
      <div style={styles.filtersRow}>
        {/* Search */}
        <div style={{ ...styles.field, ...styles.searchField }}>
          <label htmlFor="alert-search" style={styles.label}>
            Search
          </label>
          <input
            id="alert-search"
            type="text"
            placeholder="Search by policy, asset, or description..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
            style={styles.input}
            aria-label="Search alerts by policy name, asset location, or description"
          />
        </div>

        {/* Status multi-select */}
        <MultiSelect
          id="alert-status-filter"
          label="Status"
          options={statusOptions}
          selected={filters.statuses}
          onChange={(selected) =>
            onFiltersChange({ ...filters, statuses: selected as AlertStatus[] })
          }
          placeholder="All Statuses"
        />

        {/* Severity multi-select */}
        <MultiSelect
          id="alert-severity-filter"
          label="Severity"
          options={severityOptions}
          selected={filters.severities}
          onChange={(selected) =>
            onFiltersChange({ ...filters, severities: selected as Severity[] })
          }
          placeholder="All Severities"
        />

        {/* Assignee multi-select */}
        <MultiSelect
          id="alert-assignee-filter"
          label="Assignee"
          options={assigneeOptions}
          selected={filters.assignees}
          onChange={(selected) =>
            onFiltersChange({ ...filters, assignees: selected })
          }
          placeholder="All Assignees"
        />

      </div>

      {/* Second row: Single-select policy filters */}
      <div style={styles.filtersRow}>
        {/* Policy Status single-select */}
        <SingleSelect
          id="alert-enabled-filter"
          label="Policy Status"
          options={enabledOptions}
          value={filters.enabled || ''}
          onChange={(value) =>
            onFiltersChange({ ...filters, enabled: (value || null) as 'ENABLED' | 'DISABLED' | null })
          }
          placeholder="All"
        />

        {/* Policy Type single-select */}
        <SingleSelect
          id="alert-type-filter"
          label="Policy Type"
          options={typeOptions}
          value={filters.types || ''}
          onChange={(value) =>
            onFiltersChange({ ...filters, types: (value || null) as 'SYSTEM' | 'CUSTOM' | null })
          }
          placeholder="All"
        />

        {/* Auto Remediate single-select */}
        <SingleSelect
          id="alert-auto-remediate-filter"
          label="Auto Remediate"
          options={autoRemediateOptions}
          value={filters.autoRemediate || ''}
          onChange={(value) =>
            onFiltersChange({ ...filters, autoRemediate: (value || null) as 'ON' | 'OFF' | null })
          }
          placeholder="All"
        />

        {/* Created date-time range */}
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

export const defaultAlertFilters: AlertFiltersState = {
  search: '',
  statuses: [],
  severities: [],
  assignees: [],
  enabled: null,
  types: null,
  createdRange: { from: null, to: null },
  autoRemediate: null,
};
