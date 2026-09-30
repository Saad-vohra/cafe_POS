import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useCustomer } from './CustomerContext';

const CustomerProfile = () => {
  const navigate = useNavigate();
  const { customer, tableNumber, logoutCustomer } = useCustomer();
  const [selectedPastOrder, setSelectedPastOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  const totalStamps = customer?.totalStamps || 0;
  const cardCycle = Math.floor(Math.max(0, totalStamps - 1) / 8) + 1;
  const currentStampsInCycle = totalStamps === 0 ? 0 : ((totalStamps - 1) % 8) + 1;

  // Fetch real dining orders for this customer from database
  useEffect(() => {
    const fetchOrders = async () => {
      const custId = customer?._id || customer?.customerId;
      if (!custId) {
        setLoadingOrders(false);
        return;
      }
      try {
        setLoadingOrders(true);
        const res = await axios.get(`/api/customers/${custId}/orders`);
        if (res.data?.orders) {
          setOrderHistory(res.data.orders);
        }
      } catch (err) {
        console.warn('Error fetching customer orders:', err.message);
      } finally {
        setLoadingOrders(false);
      }
    };

    fetchOrders();
  }, [customer?._id, customer?.customerId]);

  return (
    <div className="customer-page-content">
      {/* Profile Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 22,
        padding: '24px 20px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid #f1f5f9',
        textAlign: 'center',
        marginBottom: 20
      }}>
        {/* Avatar */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #087F45 0%, #10b981 100%)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          fontWeight: 800,
          margin: '0 auto 12px',
          boxShadow: '0 8px 20px rgba(8,127,69,0.25)'
        }}>
          {customer?.name ? customer.name.charAt(0).toUpperCase() : 'S'}
        </div>

        <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
          {customer?.name || 'Saad Vohra'}
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 12px 0' }}>
          {customer?.phone || '+91 98765 43210'}
        </p>

        {/* Current Table Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--light-green)',
          color: 'var(--primary-green)',
          padding: '6px 14px',
          borderRadius: 20,
          fontSize: '0.8rem',
          fontWeight: 700
        }}>
          <span>🪑</span>
          <span>Seated at Table {tableNumber || 5}</span>
        </div>
      </div>

      {/* Loyalty Stamp Overview Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: '18px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 20,
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
            🎁 Loyalty Progress
          </h4>
          <span style={{
            fontSize: '0.82rem',
            fontWeight: 800,
            color: 'var(--primary-green)'
          }}>
            {currentStampsInCycle} / 8 Stamps {cardCycle > 1 ? `(Card #${cardCycle})` : ''}
          </span>
        </div>

        {/* 8 stamp circles */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6, marginBottom: 14 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => {
            const isEarned = currentStampsInCycle >= s;
            const isRewardSlot = s === 4 || s === 8;

            return (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: 10,
                  background: isEarned
                    ? 'var(--primary-green)'
                    : isRewardSlot
                    ? '#fef3c7'
                    : '#f8fafc',
                  border: isEarned
                    ? '1.5px solid var(--primary-green)'
                    : isRewardSlot
                    ? '1.5px dashed #f59e0b'
                    : '1px dashed #cbd5e1',
                  color: isEarned ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: isEarned ? 14 : isRewardSlot ? 14 : 12,
                  fontWeight: 800
                }}
              >
                {isEarned ? '✓' : isRewardSlot ? (s === 4 ? '☕' : '🎁') : s}
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/customer/reward-qr')}
          style={{
            width: '100%',
            background: 'var(--light-green)',
            border: 'none',
            borderRadius: 12,
            padding: '10px',
            color: 'var(--primary-green)',
            fontWeight: 800,
            fontSize: '0.82rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8
          }}
        >
          <span>📱 Open My Unique Reward QR</span>
        </button>
      </div>

      {/* 22. ORDER HISTORY SECTION */}
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: '18px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 20,
        border: '1px solid #f1f5f9'
      }}>
        <h4 style={{ fontSize: '1.02rem', fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>
          Previous Dining Orders
        </h4>

        {loadingOrders ? (
          <div style={{ textAlign: 'center', padding: '24px 16px', color: '#64748b', fontSize: '0.85rem' }}>
            Loading your dining orders...
          </div>
        ) : orderHistory.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '28px 16px',
            background: '#f8fafc',
            borderRadius: 14,
            border: '1px dashed #cbd5e1'
          }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🍽️</div>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: '0.92rem', marginBottom: 4 }}>
              No Dining Orders Yet
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 14 }}>
              Your order history will appear here once you place and enjoy your meals.
            </div>
            <button
              onClick={() => navigate('/customer/menu')}
              style={{
                background: 'var(--primary-green)',
                color: '#ffffff',
                border: 'none',
                padding: '8px 18px',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: '0.8rem',
                cursor: 'pointer'
              }}
            >
              Browse Menu & Order
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {orderHistory.map((order) => (
              <div
                key={order.id}
                onClick={() => setSelectedPastOrder(order)}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: '#fafafa'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.95rem' }}>
                      Order #{order.id}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      {order.date} • Table {order.table}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 800, color: 'var(--primary-green)', fontSize: '0.95rem' }}>
                      ₹{order.amount}
                    </div>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: order.status === 'Paid' ? '#059669' : '#0284c7',
                      background: order.status === 'Paid' ? '#d1fae5' : '#e0f2fe',
                      padding: '2px 8px',
                      borderRadius: 10
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                  {order.items && order.items.length > 0
                    ? order.items.map(it => `${it.name} (×${it.qty})`).join(', ')
                    : 'Order details placed'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Switch Profile / Logout */}
      <button
        onClick={logoutCustomer}
        style={{
          width: '100%',
          background: '#fee2e2',
          border: 'none',
          borderRadius: 14,
          padding: '14px',
          color: '#b91c1c',
          fontWeight: 700,
          fontSize: '0.88rem',
          cursor: 'pointer'
        }}
      >
        Sign Out / Change Mobile Number
      </button>

      {/* Past Order Receipt Modal */}
      {selectedPastOrder && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: 20,
            width: '100%',
            maxWidth: 380,
            padding: 22,
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h4 style={{ fontWeight: 800, margin: 0, color: '#1e293b' }}>
                Order #{selectedPastOrder.id}
              </h4>
              <button
                onClick={() => setSelectedPastOrder(null)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', marginBottom: 14 }}>
              {selectedPastOrder.date} • Table {selectedPastOrder.table} • Paid via {selectedPastOrder.paymentMethod}
            </div>

            <div style={{ borderTop: '1px solid #f1f5f9', borderBottom: '1px solid #f1f5f9', padding: '12px 0', marginBottom: 12 }}>
              {selectedPastOrder.items.map((it, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: 6 }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{it.name}</span>
                    <span style={{ color: '#64748b', marginLeft: 6 }}>×{it.qty}</span>
                    {it.notes && (
                      <div style={{ fontSize: '0.72rem', color: '#047857' }}>📝 {it.notes}</div>
                    )}
                  </div>
                  <div style={{ fontWeight: 700 }}>₹{it.price * it.qty}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', marginBottom: 16 }}>
              <span>Total Paid</span>
              <span style={{ color: 'var(--primary-green)' }}>₹{selectedPastOrder.amount}</span>
            </div>

            <button
              className="btn-customer-primary"
              onClick={() => setSelectedPastOrder(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;
