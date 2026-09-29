import React, { useEffect, useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const STATUS_FLOW = ['pending', 'accepted', 'preparing', 'ready', 'served', 'completed'];
const STATUS_COLORS = {
  pending: 'badge-orange', accepted: 'badge-blue', preparing: 'badge-purple',
  ready: 'badge-green', served: 'badge-green', completed: 'badge-gray', cancelled: 'badge-red'
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('active');
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

  return (
    <div>
      <div className="page-header">
        <h1>Orders</h1>
        <div className="flex-gap">
          {['active', 'pending', 'preparing', 'ready', 'completed', 'all'].map(f => (
            <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setFilter(f)} style={{ textTransform: 'capitalize' }}>{f}</button>
          ))}
        </div>
      </div>
      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 380px' : '1fr', gap: 20 }}>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr><th>Order #</th><th>Table</th><th>Items</th><th>Amount</th><th>Waiter</th><th>Status</th><th>Time</th><th>Action</th></tr>
              </thead>
              <tbody>
                {orders.length === 0 && (
                  <tr><td colSpan={8} className="text-center text-muted" style={{ padding: 40 }}>No orders found</td></tr>
                )}
                {orders.map(o => (
                  <tr key={o._id} onClick={() => setSelected(selected?._id === o._id ? null : o)}
                    style={{ cursor: 'pointer', background: selected?._id === o._id ? '#fff3ee' : '' }}>
                    <td><strong>#{o.orderNumber}</strong></td>
                    <td>T{o.tableNumber}</td>
                    <td>{o.items.length} items</td>
                    <td><strong>₹{o.totalAmount}</strong></td>
                    <td className="text-sm">{o.waiterName || '-'}</td>
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
                  <span className="text-muted">Table</span><strong>T{selected.tableNumber}</strong>
                </div>
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <span className="text-muted">Status</span>
                  <span className={`badge ${STATUS_COLORS[selected.status]}`}>{selected.status}</span>
                </div>
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <span className="text-muted">Waiter</span><span>{selected.waiterName || '-'}</span>
                </div>
                <div className="flex-between">
                  <span className="text-muted">Customers</span><span>{selected.customerCount}</span>
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
              <div className="flex-between font-bold">
                <span>Total</span><span style={{ color: '#FF6B35', fontSize: '1.1rem' }}>₹{selected.totalAmount}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
