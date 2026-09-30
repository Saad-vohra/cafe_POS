import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';

export default function CustomerHome() {
  const { customer, tableNumber, activeOrder, refreshCustomer } = useCustomer();
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof refreshCustomer === 'function') {
      refreshCustomer();
    }
  }, []);

  const totalStamps = customer?.totalStamps || 0;

  // Calculate next reward milestone
  // Target 1: 4 stamps = Free Coffee
  // Target 2: 8 stamps = 20% OFF
  let nextRewardTitle = 'Free Coffee';
  let targetStamps = 4;
  let remainingStamps = Math.max(0, 4 - totalStamps);
  let milestoneUnlocked = false;

  if (totalStamps < 4) {
    nextRewardTitle = 'FREE Coffee';
    targetStamps = 4;
    remainingStamps = 4 - totalStamps;
  } else if (totalStamps === 4) {
    nextRewardTitle = 'FREE Coffee';
    targetStamps = 4;
    remainingStamps = 0;
    milestoneUnlocked = true;
  } else if (totalStamps < 8) {
    nextRewardTitle = '20% OFF';
    targetStamps = 8;
    remainingStamps = 8 - totalStamps;
  } else {
    nextRewardTitle = '20% OFF';
    targetStamps = 8;
    remainingStamps = 0;
    milestoneUnlocked = true;
  }

  // Stamp indicators for the active milestone
  const stampSlots = Array.from({ length: targetStamps }, (_, i) => i + 1);

  return (
    <div>
      {/* Hero Banner */}
      <div className="cust-hero">
        <span style={{
          display: 'inline-block',
          background: 'rgba(255, 255, 255, 0.18)',
          padding: '4px 12px',
          borderRadius: 20,
          fontSize: 12,
          fontWeight: 700,
          marginBottom: 8
        }}>
          🌿 Smart Dining & Loyalty
        </span>
        <h1>Good Food<br />Brings People Together</h1>
        <p>Order your favorite dishes or check your rewards.</p>
      </div>

      {/* Prominent Loyalty Stamp Card on Home Page */}
      <div className="cust-reward-card" onClick={() => navigate('/customer/rewards')}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 800, fontSize: 14, color: '#087F45' }}>
              <span>🎁</span>
              <span>{milestoneUnlocked ? 'Reward Unlocked!' : 'Next Reward Progress'}</span>
            </div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', color: '#1A2E22', marginTop: 2 }}>
              {milestoneUnlocked ? `🎉 ${nextRewardTitle} Unlocked!` : `Collect ${targetStamps} Stamps → Get a ${nextRewardTitle}`}
            </div>
          </div>
          <span style={{
            background: milestoneUnlocked ? '#FEF3C7' : '#EBF7EE',
            color: milestoneUnlocked ? '#B45309' : '#087F45',
            fontSize: 12,
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 20
          }}>
            {totalStamps} / {targetStamps} Stamps
          </span>
        </div>

        {/* Visual Stamp Bubbles */}
        <div className="stamp-progress-row">
          {stampSlots.map(num => {
            const isStamped = num <= totalStamps;
            const isMilestone = num === targetStamps;
            return (
              <div
                key={num}
                className={`stamp-bubble ${isStamped ? 'filled' : ''} ${isMilestone ? 'milestone' : ''}`}
              >
                {isStamped ? (isMilestone ? '🎁' : '✓') : (isMilestone ? '🎁' : num)}
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
          <span style={{ fontSize: 12, color: '#5A6E62', fontWeight: 600 }}>
            {remainingStamps > 0
              ? `🔥 ${remainingStamps} more stamp${remainingStamps > 1 ? 's' : ''} to unlock your ${nextRewardTitle}!`
              : totalStamps === 4
                ? 'Next: Collect 8 stamps → Get 20% OFF'
                : 'All milestone rewards ready to redeem!'}
          </span>
          <span style={{ fontSize: 12, color: '#087F45', fontWeight: 700 }}>
            View Stamps →
          </span>
        </div>
      </div>

      {/* Active Order Alert Bar (if customer has placed an order) */}
      {activeOrder && (
        <div
          onClick={() => navigate('/customer/order-status')}
          style={{
            margin: '0 18px 18px',
            background: '#F0FFF4',
            border: '1.5px solid #9AE6B4',
            borderRadius: 16,
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(8, 127, 69, 0.08)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>
              {activeOrder.status === 'ready' ? '🔔' : activeOrder.status === 'preparing' ? '🍳' : '📋'}
            </span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#276749' }}>
                Order #{activeOrder.orderNumber} is {activeOrder.status.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: '#4A5568' }}>
                {activeOrder.items?.length} items • Table {tableNumber}
              </div>
            </div>
          </div>
          <span style={{ color: '#276749', fontWeight: 700, fontSize: 13 }}>
            Track Live →
          </span>
        </div>
      )}

      {/* Main Navigation Cards */}
      <div style={{ padding: '0 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* CARD 1: Menu */}
        <div
          onClick={() => navigate('/customer/menu')}
          style={{
            background: 'white',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: '#EBF7EE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26
            }}>
              🍴
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1A2E22' }}>
                Restaurant Menu
              </div>
              <div style={{ fontSize: 13, color: '#5A6E62', marginTop: 2 }}>
                Browse & order your favorite food
              </div>
            </div>
          </div>
          <span style={{ fontSize: 18, color: '#087F45', fontWeight: 700 }}>→</span>
        </div>

        {/* CARD 2: Rewards */}
        <div
          onClick={() => navigate('/customer/rewards')}
          style={{
            background: 'white',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1.5px solid #E2E8F0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26
            }}>
              🎁
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1A2E22' }}>
                Your Rewards
              </div>
              <div style={{ fontSize: 13, color: '#5A6E62', marginTop: 2 }}>
                Check your rewards & stamp benefits
              </div>
            </div>
          </div>
          <span style={{ fontSize: 18, color: '#B45309', fontWeight: 700 }}>→</span>
        </div>

        {/* CARD 3: Pay Bill */}
        <div
          onClick={() => navigate('/customer/pay')}
          style={{
            background: 'linear-gradient(135deg, #F8FAFC 0%, #EDF2F7 100%)',
            borderRadius: 18,
            padding: '18px 20px',
            border: '1.5px solid #CBD5E0',
            boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 14,
              background: '#E2E8F0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26
            }}>
              💳
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#1A2E22' }}>
                Pay Table Bill
              </div>
              <div style={{ fontSize: 13, color: '#5A6E62', marginTop: 2 }}>
                View table bill, apply discounts & pay with UPI
              </div>
            </div>
          </div>
          <span style={{ fontSize: 18, color: '#4A5568', fontWeight: 700 }}>→</span>
        </div>
      </div>

      {/* My Reward QR Banner */}
      <div style={{ padding: '18px 18px 24px' }}>
        <div
          onClick={() => navigate('/customer/reward-qr')}
          style={{
            background: 'linear-gradient(135deg, #087F45 0%, #055C31 100%)',
            color: 'white',
            borderRadius: 18,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            boxShadow: '0 6px 18px rgba(8, 127, 69, 0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'white',
              color: '#087F45',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22
            }}>
              📱
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15 }}>My Reward QR Code</div>
              <div style={{ fontSize: 12, opacity: 0.88 }}>Show to waiter to add stamps</div>
            </div>
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, background: 'rgba(255,255,255,0.2)', padding: '5px 12px', borderRadius: 20 }}>
            Show QR
          </span>
        </div>
      </div>
    </div>
  );
}
