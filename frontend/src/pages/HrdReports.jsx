import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';

const HrdReports = () => {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [periodMode, setPeriodMode] = useState('monthly');
  const [startDate, setStartDate] = useState(monthStart);
  const [endDate, setEndDate] = useState(today);
  const [departmentId, setDepartmentId] = useState('');
  const [viewTab, setViewTab] = useState('employees');
  const [report, setReport] = useState({ totals: {}, rows: [], dailyBreakdown: [], departments: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadReport = async (params) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.getHrdReports(params);
      setReport(res.data || { totals: {}, rows: [], dailyBreakdown: [], departments: [] });
    } catch (err) {
      setError(err.message || 'Gagal memuat laporan absensi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReport({ start_date: startDate, end_date: endDate });
  }, []);

  const switchPreset = (mode) => {
    setPeriodMode(mode);
    if (mode === 'daily') {
      setStartDate(today);
      setEndDate(today);
      loadReport({ start_date: today, end_date: today, department_id: departmentId });
    } else if (mode === 'monthly') {
      setStartDate(monthStart);
      setEndDate(today);
      loadReport({ start_date: monthStart, end_date: today, department_id: departmentId });
    }
  };

  const exportCsv = () => {
    const header = ['NIP', 'Nama', 'Departemen', 'Jabatan', 'Hadir', 'Terlambat', 'Izin Sakit', 'Cuti', 'Alpa', 'Absen Wajah', 'Total Hari'];
    const lines = (report.rows || []).map((r) => [
      r.nip,
      `"${r.fullName}"`,
      `"${r.department || '-'}"`,
      `"${r.position || '-'}"`,
      r.present,
      r.late,
      r.sick,
      r.leave,
      r.absent,
      r.faceCount,
      r.totalDays,
    ].join(','));

    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `laporan-absensi-hrd-${startDate}-${endDate}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  };

  const totals = report.totals || {};

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal HRD &middot; Rekap Kehadiran</div>
          <h1 className="page-title">Laporan Absensi</h1>
          <p className="page-subtitle">Lihat rekap absensi harian dan bulanan seluruh karyawan serta unduh CSV.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={exportCsv}
          disabled={(report.rows || []).length === 0}
        >
          Unduh Laporan CSV
        </button>
      </div>

      <section className="panel">
        <div className="filter-tabs" style={{ width: 'max-content', marginBottom: '1rem' }}>
          <button
            type="button"
            className={`filter-tab${periodMode === 'monthly' ? ' active' : ''}`}
            onClick={() => switchPreset('monthly')}
          >
            Rekap Bulanan
          </button>
          <button
            type="button"
            className={`filter-tab${periodMode === 'daily' ? ' active' : ''}`}
            onClick={() => switchPreset('daily')}
          >
            Rekap Harian (Hari Ini)
          </button>
          <button
            type="button"
            className={`filter-tab${periodMode === 'custom' ? ' active' : ''}`}
            onClick={() => setPeriodMode('custom')}
          >
            Periode Kustom
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadReport({ start_date: startDate, end_date: endDate, department_id: departmentId });
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}
        >
          <div>
            <label className="notes-label" htmlFor="hrd-rep-start">Dari Tanggal</label>
            <input
              id="hrd-rep-start"
              type="date"
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={startDate}
              onChange={(e) => {
                setPeriodMode('custom');
                setStartDate(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="notes-label" htmlFor="hrd-rep-end">Sampai Tanggal</label>
            <input
              id="hrd-rep-end"
              type="date"
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={endDate}
              onChange={(e) => {
                setPeriodMode('custom');
                setEndDate(e.target.value);
              }}
            />
          </div>
          <div>
            <label className="notes-label" htmlFor="hrd-rep-dept">Departemen</label>
            <select
              id="hrd-rep-dept"
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
            >
              <option value="">Semua Departemen</option>
              {(report.departments || []).map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary">Tampilkan Rekap</button>
        </form>
      </section>

      <div className="kpi-grid">
        <div className="kpi-card accent-blue">
          <div className="kpi-label">Total Catatan Absensi</div>
          <div className="kpi-value">{totals.totalRecords || 0}</div>
          <div className="kpi-note">Mencakup {totals.employees || 0} karyawan aktif</div>
        </div>
        <div className="kpi-card accent-green">
          <div className="kpi-label">Hadir Tepat Waktu</div>
          <div className="kpi-value">{totals.present || 0}</div>
          <div className="kpi-note">{totals.faceCount || 0} absensi menggunakan kamera wajah</div>
        </div>
        <div className="kpi-card accent-red">
          <div className="kpi-label">Terlambat</div>
          <div className="kpi-value">{totals.late || 0}</div>
          <div className="kpi-note">Melewati batas toleransi masuk</div>
        </div>
        <div className="kpi-card accent-orange">
          <div className="kpi-label">Sakit / Cuti / Alpa</div>
          <div className="kpi-value">{(totals.sick || 0) + (totals.leave || 0) + (totals.absent || 0)}</div>
          <div className="kpi-note">{totals.sick || 0} sakit &middot; {totals.leave || 0} cuti &middot; {totals.absent || 0} alpa</div>
        </div>
      </div>

      {error && <div className="alert error">{error}</div>}

      <div className="filter-bar">
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab${viewTab === 'employees' ? ' active' : ''}`}
            onClick={() => setViewTab('employees')}
          >
            Rekap Per Karyawan
          </button>
          <button
            type="button"
            className={`filter-tab${viewTab === 'daily' ? ' active' : ''}`}
            onClick={() => setViewTab('daily')}
          >
            Rekap Per Hari
          </button>
        </div>
      </div>

      <section className="panel">
        {loading ? (
          <p className="panel-note">Menghitung rekap absensi...</p>
        ) : viewTab === 'employees' ? (
          (report.rows || []).length === 0 ? (
            <p className="panel-note">Tidak ada data karyawan pada periode ini.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>NIP</th>
                    <th>Nama</th>
                    <th>Departemen</th>
                    <th>Jabatan</th>
                    <th>Hadir</th>
                    <th>Terlambat</th>
                    <th>Izin Sakit</th>
                    <th>Cuti</th>
                    <th>Alpa</th>
                    <th>Wajah</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map((row) => (
                    <tr key={row.employeeId}>
                      <td><strong>{row.nip}</strong></td>
                      <td>{row.fullName}</td>
                      <td>{row.department || '-'}</td>
                      <td>{row.position || '-'}</td>
                      <td>{row.present}</td>
                      <td>{row.late}</td>
                      <td>{row.sick}</td>
                      <td>{row.leave}</td>
                      <td>{row.absent}</td>
                      <td>{row.faceCount}</td>
                      <td><strong>{row.totalDays}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (report.dailyBreakdown || []).length === 0 ? (
          <p className="panel-note">Belum ada catatan absensi harian pada rentang tanggal ini.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>Total Tercatat</th>
                  <th>Hadir</th>
                  <th>Terlambat</th>
                  <th>Izin Sakit</th>
                  <th>Cuti</th>
                  <th>Alpa</th>
                </tr>
              </thead>
              <tbody>
                {report.dailyBreakdown.map((day) => (
                  <tr key={day.date}>
                    <td><strong>{formatDate(day.date)}</strong></td>
                    <td>{day.total}</td>
                    <td>{day.present}</td>
                    <td>{day.late}</td>
                    <td>{day.sick}</td>
                    <td>{day.leave}</td>
                    <td>{day.absent}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default HrdReports;
