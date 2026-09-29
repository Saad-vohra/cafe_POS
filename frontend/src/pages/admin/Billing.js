// import React, { useEffect, useState, useRef } from 'react';
// import axios from 'axios';
// import toast from 'react-hot-toast';

// export default function Billing() {
//   const [orders, setOrders] = useState([]);
//   const [bills, setBills] = useState([]);
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [paymentMode, setPaymentMode] = useState('cash');
//   const [billPreview, setBillPreview] = useState(null);
//   const [tab, setTab] = useState('generate');
//   const printRef = useRef();

//   const loadOrders = async () => {
//     const res = await axios.get('/api/orders?active=true');
//     setOrders(res.data.filter(o => ['ready', 'served', 'preparing', 'accepted'].includes(o.status)));
//   };

//   const loadBills = async () => {
//     const res = await axios.get('/api/bills');
//     setBills(res.data);
//   };

//   useEffect(() => { loadOrders(); loadBills(); }, []);

//   const generateBill = async () => {
//     if (!selectedOrder) return;
//     try {
//       const res = await axios.post('/api/bills', { orderId: selectedOrder._id, paymentMode });
//       setBillPreview(res.data);
//       toast.success('Bill generated!');
//       loadOrders();
//       loadBills();
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Error generating bill');
//     }
//   };

//   const handlePrint = () => {
//     window.print();
//   };

//   const subtotal = selectedOrder?.totalAmount || 0;
//   const gst = Math.round(subtotal * 5 / 100);
//   const total = subtotal + gst;

//   return (
//     <div>
//       <div className="page-header">
//         <h1>Billing</h1>
//         <div className="flex-gap">
//           <button className={`btn btn-sm ${tab === 'generate' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('generate')}>Generate Bill</button>
//           <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('history')}>Bill History</button>
//         </div>
//       </div>
//       <div className="page-body">
//         {tab === 'generate' && (
//           <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
//             <div>
//               <div className="card mb-16">
//                 <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Select Table / Order</h3>
//                 {orders.length === 0 ? (
//                   <div className="empty-state" style={{ padding: 30 }}><div className="icon">📋</div><p className="text-sm">No orders ready for billing</p></div>
//                 ) : (
//                   <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                     {orders.map(o => (
//                       <div key={o._id} onClick={() => { setSelectedOrder(o); setBillPreview(null); }}
//                         style={{
//                           padding: 14, borderRadius: 8, border: `2px solid ${selectedOrder?._id === o._id ? '#FF6B35' : '#E2E8F0'}`,
//                           cursor: 'pointer', background: selectedOrder?._id === o._id ? '#fff3ee' : 'white',
//                           transition: 'all 0.2s'
//                         }}>
//                         <div className="flex-between">
//                           <strong>Order #{o.orderNumber} — Table T{o.tableNumber}</strong>
//                           <span className="badge badge-orange">₹{o.totalAmount}</span>
//                         </div>
//                         <div className="text-sm text-muted" style={{ marginTop: 4 }}>{o.items.length} items • {o.status}</div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {selectedOrder && (
//                 <div className="card">
//                   <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>Payment Mode</h3>
//                   <div style={{ display: 'flex', gap: 12 }}>
//                     {['cash', 'upi', 'card'].map(m => (
//                       <button key={m} onClick={() => setPaymentMode(m)}
//                         className={`btn ${paymentMode === m ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, textTransform: 'capitalize' }}>
//                         {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m.toUpperCase()}
//                       </button>
//                     ))}
//                   </div>
//                   <button className="btn btn-success w-full btn-lg mt-24" onClick={generateBill}>
//                     🧾 Generate & Print Bill
//                   </button>
//                 </div>
//               )}
//             </div>

