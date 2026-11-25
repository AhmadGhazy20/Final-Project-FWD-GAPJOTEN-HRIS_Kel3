import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { attendanceStatusLabel } from '../utils/formatters.js';

const SpvAttendanceMonitoring = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('semua');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const res = await api.getSpvAttendanceToday();
        setRows(res.data || []);
      } catch (err) {
        setError(err.message || 'Gagal memuat monitoring absensi');
      } finally {
        setLoading(false);
      }
    };

    fetchToday();
  }, []);

  const filtered = filter === 'semua'
    ? rows
    : rows.filter((row) => row.status === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV</div>
          <h1 className="page-title">Monitoring Absensi</h1>
          <p className="page-subtitle">Pantau kehadiran dan keterlambatan anggota tim hari ini (tanpa hak ubah data).</p>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-tabs">
          {[
            { key: 'semua', label: 'Semua' },
            { key: 'present', label: 'Hadir' },
            { key: 'late', label: 'Terlambat' },
            { key: 'not_checked_in', label: 'Belum Absen' },
            { key: 'sick', label: 'Izin Sakit' },
            { key: 'leave', label: 'Cuti' },
          ].map((tab) => (
            <button
              type="button"
              key={tab.key}
              className={`filter-tab${filter === tab.key ? ' active' : ''}`}
              onClick={() => setFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat monitoring absensi...</p>
        ) : filtered.length === 0 ? (
          <p className="panel-note">Tidak ada data pada filter ini.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama</th>
                <th>Jabatan</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Metode</th>
                <th>Status</th>
                <th>Catatan</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.employeeId}>
                  <td><strong>{row.nip}</strong></td>
                  <td>{row.fullName}</td>
                  <td>{row.position || '-'}</td>
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

export default SpvAttendanceMonitoring;
