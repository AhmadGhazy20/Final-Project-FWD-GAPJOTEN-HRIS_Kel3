import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div style={{ textAlign: 'center', padding: '4rem 1rem' }}>
      <h1 style={{ fontSize: '4rem', color: '#64748b', marginBottom: '1rem' }}>404</h1>
      <h2 style={{ marginBottom: '1rem' }}>Halaman Tidak Ditemukan</h2>
      <p style={{ color: '#64748b', marginBottom: '2rem' }}>
        Halaman yang Anda tuju tidak tersedia atau telah dipindahkan.
      </p>
      <Link to="/" className="btn-primary">
        Kembali ke Dashboard
      </Link>
    </div>
  );
};

export default NotFound;

