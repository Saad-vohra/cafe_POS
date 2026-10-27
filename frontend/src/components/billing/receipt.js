// Bill maths and receipt printing shared by the admin and waiter billing screens.

const PAYMENT_ICONS = { cash: '💵', upi: '📱', card: '💳' };
export const paymentIcon = (mode) => PAYMENT_ICONS[mode] || '';

// Everything printed comes from the database, and names/notes are typed by customers,
// so it must be escaped before going into the print window.
export const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const money = (n) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2);

// Mirrors backend/utils/billing.js so the preview matches the saved bill.
export function rewardDiscount(reward, subtotal) {
  if (!reward) return 0;
  if (reward.rewardType === 'discount_percent') {
    return Math.round(subtotal * Math.min(100, Math.max(0, reward.rewardValue || 0)) / 100);
  }
  if (reward.rewardType === 'discount_flat') return Math.min(subtotal, Math.max(0, reward.rewardValue || 0));
  return 0;
}

export function computeTotals(subtotal, gstRate, discountAmount = 0) {
  const discount = Math.min(subtotal, Math.max(0, discountAmount));
  const taxable = subtotal - discount;
  const gstAmount = Math.round(taxable * gstRate / 100);
  return { subtotal, discountAmount: discount, taxable, gstRate, gstAmount, totalAmount: taxable + gstAmount };
}

const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const formatTime = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

const orderLabel = (bill) => (bill.orderType === 'takeaway'
  ? `Parcel (${bill.takeawayToken || `#${bill.orderNumber}`})`
  : `Table T${bill.tableNumber}`);

