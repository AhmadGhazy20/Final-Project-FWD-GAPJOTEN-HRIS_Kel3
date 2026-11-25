import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import { api } from '../../services/api.js';
import { attendanceStatusLabel, formatDate } from '../../utils/formatters.js';

const routeTitles = {
  '/': 'Beranda saya',
  '/absensi-wajah': 'Absensi wajah',
  '/riwayat-absensi': 'Riwayat absensi',
  '/pengajuan-cuti': 'Pengajuan cuti',
  '/izin-sakit': 'Izin sakit',
  '/status-pengajuan': 'Cuti & izin saya',
  '/informasi': 'Informasi perusahaan',
  '/profil': 'Profil saya',
  '/bantuan': 'Pusat bantuan',
  '/data-tim': 'Data tim',
  '/monitoring-absensi': 'Monitoring absensi',
  '/riwayat-kehadiran': 'Riwayat kehadiran',
  '/pengajuan-cuti-tim': 'Pengajuan cuti tim',
  '/izin-sakit-tim': 'Izin sakit tim',
  '/laporan-tim': 'Laporan tim',
  '/hrd/karyawan': 'Data karyawan',
  '/hrd/face-registration': 'Face Registration',
  '/hrd/absensi': 'Monitor absensi',
  '/hrd/pengajuan-cuti': 'Persetujuan HRD',
  '/hrd/izin-sakit': 'Persetujuan HRD',
  '/hrd/informasi': 'Informasi perusahaan',
  '/hrd/laporan-absensi': 'Laporan organisasi',
  '/hrd/pengaturan': 'Pengaturan',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [hrdStats, setHrdStats] = useState(null);
  const [statModal, setStatModal] = useState({
    open: false,
    loading: false,
    type: '',
    title: '',
    subtitle: '',
    items: [],
    error: '',
  });

  const isHrd = user?.role === 'hrd';

  useEffect(() => {
    if (!isHrd) {
      setHrdStats(null);
      return undefined;
    }

    const fetchHrdStats = () => {
      api.getHrdDashboard()
        .then((res) => setHrdStats(res.data?.stats || null))
        .catch(() => {});
    };

    const handleOpenDetailEvent = (event) => {
      const type = event.detail?.type;
      if (type) {
        openStatDetail(type);
      }
    };

    fetchHrdStats();
    window.addEventListener('hrd-counts-updated', fetchHrdStats);
    window.addEventListener('hrd-open-stat-detail', handleOpenDetailEvent);

    return () => {
      window.removeEventListener('hrd-counts-updated', fetchHrdStats);
      window.removeEventListener('hrd-open-stat-detail', handleOpenDetailEvent);
    };
  }, [isHrd]);

  const openStatDetail = async (type) => {
    setStatModal({
      open: true,
      loading: true,
      type,
      title: 'Memuat detail...',
      subtitle: '',
      items: [],
      error: '',
    });

    try {
      const res = await api.getHrdSummaryDetail(type);
      setStatModal({
        open: true,
        loading: false,
        type,
        title: res.data?.title || 'Detail Ringkasan',
        subtitle: res.data?.subtitle || '',
        items: res.data?.items || [],
        error: '',
      });
    } catch (err) {
      setStatModal((prev) => ({
        ...prev,
        loading: false,
        title: 'Gagal Memuat Detail',
        error: err.message || 'Terjadi kesalahan saat mengambil detail data.',
      }));
    }
  };

  const pageTitle = location.pathname === '/' && user?.role === 'spv'
    ? 'Dashboard SPV'
    : location.pathname === '/' && isHrd
      ? 'Dashboard'
      : routeTitles[location.pathname] || 'Portal HRIS';

  const quickItems = useMemo(() => {
    if (isHrd) {
      return [
        { label: 'Dashboard HRD', to: '/' },
        { label: 'Monitor absensi', to: '/hrd/absensi' },
        { label: 'Data karyawan', to: '/hrd/karyawan' },
        { label: 'Face Registration', to: '/hrd/face-registration' },
        { label: 'Persetujuan HRD (Cuti & Sakit)', to: '/hrd/pengajuan-cuti' },
        { label: 'Laporan organisasi', to: '/hrd/laporan-absensi' },
        { label: 'Informasi perusahaan', to: '/hrd/informasi' },
        { label: 'Pengaturan', to: '/hrd/pengaturan' },
        { label: 'Profil saya', to: '/profil' },
        { label: 'Pusat bantuan', to: '/bantuan' },
      ];
    }

    if (user?.role === 'spv') {
      return [
        { label: 'Dashboard SPV', to: '/' },
        { label: 'Data tim', to: '/data-tim' },
        { label: 'Monitoring absensi', to: '/monitoring-absensi' },
        { label: 'Riwayat kehadiran', to: '/riwayat-kehadiran' },
        { label: 'Pengajuan cuti tim', to: '/pengajuan-cuti-tim' },
        { label: 'Izin sakit tim', to: '/izin-sakit-tim' },
        { label: 'Laporan tim', to: '/laporan-tim' },
        { label: 'Informasi', to: '/informasi' },
        { label: 'Profil saya', to: '/profil' },
      ];
    }

    return [
      { label: 'Beranda saya', to: '/' },
      { label: 'Absensi wajah', to: '/absensi-wajah' },
      { label: 'Profil saya', to: '/profil' },
      { label: 'Ajukan cuti', to: '/pengajuan-cuti' },
      { label: 'Ajukan izin sakit', to: '/izin-sakit' },
      { label: 'Status pengajuan / Cuti & izin saya', to: '/status-pengajuan' },
      { label: 'Riwayat absensi', to: '/riwayat-absensi' },
      { label: 'Informasi perusahaan', to: '/informasi' },
      { label: 'Pusat bantuan', to: '/bantuan' },
    ];
  }, [isHrd, user?.role]);

  const matches = search.trim()
    ? quickItems.filter((item) => item.label.toLowerCase().includes(search.toLowerCase()))
    : [];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (matches.length > 0) {
      navigate(matches[0].to);
      setSearch('');
      return;
    }
    if (isHrd && search.trim()) {
      navigate(`/hrd/karyawan?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const roleLabel = user?.role === 'karyawan'
    ? 'Karyawan'
    : user?.role === 'spv'
      ? 'SPV'
      : 'HRD';

  const navSummaryPills = isHrd && hrdStats
    ? [
        { key: 'total', label: 'Total karyawan', value: hrdStats.totalEmployees ?? 0, tone: 'blue' },
        { key: 'present', label: 'Hadir hari ini', value: hrdStats.presentToday ?? 0, tone: 'cyan' },
        { key: 'late', label: 'Terlambat', value: hrdStats.lateToday ?? 0, tone: 'amber' },
        { key: 'leave_sick', label: 'Cuti & sakit', value: hrdStats.sickOrLeaveToday ?? 0, tone: 'purple' },
      ]
    : [];

  const modalTargetRoute = statModal.type === 'total'
    ? { to: '/hrd/karyawan', label: 'Buka Data Karyawan' }
    : statModal.type === 'leave_sick'
      ? { to: '/hrd/pengajuan-cuti', label: 'Buka Persetujuan HRD' }
      : { to: '/hrd/absensi', label: 'Buka Monitor Absensi' };

  return (
    <>
      <div className="topbar-shell">
        <header className="topbar">
          <div className="topbar-breadcrumb">
            <span className="breadcrumb-root">Workspace</span>
            <span className="breadcrumb-sep">/</span>
            <strong className="breadcrumb-current">{pageTitle}</strong>
          </div>

          <div className="topbar-search-wrapper">
            <form className="topbar-search" onSubmit={handleSearchSubmit}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isHrd ? 'Cari karyawan atau menu...' : 'Cari menu atau bantuan...'}
                aria-label={isHrd ? 'Cari karyawan atau menu' : 'Cari menu atau bantuan'}
              />
              <kbd className="search-kbd">⌘ K</kbd>
            </form>
            {matches.length > 0 && (
              <div className="search-dropdown">
                {matches.slice(0, 5).map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="search-dropdown-item"
                    onClick={() => setSearch('')}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="topbar-actions">
            <Link
              to={isHrd ? '/hrd/informasi' : '/informasi'}
              className="notification-icon-btn"
              aria-label="Informasi perusahaan"
              title="Informasi perusahaan"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              <span className="notification-dot" />
            </Link>

            <span className="role-pill">{roleLabel}</span>

            <div className="topbar-user">
              <div className="topbar-user-meta">
                <strong>{user?.name || 'Pengguna'}</strong>
                <span>{user?.position || user?.department || roleLabel}</span>
              </div>
            </div>

            <button type="button" className="logout-button" onClick={logout} title="Keluar dari akun">
              Keluar
            </button>
          </div>
        </header>

        {navSummaryPills.length > 0 && (
          <div className="hrd-navbar-stats" role="region" aria-label="Ringkasan HRD cepat">
            <div className="hrd-navbar-stats-list">
              {navSummaryPills.map((pill) => (
                <button
                  type="button"
                  key={pill.key}
                  className={`hrd-nav-stat-pill ${pill.tone}`}
                  onClick={() => openStatDetail(pill.key)}
                  title={`Lihat detail ${pill.label}`}
                >
                  <span className="hrd-nav-stat-dot" />
                  <span className="hrd-nav-stat-label">{pill.label}</span>
                  <strong className="hrd-nav-stat-val">{pill.value}</strong>
                  <span className="hrd-nav-stat-arrow">Detail &rarr;</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {statModal.open && (
        <div className="modal-backdrop" onClick={() => setStatModal((prev) => ({ ...prev, open: false }))}>
          <div className="modal-card" style={{ maxWidth: '720px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <div className="eyebrow">Ringkasan HRD Live</div>
                <h2 className="panel-title" style={{ fontSize: '1.15rem' }}>{statModal.title}</h2>
                {statModal.subtitle && <p className="panel-subtitle">{statModal.subtitle}</p>}
              </div>
              <button
                type="button"
                className="modal-close"
                aria-label="Tutup detail ringkasan"
                onClick={() => setStatModal((prev) => ({ ...prev, open: false }))}
              >
                &times;
              </button>
            </div>

            {statModal.loading ? (
              <p className="panel-note">Memuat daftar detail...</p>
            ) : statModal.error ? (
              <div className="alert error">{statModal.error}</div>
            ) : statModal.items.length === 0 ? (
              <p className="panel-note">Tidak ada data karyawan pada kategori ini hari ini.</p>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="table" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th>NIP</th>
                      <th>Nama</th>
                      <th>Departemen &amp; Jabatan</th>
                      {statModal.type === 'total' ? (
                        <>
                          <th>Bergabung</th>
                          <th>Status</th>
                        </>
                      ) : statModal.type === 'leave_sick' ? (
                        <>
                          <th>Status</th>
                          <th>Catatan</th>
                        </>
                      ) : (
                        <>
                          <th>Clock In</th>
                          <th>Metode</th>
                          <th>Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {statModal.items.map((row) => (
                      <tr key={row.employeeId}>
                        <td><strong>{row.nip}</strong></td>
                        <td>{row.fullName}</td>
                        <td>
                          <div>{row.department || '-'}</div>
                          <small style={{ color: '#64748b' }}>{row.position || '-'}</small>
                        </td>
                        {statModal.type === 'total' ? (
                          <>
                            <td>{formatDate(row.joinDate)}</td>
                            <td><span className={`status-badge status-${row.status}`}>{row.status}</span></td>
                          </>
                        ) : statModal.type === 'leave_sick' ? (
                          <>
                            <td>
                              <span className={`status-badge status-${row.status}`}>
                                {attendanceStatusLabel(row.status)}
                              </span>
                            </td>
                            <td>{row.notes || '-'}</td>
                          </>
                        ) : (
                          <>
                            <td>{row.clockIn ? String(row.clockIn).slice(0, 5) : '-'}</td>
                            <td>{row.method ? row.method.toUpperCase() : '-'}</td>
                            <td>
                              <span className={`status-badge status-${row.status}`}>
                                {attendanceStatusLabel(row.status)}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', gap: '0.75rem' }}>
              <span className="panel-note" style={{ marginBottom: 0 }}>
                Menampilkan <strong>{statModal.items.length}</strong> data.
              </span>
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <Link
                  to={modalTargetRoute.to}
                  className="btn-primary"
                  onClick={() => setStatModal((prev) => ({ ...prev, open: false }))}
                >
                  {modalTargetRoute.label}
                </Link>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setStatModal((prev) => ({ ...prev, open: false }))}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
