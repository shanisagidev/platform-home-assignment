import { CSSProperties, ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T) => ReactNode;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyField: keyof T;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

const styles: Record<string, CSSProperties> = {
  container: {
    width: '100%',
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    textAlign: 'left',
    padding: 'var(--space-md)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-secondary)',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
    whiteSpace: 'nowrap' as const,
  },
  td: {
    padding: 'var(--space-md)',
    borderBottom: '1px solid var(--color-border)',
    color: 'var(--color-text-primary)',
  },
  row: {
    transition: 'background-color var(--transition-fast)',
  },
  rowClickable: {
    cursor: 'pointer',
  },
  empty: {
    padding: 'var(--space-2xl)',
    textAlign: 'center' as const,
    color: 'var(--color-text-muted)',
  },
};

export function Table<T extends Record<string, unknown>>({
  columns,
  data,
  keyField,
  onRowClick,
  emptyMessage = 'No data available',
}: TableProps<T>) {
  if (data.length === 0) {
    return <div style={styles.empty}>{emptyMessage}</div>;
  }
  
  return (
    <div style={styles.container}>
      <table style={styles.table}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col.key} style={{ ...styles.th, width: col.width }}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map(item => (
            <tr
              key={String(item[keyField])}
              style={{
                ...styles.row,
                ...(onRowClick ? styles.rowClickable : {}),
              }}
              onClick={() => onRowClick?.(item)}
              onMouseEnter={(e) => {
                if (onRowClick) {
                  e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '';
              }}
            >
              {columns.map(col => (
                <td key={col.key} style={styles.td}>
                  {col.render
                    ? col.render(item)
                    : String(item[col.key as keyof T] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

