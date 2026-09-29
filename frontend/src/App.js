import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminLayout from './pages/admin/AdminLayout';
import WaiterLayout from './pages/waiter/WaiterLayout';
import KitchenLayout from './pages/kitchen/KitchenLayout';
import './index.css';

// Customer Ordering & Loyalty App
import { CustomerProvider } from './customer/CustomerContext';
import CustomerLogin from './customer/CustomerLogin';
import CustomerLayout from './customer/CustomerLayout';
import CustomerHome from './customer/CustomerHome';
import CustomerMenu from './customer/CustomerMenu';
import CustomerCart from './customer/CustomerCart';
import CustomerOrderStatus from './customer/CustomerOrderStatus';
import CustomerRewards from './customer/CustomerRewards';
import CustomerRewardQR from './customer/CustomerRewardQR';
import CustomerBillPay from './customer/CustomerBillPay';
import CustomerUPIPay from './customer/CustomerUPIPay';
import CustomerPaymentSuccess from './customer/CustomerPaymentSuccess';
import CustomerProfile from './customer/CustomerProfile';

function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-center"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      {/* Customer Mobile Ordering & Loyalty Portal (Table QR Entry) */}
      <Route
        path="/customer/*"
        element={
          <CustomerProvider>
            <Routes>
              <Route index element={<CustomerLogin />} />
              <Route element={<CustomerLayout />}>
                <Route path="home" element={<CustomerHome />} />
                <Route path="menu" element={<CustomerMenu />} />
                <Route path="cart" element={<CustomerCart />} />
                <Route path="order-status" element={<CustomerOrderStatus />} />
                <Route path="rewards" element={<CustomerRewards />} />
                <Route path="reward-qr" element={<CustomerRewardQR />} />
                <Route path="pay" element={<CustomerBillPay />} />
                <Route path="upi-pay" element={<CustomerUPIPay />} />
                <Route path="payment-success" element={<CustomerPaymentSuccess />} />
                <Route path="profile" element={<CustomerProfile />} />
                <Route path="*" element={<Navigate to="/customer/home" />} />
              </Route>
            </Routes>
          </CustomerProvider>
        }
      />

      {/* Staff & Admin Routes */}
      <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
      <Route path="/admin/*" element={
        <ProtectedRoute roles={['admin']}>
          <AdminLayout />
        </ProtectedRoute>
      } />
      <Route path="/waiter/*" element={
        <ProtectedRoute roles={['waiter', 'admin']}>
          <WaiterLayout />
        </ProtectedRoute>
      } />
      <Route path="/kitchen/*" element={
        <ProtectedRoute roles={['kitchen', 'admin']}>
          <KitchenLayout />
        </ProtectedRoute>
      } />
      <Route path="/" element={
        <ProtectedRoute>
          {user?.role === 'admin' ? <Navigate to="/admin/dashboard" /> :
           user?.role === 'waiter' ? <Navigate to="/waiter/tables" /> :
           <Navigate to="/kitchen/orders" />}
        </ProtectedRoute>
      } />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style: { fontSize: '0.875rem', borderRadius: '8px' },
          success: { iconTheme: { primary: '#48BB78', secondary: 'white' } },
          error: { iconTheme: { primary: '#E53E3E', secondary: 'white' } }
        }} />
      </Router>
    </AuthProvider>
  );
}
