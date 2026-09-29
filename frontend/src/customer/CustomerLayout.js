import React from 'react';
import { Outlet, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';

export default function CustomerLayout() {
  const { customer, tableNumber, cartCount, cartSubtotal } = useCustomer();
  const navigate = useNavigate();
  const location = useLocation();

  // If customer is not logged in, redirect to login page preserving table query
  if (!customer) {
    return <Navigate to={`/customer?table=${tableNumber || 5}`} replace />;
  }

  const currentPath = location.pathname;

  const navItems = [
    { label: 'Home', path: '/customer/home', icon: '🏠' },
    { label: 'Menu', path: '/customer/menu', icon: '🍴' },
    { label: 'Rewards', path: '/customer/rewards', icon: '🎁' },
    { label: 'Profile', path: '/customer/profile', icon: '👤' }
  ];

  return (
    <div className="customer-viewport">
      <div className="customer-mobile-container">
        {/* Top Sticky Header */}
        <header className="cust-header">
          <div className="cust-header-user" onClick={() => navigate('/customer/profile')} style={{ cursor: 'pointer' }}>
            <div className="cust-avatar">
              {customer?.name?.charAt(0)?.toUpperCase() || 'C'}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#1A2E22' }}>
                Hi, {customer?.name?.split(' ')[0] || 'Guest'}
              </div>
              <div style={{ fontSize: 11, color: '#5A6E62' }}>
                {customer?.phone}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="cust-table-badge">
              <span>🪑</span> Table {tableNumber}
            </div>
            <button
              onClick={() => navigate('/customer/reward-qr')}
              title="My Reward QR"
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: '#EBF7EE',
                border: '1.5px solid #C7E3D0',
                color: '#087F45',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 16
              }}
            >
              📱
            </button>
          </div>
        </header>

        {/* Child Page Content */}
        <main style={{ flex: 1 }}>
          <Outlet />
        </main>

        {/* Floating Cart Pill when items are added (hidden when on /customer/cart or /customer/pay) */}
        {cartCount > 0 && !currentPath.includes('/cart') && !currentPath.includes('/pay') && (
          <div
            className="cust-cart-pill"
            onClick={() => navigate('/customer/cart')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 20 }}>🛒</span>
              <div>
                <div style={{ fontWeight: 800, fontSize: 14 }}>
                  {cartCount} item{cartCount > 1 ? 's' : ''} in cart
                </div>
                <div style={{ fontSize: 11, opacity: 0.9 }}>
                  Ready to send to kitchen
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 15 }}>
              <span>₹{cartSubtotal}</span>
              <span>→</span>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="cust-bottom-nav">
          {navItems.map(item => {
            const active = currentPath === item.path || (item.path === '/customer/home' && currentPath === '/customer');
            return (
              <button
                key={item.path}
                className={`cust-nav-item ${active ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <span className="icon">{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
