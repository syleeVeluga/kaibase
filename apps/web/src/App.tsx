import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { Suspense } from 'react';
import { Layout } from './components/layout/Layout.js';

export function App(): React.ReactElement {
  return (
    <BrowserRouter>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/inbox" replace />} />
            <Route path="inbox" element={<div>Inbox</div>} />
            <Route path="pages" element={<div>Pages</div>} />
            <Route path="reviews" element={<div>Reviews</div>} />
            <Route path="sources" element={<div>Sources</div>} />
            <Route path="settings" element={<div>Settings</div>} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
