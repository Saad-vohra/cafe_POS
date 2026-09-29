import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useCustomer } from './CustomerContext';
import toast from 'react-hot-toast';

export default function CustomerLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginCustomer, tableNumber, setTableNumber } = useCustomer();

  const urlTable = searchParams.get('table');
  const initialTable = urlTable ? parseInt(urlTable, 10) : (tableNumber || 5);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      toast.error('Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await loginCustomer(name.trim(), phone.trim(), initialTable);
      toast.success(`Welcome to Table ${initialTable}, ${name.trim()}! 👋`, {
        icon: '🍽️',
        duration: 3500
      });
      navigate('/customer/home');
    } catch (err) {
      // Error is handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-viewport" style={{
      background: 'linear-gradient(rgba(10, 35, 20, 0.72), rgba(8, 50, 25, 0.85)), url(https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&auto=format&fit=crop&q=80) center/cover no-repeat',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px 16px'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 420,
        background: 'rgba(255, 255, 255, 0.98)',
        borderRadius: 24,
        padding: '32px 26px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
        backdropFilter: 'blur(10px)',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Table badge header */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          background: '#EBF7EE',
          border: '1.5px solid #C7E3D0',
          color: '#087F45',
          fontWeight: 800,
          fontSize: 13,
          padding: '6px 14px',
          borderRadius: 20,
          marginBottom: 16
        }}>
          <span>🪑</span> Table {initialTable}
        </div>

        {/* Restaurant brand logo */}
        <div style={{
          width: 64,
          height: 64,
          margin: '0 auto 12px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #087F45 0%, #055C31 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 30,
          color: 'white',
          boxShadow: '0 8px 20px rgba(8, 127, 69, 0.3)'
        }}>
          🍽️
        </div>

        <h1 style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '1.85rem',
          fontWeight: 800,
          color: '#1A2E22',
          marginBottom: 6
        }}>
          Welcome!
        </h1>
        <p style={{
          fontSize: '0.92rem',
          color: '#5A6E62',
          marginBottom: 24
        }}>
          Enter your details to explore the menu and earn loyalty stamps
        </p>

        <form onSubmit={handleSubmit} style={{ textAlign: 'left' }}>
          <div style={{ marginBottom: 16 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#2D3748',
              marginBottom: 6
            }}>
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Saad Vohra"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={loading}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: 12,
                border: '1.5px solid #CBD5E0',
                fontSize: 15,
                outline: 'none',
                transition: 'all 0.2s',
                background: '#F8FAF9'
              }}
              onFocus={e => { e.target.style.borderColor = '#087F45'; e.target.style.background = '#FFFFFF'; }}
              onBlur={e => { e.target.style.borderColor = '#CBD5E0'; e.target.style.background = '#F8FAF9'; }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: 700,
              color: '#2D3748',
              marginBottom: 6
            }}>
              Phone Number
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                fontSize: 14,
                fontWeight: 600,
                color: '#718096'
              }}>
                +91
              </span>
              <input
                type="tel"
                placeholder="98765 43210"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '12px 16px 12px 50px',
                  borderRadius: 12,
                  border: '1.5px solid #CBD5E0',
                  fontSize: 15,
                  outline: 'none',
                  transition: 'all 0.2s',
                  background: '#F8FAF9'
                }}
                onFocus={e => { e.target.style.borderColor = '#087F45'; e.target.style.background = '#FFFFFF'; }}
                onBlur={e => { e.target.style.borderColor = '#CBD5E0'; e.target.style.background = '#F8FAF9'; }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #087F45 0%, #055C31 100%)',
              color: 'white',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 20px rgba(8, 127, 69, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'transform 0.15s, box-shadow 0.15s'
            }}
          >
            {loading ? 'Setting up your table...' : 'Continue →'}
          </button>
        </form>

        <p style={{
          fontSize: 11,
          color: '#718096',
          marginTop: 18,
          lineHeight: 1.4
        }}>
          By continuing, you agree to our Terms & Privacy.<br />
          🎁 Earn a free stamp with every dining visit!
        </p>
      </div>
    </div>
  );
}
