// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import toast from 'react-hot-toast';

// export default function WaiterBilling() {
//   const [orders, setOrders] = useState([]);
//   const [selected, setSelected] = useState(null);
//   const [paymentMode, setPaymentMode] = useState('cash');
//   const [billDone, setBillDone] = useState(null);
//   const [loading, setLoading] = useState(false);

//   const load = async () => {
//     const res = await axios.get('/api/orders?active=true');
//     setOrders(res.data.filter(o => ['ready', 'served', 'preparing', 'accepted', 'pending'].includes(o.status)));
//   };

//   useEffect(() => { load(); }, []);

//   const generateBill = async () => {
//     if (!selected) return;
//     setLoading(true);
//     try {
//       const res = await axios.post('/api/bills', { orderId: selected._id, paymentMode });
//       setBillDone(res.data);
//       toast.success('Bill generated! ✅');
//       load();
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Error generating bill');
//     } finally {
//       setLoading(false);
//     }
//   };

//   const subtotal = selected?.totalAmount || 0;
//   const gst = Math.round(subtotal * 5 / 100);
//   const total = subtotal + gst;

//   if (billDone) {
//     return (
//       <div>
//         <div className="page-header">
//           <h1>Bill Generated</h1>
//           <div className="flex-gap">
//             <button className="btn btn-ghost" onClick={() => { setBillDone(null); setSelected(null); load(); }}>← New Bill</button>
//             <button className="btn btn-primary" onClick={() => window.print()}>🖨️ Print</button>
//           </div>
//         </div>
//         <div className="page-body" style={{ display: 'flex', justifyContent: 'center' }}>
//           <div className="bill-paper">
//             <div className="bill-header">
//               <h2>🍽️ Restaurant</h2>
//               <p style={{ fontSize: 13, color: '#718096' }}>Smart Restaurant Management System</p>
//               <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
//                 {new Date(billDone.createdAt).toLocaleString('en-IN')}
//               </p>
//             </div>
//             <div style={{ marginBottom: 14 }}>
//               <div className="bill-row"><span className="text-muted">Bill #</span><strong>#{billDone.billNumber}</strong></div>
//               <div className="bill-row"><span className="text-muted">Order #</span><span>#{billDone.orderNumber}</span></div>
//               <div className="bill-row"><span className="text-muted">Table</span><span>T{billDone.tableNumber}</span></div>
//               <div className="bill-row"><span className="text-muted">Payment</span>
//                 <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>
//                   {billDone.paymentMode === 'cash' ? '💵' : billDone.paymentMode === 'upi' ? '📱' : '💳'} {billDone.paymentMode}
//                 </span>
//               </div>
//             </div>
//             <hr style={{ borderColor: '#E2E8F0', borderStyle: 'dashed', margin: '14px 0' }} />
//             <div style={{ marginBottom: 14 }}>
//               <div className="bill-row" style={{ fontWeight: 700, fontSize: 11, color: '#718096', paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
//                 <span>ITEM</span><span>QTY × PRICE</span><span>AMT</span>
//               </div>
//               {billDone.items.map((item, i) => (
//                 <div key={i} className="bill-row" style={{ marginTop: 8, fontSize: 13 }}>
//                   <span style={{ flex: 1 }}>{item.name}</span>
//                   <span style={{ margin: '0 10px', color: '#718096', fontSize: 12 }}>×{item.quantity} × ₹{item.price}</span>
//                   <span>₹{item.total}</span>
//                 </div>
//               ))}
//             </div>
//             <hr style={{ borderColor: '#E2E8F0', margin: '14px 0' }} />
//             <div className="bill-row text-sm"><span>Subtotal</span><span>₹{billDone.subtotal}</span></div>
//             <div className="bill-row text-sm"><span>GST (5%)</span><span>₹{billDone.gstAmount}</span></div>
//             <div className="bill-row bill-total">
//               <span>TOTAL</span><span style={{ color: '#FF6B35', fontSize: '1.2rem' }}>₹{billDone.totalAmount}</span>
//             </div>
//             <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#718096' }}>
//               <p>Thank you for dining with us! 🙏</p>
//               <p style={{ marginTop: 4 }}>Please visit again</p>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <div>
//       <div className="page-header">
//         <h1>Billing</h1>
//       </div>
//       <div className="page-body">
//         <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 24, alignItems: 'start' }}>
//           <div>
//             <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>Select Order to Bill</h3>
//             {orders.length === 0 ? (
//               <div className="empty-state card"><div className="icon">📋</div><p>No orders available for billing</p></div>
//             ) : (
//               <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                 {orders.map(o => (
//                   <div key={o._id} onClick={() => { setSelected(o); setBillDone(null); }}
//                     style={{
//                       padding: 16, borderRadius: 10, background: 'white',
//                       border: `2px solid ${selected?._id === o._id ? '#FF6B35' : '#E2E8F0'}`,
//                       cursor: 'pointer', transition: 'all 0.2s',
//                       background: selected?._id === o._id ? '#fff3ee' : 'white'
//                     }}>
//                     <div className="flex-between">
//                       <div>
//                         <strong>Order #{o.orderNumber} — Table T{o.tableNumber}</strong>
//                         <div className="text-sm text-muted" style={{ marginTop: 4 }}>{o.items.length} items</div>
//                       </div>
//                       <div style={{ textAlign: 'right' }}>
//                         <div style={{ fontWeight: 700, color: '#FF6B35', fontSize: '1.1rem' }}>₹{o.totalAmount}</div>
//                         <span className={`badge badge-${o.status === 'ready' ? 'green' : 'orange'}`} style={{ marginTop: 4 }}>{o.status}</span>
//                       </div>
//                     </div>
//                   </div>
//                 ))}
//               </div>
//             )}
//           </div>

