import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const SpvTeamReport = () => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState({ department: '', rows: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = async (params) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getSpvReports(params);
      setReport(res.data || { department: '', rows: [] });
    } catch (err) {
      setError(err.message || 'Gagal memuat laporan tim');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport({ start_date: startDate, end_date: endDate });
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    loadReport({ start_date: startDate, end_date: endDate });
  };

  const exportCsv = () => {
    const header = ['NIP', 'Nama', 'Jabatan', 'Hadir', 'Terlambat', 'Izin Sakit', 'Cuti', 'Alpa', 'Total Hari'];
    const lines = report.rows.map((r) => [
      r.nip,
      `"${r.fullName}"`,
      `"${r.position || '-'}"`,
      r.present,
      r.late,
      r.sick,
      r.leave,
      r.absent,
      r.totalDays,
    ].join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-tim-${startDate}-${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV &middot; Divisi {report.department || '-'}</div>
          <h1 className="page-title">Laporan Tim</h1>
          <p className="page-subtitle">Rekap kehadiran anggota tim berdasarkan periode tanggal.</p>
        </div>
        <button type="button" className="btn-primary" onClick={exportCsv} disabled={report.rows.length === 0}>
          Unduh Rekap CSV
        </button>
      </div>

      <section className="panel" style={{ marginBottom: '1.5rem' }}>
        <form onSubmit={handleFilter} style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div>
            <label className="notes-label" htmlFor="rep-start">Dari Tanggal</label>
            <input id="rep-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="notes-input" />
          </div>
          <div>
            <label className="notes-label" htmlFor="rep-end">Sampai Tanggal</label>
            <input id="rep-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="notes-input" />
          </div>
          <button type="submit" className="btn-primary">Tampilkan Laporan</button>
        </form>
      </section>

      {error && <div className="alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="panel-note">Menghitung rekap tim...</p>
        ) : report.rows.length === 0 ? (
          <p className="panel-note">Tidak ada anggota tim.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama</th>
                <th>Jabatan</th>
                <th>Hadir</th>
                <th>Terlambat</th>
                <th>Izin Sakit</th>
                <th>Cuti</th>
                <th>Alpa</th>
                <th>Absen Wajah</th>
              </tr>
            </thead>
            <tbody>
              {report.rows.map((row) => (
                <tr key={row.employeeId}>
                  <td><strong>{row.nip}</strong></td>
                  <td>{row.fullName}</td>
                  <td>{row.position || '-'}</td>
                  <td>{row.present}</td>
                  <td>{row.late}</td>
                  <td>{row.sick}</td>
                  <td>{row.leave}</td>
                  <td>{row.absent}</td>
                  <td>{row.faceCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default SpvTeamReport;
