import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCustomer } from './CustomerContext';

const CustomerRewards = () => {
  const navigate = useNavigate();
  const { customer, getNextReward, refreshCustomer, loyaltySettings } = useCustomer();

  useEffect(() => {
    if (typeof refreshCustomer === 'function') {
      refreshCustomer();
    }
  }, []);

  const totalStamps = customer?.totalStamps || 0;
  const stampsPerCard = loyaltySettings?.stampsPerCard || 8;
  const activeMilestones = (loyaltySettings?.milestones || [])
    .filter(m => m.isActive !== false)
    .sort((a, b) => a.requiredStamps - b.requiredStamps);

  const cardCycle = Math.floor(Math.max(0, totalStamps - 1) / stampsPerCard) + 1;
  const currentStampsInCycle = totalStamps === 0 ? 0 : ((totalStamps - 1) % stampsPerCard) + 1;
  const nextReward = getNextReward();

  // All card slots dynamically generated up to stampsPerCard
  const STAMP_SLOTS = Array.from({ length: stampsPerCard }, (_, i) => {
    const num = i + 1;
    const milestone = activeMilestones.find(m => m.requiredStamps === num);
    const isGrand = num === stampsPerCard;
    return {
      num,
      type: milestone ? (isGrand ? 'grand' : 'milestone') : 'normal',
      label: milestone?.title || '',
      icon: milestone?.icon || (isGrand ? '🎁' : '☕'),
      required: num
    };
  });

  // List of rewards with their status
  const rewardsList = customer?.rewards && customer.rewards.length > 0
    ? customer.rewards
    : [
        {
          _id: 'rw_1',
          rewardId: 'FREE_COFFEE',
          title: 'Free Coffee',
          name: 'Free Coffee',
          description: 'Any hot or cold specialty espresso beverage on the house',
          requiredStamps: 4,
          status: totalStamps >= 4 ? 'available' : 'locked',
          unlockedAt: totalStamps >= 4 ? new Date().toISOString() : null
        },
        {
          _id: 'rw_2',
          rewardId: 'DISCOUNT_20',
          title: '20% OFF',
          name: '20% OFF',
          description: 'Get 20% flat discount on your complete dine-in food order',
          requiredStamps: 8,
          status: totalStamps >= 8 ? 'available' : 'locked',
          unlockedAt: totalStamps >= 8 ? new Date().toISOString() : null
        }
      ];

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
      case 'unlocked':
        return (
          <span style={{
            background: 'var(--light-green)',
            color: 'var(--primary-green)',
            fontWeight: 800,
            fontSize: '0.74rem',
            padding: '4px 10px',
            borderRadius: 20,
            border: '1px solid #bbf7d0'
          }}>
            🎉 Available to Use
          </span>
        );
      case 'redeemed':
        return (
          <span style={{
            background: '#f1f5f9',
            color: '#64748b',
            fontWeight: 700,
            fontSize: '0.74rem',
            padding: '4px 10px',
            borderRadius: 20
          }}>
            ✓ Redeemed
          </span>
        );
      case 'locked':
      default:
        return (
          <span style={{
            background: '#fef3c7',
            color: '#d97706',
            fontWeight: 700,
            fontSize: '0.74rem',
            padding: '4px 10px',
            borderRadius: 20
          }}>
            🔒 Locked
          </span>
        );
    }
  };

  return (
    <div className="customer-page-content">
      {/* Top Banner / Stamp Card Section */}
      <div style={{
        background: '#ffffff',
        borderRadius: 22,
        padding: '20px',
        boxShadow: 'var(--shadow-md)',
        marginBottom: 20,
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16
        }}>
          <div>
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 800,
              color: 'var(--primary-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Loyalty Pass
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b' }}>
              Your Stamp Card {cardCycle > 1 ? `(Card #${cardCycle})` : ''}
            </h3>
          </div>

          <div style={{
            background: 'var(--light-green)',
            color: 'var(--primary-green)',
            padding: '6px 14px',
            borderRadius: 20,
            fontWeight: 800,
            fontSize: '0.88rem'
          }}>
            {currentStampsInCycle} / {stampsPerCard} Stamps
          </div>
        </div>

        {/* 8 Stamp Card Slots Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 10,
          marginBottom: 18
        }}>
          {STAMP_SLOTS.map((slot) => {
            const isEarned = currentStampsInCycle >= slot.num;
            const isMilestone = slot.type === 'milestone';
            const isGrand = slot.type === 'grand';

            return (
              <div
                key={slot.num}
                style={{
                  height: 64,
                  borderRadius: 14,
                  border: isEarned
                    ? '2px solid var(--primary-green)'
                    : isGrand || isMilestone
                    ? '2px dashed #f59e0b'
                    : '2px dashed #cbd5e1',
                  background: isEarned
                    ? 'linear-gradient(135deg, #087F45 0%, #0a8f4d 100%)'
                    : isGrand
                    ? '#fffbeb'
                    : '#f8fafc',
                  color: isEarned ? '#ffffff' : '#64748b',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                {isEarned ? (
                  <span style={{ fontSize: 22, fontWeight: 900 }}>✓</span>
                ) : slot.type !== 'normal' ? (
                  <>
                    <span style={{ fontSize: 18 }}>{slot.icon}</span>
                    <span style={{ fontSize: '0.6rem', fontWeight: 800, color: '#b45309', textAlign: 'center', lineHeight: 1.1, padding: '0 2px' }}>
                      {slot.label}
                    </span>
                  </>
                ) : (
                  <span style={{ fontSize: '1rem', fontWeight: 700, opacity: 0.5 }}>
                    {slot.num}
                  </span>
                )}

                {/* Subtitle stamp number */}
                {isEarned && (
                  <span style={{ fontSize: '0.62rem', opacity: 0.85, fontWeight: 600 }}>
                    Stamp #{slot.num}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Text Helper */}
        <div style={{
          background: 'var(--light-green)',
          padding: '12px 14px',
          borderRadius: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 10
        }}>
          <span style={{ fontSize: 20 }}>🎯</span>
          <div style={{ fontSize: '0.82rem', color: 'var(--dark-green)', fontWeight: 600 }}>
            {nextReward ? (
              <>
                <strong>{nextReward.stampsNeeded} more stamp{nextReward.stampsNeeded > 1 ? 's' : ''}</strong> to unlock your <strong>{nextReward.rewardName}</strong>!
              </>
            ) : (
              <>
                You've unlocked all milestones in this card cycle! Keep dining to start a new reward card.
              </>
            )}
          </div>
        </div>

      </div>

      {/* Rewards Catalog & Status List */}
      <div>
        <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#1e293b', marginBottom: 12 }}>
          Your Reward Milestones
        </h4>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {rewardsList.map((reward) => (
            <div
              key={reward._id || reward.rewardId}
              style={{
                background: '#ffffff',
                borderRadius: 18,
                padding: '16px',
                boxShadow: 'var(--shadow-sm)',
                border: reward.status === 'available' ? '1.5px solid #86efac' : '1px solid #f1f5f9',
                display: 'flex',
                flexDirection: 'column',
                gap: 10
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: reward.status === 'available' ? 'var(--light-green)' : '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22
                  }}>
                    {(reward.rewardId === 'FREE_COFFEE' || reward.rewardId?.includes('coffee') || reward.title?.toLowerCase().includes('coffee')) ? '☕' : '🏷️'}
                  </div>

                  <div>
                    <h5 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                      {reward.title || reward.name || (reward.rewardId?.includes('coffee') ? 'Free Coffee' : '20% OFF')}
                    </h5>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                      {reward.description}
                    </div>
                  </div>
                </div>

                {getStatusBadge(reward.status)}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: 10,
                borderTop: '1px solid #f1f5f9',
                fontSize: '0.78rem',
                color: '#64748b'
              }}>
                <span>
                  Requires: <strong>{reward.requiredStamps} Stamps</strong>
                </span>

                {reward.status === 'available' ? (
                  <button
                    onClick={() => navigate('/customer/pay')}
                    style={{
                      background: 'var(--primary-green)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: 8,
                      padding: '6px 12px',
                      fontWeight: 700,
                      fontSize: '0.76rem',
                      cursor: 'pointer'
                    }}
                  >
                    Apply in Bill →
                  </button>
                ) : (
                  <span>
                    {totalStamps} / {reward.requiredStamps} completed
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomerRewards;
