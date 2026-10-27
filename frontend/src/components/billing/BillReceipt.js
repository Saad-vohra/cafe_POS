import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { printReceipt, paymentIcon } from './receipt';

// On-screen copy of a generated bill with a print button.
export default function BillReceipt({ bill }) {
  const { restaurant } = useAuth();
  const half = (bill.gstAmount || 0) / 2;

  return (
    <div className="bill-paper">
      <div className="bill-header">
        <h2>{restaurant?.name || 'Restaurant'}</h2>
        {restaurant?.address && <p style={{ fontSize: 12, color: '#718096' }}>{restaurant.address}</p>}
        {restaurant?.gstNumber && <p style={{ fontSize: 12, color: '#718096' }}>GSTIN: {restaurant.gstNumber}</p>}
        <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>{new Date(bill.createdAt).toLocaleString('en-IN')}</p>
      </div>
      <div style={{ marginBottom: 14 }}>
        <div className="bill-row"><span className="text-muted">Bill #</span><strong>#{bill.billNumber}</strong></div>
        <div className="bill-row"><span className="text-muted">Order #</span><span>#{bill.orderNumber}</span></div>
        <div className="bill-row">
          <span className="text-muted">{bill.orderType === 'takeaway' ? 'Type' : 'Table'}</span>
          <span>{bill.orderType === 'takeaway' ? `🛍️ Parcel (${bill.takeawayToken || `#${bill.orderNumber}`})` : `T${bill.tableNumber}`}</span>
        </div>
        {bill.customerName && <div className="bill-row"><span className="text-muted">Customer</span><span>{bill.customerName}</span></div>}
        <div className="bill-row">
          <span className="text-muted">Payment</span>
          <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{paymentIcon(bill.paymentMode)} {bill.paymentMode}</span>
        </div>
      </div>
      <hr style={{ borderColor: '#E2E8F0', borderStyle: 'dashed', margin: '14px 0' }} />
      <div style={{ marginBottom: 14 }}>
        {bill.items.map((item, i) => (
          <div key={i} className="bill-row" style={{ marginTop: 8, fontSize: 13 }}>
            <span style={{ flex: 1 }}>{item.name}</span>
            <span style={{ margin: '0 10px', color: '#718096', fontSize: 12 }}>×{item.quantity} × ₹{item.price}</span>
            <span>₹{item.total}</span>
          </div>
        ))}
      </div>
      <hr style={{ borderColor: '#E2E8F0', margin: '14px 0' }} />
      <div className="bill-row text-sm"><span>Subtotal</span><span>₹{bill.subtotal}</span></div>
      {bill.discountAmount > 0 && (
        <div className="bill-row text-sm" style={{ color: '#276749' }}>
          <span>Discount{bill.appliedReward?.title ? ` (${bill.appliedReward.title})` : ''}</span><span>-₹{bill.discountAmount}</span>
        </div>
      )}
      <div className="bill-row text-sm"><span>CGST ({(bill.gstRate || 0) / 2}%)</span><span>₹{half.toFixed(2)}</span></div>
      <div className="bill-row text-sm"><span>SGST ({(bill.gstRate || 0) / 2}%)</span><span>₹{half.toFixed(2)}</span></div>
      <div className="bill-row bill-total">
        <span>TOTAL</span><span style={{ color: '#FF6B35', fontSize: '1.2rem' }}>₹{bill.totalAmount}</span>
      </div>
      <button className="btn btn-primary w-full" style={{ marginTop: 16 }} onClick={() => printReceipt(bill, restaurant)}>
        🖨️ Print Bill
      </button>
    </div>
  );
}
