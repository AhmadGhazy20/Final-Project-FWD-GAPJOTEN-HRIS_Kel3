import { API_BASE_URL } from '../utils/constants.js';

/**
 * Reusable API request helper
 */
async function request(endpoint, options = {}) {
  const token = localStorage.getItem('token');

  const headers = {
    'Content-Type': 'application/json',
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
  // Auth
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

  // Employees
  getEmployees: () => request('/employees'),
  getEmployeeById: (id) => request(`/employees/${id}`),
  createEmployee: (employeeData) =>
    request('/employees', {
      method: 'POST',
      body: JSON.stringify(employeeData),
    }),
  updateEmployee: (id, employeeData) =>
    request(`/employees/${id}`, {
      method: 'PUT',
      body: JSON.stringify(employeeData),
    }),
  deleteEmployee: (id) =>
    request(`/employees/${id}`, {
      method: 'DELETE',
    }),
};

