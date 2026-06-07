import { CSSProperties, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { policiesService } from '../services/policies.service';
import { scansService } from '../services/scans.service';
import { PoliciesTable } from '../components/policies/PoliciesTable';
import { PolicyDetailsDrawer } from '../components/policies/PolicyDetailsDrawer';
import { DeletePolicyModal } from '../components/policies/DeletePolicyModal';
import { PolicyFilters, PolicyFiltersState, defaultPolicyFilters } from '../components/policies/PolicyFilters';
import { PolicyDashboards } from '../components/policies/PolicyDashboards';
import { useScanStatus } from '../context/ScanStatusContext';
import { LoadingState } from '../components/common/LoadingState';
import type { Policy } from '../types/domain';

const styles: Record<string, CSSProperties> = {
  container: {
    maxWidth: 1200,
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 'var(--space-lg)',
  },
  headerLeft: {
    display: 'flex',
    flexDirection: 'column',
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: 'var(--color-text-primary)',
    marginBottom: 'var(--space-xs)',
  },
  subtitle: {
    fontSize: 14,
    color: 'var(--color-text-secondary)',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-md)',
  },
  createButton: {
    padding: 'var(--space-sm) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-bg-primary)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-xs)',
  },
  scanButton: {
    padding: 'var(--space-sm) var(--space-lg)',
    borderRadius: 'var(--radius-sm)',
    border: 'none',
    backgroundColor: 'var(--color-accent)',
    color: 'var(--color-bg-primary)',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  tableContainer: {
    backgroundColor: 'var(--color-bg-secondary)',
    border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-md)',
    overflow: 'hidden',
  },
  error: {
    padding: 'var(--space-lg)',
    backgroundColor: 'var(--color-critical-bg)',
    color: 'var(--color-critical)',
    borderRadius: 'var(--radius-md)',
    textAlign: 'center',
  },
};

