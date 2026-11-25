import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

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

const statusClass = (status) => `status-badge status-${status || 'default'}`;

const clockTime = (value) => (value ? String(value).split(' ').pop() : '-');

const greeting = () => {
  const hour = new Date().getHours();

  if (hour < 11) return 'Selamat pagi';
  if (hour < 15) return 'Selamat siang';
  if (hour < 18) return 'Selamat sore';

  return 'Selamat malam';
};

const Dashboard = () => {
  const { user } = useAuth();
  const isSpv = user?.role === 'spv';
  const [loading, setLoading] = useState(true);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [dashboard, setDashboard] = useState(null);
  const [team, setTeam] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [leaves, setLeaves] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (isSpv) {
          const [dashboardRes, teamRes, attendanceRes, leaveRes] = await Promise.all([
            api.getSpvDashboard(),
            api.getSpvTeam(),
            api.getSpvAttendance(),
            api.getSpvLeaveRequests('pending'),
          ]);

          setDashboard(dashboardRes.data);
          setTeam(teamRes.data || []);
          setAttendance(attendanceRes.data || []);
          setLeaves(leaveRes.data || []);
        } else {
          const res = await api.getEmployees();
          setTotalEmployees(res.data?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isSpv]);

  if (!isSpv) {
    return (
      <div className="page">
        <div className="page-header">
          <div>
            <div className="eyebrow">Dashboard HRIS</div>
            <h1 className="page-title">Ringkasan pegawai</h1>
            <p className="page-subtitle">Data pegawai dan status sistem terbaru.</p>
          </div>
        </div>
        <div className="kpi-grid">
          <div className="kpi-card">
            <div className="kpi-label">Total Pegawai</div>
            <div className="kpi-value">{loading ? '...' : totalEmployees}</div>
            <div className="kpi-note">Data aktif di database</div>
          </div>
          <div className="kpi-card">
            <div className="kpi-label">Status Sistem</div>
            <div className="kpi-value success-text">Online</div>
            <div className="kpi-note">Laravel API berjalan di port 5000</div>
          </div>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats || {};
  const total = stats.totalAnggota || 0;
  const hadir = stats.hadirHariIni || 0;
  const telat = stats.attendanceSummary?.telat ?? 0;
  const pending = stats.menungguPersetujuan || 0;
  const onLeave = attendance.filter((row) =>
    ['cuti', 'izin', 'izin_sakit', 'sakit'].includes(row.status)
  ).length;
  const percent = total ? ((hadir / total) * 100).toFixed(1) : '0.0';
  const name = (dashboard?.name || user?.name || 'Jonathan').split(' ')[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV</div>
          <h1 className="page-title">Ringkasan tim</h1>
          <p className="page-subtitle">Pantau kehadiran dan pengajuan tim Anda hari ini.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => window.alert('Rekap kehadiran tim siap diunduh dari menu Rekap.')}
        >
          Unduh kehadiran tim
        </button>
      </div>

      <section className="hero-card">
        <div>
          <h2 className="hero-title">{greeting()}, Pak {name}</h2>
          <p className="hero-subtitle">Pantau tim Product Design menjalani hari.</p>
        </div>
        <div className="hero-badge">Ringkasan hari ini</div>
      </section>

      <div className="kpi-grid">
        <div className="kpi-card accent-orange">
          <div className="kpi-label">Pengajuan tim menunggu keputusan Anda</div>
          <div className="kpi-value">{loading ? '...' : pending}</div>
          <div className="kpi-note">Persetujuan diteruskan ke HRD untuk keputusan akhir.</div>
        </div>
        <div className="kpi-card accent-blue">
          <div className="kpi-label">Anggota tim</div>
          <div className="kpi-value">{loading ? '...' : total}</div>
          <div className="kpi-note">Karyawan aktif di divisi Anda</div>
        </div>
        <div className="kpi-card accent-green">
          <div className="kpi-label">Hadir hari ini</div>
          <div className="kpi-value">{loading ? '...' : hadir}</div>
          <div className="kpi-note">{percent}% dari total anggota</div>
        </div>
        <div className="kpi-card accent-red">
          <div className="kpi-label">Terlambat</div>
          <div className="kpi-value">{loading ? '...' : telat}</div>
          <div className="kpi-note">Perlu diperhatikan</div>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Kehadiran anggota tim</h2>
              <p className="panel-subtitle">Status absensi terbaru hari ini</p>
            </div>
            <Link className="link-button" to="/attendance">Lihat semua</Link>
          </div>
          <div className="person-list">
            {attendance.slice(0, 5).map((row) => (
              <div className="person-row" key={`${row.employeeId}-${row.date}`}>
                <div className="person-avatar">{row.fullName?.charAt(0) || 'K'}</div>
                <div className="person-meta">
                  <div className="person-name">{row.fullName}</div>
                  <div className="person-sub">{row.nip} &middot; Masuk {clockTime(row.clockIn)}</div>
                </div>
                <span className={statusClass(row.status)}>{statusLabel(row.status)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Cuti & izin tim</h2>
              <p className="panel-subtitle">Ada {pending} pengajuan yang perlu ditinjau</p>
            </div>
            <Link className="link-button" to="/leave-requests">Lihat semua</Link>
          </div>
          <p className="panel-note">Prioritaskan pengajuan dengan tanggal terdekat.</p>
          <div className="mini-leave-list">
            {leaves.slice(0, 4).map((leave) => (
              <div className="mini-leave-row" key={leave.id}>
                <div>
                  <div className="person-name">{leave.fullName}</div>
                  <div className="person-sub">{statusLabel(leave.leaveType)} &middot; {leave.startDate}</div>
                </div>
                <Link className="detail-button" to={`/leave-requests?request=${leave.id}`}>Tinjau</Link>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-grid bottom-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Ketersediaan tim</h2>
              <p className="panel-subtitle">Gambaran kehadiran dan ketersediaan kerja</p>
            </div>
          </div>
          <div className="progress-block">
            <div className="progress-label"><span>Hadir hari ini</span><strong>{hadir}/{total}</strong></div>
            <div className="progress-track"><div className="progress-fill" style={{ width: `${percent}%` }} /></div>
          </div>
          <div className="progress-block">
            <div className="progress-label"><span>Tersedia</span><strong>{Math.max(total - onLeave, 0)}/{total}</strong></div>
            <div className="progress-track"><div className="progress-fill alternate" style={{ width: `${total ? ((total - onLeave) / total) * 100 : 0}%` }} /></div>
          </div>
          <div className="availability-note">
            <span>{onLeave} anggota sedang cuti/izin</span>
            <span>{telat} terlambat</span>
          </div>
        </section>

        <section className="panel workspace-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Ruang kerja supervisor</h2>
              <p className="panel-subtitle">Fokus memantau kehadiran anggota tim</p>
            </div>
          </div>
          <div className="workspace-item">
            <span className="workspace-index">01</span>
            <div>
              <strong>Tinjau cuti & izin pada tahap pertama</strong>
              <p>Persetujuan akhir tetap berada di HRD.</p>
            </div>
          </div>
          <div className="workspace-item">
            <span className="workspace-index">02</span>
            <div>
              <strong>Unduh kehadiran tim</strong>
              <p>Siapkan rekap kehadiran untuk keperluan pelaporan.</p>
            </div>
          </div>
          <Link className="btn-primary full-width" to="/leave-requests">Tinjau pengajuan</Link>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;
