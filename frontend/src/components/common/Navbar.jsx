import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';

const Navbar = () => {
  const { user, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar-title">
        <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#1e293b' }}>
          Human Resource Information System
        </h3>
      </div>
      <div className="navbar-user">
        <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
          Halo, <strong>{user?.name || 'Administrator'}</strong>
        </span>
        <button
          onClick={logout}
          style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '0.4rem 0.8rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          Logout
        </button>
      </div>
    </header>
  );
};

export default Navbar;

