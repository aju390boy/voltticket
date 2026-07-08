import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { EventPage } from './pages/EventPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { OrdersPage } from './pages/OrdersPage';
import { AdminDashboard } from './pages/AdminDashboard';
import { GoogleCallbackPage } from './pages/GoogleCallbackPage';
import { useAuthStore } from './stores/authStore';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
});

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}

// Hide navbar on auth pages
function Layout() {
  const location = useLocation();
  const hideNavbar = ['/login', '/register', '/auth/google/callback'].includes(location.pathname);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <main>
        <Routes>
          <Route path="/"                         element={<HomePage />} />
          <Route path="/events/:id"               element={<EventPage />} />
          <Route path="/login"                    element={<LoginPage />} />
          <Route path="/register"                 element={<RegisterPage />} />
          <Route path="/auth/google/callback"     element={<GoogleCallbackPage />} />
          <Route path="/orders"                   element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/orders/:id"               element={<ProtectedRoute><OrdersPage /></ProtectedRoute>} />
          <Route path="/admin"                    element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="*"                         element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Layout />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#FFFFFF',
              color: '#1A1509',
              border: '1px solid rgba(201,168,76,0.35)',
              borderRadius: 14,
              boxShadow: '0 8px 32px rgba(139,101,8,0.15), 0 2px 8px rgba(139,101,8,0.08)',
              fontSize: 14,
              fontWeight: 500,
              padding: '14px 18px',
            },
            success: {
              iconTheme: { primary: '#059669', secondary: '#F0FDF4' },
              style: { borderLeft: '4px solid #059669' },
            },
            error: {
              iconTheme: { primary: '#DC2626', secondary: '#FEF2F2' },
              style: { borderLeft: '4px solid #DC2626' },
            },
          }}
        />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
