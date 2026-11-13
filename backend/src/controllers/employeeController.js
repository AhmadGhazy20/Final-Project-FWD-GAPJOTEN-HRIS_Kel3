import { successResponse, errorResponse } from '../utils/apiResponse.js';

// Mock data pegawai awal
let employees = [
  {
    id: 1,
    nip: 'EMP001',
    fullName: 'Budi Santoso',
    email: 'budi@gapjoten.id',
    phone: '081234567890',
    position: 'Fullstack Developer',
    department: 'Engineering',
    joinDate: '2023-01-15',
    status: 'active',
  },
  {
    id: 2,
    nip: 'EMP002',
    fullName: 'Siti Rahma',
    email: 'siti@gapjoten.id',
    phone: '081298765432',
    position: 'HR Specialist',
    department: 'Human Resources',
    joinDate: '2023-03-01',
    status: 'active',
  },
];

export const getAllEmployees = async (req, res, next) => {
  try {
    return successResponse(res, 'Employees fetched successfully', employees);
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employee = employees.find((item) => item.id === parseInt(id));

    if (!employee) {
      return errorResponse(res, `Employee with ID ${id} not found`, null, 404);
    }

    return successResponse(res, 'Employee retrieved successfully', employee);
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const { nip, fullName, email, position, department, phone, joinDate } = req.body;

    if (!nip || !fullName || !email || !position || !department) {
      return errorResponse(res, 'NIP, fullName, email, position, and department are required', null, 400);
    }

    const newEmployee = {
      id: employees.length ? employees[employees.length - 1].id + 1 : 1,
      nip,
      fullName,
      email,
      phone: phone || '-',
      position,
      department,
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      status: 'active',
    };

    employees.push(newEmployee);
    return successResponse(res, 'Employee created successfully', newEmployee, 201);
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const index = employees.findIndex((item) => item.id === parseInt(id));

    if (index === -1) {
      return errorResponse(res, `Employee with ID ${id} not found`, null, 404);
    }

    employees[index] = { ...employees[index], ...req.body, id: parseInt(id) };
    return successResponse(res, 'Employee updated successfully', employees[index]);
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const initialLength = employees.length;
    employees = employees.filter((item) => item.id !== parseInt(id));

    if (employees.length === initialLength) {
      return errorResponse(res, `Employee with ID ${id} not found`, null, 404);
    }

    return successResponse(res, 'Employee deleted successfully', { id: parseInt(id) });
  } catch (error) {
    next(error);
  }
};

