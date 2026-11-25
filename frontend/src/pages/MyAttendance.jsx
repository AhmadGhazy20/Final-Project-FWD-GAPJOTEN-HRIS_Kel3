import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

const statusLabel = (status) => {
  const labels = {
    belum_absen: 'Belum absen',
    hadir: 'Hadir',
    telat: 'Terlambat',
    cuti: 'Cuti',
    izin_sakit: 'Izin sakit',
    alpha: 'Alpha',
  };

  return labels[status] || status;
};

const clockTime = (value) => (value ? String(value).split(' ').pop() : '-');

const formatDate = (value) =>
  new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(`${value}T00:00:00`));

const MyAttendance = () => {
  const { user } = useAuth();
  const [now, setNow] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState(null);
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const name = (user?.name || 'Jonathan').split(' ')[0];

  const load = async () => {
    try {
      const res = await api.getMyAttendance();
      setData(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(() => setNow(new Date()), 30000);

    return () => clearInterval(timer);
  }, []);

  const submit = async (action) => {
    setSaving(true);
    setMessage('');
    setError('');

    try {
      const payload = { notes: notes || null };
      const res = action === 'in'
        ? await api.checkIn({ ...payload, method: 'face', liveness_passed: true })
        : await api.checkOut(payload);

      setMessage(res.message);
      setNotes('');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const today = data?.today || {};
  const history = data?.history || [];
  const hasCheckIn = Boolean(today.clockIn);
  const hasCheckOut = Boolean(today.clockOut);
  const deadline = data?.settings
    ? `${data.settings.workStart} + ${data.settings.lateToleranceMinutes} menit`
    : '08:00 + 15 menit';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV</div>
          <h1 className="page-title">Absensi saya</h1>
          <p className="page-subtitle">Catat kehadiran Anda dengan verifikasi wajah.</p>
        </div>
      </div>

      <section className="hero-card">
        <div>
          <h2 className="hero-title">Halo, Pak {name}</h2>
          <p className="hero-subtitle">{formatDate(now.toISOString().slice(0, 10))}</p>
        </div>
        <div className="clock-display">
          {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </section>

      {message && <div className="alert success">{message}</div>}
      {error && <div className="alert error">{error}</div>}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Absen hari ini</h2>
              <p className="panel-subtitle">Pastikan wajah terlihat jelas sebelum melanjutkan.</p>
            </div>
            <span className={`status-badge status-${today.status || 'belum_absen'}`}>
              {statusLabel(today.status)}
            </span>
          </div>

          <div className="face-card">
            <div className="face-scan">
              <div className="face-scan-inner">F</div>
            </div>
            <div>
              <strong>Face recognition aktif</strong>
              <p className="panel-subtitle">Metode absensi: {today.method || 'face'} &middot; Liveness: {today.livenessPassed === false ? 'Gagal' : 'Terdeteksi'}</p>
            </div>
          </div>

          <div className="attendance-times">
            <div className="attendance-time-box">
              <span>Jam masuk</span>
              <strong>{clockTime(today.clockIn)}</strong>
            </div>
            <div className="attendance-time-box">
              <span>Jam pulang</span>
              <strong>{clockTime(today.clockOut)}</strong>
            </div>
          </div>

          <label className="notes-label" htmlFor="attendance-notes">Catatan opsional</label>
          <textarea
            id="attendance-notes"
            className="notes-input"
            rows="2"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Contoh: dinas luar kantor"
          />

          <div className="attendance-actions">
            <button
              type="button"
              className="btn-primary"
              disabled={loading || saving || hasCheckIn}
              onClick={() => submit('in')}
            >
              {saving && !hasCheckIn ? 'Memproses...' : hasCheckIn ? 'Sudah absen masuk' : 'Absen Masuk'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || saving || !hasCheckIn || hasCheckOut}
              onClick={() => submit('out')}
            >
              {saving && hasCheckIn && !hasCheckOut ? 'Memproses...' : hasCheckOut ? 'Sudah absen pulang' : 'Absen Pulang'}
            </button>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Ringkasan hari ini</h2>
              <p className="panel-subtitle">Batas keterlambatan tim</p>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span>Status</span>
              <strong>{statusLabel(today.status)}</strong>
            </div>
            <div className="detail-item">
              <span>Batas masuk</span>
              <strong>{deadline}</strong>
            </div>
            <div className="detail-item">
              <span>Masuk</span>
              <strong>{clockTime(today.clockIn)}</strong>
            </div>
            <div className="detail-item">
              <span>Pulang</span>
              <strong>{clockTime(today.clockOut)}</strong>
            </div>
          </div>
          <div className="approval-note">
            Absensi dicatat otomatis ke database dan dapat dilihat oleh HRD.
          </div>
        </aside>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Riwayat 7 hari terakhir</h2>
            <p className="panel-subtitle">Rekap kehadiran pribadi Anda</p>
          </div>
        </div>
        {loading ? (
          <p className="panel-note">Memuat riwayat absensi...</p>
        ) : history.length === 0 ? (
          <p className="panel-note">Belum ada riwayat absensi.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Status</th>
                <th>Metode</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{row.date}</td>
                  <td>{clockTime(row.clockIn)}</td>
                  <td>{clockTime(row.clockOut)}</td>
                  <td><span className={`status-badge status-${row.status}`}>{statusLabel(row.status)}</span></td>
                  <td>{row.method || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default MyAttendance;
