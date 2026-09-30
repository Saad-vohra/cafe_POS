import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';
import axios from 'axios';

const STATUS_STEPS = [
  { key: 'placed', label: 'Order Received', icon: '📝', desc: 'Received by kitchen counter' },
  { key: 'preparing', label: 'Preparing', icon: '👨‍🍳', desc: 'Freshly cooking your food' },
  { key: 'ready', label: 'Ready', icon: '🔔', desc: 'Ready for table delivery' },
  { key: 'served', label: 'Served', icon: '🍽️', desc: 'Enjoy your delicious meal!' }
];

const getStepIndex = (status) => {
  const norm = (status || '').toLowerCase();
  if (norm === 'served' || norm === 'completed') return 3;
  if (norm === 'ready') return 2;
  if (norm === 'preparing' || norm === 'cooking') return 1;
  return 0; // placed / order received
};

const CustomerOrderStatus = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, tableNumber, activeOrders, fetchTableBill } = useCustomer();

  // Pick order from route state or first active order from context
  const [justPlaced, setJustPlaced] = useState(Boolean(location.state?.justPlaced));
  const [currentOrder, setCurrentOrder] = useState(
    location.state?.order || (activeOrders && activeOrders.length > 0 ? activeOrders[0] : null)
  );

  // Poll or refresh order status
  useEffect(() => {
    if (activeOrders && activeOrders.length > 0) {
      setCurrentOrder(activeOrders[0]);
    }
  }, [activeOrders]);

  const currentStep = getStepIndex(currentOrder?.status);

  if (!currentOrder) {
    return (
      <div className="customer-page-content" style={{ textAlign: 'center', padding: '60px 20px' }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: '#EBF7EE',
          color: '#087F45',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 38,
          margin: '0 auto 16px'
        }}>
          👨‍🍳
        </div>
        <h3 style={{ fontSize: '1.35rem', fontWeight: 900, color: '#1A2E22', marginBottom: 8 }}>
          No Active Order Yet
        </h3>
        <p style={{ color: '#64748B', fontSize: '0.9rem', maxWidth: 340, margin: '0 auto 20px', lineHeight: 1.4 }}>
          You have no ongoing kitchen orders for Table {tableNumber || 5}. Browse our menu and order your favorite dishes!
        </p>
        <button
          onClick={() => navigate('/customer/menu')}
          className="btn-customer-primary"
          style={{ width: 'auto', padding: '12px 28px' }}
        >
          🍽️ Browse Menu
        </button>
      </div>
    );
  }

  const orderItemsTotal = currentOrder?.items?.reduce((sum, it) => sum + ((it.price || 0) * (it.quantity || 1)), 0) || currentOrder?.totalAmount || 0;

  return (
    <div className="customer-page-content">
      {/* If just placed, show celebration banner */}
      {justPlaced && (
        <div style={{
          background: 'linear-gradient(135deg, #087F45 0%, #0d9488 100%)',
          borderRadius: 20,
          padding: '24px 20px',
          color: '#ffffff',
          textAlign: 'center',
          boxShadow: '0 8px 24px rgba(8,127,69,0.3)',
          marginBottom: 20
        }}>
          <div style={{
            width: 54,
            height: 54,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 28,
            margin: '0 auto 12px',
            border: '2px solid rgba(255,255,255,0.4)'
          }}>
            ✓
          </div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, marginBottom: 6 }}>
            Order Sent to Kitchen!
          </h2>
          <p style={{ fontSize: '0.88rem', opacity: 0.9, lineHeight: 1.4, margin: 0 }}>
            Your order has been placed successfully. The kitchen will start preparing it soon.
          </p>
          <button
            onClick={() => setJustPlaced(false)}
            style={{
              marginTop: 14,
              background: '#ffffff',
              color: 'var(--primary-green)',
              border: 'none',
              padding: '7px 16px',
              borderRadius: 20,
              fontSize: '0.78rem',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Track Live Status ↓
          </button>
        </div>
      )}

      {/* Main Order Status Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: '20px',
        boxShadow: 'var(--shadow-md)',
        marginBottom: 20,
        border: '1px solid #f1f5f9'
      }}>
        {/* Order Header Info */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          borderBottom: '1px solid #f1f5f9',
          paddingBottom: 14,
          marginBottom: 20
        }}>
          <div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Order Reference
            </div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#1e293b' }}>
              #{currentOrder?.orderNumber || (currentOrder?._id ? currentOrder._id.slice(-6).toUpperCase() : 'ORD')}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>
              Table {tableNumber || currentOrder?.tableNumber || 5} • {new Date(currentOrder?.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          <div style={{
            background: 'var(--light-green)',
            color: 'var(--primary-green)',
            padding: '6px 12px',
            borderRadius: 20,
            fontSize: '0.78rem',
            fontWeight: 800,
            textTransform: 'uppercase'
          }}>
            {STATUS_STEPS[currentStep].label}
          </div>
        </div>

        {/* Live Timeline Tracker */}
        <div style={{ marginBottom: 24 }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', marginBottom: 16 }}>
            Live Kitchen Progress
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, position: 'relative' }}>
            {/* Vertical connector line */}
            <div style={{
              position: 'absolute',
              left: 17,
              top: 14,
              bottom: 14,
              width: 2,
              background: '#e2e8f0',
              zIndex: 1
            }}>
              <div style={{
                height: `${(currentStep / (STATUS_STEPS.length - 1)) * 100}%`,
                width: '100%',
                background: 'var(--primary-green)',
                transition: 'height 0.5s ease'
              }}></div>
            </div>

            {STATUS_STEPS.map((step, idx) => {
              const isPast = idx < currentStep;
              const isCurrent = idx === currentStep;
              const isFuture = idx > currentStep;

              return (
                <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, zIndex: 2 }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: isCurrent ? 'var(--primary-green)' : isPast ? '#10b981' : '#ffffff',
                    border: isFuture ? '2px solid #cbd5e1' : '2px solid transparent',
                    color: isFuture ? '#94a3b8' : '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 800,
                    boxShadow: isCurrent ? '0 0 0 4px rgba(8, 127, 69, 0.2)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    {isPast ? '✓' : step.icon}
                  </div>

                  <div style={{ flex: 1, paddingTop: 2 }}>
                    <div style={{
                      fontWeight: isCurrent ? 800 : 600,
                      color: isCurrent ? 'var(--primary-green)' : isPast ? '#1e293b' : '#94a3b8',
                      fontSize: '0.92rem'
                    }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 1 }}>
                      {step.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ordered Items List */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 14,
          padding: 14,
          border: '1px solid #e2e8f0'
        }}>
          <div style={{
            fontSize: '0.82rem',
            fontWeight: 700,
            color: '#64748b',
            textTransform: 'uppercase',
            marginBottom: 10
          }}>
            Items in this order ({currentOrder?.items?.length || 0})
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(currentOrder?.items || []).map((item, idx) => (
              <div key={idx} style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.88rem',
                borderBottom: idx !== (currentOrder?.items?.length - 1) ? '1px dashed #e2e8f0' : 'none',
                paddingBottom: 6
              }}>
                <div>
                  <span style={{ fontWeight: 700, color: '#1e293b' }}>
                    {item.name || item.menu?.name}
                  </span>
                  <span style={{ color: '#64748b', marginLeft: 6 }}>×{item.quantity}</span>
                  {item.batchNumber > 1 && (
                    <span style={{ fontSize: '0.72rem', background: '#DBEAFE', color: '#1E40AF', padding: '1px 6px', borderRadius: 4, marginLeft: 6, fontWeight: 700 }}>
                      Round #{item.batchNumber}
                    </span>
                  )}
                  {item.notes && (
                    <div style={{ fontSize: '0.75rem', color: '#047857', fontWeight: 500, marginTop: 2 }}>
                      📝 {item.notes}
                    </div>
                  )}
                </div>
                <div style={{ fontWeight: 700, color: '#1e293b' }}>
                  ₹{(item.price || 0) * (item.quantity || 1)}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 10,
            paddingTop: 10,
            borderTop: '1px solid #cbd5e1',
            fontWeight: 800,
            fontSize: '0.95rem'
          }}>
            <span>Order Total</span>
            <span style={{ color: 'var(--primary-green)' }}>
              ₹{orderItemsTotal}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: Add More Items OR Pay Bill */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button
          className="btn-customer-primary"
          onClick={() => navigate('/customer/pay')}
          style={{
            background: 'linear-gradient(135deg, #087F45 0%, #0d9488 100%)',
            boxShadow: '0 6px 18px rgba(8,127,69,0.3)'
          }}
        >
          Pay Bill / Settle Table 💳
        </button>

        <button
          className="btn-customer-secondary"
          onClick={() => navigate('/customer/menu')}
        >
          🍴 Order More Food
        </button>
      </div>
    </div>
  );
};

export default CustomerOrderStatus;
