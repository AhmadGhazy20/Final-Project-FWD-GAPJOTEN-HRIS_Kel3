import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const Team = () => {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getSpvTeam();
        setMembers(res.data || []);
      } catch (err) {
        console.error('Error fetching team:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV</div>
          <h1 className="page-title">Anggota tim</h1>
          <p className="page-subtitle">Daftar karyawan aktif yang berada dalam pengawasan Anda.</p>
        </div>
      </div>

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat anggota tim...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>NIP</th>
                <th>Posisi</th>
                <th>Divisi</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>{member.fullName}</td>
                  <td>{member.nip}</td>
                  <td>{member.position}</td>
                  <td>{member.division}</td>
                  <td>{member.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Team;
