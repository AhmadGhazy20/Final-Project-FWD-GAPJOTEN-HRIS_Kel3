CREATE DATABASE IF NOT EXISTS db_uas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_uas;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS company_announcements;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS attendances;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS positions;
DROP TABLE IF EXISTS departments;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE departments (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  code VARCHAR(20) NOT NULL,
  description VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE positions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  department_id INT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  base_salary DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_positions_department (department_id),
  CONSTRAINT fk_positions_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE employees (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nip VARCHAR(50) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  gender ENUM('male', 'female') NOT NULL DEFAULT 'male',
  phone VARCHAR(20) NULL,
  address TEXT NULL,
  department_id INT UNSIGNED NULL,
  position_id INT UNSIGNED NULL,
  join_date DATE NOT NULL,
  status ENUM('active', 'probation', 'resigned') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_nip (nip),
  KEY idx_employees_department (department_id),
  KEY idx_employees_position (position_id),
  KEY idx_employees_status (status),
  CONSTRAINT fk_employees_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_position FOREIGN KEY (position_id) REFERENCES positions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NULL,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('hrd', 'spv', 'karyawan') NOT NULL DEFAULT 'karyawan',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_employee (employee_id),
  KEY idx_users_role (role),
  CONSTRAINT fk_users_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  date DATE NOT NULL,
  clock_in TIME NULL,
  clock_out TIME NULL,
  status ENUM('present', 'late', 'sick', 'leave', 'absent') NOT NULL DEFAULT 'present',
  method ENUM('face', 'manual') NOT NULL DEFAULT 'face',
  liveness_passed TINYINT(1) NOT NULL DEFAULT 1,
  notes VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendances_employee_date (employee_id, date),
  KEY idx_attendances_date (date),
  KEY idx_attendances_status (status),
  CONSTRAINT fk_attendances_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leave_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  leave_type ENUM('annual', 'sick', 'maternity', 'unpaid') NOT NULL DEFAULT 'annual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(500) NOT NULL,
  medical_certificate_path VARCHAR(255) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approved_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leave_requests_employee (employee_id),
  KEY idx_leave_requests_status (status),
  KEY idx_leave_requests_dates (start_date, end_date),
  CONSTRAINT fk_leave_requests_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_requests_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_announcements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  created_by INT UNSIGNED NULL,
  published_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcements_published (published_at),
  CONSTRAINT fk_announcements_author FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO departments (id, name, code, description) VALUES
  (1, 'Engineering', 'ENG', 'Pengembangan aplikasi, infrastruktur, dan teknologi informasi'),
  (2, 'Human Resources', 'HRD', 'Pengelolaan SDM, rekrutmen, absensi, dan pengajuan cuti'),
  (3, 'Finance', 'FIN', 'Pengelolaan keuangan, akuntansi, dan penggajian'),
  (4, 'Marketing', 'MKT', 'Strategi pemasaran digital, brand, dan komunikasi');

INSERT INTO positions (id, department_id, name, base_salary) VALUES
  (1, 1, 'Supervisor Engineering', 18000000.00),
  (2, 1, 'Senior Frontend Dev', 13500000.00),
  (3, 1, 'Backend Developer', 11000000.00),
  (4, 1, 'QA Engineer', 9500000.00),
  (5, 2, 'HRD Manager', 14000000.00),
  (6, 3, 'Finance Analyst', 9500000.00),
  (7, 4, 'Digital Marketing Specialist', 8500000.00);

INSERT INTO employees (id, nip, full_name, gender, phone, address, department_id, position_id, join_date, status) VALUES
  (1, 'EMP001', 'Jonathan', 'male', '081200000001', 'Jl. Sudirman No. 10, Jakarta', 1, 1, '2022-01-10', 'active'),
  (2, 'EMP002', 'Siti Rahma', 'female', '081200000002', 'Jl. Gatot Subroto No. 24, Jakarta', 2, 5, '2022-02-01', 'active'),
  (3, 'EMP003', 'Budi Santoso', 'male', '081234567890', 'Jl. Ahmad Yani No. 15, Bekasi', 1, 2, '2023-01-15', 'active'),
  (4, 'EMP004', 'Dewi Lestari', 'female', '081234567891', 'Jl. Diponegoro No. 8, Bandung', 1, 3, '2023-02-01', 'active'),
  (5, 'EMP005', 'Fajar Nugroho', 'male', '081234567892', 'Jl. Ahmad Dahlan No. 18, Jakarta', 1, 3, '2023-04-12', 'active'),
  (6, 'EMP006', 'Putri Anggraini', 'female', '081234567893', 'Jl. Casablanca No. 5, Jakarta', 1, 4, '2024-01-08', 'active'),
  (7, 'EMP007', 'Dani Saputra', 'male', '081234567894', 'Jl. Margonda Raya No. 99, Depok', 1, 4, '2026-09-01', 'probation'),
  (8, 'EMP008', 'Andi Pratama', 'male', '081234567895', 'Jl. Merdeka No. 42, Tangerang', 3, 6, '2023-03-10', 'active'),
  (9, 'EMP009', 'Maya Sari', 'female', '081234567896', 'Jl. Kemang Raya No. 7, Jakarta', 4, 7, '2024-06-01', 'active');

INSERT INTO users (id, employee_id, email, password_hash, role, status) VALUES
  (1, 1, 'spv@gapjoten.id', SHA2('spv123', 256), 'spv', 'active'),
  (2, 2, 'hrd@gapjoten.id', SHA2('hrd123', 256), 'hrd', 'active'),
  (3, 3, 'budi@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 'active'),
  (4, 4, 'dewi@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 'active'),
  (5, 5, 'fajar@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 'active'),
  (6, 6, 'putri@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 'active'),
  (7, 7, 'dani@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 'active'),
  (8, 8, 'andi@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 'active'),
  (9, 9, 'maya@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 'active');

INSERT INTO attendances (employee_id, date, clock_in, clock_out, status, method, liveness_passed, notes) VALUES
  (4, CURDATE(), '07:56:00', NULL, 'present', 'face', 1, NULL),
  (5, CURDATE(), '08:28:00', NULL, 'late', 'face', 1, 'Terlambat 13 menit karena macet'),
  (6, CURDATE(), NULL, NULL, 'sick', 'manual', 0, 'Izin sakit demam'),
  (7, CURDATE(), NULL, NULL, 'leave', 'manual', 0, 'Cuti tahunan keluarga'),
  (8, CURDATE(), '07:59:00', '17:01:00', 'present', 'face', 1, NULL),
  (9, CURDATE(), '08:35:00', NULL, 'late', 'manual', 0, 'Kendala kamera, absen alternatif'),
  (3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '07:58:00', '17:04:00', 'present', 'face', 1, NULL),
  (3, DATE_SUB(CURDATE(), INTERVAL 2 DAY), '08:21:00', '17:09:00', 'late', 'face', 1, 'Keterlambatan transportasi'),
  (3, DATE_SUB(CURDATE(), INTERVAL 3 DAY), '07:52:00', '17:00:00', 'present', 'face', 1, NULL),
  (4, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:00:00', '17:02:00', 'present', 'face', 1, NULL),
  (5, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '08:05:00', '17:03:00', 'present', 'face', 1, NULL),
  (6, DATE_SUB(CURDATE(), INTERVAL 1 DAY), NULL, NULL, 'absent', 'manual', 0, 'Belum melakukan absensi');

INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, reason, medical_certificate_path, status, approved_by) VALUES
  (1, 3, 'annual', DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 'Keperluan acara keluarga di luar kota', NULL, 'pending', NULL),
  (2, 4, 'annual', DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 6 DAY), 'Cuti tahunan pribadi', NULL, 'approved', 2),
  (3, 6, 'sick', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Demam tinggi, disarankan istirahat oleh dokter', 'medical-certificates/sample-surat-dokter.txt', 'pending', NULL),
  (4, 5, 'sick', DATE_SUB(CURDATE(), INTERVAL 5 DAY), DATE_SUB(CURDATE(), INTERVAL 4 DAY), 'Flu berat dan pemulihan', 'medical-certificates/sample-surat-dokter.txt', 'approved', 2),
  (5, 7, 'unpaid', DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 10 DAY), 'Pengurusan dokumen administrasi', NULL, 'rejected', 2),
  (6, 8, 'annual', DATE_ADD(CURDATE(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'Cuti divisi Finance', NULL, 'pending', NULL);

INSERT INTO company_announcements (id, title, body, created_by, published_at) VALUES
  (1, 'Kebijakan Absensi Pengenalan Wajah', 'Seluruh karyawan wajib melakukan Clock In dan Clock Out melalui menu Absensi Wajah. Batas keterlambatan adalah 15 menit setelah pukul 08:00 WIB. Jika kamera mengalami kendala, gunakan prosedur alternatif yang tersedia.', 2, DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (2, 'Ketentuan Pengajuan Izin Sakit', 'Setiap pengajuan izin sakit wajib melampirkan surat keterangan dokter dalam format PDF, JPG, atau PNG (maksimal 2 MB) agar dapat diproses oleh HRD.', 2, DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (3, 'Libur Nasional & Jadwal Operasional', 'Perusahaan libur mengikuti kalender libur nasional pemerintah. Pengajuan cuti tahunan disarankan minimal 2 hari kerja sebelumnya.', 2, NOW());
