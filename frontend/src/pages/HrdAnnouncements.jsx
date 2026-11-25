import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDateTime } from '../utils/formatters.js';

const HrdAnnouncements = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ title: '', body: '' });
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const res = await api.getAnnouncements();
      setItems(res.data || []);
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal memuat informasi perusahaan' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ message: '', error: '' });

    try {
      const res = editingId
        ? await api.updateHrdAnnouncement(editingId, form)
        : await api.createHrdAnnouncement(form);

      setFeedback({ message: res.message, error: '' });
      setEditingId(null);
      setForm({ title: '', body: '' });
      await loadAnnouncements();
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menyimpan pengumuman' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Hapus pengumuman "${item.title}"?`)) {
      return;
    }

    setFeedback({ message: '', error: '' });
    try {
      const res = await api.deleteHrdAnnouncement(item.id);
      setFeedback({ message: res.message, error: '' });
      await loadAnnouncements();
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menghapus pengumuman' });
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal HRD &middot; Komunikasi Internal</div>
          <h1 className="page-title">Informasi Perusahaan</h1>
          <p className="page-subtitle">Buat, perbarui, dan terbitkan pengumuman perusahaan untuk karyawan dan SPV.</p>
        </div>
      </div>

      <div className="hrd-subnav">
        <Link to="/hrd/pengaturan" className="hrd-subnav-link">Pengaturan Sistem &amp; Akun</Link>
        <Link to="/hrd/informasi" className="hrd-subnav-link active">Informasi Perusahaan</Link>
        <Link to="/profil" className="hrd-subnav-link">Profil Saya</Link>
      </div>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{editingId ? 'Edit Pengumuman' : 'Buat Pengumuman Baru'}</h2>
              <p className="panel-subtitle">Pengumuman yang diterbitkan langsung tampil di dashboard Karyawan &amp; SPV</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label className="notes-label" htmlFor="ann-title">Judul Informasi / Pengumuman</label>
              <input
                id="ann-title"
                type="text"
                className="notes-input"
                style={{ marginBottom: 0 }}
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Contoh: Kebijakan Jam Kerja Ramadhan"
                required
              />
            </div>

            <div>
              <label className="notes-label" htmlFor="ann-body">Isi Pengumuman</label>
              <textarea
                id="ann-body"
                rows="5"
                className="notes-input"
                style={{ marginBottom: 0 }}
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Tulis detail informasi resmi perusahaan..."
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Terbitkan Informasi'}
              </button>
              {editingId && (
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    setForm({ title: '', body: '' });
                  }}
                >
                  Batal Edit
                </button>
              )}
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Daftar Pengumuman Terbit</h2>
              <p className="panel-subtitle">Total {items.length} pengumuman aktif</p>
            </div>
          </div>

          {loading ? (
            <p className="panel-note">Memuat pengumuman...</p>
          ) : items.length === 0 ? (
            <p className="panel-note">Belum ada pengumuman yang diterbitkan.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {items.map((item) => (
                <article className="workspace-item" key={item.id} style={{ justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', flex: 1 }}>
                    <span className="workspace-index">INFO</span>
                    <div>
                      <strong>{item.title}</strong>
                      <p style={{ marginBottom: '0.4rem', color: '#334155' }}>{item.body}</p>
                      <small style={{ color: '#64748b' }}>
                        Oleh {item.authorName} &middot; {formatDateTime(item.publishedAt)}
                      </small>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', height: 'max-content' }}>
                    <button
                      type="button"
                      className="detail-button"
                      onClick={() => {
                        setEditingId(item.id);
                        setForm({ title: item.title, body: item.body });
                      }}
                    >
                      Edit
                    </button>
                    <button type="button" className="logout-button" onClick={() => handleDelete(item)}>
                      Hapus
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default HrdAnnouncements;
