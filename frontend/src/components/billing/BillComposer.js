import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext';
import { computeTotals, rewardDiscount, paymentIcon } from './receipt';

const PAYMENT_MODES = ['cash', 'upi', 'card'];

/**
 * Right-hand billing panel used by the admin and waiter billing screens:
 * live bill preview, optional loyalty reward, payment mode and "Generate Bill".
 * Payment itself is collected by the staff member (cash / UPI / card machine).
 */
export default function BillComposer({ order, onBilled }) {
  const { restaurant } = useAuth();
  const gstRate = restaurant?.gstRate ?? 5;

  const [paymentMode, setPaymentMode] = useState(order.paymentPreference || 'cash');
  const [rewards, setRewards] = useState([]);
  const [rewardId, setRewardId] = useState(order.requestedRewardId || '');
  const [customer, setCustomer] = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    setPaymentMode(order.paymentPreference || 'cash');
    setRewardId(order.requestedRewardId || '');
    setRewards([]);
    setCustomer(null);
    if (!order.customerId) return;
    axios.get(`/api/customers/${order.customerId}`)
      .then(res => {
        setCustomer(res.data);
        setRewards((res.data.rewards || []).filter(r => r.status === 'available'));
      })
      .catch(() => {});
  }, [order._id, order.customerId, order.paymentPreference, order.requestedRewardId]);

  const reward = rewards.find(r => r.rewardId === rewardId) || null;
  const totals = computeTotals(order.totalAmount, gstRate, rewardDiscount(reward, order.totalAmount));

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    try {
      const res = await axios.post('/api/bills', { orderId: order._id, paymentMode, rewardId: reward?.rewardId });
      const bill = res.data;
      toast.success(`Bill #${bill.billNumber} generated`);
      if (bill.stampEarned) {
        toast.success(`🎁 Loyalty stamp added — ${customer?.name || 'customer'} now has ${bill.customerTotalStamps} stamps`, { duration: 6000 });
      }
      onBilled(bill);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error generating bill');
      setGenerating(false);
    }
  };

  const isTakeaway = order.orderType === 'takeaway';

  return (
    <div>
      <div className="bill-paper" style={{ marginBottom: 16 }}>
        <div className="bill-header">
          <h2>🧾 Bill Preview</h2>
          <p style={{ fontSize: 12, color: '#718096' }}>
            Order #{order.orderNumber} — {isTakeaway ? `Parcel ${order.takeawayToken || ''}` : `Table T${order.tableNumber}`}
          </p>
          {order.customerName && <p style={{ fontSize: 12, color: '#718096' }}>{order.customerName}</p>}
        </div>

        {order.billRequested && (
          <div style={{ background: '#FFFBEB', border: '1px solid #F6AD55', color: '#92400E', borderRadius: 8, padding: '8px 10px', fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            🙋 Customer asked for the bill
            {order.paymentPreference && ` — wants to pay by ${order.paymentPreference.toUpperCase()}`}
          </div>
        )}

        <div style={{ marginBottom: 12 }}>
          {order.items.map((item, i) => (
            <div key={item._id || i} className="bill-row" style={{ fontSize: 13, marginBottom: 6 }}>
              <span style={{ flex: 1 }}>{item.name} ×{item.quantity}</span>
              <span>₹{item.price * item.quantity}</span>
            </div>
          ))}
        </div>
        <hr style={{ borderColor: '#E2E8F0', margin: '12px 0' }} />
        <div className="bill-row text-sm"><span>Subtotal</span><span>₹{totals.subtotal}</span></div>
        {totals.discountAmount > 0 && (
          <div className="bill-row text-sm" style={{ color: '#276749' }}>
            <span>Discount ({reward.title})</span><span>-₹{totals.discountAmount}</span>
          </div>
        )}
        {reward && reward.rewardType === 'free_item' && (
          <div className="bill-row text-sm" style={{ color: '#276749' }}>
            <span>🎁 {reward.title}</span><span>Serve free</span>
          </div>
        )}
        <div className="bill-row text-sm"><span>GST ({gstRate}%)</span><span>₹{totals.gstAmount}</span></div>
        <div className="bill-row bill-total">
          <span>TOTAL</span><span style={{ color: '#FF6B35' }}>₹{totals.totalAmount}</span>
        </div>
      </div>

      <div className="card">
        {order.customerId && (
          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.95rem', marginBottom: 8 }}>
              🎁 Loyalty {customer ? `— ${customer.name} (${customer.totalStamps || 0} stamps)` : ''}
            </h3>
            {rewards.length === 0 ? (
              <p className="text-sm text-muted">No rewards available. A stamp is added automatically when the bill is generated.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[{ rewardId: '', title: 'No reward' }, ...rewards].map(r => (
                  <label key={r.rewardId || 'none'} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                    <input type="radio" name={`reward-${order._id}`} checked={rewardId === r.rewardId} onChange={() => setRewardId(r.rewardId)} />
                    <span>
                      {r.title}
                      {r.rewardId && r.rewardId === order.requestedRewardId && <span className="badge badge-orange" style={{ marginLeft: 6 }}>Customer chose this</span>}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>Payment received by</h3>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {PAYMENT_MODES.map(mode => (
            <button key={mode} onClick={() => setPaymentMode(mode)}
              className={`btn ${paymentMode === mode ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
              {paymentIcon(mode)} {mode.toUpperCase()}
            </button>
          ))}
        </div>
        <button className="btn btn-success w-full btn-lg" onClick={generate} disabled={generating}>
          {generating ? 'Generating…' : `🧾 Generate Bill — ₹${totals.totalAmount}`}
        </button>
        <p className="text-sm text-muted" style={{ marginTop: 8, textAlign: 'center' }}>
          Generate the bill only after collecting the payment.
        </p>
      </div>
    </div>
  );
}