//           {selected && (
//             <div>
//               <div className="bill-paper" style={{ marginBottom: 16 }}>
//                 <div className="bill-header">
//                   <h2>🍽️ Bill Preview</h2>
//                   <p style={{ fontSize: 12, color: '#718096' }}>Order #{selected.orderNumber} — Table T{selected.tableNumber}</p>
//                 </div>
//                 <div style={{ marginBottom: 12 }}>
//                   {selected.items.map((item, i) => (
//                     <div key={i} className="bill-row" style={{ fontSize: 13, marginBottom: 6 }}>
//                       <span style={{ flex: 1 }}>{item.name} ×{item.quantity}</span>
//                       <span>₹{item.price * item.quantity}</span>
//                     </div>
//                   ))}
//                 </div>
//                 <hr style={{ borderColor: '#E2E8F0', margin: '12px 0' }} />
//                 <div className="bill-row text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
//                 <div className="bill-row text-sm"><span>GST (5%)</span><span>₹{gst}</span></div>
//                 <div className="bill-row bill-total">
//                   <span>TOTAL</span><span style={{ color: '#FF6B35' }}>₹{total}</span>
//                 </div>
//               </div>

//               <div className="card">
//                 <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>Payment Mode</h3>
//                 <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
//                   {[['cash', '💵', 'Cash'], ['upi', '📱', 'UPI'], ['card', '💳', 'Card']].map(([val, icon, label]) => (
//                     <button key={val} onClick={() => setPaymentMode(val)}
//                       className={`btn ${paymentMode === val ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
//                       {icon} {label}
//                     </button>
//                   ))}
//                 </div>
//                 <button className="btn btn-success w-full btn-lg" onClick={generateBill} disabled={loading}>
//                   {loading ? 'Generating...' : '🧾 Generate Bill'}
//                 </button>
//               </div>
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }























