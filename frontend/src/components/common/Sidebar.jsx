import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../services/api.js';
import gapjotenLogo from '../../assets/gapjoten-logo.png';

const NavIcon = ({ name }) => {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (name) {
    case 'home':
      return <svg {...props}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case 'face':
      return <svg {...props}><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="10" r="3" /><path d="M7 18c1.5-2 3.2-3 5-3s3.5 1 5 3" /></svg>;
    case 'user':
      return <svg {...props}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case 'calendar':
      return <svg {...props}><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
    case 'chart':
      return <svg {...props}><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>;
    case 'info':
      return <svg {...props}><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>;
    case 'help':
      return <svg {...props}><circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;
    default:
      return <svg {...props}><circle cx="12" cy="12" r="4" /></svg>;
  }
};

const Sidebar = () => {
  const { user } = useAuth();
  const role = user?.role;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (role !== 'karyawan') return;
    api.getKaryawanLeaves({ status: 'pending' })
      .then((res) => setPendingCount((res.data || []).length))
      .catch(() => {});
  }, [role]);

  const karyawanMenu = [
    { to: '/', label: 'Beranda saya', icon: 'home', end: true },
    { to: '/absensi-wajah', label: 'Absensi wajah', icon: 'face' },
    { to: '/profil', label: 'Profil saya', icon: 'user' },
    { to: '/status-pengajuan', label: 'Cuti & izin saya', icon: 'calendar', badge: pendingCount },
    { to: '/riwayat-absensi', label: 'Riwayat absensi', icon: 'chart' },
  ];

  const spvMenu = [
    { to: '/', label: 'Dashboard SPV', icon: 'home', end: true },
    { to: '/data-tim', label: 'Data tim', icon: 'user' },
    { to: '/monitoring-absensi', label: 'Monitoring absensi', icon: 'face' },
    { to: '/riwayat-kehadiran', label: 'Riwayat kehadiran', icon: 'chart' },
    { to: '/pengajuan-cuti-tim', label: 'Pengajuan cuti', icon: 'calendar' },
    { to: '/izin-sakit-tim', label: 'Izin sakit', icon: 'calendar' },
    { to: '/laporan-tim', label: 'Laporan tim', icon: 'chart' },
  ];

  const prefMenu = role === 'hrd'
    ? []
    : [
        { to: '/informasi', label: 'Informasi', icon: 'info' },
        ...(role === 'spv' ? [{ to: '/profil', label: 'Profil saya', icon: 'user' }] : []),
        { to: '/bantuan', label: 'Pusat bantuan', icon: 'help' },
      ];

  const primaryLinks = role === 'spv'
    ? spvMenu
    : role === 'karyawan'
      ? karyawanMenu
      : [{ to: '/', label: 'Dashboard HRD', icon: 'home', end: true }];

  const sectionLabel = role === 'spv'
    ? 'PORTAL SPV'
    : role === 'karyawan'
      ? 'PORTAL KARYAWAN'
      : 'PORTAL HRD';

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <img src={gapjotenLogo} alt="GAPJOTEN HRIS" className="brand-logo" />
        <div>
          <div className="brand-title">GAPJOTEN</div>
          <div className="brand-subtitle">HUMAN RESOURCE</div>
        </div>
      </div>

      <div className="sidebar-section-label">WORKSPACE</div>
      <div className="workspace-selector">
        <span>PT Gapjoten Teknologi</span>
        <span className="workspace-chevron">▾</span>
      </div>

      <div className="sidebar-section-label">{sectionLabel}</div>
      <nav className="sidebar-nav">
        {primaryLinks.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.end}
            className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
          >
            <span className="sidebar-icon"><NavIcon name={link.icon} /></span>
            <span className="sidebar-label-text">{link.label}</span>
            {link.badge > 0 && <span className="sidebar-badge">{link.badge}</span>}
          </NavLink>
        ))}
      </nav>

      {prefMenu.length > 0 && (
        <>
          <div className="sidebar-section-label" style={{ marginTop: '1rem' }}>PREFERENSI</div>
          <nav className="sidebar-nav">
            {prefMenu.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
              >
                <span className="sidebar-icon"><NavIcon name={link.icon} /></span>
                <span className="sidebar-label-text">{link.label}</span>
              </NavLink>
            ))}
          </nav>
        </>
      )}

      <div className="sidebar-footer">
        <div className="trust-card">
          <div className="trust-icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22d3ee" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <div className="trust-title">Data Anda terlindungi</div>
          <div className="trust-subtitle">Enkripsi &amp; verifikasi biometrik</div>
        </div>
        <div className="workspace-label">GAPJOTEN HRIS &bull; v2.4</div>
      </div>
    </aside>
  );
};

export default Sidebar;
