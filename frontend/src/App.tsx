import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Customers from './pages/Customers';
import Ledger from './pages/Ledger';
import Reports from './pages/Reports';
import Layout from './components/layout/Layout';
import SplashScreen from './components/common/SplashScreen';
import { useAuthStore } from './store/authStore';
import { useEffect, useState } from 'react';

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
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }>
          <Route index element={<Dashboard />} />
          <Route path="billing" element={<Billing />} />
          <Route path="customers" element={<Customers />} />
          <Route path="ledger" element={<Ledger />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
