import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatDateTime } from '../utils/formatters.js';

const Announcements = () => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const res = await api.getAnnouncements();
        setItems(res.data || []);
      } catch (err) {
        setError(err.message || 'Gagal memuat pengumuman');
      } finally {
        setLoading(false);
      }
    };

    fetchAnnouncements();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Informasi Perusahaan</div>
          <h1 className="page-title">Pengumuman</h1>
          <p className="page-subtitle">Informasi dan kebijakan terbaru yang diterbitkan oleh HRD.</p>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat pengumuman...</p>
        ) : items.length === 0 ? (
          <p className="panel-note">Belum ada pengumuman perusahaan.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {items.map((item) => (
              <article className="workspace-item" key={item.id}>
                <span className="workspace-index">INFO</span>
                <div>
                  <h3 style={{ marginBottom: '0.25rem', fontSize: '1rem' }}>{item.title}</h3>
                  <p style={{ marginBottom: '0.5rem', color: '#334155' }}>{item.body}</p>
                  <small style={{ color: '#64748b' }}>
                    Diterbitkan oleh {item.authorName} &middot; {formatDateTime(item.publishedAt)}
                  </small>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default Announcements;
