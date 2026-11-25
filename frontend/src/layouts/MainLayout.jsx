import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar.jsx';
import Navbar from '../components/common/Navbar.jsx';
import { useAuth } from '../hooks/useAuth.js';

const MainLayout = () => {
  const { user } = useAuth();
  const portalLabel = user?.role === 'spv'
    ? 'Portal SPV'
    : user?.role === 'hrd'
      ? 'Portal HRD'
      : 'Portal Karyawan';

  return (
    <div className="layout-container">
      <Sidebar />
      <div className="main-content">
        <Navbar />
        <main className="content-body">
          <Outlet />
        </main>
        <footer className="main-footer">
          <span>&copy; 2026 GAPJOTEN HRIS</span>
          <span>{portalLabel} &bull; Informasi hanya untuk akun Anda</span>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
