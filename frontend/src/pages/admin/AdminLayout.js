import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from '../../components/shared/Sidebar';
import Dashboard from './Dashboard';
import Tables from './Tables';
import Menu from './Menu';
import Orders from './Orders';
import Billing from './Billing';
import Reports from './Reports';
import Staff from './Staff';

export default function AdminLayout() {
  return (
    <div className="app-layout">
      <Sidebar role="admin" />
      <div className="main-content">
        <Routes>
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="tables" element={<Tables />} />
          <Route path="menu" element={<Menu />} />
          <Route path="orders" element={<Orders />} />
          <Route path="billing" element={<Billing />} />
          <Route path="reports" element={<Reports />} />
          <Route path="staff" element={<Staff />} />
          <Route path="*" element={<Navigate to="dashboard" />} />
        </Routes>
      </div>
    </div>
  );
}
