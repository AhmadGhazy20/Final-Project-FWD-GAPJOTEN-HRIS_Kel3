import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';

const statusLabel = (status) => {
  const labels = {
    hadir: 'Hadir',
    telat: 'Terlambat',
    cuti: 'Cuti',
    izin_sakit: 'Izin sakit',
    izin: 'Izin',
    sakit: 'Sakit',
    alpha: 'Alpha',
  };

  return labels[status] || status;
};

const Attendance = ({ recap = false }) => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.getSpvAttendance();
        setRows(res.data || []);
      } catch (err) {
        console.error('Error fetching attendance:', err);
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
          <h1 className="page-title">{recap ? 'Rekap kehadiran tim' : 'Absensi saya'}</h1>
          <p className="page-subtitle">
            {recap
              ? 'Rekap kehadiran anggota tim untuk keperluan pelaporan.'
              : 'Pantau kehadiran dan waktu masuk anggota tim hari ini.'}
          </p>
        </div>
      </div>

      <section className="panel">
        {loading ? (
          <p className="panel-note">Memuat data kehadiran...</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Tanggal</th>
                <th>Masuk</th>
                <th>Pulang</th>
                <th>Metode</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.employeeId}-${row.date}`}>
                  <td>{row.fullName}</td>
                  <td>{row.date}</td>
                  <td>{row.clockIn ? String(row.clockIn).split(' ').pop() : '-'}</td>
                  <td>{row.clockOut ? String(row.clockOut).split(' ').pop() : '-'}</td>
                  <td>{row.method || '-'}</td>
                  <td><span className={`status-badge status-${row.status}`}>{statusLabel(row.status)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default Attendance;
