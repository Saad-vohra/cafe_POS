import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';
import { QRCodeSVG } from 'qrcode.react';

const CustomerRewardQR = () => {
  const navigate = useNavigate();
  const { customer, tableNumber } = useCustomer();
  const [copied, setCopied] = useState(false);

  // The QR value encodes the secure rewardToken lookup URL or raw token
  const rewardToken = customer?.rewardToken || 'REW_SECURE_TOKEN_DEMO';
  const qrScanPayload = window.location.origin + `/admin/scan-qr?token=${encodeURIComponent(rewardToken)}`;

  const handleCopyToken = () => {
    navigator.clipboard?.writeText(rewardToken);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="customer-page-content" style={{ textAlign: 'center' }}>
      {/* Top Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 24,
        padding: '28px 20px',
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
          marginBottom: 16
        }}>
          <span>🎁</span>
          <span>Official Customer Reward QR</span>
        </div>

        <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>
          {customer?.name || 'Customer'}
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.88rem', margin: '0 0 20px 0' }}>
          {customer?.phone || '+91 98765 43210'} • ID: {customer?.customerId || 'CUS_10045'}
        </p>

        {/* Large Crisp QR Code Frame */}
        <div style={{
          display: 'inline-block',
          padding: 20,
          background: '#ffffff',
          borderRadius: 24,
          boxShadow: '0 10px 25px rgba(8, 127, 69, 0.12)',
          border: '2px solid #bbf7d0',
          marginBottom: 20
        }}>
          <QRCodeSVG
            value={qrScanPayload}
            size={220}
            level="H"
            includeMargin={true}
            fgColor="#087F45"
            bgColor="#ffffff"
          />
        </div>

        {/* Informational Guidance for Customer and Waiter */}
        <div style={{
          background: '#f8fafc',
          borderRadius: 16,
          padding: '16px',
          border: '1px solid #e2e8f0',
          textAlign: 'left',
          marginBottom: 16
        }}>
          <div style={{
            fontSize: '0.88rem',
            fontWeight: 800,
            color: '#1e293b',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: 6
          }}>
            <span>📱</span>
            <span>Show this QR code to restaurant staff</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.4 }}>
            Staff or waiters can scan this QR using the restaurant terminal to add your earned reward stamps or redeem unlocked offers.
          </div>
        </div>

        {/* Secure Token Display & Copy */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f1f5f9',
          borderRadius: 12,
          padding: '8px 12px',
          fontSize: '0.78rem'
        }}>
          <div style={{ color: '#64748b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 220 }}>
            Token: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155' }}>{rewardToken}</span>
          </div>
          <button
            onClick={handleCopyToken}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--primary-green)',
              fontWeight: 700,
              cursor: 'pointer',
              fontSize: '0.76rem'
            }}
          >
            {copied ? 'Copied ✓' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <button
        className="btn-customer-primary"
        onClick={() => navigate('/customer/rewards')}
      >
        View Stamp Progress ({customer?.totalStamps || 3}/8) →
      </button>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => navigate('/customer/home')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          ← Back to Home
        </button>
      </div>
    </div>
  );
};

export default CustomerRewardQR;
