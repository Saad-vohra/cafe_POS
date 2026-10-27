import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useSocket } from '../../context/SocketContext';
import BillComposer from '../../components/billing/BillComposer';
import BillReceipt from '../../components/billing/BillReceipt';
import BillableOrderList from '../../components/billing/BillableOrderList';

export default function WaiterBilling() {
  const [orders, setOrders] = useState([]);
  const [selected, setSelected] = useState(null);
  const [billDone, setBillDone] = useState(null);
  const socket = useSocket();

  const load = useCallback(async () => {
    try {
      const res = await axios.get('/api/orders?active=true');
      setOrders(res.data);
      setSelected(prev => (prev ? res.data.find(o => o._id === prev._id) || null : prev));
    } catch {
      toast.error('Could not load orders');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Keep the list live: new items, bill requests, bills settled on another device
  useEffect(() => {
    if (!socket) return;
    const events = ['order-created', 'order-updated', 'order-status-updated', 'bill-requested', 'bill-created'];
    events.forEach(ev => socket.on(ev, load));
    return () => events.forEach(ev => socket.off(ev, load));
  }, [socket, load]);

  if (billDone) {
    return (
      <div>
        <div className="page-header">
          <h1>Bill Generated ✅</h1>
          <div className="flex-gap">
            <button className="btn btn-ghost" onClick={() => { setBillDone(null); setSelected(null); load(); }}>← New Bill</button>
          </div>
        </div>
        <div className="page-body" style={{ display: 'flex', justifyContent: 'center' }}>
          <BillReceipt bill={billDone} />
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
            <BillableOrderList orders={orders} selectedId={selected?._id} onSelect={setSelected} />
          </div>

          {selected && (
            <BillComposer key={selected._id} order={selected} onBilled={(bill) => { setBillDone(bill); load(); }} />
          )}
        </div>
      </div>
    </div>
  );
}
