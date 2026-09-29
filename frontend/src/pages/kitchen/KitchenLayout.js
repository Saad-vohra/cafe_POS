import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../../components/shared/Sidebar';
import KitchenOrders from './KitchenOrders';
import KitchenCompleted from './KitchenCompleted';
import { SocketProvider } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

export default function KitchenLayout() {
  const { user } = useAuth();
  return (
    <SocketProvider role="kitchen">
      <div className="app-layout">
        <Sidebar role={user?.role === 'admin' ? 'admin' : 'kitchen'} />
        <div className="main-content">
          <Routes>
            <Route path="orders" element={<KitchenOrders />} />
            <Route path="completed" element={<KitchenCompleted />} />
            <Route path="*" element={<Navigate to="orders" />} />
          </Routes>
        </div>
      </div>
    </SocketProvider>
  );
}