//             <div>
//               {(selectedOrder || billPreview) && (
//                 <div className="bill-paper" ref={printRef}>
//                   <div className="bill-header">
//                     <h2>🍽️ Restaurant</h2>
//                     <p style={{ fontSize: 13, color: '#718096' }}>Smart Restaurant Management System</p>
//                     <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
//                       {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
//                     </p>
//                   </div>
//                   <div style={{ marginBottom: 14 }}>
//                     <div className="bill-row"><span className="text-muted">Bill #</span><strong>{billPreview?.billNumber || '----'}</strong></div>
//                     <div className="bill-row"><span className="text-muted">Order #</span><span>{selectedOrder?.orderNumber}</span></div>
//                     <div className="bill-row"><span className="text-muted">Table</span><span>T{selectedOrder?.tableNumber}</span></div>
//                     <div className="bill-row"><span className="text-muted">Payment</span><span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{paymentMode}</span></div>
//                   </div>
//                   <hr style={{ borderColor: '#E2E8F0', borderStyle: 'dashed', margin: '14px 0' }} />
//                   <div style={{ marginBottom: 14 }}>
//                     <div className="bill-row" style={{ fontWeight: 700, fontSize: 12, color: '#718096', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
//                       <span>ITEM</span><span>QTY</span><span>AMOUNT</span>
//                     </div>
//                     {selectedOrder?.items.map((item, i) => (
//                       <div key={i} className="bill-row" style={{ marginTop: 8, fontSize: 13 }}>
//                         <span style={{ flex: 1 }}>{item.name}</span>
//                         <span style={{ margin: '0 16px' }}>×{item.quantity}</span>
//                         <span>₹{item.price * item.quantity}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <hr style={{ borderColor: '#E2E8F0', margin: '14px 0' }} />
//                   <div>
//                     <div className="bill-row text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
//                     <div className="bill-row text-sm"><span>GST (5%)</span><span>₹{gst}</span></div>
//                     <div className="bill-row bill-total"><span>TOTAL</span><span style={{ color: '#FF6B35' }}>₹{total}</span></div>
//                   </div>
//                   <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#718096' }}>
//                     <p>Thank you for dining with us! 🙏</p>
//                     <p style={{ marginTop: 4 }}>Visit again soon</p>
//                   </div>
//                   {billPreview && (
//                     <button className="btn btn-ghost w-full mt-24" onClick={handlePrint} style={{ marginTop: 16 }}>
//                       🖨️ Print Bill
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {tab === 'history' && (
//           <div className="table-wrapper">
//             <table>
//               <thead>
//                 <tr><th>Bill #</th><th>Order #</th><th>Table</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Payment</th><th>Date & Time</th></tr>
//               </thead>
//               <tbody>
//                 {bills.length === 0 && (
//                   <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 40 }}>No bills found</td></tr>
//                 )}
//                 {bills.map(b => (
//                   <tr key={b._id}>
//                     <td><strong>#{b.billNumber}</strong></td>
//                     <td>#{b.orderNumber}</td>
//                     <td>T{b.tableNumber}</td>
//                     <td>₹{b.subtotal}</td>
//                     <td>₹{b.gstAmount}</td>
//                     <td><strong style={{ color: '#FF6B35' }}>₹{b.totalAmount}</strong></td>
//                     <td>
//                       <span className={`badge ${b.paymentMode === 'cash' ? 'badge-green' : b.paymentMode === 'upi' ? 'badge-blue' : 'badge-purple'}`}>
//                         {b.paymentMode === 'cash' ? '💵' : b.paymentMode === 'upi' ? '📱' : '💳'} {b.paymentMode}
//                       </span>
//                     </td>
//                     <td className="text-sm text-muted">{new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }














// import React, { useEffect, useState, useRef } from 'react';
// import axios from 'axios';
// import toast from 'react-hot-toast';

// export default function Billing() {
//   const [orders, setOrders] = useState([]);
//   const [bills, setBills] = useState([]);
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [paymentMode, setPaymentMode] = useState('cash');
//   const [billPreview, setBillPreview] = useState(null);
//   const [tab, setTab] = useState('generate');
//   const printRef = useRef();

//   const loadOrders = async () => {
//     const res = await axios.get('/api/orders?active=true');
//     setOrders(res.data.filter(o => ['ready', 'served', 'preparing', 'accepted'].includes(o.status)));
//   };

//   const loadBills = async () => {
//     const res = await axios.get('/api/bills');
//     setBills(res.data);
//   };

//   useEffect(() => { loadOrders(); loadBills(); }, []);

//   const generateBill = async () => {
//     if (!selectedOrder) return;
//     try {
//       const res = await axios.post('/api/bills', { orderId: selectedOrder._id, paymentMode });
//       setBillPreview(res.data);
//       toast.success('Bill generated!');
//       loadOrders();
//       loadBills();
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Error generating bill');
//     }
//   };

//   // ✅ FIXED: Only print the bill div, not the whole page
//   const handlePrint = () => {
//     const billContent = printRef.current?.innerHTML;
//     if (!billContent) return;

//     const printWindow = window.open('', '_blank', 'width=400,height=700');
//     printWindow.document.write(`
//       <!DOCTYPE html>
//       <html>
//         <head>
//           <title>Bill #${billPreview?.billNumber || ''}</title>
//           <style>
//             * { margin: 0; padding: 0; box-sizing: border-box; }
//             body {
//               font-family: 'Courier New', monospace;
//               width: 320px;
//               margin: 0 auto;
//               padding: 16px;
//               font-size: 13px;
//               color: #000;
//             }
//             .bill-header { text-align: center; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px dashed #ccc; }
//             .bill-header h2 { font-size: 20px; font-weight: 900; color: #FF6B35; margin-bottom: 4px; }
//             .bill-header p { font-size: 11px; color: #555; margin-top: 2px; }
//             .bill-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
//             .bill-row span:first-child { color: #555; }
//             hr { border: none; border-top: 1px dashed #ccc; margin: 12px 0; }
//             .items-header { display: flex; justify-content: space-between; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #777; padding-bottom: 6px; border-bottom: 1px solid #ccc; margin-bottom: 8px; }
//             .item-row { display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 13px; }
//             .item-name { flex: 1; }
//             .item-qty { margin: 0 12px; }
//             .totals { margin-top: 12px; }
//             .total-row { display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 13px; }
//             .total-row.grand { font-size: 16px; font-weight: 900; border-top: 2px solid #000; padding-top: 8px; margin-top: 6px; color: #FF6B35; }
//             .footer { text-align: center; margin-top: 18px; font-size: 11px; color: #555; }
//             .no-print { display: none !important; }
//           </style>
//         </head>
//         <body>
//           <div class="bill-header">
//             <h2>🍽️ Restaurant</h2>
//             <p>Smart Restaurant Management System</p>
//             <p style="margin-top:4px">${new Date().toLocaleDateString('en-IN')} &nbsp; ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
//           </div>

//           <div class="bill-row"><span>Bill #</span><strong>${billPreview?.billNumber}</strong></div>
//           <div class="bill-row"><span>Order #</span><span>${billPreview?.orderNumber}</span></div>
//           <div class="bill-row"><span>Table</span><span>T${billPreview?.tableNumber}</span></div>
//           <div class="bill-row"><span>Payment</span><span style="font-weight:700;text-transform:uppercase">${paymentMode}</span></div>

//           <hr/>

//           <div class="items-header">
//             <span>Item</span><span>Qty</span><span>Amount</span>
//           </div>

//           ${(billPreview?.items || []).map(item => `
//             <div class="item-row">
//               <span class="item-name">${item.name}</span>
//               <span class="item-qty">×${item.quantity}</span>
//               <span>₹${item.total}</span>
//             </div>
//           `).join('')}

//           <hr/>

//           <div class="totals">
//             <div class="total-row"><span>Subtotal</span><span>₹${billPreview?.subtotal}</span></div>
//             <div class="total-row"><span>GST (5%)</span><span>₹${billPreview?.gstAmount}</span></div>
//             <div class="total-row grand"><span>TOTAL</span><span>₹${billPreview?.totalAmount}</span></div>
//           </div>

//           <div class="footer">
//             <p>Thank you for dining with us! 🙏</p>
//             <p style="margin-top:4px">Please visit again</p>
//           </div>
//         </body>
//       </html>
//     `);
//     printWindow.document.close();
//     printWindow.focus();
//     setTimeout(() => {
//       printWindow.print();
//       printWindow.close();
//     }, 300);
//   };

//   const subtotal = selectedOrder?.totalAmount || 0;
//   const gst = Math.round(subtotal * 5 / 100);
//   const total = subtotal + gst;

//   return (
//     <div>
//       <div className="page-header">
//         <h1>Billing</h1>
//         <div className="flex-gap">
//           <button className={`btn btn-sm ${tab === 'generate' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('generate')}>Generate Bill</button>
//           <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('history')}>Bill History</button>
//         </div>
//       </div>
//       <div className="page-body">
//         {tab === 'generate' && (
//           <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
//             <div>
//               <div className="card mb-16">
//                 <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Select Table / Order</h3>
//                 {orders.length === 0 ? (
//                   <div className="empty-state" style={{ padding: 30 }}><div className="icon">📋</div><p className="text-sm">No orders ready for billing</p></div>
//                 ) : (
//                   <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                     {orders.map(o => (
//                       <div key={o._id} onClick={() => { setSelectedOrder(o); setBillPreview(null); }}
//                         style={{
//                           padding: 14, borderRadius: 8, border: `2px solid ${selectedOrder?._id === o._id ? '#FF6B35' : '#E2E8F0'}`,
//                           cursor: 'pointer', background: selectedOrder?._id === o._id ? '#fff3ee' : 'white',
//                           transition: 'all 0.2s'
//                         }}>
//                         <div className="flex-between">
//                           <strong>Order #{o.orderNumber} — Table T{o.tableNumber}</strong>
//                           <span className="badge badge-orange">₹{o.totalAmount}</span>
//                         </div>
//                         <div className="text-sm text-muted" style={{ marginTop: 4 }}>{o.items.length} items • {o.status}</div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {selectedOrder && (
//                 <div className="card">
//                   <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>Payment Mode</h3>
//                   <div style={{ display: 'flex', gap: 12 }}>
//                     {['cash', 'upi', 'card'].map(m => (
//                       <button key={m} onClick={() => setPaymentMode(m)}
//                         className={`btn ${paymentMode === m ? 'btn-primary' : 'btn-ghost'}`} style={{ flex: 1, textTransform: 'capitalize' }}>
//                         {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m.toUpperCase()}
//                       </button>
//                     ))}
//                   </div>
//                   <button className="btn btn-success w-full btn-lg mt-24" onClick={generateBill} style={{ marginTop: 16 }}>
//                     🧾 Generate & Print Bill
//                   </button>
//                 </div>
//               )}
//             </div>

//             <div>
//               {(selectedOrder || billPreview) && (
//                 <div className="bill-paper" ref={printRef}>
//                   <div className="bill-header">
//                     <h2>🍽️ Restaurant</h2>
//                     <p style={{ fontSize: 13, color: '#718096' }}>Smart Restaurant Management System</p>
//                     <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
//                       {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
//                     </p>
//                   </div>
//                   <div style={{ marginBottom: 14 }}>
//                     <div className="bill-row"><span className="text-muted">Bill #</span><strong>{billPreview?.billNumber || '----'}</strong></div>
//                     <div className="bill-row"><span className="text-muted">Order #</span><span>{selectedOrder?.orderNumber}</span></div>
//                     <div className="bill-row"><span className="text-muted">Table</span><span>T{selectedOrder?.tableNumber}</span></div>
//                     <div className="bill-row"><span className="text-muted">Payment</span><span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{paymentMode}</span></div>
//                   </div>
//                   <hr style={{ borderColor: '#E2E8F0', borderStyle: 'dashed', margin: '14px 0' }} />
//                   <div style={{ marginBottom: 14 }}>
//                     <div className="bill-row" style={{ fontWeight: 700, fontSize: 12, color: '#718096', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
//                       <span>ITEM</span><span>QTY</span><span>AMOUNT</span>
//                     </div>
//                     {selectedOrder?.items.map((item, i) => (
//                       <div key={i} className="bill-row" style={{ marginTop: 8, fontSize: 13 }}>
//                         <span style={{ flex: 1 }}>{item.name}</span>
//                         <span style={{ margin: '0 16px' }}>×{item.quantity}</span>
//                         <span>₹{item.price * item.quantity}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <hr style={{ borderColor: '#E2E8F0', margin: '14px 0' }} />
//                   <div>
//                     <div className="bill-row text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
//                     <div className="bill-row text-sm"><span>GST (5%)</span><span>₹{gst}</span></div>
//                     <div className="bill-row bill-total"><span>TOTAL</span><span style={{ color: '#FF6B35' }}>₹{total}</span></div>
//                   </div>
//                   <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#718096' }}>
//                     <p>Thank you for dining with us! 🙏</p>
//                     <p style={{ marginTop: 4 }}>Visit again soon</p>
//                   </div>
//                   {billPreview && (
//                     <button
//                       className="btn btn-ghost w-full"
//                       onClick={handlePrint}
//                       style={{ marginTop: 16 }}
//                     >
//                       🖨️ Print Bill
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {tab === 'history' && (
//           <div className="table-wrapper">
//             <table>
//               <thead>
//                 <tr><th>Bill #</th><th>Order #</th><th>Table</th><th>Subtotal</th><th>GST</th><th>Total</th><th>Payment</th><th>Date & Time</th></tr>
//               </thead>
//               <tbody>
//                 {bills.length === 0 && (
//                   <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 40 }}>No bills found</td></tr>
//                 )}
//                 {bills.map(b => (
//                   <tr key={b._id}>
//                     <td><strong>#{b.billNumber}</strong></td>
//                     <td>#{b.orderNumber}</td>
//                     <td>T{b.tableNumber}</td>
//                     <td>₹{b.subtotal}</td>
//                     <td>₹{b.gstAmount}</td>
//                     <td><strong style={{ color: '#FF6B35' }}>₹{b.totalAmount}</strong></td>
//                     <td>
//                       <span className={`badge ${b.paymentMode === 'cash' ? 'badge-green' : b.paymentMode === 'upi' ? 'badge-blue' : 'badge-purple'}`}>
//                         {b.paymentMode === 'cash' ? '💵' : b.paymentMode === 'upi' ? '📱' : '💳'} {b.paymentMode}
//                       </span>
//                     </td>
//                     <td className="text-sm text-muted">{new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


















// import React, { useEffect, useState, useRef } from 'react';
// import axios from 'axios';
// import toast from 'react-hot-toast';

// // ✅ Shared print function — opens a clean receipt-only print window
// const printBill = (bill, paymentMode) => {
//   const mode = bill.paymentMode || paymentMode || 'cash';
//   const printWindow = window.open('', '_blank', 'width=420,height=750');
//   printWindow.document.write(`
//     <!DOCTYPE html>
//     <html>
//       <head>
//         <title>Bill #${bill.billNumber}</title>
//         <style>
//           * { margin: 0; padding: 0; box-sizing: border-box; }
//           body {
//             font-family: 'Courier New', monospace;
//             width: 320px;
//             margin: 0 auto;
//             padding: 20px 16px;
//             font-size: 13px;
//             color: #000;
//           }
//           .center { text-align: center; }
//           .bold { font-weight: 700; }
//           .header { text-align: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2px dashed #aaa; }
//           .header h2 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
//           .header p { font-size: 11px; color: #555; margin-top: 2px; }
//           .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
//           .info-row span:first-child { color: #555; }
//           .dashed { border: none; border-top: 1px dashed #aaa; margin: 10px 0; }
//           .solid { border: none; border-top: 2px solid #000; margin: 10px 0; }
//           .items-head { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #666; padding-bottom: 6px; border-bottom: 1px solid #ccc; margin-bottom: 8px; }
//           .item-row { display: flex; justify-content: space-between; margin-bottom: 7px; font-size: 13px; }
//           .item-name { flex: 1; }
//           .item-qty { margin: 0 14px; text-align: center; min-width: 28px; }
//           .item-amt { text-align: right; min-width: 50px; }
//           .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
//           .grand-total { display: flex; justify-content: space-between; font-size: 17px; font-weight: 900; padding-top: 8px; border-top: 2px solid #000; margin-top: 6px; }
//           .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #555; line-height: 1.8; }
//           .badge { background: #eee; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; font-size: 12px; }
//         </style>
//       </head>
//       <body>
//         <div class="header">
//           <h2>&#127869; Restaurant</h2>
//           <p>Smart Restaurant Management System</p>
//           <p style="margin-top:5px">${new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} &nbsp;|&nbsp; ${new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
//         </div>

//         <div class="info-row"><span>Bill No.</span><strong>#${bill.billNumber}</strong></div>
//         <div class="info-row"><span>Order No.</span><span>#${bill.orderNumber}</span></div>
//         <div class="info-row"><span>Table</span><span>T${bill.tableNumber}</span></div>
//         <div class="info-row"><span>Guests</span><span>${bill.customerCount || 1}</span></div>
//         <div class="info-row"><span>Payment</span><span class="badge">${mode.toUpperCase()}</span></div>

//         <hr class="dashed"/>

//         <div class="items-head">
//           <span class="item-name">Item</span>
//           <span class="item-qty">Qty</span>
//           <span class="item-amt">Amount</span>
//         </div>

//         ${(bill.items || []).map(item => `
//           <div class="item-row">
//             <span class="item-name">${item.name}</span>
//             <span class="item-qty">x${item.quantity}</span>
//             <span class="item-amt">&#8377;${item.total}</span>
//           </div>
//         `).join('')}

//         <hr class="dashed"/>

//         <div class="total-row"><span>Subtotal</span><span>&#8377;${bill.subtotal}</span></div>
//         <div class="total-row"><span>GST @ 5%</span><span>&#8377;${bill.gstAmount}</span></div>
//         <div class="grand-total"><span>TOTAL</span><span>&#8377;${bill.totalAmount}</span></div>

//         <div class="footer">
//           <p>&#9733; Thank you for dining with us! &#9733;</p>
//           <p>Please visit again soon</p>
//           <p style="margin-top:8px;font-size:10px;color:#999">Powered by SRMS</p>
//         </div>
//       </body>
//     </html>
//   `);
//   printWindow.document.close();
//   printWindow.focus();
//   setTimeout(() => { printWindow.print(); printWindow.close(); }, 350);
// };

// export default function Billing() {
//   const [orders, setOrders] = useState([]);
//   const [bills, setBills] = useState([]);
//   const [selectedOrder, setSelectedOrder] = useState(null);
//   const [paymentMode, setPaymentMode] = useState('cash');
//   const [billPreview, setBillPreview] = useState(null);
//   const [tab, setTab] = useState('generate');
//   const printRef = useRef();

//   const loadOrders = async () => {
//     const res = await axios.get('/api/orders?active=true');
//     setOrders(res.data.filter(o => ['ready', 'served', 'preparing', 'accepted'].includes(o.status)));
//   };

//   const loadBills = async () => {
//     const res = await axios.get('/api/bills');
//     setBills(res.data);
//   };

//   useEffect(() => { loadOrders(); loadBills(); }, []);

//   const generateBill = async () => {
//     if (!selectedOrder) return;
//     try {
//       const res = await axios.post('/api/bills', { orderId: selectedOrder._id, paymentMode });
//       setBillPreview(res.data);
//       toast.success('Bill generated!');
//       loadOrders();
//       loadBills();
//     } catch (err) {
//       toast.error(err.response?.data?.message || 'Error generating bill');
//     }
//   };

//   const subtotal = selectedOrder?.totalAmount || 0;
//   const gst = Math.round(subtotal * 5 / 100);
//   const total = subtotal + gst;

//   return (
//     <div>
//       <div className="page-header">
//         <h1>Billing</h1>
//         <div className="flex-gap">
//           <button className={`btn btn-sm ${tab === 'generate' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('generate')}>Generate Bill</button>
//           <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('history')}>Bill History</button>
//         </div>
//       </div>

//       <div className="page-body">
//         {tab === 'generate' && (
//           <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
//             {/* Left: Select order + payment */}
//             <div>
//               <div className="card mb-16">
//                 <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Select Table / Order</h3>
//                 {orders.length === 0 ? (
//                   <div className="empty-state" style={{ padding: 30 }}>
//                     <div className="icon">📋</div>
//                     <p className="text-sm">No orders ready for billing</p>
//                   </div>
//                 ) : (
//                   <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
//                     {orders.map(o => (
//                       <div key={o._id} onClick={() => { setSelectedOrder(o); setBillPreview(null); }}
//                         style={{
//                           padding: 14, borderRadius: 8,
//                           border: `2px solid ${selectedOrder?._id === o._id ? '#FF6B35' : '#E2E8F0'}`,
//                           cursor: 'pointer',
//                           background: selectedOrder?._id === o._id ? '#fff3ee' : 'white',
//                           transition: 'all 0.2s'
//                         }}>
//                         <div className="flex-between">
//                           <strong>Order #{o.orderNumber} — Table T{o.tableNumber}</strong>
//                           <span className="badge badge-orange">₹{o.totalAmount}</span>
//                         </div>
//                         <div className="text-sm text-muted" style={{ marginTop: 4 }}>{o.items.length} items • {o.status}</div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>

//               {selectedOrder && (
//                 <div className="card">
//                   <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>Payment Mode</h3>
//                   <div style={{ display: 'flex', gap: 12 }}>
//                     {['cash', 'upi', 'card'].map(m => (
//                       <button key={m} onClick={() => setPaymentMode(m)}
//                         className={`btn ${paymentMode === m ? 'btn-primary' : 'btn-ghost'}`}
//                         style={{ flex: 1, textTransform: 'capitalize' }}>
//                         {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m.toUpperCase()}
//                       </button>
//                     ))}
//                   </div>
//                   <button className="btn btn-success w-full btn-lg" onClick={generateBill} style={{ marginTop: 16 }}>
//                     🧾 Generate & Print Bill
//                   </button>
//                 </div>
//               )}
//             </div>

//             {/* Right: Bill preview */}
//             <div>
//               {(selectedOrder || billPreview) && (
//                 <div className="bill-paper" ref={printRef}>
//                   <div className="bill-header">
//                     <h2>🍽️ Restaurant</h2>
//                     <p style={{ fontSize: 13, color: '#718096' }}>Smart Restaurant Management System</p>
//                     <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
//                       {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
//                     </p>
//                   </div>
//                   <div style={{ marginBottom: 14 }}>
//                     <div className="bill-row"><span className="text-muted">Bill #</span><strong>{billPreview?.billNumber || '----'}</strong></div>
//                     <div className="bill-row"><span className="text-muted">Order #</span><span>{selectedOrder?.orderNumber}</span></div>
//                     <div className="bill-row"><span className="text-muted">Table</span><span>T{selectedOrder?.tableNumber}</span></div>
//                     <div className="bill-row"><span className="text-muted">Payment</span><span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{paymentMode}</span></div>
//                   </div>
//                   <hr style={{ borderColor: '#E2E8F0', borderStyle: 'dashed', margin: '14px 0' }} />
//                   <div style={{ marginBottom: 14 }}>
//                     <div className="bill-row" style={{ fontWeight: 700, fontSize: 12, color: '#718096', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
//                       <span>ITEM</span><span>QTY</span><span>AMOUNT</span>
//                     </div>
//                     {selectedOrder?.items.map((item, i) => (
//                       <div key={i} className="bill-row" style={{ marginTop: 8, fontSize: 13 }}>
//                         <span style={{ flex: 1 }}>{item.name}</span>
//                         <span style={{ margin: '0 16px' }}>×{item.quantity}</span>
//                         <span>₹{item.price * item.quantity}</span>
//                       </div>
//                     ))}
//                   </div>
//                   <hr style={{ borderColor: '#E2E8F0', margin: '14px 0' }} />
//                   <div>
//                     <div className="bill-row text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
//                     <div className="bill-row text-sm"><span>GST (5%)</span><span>₹{gst}</span></div>
//                     <div className="bill-row bill-total"><span>TOTAL</span><span style={{ color: '#FF6B35' }}>₹{total}</span></div>
//                   </div>
//                   <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#718096' }}>
//                     <p>Thank you for dining with us! 🙏</p>
//                     <p style={{ marginTop: 4 }}>Visit again soon</p>
//                   </div>
//                   {billPreview && (
//                     <button
//                       className="btn btn-primary w-full"
//                       onClick={() => printBill(billPreview, paymentMode)}
//                       style={{ marginTop: 16 }}>
//                       🖨️ Print Bill
//                     </button>
//                   )}
//                 </div>
//               )}
//             </div>
//           </div>
//         )}

//         {/* ✅ BILL HISTORY with Print & Download column */}
//         {tab === 'history' && (
//           <div className="table-wrapper">
//             <table>
//               <thead>
//                 <tr>
//                   <th>BILL #</th>
//                   <th>ORDER #</th>
//                   <th>TABLE</th>
//                   <th>SUBTOTAL</th>
//                   <th>GST</th>
//                   <th>TOTAL</th>
//                   <th>PAYMENT</th>
//                   <th>DATE & TIME</th>
//                   <th>ACTION</th>
//                 </tr>
//               </thead>
//               <tbody>
//                 {bills.length === 0 && (
//                   <tr>
//                     <td colSpan={9} className="text-center text-muted" style={{ padding: 40 }}>
//                       No bills found
//                     </td>
//                   </tr>
//                 )}
//                 {bills.map(b => (
//                   <tr key={b._id}>
//                     <td><strong>#{b.billNumber}</strong></td>
//                     <td>#{b.orderNumber}</td>
//                     <td>T{b.tableNumber}</td>
//                     <td>₹{b.subtotal}</td>
//                     <td>₹{b.gstAmount}</td>
//                     <td><strong style={{ color: '#FF6B35' }}>₹{b.totalAmount}</strong></td>
//                     <td>
//                       <span className={`badge ${b.paymentMode === 'cash' ? 'badge-green' : b.paymentMode === 'upi' ? 'badge-blue' : 'badge-purple'}`}>
//                         {b.paymentMode === 'cash' ? '💵' : b.paymentMode === 'upi' ? '📱' : '💳'} {b.paymentMode}
//                       </span>
//                     </td>
//                     <td className="text-sm text-muted">
//                       {new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
//                     </td>

//                     {/* ✅ NEW: Print & Download buttons */}
//                     <td>
//                       <div className="flex-gap" style={{ gap: 6 }}>
//                         {/* 🖨️ Print Bill */}
//                         <button
//                           onClick={() => printBill(b)}
//                           title="Print Bill"
//                           style={{
//                             display: 'inline-flex', alignItems: 'center', gap: 5,
//                             padding: '5px 10px', borderRadius: 6, border: '1.5px solid #E2E8F0',
//                             background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
//                             color: '#2D3748', transition: 'all 0.2s', whiteSpace: 'nowrap'
//                           }}
//                           onMouseEnter={e => { e.currentTarget.style.background = '#EBF8FF'; e.currentTarget.style.borderColor = '#3182ce'; e.currentTarget.style.color = '#3182ce'; }}
//                           onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#2D3748'; }}
//                         >
//                           🖨️ Print
//                         </button>

//                         {/* ⬇️ Download Bill as text */}
//                         <button
//                           onClick={() => {
//                             const lines = [
//                               '================================',
//                               '        🍽️  RESTAURANT',
//                               '  Smart Restaurant Mgmt System',
//                               '================================',
//                               `Date  : ${new Date(b.createdAt).toLocaleString('en-IN')}`,
//                               `Bill# : #${b.billNumber}`,
//                               `Order#: #${b.orderNumber}`,
//                               `Table : T${b.tableNumber}`,
//                               `Pay   : ${(b.paymentMode || '').toUpperCase()}`,
//                               '--------------------------------',
//                               'ITEM                  QTY  AMT',
//                               '--------------------------------',
//                               ...(b.items || []).map(item =>
//                                 `${item.name.padEnd(20).slice(0, 20)}  x${String(item.quantity).padStart(2)}  ₹${item.total}`
//                               ),
//                               '--------------------------------',
//                               `Subtotal              ₹${b.subtotal}`,
//                               `GST (5%)              ₹${b.gstAmount}`,
//                               '================================',
//                               `TOTAL                 ₹${b.totalAmount}`,
//                               '================================',
//                               '',
//                               '  Thank you for dining with us!',
//                               '       Please visit again',
//                               '================================',
//                             ];
//                             const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
//                             const url = URL.createObjectURL(blob);
//                             const a = document.createElement('a');
//                             a.href = url;
//                             a.download = `Bill_${b.billNumber}_T${b.tableNumber}.txt`;
//                             a.click();
//                             URL.revokeObjectURL(url);
//                             toast.success(`Bill #${b.billNumber} downloaded`);
//                           }}
//                           title="Download Bill"
//                           style={{
//                             display: 'inline-flex', alignItems: 'center', gap: 5,
//                             padding: '5px 10px', borderRadius: 6, border: '1.5px solid #E2E8F0',
//                             background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
//                             color: '#2D3748', transition: 'all 0.2s', whiteSpace: 'nowrap'
//                           }}
//                           onMouseEnter={e => { e.currentTarget.style.background = '#F0FFF4'; e.currentTarget.style.borderColor = '#38a169'; e.currentTarget.style.color = '#38a169'; }}
//                           onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#2D3748'; }}
//                         >
//                           ⬇️ Download
//                         </button>
//                       </div>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }




















import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// ✅ Shared print function — opens a clean receipt-only print window
const printBill = (bill, paymentMode) => {
  const mode = bill.paymentMode || paymentMode || 'cash';
  const printWindow = window.open('', '_blank', 'width=420,height=750');
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
            padding: 20px 16px;
            font-size: 13px;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: 700; }
          .header { text-align: center; margin-bottom: 14px; padding-bottom: 12px; border-bottom: 2px dashed #aaa; }
          .header h2 { font-size: 22px; font-weight: 900; margin-bottom: 4px; }
          .header p { font-size: 11px; color: #555; margin-top: 2px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 5px; font-size: 13px; }
          .info-row span:first-child { color: #555; }
          .dashed { border: none; border-top: 1px dashed #aaa; margin: 10px 0; }
          .solid { border: none; border-top: 2px solid #000; margin: 10px 0; }
          .items-head { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #666; padding-bottom: 6px; border-bottom: 1px solid #ccc; margin-bottom: 8px; }
          .item-row { display: flex; justify-content: space-between; margin-bottom: 7px; font-size: 13px; }
          .item-name { flex: 1; }
          .item-qty { margin: 0 14px; text-align: center; min-width: 28px; }
          .item-amt { text-align: right; min-width: 50px; }
          .total-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 5px; }
          .grand-total { display: flex; justify-content: space-between; font-size: 17px; font-weight: 900; padding-top: 8px; border-top: 2px solid #000; margin-top: 6px; }
          .footer { text-align: center; margin-top: 20px; font-size: 11px; color: #555; line-height: 1.8; }
          .badge { background: #eee; padding: 2px 8px; border-radius: 4px; font-weight: 700; text-transform: uppercase; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h2>&#127869; Restaurant</h2>
          <p>Smart Restaurant Management System</p>
          <p style="margin-top:5px">${new Date(bill.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} &nbsp;|&nbsp; ${new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        <div class="info-row"><span>Bill No.</span><strong>#${bill.billNumber}</strong></div>
        <div class="info-row"><span>Order No.</span><span>#${bill.orderNumber}</span></div>
        <div class="info-row"><span>Table</span><span>T${bill.tableNumber}</span></div>
        <div class="info-row"><span>Guests</span><span>${bill.customerCount || 1}</span></div>
        <div class="info-row"><span>Payment</span><span class="badge">${mode.toUpperCase()}</span></div>

        <hr class="dashed"/>

        <div class="items-head">
          <span class="item-name">Item</span>
          <span class="item-qty">Qty</span>
          <span class="item-amt">Amount</span>
        </div>

        ${(bill.items || []).map(item => `
          <div class="item-row">
            <span class="item-name">${item.name}</span>
            <span class="item-qty">x${item.quantity}</span>
            <span class="item-amt">&#8377;${item.total}</span>
          </div>
        `).join('')}

        <hr class="dashed"/>

        <div class="total-row"><span>Subtotal</span><span>&#8377;${bill.subtotal}</span></div>
        <div class="total-row"><span>GST @ 5%</span><span>&#8377;${bill.gstAmount}</span></div>
        <div class="grand-total"><span>TOTAL</span><span>&#8377;${bill.totalAmount}</span></div>

        <div class="footer">
          <p>&#9733; Thank you for dining with us! &#9733;</p>
          <p>Please visit again soon</p>
          <p style="margin-top:8px;font-size:10px;color:#999">Powered by SRMS</p>
        </div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 350);
};

export default function Billing() {
  const [orders, setOrders] = useState([]);
  const [bills, setBills] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [paymentMode, setPaymentMode] = useState('cash');
  const [billPreview, setBillPreview] = useState(null);
  const [tab, setTab] = useState('generate');
  const [generating, setGenerating] = useState(false);   // ✅ loading state
  const [billGenerated, setBillGenerated] = useState(false); // ✅ one-time lock
  const printRef = useRef();

  const loadOrders = async () => {
    const res = await axios.get('/api/orders?active=true');
    setOrders(res.data.filter(o => ['ready', 'served', 'preparing', 'accepted'].includes(o.status)));
  };

  const loadBills = async () => {
    const res = await axios.get('/api/bills');
    setBills(res.data);
  };

  useEffect(() => { loadOrders(); loadBills(); }, []);

  // Reset lock when a different order is selected
  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setBillPreview(null);
    setBillGenerated(false); // ✅ allow generate for new order
    setGenerating(false);
  };

  const generateBill = async () => {
    if (!selectedOrder) return;
    if (generating || billGenerated) return; // ✅ hard block double clicks
    setGenerating(true);
    try {
      const res = await axios.post('/api/bills', { orderId: selectedOrder._id, paymentMode });
      setBillPreview(res.data);
      setBillGenerated(true); // ✅ lock button permanently after success
      toast.success('Bill generated!');
      loadOrders();
      loadBills();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error generating bill');
      setGenerating(false); // ✅ unlock only on error so admin can retry
    }
  };

  const subtotal = selectedOrder?.totalAmount || 0;
  const gst = Math.round(subtotal * 5 / 100);
  const total = subtotal + gst;

  return (
    <div>
      <div className="page-header">
        <h1>Billing</h1>
        <div className="flex-gap">
          <button className={`btn btn-sm ${tab === 'generate' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('generate')}>Generate Bill</button>
          <button className={`btn btn-sm ${tab === 'history' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab('history')}>Bill History</button>
        </div>
      </div>

      <div className="page-body">
        {tab === 'generate' && (
          <div className="grid-2" style={{ gap: 24, alignItems: 'start' }}>
            {/* Left: Select order + payment */}
            <div>
              <div className="card mb-16">
                <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 16 }}>Select Table / Order</h3>
                {orders.length === 0 ? (
                  <div className="empty-state" style={{ padding: 30 }}>
                    <div className="icon">📋</div>
                    <p className="text-sm">No orders ready for billing</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {orders.map(o => (
                      <div key={o._id} onClick={() => handleSelectOrder(o)}
                        style={{
                          padding: 14, borderRadius: 8,
                          border: `2px solid ${selectedOrder?._id === o._id ? '#FF6B35' : '#E2E8F0'}`,
                          cursor: 'pointer',
                          background: selectedOrder?._id === o._id ? '#fff3ee' : 'white',
                          transition: 'all 0.2s'
                        }}>
                        <div className="flex-between">
                          <strong>Order #{o.orderNumber} — Table T{o.tableNumber}</strong>
                          <span className="badge badge-orange">₹{o.totalAmount}</span>
                        </div>
                        <div className="text-sm text-muted" style={{ marginTop: 4 }}>{o.items.length} items • {o.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedOrder && (
                <div className="card">
                  <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem', marginBottom: 14 }}>Payment Mode</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {['cash', 'upi', 'card'].map(m => (
                      <button key={m} onClick={() => setPaymentMode(m)}
                        className={`btn ${paymentMode === m ? 'btn-primary' : 'btn-ghost'}`}
                        style={{ flex: 1, textTransform: 'capitalize' }}>
                        {m === 'cash' ? '💵' : m === 'upi' ? '📱' : '💳'} {m.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <button
                    className="btn w-full btn-lg"
                    onClick={generateBill}
                    disabled={generating || billGenerated}
                    style={{
                      marginTop: 16,
                      background: billGenerated
                        ? '#C6F6D5'          // green-light = done
                        : generating
                          ? '#CBD5E0'        // gray = loading
                          : '#38a169',       // green = ready
                      color: billGenerated
                        ? '#276749'
                        : generating
                          ? '#718096'
                          : 'white',
                      cursor: (generating || billGenerated) ? 'not-allowed' : 'pointer',
                      border: 'none',
                      transition: 'all 0.3s',
                      opacity: 1,           // keep fully visible, not faded
                    }}
                  >
                    {billGenerated
                      ? '✅ Bill Already Generated'
                      : generating
                        ? '⏳ Generating...'
                        : '🧾 Generate & Print Bill'}
                  </button>

                  {billGenerated && (
                    <p style={{
                      marginTop: 10, fontSize: 12, color: '#276749',
                      textAlign: 'center', fontWeight: 600,
                      background: '#F0FFF4', padding: '8px 12px',
                      borderRadius: 6, border: '1px solid #9AE6B4'
                    }}>
                      ✅ Bill #{billPreview?.billNumber} generated successfully.<br/>
                      <span style={{ fontWeight: 400, color: '#555' }}>Select another order to generate a new bill.</span>
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Right: Bill preview */}
            <div>
              {(selectedOrder || billPreview) && (
                <div className="bill-paper" ref={printRef}>
                  <div className="bill-header">
                    <h2>🍽️ Restaurant</h2>
                    <p style={{ fontSize: 13, color: '#718096' }}>Smart Restaurant Management System</p>
                    <p style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                      {new Date().toLocaleDateString('en-IN')} {new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <div className="bill-row"><span className="text-muted">Bill #</span><strong>{billPreview?.billNumber || '----'}</strong></div>
                    <div className="bill-row"><span className="text-muted">Order #</span><span>{selectedOrder?.orderNumber}</span></div>
                    <div className="bill-row"><span className="text-muted">Table</span><span>T{selectedOrder?.tableNumber}</span></div>
                    <div className="bill-row"><span className="text-muted">Payment</span><span style={{ textTransform: 'uppercase', fontWeight: 600 }}>{paymentMode}</span></div>
                  </div>
                  <hr style={{ borderColor: '#E2E8F0', borderStyle: 'dashed', margin: '14px 0' }} />
                  <div style={{ marginBottom: 14 }}>
                    <div className="bill-row" style={{ fontWeight: 700, fontSize: 12, color: '#718096', borderBottom: '1px solid #E2E8F0', paddingBottom: 8 }}>
                      <span>ITEM</span><span>QTY</span><span>AMOUNT</span>
                    </div>
                    {selectedOrder?.items.map((item, i) => (
                      <div key={i} className="bill-row" style={{ marginTop: 8, fontSize: 13 }}>
                        <span style={{ flex: 1 }}>{item.name}</span>
                        <span style={{ margin: '0 16px' }}>×{item.quantity}</span>
                        <span>₹{item.price * item.quantity}</span>
                      </div>
                    ))}
                  </div>
                  <hr style={{ borderColor: '#E2E8F0', margin: '14px 0' }} />
                  <div>
                    <div className="bill-row text-sm"><span>Subtotal</span><span>₹{subtotal}</span></div>
                    <div className="bill-row text-sm"><span>GST (5%)</span><span>₹{gst}</span></div>
                    <div className="bill-row bill-total"><span>TOTAL</span><span style={{ color: '#FF6B35' }}>₹{total}</span></div>
                  </div>
                  <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: '#718096' }}>
                    <p>Thank you for dining with us! 🙏</p>
                    <p style={{ marginTop: 4 }}>Visit again soon</p>
                  </div>
                  {billPreview && (
                    <button
                      className="btn btn-primary w-full"
                      onClick={() => printBill(billPreview, paymentMode)}
                      style={{ marginTop: 16 }}>
                      🖨️ Print Bill
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ✅ BILL HISTORY with Print & Download column */}
        {tab === 'history' && (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>BILL #</th>
                  <th>ORDER #</th>
                  <th>TABLE</th>
                  <th>SUBTOTAL</th>
                  <th>GST</th>
                  <th>TOTAL</th>
                  <th>PAYMENT</th>
                  <th>DATE & TIME</th>
                  <th>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {bills.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center text-muted" style={{ padding: 40 }}>
                      No bills found
                    </td>
                  </tr>
                )}
                {bills.map(b => (
                  <tr key={b._id}>
                    <td><strong>#{b.billNumber}</strong></td>
                    <td>#{b.orderNumber}</td>
                    <td>T{b.tableNumber}</td>
                    <td>₹{b.subtotal}</td>
                    <td>₹{b.gstAmount}</td>
                    <td><strong style={{ color: '#FF6B35' }}>₹{b.totalAmount}</strong></td>
                    <td>
                      <span className={`badge ${b.paymentMode === 'cash' ? 'badge-green' : b.paymentMode === 'upi' ? 'badge-blue' : 'badge-purple'}`}>
                        {b.paymentMode === 'cash' ? '💵' : b.paymentMode === 'upi' ? '📱' : '💳'} {b.paymentMode}
                      </span>
                    </td>
                    <td className="text-sm text-muted">
                      {new Date(b.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>

                    {/* ✅ NEW: Print & Download buttons */}
                    <td>
                      <div className="flex-gap" style={{ gap: 6 }}>
                        {/* 🖨️ Print Bill */}
                        <button
                          onClick={() => printBill(b)}
                          title="Print Bill"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', borderRadius: 6, border: '1.5px solid #E2E8F0',
                            background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            color: '#2D3748', transition: 'all 0.2s', whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#EBF8FF'; e.currentTarget.style.borderColor = '#3182ce'; e.currentTarget.style.color = '#3182ce'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#2D3748'; }}
                        >
                          🖨️ Print
                        </button>

                        {/* ⬇️ Download Bill as text */}
                        <button
                          onClick={() => {
                            const lines = [
                              '================================',
                              '        🍽️  RESTAURANT',
                              '  Smart Restaurant Mgmt System',
                              '================================',
                              `Date  : ${new Date(b.createdAt).toLocaleString('en-IN')}`,
                              `Bill# : #${b.billNumber}`,
                              `Order#: #${b.orderNumber}`,
                              `Table : T${b.tableNumber}`,
                              `Pay   : ${(b.paymentMode || '').toUpperCase()}`,
                              '--------------------------------',
                              'ITEM                  QTY  AMT',
                              '--------------------------------',
                              ...(b.items || []).map(item =>
                                `${item.name.padEnd(20).slice(0, 20)}  x${String(item.quantity).padStart(2)}  ₹${item.total}`
                              ),
                              '--------------------------------',
                              `Subtotal              ₹${b.subtotal}`,
                              `GST (5%)              ₹${b.gstAmount}`,
                              '================================',
                              `TOTAL                 ₹${b.totalAmount}`,
                              '================================',
                              '',
                              '  Thank you for dining with us!',
                              '       Please visit again',
                              '================================',
                            ];
                            const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `Bill_${b.billNumber}_T${b.tableNumber}.txt`;
                            a.click();
                            URL.revokeObjectURL(url);
                            toast.success(`Bill #${b.billNumber} downloaded`);
                          }}
                          title="Download Bill"
                          style={{
                            display: 'inline-flex', alignItems: 'center', gap: 5,
                            padding: '5px 10px', borderRadius: 6, border: '1.5px solid #E2E8F0',
                            background: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 600,
                            color: '#2D3748', transition: 'all 0.2s', whiteSpace: 'nowrap'
                          }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#F0FFF4'; e.currentTarget.style.borderColor = '#38a169'; e.currentTarget.style.color = '#38a169'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#2D3748'; }}
                        >
                          ⬇️ Download
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}