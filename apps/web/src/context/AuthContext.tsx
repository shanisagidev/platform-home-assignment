import { createContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { authService } from '../services/auth.service';
import type { User } from '../types/domain';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  error: string | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Check for existing session on mount
  useEffect(() => {
    const existingUser = authService.getUser();
    if (existingUser && authService.isAuthenticated()) {
      setUser(existingUser);
    }
    setIsLoading(false);
  }, []);
  
  const login = useCallback(async (username: string, password: string) => {
    setError(null);
    setIsLoading(true);
    
    try {
      const response = await authService.login(username, password);
      setUser(response.user);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const logout = useCallback(() => {
    authService.logout();
    setUser(null);
  }, []);
  
  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        error,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

