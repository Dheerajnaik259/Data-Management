import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { ToastProvider } from './context/ToastContext';

const Login = lazy(() => import('./routes/Login').then(module => ({ default: module.Login })));
const Dashboard = lazy(() => import('./routes/Dashboard').then(module => ({ default: module.Dashboard })));
const Shoots = lazy(() => import('./routes/Shoots').then(module => ({ default: module.Shoots })));
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

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
          <DataProvider>
            <Suspense fallback={<div role="status" className="flex min-h-screen items-center justify-center text-sm text-[var(--color-text-secondary)]">Loading page...</div>}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
                  <Route index element={<Dashboard />} />
                  <Route path="shoots" element={<Shoots />} />
                  <Route path="shoots/:id" element={<ShootDetail />} />
                  <Route path="clients" element={<Clients />} />
                  <Route path="clients/:id" element={<ClientDetail />} />
                  <Route path="cameramen" element={<Cameramen />} />
                  <Route path="cameramen/:id" element={<CameramanDetail />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="invoices" element={<Invoices />} />
                  <Route path="expenses" element={<Expenses />} />
                  <Route path="settings" element={<Settings />} />
                  <Route path="approvals" element={<PendingApprovals />} />
                  <Route path="recycle-bin" element={<RecycleBin />} />
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
