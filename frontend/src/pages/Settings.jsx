import React from 'react';
import { useAuth } from '../hooks/useAuth.js';

const Settings = () => {
  const { user } = useAuth();

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV</div>
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-subtitle">Informasi akun dan preferensi kerja Anda.</p>
        </div>
      </div>

      <section className="panel">
        <div className="detail-grid">
          <div className="detail-item"><span>Nama</span><strong>{user?.name || 'Jonathan'}</strong></div>
          <div className="detail-item"><span>Email</span><strong>{user?.email || 'jonathan@gapjoten.id'}</strong></div>
          <div className="detail-item"><span>Role</span><strong>{user?.role?.toUpperCase() || 'SPV'}</strong></div>
          <div className="detail-item"><span>Status</span><strong>Aktif</strong></div>
        </div>
      </section>
    </div>
  );
};

export default Settings;
