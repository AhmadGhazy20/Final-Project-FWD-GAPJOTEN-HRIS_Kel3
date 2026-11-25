import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';

const initialForm = {
  nip: '',
  full_name: '',
  gender: 'male',
  email: '',
  password: '',
  role: 'karyawan',
  department_id: '',
  position_id: '',
  phone: '',
  address: '',
  join_date: new Date().toISOString().slice(0, 10),
  status: 'active',
  account_status: 'active',
};

const HrdEmployees = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSearch = searchParams.get('search') || '';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [positions, setPositions] = useState([]);
  const [filters, setFilters] = useState({ search: initialSearch, department_id: '', status: '', role: '' });
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [detailEmp, setDetailEmp] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  const loadEmployees = async (params = filters) => {
    setLoading(true);
    try {
      const res = await api.getHrdEmployees(params);
      setEmployees(res.data?.employees || []);
      const deptList = res.data?.departments || [];
      const posList = res.data?.positions || [];
      setDepartments(deptList);
      setPositions(posList);
      if (!form.department_id && deptList.length > 0) {
        setForm((prev) => ({
          ...prev,
          department_id: String(deptList[0].id),
          position_id: String(posList.find((p) => p.departmentId === deptList[0].id)?.id || ''),
        }));
      }
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal memuat data karyawan' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const querySearch = searchParams.get('search') || '';
    const nextFilters = { ...filters, search: querySearch };
    setFilters(nextFilters);
    loadEmployees(nextFilters);
  }, [searchParams]);

  const openCreateForm = () => {
    const defaultDept = departments[0]?.id ? String(departments[0].id) : '';
    const defaultPos = positions.find((p) => String(p.departmentId) === defaultDept)?.id;
    setEditingId(null);
    setForm({
      ...initialForm,
      department_id: defaultDept,
      position_id: defaultPos ? String(defaultPos) : '',
    });
    setShowForm(true);
    setFeedback({ message: '', error: '' });
  };

  const openEditForm = (emp) => {
    setEditingId(emp.id);
    setForm({
      nip: emp.nip || '',
      full_name: emp.fullName || '',
      gender: emp.gender || 'male',
      email: emp.email || '',
      password: '',
      role: emp.role || 'karyawan',
      department_id: emp.departmentId ? String(emp.departmentId) : '',
      position_id: emp.positionId ? String(emp.positionId) : '',
      phone: emp.phone || '',
      address: emp.address || '',
      join_date: emp.joinDate || new Date().toISOString().slice(0, 10),
      status: emp.status || 'active',
      account_status: emp.accountStatus || 'active',
    });
    setShowForm(true);
    setFeedback({ message: '', error: '' });
  };

  const handleDepartmentChange = (deptId) => {
    const firstMatch = positions.find((p) => String(p.departmentId) === String(deptId));
    setForm((prev) => ({
      ...prev,
      department_id: deptId,
      position_id: firstMatch ? String(firstMatch.id) : '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ message: '', error: '' });

    try {
      const payload = {
        ...form,
        department_id: Number(form.department_id),
        position_id: form.position_id ? Number(form.position_id) : null,
      };
      if (editingId && !payload.password) {
        delete payload.password;
      }

      const res = editingId
        ? await api.updateHrdEmployee(editingId, payload)
        : await api.createHrdEmployee(payload);

      setFeedback({ message: res.message, error: '' });
      setShowForm(false);
      setEditingId(null);
      window.dispatchEvent(new Event('hrd-counts-updated'));
      await loadEmployees(filters);
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menyimpan data karyawan' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (emp) => {
    if (!window.confirm(`Hapus data karyawan ${emp.fullName} (${emp.nip}) beserta akunnya?`)) {
      return;
    }

    setFeedback({ message: '', error: '' });
    try {
      const res = await api.deleteHrdEmployee(emp.id);
      setFeedback({ message: res.message, error: '' });
      window.dispatchEvent(new Event('hrd-counts-updated'));
      await loadEmployees(filters);
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menghapus data karyawan' });
    }
  };

  const filteredPositions = positions.filter(
    (p) => !form.department_id || String(p.departmentId) === String(form.department_id)
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal HRD &middot; Manajemen SDM</div>
          <h1 className="page-title">Data Karyawan</h1>
          <p className="page-subtitle">Tambah, edit, lihat, dan kelola seluruh data karyawan serta akun login perusahaan.</p>
        </div>
        <button type="button" className="btn-primary" onClick={openCreateForm}>
          + Tambah Karyawan
        </button>
      </div>

      <div className="hrd-subnav">
        <Link to="/hrd/karyawan" className="hrd-subnav-link active">Daftar Karyawan</Link>
        <Link to="/hrd/face-registration" className="hrd-subnav-link">Face Registration</Link>
      </div>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}

      {showForm && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{editingId ? 'Edit Data Karyawan' : 'Tambah Karyawan Baru'}</h2>
              <p className="panel-subtitle">Lengkapi identitas kepegawaian dan akun akses sistem.</p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
              Tutup
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-grid-3">
              <div>
                <label className="notes-label" htmlFor="emp-nip">NIP {editingId ? '(Wajib)' : '(Opsional / Otomatis)'}</label>
                <input
                  id="emp-nip"
                  type="text"
                  className="notes-input"
                  value={form.nip}
                  onChange={(e) => setForm({ ...form, nip: e.target.value })}
                  required={Boolean(editingId)}
                  placeholder="Contoh: EMP010"
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="emp-name">Nama Lengkap</label>
                <input
                  id="emp-name"
                  type="text"
                  className="notes-input"
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="emp-gender">Jenis Kelamin</label>
                <select
                  id="emp-gender"
                  className="notes-input"
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                >
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="notes-label" htmlFor="emp-email">Email Login</label>
                <input
                  id="emp-email"
                  type="email"
                  className="notes-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="emp-pass">
                  Password {editingId ? '(Kosongkan jika tidak diubah)' : '(Min. 6 karakter)'}
                </label>
                <input
                  id="emp-pass"
                  type="password"
                  className="notes-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required={!editingId}
                  minLength={editingId ? undefined : 6}
                  placeholder={editingId ? 'Biarkan kosong jika tetap' : 'Minimal 6 karakter'}
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="emp-role">Role Akses</label>
                <select
                  id="emp-role"
                  className="notes-input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="karyawan">Karyawan</option>
                  <option value="spv">SPV (Supervisor)</option>
                  <option value="hrd">HRD</option>
                </select>
              </div>

              <div>
                <label className="notes-label" htmlFor="emp-dept">Departemen</label>
                <select
                  id="emp-dept"
                  className="notes-input"
                  value={form.department_id}
                  onChange={(e) => handleDepartmentChange(e.target.value)}
                  required
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="notes-label" htmlFor="emp-pos">Jabatan</label>
                <select
                  id="emp-pos"
                  className="notes-input"
                  value={form.position_id}
                  onChange={(e) => setForm({ ...form, position_id: e.target.value })}
                >
                  <option value="">-- Pilih Jabatan --</option>
                  {filteredPositions.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="notes-label" htmlFor="emp-join">Tanggal Bergabung</label>
                <input
                  id="emp-join"
                  type="date"
                  className="notes-input"
                  value={form.join_date}
                  onChange={(e) => setForm({ ...form, join_date: e.target.value })}
                  required
                />
              </div>

              <div>
                <label className="notes-label" htmlFor="emp-phone">No. Telepon</label>
                <input
                  id="emp-phone"
                  type="text"
                  className="notes-input"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="notes-label" htmlFor="emp-status">Status Karyawan</label>
                <select
                  id="emp-status"
                  className="notes-input"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                >
                  <option value="active">Aktif</option>
                  <option value="probation">Probation</option>
                  <option value="resigned">Resigned</option>
                </select>
              </div>
              <div>
                <label className="notes-label" htmlFor="emp-acc-status">Status Akun Login</label>
                <select
                  id="emp-acc-status"
                  className="notes-input"
                  value={form.account_status}
                  onChange={(e) => setForm({ ...form, account_status: e.target.value })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div>
              <label className="notes-label" htmlFor="emp-addr">Alamat</label>
              <textarea
                id="emp-addr"
                rows="2"
                className="notes-input"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Menyimpan...' : editingId ? 'Simpan Perubahan' : 'Simpan Karyawan'}
              </button>
              <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>
                Batal
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            loadEmployees(filters);
          }}
          style={{ display: 'flex', flexWrap: 'wrap', gap: '0.85rem', alignItems: 'flex-end' }}
        >
          <div style={{ flex: '1 1 220px' }}>
            <label className="notes-label" htmlFor="flt-search">Cari NIP / Nama / Email</label>
            <input
              id="flt-search"
              type="text"
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Ketik kata kunci..."
            />
          </div>
          <div>
            <label className="notes-label" htmlFor="flt-dept">Departemen</label>
            <select
              id="flt-dept"
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
          <div>
            <label className="notes-label" htmlFor="flt-status">Status</label>
            <select
              id="flt-status"
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            >
              <option value="">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="probation">Probation</option>
              <option value="resigned">Resigned</option>
            </select>
          </div>
          <div>
            <label className="notes-label" htmlFor="flt-role">Role</label>
            <select
              id="flt-role"
              className="notes-input"
              style={{ marginBottom: 0 }}
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
            >
              <option value="">Semua Role</option>
              <option value="karyawan">Karyawan</option>
              <option value="spv">SPV</option>
              <option value="hrd">HRD</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">Terapkan</button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              const reset = { search: '', department_id: '', status: '', role: '' };
              setFilters(reset);
              loadEmployees(reset);
            }}
          >
            Reset
          </button>
        </form>
      </section>

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat data karyawan...</p>
        ) : employees.length === 0 ? (
          <p className="panel-note">Tidak ada karyawan yang cocok dengan filter.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>NIP</th>
                  <th>Nama &amp; Email</th>
                  <th>Departemen &amp; Jabatan</th>
                  <th>Role</th>
                  <th>Data Wajah</th>
                  <th>Bergabung</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td><strong>{emp.nip}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{emp.fullName}</div>
                      <small style={{ color: '#64748b' }}>{emp.email || '-'}</small>
                    </td>
                    <td>
                      <div>{emp.department || '-'}</div>
                      <small style={{ color: '#64748b' }}>{emp.position || '-'}</small>
                    </td>
                    <td><span className="role-pill">{(emp.role || 'karyawan').toUpperCase()}</span></td>
                    <td>
                      <span className={`status-badge ${emp.faceStatus === 'active' ? 'status-approved' : 'status-default'}`}>
                        {emp.faceStatus === 'active' ? 'Terdaftar' : 'Belum'}
                      </span>
                    </td>
                    <td>{formatDate(emp.joinDate)}</td>
                    <td>
                      <span className={`status-badge status-${emp.status}`}>{emp.status}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                        <button type="button" className="detail-button" onClick={() => setDetailEmp(emp)}>
                          Detail
                        </button>
                        <button type="button" className="detail-button" onClick={() => openEditForm(emp)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="detail-button"
                          onClick={() => navigate(`/hrd/face-registration?employeeId=${emp.id}`)}
                        >
                          Wajah
                        </button>
                        <button
                          type="button"
                          className="logout-button"
                          onClick={() => handleDelete(emp)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailEmp && (
        <div className="modal-backdrop" onClick={() => setDetailEmp(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">Profil Kepegawaian</div>
                <h2 className="panel-title" style={{ fontSize: '1.15rem' }}>{detailEmp.fullName}</h2>
                <p className="panel-subtitle">{detailEmp.nip} &middot; {detailEmp.department || '-'}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Tutup detail karyawan"
                onClick={() => setDetailEmp(null)}
              >
                &times;
              </button>
            </div>

            <div className="detail-grid">
              <div className="detail-item"><span>NIP</span><strong>{detailEmp.nip}</strong></div>
              <div className="detail-item"><span>Role Akun</span><strong>{(detailEmp.role || 'karyawan').toUpperCase()}</strong></div>
              <div className="detail-item"><span>Email</span><strong>{detailEmp.email || '-'}</strong></div>
              <div className="detail-item"><span>No. Telepon</span><strong>{detailEmp.phone || '-'}</strong></div>
              <div className="detail-item"><span>Departemen</span><strong>{detailEmp.department || '-'}</strong></div>
              <div className="detail-item"><span>Jabatan</span><strong>{detailEmp.position || '-'}</strong></div>
              <div className="detail-item"><span>Jenis Kelamin</span><strong>{detailEmp.gender === 'female' ? 'Perempuan' : 'Laki-laki'}</strong></div>
              <div className="detail-item"><span>Tanggal Bergabung</span><strong>{formatDate(detailEmp.joinDate)}</strong></div>
              <div className="detail-item"><span>Status Karyawan</span><strong>{detailEmp.status}</strong></div>
              <div className="detail-item"><span>Status Akun</span><strong>{detailEmp.accountStatus}</strong></div>
              <div className="detail-item">
                <span>Face Registration</span>
                <strong>{detailEmp.faceStatus === 'active' ? 'Terdaftar' : 'Belum Terdaftar'}</strong>
              </div>
              <div className="detail-item">
                <span>Persetujuan Wajah</span>
                <strong>{detailEmp.faceConsentAt ? formatDate(detailEmp.faceConsentAt) : '-'}</strong>
              </div>
            </div>

            <div className="detail-note">
              <span>Alamat</span>
              <p>{detailEmp.address || 'Belum diisi.'}</p>
            </div>

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  const emp = detailEmp;
                  setDetailEmp(null);
                  openEditForm(emp);
                }}
              >
                Edit Karyawan
              </button>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  const id = detailEmp.id;
                  setDetailEmp(null);
                  navigate(`/hrd/face-registration?employeeId=${id}`);
                }}
              >
                Kelola Wajah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HrdEmployees;
