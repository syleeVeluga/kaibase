import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { apiClient } from './api-client.js';
import { useAuth } from './auth-context.js';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  defaultLanguage: string;
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
  }) => Promise<Workspace>;
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
      .catch(() => {})
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
    async (data: { name: string; slug: string; description?: string }) => {
      const ws = await apiClient.post<Workspace>('/workspaces', data);
      setWorkspaces((prev) => [...prev, ws]);
      setWorkspace(ws);
      localStorage.setItem('workspaceId', ws.id);
      return ws;
    },
    [],
  );

  return (
    <WorkspaceContext
      value={{ workspace, workspaces, isLoading, selectWorkspace, createWorkspace }}
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
