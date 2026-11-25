import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDate, formatDateTime, leaveStatusLabel, leaveTypeLabel } from '../utils/formatters.js';

const durationDays = (start, end) => {
  const diff = new Date(end) - new Date(start);
  return Math.max(Math.round(diff / 86400000) + 1, 1);
};

const HrdLeaveApprovals = ({ category = 'all' }) => {
  const [searchParams] = useSearchParams();
  const [activeCategory, setActiveCategory] = useState(category);
  const isSick = activeCategory === 'sakit';
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [departments, setDepartments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('semua');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [decisionNotes, setDecisionNotes] = useState('');
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  const loadRequests = async (cat = activeCategory, preferId = null) => {
    setLoading(true);
    try {
      const res = await api.getHrdLeaveRequests({
        category: cat === 'all' ? '' : cat,
        department_id: departmentFilter,
        search,
      });
      const items = res.data?.items || [];
      setRows(items);
      setSummary(res.data?.summary || { pending: 0, approved: 0, rejected: 0 });
      setDepartments(res.data?.departments || []);

      if (items.length > 0) {
        const requestedId = preferId ?? Number(searchParams.get('id') || 0);
        const byQuery = requestedId ? items.find((i) => i.id === requestedId) : null;
        const stillExists = items.find((i) => i.id === selectedId);
        const target = byQuery || stillExists || items.find((i) => i.status === 'pending') || items[0];
        setSelectedId(target.id);
        setDecisionNotes(target.decisionNotes || '');
        if (byQuery) {
          setDetailModalOpen(true);
        }
      } else {
        setSelectedId(null);
        setDecisionNotes('');
      }
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal memuat daftar pengajuan' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveCategory(category);
    setStatusFilter('semua');
    setSelectedId(null);
    setFeedback({ message: '', error: '' });
    loadRequests(category);
  }, [category]);

  const filtered = statusFilter === 'semua'
    ? rows
    : rows.filter((row) => row.status === statusFilter);

  const selected = filtered.find((r) => r.id === selectedId) || filtered[0] || null;

  const selectItem = (item, openModal = false) => {
    setSelectedId(item.id);
    setDecisionNotes(item.decisionNotes || '');
    if (openModal) {
      setDetailModalOpen(true);
    }
  };

  const handleDownloadCert = async (leaveId) => {
    setFeedback({ message: '', error: '' });
    try {
      await api.downloadMedicalCertificate(leaveId);
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal membuka surat dokter' });
    }
  };

  const handleDecision = async (status) => {
    if (!selected) return;
    setSaving(true);
    setFeedback({ message: '', error: '' });
    try {
      const res = await api.decideHrdLeaveRequest(selected.id, {
        status,
        decision_notes: decisionNotes || null,
      });
      setFeedback({ message: res.message, error: '' });
      setDetailModalOpen(false);
      window.dispatchEvent(new Event('hrd-counts-updated'));
      await loadRequests(activeCategory, selected.id);
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal memproses keputusan pengajuan' });
    } finally {
      setSaving(false);
    }
  };

  const renderDetailContent = (item, inModal = false) => (
    <>
      <div className="detail-grid">
        <div className="detail-item"><span>Karyawan</span><strong>{item.fullName}</strong></div>
        <div className="detail-item"><span>NIP</span><strong>{item.nip}</strong></div>
        <div className="detail-item"><span>Departemen</span><strong>{item.department || '-'}</strong></div>
        <div className="detail-item"><span>Jabatan</span><strong>{item.position || '-'}</strong></div>
        {inModal && (
          <>
            <div className="detail-item"><span>Email</span><strong>{item.email || '-'}</strong></div>
            <div className="detail-item"><span>No. Telepon</span><strong>{item.phone || '-'}</strong></div>
          </>
        )}
        <div className="detail-item"><span>Jenis Pengajuan</span><strong>{leaveTypeLabel(item.leaveType)}</strong></div>
        <div className="detail-item">
          <span>Status Saat Ini</span>
          <strong>
            <span className={`status-badge status-${item.status}`}>{leaveStatusLabel(item.status)}</span>
          </strong>
        </div>
      </div>

      <div className="detail-date-range">
        <div>
          <span>Mulai</span>
          <strong>{formatDate(item.startDate)}</strong>
        </div>
        <span className="range-arrow">&rarr;</span>
        <div>
          <span>Selesai ({durationDays(item.startDate, item.endDate)} hari)</span>
          <strong>{formatDate(item.endDate)}</strong>
        </div>
      </div>

      <div className="detail-note">
        <span>Alasan Pengajuan</span>
        <p>{item.reason}</p>
      </div>

      {item.hasMedicalCertificate && (
        <div className="detail-note">
          <span>Dokumen Surat Dokter</span>
          <div style={{ marginTop: '0.45rem' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => handleDownloadCert(item.id)}
            >
              Lihat / Unduh Surat Dokter
            </button>
          </div>
        </div>
      )}

      {(item.approverName || item.createdAt) && (
        <div className="approval-note">
          Diajukan: <strong>{formatDateTime(item.createdAt)}</strong>
          {item.approverName && (
            <> &bull; Diputuskan oleh: <strong>{item.approverName}</strong></>
          )}
        </div>
      )}

      <label className="notes-label" htmlFor={inModal ? 'hrd-modal-notes' : 'hrd-dec-notes'}>
        Catatan Keputusan HRD (Opsional)
      </label>
      <textarea
        id={inModal ? 'hrd-modal-notes' : 'hrd-dec-notes'}
        rows="2"
        className="notes-input"
        value={decisionNotes}
        onChange={(e) => setDecisionNotes(e.target.value)}
        placeholder="Contoh: Disetujui sesuai kebijakan cuti / Mohon lengkapi surat dokter"
      />

      <div className="approval-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={saving}
          onClick={() => handleDecision('approved')}
        >
          {saving ? 'Memproses...' : 'Setujui Pengajuan'}
        </button>
        <button
          type="button"
          className="logout-button"
          style={{ padding: '0.55rem 1rem', fontSize: '0.82rem' }}
          disabled={saving}
          onClick={() => handleDecision('rejected')}
        >
          {saving ? 'Memproses...' : 'Tolak Pengajuan'}
        </button>
      </div>
    </>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal HRD &middot; Persetujuan</div>
          <h1 className="page-title">{isSick ? 'Izin Sakit' : activeCategory === 'cuti' ? 'Pengajuan Cuti' : 'Persetujuan HRD'}</h1>
          <p className="page-subtitle">
            {isSick
              ? 'Periksa pengajuan izin sakit beserta surat keterangan dokter, lalu setujui atau tolak.'
              : 'Periksa pengajuan cuti dan izin sakit seluruh karyawan, lalu klik kartu atau Periksa untuk melihat detail lengkap.'}
          </p>
        </div>
      </div>

      <div className="hrd-subnav">
        {[
          { key: 'all', label: 'Semua Pengajuan' },
          { key: 'cuti', label: 'Pengajuan Cuti' },
          { key: 'sakit', label: 'Izin Sakit' },
        ].map((item) => (
          <button
            type="button"
            key={item.key}
            className={`hrd-subnav-link${activeCategory === item.key ? ' active' : ''}`}
            style={{ background: activeCategory === item.key ? '#eff6ff' : 'transparent' }}
            onClick={() => {
              setActiveCategory(item.key);
              loadRequests(item.key);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}

      <div className="filter-bar">
        <div className="filter-tabs">
          {[
            { key: 'semua', label: `Semua (${rows.length})` },
            { key: 'pending', label: `Menunggu (${summary.pending})` },
            { key: 'approved', label: `Disetujui (${summary.approved})` },
            { key: 'rejected', label: `Ditolak (${summary.rejected})` },
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

        <form
          className="filter-tools"
          onSubmit={(e) => {
            e.preventDefault();
            loadRequests(activeCategory);
          }}
        >
          <select
            className="notes-input"
            style={{ marginBottom: 0, width: 'auto' }}
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
          >
            <option value="">Semua Departemen</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari NIP atau nama..."
          />
          <button type="submit" className="btn-secondary">Cari</button>
        </form>
      </div>

      {loading ? (
        <section className="panel"><p className="panel-note">Memuat daftar pengajuan...</p></section>
      ) : (
        <div className="leave-layout">
          <div className="leave-list">
            {filtered.length === 0 ? (
              <section className="panel">
                <p className="panel-note">Tidak ada pengajuan pada kategori ini.</p>
              </section>
            ) : (
              filtered.map((item) => (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  className={`leave-card${selected?.id === item.id ? ' selected' : ''}`}
                  style={{ cursor: 'pointer' }}
                  onClick={() => selectItem(item, false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      selectItem(item, true);
                    }
                  }}
                >
                  <div className="leave-card-top">
                    <div className="person-avatar">{item.fullName?.charAt(0) || 'K'}</div>
                    <div className="leave-card-main">
                      <div className="person-name">{item.fullName}</div>
                      <div className="person-sub">
                        {item.nip} &middot; {item.department || '-'} &middot; {item.position || '-'}
                      </div>
                    </div>
                    <span className={`status-badge status-${item.status}`}>{leaveStatusLabel(item.status)}</span>
                  </div>
                  <div className="leave-card-body">
                    <span className="leave-type">{leaveTypeLabel(item.leaveType)}</span>
                    <div className="leave-card-meta">
                      <span>{formatDate(item.startDate)} - {formatDate(item.endDate)}</span>
                      <button
                        type="button"
                        className="detail-button"
                        onClick={(e) => {
                          e.stopPropagation();
                          selectItem(item, true);
                        }}
                      >
                        Lihat Detail &rarr;
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <aside className="leave-side sticky-side">
            <section className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header">
                <div>
                  <h2 className="panel-title">Detail &amp; Keputusan HRD</h2>
                  <p className="panel-subtitle">Verifikasi alasan dan dokumen pendukung</p>
                </div>
                {selected && (
                  <button
                    type="button"
                    className="detail-button"
                    onClick={() => setDetailModalOpen(true)}
                  >
                    Perbesar
                  </button>
                )}
              </div>

              {!selected ? (
                <p className="panel-note">Pilih salah satu pengajuan di sebelah kiri untuk melihat detail dan memproses.</p>
              ) : (
                renderDetailContent(selected, false)
              )}
            </section>

            <section className="panel" style={{ marginBottom: 0 }}>
              <div className="panel-header" style={{ marginBottom: '0.65rem' }}>
                <div>
                  <h2 className="panel-title">Ringkasan Keputusan</h2>
                  <p className="panel-subtitle">
                    {isSick
                      ? 'Kategori Izin Sakit'
                      : activeCategory === 'cuti'
                        ? 'Kategori Pengajuan Cuti'
                        : 'Semua Pengajuan (Cuti & Izin Sakit)'}
                  </p>
                </div>
              </div>
              <div className="calendar-summary">
                <div className="calendar-stat pending">
                  <span className="calendar-stat-value">{summary.pending}</span>
                  <span>Menunggu</span>
                </div>
                <div className="calendar-stat approved">
                  <span className="calendar-stat-value">{summary.approved}</span>
                  <span>Disetujui</span>
                </div>
                <div className="calendar-stat rejected">
                  <span className="calendar-stat-value">{summary.rejected}</span>
                  <span>Ditolak</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      )}

      {detailModalOpen && selected && (
        <div className="modal-backdrop" onClick={() => setDetailModalOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">Detail Pengajuan #{selected.id}</div>
                <h2 className="panel-title" style={{ fontSize: '1.15rem' }}>
                  {selected.fullName} &mdash; {leaveTypeLabel(selected.leaveType)}
                </h2>
                <p className="panel-subtitle">{selected.nip} &middot; {selected.department || '-'}</p>
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Tutup detail"
                onClick={() => setDetailModalOpen(false)}
              >
                &times;
              </button>
            </div>

            {renderDetailContent(selected, true)}
          </div>
        </div>
      )}
    </div>
  );
};

export default HrdLeaveApprovals;
