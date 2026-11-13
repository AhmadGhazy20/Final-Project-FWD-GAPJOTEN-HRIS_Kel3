/**
 * Employee Model / Schema
 * Struktur data pegawai untuk aplikasi HRIS.
 */

export const EmployeeModel = {
  tableName: 'employees',
  fields: {
    id: 'INT PRIMARY KEY AUTO_INCREMENT',
    nip: 'VARCHAR(50) UNIQUE NOT NULL',
    fullName: 'VARCHAR(150) NOT NULL',
    email: 'VARCHAR(150) UNIQUE NOT NULL',
    phone: 'VARCHAR(20)',
    position: 'VARCHAR(100) NOT NULL',
    department: 'VARCHAR(100) NOT NULL',
    joinDate: 'DATE NOT NULL',
    salary: 'DECIMAL(12, 2)',
    status: 'ENUM("active", "inactive", "on_leave") DEFAULT "active"',
    createdAt: 'DATETIME DEFAULT CURRENT_TIMESTAMP',
    updatedAt: 'DATETIME ON UPDATE CURRENT_TIMESTAMP',
  },
};

