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
    if (role !== 'karyawan' && role !== 'spv' && role !== 'hrd') {
      setLoading(false);
      return;
    }

    const fetchDashboard = async () => {
      try {
        const res = role === 'hrd'
          ? await api.getHrdDashboard()
          : role === 'spv'
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

  if (loading) {
    return <div className="page"><p className="panel-note">Memuat beranda...</p></div>;
  }

  if (error) {
    return <div className="page"><div className="alert error">{error}</div></div>;
  }

  if (role === 'hrd') {
    const stats = data?.stats || {};
    const totalEmployees = stats.totalEmployees || 0;
    const presentToday = stats.presentToday || 0;
    const onTimeToday = stats.onTimeToday || 0;
    const lateToday = stats.lateToday || 0;
    const sickOrLeaveToday = stats.sickOrLeaveToday || 0;
    const attendancePercentNum = totalEmployees ? Math.round((presentToday / totalEmployees) * 1000) / 10 : 0;
    const attendancePercentText = attendancePercentNum.toFixed(1).replace('.', ',');

    const todayFormatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date());

    const lateDelta = lateToday - (stats.yesterdayLate ?? lateToday);
    const lateNote = lateDelta < 0
      ? `\u2193 ${Math.abs(lateDelta)} dari hari sebelumnya`
      : lateDelta > 0
        ? `\u2191 ${lateDelta} dari hari sebelumnya`
        : `${stats.notCheckedInToday || 0} belum melakukan absensi`;

    const weeklyTrend = data?.weeklyTrend || [];
    const chartW = 540;
    const chartH = 190;
    const padL = 42;
    const padR = 22;
    const padT = 24;
    const padB = 28;
    const plotW = chartW - padL - padR;
    const plotH = chartH - padT - padB;
    const minRate = 0;
    const maxRate = 100;

    const pointCoords = weeklyTrend.map((d, idx) => {
      const x = weeklyTrend.length > 1
        ? padL + (idx / (weeklyTrend.length - 1)) * plotW
        : padL + plotW / 2;
      const rate = d.isFuture && d.presentCount === 0 ? null : d.attendanceRate;
      const y = rate !== null ? padT + ((maxRate - rate) / (maxRate - minRate)) * plotH : null;
      return { ...d, x, y, rate };
    });

    const recordedPoints = pointCoords.filter((p) => p.y !== null);
    const linePath = recordedPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    const latestPoint = recordedPoints[recordedPoints.length - 1] || null;

    const donutR = 54;
    const donutCirc = 2 * Math.PI * donutR;
    const donutFill = (Math.min(attendancePercentNum, 100) / 100) * donutCirc;

    const handleQuickExport = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const monthStart = `${today.slice(0, 7)}-01`;
        const res = await api.getHrdReports({ start_date: monthStart, end_date: today });
        const rows = res.data?.rows || [];
        const header = ['NIP', 'Nama', 'Departemen', 'Jabatan', 'Hadir', 'Terlambat', 'Izin Sakit', 'Cuti', 'Alpa', 'Total Hari'];
        const lines = rows.map((r) => [
          r.nip,
          `"${r.fullName}"`,
          `"${r.department || '-'}"`,
          `"${r.position || '-'}"`,
          r.present,
          r.late,
          r.sick,
          r.leave,
          r.absent,
          r.totalDays,
        ].join(','));
        const csv = [header.join(','), ...lines].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `laporan-hrd-${monthStart}-${today}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
      } catch (err) {
        setError(err.message || 'Gagal mengekspor laporan');
      }
    };

    const hrdStatusPill = (status) => {
      if (status === 'present') return { label: 'Tepat waktu', cls: 'status-present' };
      if (status === 'late') return { label: 'Terlambat', cls: 'status-late' };
      if (status === 'sick') return { label: 'Izin sakit', cls: 'status-sick' };
      if (status === 'leave') return { label: 'Cuti', cls: 'status-leave' };
      if (status === 'absent') return { label: 'Alpa', cls: 'status-absent' };
      return { label: 'Belum absen', cls: 'status-not_checked_in' };
    };

    const openKpiDetail = (type) => {
      window.dispatchEvent(new CustomEvent('hrd-open-stat-detail', { detail: { type } }));
    };

    return (
      <div className="page hrd-dashboard">
        <div className="page-header" style={{ marginBottom: 0 }}>
          <div>
            <h1 className="page-title">Dashboard HRD</h1>
            <p className="page-subtitle">Pantau produktivitas tim dan kelola SDM dalam satu tempat.</p>
          </div>
          <div className="hrd-header-actions">
            <span className="hrd-date-chip">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {todayFormatted}
            </span>
            <button type="button" className="hrd-export-btn" onClick={handleQuickExport}>
              &darr; Ekspor laporan
            </button>
          </div>
        </div>

        <section className="hrd-banner">
          <div>
            <h2 className="hrd-banner-title">Tim yang hadir, bisnis yang bergerak.</h2>
            <p className="hrd-banner-sub">
              {attendancePercentText}% karyawan sudah melakukan absensi hari ini. Semangat untuk hari yang produktif!
            </p>
          </div>
          <div className="hrd-org-pill">
            <span className="hrd-org-dot" />
            Seluruh organisasi
          </div>
        </section>

        <div className="hrd-kpi-grid">
          <button type="button" className="hrd-kpi-card clickable" onClick={() => openKpiDetail('total')}>
            <div className="hrd-kpi-top">
              <span className="hrd-kpi-label">Total karyawan</span>
              <span className="hrd-kpi-icon blue">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
            </div>
            <div className="hrd-kpi-value">{totalEmployees}</div>
            <div className="hrd-kpi-sub good">
              +{stats.newThisMonth || 0} karyawan bulan ini
            </div>
          </button>

          <button type="button" className="hrd-kpi-card clickable" onClick={() => openKpiDetail('present')}>
            <div className="hrd-kpi-top">
              <span className="hrd-kpi-label">Hadir hari ini</span>
              <span className="hrd-kpi-icon cyan">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
            </div>
            <div className="hrd-kpi-value">{presentToday}</div>
            <div className="hrd-kpi-sub">
              {attendancePercentText}% dari {totalEmployees} terjadwal
            </div>
          </button>

          <button type="button" className="hrd-kpi-card clickable" onClick={() => openKpiDetail('late')}>
            <div className="hrd-kpi-top">
              <span className="hrd-kpi-label">Terlambat</span>
              <span className="hrd-kpi-icon amber">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </span>
            </div>
            <div className="hrd-kpi-value">{lateToday}</div>
            <div className="hrd-kpi-sub warn">{lateNote}</div>
          </button>

          <button type="button" className="hrd-kpi-card clickable" onClick={() => openKpiDetail('leave_sick')}>
            <div className="hrd-kpi-top">
              <span className="hrd-kpi-label">Cuti &amp; sakit</span>
              <span className="hrd-kpi-icon purple">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </span>
            </div>
            <div className="hrd-kpi-value">{sickOrLeaveToday}</div>
            <div className="hrd-kpi-sub">
              {stats.leaveToday || 0} cuti &bull; {stats.sickToday || 0} izin sakit
            </div>
          </button>
        </div>

        <div className="hrd-mid-grid">
          <section className="hrd-card">
            <div className="panel-header" style={{ marginBottom: '0.4rem' }}>
              <div>
                <h2 className="panel-title">Tren kehadiran</h2>
                <p className="panel-subtitle">Persentase kehadiran karyawan minggu ini</p>
              </div>
              <div className="hrd-trend-controls">
                <div className="hrd-legend-group">
                  <span className="hrd-legend-item"><span className="hrd-dot-cyan" /> Hadir</span>
                  <span className="hrd-legend-item"><span className="hrd-dot-orange" /> Terlambat</span>
                </div>
                <span className="hrd-period-pill">Minggu ini</span>
              </div>
            </div>

            <div className="hrd-chart-wrap">
              <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" style={{ minWidth: '380px', display: 'block' }}>
                {[100, 75, 50, 25, 0].map((tick) => {
                  const yPos = padT + ((maxRate - tick) / (maxRate - minRate)) * plotH;
                  return (
                    <g key={tick}>
                      <line x1={padL} y1={yPos} x2={chartW - padR} y2={yPos} stroke="#f1f5f9" strokeWidth="1" />
                      <text x={padL - 8} y={yPos + 4} textAnchor="end" fontSize="10" fill="#94a3b8">
                        {tick}%
                      </text>
                    </g>
                  );
                })}

                {pointCoords.map((pt) => {
                  const barH = Math.max((pt.lateRate / 100) * plotH, pt.lateCount > 0 ? 14 : 6);
                  return (
                    <g key={pt.day}>
                      <rect
                        x={pt.x - 11}
                        y={padT + plotH - barH}
                        width="22"
                        height={barH}
                        rx="4"
                        fill={pt.lateCount > 0 ? '#fed7aa' : '#f1f5f9'}
                      />
                      <text x={pt.x} y={chartH - 8} textAnchor="middle" fontSize="11" fill="#64748b">
                        {pt.day}
                      </text>
                    </g>
                  );
                })}

                {linePath && (
                  <path d={linePath} fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                )}

                {recordedPoints.map((pt) => (
                  <circle key={`dot-${pt.day}`} cx={pt.x} cy={pt.y} r="4.5" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                ))}

                {latestPoint && (
                  <g transform={`translate(${Math.min(latestPoint.x - 24, chartW - 64)}, ${Math.max(latestPoint.y - 28, 4)})`}>
                    <rect width="48" height="20" rx="5" fill="#0f172a" />
                    <text x="24" y="13.5" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff">
                      {String(latestPoint.rate).replace('.', ',')}%
                    </text>
                  </g>
                )}
              </svg>
            </div>
          </section>

          <section className="hrd-card">
            <div className="panel-header" style={{ marginBottom: '0.25rem' }}>
              <div>
                <h2 className="panel-title">Komposisi hari ini</h2>
                <p className="panel-subtitle">{totalEmployees} karyawan terjadwal hari ini</p>
              </div>
            </div>

            <div className="hrd-donut-layout">
              <div className="hrd-donut-box">
                <svg viewBox="0 0 140 140" width="148" height="148">
                  <circle cx="70" cy="70" r={donutR} fill="none" stroke="#e2e8f0" strokeWidth="14" />
                  <circle
                    cx="70"
                    cy="70"
                    r={donutR}
                    fill="none"
                    stroke="#06b6d4"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray={`${donutFill} ${donutCirc}`}
                    transform="rotate(-90 70 70)"
                  />
                </svg>
                <div className="hrd-donut-center">
                  <strong>{attendancePercentText}%</strong>
                  <span>Kehadiran</span>
                </div>
              </div>

              <div className="hrd-comp-list">
                <div className="hrd-comp-row">
                  <div className="hrd-comp-left">
                    <span className="hrd-comp-square" style={{ backgroundColor: '#06b6d4' }} />
                    <span>Tepat waktu</span>
                  </div>
                  <strong>{onTimeToday}</strong>
                </div>
                <div className="hrd-comp-row">
                  <div className="hrd-comp-left">
                    <span className="hrd-comp-square" style={{ backgroundColor: '#f97316' }} />
                    <span>Terlambat</span>
                  </div>
                  <strong>{lateToday}</strong>
                </div>
                <div className="hrd-comp-row">
                  <div className="hrd-comp-left">
                    <span className="hrd-comp-square" style={{ backgroundColor: '#94a3b8' }} />
                    <span>Cuti &amp; sakit</span>
                  </div>
                  <strong>{sickOrLeaveToday}</strong>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="hrd-bot-grid">
          <section className="hrd-card">
            <div className="panel-header" style={{ marginBottom: '0.75rem' }}>
              <div>
                <h2 className="panel-title">Aktivitas absensi terbaru</h2>
                <p className="panel-subtitle">Pembaruan langsung dari seluruh tim</p>
              </div>
              <span className="hrd-live-pill">
                <span className="hrd-live-dot" />
                Live
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="hrd-activity-table">
                <thead>
                  <tr>
                    <th>KARYAWAN</th>
                    <th>CLOCK IN</th>
                    <th>METODE</th>
                    <th>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.todayMonitor || []).slice(0, 5).map((row) => {
                    const pill = hrdStatusPill(row.status);
                    return (
                      <tr key={row.employeeId}>
                        <td>
                          <div className="hrd-emp-name">{row.fullName}</div>
                          <div className="hrd-emp-role">{row.position || row.department || '-'}</div>
                        </td>
                        <td>{row.clockIn ? String(row.clockIn).slice(0, 5) : '—'}</td>
                        <td>
                          {row.method === 'face'
                            ? 'Face ID'
                            : row.method === 'manual'
                              ? 'Manual'
                              : '—'}
                        </td>
                        <td>
                          <span className={`status-badge ${pill.cls}`}>{pill.label}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="hrd-card">
            <div className="panel-header" style={{ marginBottom: '0.5rem' }}>
              <div>
                <h2 className="panel-title">Perlu persetujuan</h2>
                <p className="panel-subtitle">Tinjau pengajuan terbaru dari tim Anda.</p>
              </div>
              <span className="hrd-pending-count">{stats.pendingTotal || 0}</span>
            </div>

            <div className="hrd-approval-list">
              {(data?.pendingLeaves || []).length === 0 ? (
                <p className="panel-note" style={{ marginTop: '0.75rem' }}>Semua pengajuan sudah diproses.</p>
              ) : (
                data.pendingLeaves.slice(0, 4).map((leave) => (
                  <Link
                    to={`/hrd/pengajuan-cuti?id=${leave.id}`}
                    className="hrd-approval-item"
                    key={leave.id}
                  >
                    <div>
                      <div className="hrd-emp-name">{leave.fullName}</div>
                      <div className="hrd-emp-role">
                        {leaveTypeLabel(leave.leaveType)} &bull; {formatDate(leave.startDate)}
                      </div>
                    </div>
                    <span className="hrd-approval-days">
                      {durationDays(leave.startDate, leave.endDate)} hari &rarr;
                    </span>
                  </Link>
                ))
              )}
            </div>

            <Link to="/hrd/pengajuan-cuti" className="hrd-approval-cta">
              Lihat semua pengajuan &rarr;
            </Link>
          </section>
        </div>
      </div>
    );
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
