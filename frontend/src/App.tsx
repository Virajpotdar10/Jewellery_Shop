import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Billing from './pages/Billing';
import Customers from './pages/Customers';
import Ledger from './pages/Ledger';
import Inventory from './pages/Inventory';
import Reports from './pages/Reports';
import Layout from './components/layout/Layout';
import { useAuthStore } from './store/authStore';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useAuthStore((state) => state.token);
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

function App() {
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
          <Route path="inventory" element={<Inventory />} />
          <Route path="reports" element={<Reports />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
