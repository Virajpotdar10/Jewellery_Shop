import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';

import Login from './pages/Login';
import Layout from './components/layout/Layout';
import SplashScreen from './components/common/SplashScreen';
import { useAuthStore } from './store/authStore';

// Lazy loaded routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Billing = lazy(() => import('./pages/Billing'));
const Ledger = lazy(() => import('./pages/Ledger'));
const Reports = lazy(() => import('./pages/Reports'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  if (!isHydrated) return <SplashScreen />;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    if (isHydrated) {
      // Small delay for smooth transition even if hydration is instant
      const timer = setTimeout(() => setShowSplash(false), 1200);
      return () => clearTimeout(timer);
    }
  }, [isHydrated]);

  if (showSplash) return <SplashScreen />;

  return (
    <Router>
      <Suspense fallback={<SplashScreen />}>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            <Route index element={<Dashboard />} />
            <Route path="billing" element={<Billing />} />
            <Route path="ledger" element={<Ledger />} />
            <Route path="reports" element={<Reports />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
