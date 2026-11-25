import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';

const HrdSettings = () => {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settings, setSettings] = useState({
    company_name: 'GAPJOTEN Technology Solutions',
    office_location: 'Jakarta - Kantor Pusat',
    work_start: '08:00',
    work_end: '17:00',
    late_tolerance_minutes: 15,
    annual_leave_quota: 12,
    biometric_retention_days: 365,
    allow_alternative_attendance: true,
  });
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [accountEdits, setAccountEdits] = useState({});
  const [newDept, setNewDept] = useState({ name: '', code: '', description: '' });
  const [newPos, setNewPos] = useState({ department_id: '', name: '' });
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getHrdSettings();
      const s = res.data?.settings || {};
      setSettings({
        company_name: s.company_name || 'GAPJOTEN Technology Solutions',
        office_location: s.office_location || 'Jakarta - Kantor Pusat',
        work_start: s.work_start || '08:00',
        work_end: s.work_end || '17:00',
        late_tolerance_minutes: Number(s.late_tolerance_minutes ?? 15),
        annual_leave_quota: Number(s.annual_leave_quota ?? 12),
        biometric_retention_days: Number(s.biometric_retention_days ?? 365),
        allow_alternative_attendance: Boolean(s.allow_alternative_attendance),
      });
      const deptList = res.data?.departments || [];
      setDepartments(deptList);
      setPositions(res.data?.positions || []);
      if (!newPos.department_id && deptList.length > 0) {
        setNewPos((prev) => ({ ...prev, department_id: String(deptList[0].id) }));
      }
      const accList = res.data?.accounts || [];
      setAccounts(accList);
      const editMap = {};
      accList.forEach((acc) => {
        editMap[acc.id] = { role: acc.role, status: acc.status, password: '' };
      });
      setAccountEdits(editMap);
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal memuat pengaturan sistem' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    setFeedback({ message: '', error: '' });
    try {
      const res = await api.updateHrdSettings({
        ...settings,
        late_tolerance_minutes: Number(settings.late_tolerance_minutes),
        annual_leave_quota: Number(settings.annual_leave_quota),
        biometric_retention_days: Number(settings.biometric_retention_days),
      });
      setFeedback({ message: res.message, error: '' });
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menyimpan pengaturan' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveAccount = async (accId) => {
    const draft = accountEdits[accId];
    if (!draft) return;
    setFeedback({ message: '', error: '' });
    try {
      const payload = { role: draft.role, status: draft.status };
      if (draft.password) {
        payload.password = draft.password;
      }
      const res = await api.updateHrdAccount(accId, payload);
      setFeedback({ message: res.message, error: '' });
      await loadSettings();
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal memperbarui akun' });
    }
  };

  const handleCreateDept = async (e) => {
    e.preventDefault();
    setFeedback({ message: '', error: '' });
    try {
      const res = await api.createHrdDepartment(newDept);
      setFeedback({ message: res.message, error: '' });
      setNewDept({ name: '', code: '', description: '' });
      await loadSettings();
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menambahkan departemen' });
    }
  };

  const handleCreatePos = async (e) => {
    e.preventDefault();
    setFeedback({ message: '', error: '' });
    try {
      const res = await api.createHrdPosition({
        department_id: Number(newPos.department_id),
        name: newPos.name,
      });
      setFeedback({ message: res.message, error: '' });
      setNewPos((prev) => ({ ...prev, name: '' }));
      await loadSettings();
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menambahkan jabatan' });
    }
  };

  if (loading) {
    return <div className="page"><p className="panel-note">Memuat pengaturan sistem...</p></div>;
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal HRD &middot; Konfigurasi</div>
          <h1 className="page-title">Pengaturan</h1>
          <p className="page-subtitle">Kelola aturan jam kerja, keterlambatan, retensi biometrik, departemen, dan akun sistem.</p>
        </div>
      </div>

      <div className="hrd-subnav">
        <Link to="/hrd/pengaturan" className="hrd-subnav-link active">Pengaturan Sistem &amp; Akun</Link>
        <Link to="/hrd/informasi" className="hrd-subnav-link">Informasi Perusahaan</Link>
        <Link to="/profil" className="hrd-subnav-link">Profil Saya</Link>
      </div>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Pengaturan Operasional &amp; Kebijakan</h2>
              <p className="panel-subtitle">Acuan jam kerja, toleransi terlambat, kuota cuti, dan retensi data wajah</p>
            </div>
          </div>

          <form onSubmit={handleSaveSettings}>
            <div className="detail-grid">
              <div>
                <label className="notes-label" htmlFor="set-comp">Nama Perusahaan</label>
                <input
                  id="set-comp"
                  type="text"
                  className="notes-input"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="set-loc">Lokasi Kantor</label>
                <input
                  id="set-loc"
                  type="text"
                  className="notes-input"
                  value={settings.office_location}
                  onChange={(e) => setSettings({ ...settings, office_location: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="set-start">Jam Masuk (WIB)</label>
                <input
                  id="set-start"
                  type="time"
                  className="notes-input"
                  value={settings.work_start}
                  onChange={(e) => setSettings({ ...settings, work_start: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="set-end">Jam Pulang (WIB)</label>
                <input
                  id="set-end"
                  type="time"
                  className="notes-input"
                  value={settings.work_end}
                  onChange={(e) => setSettings({ ...settings, work_end: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="set-tol">Toleransi Terlambat (Menit)</label>
                <input
                  id="set-tol"
                  type="number"
                  min="0"
                  max="120"
                  className="notes-input"
                  value={settings.late_tolerance_minutes}
                  onChange={(e) => setSettings({ ...settings, late_tolerance_minutes: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="set-quota">Jatah Cuti Tahunan (Hari)</label>
                <input
                  id="set-quota"
                  type="number"
                  min="1"
                  max="60"
                  className="notes-input"
                  value={settings.annual_leave_quota}
                  onChange={(e) => setSettings({ ...settings, annual_leave_quota: e.target.value })}
                  required
                />
              </div>
            </div>

            <div>
              <label className="notes-label" htmlFor="set-ret">Masa Retensi Data Wajah (Hari)</label>
              <input
                id="set-ret"
                type="number"
                min="30"
                max="1825"
                className="notes-input"
                value={settings.biometric_retention_days}
                onChange={(e) => setSettings({ ...settings, biometric_retention_days: e.target.value })}
                required
              />
            </div>

            <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <input
                type="checkbox"
                checked={settings.allow_alternative_attendance}
                onChange={(e) => setSettings({ ...settings, allow_alternative_attendance: e.target.checked })}
              />
              <span>Izinkan prosedur absensi alternatif jika kamera mengalami kendala</span>
            </label>

            <button type="submit" className="btn-primary" disabled={savingSettings}>
              {savingSettings ? 'Menyimpan...' : 'Simpan Pengaturan Sistem'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Master Departemen &amp; Jabatan</h2>
              <p className="panel-subtitle">Tambah struktur departemen atau jabatan baru</p>
            </div>
          </div>

          <form onSubmit={handleCreateDept} style={{ display: 'grid', gridTemplateColumns: '1fr 100px auto', gap: '0.5rem', marginBottom: '1rem' }}>
            <input
              type="text"
              className="notes-input"
              style={{ marginBottom: 0 }}
              placeholder="Nama departemen baru"
              value={newDept.name}
              onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
              required
            />
            <input
              type="text"
              className="notes-input"
              style={{ marginBottom: 0 }}
              placeholder="Kode (OPS)"
              value={newDept.code}
              onChange={(e) => setNewDept({ ...newDept, code: e.target.value })}
              required
            />
            <button type="submit" className="btn-secondary">+ Dept</button>
          </form>

          <form onSubmit={handleCreatePos} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.5rem', marginBottom: '1rem' }}>
            <select
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={newPos.department_id}
              onChange={(e) => setNewPos({ ...newPos, department_id: e.target.value })}
              required
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <input
              type="text"
              className="notes-input"
              style={{ marginBottom: 0 }}
              placeholder="Nama jabatan baru"
              value={newPos.name}
              onChange={(e) => setNewPos({ ...newPos, name: e.target.value })}
              required
            />
            <button type="submit" className="btn-secondary">+ Jabatan</button>
          </form>

          <table className="table">
            <thead>
              <tr>
                <th>Departemen</th>
                <th>Kode</th>
                <th>Karyawan</th>
              </tr>
            </thead>
            <tbody>
              {departments.map((d) => (
                <tr key={d.id}>
                  <td><strong>{d.name}</strong></td>
                  <td>{d.code}</td>
                  <td>{d.employeeCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="panel-note" style={{ marginTop: '0.75rem', marginBottom: 0 }}>
            Total jabatan terdaftar: <strong>{positions.length}</strong> posisi.
          </p>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Manajemen Akun &amp; Hak Akses Pengguna</h2>
            <p className="panel-subtitle">Atur role (HRD / SPV / Karyawan), status aktif akun, dan reset password</p>
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table className="table">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status Akun</th>
                <th>Reset Password</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc) => {
                const draft = accountEdits[acc.id] || { role: acc.role, status: acc.status, password: '' };
                return (
                  <tr key={acc.id}>
                    <td><strong>{acc.nip || '-'}</strong></td>
                    <td>{acc.fullName}</td>
                    <td>{acc.email}</td>
                    <td>
                      <select
                        className="notes-input"
                        style={{ marginBottom: 0, width: 'auto' }}
                        value={draft.role}
                        onChange={(e) =>
                          setAccountEdits({
                            ...accountEdits,
                            [acc.id]: { ...draft, role: e.target.value },
                          })
                        }
                      >
                        <option value="karyawan">Karyawan</option>
                        <option value="spv">SPV</option>
                        <option value="hrd">HRD</option>
                      </select>
                    </td>
                    <td>
                      <select
                        className="notes-input"
                        style={{ marginBottom: 0, width: 'auto' }}
                        value={draft.status}
                        onChange={(e) =>
                          setAccountEdits({
                            ...accountEdits,
                            [acc.id]: { ...draft, status: e.target.value },
                          })
                        }
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </td>
                    <td>
                      <input
                        type="password"
                        className="notes-input"
                        style={{ marginBottom: 0, minWidth: '140px' }}
                        placeholder="Password baru (opsional)"
                        value={draft.password}
                        onChange={(e) =>
                          setAccountEdits({
                            ...accountEdits,
                            [acc.id]: { ...draft, password: e.target.value },
                          })
                        }
                      />
                    </td>
                    <td>
                      <button type="button" className="detail-button" onClick={() => handleSaveAccount(acc.id)}>
                        Simpan
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};

export default HrdSettings;
