import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatDate } from '../utils/formatters.js';

const SpvTeam = () => {
  const [loading, setLoading] = useState(true);
  const [department, setDepartment] = useState('');
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const res = await api.getSpvTeam();
        setDepartment(res.data?.department || '');
        setMembers(res.data?.members || []);
      } catch (err) {
        setError(err.message || 'Gagal memuat data tim');
      } finally {
        setLoading(false);
      }
    };

    fetchTeam();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV &middot; Divisi {department || '-'}</div>
          <h1 className="page-title">Data Tim</h1>
          <p className="page-subtitle">Daftar anggota karyawan aktif dalam tanggung jawab divisi Anda (hanya baca).</p>
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat anggota tim...</p>
        ) : members.length === 0 ? (
          <p className="panel-note">Belum ada anggota tim di divisi Anda.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama Lengkap</th>
                <th>Jabatan</th>
                <th>Email</th>
                <th>No. Telepon</th>
                <th>Tanggal Masuk</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td><strong>{member.nip}</strong></td>
                  <td>{member.fullName}</td>
                  <td>{member.position || '-'}</td>
                  <td>{member.email || '-'}</td>
                  <td>{member.phone || '-'}</td>
                  <td>{formatDate(member.joinDate)}</td>
                  <td><span className={`status-badge status-${member.status}`}>{member.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default SpvTeam;
