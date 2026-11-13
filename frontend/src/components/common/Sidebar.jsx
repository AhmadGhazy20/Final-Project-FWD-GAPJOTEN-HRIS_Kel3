import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        🏢 HRIS GAPJOTEN
      </div>
      <nav className="sidebar-nav">
        <NavLink
          to="/"
          className={({ isActive }) => (isActive ? 'active' : '')}
          end
        >
          📊 Dashboard
        </NavLink>
        <NavLink
          to="/employees"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          👥 Data Pegawai
        </NavLink>
        <NavLink
          to="/login"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          🔐 Halaman Login
        </NavLink>
      </nav>
    </aside>
  );
};

export default Sidebar;

