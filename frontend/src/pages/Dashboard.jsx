import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';
import {
  attendanceStatusLabel,
  formatDate,
  formatDateTime,
  leaveStatusLabel,
  leaveTypeLabel,
} from '../utils/formatters.js';

const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';
  return 'Selamat malam';
};

const formatDuration = (minutes) => {
  if (minutes === null || minutes === undefined) return '—';
  if (minutes < 60) return `${minutes} menit`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs} jam ${mins} menit` : `${hrs} jam`;
};

const shortTime = (timeStr) => (timeStr ? `${String(timeStr).slice(0, 5)} WIB` : '—');

const durationDays = (start, end) => {
  const diff = new Date(end) - new Date(start);
  return Math.max(Math.round(diff / 86400000) + 1, 1);
};

const weekRangeLabel = (weekDays) => {
  if (!weekDays || weekDays.length === 0) return '';
  const first = new Date(`${weekDays[0].date}T00:00:00`);
  const last = new Date(`${weekDays[weekDays.length - 1].date}T00:00:00`);
  const monthYear = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(last);
  return `${first.getDate()}–${last.getDate()} ${monthYear}`;
};

const weeklyTileCaption = (day) => {
  if (day.isToday) {
    if (day.clockOut) return 'Selesai kerja';
    if (day.clockIn) return 'Sedang bekerja';
    return 'Belum Clock In';
  }
  if (day.isFuture && !day.status) return 'Mendatang';
  if (day.status === 'present') return 'Tepat waktu';
  if (day.status === 'late') return 'Terlambat';
  if (day.status === 'sick') return 'Izin sakit';
  if (day.status === 'leave') return 'Cuti';
  if (day.status === 'absent') return 'Alpa';
  return 'Belum tercatat';
};

const Dashboard = () => {
  const { user } = useAuth();
  const role = user?.role;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (role !== 'karyawan' && role !== 'spv') {
      setLoading(false);
      return;
    }

    const fetchDashboard = async () => {
      try {
        const res = role === 'spv'
          ? await api.getSpvDashboard()
          : await api.getKaryawanDashboard();
        setData(res.data);
      } catch (err) {
        setError(err.message || 'Gagal memuat dashboard');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [role]);

  if (role === 'hrd') {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Portal HRD</div>
            <h1 className="page-title">Modul HRD Belum Diaktifkan</h1>
            <p className="page-subtitle">
              Fitur manajemen HRD disiapkan untuk dikerjakan oleh rekan tim HRD.
            </p>
          </div>
        </div>
        <section className="panel">
          <p className="panel-note">
            Silakan login menggunakan akun <strong>Karyawan</strong> (<code>budi@gapjoten.id</code>) atau <strong>SPV</strong> (<code>spv@gapjoten.id</code>) untuk menggunakan aplikasi.
          </p>
        </section>
      </div>
    );
  }

  if (loading) {
    return <div className="page"><p className="panel-note">Memuat beranda...</p></div>;
  }

  if (error) {
    return <div className="page"><div className="alert error">{error}</div></div>;
  }

  if (role === 'spv') {
    const stats = data?.stats || {};
    const spv = data?.spv || {};
    const total = stats.totalMembers || 0;
    const hadir = stats.presentToday || 0;
    const percent = total ? ((hadir / total) * 100).toFixed(1) : '0.0';

    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Portal SPV &middot; {spv.department || 'Divisi'}</div>
            <h1 className="page-title">Dashboard SPV</h1>
            <p className="page-subtitle">Statistik kehadiran dan status pengajuan anggota tim {spv.department} (hanya baca).</p>
          </div>
          <Link className="btn-primary" to="/monitoring-absensi">Monitoring Absensi</Link>
        </div>

        <section className="hero-card">
          <div>
            <h2 className="hero-title">{greeting()}, {spv.name || user?.name}</h2>
            <p className="hero-subtitle">{spv.position || 'Supervisor'} &middot; Divisi {spv.department}</p>
          </div>
          <div className="hero-badge">SPV READ-ONLY</div>
        </section>

        <div className="kpi-grid">
          <div className="kpi-card accent-blue">
            <div className="kpi-label">Anggota tim</div>
            <div className="kpi-value">{total}</div>
            <div className="kpi-note">Karyawan aktif di divisi {spv.department}</div>
          </div>
          <div className="kpi-card accent-green">
            <div className="kpi-label">Hadir hari ini</div>
            <div className="kpi-value">{hadir}</div>
            <div className="kpi-note">{percent}% dari anggota tim</div>
          </div>
          <div className="kpi-card accent-red">
            <div className="kpi-label">Terlambat</div>
            <div className="kpi-value">{stats.lateToday || 0}</div>
            <div className="kpi-note">Masuk melewati 08:15</div>
          </div>
          <div className="kpi-card accent-orange">
            <div className="kpi-label">Cuti / Izin menunggu HRD</div>
            <div className="kpi-value">{stats.pendingLeaves || 0}</div>
            <div className="kpi-note">Persetujuan dilakukan oleh HRD</div>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Kehadiran tim hari ini</h2>
                <p className="panel-subtitle">Khusus anggota divisi {spv.department}</p>
              </div>
              <Link className="link-button" to="/monitoring-absensi">Lihat semua</Link>
            </div>
            <div className="person-list">
              {(data?.todayTeamAttendance || []).map((row) => (
                <div className="person-row" key={row.employeeId}>
                  <div className="person-avatar">{row.fullName?.charAt(0) || 'K'}</div>
                  <div className="person-meta">
                    <div className="person-name">{row.fullName}</div>
                    <div className="person-sub">{row.nip} &middot; Masuk {row.clockIn || '-'}</div>
                  </div>
                  <span className={`status-badge status-${row.status}`}>{attendanceStatusLabel(row.status)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Pengajuan cuti &amp; izin tim</h2>
                <p className="panel-subtitle">Menunggu keputusan HRD</p>
              </div>
              <Link className="link-button" to="/pengajuan-cuti-tim">Lihat semua</Link>
            </div>
            <div className="mini-leave-list">
              {(data?.pendingLeaves || []).length === 0 ? (
                <p className="panel-note">Tidak ada pengajuan menunggu.</p>
              ) : (
                data.pendingLeaves.map((leave) => (
                  <div className="mini-leave-row" key={leave.id}>
                    <div>
                      <div className="person-name">{leave.fullName}</div>
                      <div className="person-sub">
                        {leaveTypeLabel(leave.leaveType)} &middot; {formatDate(leave.startDate)}
                      </div>
                    </div>
                    <span className={`status-badge status-${leave.status}`}>{leaveStatusLabel(leave.status)}</span>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Informasi perusahaan terbaru</h2>
              <p className="panel-subtitle">Pengumuman resmi dari HRD</p>
            </div>
            <Link className="link-button" to="/informasi">Semua informasi</Link>
          </div>
          <div className="person-list">
            {(data?.announcements || []).map((item) => (
              <div className="workspace-item" key={item.id}>
                <span className="workspace-index">INFO</span>
                <div>
                  <strong>{item.title}</strong>
                  <p>{item.body}</p>
                  <small style={{ color: '#64748b' }}>{formatDateTime(item.publishedAt)}</small>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  // Portal Karyawan — Beranda Saya (sesuai mockup desain)
  const profile = data?.profile || {};
  const today = data?.todayAttendance || {};
  const monthly = data?.monthlyStats || {};
  const weekly = data?.weeklyAttendance || [];
  const latestLeave = (data?.recentLeaves || [])[0] || null;
  const latestAnnouncement = (data?.announcements || [])[0] || null;

  const firstName = (profile.fullName || user?.name || 'Karyawan').split(' ')[0];
  const todayLongDate = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date()).toUpperCase();
  const monthLabel = new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date());

  const hasClockIn = Boolean(today.clockIn);
  const hasClockOut = Boolean(today.clockOut);
  const heroStatusText = hasClockOut
    ? 'Sudah Clock Out'
    : hasClockIn
      ? 'Sudah Clock In'
      : 'Belum Clock In';
  const heroHeadline = hasClockOut
    ? 'Hari kerja Anda selesai.'
    : hasClockIn
      ? 'Hari kerja Anda dimulai.'
      : 'Siap memulai hari kerja?';

  const latestLeaveCode = latestLeave
    ? `CUT-${new Date(latestLeave.startDate).getFullYear()}-${String(latestLeave.id).padStart(4, '0')}`
    : '';

  return (
    <div className="page karyawan-home">
      {/* Header Greeting */}
      <div className="karyawan-greeting-row">
        <div>
          <h1 className="karyawan-greeting-title">{greeting()}, {firstName}!</h1>
          <p className="karyawan-greeting-sub">Semua kebutuhan kerja Anda, dalam satu ruang pribadi.</p>
        </div>
        <div className="karyawan-id-pill">
          {profile.nip || 'EMP'} &bull; {profile.position || 'Karyawan'}
        </div>
      </div>

      {/* Row 1: Dark Navy Clock Hero + Monthly Summary & Quick Access */}
      <div className="karyawan-row-1">
        <section className="clock-hero-card">
          <div className="clock-hero-top">
            <span className="clock-hero-date">{todayLongDate}</span>
            <span className={`clock-status-pill ${hasClockIn ? 'active' : 'idle'}`}>
              <span className="clock-status-dot" />
              {heroStatusText}
            </span>
          </div>

          <h2 className="clock-hero-headline">{heroHeadline}</h2>
          <p className="clock-hero-shift">Shift reguler 08:00&ndash;17:00 &bull; {profile.department || 'Kantor pusat'}</p>

          <div className="clock-hero-metrics">
            <div className="clock-metric-box">
              <span>CLOCK IN</span>
              <strong>{shortTime(today.clockIn)}</strong>
            </div>
            <div className="clock-metric-box">
              <span>DURASI BERJALAN</span>
              <strong>{formatDuration(today.elapsedMinutes)}</strong>
            </div>
            <div className="clock-metric-box">
              <span>CLOCK OUT</span>
              <strong>{shortTime(today.clockOut)}</strong>
            </div>
          </div>

          <Link to="/absensi-wajah" className="clock-hero-cta">
            Buka absensi wajah &rarr;
          </Link>
        </section>

        <div className="karyawan-right-stack">
          <section className="panel summary-card">
            <div className="summary-card-head">
              <h2>Ringkasan saya bulan ini</h2>
              <span>{monthLabel}</span>
            </div>
            <div className="summary-metrics-row">
              <div className="summary-metric">
                <span className="summary-metric-label">Hadir</span>
                <div className="summary-metric-val">
                  <strong>{(monthly.present || 0) + (monthly.late || 0)}</strong>
                  <span>hari</span>
                </div>
              </div>
              <div className="summary-metric">
                <span className="summary-metric-label">Terlambat</span>
                <div className="summary-metric-val">
                  <strong>{monthly.late || 0}</strong>
                  <span>kali</span>
                </div>
              </div>
              <div className="summary-metric">
                <span className="summary-metric-label">Sisa cuti</span>
                <div className="summary-metric-val cyan">
                  <strong>{monthly.remainingLeaveDays ?? 12}</strong>
                  <span>hari</span>
                </div>
              </div>
            </div>
          </section>

          <section className="panel quick-access-card">
            <h2>Akses cepat</h2>
            <div className="quick-access-actions">
              <Link to="/pengajuan-cuti" className="quick-btn primary-soft">
                + Ajukan cuti / izin
              </Link>
              <Link to="/profil" className="quick-btn neutral-soft">
                Lihat profil saya &rarr;
              </Link>
            </div>
          </section>
        </div>
      </div>

      {/* Row 2: Weekly Attendance + Dari HRD */}
      <div className="karyawan-row-2">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Kehadiran minggu ini</h2>
            <span className="panel-date-range">{weekRangeLabel(weekly)}</span>
          </div>
          <div className="weekly-grid">
            {weekly.map((day) => (
              <div className={`weekly-tile${day.isToday ? ' today' : ''}`} key={day.date}>
                <span className="weekly-day">{day.dayLabel}</span>
                <strong className="weekly-time">{day.clockIn || '—'}</strong>
                <span className={`weekly-caption${day.isToday ? ' cyan' : day.status === 'late' ? ' warn' : ''}`}>
                  {weeklyTileCaption(day)}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel hrd-announcement-card">
          <span className="hrd-pill">DARI HRD</span>
          {latestAnnouncement ? (
            <>
              <h3 className="hrd-card-title">{latestAnnouncement.title}</h3>
              <p className="hrd-card-body">{latestAnnouncement.body}</p>
            </>
          ) : (
            <>
              <h3 className="hrd-card-title">Data Anda, tetap terbaru.</h3>
              <p className="hrd-card-body">Pastikan nomor telepon dan alamat Anda sudah diperbarui melalui profil pribadi.</p>
            </>
          )}
          <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto', paddingTop: '0.75rem' }}>
            <Link to="/informasi" className="link-button">Lihat informasi &rarr;</Link>
            <Link to="/profil" className="link-button">Buka profil &rarr;</Link>
          </div>
        </section>
      </div>

      {/* Row 3: Status Pengajuan Saya + Butuh Bantuan */}
      <div className="karyawan-row-3">
        <section className="panel">
          <div className="panel-header">
            <h2 className="panel-title">Status pengajuan saya</h2>
            <Link to="/status-pengajuan" className="link-button">Lihat semua &rarr;</Link>
          </div>

          {latestLeave ? (
            <>
              <div className="latest-leave-box">
                <div>
                  <strong className="latest-leave-title">{leaveTypeLabel(latestLeave.leaveType)}</strong>
                  <div className="latest-leave-sub">
                    {formatDate(latestLeave.startDate)} &ndash; {formatDate(latestLeave.endDate)} &bull; {durationDays(latestLeave.startDate, latestLeave.endDate)} hari kerja
                  </div>
                </div>
                <div className="latest-leave-right">
                  <span className={`status-badge status-${latestLeave.status}`}>
                    {latestLeave.status === 'pending' ? 'Menunggu HRD' : leaveStatusLabel(latestLeave.status)}
                  </span>
                  <span className="latest-leave-code">{latestLeaveCode}</span>
                </div>
              </div>

              <div className="leave-stepper">
                <div className="step-item done">
                  <span className="step-circle">&#10003;</span>
                  <span>Diajukan</span>
                </div>
                <div className="step-line" />
                <div className={`step-item ${latestLeave.status === 'pending' ? 'current' : 'done'}`}>
                  <span className="step-circle">{latestLeave.status === 'pending' ? '2' : '\u2713'}</span>
                  <span>Pemeriksaan HRD</span>
                </div>
                <div className="step-line" />
                <div className={`step-item ${latestLeave.status === 'approved' ? 'done' : latestLeave.status === 'rejected' ? 'rejected' : 'upcoming'}`}>
                  <span className="step-circle">{latestLeave.status === 'approved' ? '\u2713' : latestLeave.status === 'rejected' ? '!' : '3'}</span>
                  <span>{latestLeave.status === 'rejected' ? 'Ditolak HRD' : 'Keputusan HRD'}</span>
                </div>
              </div>

              <p className="stepper-footnote">Saldo cuti berkurang setelah pengajuan disetujui oleh HRD.</p>
            </>
          ) : (
            <div style={{ padding: '1rem 0' }}>
              <p className="panel-note" style={{ marginBottom: '0.75rem' }}>Anda belum memiliki pengajuan cuti atau izin sakit.</p>
              <Link to="/pengajuan-cuti" className="quick-btn primary-soft" style={{ display: 'inline-flex' }}>
                + Buat pengajuan pertama
              </Link>
            </div>
          )}
        </section>

        <section className="panel">
          <h2 className="panel-title">Butuh bantuan?</h2>
          <p className="panel-subtitle" style={{ marginBottom: '0.9rem' }}>Tim HRD siap membantu kebutuhan Anda.</p>

          <div className="help-links-list">
            <Link to="/absensi-wajah" className="help-link-row">
              <div>
                <strong>Kendala absensi</strong>
                <span>Gunakan prosedur alternatif</span>
              </div>
              <span>&rarr;</span>
            </Link>
            <Link to="/informasi" className="help-link-row">
              <div>
                <strong>Cuti &amp; izin</strong>
                <span>Pelajari kebijakan perusahaan</span>
              </div>
              <span>&rarr;</span>
            </Link>
            <Link to="/profil" className="help-link-row">
              <div>
                <strong>Data pribadi</strong>
                <span>Perbarui profil yang diizinkan</span>
              </div>
              <span>&rarr;</span>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
