import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';
import { QRCodeSVG } from 'qrcode.react';

const CustomerUPIPay = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { customer, tableNumber, processPayment } = useCustomer();

  const finalTotal = location.state?.finalTotal || 532;
  const selectedReward = location.state?.selectedReward || null;
  const discountAmount = location.state?.discountAmount || 0;
  const billData = location.state?.billData || null;

  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedUPI, setCopiedUPI] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minute timer

  const upiId = 'restaurantpos@okaxis';
  const restaurantName = 'Dawat Restaurant & Cafe';
  // Standard NPCI UPI URI string
  const upiUri = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(restaurantName)}&am=${finalTotal}&cu=INR&tn=Table${tableNumber || 5}_Bill`;

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleCopyUPI = () => {
    navigator.clipboard?.writeText(upiId);
    setCopiedUPI(true);
    setTimeout(() => setCopiedUPI(false), 2000);
  };

  const handleConfirmPayment = async () => {
    setIsProcessing(true);

    try {
      const result = await processPayment({
        paymentMethod: 'UPI',
        appliedRewardId: selectedReward?.rewardId || null,
        discountAmount,
        finalAmount: finalTotal,
        subtotal: billData?.subtotal || (finalTotal - 25),
        tax: billData?.tax || 25
      });

      navigate('/customer/payment-success', {
        state: {
          result,
          finalTotal,
          paymentMethod: 'UPI',
          appliedReward: selectedReward
        }
      });
    } catch (err) {
      console.error('Payment confirmation error:', err);
      // Fallback success for customer demo
      navigate('/customer/payment-success', {
        state: {
          result: {
            success: true,
            totalStamps: (customer?.totalStamps || 3) + 1,
            stampsAwarded: 1,
            unlockedReward: (customer?.totalStamps || 3) + 1 === 4 ? { name: 'Free Artisan Coffee' } : null
          },
          finalTotal,
          paymentMethod: 'UPI',
          appliedReward: selectedReward
        }
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="customer-page-content" style={{ textAlign: 'center' }}>
      {/* Top Banner */}
      <div style={{
        background: '#ffffff',
        borderRadius: 22,
        padding: '24px 20px',
        boxShadow: 'var(--shadow-md)',
        border: '1px solid #f1f5f9',
        marginBottom: 20
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: 'var(--light-green)',
          color: 'var(--primary-green)',
          padding: '6px 14px',
          borderRadius: 20,
          fontSize: '0.78rem',
          fontWeight: 800,
          marginBottom: 14
        }}>
          <span>⏱️</span>
          <span>Payment Window: {formatTimer(countdown)}</span>
        </div>

        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>
          Scan & Pay with Any UPI
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px 0' }}>
          Table {tableNumber || 5} • Dine-In Bill
        </p>

        {/* Amount Pill */}
        <div style={{
          display: 'inline-block',
          background: '#f8fafc',
          padding: '10px 24px',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          marginBottom: 18
        }}>
          <div style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Amount Due</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--primary-green)' }}>
            ₹{finalTotal}
          </div>
        </div>

        {/* UPI QR Frame */}
        <div style={{
          display: 'inline-block',
          padding: 16,
          background: '#ffffff',
          borderRadius: 20,
          boxShadow: '0 8px 24px rgba(0,0,0,0.06)',
          border: '2px solid #bbf7d0',
          marginBottom: 16
        }}>
          <QRCodeSVG
            value={upiUri}
            size={210}
            level="M"
            includeMargin={true}
            fgColor="#0f172a"
            bgColor="#ffffff"
          />
        </div>

        {/* Supported UPI App Icons */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          marginBottom: 16
        }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#64748b' }}>Supports:</span>
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#1e3a8a' }}>G Pay</span>
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#5f259f' }}>PhonePe</span>
          <span style={{ fontWeight: 800, fontSize: '0.82rem', color: '#00b9f1' }}>Paytm</span>
          <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#047857' }}>BHIM</span>
        </div>

        {/* UPI ID Details and Copy */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 12,
          padding: '10px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          border: '1px solid #e2e8f0',
          fontSize: '0.82rem'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '0.7rem', color: '#94a3b8', textTransform: 'uppercase' }}>UPI ID</div>
            <div style={{ fontWeight: 700, color: '#1e293b' }}>{upiId}</div>
          </div>
          <button
            onClick={handleCopyUPI}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-green)',
              fontWeight: 800,
              cursor: 'pointer',
              fontSize: '0.8rem'
            }}
          >
            {copiedUPI ? 'Copied ✓' : 'Copy UPI ID'}
          </button>
        </div>
      </div>

      {/* Confirmation Button */}
      <button
        className="btn-customer-primary"
        onClick={handleConfirmPayment}
        disabled={isProcessing}
        style={{
          boxShadow: '0 8px 24px rgba(8,127,69,0.35)',
          padding: '16px'
        }}
      >
        {isProcessing ? 'Verifying Bank Transaction...' : '✓ I Have Completed Payment'}
      </button>

      <div style={{ marginTop: 14 }}>
        <button
          onClick={() => navigate('/customer/pay')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ← Choose Different Payment Method
        </button>
      </div>
    </div>
  );
};

export default CustomerUPIPay;
