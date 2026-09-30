import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';

const CustomerPaymentSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, tableNumber } = useCustomer();

  const [showReceipt, setShowReceipt] = useState(false);

  const finalTotal = location.state?.finalTotal || 532;
  const paymentMethod = location.state?.paymentMethod || 'UPI';
  const appliedReward = location.state?.appliedReward || null;
  const paymentResult = location.state?.result || null;

  // New stamp count after payment
  const currentStamps = customer?.totalStamps || 4;
  const isCoffeeUnlocked = currentStamps >= 4;
  const is20OffUnlocked = currentStamps >= 8;

  const orderNumber = 'TJ' + Math.floor(1000 + Math.random() * 9000);
  const now = new Date();

  return (
    <div className="customer-page-content" style={{ textAlign: 'center' }}>
      {/* Success Badge */}
      <div style={{
        background: '#ffffff',
        borderRadius: 24,
        padding: '32px 20px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid #f1f5f9',
        marginBottom: 20
      }}>
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: 'var(--light-green)',
          color: 'var(--primary-green)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 36,
          fontWeight: 900,
          margin: '0 auto 16px',
          border: '3px solid #86efac',
          boxShadow: '0 8px 20px rgba(8, 127, 69, 0.2)'
        }}>
          ✓
        </div>

        <h2 style={{ fontSize: '1.45rem', fontWeight: 900, color: '#1e293b', marginBottom: 6 }}>
          Payment Successful!
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.92rem', margin: '0 0 20px 0' }}>
          Your bill has been paid. Thank you for dining with us!
        </p>

        {/* Payment Summary Box */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: '16px',
          border: '1px solid #e2e8f0',
          textAlign: 'left',
          marginBottom: 20
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>Order Number</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>#{orderNumber}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>Table Number</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>Table {tableNumber || 5}</span>
          </div>

          {appliedReward && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem', color: 'var(--primary-green)' }}>
              <span>{(appliedReward.rewardType === 'free_item' || appliedReward.title?.toLowerCase().includes('coffee') || appliedReward.rewardId?.includes('coffee')) ? 'Complimentary Gift' : 'Reward Discount'}</span>
              <span style={{ fontWeight: 700 }}>
                {(appliedReward.rewardType === 'free_item' || appliedReward.title?.toLowerCase().includes('coffee') || appliedReward.rewardId?.includes('coffee'))
                  ? `☕ ${appliedReward.title || appliedReward.name || 'Free Coffee'} (FREE)`
                  : `🎁 ${appliedReward.title || appliedReward.name || '20% OFF'}`}
              </span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>Amount Paid</span>
            <span style={{ fontWeight: 800, color: 'var(--primary-green)', fontSize: '1rem' }}>₹{finalTotal}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>Payment Method</span>
            <span style={{ fontWeight: 700, color: '#1e293b' }}>{paymentMethod}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
            <span style={{ color: '#64748b' }}>Date & Time</span>
            <span style={{ fontWeight: 600, color: '#64748b' }}>
              {now.toLocaleDateString()} • {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>

        {/* 18. STAMP AWARDED CELEBRATION */}
        <div style={{
          background: 'linear-gradient(135deg, #087F45 0%, #0d9488 100%)',
          borderRadius: 18,
          padding: '18px',
          color: '#ffffff',
          textAlign: 'center',
          boxShadow: '0 6px 20px rgba(8,127,69,0.25)',
          marginBottom: 16
        }}>
          <div style={{ fontSize: 24, marginBottom: 4 }}>🎉</div>
          <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 4 }}>
            +1 Loyalty Stamp Earned!
          </div>
          <div style={{ fontSize: '0.82rem', opacity: 0.92, marginBottom: 12 }}>
            Your total stamp count is now <strong>{currentStamps} / 8</strong>
          </div>

          {/* Stamp circles */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 10 }}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((s) => (
              <div
                key={s}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: s <= currentStamps ? '#ffffff' : 'rgba(255,255,255,0.2)',
                  color: s <= currentStamps ? 'var(--primary-green)' : '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 900,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {s <= currentStamps ? '✓' : s}
              </div>
            ))}
          </div>

          {/* Milestone unlocked banner */}
          {currentStamps === 4 && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: '0.82rem',
              fontWeight: 800
            }}>
              ☕ FREE Coffee Unlocked for your next visit!
            </div>
          )}

          {currentStamps >= 8 && (
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: '0.82rem',
              fontWeight: 800
            }}>
              🏷️ 20% OFF Entire Bill Unlocked!
            </div>
          )}
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <button
            className="btn-customer-secondary"
            onClick={() => setShowReceipt(true)}
          >
            📄 View Full Receipt
          </button>

          <button
            className="btn-customer-primary"
            onClick={() => navigate('/customer/home')}
          >
            Back to Home 🏠
          </button>
        </div>
      </div>

      {/* Modal: Full Receipt */}
      {showReceipt && (
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
            padding: 24,
            textAlign: 'left',
            boxShadow: '0 20px 40px rgba(0,0,0,0.2)'
          }}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary-green)' }}>
                DAWAT RESTAURANT
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                Tax Invoice / Receipt
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #cbd5e1', borderBottom: '1px dashed #cbd5e1', padding: '12px 0', margin: '12px 0', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Invoice No:</span>
                <span style={{ fontWeight: 700 }}>#{orderNumber}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Customer:</span>
                <span style={{ fontWeight: 700 }}>{customer?.name || 'Saad Vohra'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: '#64748b' }}>Table:</span>
                <span style={{ fontWeight: 700 }}>Table {tableNumber || 5}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Payment Mode:</span>
                <span style={{ fontWeight: 700 }}>{paymentMethod}</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1rem', marginTop: 12 }}>
              <span>Total Paid</span>
              <span style={{ color: 'var(--primary-green)' }}>₹{finalTotal}</span>
            </div>

            <button
              onClick={() => setShowReceipt(false)}
              className="btn-customer-primary"
              style={{ marginTop: 20 }}
            >
              Close Receipt
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerPaymentSuccess;
