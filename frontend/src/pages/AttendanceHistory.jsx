import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { attendanceStatusLabel, formatDate } from '../utils/formatters.js';

const AttendanceHistory = () => {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [error, setError] = useState('');

  const loadHistory = async (params = {}) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getKaryawanAttendance(params);
      setHistory(res.data?.history || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat riwayat absensi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    loadHistory({ start_date: startDate, end_date: endDate });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Absensi Pribadi</div>
          <h1 className="page-title">Riwayat Absensi</h1>
          <p className="page-subtitle">Catatan Clock In, Clock Out, metode verifikasi, dan status kehadiran Anda.</p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className="notes-label" htmlFor="hist-start">Dari Tanggal</label>
            <input id="hist-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="notes-input" />
          </div>
          <div>
            <label className="notes-label" htmlFor="hist-end">Sampai Tanggal</label>
            <input id="hist-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="notes-input" />
          </div>
          <button type="submit" className="btn-primary">Filter Periode</button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setStartDate('');
              setEndDate('');
              loadHistory();
            }}
          >
            Reset
          </button>
        </form>
      </section>

      {error && <div className="alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat riwayat absensi...</p>
        ) : history.length === 0 ? (
          <p className="panel-note">Tidak ada data absensi untuk periode ini.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Metode</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {history.map((row) => (
                <tr key={row.id}>
                  <td>{formatDate(row.date)}</td>
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

export default AttendanceHistory;
