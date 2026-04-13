import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { normalizeLanguageTag, type Language } from '@kaibase/shared';
import { apiClient, ApiError } from './api-client.js';
import { useAuth } from './auth-context.js';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  defaultLanguage: Language;
}

interface WorkspaceContextValue {
  workspace: Workspace | null;
  workspaces: Workspace[];
  isLoading: boolean;
  selectWorkspace: (id: string) => void;
  createWorkspace: (data: {
    name: string;
    slug: string;
    description?: string;
    defaultLanguage?: Language;
  }) => Promise<Workspace>;
  updateWorkspace: (
    id: string,
    data: Partial<Pick<Workspace, 'name' | 'description' | 'defaultLanguage'>>,
  ) => Promise<Workspace>;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  children: React.ReactNode;
}

export function WorkspaceProvider({
  children,
}: WorkspaceProviderProps): React.ReactElement {
  const { isAuthenticated } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      setWorkspaces([]);
      setWorkspace(null);
      setIsLoading(false);
      return;
    }

    apiClient
      .get<{ workspaces: Workspace[] }>('/workspaces')
      .then(({ workspaces: ws }) => {
        setWorkspaces(ws);

        // Auto-select: saved preference > first workspace
        const savedId = localStorage.getItem('workspaceId');
        const match = ws.find((w) => w.id === savedId);
        setWorkspace(match ?? ws[0] ?? null);
      })
      .catch((err: unknown) => {
        // If the API returned 401, tokens are invalid — clear them so the
        // auth guard redirects to /login instead of /setup.
        if (err instanceof ApiError && err.status === 401) {
          apiClient.clearTokens();
          window.location.replace('/login');
        }
      })
      .finally(() => setIsLoading(false));
  }, [isAuthenticated]);

  const selectWorkspace = useCallback(
    (id: string) => {
      const found = workspaces.find((w) => w.id === id);
      if (found) {
        setWorkspace(found);
        localStorage.setItem('workspaceId', id);
      }
    },
    [workspaces],
  );

  const createWorkspace = useCallback(
    async (data: {
      name: string;
      slug: string;
      description?: string;
      defaultLanguage?: Language;
    }) => {
      const defaultLanguage =
        data.defaultLanguage
        ?? normalizeLanguageTag(window.navigator.language)
        ?? 'en';
      const ws = await apiClient.post<Workspace>('/workspaces', {
        ...data,
        defaultLanguage,
      });
      setWorkspaces((prev) => [...prev, ws]);
      setWorkspace(ws);
      localStorage.setItem('workspaceId', ws.id);
      return ws;
    },
    [],
  );

  const updateWorkspace = useCallback(
    async (
      id: string,
      data: Partial<Pick<Workspace, 'name' | 'description' | 'defaultLanguage'>>,
    ) => {
      const updated = await apiClient.patch<Workspace>(`/workspaces/${id}`, data);
      setWorkspaces((prev) => prev.map((item) => (item.id === id ? updated : item)));
      setWorkspace((prev) => (prev?.id === id ? updated : prev));
      return updated;
    },
    [],
  );

  return (
    <WorkspaceContext
      value={{
        workspace,
        workspaces,
        isLoading,
        selectWorkspace,
        createWorkspace,
        updateWorkspace,
      }}
    >
      {children}
    </WorkspaceContext>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return ctx;
}
