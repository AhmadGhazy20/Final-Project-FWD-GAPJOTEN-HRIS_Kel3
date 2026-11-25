import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';

const statusLabel = (status) => {
  const labels = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
  };

  return labels[status] || status;
};

const typeLabel = (type) => {
  const labels = {
    cuti: 'Cuti',
    izin_sakit: 'Izin sakit',
    izin: 'Izin',
    sakit: 'Sakit',
  };

  return labels[type] || type;
};

const formatDate = (value) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(value));

const durationDays = (start, end) => {
  const diff = new Date(end) - new Date(start);
  return Math.max(Math.round(diff / 86400000) + 1, 1);
};

const requestCode = (request) => {
  const year = new Date(request.startDate).getFullYear();
  return `GJT-${year}-${String(request.id).padStart(4, '0')}`;
};

const LeaveRequests = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [filter, setFilter] = useState('semua');
  const [search, setSearch] = useState('');
  const selectedId = Number(searchParams.get('request') || 0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [leaveRes, dashboardRes] = await Promise.all([
          api.getSpvLeaveRequests(),
          api.getSpvDashboard(),
        ]);

        setRequests(leaveRes.data || []);
        setSummary(dashboardRes.data?.stats?.leaveSummary || summary);
      } catch (err) {
        console.error('Error fetching leave requests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filtered = useMemo(() => {
    return requests.filter((request) => {
      const matchesStatus = filter === 'semua' || request.status === filter;
      const matchesSearch = (request.fullName || '').toLowerCase().includes(search.toLowerCase());

      return matchesStatus && matchesSearch;
    });
  }, [requests, filter, search]);

  const selected = requests.find((request) => request.id === selectedId) || filtered[0] || null;
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date());

  const selectRequest = (id) => {
    setSearchParams({ request: String(id) });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV</div>
          <h1 className="page-title">Cuti & izin tim</h1>
          <p className="page-subtitle">Tinjau pengajuan dan lihat perencanaan tim tetap berjalan.</p>
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
        <div className="filter-tools">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari karyawan"
            aria-label="Cari karyawan"
          />
          <div className="month-pill">{monthLabel}</div>
        </div>
      </div>

      <div className="leave-layout">
        <section className="panel leave-list-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">{filtered.length} pengajuan tim</h2>
              <p className="panel-subtitle">Daftar pengajuan cuti dan izin tim</p>
            </div>
          </div>

          {loading ? (
            <p className="panel-note">Memuat pengajuan...</p>
          ) : filtered.length === 0 ? (
            <p className="panel-note">Tidak ada pengajuan yang cocok.</p>
          ) : (
            <div className="leave-list">
              {filtered.map((request) => (
                <button
                  type="button"
                  key={request.id}
                  className={`leave-card${selected?.id === request.id ? ' selected' : ''}`}
                  onClick={() => selectRequest(request.id)}
                >
                  <div className="leave-card-top">
                    <div className="person-avatar">{request.fullName?.charAt(0) || 'K'}</div>
                    <div className="leave-card-main">
                      <div className="person-name">{request.fullName}</div>
                      <div className="person-sub">Karyawan &middot; {request.nip ? `GJT-${request.nip}` : 'GJT'}</div>
                    </div>
                    <span className={`status-badge status-${request.status}`}>{statusLabel(request.status)}</span>
                  </div>
                  <div className="leave-card-body">
                    <div>
                      <span className="leave-type">{typeLabel(request.leaveType)}</span>
                      <span className="person-sub"> &middot; {formatDate(request.startDate)} - {formatDate(request.endDate)}</span>
                    </div>
                    <div className="leave-card-meta">
                      <span>{durationDays(request.startDate, request.endDate)} hari kerja</span>
                      <span className="detail-link">Detail</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className="leave-side">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Kalender tim</h2>
                <p className="panel-subtitle">Ringkasan pengajuan bulan ini</p>
              </div>
            </div>
            <div className="calendar-summary">
              <div className="calendar-stat approved">
                <span className="calendar-stat-value">{summary.approved}</span>
                <span>Disetujui</span>
              </div>
              <div className="calendar-stat rejected">
                <span className="calendar-stat-value">{summary.rejected}</span>
                <span>Ditolak</span>
              </div>
              <div className="calendar-stat pending">
                <span className="calendar-stat-value">{summary.pending}</span>
                <span>Menunggu</span>
              </div>
            </div>
            <div className="calendar-legend">
              <span><i className="dot approved-dot" /> Cuti</span>
              <span><i className="dot rejected-dot" /> Izin sakit</span>
              <span><i className="dot pending-dot" /> Menunggu</span>
            </div>
          </section>

          <section className="panel detail-panel">
            {selected ? (
              <>
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Detail pengajuan cuti</h2>
                    <p className="panel-subtitle">{requestCode(selected)}</p>
                  </div>
                  <span className={`status-badge status-${selected.status}`}>{statusLabel(selected.status)}</span>
                </div>

                <div className="detail-grid">
                  <div className="detail-item">
                    <span>Nama</span>
                    <strong>{selected.fullName}</strong>
                  </div>
                  <div className="detail-item">
                    <span>NIK</span>
                    <strong>GJT-{String(selected.employeeId).padStart(3, '0')}B</strong>
                  </div>
                  <div className="detail-item">
                    <span>Jenis</span>
                    <strong>{typeLabel(selected.leaveType)}</strong>
                  </div>
                  <div className="detail-item">
                    <span>Durasi</span>
                    <strong>{durationDays(selected.startDate, selected.endDate)} hari kerja</strong>
                  </div>
                </div>

                <div className="detail-date-range">
                  <div>
                    <span>Mulai</span>
                    <strong>{formatDate(selected.startDate)}</strong>
                  </div>
                  <span className="range-arrow">&rarr;</span>
                  <div>
                    <span>Selesai</span>
                    <strong>{formatDate(selected.endDate)}</strong>
                  </div>
                </div>

                <div className="detail-note">
                  <span>Alasan</span>
                  <p>{selected.reason || 'Tidak ada keterangan tambahan.'}</p>
                  <p className="coordination-note">Pekerjaan telah dikoordinasikan dengan tim.</p>
                </div>

                <div className="approval-note">Catatan persetujuan diteruskan ke HRD.</div>
                <div className="approval-actions">
                  <button type="button" className="btn-secondary" disabled title="Persetujuan akhir oleh HRD">Tolak</button>
                  <button type="button" className="btn-primary" disabled title="Persetujuan akhir oleh HRD">Setujui</button>
                </div>
                <div className="hrd-note">Diteruskan ke HRD</div>
              </>
            ) : (
              <p className="panel-note">Pilih pengajuan untuk melihat detail.</p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};

export default LeaveRequests;
