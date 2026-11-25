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
          <span>
            {user?.role === 'hrd'
              ? `Data diperbarui pukul ${new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(new Date())} WIB • ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date())}`
              : `${portalLabel} • Informasi hanya untuk akun Anda`}
          </span>
        </footer>
      </div>
    </div>
  );
};

export default MainLayout;
