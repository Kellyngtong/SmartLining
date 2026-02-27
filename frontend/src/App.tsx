import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthStore } from './store/auth.store';
import { ProtectedRoute } from './components/ProtectedRoute';
import { LoginPage } from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { NotFoundPage } from './pages/NotFoundPage';
import JoinQueuePage from './pages/JoinQueuePage';
import TicketConfirmationPage from './pages/TicketConfirmationPage';
import AdminQRPage from './pages/AdminQRPage';
import OperatorPage from './pages/OperatorPage';
import RegisterQueuePage from './pages/RegisterQueuePage';
import PrivacyPolicy from './pages/PrivacyPolicy';

function App() {
  const { restoreSession } = useAuthStore();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes - Client flow */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/join-queue/:queueId" element={<JoinQueuePage />} />
        <Route path="/register/:queueId" element={<RegisterQueuePage />} />
        <Route path="/ticket-confirmation" element={<TicketConfirmationPage />} />
        <Route path="/privacy" element={<PrivacyPolicy />} />

        {/* Public routes - Authentication */}
        <Route path="/login" element={<LoginPage />} />

        {/* Protected routes - Admin/Worker */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/operator"
          element={
            <ProtectedRoute>
              <OperatorPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/qr"
          element={
            <ProtectedRoute>
              <AdminQRPage />
            </ProtectedRoute>
          }
        />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
