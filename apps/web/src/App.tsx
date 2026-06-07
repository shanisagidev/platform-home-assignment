import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import { AppShell } from './components/layout/AppShell';
import { LoginPage } from './routes/LoginPage';
import { PoliciesPage } from './routes/PoliciesPage';
import { CreatePolicyPage } from './routes/CreatePolicyPage';
import { EditPolicyPage } from './routes/EditPolicyPage';
import { AlertsPage } from './routes/AlertsPage';
import { ScanRunsPage } from './routes/ScanRunsPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ConnectionStatus } from './components/common/ConnectionStatus';
import { ScanStatusBanner } from './components/common/ScanStatusBanner';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        color: 'var(--color-text-secondary)'
      }}>
        Loading...
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <AppShell>
                <Routes>
                  <Route path="/" element={<Navigate to="/policies" replace />} />
                  <Route path="/policies" element={<PoliciesPage />} />
                  <Route path="/policies/new" element={<CreatePolicyPage />} />
                  <Route path="/policies/:id/edit" element={<EditPolicyPage />} />
                  <Route path="/alerts" element={<AlertsPage />} />
                  <Route path="/scans" element={<ScanRunsPage />} />
                </Routes>
              </AppShell>
            </ProtectedRoute>
          }
        />
      </Routes>
      {/* Connection status indicator - shows when API is unreachable */}
      <ConnectionStatus />
      {/* Global scan status banner - shows when scan is in progress */}
      <ScanStatusBanner />
    </ErrorBoundary>
  );
}

