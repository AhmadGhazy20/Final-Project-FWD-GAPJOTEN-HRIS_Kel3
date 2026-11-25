import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDate, leaveStatusLabel, leaveTypeLabel } from '../utils/formatters.js';

const SubmissionStatus = () => {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('semua');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        const res = await api.getKaryawanLeaves();
        setRows(res.data || []);
      } catch (err) {
        setError(err.message || 'Gagal memuat status pengajuan');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, []);

  const filtered = filter === 'semua' ? rows : rows.filter((row) => row.status === filter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Administrasi Kehadiran</div>
          <h1 className="page-title">Cuti &amp; izin saya</h1>
          <p className="page-subtitle">Ajukan cuti/izin sakit atau pantau status persetujuan pengajuan Anda.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
          <Link to="/pengajuan-cuti" className="btn-primary">+ Ajukan Cuti</Link>
          <Link to="/izin-sakit" className="btn-secondary">+ Ajukan Izin Sakit</Link>
        </div>
      </div>

      <div className="filter-bar">
        <div className="filter-tabs">
          {[
            { key: 'semua', label: 'Semua' },
            { key: 'pending', label: 'Menunggu' },
            { key: 'approved', label: 'Disetujui' },
            { key: 'rejected', label: 'Ditolak' },
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
          <p className="panel-note">Memuat daftar pengajuan...</p>
        ) : filtered.length === 0 ? (
          <p className="panel-note">Belum ada pengajuan yang cocok.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Jenis</th>
                <th>Periode</th>
                <th>Alasan</th>
                <th>Surat Dokter</th>
                <th>Status</th>
                <th>Diputuskan Oleh</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><strong>{leaveTypeLabel(item.leaveType)}</strong></td>
                  <td>{formatDate(item.startDate)} - {formatDate(item.endDate)}</td>
                  <td>{item.reason}</td>
                  <td>
                    {item.hasMedicalCertificate ? (
                      <button
                        type="button"
                        className="link-button"
                        onClick={() => api.downloadMedicalCertificate(item.id)}
                      >
                        Lihat Dokumen
                      </button>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td><span className={`status-badge status-${item.status}`}>{leaveStatusLabel(item.status)}</span></td>
                  <td>{item.approverName || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
};

export default SubmissionStatus;
