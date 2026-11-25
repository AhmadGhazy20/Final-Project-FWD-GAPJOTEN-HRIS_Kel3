import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';

const routeTitles = {
  '/': 'Beranda saya',
  '/absensi-wajah': 'Absensi wajah',
  '/riwayat-absensi': 'Riwayat absensi',
  '/pengajuan-cuti': 'Pengajuan cuti',
  '/izin-sakit': 'Izin sakit',
  '/status-pengajuan': 'Cuti & izin saya',
  '/informasi': 'Informasi perusahaan',
  '/profil': 'Profil saya',
  '/bantuan': 'Pusat bantuan',
  '/data-tim': 'Data tim',
  '/monitoring-absensi': 'Monitoring absensi',
  '/riwayat-kehadiran': 'Riwayat kehadiran',
  '/pengajuan-cuti-tim': 'Pengajuan cuti tim',
  '/izin-sakit-tim': 'Izin sakit tim',
  '/laporan-tim': 'Laporan tim',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const pageTitle = location.pathname === '/' && user?.role === 'spv'
    ? 'Dashboard SPV'
    : routeTitles[location.pathname] || 'Portal HRIS';

  const quickItems = useMemo(() => {
    if (user?.role === 'spv') {
      return [
        { label: 'Dashboard SPV', to: '/' },
        { label: 'Data tim', to: '/data-tim' },
        { label: 'Monitoring absensi', to: '/monitoring-absensi' },
        { label: 'Riwayat kehadiran', to: '/riwayat-kehadiran' },
        { label: 'Pengajuan cuti tim', to: '/pengajuan-cuti-tim' },
        { label: 'Izin sakit tim', to: '/izin-sakit-tim' },
        { label: 'Laporan tim', to: '/laporan-tim' },
        { label: 'Informasi', to: '/informasi' },
        { label: 'Profil saya', to: '/profil' },
      ];
    }

    return [
      { label: 'Beranda saya', to: '/' },
      { label: 'Absensi wajah', to: '/absensi-wajah' },
      { label: 'Profil saya', to: '/profil' },
      { label: 'Ajukan cuti', to: '/pengajuan-cuti' },
      { label: 'Ajukan izin sakit', to: '/izin-sakit' },
      { label: 'Status pengajuan / Cuti & izin saya', to: '/status-pengajuan' },
      { label: 'Riwayat absensi', to: '/riwayat-absensi' },
      { label: 'Informasi perusahaan', to: '/informasi' },
      { label: 'Pusat bantuan', to: '/bantuan' },
    ];
  }, [user?.role]);

  const matches = search.trim()
    ? quickItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (matches.length > 0) {
      navigate(matches[0].to);
      setSearch('');
    }
  };

  const roleLabel = user?.role === 'karyawan'
    ? 'Karyawan'
    : user?.role === 'spv'
      ? 'SPV'
      : 'HRD';

  return (
    <header className="topbar">
      <div className="topbar-breadcrumb">
        <span className="breadcrumb-root">Workspace</span>
        <span className="breadcrumb-sep">/</span>
        <strong className="breadcrumb-current">{pageTitle}</strong>
      </div>

      <div className="topbar-search-wrapper">
        <form className="topbar-search" onSubmit={handleSearchSubmit}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari menu atau bantuan..."
            aria-label="Cari menu atau bantuan"
          />
          <kbd className="search-kbd">⌘ K</kbd>
        </form>
        {matches.length > 0 && (
          <div className="search-dropdown">
            {matches.slice(0, 5).map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="search-dropdown-item"
                onClick={() => setSearch('')}
              >
                {item.label}
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="topbar-actions">
        <Link to="/informasi" className="notification-icon-btn" aria-label="Informasi perusahaan" title="Informasi perusahaan">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
          <span className="notification-dot" />
        </Link>

        <span className="role-pill">{roleLabel}</span>

        <div className="topbar-user">
          <div className="topbar-user-meta">
            <strong>{user?.name || 'Pengguna'}</strong>
            <span>{user?.position || user?.department || roleLabel}</span>
          </div>
        </div>

        <button type="button" className="logout-button" onClick={logout} title="Keluar dari akun">
          Keluar
        </button>
      </div>
    </header>
  );
};

export default Navbar;
