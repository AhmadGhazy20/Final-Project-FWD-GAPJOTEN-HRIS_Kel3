import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
import { formatDate, leaveStatusLabel, leaveTypeLabel } from '../utils/formatters.js';

const SpvLeaveList = ({ category = 'cuti' }) => {
  const isSick = category === 'sakit';
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [statusFilter, setStatusFilter] = useState('semua');
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    api.getSpvLeaveRequests({ category })
      .then((res) => setRows(res.data || []))
      .catch((err) => setError(err.message || 'Gagal memuat data pengajuan'))
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = statusFilter === 'semua'
    ? rows
    : rows.filter((row) => row.status === statusFilter);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV &middot; Hanya Baca</div>
          <h1 className="page-title">{isSick ? 'Izin Sakit Tim' : 'Pengajuan Cuti Tim'}</h1>
          <p className="page-subtitle">
            {isSick
              ? 'Pantau informasi izin sakit dan dokumen surat dokter anggota tim (keputusan oleh HRD).'
              : 'Pantau status pengajuan cuti anggota tim Anda (approval dilakukan oleh HRD).'}
          </p>
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
              className={`filter-tab${statusFilter === tab.key ? ' active' : ''}`}
              onClick={() => setStatusFilter(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="alert error" style={{ marginBottom: '1rem' }}>{error}</div>}

      <section className="panel">
        <div className="approval-note" style={{ marginBottom: '1rem' }}>
          Sesuai aturan hak akses, SPV hanya dapat memantau pengajuan tim dan tidak melakukan approval cuti atau izin sakit.
        </div>

        {loading ? (
          <p className="panel-note">Memuat data pengajuan...</p>
        ) : filtered.length === 0 ? (
          <p className="panel-note">Belum ada pengajuan yang cocok.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>NIP</th>
                <th>Nama</th>
                <th>Jenis</th>
                <th>Periode</th>
                <th>Alasan</th>
                {isSick && <th>Surat Dokter</th>}
                <th>Status</th>
                <th>Diputuskan Oleh</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.nip}</strong></td>
                  <td>{item.fullName}</td>
                  <td>{leaveTypeLabel(item.leaveType)}</td>
                  <td>{formatDate(item.startDate)} - {formatDate(item.endDate)}</td>
                  <td>{item.reason}</td>
                  {isSick && (
                    <td>
                      {item.hasMedicalCertificate ? (
                        <button
                          type="button"
                          className="link-button"
                          onClick={() => api.downloadMedicalCertificate(item.id)}
                        >
                          Lihat Surat Dokter
                        </button>
                      ) : (
                        '-'
                      )}
                    </td>
                  )}
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

export default SpvLeaveList;
