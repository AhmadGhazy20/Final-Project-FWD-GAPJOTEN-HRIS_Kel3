import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Employees from './pages/Employees.jsx';
import Login from './pages/Login.jsx';
import NotFound from './pages/NotFound.jsx';
import Team from './pages/Team.jsx';
import Attendance from './pages/Attendance.jsx';
import AttendanceRecap from './pages/AttendanceRecap.jsx';
import MyAttendance from './pages/MyAttendance.jsx';
import LeaveRequests from './pages/LeaveRequests.jsx';
import Settings from './pages/Settings.jsx';
import Help from './pages/Help.jsx';
import './App.css';

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="employees" element={<Employees />} />
        <Route path="team" element={<Team />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="my-attendance" element={<MyAttendance />} />
        <Route path="attendance-recap" element={<AttendanceRecap />} />
        <Route path="leave-requests" element={<LeaveRequests />} />
        <Route path="settings" element={<Settings />} />
        <Route path="help" element={<Help />} />
        <Route path="login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}

export default App;
