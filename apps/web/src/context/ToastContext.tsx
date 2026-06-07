import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react';
import { ToastContainer, ToastData } from '../components/common/Toast';

// Deduplication window in milliseconds
const DEDUPE_WINDOW_MS = 3000;

interface ToastOptions extends Omit<ToastData, 'id'> {
  /** Optional key to deduplicate toasts. Toasts with the same key within the dedupe window are suppressed. */
  dedupeKey?: string;
}

interface ToastContextType {
  showToast: (toast: ToastOptions) => void;
  /** Suppress toasts with this key for the dedupe window (used when action handlers show a toast to prevent polling dupes) */
  suppressKey: (key: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const recentKeysRef = useRef<Map<string, number>>(new Map());

  const cleanupOldKeys = useCallback(() => {
    const now = Date.now();
    const keysToDelete: string[] = [];
    recentKeysRef.current.forEach((timestamp, key) => {
      if (now - timestamp > DEDUPE_WINDOW_MS) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => recentKeysRef.current.delete(key));
  }, []);

  const showToast = useCallback((toast: ToastOptions) => {
    // Cleanup old keys
    cleanupOldKeys();
    
    const { dedupeKey, ...toastData } = toast;
    
    // Check for duplicate
    if (dedupeKey) {
      const lastShown = recentKeysRef.current.get(dedupeKey);
      if (lastShown && Date.now() - lastShown < DEDUPE_WINDOW_MS) {
        // Suppress duplicate
        return;
      }
      // Record this key
      recentKeysRef.current.set(dedupeKey, Date.now());
    }
    
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { ...toastData, id }]);
  }, [cleanupOldKeys]);

  const suppressKey = useCallback((key: string) => {
    recentKeysRef.current.set(key, Date.now());
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, suppressKey }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}