// GST invoice for intra-state sales: GST is shown split into equal CGST + SGST.
export function printReceipt(bill, restaurant = {}) {
  const e = escapeHtml;
  const half = (bill.gstAmount || 0) / 2;
  const halfRate = (bill.gstRate || 0) / 2;
  const printWindow = window.open('', '_blank', 'width=420,height=750');
  if (!printWindow) {
    window.alert('Please allow pop-ups for this site to print bills.');
    return;
  }

  printWindow.document.write(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Bill #${e(bill.billNumber)}</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Courier New', monospace; width: 300px; margin: 0 auto; padding: 16px 10px; font-size: 12px; color: #000; }
      .center { text-align: center; }
      h2 { font-size: 17px; font-weight: 900; margin-bottom: 4px; }
      .muted { color: #333; font-size: 11px; line-height: 1.4; }
      hr { border: none; border-top: 1px dashed #000; margin: 8px 0; }
      .row { display: flex; justify-content: space-between; gap: 8px; margin: 2px 0; }
      .items .row span:first-child { flex: 1; }
      .qty { width: 34px; text-align: right; }
      .amt { width: 70px; text-align: right; }
      .grand { font-size: 15px; font-weight: 900; border-top: 1px solid #000; padding-top: 6px; margin-top: 6px; }
      .footer { margin-top: 12px; font-size: 11px; }
      @media print { @page { margin: 0; } }
    </style>
  </head>
  <body>
    <div class="center">
      <h2>${e(restaurant.name || 'Restaurant')}</h2>
      ${restaurant.address ? `<div class="muted">${e(restaurant.address)}</div>` : ''}
      ${restaurant.phone ? `<div class="muted">Ph: ${e(restaurant.phone)}</div>` : ''}
      ${restaurant.gstNumber ? `<div class="muted">GSTIN: ${e(restaurant.gstNumber)}</div>` : ''}
      ${restaurant.fssaiNumber ? `<div class="muted">FSSAI: ${e(restaurant.fssaiNumber)}</div>` : ''}
      <div style="margin-top:6px;font-weight:700">${restaurant.gstNumber ? 'TAX INVOICE' : 'BILL'}</div>
    </div>
    <hr/>
    <div class="row"><span>Bill No: <b>${e(bill.billNumber)}</b></span><span>${e(formatDate(bill.createdAt))}</span></div>
    <div class="row"><span>Order: #${e(bill.orderNumber)}</span><span>${e(formatTime(bill.createdAt))}</span></div>
    <div class="row"><span>${e(orderLabel(bill))}</span><span>${e((bill.paymentMode || '').toUpperCase())}</span></div>
    ${bill.customerName ? `<div class="row"><span>Customer: ${e(bill.customerName)}</span></div>` : ''}
    ${bill.customerPhone ? `<div class="row"><span>Phone: ${e(bill.customerPhone)}</span></div>` : ''}
    ${bill.billedByName ? `<div class="row"><span>Billed by: ${e(bill.billedByName)}</span></div>` : ''}
    <hr/>
    <div class="row" style="font-weight:700"><span style="flex:1">Item</span><span class="qty">Qty</span><span class="amt">Amount</span></div>
    <div class="items">
      ${(bill.items || []).map(item => `
        <div class="row"><span>${e(item.name)}<br/><span class="muted">@ ${money(item.price)}</span></span><span class="qty">${e(item.quantity)}</span><span class="amt">${money(item.total)}</span></div>
      `).join('')}
    </div>
    <hr/>
    <div class="row"><span>Subtotal</span><span>${money(bill.subtotal)}</span></div>
    ${bill.discountAmount > 0 ? `<div class="row"><span>Discount${bill.appliedReward?.title ? ` (${e(bill.appliedReward.title)})` : ''}</span><span>-${money(bill.discountAmount)}</span></div>
    <div class="row"><span>Taxable value</span><span>${money(bill.subtotal - bill.discountAmount)}</span></div>` : ''}
    ${bill.appliedReward && !(bill.discountAmount > 0) ? `<div class="row"><span>Reward: ${e(bill.appliedReward.title)}</span><span>FREE</span></div>` : ''}
    <div class="row"><span>CGST @ ${halfRate}%</span><span>${money(half)}</span></div>
    <div class="row"><span>SGST @ ${halfRate}%</span><span>${money(half)}</span></div>
    <div class="row grand"><span>TOTAL</span><span>&#8377;${money(bill.totalAmount)}</span></div>
    <div class="center footer">
      <p>${e(restaurant.receiptFooter || 'Thank you for dining with us!')}</p>
    </div>
  </body>
</html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 350);
}

// Plain-text copy of the bill for the "Download" button in bill history.
export function receiptText(bill, restaurant = {}) {
  const line = '================================';
  const dash = '--------------------------------';
  const half = (bill.gstAmount || 0) / 2;
  return [
    line,
    (restaurant.name || 'Restaurant').toUpperCase(),
    ...(restaurant.address ? [restaurant.address] : []),
    ...(restaurant.gstNumber ? [`GSTIN: ${restaurant.gstNumber}`] : []),
    line,
    `Date  : ${new Date(bill.createdAt).toLocaleString('en-IN')}`,
    `Bill# : ${bill.billNumber}`,
    `Order#: ${bill.orderNumber}`,
    `Type  : ${orderLabel(bill)}`,
    ...(bill.customerName ? [`Cust  : ${bill.customerName}`] : []),
    `Pay   : ${(bill.paymentMode || '').toUpperCase()}`,
    dash,
    'ITEM                  QTY  AMT',
    dash,
    ...(bill.items || []).map(item => `${String(item.name).padEnd(20).slice(0, 20)}  x${String(item.quantity).padStart(2)}  ${money(item.total)}`),
    dash,
    `Subtotal              ${money(bill.subtotal)}`,
    ...(bill.discountAmount > 0 ? [`Discount             -${money(bill.discountAmount)}`] : []),
    `CGST @ ${(bill.gstRate || 0) / 2}%            ${money(half)}`,
    `SGST @ ${(bill.gstRate || 0) / 2}%            ${money(half)}`,
    line,
    `TOTAL                 ${money(bill.totalAmount)}`,
    line,
    restaurant.receiptFooter || 'Thank you for dining with us!',
    line
  ].join('\n');
}
