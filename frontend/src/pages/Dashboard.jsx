import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const Dashboard = () => {
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getEmployees();
        setTotalEmployees(res.data?.length || 0);
      } catch (err) {
        console.error('Error fetching employee stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div>
      <h1 style={{ marginBottom: '1.5rem', fontSize: '1.75rem' }}>Dashboard HRIS</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary-color)' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Total Pegawai</h3>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#0f172a' }}>
            {loading ? '...' : totalEmployees}
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #10b981' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Status Sistem Backend</h3>
          <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#10b981', marginTop: '0.5rem' }}>
            Online (Node.js API)
          </p>
        </div>

        <div className="card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h3 style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '0.5rem' }}>Frontend Client</h3>
          <p style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f59e0b', marginTop: '0.5rem' }}>
            React + JSX (Vite)
          </p>
        </div>
      </div>

      <div className="card">
        <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Selamat Datang di Portal HRIS Kelompok 3</h2>
        <p style={{ color: '#475569', lineHeight: 1.6 }}>
          Aplikasi ini dibangun menggunakan arsitektur fullstack dengan frontend berbasis React (JSX)
          dan backend berbasis Node.js & Express. Silakan navigasikan ke menu <strong>Data Pegawai</strong> untuk mengelola data.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;

