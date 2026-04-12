import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Suspense } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context.js';
import { WorkspaceProvider, useWorkspace } from './lib/workspace-context.js';
import { Layout } from './components/layout/Layout.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { WorkspaceSetupPage } from './pages/auth/WorkspaceSetupPage.js';
import { InboxPage } from './pages/InboxPage.js';
import { PagesPage } from './pages/PagesPage.js';
import { ReviewsPage } from './pages/ReviewsPage.js';
import { SourcesPage } from './pages/sources/SourcesPage.js';
import { SettingsPage } from './pages/SettingsPage.js';

export function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkspaceProvider>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              {/* Public auth routes */}
              <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
              <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />

              {/* Workspace setup */}
              <Route path="/setup" element={<RequireAuth><WorkspaceSetupPage /></RequireAuth>} />

              {/* Protected app routes */}
              <Route path="/" element={<RequireWorkspace><Layout /></RequireWorkspace>}>
                <Route index element={<Navigate to="/inbox" replace />} />
                <Route path="inbox" element={<InboxPage />} />
                <Route path="pages" element={<PagesPage />} />
                <Route path="reviews" element={<ReviewsPage />} />
                <Route path="sources" element={<SourcesPage />} />
                <Route path="settings" element={<SettingsPage />} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/inbox" replace />} />
            </Routes>
          </Suspense>
        </WorkspaceProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

function LoadingScreen(): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      Loading...
    </div>
  );
}

function GuestOnly({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to="/inbox" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireWorkspace({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { workspace, isLoading: wsLoading } = useWorkspace();

  if (authLoading || wsLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!workspace) return <Navigate to="/setup" replace />;
  return <>{children}</>;
}
