import React, { useState, useEffect } from 'react';
import { api } from '../services/api.js';

const Employees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.getEmployees();
      setEmployees(res.data || []);
    } catch (err) {
      setError(err.message || 'Gagal memuat data pegawai');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployees();
  }, []);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>Data Pegawai</h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Daftar seluruh pegawai dan informasi status kepegawaian</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => alert('Fitur tambah pegawai dapat dihubungkan ke modal form.')}
        >
          + Tambah Pegawai
        </button>
      </div>

      <div className="card">
        {loading && <p>Memuat data pegawai dari backend Laravel...</p>}
        {error && (
          <div style={{ padding: '1rem', background: '#fee2e2', color: '#991b1b', borderRadius: '6px' }}>
            {error} (Pastikan server backend sudah berjalan di port 5000)
          </div>
        )}

        {!loading && !error && (
          <table className="table">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama Lengkap</th>
                <th>Email</th>
                <th>Posisi / Jabatan</th>
                <th>Departemen</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: 'center', color: '#94a3b8' }}>
                    Belum ada data pegawai.
                  </td>
                </tr>
              ) : (
                employees.map((emp) => (
                  <tr key={emp.id}>
                    <td><strong>{emp.nip}</strong></td>
                    <td>{emp.fullName}</td>
                    <td>{emp.email}</td>
                    <td>{emp.position}</td>
                    <td>{emp.department}</td>
                    <td>
                      <span className="badge badge-active">
                        {emp.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Employees;

