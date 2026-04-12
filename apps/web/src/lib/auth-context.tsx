import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { apiClient } from './api-client.js';

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  devLogin: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps): React.ReactElement {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Check existing session on mount
  useEffect(() => {
    if (!apiClient.isAuthenticated()) {
      setState({ user: null, isLoading: false, isAuthenticated: false });
      return;
    }

    apiClient
      .get<{ user: User }>('/auth/me')
      .then(({ user }) => {
        setState({ user, isLoading: false, isAuthenticated: true });
      })
      .catch(() => {
        apiClient.clearTokens();
        setState({ user: null, isLoading: false, isAuthenticated: false });
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/login', { email, password });

    apiClient.setTokens(data.accessToken, data.refreshToken);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
  }, []);

  const register = useCallback(
    async (email: string, password: string, name: string) => {
      const data = await apiClient.post<{
        accessToken: string;
        refreshToken: string;
        user: User;
      }>('/auth/register', { email, password, name });

      apiClient.setTokens(data.accessToken, data.refreshToken);
      setState({ user: data.user, isLoading: false, isAuthenticated: true });
    },
    [],
  );

  const devLogin = useCallback(async () => {
    const data = await apiClient.post<{
      accessToken: string;
      refreshToken: string;
      user: User;
    }>('/auth/dev-login');

    apiClient.setTokens(data.accessToken, data.refreshToken);
    setState({ user: data.user, isLoading: false, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    apiClient.post('/auth/logout').catch(() => {});
    apiClient.clearTokens();
    setState({ user: null, isLoading: false, isAuthenticated: false });
  }, []);

  return (
    <AuthContext value={{ ...state, login, register, devLogin, logout }}>
      {children}
    </AuthContext>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
