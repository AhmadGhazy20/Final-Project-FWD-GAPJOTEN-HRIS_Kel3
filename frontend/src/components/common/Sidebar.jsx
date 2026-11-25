import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const spvLinks = [
  { to: '/', label: 'Ringkasan tim', end: true },
  { to: '/my-attendance', label: 'Absensi saya' },
  { to: '/team', label: 'Anggota tim' },
  { to: '/leave-requests', label: 'Persetujuan tim' },
  { to: '/attendance-recap', label: 'Rekap kehadiran tim' },
  { to: '/settings', label: 'Pengaturan' },
  { to: '/help', label: 'Pusat bantuan' },
];

const defaultLinks = [
  { to: '/', label: 'Dashboard', end: true },
  { to: '/employees', label: 'Data Pegawai' },
  { to: '/team', label: 'Anggota tim' },
  { to: '/settings', label: 'Pengaturan' },
  { to: '/help', label: 'Pusat bantuan' },
];

const Sidebar = () => {
  const { user } = useAuth();
  const isSpv = user?.role === 'spv';
  const links = isSpv ? spvLinks : defaultLinks;

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-mark">G</div>
        <div>
          <div className="brand-title">GAPJOTEN</div>
          <div className="brand-subtitle">PT Gapjoten Teknologi</div>
        </div>
      </div>

      <div className="portal-badge">{isSpv ? 'PORTAL SPV' : 'PORTAL HRIS'}</div>

      <nav className="sidebar-nav">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-dot" />
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="trust-card">
          <div className="trust-title">Data Anda terlindungi</div>
          <div className="trust-subtitle">Akses hanya untuk role yang berhak.</div>
        </div>
        <div className="workspace-label">Workspace</div>
      </div>
    </aside>
  );
};

export default Sidebar;
