import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { attendanceStatusLabel, formatDate } from '../utils/formatters.js';

const SpvAttendanceHistory = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [members, setMembers] = useState([]);
  const [filters, setFilters] = useState({ start_date: '', end_date: '', employee_id: '', status: '' });
  const [error, setError] = useState('');

  const loadHistory = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSpvAttendanceHistory(params);
      setRows(res.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat riwayat kehadiran tim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.all([api.getSpvTeam(), api.getSpvAttendanceHistory()])
      .then(([teamRes, histRes]) => {
        setMembers(teamRes.data?.members || []);
        setRows(histRes.data || []);
      })
      .catch((err) => setError(err.message || 'Gagal memuat data'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    loadHistory(filters);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV</div>
          <h1 className="page-title">Riwayat Kehadiran</h1>
          <p className="page-subtitle">Catatan absensi historis anggota tim Anda (hanya baca).</p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleSubmit} className="inline-filter-form">
          <div className="filter-field">
            <label className="notes-label" htmlFor="spv-start">Dari Tanggal</label>
            <input
              id="spv-start"
              type="date"
              value={filters.start_date}
              onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              className="notes-input"
            />
          </div>
          <div className="filter-field">
            <label className="notes-label" htmlFor="spv-end">Sampai Tanggal</label>
            <input
              id="spv-end"
              type="date"
              value={filters.end_date}
              onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              className="notes-input"
            />
          </div>
          <div className="filter-field">
            <label className="notes-label" htmlFor="spv-emp">Anggota</label>
            <select
              id="spv-emp"
              value={filters.employee_id}
              onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
              className="notes-input"
            >
              <option value="">Semua Anggota</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.fullName}</option>
              ))}
            </select>
          </div>
          <div className="filter-field">
            <label className="notes-label" htmlFor="spv-stat">Status</label>
            <select
              id="spv-stat"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="notes-input"
            >
              <option value="">Semua Status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              <option value="sick">Izin Sakit</option>
              <option value="leave">Cuti</option>
              <option value="absent">Alpa</option>
            </select>
          </div>
          <div className="filter-actions">
            <button type="submit" className="btn-primary">Terapkan</button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                const reset = { start_date: '', end_date: '', employee_id: '', status: '' };
                setFilters(reset);
                loadHistory(reset);
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      {error && <div className="alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat riwayat kehadiran...</p>
        ) : rows.length === 0 ? (
          <p className="panel-note">Belum ada data kehadiran yang cocok.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>NIP</th>
                <th>Nama</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Metode</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
                  <td><strong>{row.nip}</strong></td>
                  <td>{row.fullName}</td>
                  <td>{row.clockIn || '-'}</td>
                  <td>{row.clockOut || '-'}</td>
                  <td>{row.method ? row.method.toUpperCase() : '-'}</td>
                  <td><span className={`status-badge status-${row.status}`}>{attendanceStatusLabel(row.status)}</span></td>
                  <td>{row.notes || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default SpvAttendanceHistory;