export function PoliciesPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState<PolicyFiltersState>(defaultPolicyFilters);
  
  // Scan state
  const { isScanning, refreshStatus } = useScanStatus();
  const [isStartingScan, setIsStartingScan] = useState(false);
  
  // Details drawer state
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);
  
  // Delete modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingPolicy, setDeletingPolicy] = useState<Policy | null>(null);
  
  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await policiesService.getAll();
      setPolicies(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Refetch on mount (for tab navigation refresh)
  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);
  
  // Handle view query param to open policy details from alert page
  useEffect(() => {
    const viewPolicyId = searchParams.get('view');
    if (viewPolicyId && policies.length > 0) {
      const policy = policies.find(p => p.id === viewPolicyId);
      if (policy) {
        setSelectedPolicy(policy);
        setIsDetailsDrawerOpen(true);
        // Clear the query param
        setSearchParams({});
      }
    }
  }, [searchParams, policies, setSearchParams]);
  
  const handlePolicyClick = (policy: Policy) => {
    setSelectedPolicy(policy);
    setIsDetailsDrawerOpen(true);
  };
  
  const handleToggle = async (id: string, enabled: boolean) => {
    const updated = await policiesService.toggleEnabled(id, enabled);
    setPolicies((prev) => prev.map((p) => (p.id === id ? updated : p)));
    
    // Update drawer if open
    if (selectedPolicy?.id === id) {
      setSelectedPolicy(updated);
    }
  };
  
  const handleCloseDetailsDrawer = () => {
    setIsDetailsDrawerOpen(false);
  };
  
  // Navigate to create page
  const handleCreatePolicy = () => {
    navigate('/policies/new');
  };
  
  // Start a new scan
  const handleStartScan = async () => {
    setIsStartingScan(true);
    try {
      await scansService.startScan();
      refreshStatus();
    } catch (err) {
      console.error('Failed to start scan:', err);
    } finally {
      setIsStartingScan(false);
    }
  };
  
  const isScanDisabled = isStartingScan || isScanning;
  
  // Navigate to edit page
  const handleEditFromDetails = (policy: Policy) => {
    setIsDetailsDrawerOpen(false);
    navigate(`/policies/${policy.id}/edit`);
  };
  
  // Delete policy handlers
  const handleDeleteFromDetails = (policy: Policy) => {
    setIsDetailsDrawerOpen(false);
    setDeletingPolicy(policy);
    setIsDeleteModalOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    if (!deletingPolicy) return;
    
    await policiesService.delete(deletingPolicy.id);
    setPolicies((prev) => prev.filter((p) => p.id !== deletingPolicy.id));
    
    // Clear selected policy if it was deleted
    if (selectedPolicy?.id === deletingPolicy.id) {
      setSelectedPolicy(null);
    }
    
    setDeletingPolicy(null);
  };
  
  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeletingPolicy(null);
  };
  
  // Helper: Check if policy has remediation configured
  const hasRemediationConfigured = (policy: Policy): boolean => {
    const remediation = policy.definition?.remediation;
    if (!remediation) return false;
    if (typeof remediation === 'string') {
      try {
        const parsed = JSON.parse(remediation);
        return parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0;
      } catch {
        return false;
      }
    }
    return typeof remediation === 'object' && Object.keys(remediation).length > 0;
  };

  // Helper: Check if policy was created within date range
  const isWithinDateRange = (policy: Policy, range: { from: string | null; to: string | null }): boolean => {
    if (!range.from && !range.to) return true; // No filter
    
    const timestamp = policy.createdAt || policy.updatedAt;
    if (!timestamp) return true; // No date info, include it
    
    const policyDate = new Date(timestamp);
    
    // Validate range (from > to is invalid, don't filter)
    if (range.from && range.to) {
      if (new Date(range.from) > new Date(range.to)) return true;
    }
    
    if (range.from && policyDate < new Date(range.from)) return false;
    if (range.to && policyDate > new Date(range.to)) return false;
    
    return true;
  };

  // Filter policies based on filter state
  const filteredPolicies = useMemo(() => {
    return policies.filter((policy) => {
      // Search filter (name OR description)
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesName = policy.name.toLowerCase().includes(searchLower);
        const matchesDescription = policy.description.toLowerCase().includes(searchLower);
        if (!matchesName && !matchesDescription) {
          return false;
        }
      }
      
      // Severity filter (multi-select OR logic within group)
      // Empty array or all selected = no filter
      if (filters.severities.length > 0 && filters.severities.length < 4) {
        if (!filters.severities.includes(policy.severity)) {
          return false;
        }
      }
      
      // Enabled filter (single-select)
      if (filters.enabled) {
        const policyStatus = policy.enabled ? 'ENABLED' : 'DISABLED';
        if (filters.enabled !== policyStatus) {
          return false;
        }
      }
      
      // Type filter (single-select)
      if (filters.types) {
        const policyType = policy.isSystemPolicy ? 'SYSTEM' : 'CUSTOM';
        if (filters.types !== policyType) {
          return false;
        }
      }
      
      // Created date range filter
      if (!isWithinDateRange(policy, filters.createdRange)) {
        return false;
      }
      
      // Has remediation filter (single-select)
      if (filters.hasRemediation) {
        const hasRemediation = hasRemediationConfigured(policy);
        const matchesYes = filters.hasRemediation === 'YES' && hasRemediation;
        const matchesNo = filters.hasRemediation === 'NO' && !hasRemediation;
        if (!matchesYes && !matchesNo) {
          return false;
        }
      }
      
      return true;
    });
  }, [policies, filters]);
  
  if (loading) {
    return <LoadingState message="Loading policies..." />;
  }
  
  return (
    <div style={styles.container} data-testid="policies-page">
      <header style={styles.header}>
        <div style={styles.headerLeft}>
          <h1 style={styles.title}>Security Policies</h1>
          <p style={styles.subtitle}>
            Configure and manage data security policies for your organization
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={{
              ...styles.scanButton,
              opacity: isScanDisabled ? 0.7 : 1,
              cursor: isScanDisabled ? 'not-allowed' : 'pointer',
            }}
            onClick={handleStartScan}
            disabled={isScanDisabled}
            aria-label="Start new security scan"
          >
            {isScanning ? 'Scanning...' : 'Start New Scan'}
          </button>
          <button
            style={styles.createButton}
            onClick={handleCreatePolicy}
            aria-label="Create new policy"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 3V13M3 8H13"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            New Policy
          </button>
        </div>
      </header>
      
      {/* Three Dashboard Cards - reflect filtered results */}
      <PolicyDashboards policies={filteredPolicies} />
      
      {error && <div style={styles.error}>{error}</div>}
      
      <PolicyFilters filters={filters} onFiltersChange={setFilters} />
      
      <div style={styles.tableContainer}>
        <PoliciesTable
          policies={filteredPolicies}
          onPolicyClick={handlePolicyClick}
          onToggle={handleToggle}
        />
      </div>
      
      {/* Policy Details Drawer (read-only) */}
      <PolicyDetailsDrawer
        policy={selectedPolicy}
        isOpen={isDetailsDrawerOpen}
        onClose={handleCloseDetailsDrawer}
        onEdit={handleEditFromDetails}
        onDelete={handleDeleteFromDetails}
      />
      
      {/* Delete Confirmation Modal */}
      <DeletePolicyModal
        policy={deletingPolicy}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
