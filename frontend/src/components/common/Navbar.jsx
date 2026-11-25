import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';

const initials = (name) =>
  (name || 'User')
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase();

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="topbar">
      <div className="topbar-search">
        <span className="search-icon">Cari</span>
        <input type="search" placeholder="Cari karyawan atau waktu" aria-label="Cari karyawan atau waktu" />
      </div>

      <div className="topbar-actions">
        <button type="button" className="notification-button" aria-label="Notifikasi">
          Notifikasi
          <span className="notification-count">4</span>
        </button>
        <div className="topbar-user">
          <div className="avatar">{initials(user?.name)}</div>
          <div className="topbar-user-meta">
            <strong>{user?.name || 'Jonathan'}</strong>
            <span>{user?.role?.toUpperCase() || 'SPV'}</span>
          </div>
        </div>
        <button type="button" className="logout-button" onClick={logout}>
          Keluar
        </button>
      </div>
    </header>
  );
};

export default Navbar;
