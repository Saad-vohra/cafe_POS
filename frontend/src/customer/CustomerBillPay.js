import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';
import axios from 'axios';

const CustomerBillPay = () => {
  const navigate = useNavigate();
  const { customer, tableNumber, fetchTableBill, processPayment } = useCustomer();

  const [billData, setBillData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReward, setSelectedReward] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('UPI'); // UPI, Card, Cash
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    loadBill();
  }, [customer, tableNumber]);

  const loadBill = async () => {
    try {
      setLoading(true);
      const data = await fetchTableBill();
      setBillData(data);
    } catch (err) {
      console.warn('Bill fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Base amounts
  const subtotal = billData?.subtotal || 507;
  const tax = billData?.tax || 25;
  const baseTotal = billData?.total || 532;

  // Calculate discount based on chosen reward
  let discountAmount = 0;
  if (selectedReward) {
    if (selectedReward.rewardId === 'DISCOUNT_20') {
      discountAmount = Math.round(subtotal * 0.20);
    } else if (selectedReward.rewardId === 'FREE_COFFEE') {
      discountAmount = 149; // standard coffee price waiver
    }
  }

  const finalTotal = Math.max(0, baseTotal - discountAmount);

  // Available rewards list
  const availableRewards = billData?.eligibleRewards || customer?.rewards?.filter(r => r.status === 'available') || [];

  const handleProceedToPayment = async () => {
    if (paymentMethod === 'UPI') {
      // Navigate to dedicated UPI QR Scan & Pay screen with pre-calculated amounts & reward
      navigate('/customer/upi-pay', {
        state: {
          billData,
          selectedReward,
          discountAmount,
          finalTotal,
          paymentMethod: 'UPI'
        }
      });
      return;
    }

    // Direct card / cash checkout
    setIsProcessing(true);
    setErrorMsg('');

    try {
      const result = await processPayment({
        paymentMethod,
        appliedRewardId: selectedReward?.rewardId || null,
        discountAmount,
        finalAmount: finalTotal,
        subtotal,
        tax
      });

      navigate('/customer/payment-success', {
        state: {
          result,
          finalTotal,
          paymentMethod,
          appliedReward: selectedReward
        }
      });
    } catch (err) {
      console.error('Payment error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to process payment. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="customer-page-content">
      {/* Table Session Summary Header */}
      <div style={{
        background: '#ffffff',
        borderRadius: 18,
        padding: '16px 18px',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        border: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--light-green)',
            color: 'var(--primary-green)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.1rem'
          }}>
            T{tableNumber || 5}
          </div>
          <div>
            <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.98rem' }}>
              Your Table Bill
            </div>
            <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
              Dine-In • {customer?.name || 'Saad Vohra'}
            </div>
          </div>
        </div>

        <button
          onClick={loadBill}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--primary-green)',
            fontWeight: 700,
            fontSize: '0.82rem',
            cursor: 'pointer'
          }}
        >
          🔄 Refresh
        </button>
      </div>

      {errorMsg && (
        <div style={{
          background: '#fee2e2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          padding: '10px 14px',
          borderRadius: 10,
          fontSize: '0.85rem',
          marginBottom: 16
        }}>
          {errorMsg}
        </div>
      )}

      {/* Bill Breakdown Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: '20px',
        boxShadow: 'var(--shadow-md)',
        marginBottom: 20,
        border: '1px solid #f1f5f9'
      }}>
        <h4 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b', marginBottom: 14 }}>
          Items Consumed
        </h4>

        {/* Consumed items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {(billData?.orders && billData.orders.length > 0
            ? billData.orders.flatMap(o => o.items)
            : [
                { name: 'Margherita Pizza', quantity: 1, price: 249, notes: 'Crispy crust' },
                { name: 'Coca Cola', quantity: 1, price: 79 },
                { name: 'Veg Burger', quantity: 1, price: 179 }
              ]
          ).map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
              <div>
                <span style={{ fontWeight: 600, color: '#1e293b' }}>{item.name}</span>
                <span style={{ color: '#64748b', marginLeft: 6 }}>×{item.quantity}</span>
                {item.notes && (
                  <div style={{ fontSize: '0.74rem', color: '#047857', fontWeight: 500 }}>
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
          borderTop: '1px solid #f1f5f9',
          paddingTop: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          fontSize: '0.88rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
            <span>Subtotal</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{subtotal}</span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
            <span>GST & Restaurant Tax</span>
            <span style={{ fontWeight: 600, color: '#1e293b' }}>₹{tax}</span>
          </div>

          {selectedReward && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              color: 'var(--primary-green)',
              fontWeight: 700,
              background: 'var(--light-green)',
              padding: '6px 10px',
              borderRadius: 8
            }}>
              <span>🎁 Reward Applied ({selectedReward.name})</span>
              <span>-₹{discountAmount}</span>
            </div>
          )}

          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: 10,
            marginTop: 6,
            borderTop: '1px solid #cbd5e1',
            fontSize: '1.2rem',
            fontWeight: 900
          }}>
            <span style={{ color: '#1e293b' }}>Final Total</span>
            <span style={{ color: 'var(--primary-green)' }}>₹{finalTotal}</span>
          </div>
        </div>
      </div>

      {/* 15. APPLY REWARD SECTION */}
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
            🎁 Available Rewards & Coupons
          </h4>
          {selectedReward && (
            <button
              onClick={() => setSelectedReward(null)}
              style={{
                background: 'none',
                border: 'none',
                color: '#ef4444',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              Remove
            </button>
          )}
        </div>

        {availableRewards.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {availableRewards.map((reward) => {
              const isSelected = selectedReward?.rewardId === reward.rewardId;

              return (
                <div
                  key={reward.rewardId}
                  onClick={() => setSelectedReward(isSelected ? null : reward)}
                  style={{
                    border: isSelected ? '2px solid var(--primary-green)' : '1px solid #e2e8f0',
                    background: isSelected ? 'var(--light-green)' : '#ffffff',
                    borderRadius: 14,
                    padding: '12px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 24 }}>
                      {reward.rewardId === 'FREE_COFFEE' ? '☕' : '🏷️'}
                    </span>
                    <div>
                      <div style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>
                        {reward.name}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {reward.description}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    border: isSelected ? '6px solid var(--primary-green)' : '2px solid #cbd5e1',
                    background: '#ffffff'
                  }}></div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{
            background: '#f8fafc',
            borderRadius: 12,
            padding: '12px',
            fontSize: '0.82rem',
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>🔒</span>
            <span>You have no unlocked rewards yet. Complete this visit to earn your next stamp!</span>
          </div>
        )}
      </div>

      {/* 16. PAYMENT METHOD SELECTOR */}
      <div style={{
        background: '#ffffff',
        borderRadius: 20,
        padding: '18px',
        boxShadow: 'var(--shadow-sm)',
        marginBottom: 24,
        border: '1px solid #f1f5f9'
      }}>
        <h4 style={{ fontSize: '0.98rem', fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>
          Choose Payment Method
        </h4>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {[
            { id: 'UPI', label: 'UPI QR', icon: '📱', desc: 'GPay/PhonePe' },
            { id: 'Card', label: 'Card', icon: '💳', desc: 'Debit/Credit' },
            { id: 'Cash', label: 'Cash', icon: '💵', desc: 'Pay at Counter' }
          ].map(method => {
            const isSelected = paymentMethod === method.id;

            return (
              <div
                key={method.id}
                onClick={() => setPaymentMethod(method.id)}
                style={{
                  border: isSelected ? '2px solid var(--primary-green)' : '1px solid #e2e8f0',
                  background: isSelected ? 'var(--light-green)' : '#f8fafc',
                  borderRadius: 14,
                  padding: '14px 8px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 4 }}>{method.icon}</div>
                <div style={{
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  color: isSelected ? 'var(--dark-green)' : '#1e293b'
                }}>
                  {method.label}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                  {method.desc}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Primary Pay Button */}
      <button
        className="btn-customer-primary"
        onClick={handleProceedToPayment}
        disabled={isProcessing}
        style={{
          boxShadow: '0 8px 24px rgba(8,127,69,0.35)',
          padding: '16px'
        }}
      >
        {isProcessing
          ? 'Processing Payment...'
          : paymentMethod === 'UPI'
          ? `Proceed to UPI Scan & Pay (₹${finalTotal}) →`
          : `Pay ₹${finalTotal} with ${paymentMethod} →`}
      </button>

      {/* Stamp Earn Notice */}
      <div style={{
        marginTop: 14,
        textAlign: 'center',
        fontSize: '0.78rem',
        color: 'var(--primary-green)',
        fontWeight: 700
      }}>
        ✨ Completing this bill payment awards +1 Stamp to your Loyalty Card!
      </div>
    </div>
  );
};

export default CustomerBillPay;
