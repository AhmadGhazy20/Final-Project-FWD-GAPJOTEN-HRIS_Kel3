import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import { useAuth } from './hooks/useAuth.js';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import FaceAttendance from './pages/FaceAttendance.jsx';
import AttendanceHistory from './pages/AttendanceHistory.jsx';
import LeaveSubmission from './pages/LeaveSubmission.jsx';
import SubmissionStatus from './pages/SubmissionStatus.jsx';
import SpvTeam from './pages/SpvTeam.jsx';
import SpvAttendanceMonitoring from './pages/SpvAttendanceMonitoring.jsx';
import SpvAttendanceHistory from './pages/SpvAttendanceHistory.jsx';
import SpvLeaveList from './pages/SpvLeaveList.jsx';
import SpvTeamReport from './pages/SpvTeamReport.jsx';
import Announcements from './pages/Announcements.jsx';
import Profile from './pages/Profile.jsx';
import HelpCenter from './pages/HelpCenter.jsx';
import NotFound from './pages/NotFound.jsx';
import './App.css';

const RoleGuard = ({ allowedRoles, children }) => {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <div className="page"><p className="panel-note">Memuat sesi...</p></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RoleGuard><MainLayout /></RoleGuard>}>
        <Route index element={<Dashboard />} />

        {/* Menu Karyawan (Section 6.3) */}
        <Route path="absensi-wajah" element={<RoleGuard allowedRoles={['karyawan']}><FaceAttendance /></RoleGuard>} />
        <Route path="riwayat-absensi" element={<RoleGuard allowedRoles={['karyawan']}><AttendanceHistory /></RoleGuard>} />
        <Route path="pengajuan-cuti" element={<RoleGuard allowedRoles={['karyawan']}><LeaveSubmission mode="cuti" /></RoleGuard>} />
        <Route path="izin-sakit" element={<RoleGuard allowedRoles={['karyawan']}><LeaveSubmission mode="sakit" /></RoleGuard>} />
        <Route path="status-pengajuan" element={<RoleGuard allowedRoles={['karyawan']}><SubmissionStatus /></RoleGuard>} />

        {/* Menu SPV (Section 6.2) */}
        <Route path="data-tim" element={<RoleGuard allowedRoles={['spv']}><SpvTeam /></RoleGuard>} />
        <Route path="monitoring-absensi" element={<RoleGuard allowedRoles={['spv']}><SpvAttendanceMonitoring /></RoleGuard>} />
        <Route path="riwayat-kehadiran" element={<RoleGuard allowedRoles={['spv']}><SpvAttendanceHistory /></RoleGuard>} />
        <Route path="pengajuan-cuti-tim" element={<RoleGuard allowedRoles={['spv']}><SpvLeaveList category="cuti" /></RoleGuard>} />
        <Route path="izin-sakit-tim" element={<RoleGuard allowedRoles={['spv']}><SpvLeaveList category="sakit" /></RoleGuard>} />
        <Route path="laporan-tim" element={<RoleGuard allowedRoles={['spv']}><SpvTeamReport /></RoleGuard>} />

        {/* Menu Bersama (Karyawan & SPV) */}
        <Route path="informasi" element={<RoleGuard allowedRoles={['karyawan', 'spv']}><Announcements /></RoleGuard>} />
        <Route path="profil" element={<RoleGuard allowedRoles={['karyawan', 'spv']}><Profile /></RoleGuard>} />
        <Route path="bantuan" element={<RoleGuard allowedRoles={['karyawan', 'spv']}><HelpCenter /></RoleGuard>} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
