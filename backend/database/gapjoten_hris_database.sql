CREATE DATABASE IF NOT EXISTS db_uas
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE db_uas;

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS leave_approval_logs;
DROP TABLE IF EXISTS attendance_audit_logs;
DROP TABLE IF EXISTS leave_requests;
DROP TABLE IF EXISTS attendances;
DROP TABLE IF EXISTS face_templates;
DROP TABLE IF EXISTS company_announcements;
DROP TABLE IF EXISTS system_settings;
DROP TABLE IF EXISTS employees;
DROP TABLE IF EXISTS divisions;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE roles (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name ENUM('hrd', 'spv', 'karyawan') NOT NULL,
  description VARCHAR(150) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  email VARCHAR(150) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('hrd', 'spv', 'karyawan') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  KEY idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE divisions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  code VARCHAR(20) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_divisions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE employees (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id INT UNSIGNED NULL,
  nip VARCHAR(50) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(20) NULL,
  position VARCHAR(100) NOT NULL,
  division_id INT UNSIGNED NULL,
  join_date DATE NOT NULL,
  status ENUM('active', 'inactive', 'on_leave') NOT NULL DEFAULT 'active',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_employees_user (user_id),
  UNIQUE KEY uq_employees_nip (nip),
  UNIQUE KEY uq_employees_email (email),
  KEY idx_employees_division (division_id),
  KEY idx_employees_status (status),
  CONSTRAINT fk_employees_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_employees_division FOREIGN KEY (division_id) REFERENCES divisions (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE divisions
  ADD COLUMN spv_id INT UNSIGNED NULL AFTER name,
  ADD CONSTRAINT fk_divisions_spv FOREIGN KEY (spv_id) REFERENCES employees (id) ON DELETE SET NULL;

CREATE TABLE face_templates (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  template_encrypted BLOB NOT NULL,
  model_version VARCHAR(50) NOT NULL DEFAULT 'v1',
  consent_at DATETIME NOT NULL,
  registered_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_face_employee (employee_id),
  CONSTRAINT fk_face_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT fk_face_registered_by FOREIGN KEY (registered_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendances (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  clock_in DATETIME NULL,
  clock_out DATETIME NULL,
  status ENUM('hadir', 'telat', 'alpha', 'cuti', 'izin_sakit') NOT NULL DEFAULT 'hadir',
  method ENUM('face', 'manual') NOT NULL DEFAULT 'face',
  liveness_passed TINYINT(1) NOT NULL DEFAULT 1,
  notes VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_attendance_employee_date (employee_id, attendance_date),
  KEY idx_attendance_date (attendance_date),
  KEY idx_attendance_status (status),
  CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE attendance_audit_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  attendance_id BIGINT UNSIGNED NOT NULL,
  actor_id INT UNSIGNED NULL,
  action VARCHAR(50) NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_attendance_audit_attendance (attendance_id),
  CONSTRAINT fk_attendance_audit_attendance FOREIGN KEY (attendance_id) REFERENCES attendances (id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_audit_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leave_requests (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  employee_id INT UNSIGNED NOT NULL,
  type ENUM('cuti', 'izin_sakit') NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(500) NOT NULL,
  medical_certificate_path VARCHAR(255) NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  approved_by INT UNSIGNED NULL,
  approved_at DATETIME NULL,
  rejection_reason VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leave_status (status),
  KEY idx_leave_employee (employee_id),
  KEY idx_leave_dates (start_date, end_date),
  CONSTRAINT fk_leave_employee FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_approved_by FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE leave_approval_logs (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  leave_request_id INT UNSIGNED NOT NULL,
  actor_id INT UNSIGNED NOT NULL,
  action ENUM('submitted', 'approved', 'rejected') NOT NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_leave_log_request (leave_request_id),
  CONSTRAINT fk_leave_log_request FOREIGN KEY (leave_request_id) REFERENCES leave_requests (id) ON DELETE CASCADE,
  CONSTRAINT fk_leave_log_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE company_announcements (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  created_by INT UNSIGNED NOT NULL,
  published_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_announcement_published (published_at),
  CONSTRAINT fk_announcement_author FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE system_settings (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT,
  setting_key VARCHAR(100) NOT NULL,
  setting_value VARCHAR(255) NOT NULL,
  description VARCHAR(255) NULL,
  updated_by INT UNSIGNED NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_settings_key (setting_key),
  CONSTRAINT fk_settings_updated_by FOREIGN KEY (updated_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (id, name, description) VALUES
  (1, 'hrd', 'Administrator utama: mengelola karyawan, absensi, approval, dan pengumuman'),
  (2, 'spv', 'Supervisor: memantau kehadiran tim secara read-only'),
  (3, 'karyawan', 'Karyawan: absensi wajah dan pengajuan pribadi');

INSERT INTO users (id, email, password_hash, role, is_active) VALUES
  (1, 'jonathan@gapjoten.id', SHA2('spv123', 256), 'spv', 1),
  (2, 'siti@gapjoten.id', SHA2('hrd123', 256), 'hrd', 1),
  (3, 'budi@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (4, 'andi@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (5, 'dewi@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (6, 'rizky@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (7, 'nina@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (8, 'fajar@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (9, 'maya@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (10, 'yusuf@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (11, 'lina@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (12, 'arif@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (13, 'putri@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (14, 'dani@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (15, 'sari@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (16, 'bima@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (17, 'tika@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (18, 'reza@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (19, 'fitri@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (20, 'agus@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (21, 'rani@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (22, 'tono@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (23, 'wulan@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (24, 'eko@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (25, 'mira@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1),
  (26, 'rendi@gapjoten.id', SHA2('karyawan123', 256), 'karyawan', 1);

INSERT INTO divisions (id, code, name) VALUES
  (1, 'IT', 'Information Technology'),
  (2, 'HRD', 'Human Resources'),
  (3, 'OPS', 'Operations'),
  (4, 'FIN', 'Finance'),
  (5, 'MKT', 'Marketing');

INSERT INTO employees (id, user_id, nip, full_name, email, phone, position, division_id, join_date, status) VALUES
  (1, 1, 'EMP001', 'Jonathan', 'jonathan@gapjoten.id', '081200000001', 'Supervisor IT', 1, '2022-01-10', 'active'),
  (2, 2, 'EMP002', 'Siti Rahma', 'siti@gapjoten.id', '081200000002', 'HRD Staff', 2, '2022-02-01', 'active'),
  (3, 3, 'EMP003', 'Budi Santoso', 'budi@gapjoten.id', '081234567890', 'Staff IT', 1, '2023-01-15', 'active'),
  (4, 4, 'EMP004', 'Andi Pratama', 'andi@gapjoten.id', '081234567891', 'Staff IT', 1, '2023-01-20', 'active'),
  (5, 5, 'EMP005', 'Dewi Lestari', 'dewi@gapjoten.id', '081234567892', 'Staff IT', 1, '2023-02-01', 'active'),
  (6, 6, 'EMP006', 'Rizky Ramadhan', 'rizky@gapjoten.id', '081234567893', 'Staff IT', 1, '2023-02-05', 'active'),
  (7, 7, 'EMP007', 'Nina Kartika', 'nina@gapjoten.id', '081234567894', 'Staff IT', 1, '2023-02-10', 'active'),
  (8, 8, 'EMP008', 'Fajar Nugroho', 'fajar@gapjoten.id', '081234567895', 'Staff IT', 1, '2023-03-01', 'active'),
  (9, 9, 'EMP009', 'Maya Sari', 'maya@gapjoten.id', '081234567896', 'Staff IT', 1, '2023-03-03', 'active'),
  (10, 10, 'EMP010', 'Yusuf Maulana', 'yusuf@gapjoten.id', '081234567897', 'Staff IT', 1, '2023-03-07', 'active'),
  (11, 11, 'EMP011', 'Lina Marlina', 'lina@gapjoten.id', '081234567898', 'Staff IT', 1, '2023-03-12', 'active'),
  (12, 12, 'EMP012', 'Arif Setiawan', 'arif@gapjoten.id', '081234567899', 'Staff IT', 1, '2023-04-02', 'active'),
  (13, 13, 'EMP013', 'Putri Anggraini', 'putri@gapjoten.id', '081234567900', 'Staff IT', 1, '2023-04-10', 'active'),
  (14, 14, 'EMP014', 'Dani Saputra', 'dani@gapjoten.id', '081234567901', 'Staff IT', 1, '2023-04-17', 'active'),
  (15, 15, 'EMP015', 'Sari Wulandari', 'sari@gapjoten.id', '081234567902', 'Staff IT', 1, '2023-05-03', 'active'),
  (16, 16, 'EMP016', 'Bima Hartono', 'bima@gapjoten.id', '081234567903', 'Staff IT', 1, '2023-05-08', 'active'),
  (17, 17, 'EMP017', 'Tika Permata', 'tika@gapjoten.id', '081234567904', 'Staff IT', 1, '2023-05-15', 'active'),
  (18, 18, 'EMP018', 'Reza Firmansyah', 'reza@gapjoten.id', '081234567905', 'Staff IT', 1, '2023-06-01', 'active'),
  (19, 19, 'EMP019', 'Fitri Handayani', 'fitri@gapjoten.id', '081234567906', 'Staff IT', 1, '2023-06-12', 'active'),
  (20, 20, 'EMP020', 'Agus Salim', 'agus@gapjoten.id', '081234567907', 'Staff IT', 1, '2023-06-19', 'active'),
  (21, 21, 'EMP021', 'Rani Kusuma', 'rani@gapjoten.id', '081234567908', 'Staff IT', 1, '2023-07-03', 'active'),
  (22, 22, 'EMP022', 'Tono Susilo', 'tono@gapjoten.id', '081234567909', 'Staff IT', 1, '2023-07-10', 'active'),
  (23, 23, 'EMP023', 'Wulan Anggraini', 'wulan@gapjoten.id', '081234567910', 'Staff IT', 1, '2023-07-17', 'active'),
  (24, 24, 'EMP024', 'Eko Prasetyo', 'eko@gapjoten.id', '081234567911', 'Staff IT', 1, '2023-08-01', 'active'),
  (25, 25, 'EMP025', 'Mira Juliani', 'mira@gapjoten.id', '081234567912', 'Staff IT', 1, '2023-08-07', 'active'),
  (26, 26, 'EMP026', 'Rendi Saputra', 'rendi@gapjoten.id', '081234567913', 'Staff IT', 1, '2023-08-14', 'active');

UPDATE divisions SET spv_id = 1 WHERE id = 1;

INSERT INTO face_templates (employee_id, template_encrypted, model_version, consent_at, registered_by) VALUES
  (3, AES_ENCRYPT('face-vector-EMP003', 'gapjoten-key'), 'v1', '2023-01-15 08:00:00', 2),
  (4, AES_ENCRYPT('face-vector-EMP004', 'gapjoten-key'), 'v1', '2023-01-20 08:00:00', 2),
  (5, AES_ENCRYPT('face-vector-EMP005', 'gapjoten-key'), 'v1', '2023-02-01 08:00:00', 2),
  (6, AES_ENCRYPT('face-vector-EMP006', 'gapjoten-key'), 'v1', '2023-02-05 08:00:00', 2),
  (7, AES_ENCRYPT('face-vector-EMP007', 'gapjoten-key'), 'v1', '2023-02-10 08:00:00', 2);

INSERT INTO attendances (employee_id, attendance_date, clock_in, clock_out, status, method, liveness_passed, notes) VALUES
  (3, CURDATE(), '2026-01-01 08:01:00', '2026-01-01 17:02:00', 'hadir', 'face', 1, NULL),
  (4, CURDATE(), '2026-01-01 08:02:00', '2026-01-01 17:04:00', 'hadir', 'face', 1, NULL),
  (5, CURDATE(), '2026-01-01 08:03:00', '2026-01-01 17:01:00', 'hadir', 'face', 1, NULL),
  (6, CURDATE(), '2026-01-01 08:04:00', '2026-01-01 17:06:00', 'hadir', 'face', 1, NULL),
  (7, CURDATE(), '2026-01-01 08:05:00', '2026-01-01 17:03:00', 'hadir', 'face', 1, NULL),
  (8, CURDATE(), '2026-01-01 08:06:00', '2026-01-01 17:07:00', 'hadir', 'face', 1, NULL),
  (9, CURDATE(), '2026-01-01 08:07:00', '2026-01-01 17:05:00', 'hadir', 'face', 1, NULL),
  (10, CURDATE(), '2026-01-01 08:08:00', '2026-01-01 17:08:00', 'hadir', 'face', 1, NULL),
  (11, CURDATE(), '2026-01-01 08:09:00', '2026-01-01 17:02:00', 'hadir', 'face', 1, NULL),
  (12, CURDATE(), '2026-01-01 08:10:00', '2026-01-01 17:09:00', 'hadir', 'face', 1, NULL),
  (13, CURDATE(), '2026-01-01 08:11:00', '2026-01-01 17:04:00', 'hadir', 'face', 1, NULL),
  (14, CURDATE(), '2026-01-01 08:12:00', '2026-01-01 17:10:00', 'hadir', 'face', 1, NULL),
  (15, CURDATE(), '2026-01-01 08:13:00', '2026-01-01 17:05:00', 'hadir', 'face', 1, NULL),
  (16, CURDATE(), '2026-01-01 08:14:00', '2026-01-01 17:11:00', 'hadir', 'face', 1, NULL),
  (17, CURDATE(), '2026-01-01 08:15:00', '2026-01-01 17:06:00', 'hadir', 'face', 1, NULL),
  (18, CURDATE(), '2026-01-01 08:01:00', '2026-01-01 17:07:00', 'hadir', 'face', 1, NULL),
  (19, CURDATE(), '2026-01-01 08:02:00', '2026-01-01 17:08:00', 'hadir', 'face', 1, NULL),
  (20, CURDATE(), '2026-01-01 08:03:00', '2026-01-01 17:09:00', 'hadir', 'face', 1, NULL),
  (21, CURDATE(), '2026-01-01 08:31:00', '2026-01-01 17:12:00', 'telat', 'face', 1, 'Terlambat 16 menit'),
  (22, CURDATE(), '2026-01-01 08:45:00', '2026-01-01 17:15:00', 'telat', 'face', 1, 'Terlambat 30 menit'),
  (23, CURDATE(), NULL, NULL, 'cuti', 'manual', 0, 'Cuti keluarga'),
  (24, CURDATE(), NULL, NULL, 'cuti', 'manual', 0, 'Cuti pribadi'),
  (25, CURDATE(), NULL, NULL, 'izin_sakit', 'manual', 0, 'Izin sakit dengan surat dokter'),
  (26, CURDATE(), NULL, NULL, 'alpha', 'manual', 0, 'Tanpa keterangan');

INSERT INTO leave_requests (id, employee_id, type, start_date, end_date, reason, medical_certificate_path, status, approved_by, approved_at) VALUES
  (1, 3, 'cuti', DATE_ADD(CURDATE(), INTERVAL 1 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Keperluan keluarga', NULL, 'pending', NULL, NULL),
  (2, 4, 'izin_sakit', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Sakit demam', 'uploads/medical/emp004.pdf', 'pending', NULL, NULL),
  (3, 5, 'cuti', DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'Acara kantor', NULL, 'pending', NULL, NULL),
  (4, 6, 'cuti', DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'Urusan pribadi', NULL, 'pending', NULL, NULL),
  (5, 7, 'izin_sakit', CURDATE(), CURDATE(), 'Sakit kepala', 'uploads/medical/emp007.pdf', 'pending', NULL, NULL),
  (6, 8, 'cuti', DATE_ADD(CURDATE(), INTERVAL 6 DAY), DATE_ADD(CURDATE(), INTERVAL 7 DAY), 'Libur tahunan', NULL, 'pending', NULL, NULL),
  (7, 9, 'cuti', DATE_ADD(CURDATE(), INTERVAL 8 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'Keperluan keluarga', NULL, 'pending', NULL, NULL),
  (8, 10, 'izin_sakit', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Sakit perut', 'uploads/medical/emp010.pdf', 'pending', NULL, NULL),
  (9, 11, 'cuti', DATE_ADD(CURDATE(), INTERVAL 10 DAY), DATE_ADD(CURDATE(), INTERVAL 11 DAY), 'Urusan pribadi', NULL, 'pending', NULL, NULL),
  (10, 12, 'cuti', DATE_ADD(CURDATE(), INTERVAL 12 DAY), DATE_ADD(CURDATE(), INTERVAL 13 DAY), 'Acara keluarga', NULL, 'pending', NULL, NULL),
  (11, 13, 'izin_sakit', CURDATE(), CURDATE(), 'Sakit flu', 'uploads/medical/emp013.pdf', 'pending', NULL, NULL),
  (12, 14, 'cuti', DATE_ADD(CURDATE(), INTERVAL 14 DAY), DATE_ADD(CURDATE(), INTERVAL 15 DAY), 'Libur tahunan', NULL, 'pending', NULL, NULL),
  (13, 15, 'cuti', DATE_ADD(CURDATE(), INTERVAL 16 DAY), DATE_ADD(CURDATE(), INTERVAL 17 DAY), 'Keperluan rumah', NULL, 'pending', NULL, NULL),
  (14, 16, 'izin_sakit', CURDATE(), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 'Sakit gigi', 'uploads/medical/emp016.pdf', 'pending', NULL, NULL),
  (15, 17, 'cuti', DATE_ADD(CURDATE(), INTERVAL 18 DAY), DATE_ADD(CURDATE(), INTERVAL 19 DAY), 'Urusan pribadi', NULL, 'pending', NULL, NULL),
  (16, 18, 'cuti', DATE_ADD(CURDATE(), INTERVAL -10 DAY), DATE_ADD(CURDATE(), INTERVAL -9 DAY), 'Libur tahunan', NULL, 'approved', 2, NOW()),
  (17, 19, 'izin_sakit', DATE_ADD(CURDATE(), INTERVAL -8 DAY), DATE_ADD(CURDATE(), INTERVAL -7 DAY), 'Sakit demam', 'uploads/medical/emp019.pdf', 'approved', 2, NOW()),
  (18, 20, 'cuti', DATE_ADD(CURDATE(), INTERVAL -6 DAY), DATE_ADD(CURDATE(), INTERVAL -5 DAY), 'Acara keluarga', NULL, 'approved', 2, NOW()),
  (19, 21, 'cuti', DATE_ADD(CURDATE(), INTERVAL -4 DAY), DATE_ADD(CURDATE(), INTERVAL -3 DAY), 'Keperluan pribadi', NULL, 'approved', 2, NOW()),
  (20, 22, 'izin_sakit', DATE_ADD(CURDATE(), INTERVAL -2 DAY), DATE_ADD(CURDATE(), INTERVAL -1 DAY), 'Sakit', 'uploads/medical/emp022.pdf', 'rejected', 2, NOW()),
  (21, 23, 'cuti', DATE_ADD(CURDATE(), INTERVAL -1 DAY), CURDATE(), 'Urusan pribadi', NULL, 'rejected', 2, NOW());

INSERT INTO attendance_audit_logs (attendance_id, actor_id, action, new_value)
SELECT id, employee_id, 'created', CONCAT('status=', status) FROM attendances;

INSERT INTO leave_approval_logs (leave_request_id, actor_id, action, note, created_at)
SELECT id, employee_id, 'submitted', 'Pengajuan dibuat oleh karyawan', created_at FROM leave_requests;

INSERT INTO leave_approval_logs (leave_request_id, actor_id, action, note, created_at)
SELECT id, approved_by, IF(status = 'approved', 'approved', 'rejected'), IF(status = 'approved', 'Disetujui HRD', 'Ditolak HRD'), approved_at
FROM leave_requests
WHERE status <> 'pending';

INSERT INTO company_announcements (title, body, created_by, published_at) VALUES
  ('Libur Nasional', 'Perusahaan libur pada tanggal merah sesuai kalender nasional.', 2, NOW()),
  ('Pembaruan Kebijakan Absensi', 'Absensi wajah wajib dilakukan maksimal 15 menit setelah jam masuk kerja.', 2, NOW());

INSERT INTO system_settings (setting_key, setting_value, description, updated_by) VALUES
  ('work_start', '08:00', 'Jam masuk kerja', 2),
  ('work_end', '17:00', 'Jam pulang kerja', 2),
  ('late_tolerance_minutes', '15', 'Toleransi keterlambatan dalam menit', 2),
  ('face_liveness_required', '1', 'Wajib liveness detection pada absensi wajah', 2),
  ('medical_file_max_mb', '2', 'Ukuran maksimal surat dokter dalam MB', 2);

CREATE OR REPLACE VIEW v_spv_team_members AS
SELECT
  d.spv_id,
  e.id AS employee_id,
  e.nip,
  e.full_name,
  e.position,
  d.id AS division_id,
  d.name AS division_name,
  u.email
FROM employees e
INNER JOIN divisions d ON d.id = e.division_id
INNER JOIN users u ON u.id = e.user_id
WHERE e.status = 'active'
  AND u.role = 'karyawan';

CREATE OR REPLACE VIEW v_spv_attendance_today AS
SELECT
  d.spv_id,
  e.id AS employee_id,
  e.nip,
  e.full_name,
  a.attendance_date,
  a.clock_in,
  a.clock_out,
  a.status,
  a.method,
  a.liveness_passed
FROM attendances a
INNER JOIN employees e ON e.id = a.employee_id
INNER JOIN divisions d ON d.id = e.division_id
WHERE a.attendance_date = CURDATE();

CREATE OR REPLACE VIEW v_spv_leave_requests AS
SELECT
  d.spv_id,
  lr.id AS leave_request_id,
  e.id AS employee_id,
  e.full_name,
  lr.type,
  lr.start_date,
  lr.end_date,
  lr.reason,
  lr.status,
  lr.created_at
FROM leave_requests lr
INNER JOIN employees e ON e.id = lr.employee_id
INNER JOIN divisions d ON d.id = e.division_id;

CREATE OR REPLACE VIEW v_spv_dashboard AS
SELECT
  d.spv_id,
  d.id AS division_id,
  d.name AS division_name,
  (SELECT COUNT(*) FROM employees e INNER JOIN users u ON u.id = e.user_id WHERE e.division_id = d.id AND e.status = 'active' AND u.role = 'karyawan') AS total_anggota,
  (SELECT COUNT(*) FROM attendances a INNER JOIN employees e ON e.id = a.employee_id WHERE e.division_id = d.id AND a.attendance_date = CURDATE() AND a.status IN ('hadir', 'telat')) AS hadir,
  (SELECT COUNT(*) FROM attendances a INNER JOIN employees e ON e.id = a.employee_id WHERE e.division_id = d.id AND a.attendance_date = CURDATE() AND a.status = 'telat') AS telat,
  (SELECT COUNT(*) FROM leave_requests lr INNER JOIN employees e ON e.id = lr.employee_id WHERE e.division_id = d.id AND lr.status = 'pending') AS menunggu_persetujuan
FROM divisions d;
