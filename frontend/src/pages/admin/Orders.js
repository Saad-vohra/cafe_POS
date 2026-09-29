import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

import { useNavigate } from 'react-router-dom';

const STATUS_FLOW = ['pending', 'accepted', 'preparing', 'ready', 'served', 'completed'];
const STATUS_COLORS = {
  pending: 'badge-orange', accepted: 'badge-blue', preparing: 'badge-purple',
  ready: 'badge-green', served: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red'
};

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'dine_in' | 'takeaway'
  const [selected, setSelected] = useState(null);

  const load = async () => {
    const query = filter === 'active' ? '?active=true' : filter !== 'all' ? `?status=${filter}` : '';
    const res = await axios.get(`/api/orders${query}`);
    setOrders(res.data);
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    await axios.put(`/api/orders/${id}/status`, { status });
    toast.success(`Order marked as ${status}`);
    load();
    if (selected?._id === id) setSelected(null);
  };

  const cancelOrder = async (id) => {
    if (!window.confirm('Cancel this order?')) return;
    await axios.put(`/api/orders/${id}/status`, { status: 'cancelled' });
    toast.success('Order cancelled');
    load();
    setSelected(null);
  };

  const displayedOrders = orders.filter(o => {
    if (typeFilter === 'takeaway') return o.orderType === 'takeaway';
    if (typeFilter === 'dine_in') return o.orderType !== 'takeaway';
    return true;
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Orders</h1>
          <p className="text-muted text-sm" style={{ marginTop: 2 }}>Manage dine-in tables and takeaway parcel orders</p>
        </div>
        <div className="flex-gap">
          <button
            className="btn btn-primary btn-sm"
            onClick={() => navigate('/admin/takeaway')}
            style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            🛍️ New Takeaway Order
          </button>
        </div>
      </div>

      <div className="page-body">
        {/* Filter Toolbar */}
        <div className="card mb-16" style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          {/* Status Filters */}
          <div className="flex-gap" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#718096', marginRight: 4 }}>Status:</span>
            {['active', 'pending', 'preparing', 'ready', 'completed', 'all'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
            ))}
          </div>

          {/* Type Filters */}
          <div className="flex-gap">
            <span style={{ fontSize: 12, fontWeight: 700, color: '#718096', marginRight: 4 }}>Type:</span>
            <button
              className={`btn btn-sm ${typeFilter === 'all' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('all')}
              style={{ background: typeFilter === 'all' ? '#2D3748' : '', color: typeFilter === 'all' ? 'white' : '' }}
            >
              All Types
            </button>
            <button
              className={`btn btn-sm ${typeFilter === 'dine_in' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('dine_in')}
              style={{ background: typeFilter === 'dine_in' ? '#2B6CB0' : '', color: typeFilter === 'dine_in' ? 'white' : '' }}
            >
              🪑 Dine-In
            </button>
            <button
              className={`btn btn-sm ${typeFilter === 'takeaway' ? 'btn-secondary' : 'btn-ghost'}`}
              onClick={() => setTypeFilter('takeaway')}
              style={{ background: typeFilter === 'takeaway' ? '#6B46C1' : '', color: typeFilter === 'takeaway' ? 'white' : '' }}
            >
              🛍️ Takeaway
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Order Type / Table</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Time</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedOrders.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 40 }}>No orders found</td></tr>
                )}
                {displayedOrders.map(o => (
                  <tr key={o._id} onClick={() => setSelected(selected?._id === o._id ? null : o)}
                    style={{ cursor: 'pointer', background: selected?._id === o._id ? '#fff3ee' : '' }}>
                    <td><strong>#{o.orderNumber}</strong></td>
                    <td>
                      {o.orderType === 'takeaway' ? (
                        <span className="badge" style={{ background: '#FAF5FF', color: '#6B46C1', border: '1px solid #D6BCFA', fontWeight: 700 }}>
                          🛍️ Parcel {o.takeawayToken ? `(${o.takeawayToken})` : ''}
                        </span>
                      ) : (
                        <span className="badge" style={{ background: '#EBF8FF', color: '#2B6CB0', border: '1px solid #BEE3F8', fontWeight: 600 }}>
                          🪑 Table T{o.tableNumber}
                        </span>
                      )}
                    </td>
                    <td className="text-sm">
                      {o.customerName ? (
                        <div>
                          <strong>{o.customerName}</strong>
                          {o.customerPhone && <div style={{ fontSize: 11, color: '#718096' }}>{o.customerPhone}</div>}
                        </div>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>{o.items.length} items</td>
                    <td><strong>₹{o.totalAmount}</strong></td>
                    <td><span className={`badge ${STATUS_COLORS[o.status]}`}>{o.status}</span></td>
                    <td className="text-sm text-muted">{new Date(o.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td onClick={e => e.stopPropagation()}>
                      {!['completed', 'cancelled'].includes(o.status) && (
                        <div className="flex-gap">
                          {STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1] && (
                            <button className="btn btn-sm btn-success"
                              onClick={() => updateStatus(o._id, STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1])}>
                              → {STATUS_FLOW[STATUS_FLOW.indexOf(o.status) + 1]}
                            </button>
                          )}
                          <button className="btn btn-sm btn-danger" onClick={() => cancelOrder(o._id)}>✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {selected && (
            <div className="card" style={{ alignSelf: 'flex-start', position: 'sticky', top: 80 }}>
              <div className="flex-between mb-16">
                <h3 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '1rem' }}>Order #{selected.orderNumber}</h3>
                <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕</button>
              </div>
              <div className="text-sm" style={{ marginBottom: 14 }}>
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <span className="text-muted">{selected.orderType === 'takeaway' ? 'Order Type' : 'Table'}</span>
                  <strong>{selected.orderType === 'takeaway' ? `🛍️ Takeaway / Parcel (${selected.takeawayToken || `#${selected.orderNumber}`})` : `T${selected.tableNumber}`}</strong>
                </div>
                {selected.customerName && (
                  <div className="flex-between" style={{ marginBottom: 6 }}>
                    <span className="text-muted">Customer</span>
                    <strong>{selected.customerName} {selected.customerPhone ? `(${selected.customerPhone})` : ''}</strong>
                  </div>
                )}
                {selected.notes && (
                  <div style={{ background: '#FFF5F5', padding: '6px 10px', borderRadius: 6, border: '1px solid #FEB2B2', fontSize: 12, color: '#C53030', marginBottom: 8 }}>
                    📌 Note: {selected.notes}
                  </div>
                )}
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <span className="text-muted">Status</span>
                  <span className={`badge ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <span className="text-muted">Placed By</span><span>{selected.waiterName || 'Admin'}</span>
                </div>
                <div className="flex-between">
                  <span className="text-muted">Time</span><span>{new Date(selected.createdAt).toLocaleTimeString('en-IN')}</span>
                </div>
              </div>
              <hr style={{ margin: '14px 0', borderColor: '#E2E8F0' }} />
              <div style={{ marginBottom: 14 }}>
                {selected.items.map((item, i) => (
                  <div key={i} className="cart-item">
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                      {item.notes && <div className="text-sm" style={{ color: '#FF6B35', fontStyle: 'italic' }}>📝 {item.notes}</div>}
                    </div>
                    <div className="text-sm">×{item.quantity}</div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>₹{item.price * item.quantity}</div>
                  </div>
                ))}
              </div>
              <hr style={{ margin: '14px 0', borderColor: '#E2E8F0' }} />
              <div className="flex-between font-bold" style={{ marginBottom: 16 }}>
                <span>Total</span><span style={{ color: '#FF6B35', fontSize: '1.1rem' }}>₹{selected.totalAmount}</span>
              </div>

              {!['completed', 'cancelled'].includes(selected.status) && (
                <button
                  className="btn btn-success w-full"
                  onClick={() => navigate('/admin/billing')}
                  style={{ fontWeight: 700 }}
                >
                  💳 Proceed to Billing
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
