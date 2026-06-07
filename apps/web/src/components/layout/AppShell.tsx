import { CSSProperties, ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

interface AppShellProps {
  children: ReactNode;
}

const styles: Record<string, CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
  },
  body: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
  },
  main: {
    flex: 1,
    overflow: 'auto',
    padding: 'var(--space-lg)',
    backgroundColor: 'var(--color-bg-primary)',
  },
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div style={styles.container}>
      <Header />
      <div style={styles.body}>
        <Sidebar />
        <main style={styles.main}>{children}</main>
      </div>
    </div>
  );
}

