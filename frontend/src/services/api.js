import { API_BASE_URL } from '../utils/constants.js';

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = data?.message || 'Terjadi kesalahan pada request API';
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth & Shared
  login: (credentials) =>
    request('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    }),
  register: (userData) =>
    request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),
  getProfile: () => request('/auth/profile'),
  getAnnouncements: () => request('/announcements'),
  downloadMedicalCertificate: async (leaveId) => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE_URL}/leave-requests/${leaveId}/medical-certificate`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      throw new Error('Gagal mengunduh surat dokter');
    }
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => window.URL.revokeObjectURL(url), 10000);
  },

  // Karyawan API
  getKaryawanDashboard: () => request('/karyawan/dashboard'),
  getKaryawanAttendance: (params) => request(`/karyawan/attendance${buildQuery(params)}`),
  clockIn: (payload) =>
    request('/karyawan/attendance/clock-in', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  clockOut: (payload) =>
    request('/karyawan/attendance/clock-out', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getKaryawanLeaves: (params) => request(`/karyawan/leave-requests${buildQuery(params)}`),
  submitKaryawanLeave: (formData) =>
    request('/karyawan/leave-requests', {
      method: 'POST',
      body: formData,
    }),
  getKaryawanProfile: () => request('/karyawan/profile'),
  updateKaryawanProfile: (payload) =>
    request('/karyawan/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // SPV API
  getSpvDashboard: () => request('/spv/dashboard'),
  getSpvTeam: () => request('/spv/team'),
  getSpvAttendanceToday: () => request('/spv/attendance/today'),
  getSpvAttendanceHistory: (params) => request(`/spv/attendance/history${buildQuery(params)}`),
  getSpvLeaveRequests: (params) => request(`/spv/leave-requests${buildQuery(params)}`),
  getSpvReports: (params) => request(`/spv/reports${buildQuery(params)}`),
  getSpvProfile: () => request('/spv/profile'),
  updateSpvProfile: (payload) =>
    request('/spv/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // HRD API
  getHrdDashboard: () => request('/hrd/dashboard'),
  getHrdSummaryDetail: (type) => request(`/hrd/summary-detail${buildQuery({ type })}`),
  getHrdEmployees: (params) => request(`/hrd/employees${buildQuery(params)}`),
  createHrdEmployee: (payload) =>
    request('/hrd/employees', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateHrdEmployee: (id, payload) =>
    request(`/hrd/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteHrdEmployee: (id) =>
    request(`/hrd/employees/${id}`, {
      method: 'DELETE',
    }),
  getHrdFaceRegistrations: () => request('/hrd/face-registrations'),
  saveHrdFaceRegistration: (payload) =>
    request('/hrd/face-registrations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  deleteHrdFaceRegistration: (employeeId) =>
    request(`/hrd/face-registrations/${employeeId}`, {
      method: 'DELETE',
    }),
  getHrdAttendance: (params) => request(`/hrd/attendance${buildQuery(params)}`),
  upsertHrdAttendance: (payload) =>
    request('/hrd/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  getHrdLeaveRequests: (params) => request(`/hrd/leave-requests${buildQuery(params)}`),
  decideHrdLeaveRequest: (id, payload) =>
    request(`/hrd/leave-requests/${id}/decision`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createHrdAnnouncement: (payload) =>
    request('/hrd/announcements', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateHrdAnnouncement: (id, payload) =>
    request(`/hrd/announcements/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteHrdAnnouncement: (id) =>
    request(`/hrd/announcements/${id}`, {
      method: 'DELETE',
    }),
  getHrdReports: (params) => request(`/hrd/reports${buildQuery(params)}`),
  getHrdSettings: () => request('/hrd/settings'),
  updateHrdSettings: (payload) =>
    request('/hrd/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createHrdDepartment: (payload) =>
    request('/hrd/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  createHrdPosition: (payload) =>
    request('/hrd/positions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateHrdAccount: (id, payload) =>
    request(`/hrd/accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  getHrdProfile: () => request('/hrd/profile'),
  updateHrdProfile: (payload) =>
    request('/hrd/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
};
