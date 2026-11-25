import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import { formatDate } from '../utils/formatters.js';

const Profile = () => {
  const { user } = useAuth();
  const isSpv = user?.role === 'spv';

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ full_name: '', gender: 'male', phone: '', address: '' });
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = isSpv ? await api.getSpvProfile() : await api.getKaryawanProfile();
        const p = res.data;
        setProfile(p);
        setForm({
          full_name: p.fullName || '',
          gender: p.gender || 'male',
          phone: p.phone || '',
          address: p.address || '',
        });
      } catch (err) {
        setFeedback({ message: '', error: err.message });
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [isSpv]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ message: '', error: '' });

    try {
      const res = isSpv ? await api.updateSpvProfile(form) : await api.updateKaryawanProfile(form);
      setProfile(res.data);
      setFeedback({ message: res.message || 'Profil berhasil diperbarui.', error: '' });
    } catch (err) {
      setFeedback({ message: '', error: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="page"><p className="panel-note">Memuat profil...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Akun Pribadi</div>
          <h1 className="page-title">Profil Saya</h1>
          <p className="page-subtitle">Lihat informasi kepegawaian dan perbarui data pribadi yang diizinkan.</p>
        </div>
      </div>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Informasi Kepegawaian</h2>
              <p className="panel-subtitle">Dikelola oleh HRD (hanya baca)</p>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span>NIP</span><strong>{profile?.nip || '-'}</strong></div>
            <div className="detail-item"><span>Email</span><strong>{profile?.email || '-'}</strong></div>
            <div className="detail-item"><span>Role</span><strong>{profile?.role?.toUpperCase() || '-'}</strong></div>
            <div className="detail-item"><span>Departemen</span><strong>{profile?.department || '-'}</strong></div>
            <div className="detail-item"><span>Jabatan</span><strong>{profile?.position || '-'}</strong></div>
            <div className="detail-item"><span>Tanggal Bergabung</span><strong>{formatDate(profile?.joinDate)}</strong></div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Perbarui Data Pribadi</h2>
              <p className="panel-subtitle">Informasi yang diizinkan untuk diperbarui mandiri</p>
            </div>
          </div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div>
              <label className="notes-label" htmlFor="prof-name">Nama Lengkap</label>
              <input
                id="prof-name"
                type="text"
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                required
                className="notes-input"
              />
            </div>
            <div>
              <label className="notes-label" htmlFor="prof-gender">Jenis Kelamin</label>
              <select
                id="prof-gender"
                value={form.gender}
                onChange={(e) => setForm({ ...form, gender: e.target.value })}
                className="notes-input"
              >
                <option value="male">Laki-laki</option>
                <option value="female">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="notes-label" htmlFor="prof-phone">No. Telepon</label>
              <input
                id="prof-phone"
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="notes-input"
              />
            </div>
            <div>
              <label className="notes-label" htmlFor="prof-address">Alamat</label>
              <textarea
                id="prof-address"
                rows="2"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="notes-input"
              />
            </div>
            <div>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
