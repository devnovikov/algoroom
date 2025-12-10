import { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider, ErrorBoundary, LoadingSpinner } from './components';

// Lazy load pages for code splitting
const Home = lazy(() => import('./pages/Home').then((m) => ({ default: m.Home })));
const Session = lazy(() => import('./pages/Session').then((m) => ({ default: m.Session })));

// Full-page loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center">
        <LoadingSpinner size={32} />
        <p className="mt-4 text-slate-400 text-sm">Loading...</p>
      </div>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/session/:sessionId" element={<Session />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </ErrorBoundary>
  );
}

export default App;
