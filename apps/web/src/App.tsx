import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Suspense } from 'react';
import { AuthProvider, useAuth } from './lib/auth-context.js';
import { WorkspaceProvider, useWorkspace } from './lib/workspace-context.js';
import { Layout } from './components/layout/Layout.js';
import { LoginPage } from './pages/auth/LoginPage.js';
import { RegisterPage } from './pages/auth/RegisterPage.js';
import { InboxPage } from './pages/InboxPage.js';
import { PagesPage } from './pages/PagesPage.js';
import { ReviewsPage } from './pages/ReviewsPage.js';
import { SourcesPage } from './pages/sources/SourcesPage.js';
import { SettingsPage } from './pages/SettingsPage.js';
import { PageDetailPage } from './pages/PageDetailPage.js';
import { ReviewDetailPage } from './pages/ReviewDetailPage.js';
import { QAPage } from './pages/QAPage.js';
import { CollectionsPage } from './pages/CollectionsPage.js';
import { CollectionDetailPage } from './pages/CollectionDetailPage.js';
import { SearchPage } from './pages/SearchPage.js';
import { ActivityPage } from './pages/ActivityPage.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { TemplatesPage } from './pages/TemplatesPage.js';
import { AiPromptStudioPage } from './pages/AiPromptStudioPage.js';

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

              {/* Legacy workspace setup route */}
              <Route path="/setup" element={<RequireAuth><Navigate to="/" replace /></RequireAuth>} />

              {/* Protected app routes */}
              <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
                <Route index element={<DashboardPage />} />
                <Route path="inbox" element={<RequireWorkspacePage><InboxPage /></RequireWorkspacePage>} />
                <Route path="pages" element={<RequireWorkspacePage><PagesPage /></RequireWorkspacePage>} />
                <Route path="pages/:id" element={<RequireWorkspacePage><PageDetailPage /></RequireWorkspacePage>} />
                <Route path="reviews" element={<RequireWorkspacePage><ReviewsPage /></RequireWorkspacePage>} />
                <Route path="reviews/:id" element={<RequireWorkspacePage><ReviewDetailPage /></RequireWorkspacePage>} />
                <Route path="qa" element={<RequireWorkspacePage><QAPage /></RequireWorkspacePage>} />
                <Route path="collections" element={<RequireWorkspacePage><CollectionsPage /></RequireWorkspacePage>} />
                <Route path="collections/:id" element={<RequireWorkspacePage><CollectionDetailPage /></RequireWorkspacePage>} />
                <Route path="search" element={<RequireWorkspacePage><SearchPage /></RequireWorkspacePage>} />
                <Route path="activity" element={<RequireWorkspacePage><ActivityPage /></RequireWorkspacePage>} />
                <Route path="sources" element={<RequireWorkspacePage><SourcesPage /></RequireWorkspacePage>} />
                <Route path="settings" element={<RequireWorkspacePage><SettingsPage /></RequireWorkspacePage>} />
                <Route path="settings/templates" element={<RequireWorkspacePage><TemplatesPage /></RequireWorkspacePage>} />
              <Route path="settings/ai-prompts" element={<RequireWorkspacePage><AiPromptStudioPage /></RequireWorkspacePage>} />
              </Route>

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
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
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireAuth({ children }: { children: React.ReactNode }): React.ReactElement {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireWorkspacePage({ children }: { children: React.ReactNode }): React.ReactElement {
  const { workspace, isLoading } = useWorkspace();

  if (isLoading) return <LoadingScreen />;
  if (!workspace) return <Navigate to="/" replace />;
  return <>{children}</>;
}
