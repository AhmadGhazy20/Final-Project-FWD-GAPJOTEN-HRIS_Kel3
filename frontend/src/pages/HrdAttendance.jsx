import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { attendanceStatusLabel, formatDate } from '../utils/formatters.js';

const HrdAttendance = () => {
  const [tab, setTab] = useState('today');
  const [loading, setLoading] = useState(true);
  const [todayRows, setTodayRows] = useState([]);
  const [historyRows, setHistoryRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    department_id: '',
    employee_id: '',
    status: '',
    method: '',
  });
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({
    employee_id: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'present',
    clock_in: '08:00',
    clock_out: '17:00',
    method: 'manual',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  const loadData = async (params = filters) => {
    setLoading(true);
    try {
      const res = await api.getHrdAttendance(params);
      setTodayRows(res.data?.todayMonitoring || []);
      setHistoryRows(res.data?.records || []);
      setDepartments(res.data?.departments || []);
      const empList = res.data?.employees || [];
      setEmployees(empList);
      if (!manualForm.employee_id && empList.length > 0) {
        setManualForm((prev) => ({ ...prev, employee_id: String(empList[0].id) }));
      }
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal memuat data absensi' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData({});
  }, []);

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ message: '', error: '' });
    try {
      const res = await api.upsertHrdAttendance({
        ...manualForm,
        employee_id: Number(manualForm.employee_id),
      });
      setFeedback({ message: res.message, error: '' });
      setShowManual(false);
      window.dispatchEvent(new Event('hrd-counts-updated'));
      await loadData(filters);
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menyimpan catatan absensi' });
    } finally {
      setSaving(false);
    }
  };

  const filteredToday = todayRows.filter((row) => {
    if (filters.status && row.status !== filters.status) return false;
    return true;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal HRD &middot; Seluruh Perusahaan</div>
          <h1 className="page-title">Data Absensi</h1>
          <p className="page-subtitle">Pantau seluruh data kehadiran karyawan hari ini maupun riwayat lintas departemen.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setShowManual((prev) => !prev)}>
          {showManual ? 'Tutup Form Koreksi' : '+ Catat / Koreksi Absensi'}
        </button>
      </div>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}

      {showManual && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Catat atau Koreksi Absensi Karyawan</h2>
              <p className="panel-subtitle">Digunakan HRD untuk mencatat kehadiran alternatif atau koreksi data absensi.</p>
            </div>
          </div>
          <form onSubmit={handleManualSubmit}>
            <div className="form-grid-3">
              <div>
                <label className="notes-label" htmlFor="man-emp">Karyawan</label>
                <select
                  id="man-emp"
                  className="notes-input"
                  value={manualForm.employee_id}
                  onChange={(e) => setManualForm({ ...manualForm, employee_id: e.target.value })}
                  required
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>{e.nip} - {e.fullName}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="notes-label" htmlFor="man-date">Tanggal</label>
                <input
                  id="man-date"
                  type="date"
                  className="notes-input"
                  value={manualForm.date}
                  onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="man-status">Status Kehadiran</label>
                <select
                  id="man-status"
                  className="notes-input"
                  value={manualForm.status}
                  onChange={(e) => setManualForm({ ...manualForm, status: e.target.value })}
                >
                  <option value="present">Hadir</option>
                  <option value="late">Terlambat</option>
                  <option value="sick">Izin Sakit</option>
                  <option value="leave">Cuti</option>
                  <option value="absent">Alpa</option>
                </select>
              </div>
              <div>
                <label className="notes-label" htmlFor="man-in">Clock In (Opsional)</label>
                <input
                  id="man-in"
                  type="time"
                  className="notes-input"
                  value={manualForm.clock_in}
                  onChange={(e) => setManualForm({ ...manualForm, clock_in: e.target.value })}
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="man-out">Clock Out (Opsional)</label>
                <input
                  id="man-out"
                  type="time"
                  className="notes-input"
                  value={manualForm.clock_out}
                  onChange={(e) => setManualForm({ ...manualForm, clock_out: e.target.value })}
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="man-notes">Catatan</label>
                <input
                  id="man-notes"
                  type="text"
                  className="notes-input"
                  value={manualForm.notes}
                  onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                  placeholder="Contoh: Koreksi kendala kamera"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Menyimpan...' : 'Simpan Catatan Absensi'}
            </button>
          </form>
        </section>
      )}

      <div className="filter-bar">
        <div className="filter-tabs">
          <button
            type="button"
            className={`filter-tab${tab === 'today' ? ' active' : ''}`}
            onClick={() => setTab('today')}
          >
            Monitoring Hari Ini ({todayRows.length})
          </button>
          <button
            type="button"
            className={`filter-tab${tab === 'history' ? ' active' : ''}`}
            onClick={() => setTab('history')}
          >
            Riwayat Seluruh Absensi ({historyRows.length})
          </button>
        </div>
      </div>

      <section className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadData(filters);
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'flex-end' }}
        >
          {tab === 'history' && (
            <>
              <div>
                <label className="notes-label" htmlFor="att-start">Dari Tanggal</label>
                <input
                  id="att-start"
                  type="date"
                  className="notes-input"
                  style={{ marginBottom: 0 }}
                  value={filters.start_date}
                  onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="att-end">Sampai Tanggal</label>
                <input
                  id="att-end"
                  type="date"
                  className="notes-input"
                  style={{ marginBottom: 0 }}
                  value={filters.end_date}
                  onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
                />
              </div>
            </>
          )}
          <div>
            <label className="notes-label" htmlFor="att-dept">Departemen</label>
            <select
              id="att-dept"
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={filters.department_id}
              onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
            >
              <option value="">Semua Departemen</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          {tab === 'history' && (
            <div>
              <label className="notes-label" htmlFor="att-emp">Karyawan</label>
              <select
                id="att-emp"
                className="notes-input"
                style={{ marginBottom: 0 }}
                value={filters.employee_id}
                onChange={(e) => setFilters({ ...filters, employee_id: e.target.value })}
              >
                <option value="">Semua Karyawan</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>{e.fullName}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="notes-label" htmlFor="att-status">Status</label>
            <select
              id="att-status"
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Semua Status</option>
              <option value="present">Hadir</option>
              <option value="late">Terlambat</option>
              {tab === 'today' && <option value="not_checked_in">Belum Absen</option>}
              <option value="sick">Izin Sakit</option>
              <option value="leave">Cuti</option>
              <option value="absent">Alpa</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Terapkan</button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const reset = { start_date: '', end_date: '', department_id: '', employee_id: '', status: '', method: '' };
              setFilters(reset);
              loadData(reset);
            }}
          >
            Reset
          </button>
        </form>
      </section>

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat data absensi...</p>
        ) : tab === 'today' ? (
          filteredToday.length === 0 ? (
            <p className="panel-note">Tidak ada data monitoring hari ini.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>NIP</th>
                    <th>Nama</th>
                    <th>Departemen</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Metode</th>
                    <th>Status</th>
                    <th>Catatan</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredToday.map((row) => (
                    <tr key={row.employeeId}>
                      <td><strong>{row.nip}</strong></td>
                      <td>{row.fullName}</td>
                      <td>{row.department || '-'}</td>
                      <td>{row.clockIn || '-'}</td>
                      <td>{row.clockOut || '-'}</td>
                      <td>{row.method ? row.method.toUpperCase() : '-'}</td>
                      <td><span className={`status-badge status-${row.status}`}>{attendanceStatusLabel(row.status)}</span></td>
                      <td>{row.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : historyRows.length === 0 ? (
          <p className="panel-note">Tidak ada riwayat absensi yang cocok.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tanggal</th>
                  <th>NIP</th>
                  <th>Nama</th>
                  <th>Departemen</th>
                  <th>Clock In</th>
                  <th>Clock Out</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th>Catatan</th>
                </tr>
              </thead>
              <tbody>
                {historyRows.map((row) => (
                  <tr key={row.id}>
                    <td>{formatDate(row.date)}</td>
                    <td><strong>{row.nip}</strong></td>
                    <td>{row.fullName}</td>
                    <td>{row.department || '-'}</td>
                    <td>{row.clockIn || '-'}</td>
                    <td>{row.clockOut || '-'}</td>
                    <td>{row.method ? row.method.toUpperCase() : '-'}</td>
                    <td><span className={`status-badge status-${row.status}`}>{attendanceStatusLabel(row.status)}</span></td>
                    <td>{row.notes || '-'}</td>
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

export default HrdAttendance;
