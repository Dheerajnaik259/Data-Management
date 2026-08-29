import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DataProvider } from './context/DataContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

import { Login } from './routes/Login';
import { Dashboard } from './routes/Dashboard';
import { Shoots } from './routes/Shoots';
import { ShootDetail } from './routes/ShootDetail';
import { Clients } from './routes/Clients';
import { ClientDetail } from './routes/ClientDetail';
import { Cameramen } from './routes/Cameramen';
import { CameramanDetail } from './routes/CameramanDetail';
import { Payments } from './routes/Payments';
import { Invoices } from './routes/Invoices';
import { Expenses } from './routes/Expenses';
import { Settings } from './routes/Settings';
import { PendingApprovals } from './routes/PendingApprovals';
import { RecycleBin } from './routes/RecycleBin';

import { ToastProvider } from './context/ToastContext';

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
          <DataProvider>
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
          </DataProvider>
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