import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function WaiterBilling() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [billDone, setBillDone] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    const res = await axios.get('/api/orders?active=true');
    setOrders(res.data.filter(o => ['ready', 'served', 'preparing', 'accepted', 'pending'].includes(o.status)));
  };

  useEffect(() => { load(); }, []);

  const generateBill = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await axios.post('/api/bills', { orderId: selected._id, paymentMode });
      setBillDone(res.data);
      toast.success('Bill generated! ✅');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error generating bill');
    } finally {
      setLoading(false);
    }
  };

  // ✅ FIXED: Opens a new small window with only bill content and prints it
  const handlePrint = (bill) => {
    const printWindow = window.open('', '_blank', 'width=400,height=700');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bill #${bill.billNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              width: 320px;
              margin: 0 auto;
              padding: 16px;
              font-size: 13px;
              color: #000;
            }
            .bill-header { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px dashed #ccc; }
            .bill-header h2 { font-size: 20px; font-weight: 900; color: #FF6B35; margin-bottom: 4px; }
            .bill-header p { font-size: 11px; color: #555; margin-top: 2px; }
            .bill-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
            .bill-row span:first-child { color: #555; }
            hr { border: none; border-top: 1px dashed #ccc; margin: 12px 0; }
            .items-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #777; padding-bottom: 6px; border-bottom: 1px solid #ccc; margin-bottom: 8px; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
            .item-name { flex: 1; }
            .item-qty { margin: 0 12px; }
            .totals { margin-top: 12px; }
            .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
            .total-row.grand { font-size: 16px; font-weight: 900; border-top: 2px solid #000; padding-top: 8px; margin-top: 6px; color: #FF6B35; }
            .footer { text-align: center; margin-top: 18px; font-size: 11px; color: #555; }
          </style>
        </head>
        <body>
          <div class="bill-header">
            <h2>🍽️ Restaurant</h2>
            <p>Smart Restaurant Management System</p>
            <p style="margin-top:4px">${new Date(bill.createdAt).toLocaleDateString('en-IN')} &nbsp; ${new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>

          <div class="bill-row"><span>Bill #</span><strong>${bill.billNumber}</strong></div>
          <div class="bill-row"><span>Order #</span><span>${bill.orderNumber}</span></div>
          <div class="bill-row"><span>Table</span><span>T${bill.tableNumber}</span></div>
          <div class="bill-row"><span>Payment</span><span style="font-weight:700;text-transform:uppercase">${bill.paymentMode}</span></div>

          <hr/>

          <div class="items-header">
            <span>Item</span><span>Qty</span><span>Amount</span>
          </div>

          ${(bill.items || []).map(item => `
            <div class="item-row">
              <span class="item-name">${item.name}</span>
              <span class="item-qty">×${item.quantity}</span>
              <span>₹${item.total}</span>
            </div>
          `).join('')}

          <hr/>

          <div class="totals">
            <div class="total-row"><span>Subtotal</span><span>₹${bill.subtotal}</span></div>
            <div class="total-row"><span>GST (5%)</span><span>₹${bill.gstAmount}</span></div>
            <div class="total-row grand"><span>TOTAL</span><span>₹${bill.totalAmount}</span></div>
          </div>

          <div class="footer">
            <p>Thank you for dining with us! 🙏</p>
            <p style="margin-top:4px">Please visit again</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const subtotal = selected?.totalAmount || 0;
  const gst = Math.round(subtotal * 5 / 100);
  const total = subtotal + gst;

  if (billDone) {
    return (
      <div>
        <div className="page-header">
          <h1>Bill Generated ✅</h1>
          <div className="flex-gap">
            <button className="btn btn-ghost" onClick={() => { setBillDone(null); setSelected(null); load(); }}>← New Bill</button>
            <button className="btn btn-primary" onClick={() => handlePrint(billDone)}>🖨️ Print Bill</button>
          </div>
        </div>
        <div className="page-body" style={{ display: 'flex', justifyContent: 'center' }}>
          <div className="bill-paper">
            <div className="bill-header">
              <h2>🍽️ Restaurant</h2>
              <p style={{ fontSize: 13, color: '#718096' }}>Smart Restaurant Management System</p>
              <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                {new Date(billDone.createdAt).toLocaleString('en-IN')}
              </p>
            </div>
            <div style={{ marginBottom: 14 }}>
              <div className="bill-row"><span className="text-muted">Bill #</span><strong>#{billDone.billNumber}</strong></div>
              <div className="bill-row"><span className="text-muted">Order #</span><span>#{billDone.orderNumber}</span></div>
              <div className="bill-row"><span className="text-muted">Table</span><span>T{billDone.tableNumber}</span></div>
              <div className="bill-row"><span className="text-muted">Payment</span>
                <span style={{ textTransform: 'uppercase', fontWeight: 600 }}>
                  {billDone.paymentMode === 'cash' ? '💵' : billDone.paymentMode === 'upi' ? '📱' : '💳'} {billDone.paymentMode}
                </span>
              </div>
            </div>
            <hr style={{ borderColor: '#E2E8F0', borderStyle: 'dashed', margin: '14px 0' }} />
            <div style={{ marginBottom: 14 }}>
              <div className="bill-row" style={{ fontWeight: 700, fontSize: 11, color: '#718096', paddingBottom: 8, borderBottom: '1px solid #E2E8F0' }}>
                <span>ITEM</span><span>QTY × PRICE</span><span>AMT</span>
              </div>
              {billDone.items.map((item, i) => (
                <div key={i} className="bill-row" style={{ marginTop: 8, fontSize: 13 }}>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ margin: '0 10px', color: '#718096', fontSize: 12 }}>×{item.quantity} × ₹{item.price}</span>
                  <span>₹{item.total}</span>
                </div>
              ))}
            </div>
            <hr style={{ borderColor: '#E2E8F0', margin: '14px 0' }} />
            <div className="bill-row text-sm"><span>Subtotal</span><span>₹{billDone.subtotal}</span></div>
            <div className="bill-row text-sm"><span>GST (5%)</span><span>₹{billDone.gstAmount}</span></div>
            <div className="bill-row bill-total">
              <span>TOTAL</span><span style={{ color: '#FF6B35', fontSize: '1.2rem' }}>₹{billDone.totalAmount}</span>
            </div>
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#718096' }}>
              <p>Thank you for dining with us! 🙏</p>
              <p style={{ marginTop: 4 }}>Please visit again</p>
            </div>
            <button className="btn btn-primary w-full" style={{ marginTop: 16 }} onClick={() => handlePrint(billDone)}>
              🖨️ Print Bill
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1>Billing</h1>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 24, alignItems: 'start' }}>
          <div>
            <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>Select Order to Bill</h3>
            {orders.length === 0 ? (
              <div className="empty-state card"><div className="icon">📋</div><p>No orders available for billing</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {orders.map(o => (
                  <div key={o._id} onClick={() => { setSelected(o); setBillDone(null); }}
                    style={{
                      padding: 16, borderRadius: 10,
                      border: `2px solid ${selected?._id === o._id ? '#FF6B35' : '#E2E8F0'}`,
                      cursor: 'pointer', transition: 'all 0.2s',
                      background: selected?._id === o._id ? '#fff3ee' : 'white'
                    }}>
                    <div className="flex-between">
                      <div>
                        <strong>Order #{o.orderNumber} — Table T{o.tableNumber}</strong>
                        <div className="text-sm text-muted" style={{ marginTop: 4 }}>{o.items.length} items</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 700, color: '#FF6B35', fontSize: '1.1rem' }}>₹{o.totalAmount}</div>
                        <span className={`badge badge-${o.status === 'ready' ? 'green' : 'orange'}`} style={{ marginTop: 4 }}>{o.status}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selected && (
            <div>
              <div className="bill-paper" style={{ marginBottom: 16 }}>
                <div className="bill-header">
                  <h2>🍽️ Bill Preview</h2>
                  <p style={{ fontSize: 12, color: '#718096' }}>Order #{selected.orderNumber} — Table T{selected.tableNumber}</p>
                </div>
                <div style={{ marginBottom: 12 }}>
                  {selected.items.map((item, i) => (
                    <div key={i} className="bill-row" style={{ fontSize: 13, marginBottom: 6 }}>
                      <span style={{ flex: 1 }}>{item.name} ×{item.quantity}</span>
                      <span>₹{item.price * item.quantity}</span>
                    </div>
                  ))}
                </div>
                <hr style={{ borderColor: '#E2E8F0', margin: '12px 0' }} />
                <div className="bill-row text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
                <div className="bill-row text-sm"><span>GST (5%)</span><span>₹{gst}</span></div>
                <div className="bill-row bill-total">
                  <span>TOTAL</span><span style={{ color: '#FF6B35' }}>₹{total}</span>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.95rem', marginBottom: 12 }}>Payment Mode</h3>
                <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
                  {[['cash', '💵', 'Cash'], ['upi', '📱', 'UPI'], ['card', '💳', 'Card']].map(([val, icon, label]) => (
                    <button key={val} onClick={() => setPaymentMode(val)}
                      className={`btn ${paymentMode === val ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1 }}>
                      {icon} {label}
                    </button>
                  ))}
                </div>
                <button className="btn btn-success w-full btn-lg" onClick={generateBill} disabled={loading}>
                  {loading ? 'Generating...' : '🧾 Generate Bill'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}