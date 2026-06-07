import { CSSProperties } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

interface NavItem {
  path: string;
  label: string;
  icon: JSX.Element;
}

const navItems: NavItem[] = [
  {
    path: '/policies',
    label: 'Policies',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 2L3 5V9.5C3 13.64 6 17.45 10 18.5C14 17.45 17 13.64 17 9.5V5L10 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M7 10L9 12L13 8"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: '/alerts',
    label: 'Alerts',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M10 3C6.68629 3 4 5.68629 4 9V12L2.5 14.5V15.5H17.5V14.5L16 12V9C16 5.68629 13.3137 3 10 3Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8 15.5C8 16.6046 8.89543 17.5 10 17.5C11.1046 17.5 12 16.6046 12 15.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: '/scans',
    label: 'Scan Activity',
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.5" />
        <path
          d="M10 6V10L12.5 12.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

const styles: Record<string, CSSProperties> = {
  sidebar: {
    width: 220,
    backgroundColor: 'var(--color-bg-secondary)',
    borderRight: '1px solid var(--color-border)',
    padding: 'var(--space-md)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--space-xs)',
  },
  navLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-sm)',
    padding: 'var(--space-sm) var(--space-md)',
    borderRadius: 'var(--radius-md)',
    color: 'var(--color-text-secondary)',
    textDecoration: 'none',
    transition: 'all var(--transition-fast)',
    fontSize: 14,
    fontWeight: 500,
  },
  navLinkActive: {
    backgroundColor: 'var(--color-accent-muted)',
    color: 'var(--color-accent)',
  },
};

export function Sidebar() {
  const location = useLocation();
  
  return (
    <nav style={styles.sidebar} aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = location.pathname === item.path;
        
        return (
          <NavLink
            key={item.path}
            to={item.path}
            style={{
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            }}
            aria-current={isActive ? 'page' : undefined}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = 'var(--color-bg-hover)';
                e.currentTarget.style.color = 'var(--color-text-primary)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.backgroundColor = '';
                e.currentTarget.style.color = 'var(--color-text-secondary)';
              }
            }}
          >
            {item.icon}
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}

