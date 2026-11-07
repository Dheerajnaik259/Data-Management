import { lazy, Suspense, useEffect, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { canAccessRoute } from './utils/permissions';
import { useAuth } from './context/AuthContext';

import { ToastProvider } from './context/ToastContext';

function TrackpadHistoryGestures() {
  const navigate = useNavigate();
  const location = useLocation();
  const horizontalDelta = useRef(0);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastNavigation = useRef(0);

  useEffect(() => {
    if (location.pathname === '/login') return;

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) * 1.25) return;
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;

      let element = event.target instanceof Element ? event.target : null;
      while (element) {
        const { overflowX } = window.getComputedStyle(element);
        if (element.scrollWidth > element.clientWidth + 1 && (overflowX === 'auto' || overflowX === 'scroll')) return;
        element = element.parentElement;
      }

      event.preventDefault();
      horizontalDelta.current += event.deltaX;
      if (resetTimer.current) clearTimeout(resetTimer.current);
      resetTimer.current = setTimeout(() => { horizontalDelta.current = 0; }, 140);
      if (Math.abs(horizontalDelta.current) < 70) return;

      const now = Date.now();
      const direction = horizontalDelta.current > 0 ? 1 : -1;
      horizontalDelta.current = 0;
      if (now - lastNavigation.current < 600) return;
      if (direction < 0 && typeof window.history.state?.idx === 'number' && window.history.state.idx === 0) return;

      lastNavigation.current = now;
      navigate(direction);
    };

    window.addEventListener('wheel', handleWheel, { capture: true, passive: false });
    return () => {
      window.removeEventListener('wheel', handleWheel, true);
      if (resetTimer.current) clearTimeout(resetTimer.current);
    };
  }, [location.pathname, navigate]);

  return null;
}

const Login = lazy(() => import('./routes/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./routes/Dashboard').then(module => ({ default: module.Dashboard })));
const Shoots = lazy(() => import('./routes/Shoots').then(module => ({ default: module.Shoots })));
const Schedule = lazy(() => import('./routes/Schedule').then(module => ({ default: module.Schedule })));
const ShootDetail = lazy(() => import('./routes/ShootDetail').then(module => ({ default: module.ShootDetail })));
const Clients = lazy(() => import('./routes/Clients').then(module => ({ default: module.Clients })));
const ClientDetail = lazy(() => import('./routes/ClientDetail').then(module => ({ default: module.ClientDetail })));
const Cameramen = lazy(() => import('./routes/Cameramen').then(module => ({ default: module.Cameramen })));
const CameramanDetail = lazy(() => import('./routes/CameramanDetail').then(module => ({ default: module.CameramanDetail })));
const Payments = lazy(() => import('./routes/Payments').then(module => ({ default: module.Payments })));
const Invoices = lazy(() => import('./routes/Invoices').then(module => ({ default: module.Invoices })));
const Expenses = lazy(() => import('./routes/Expenses').then(module => ({ default: module.Expenses })));
const Settings = lazy(() => import('./routes/Settings').then(module => ({ default: module.Settings })));
const PendingApprovals = lazy(() => import('./routes/PendingApprovals').then(module => ({ default: module.PendingApprovals })));
const RecycleBin = lazy(() => import('./routes/RecycleBin').then(module => ({ default: module.RecycleBin })));

function RoleAccess({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const location = useLocation();
  return user && canAccessRoute(user.role, location.pathname) ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <TrackpadHistoryGestures />
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
          <DataProvider>
            <Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center text-sm text-[var(--color-text-secondary)]">Loading page...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="shoots" element={<RoleAccess><Shoots /></RoleAccess>} />
                  <Route path="schedule" element={<RoleAccess><Schedule /></RoleAccess>} />
                  <Route path="shoots/:id" element={<RoleAccess><ShootDetail /></RoleAccess>} />
                  <Route path="clients" element={<RoleAccess><Clients /></RoleAccess>} />
                  <Route path="clients/:id" element={<RoleAccess><ClientDetail /></RoleAccess>} />
                  <Route path="cameramen" element={<RoleAccess><Cameramen /></RoleAccess>} />
                  <Route path="cameramen/:id" element={<RoleAccess><CameramanDetail /></RoleAccess>} />
                  <Route path="payments" element={<RoleAccess><Payments /></RoleAccess>} />
                  <Route path="invoices" element={<RoleAccess><Invoices /></RoleAccess>} />
                  <Route path="expenses" element={<RoleAccess><Expenses /></RoleAccess>} />
                  <Route path="settings" element={<RoleAccess><Settings /></RoleAccess>} />
                  <Route path="approvals" element={<RoleAccess><PendingApprovals /></RoleAccess>} />
                  <Route path="recycle-bin" element={<RoleAccess><RecycleBin /></RoleAccess>} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
