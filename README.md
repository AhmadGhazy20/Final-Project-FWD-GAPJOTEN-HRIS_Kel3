# HRIS - Final Project FWD GAPJOTEN (Kelompok 3)

Aplikasi Fullstack **GAPJOTEN HRIS — Face Recognition Attendance & Employee Dashboard** menggunakan arsitektur terpisah (*decoupled*):

- **Frontend**: React (Vite) menggunakan komponen **JSX** (`.jsx`).
- **Backend**: **Laravel 13** (PHP 8.3) sebagai RESTful API dengan database **MySQL** (`db_uas`).

---

## Ruang Lingkup Implementasi Saat Ini

- **Role `karyawan` (diimplementasikan penuh):**
  - Dashboard ringkasan kehadiran pribadi & pengumuman perusahaan
  - **Absensi Wajah** (Browser Camera API `getUserMedia` + verifikasi liveness + prosedur alternatif jika kamera terkendala, Clock In / Clock Out berbasis waktu server)
  - **Riwayat Absensi** pribadi dengan filter rentang tanggal
  - **Pengajuan Cuti** & **Izin Sakit** (termasuk unggah file surat dokter PDF/JPG/PNG)
  - **Status Pengajuan** (Menunggu / Disetujui / Ditolak)
  - **Informasi Perusahaan** & **Profil Saya** (perbarui informasi pribadi yang diizinkan)
- **Role `spv` (diimplementasikan penuh, read-only sesuai divisi):**
  - Dashboard statistik kehadiran tim divisinya
  - **Data Tim**, **Monitoring Absensi** hari ini, & **Riwayat Kehadiran** tim
  - **Pengajuan Cuti** & **Izin Sakit** tim (hanya baca + lihat surat dokter, tanpa approval)
  - **Laporan Tim** berdasarkan periode + unduh CSV
  - **Informasi Perusahaan** & **Profil Saya**
- **Role `hrd` (diimplementasikan penuh):**
  - **Dashboard HRD** (statistik seluruh karyawan, kehadiran hari ini, keterlambatan, pengajuan menunggu, status pendaftaran wajah, & ringkasan departemen)
  - **Data Karyawan** (tambah, edit, filter, & hapus data karyawan beserta akun login)
  - **Face Registration** (perekaman data wajah dengan persetujuan karyawan, enkripsi referensi biometrik, retensi, & penghapusan data)
  - **Data Absensi** (monitoring hari ini seluruh perusahaan, riwayat lintas departemen, & pencatatan/koreksi absensi manual)
  - **Pengajuan Cuti** & **Izin Sakit** (periksa pengajuan, lihat surat dokter, setujui/tolak dengan catatan keputusan)
  - **Informasi Perusahaan** (buat, edit, hapus, & terbitkan pengumuman perusahaan)
  - **Laporan Absensi** (rekap harian/bulanan seluruh perusahaan + unduh CSV)
  - **Pengaturan** (konfigurasi jam kerja, toleransi terlambat, kuota cuti, retensi biometrik, departemen/jabatan, & manajemen akun)

---

## Struktur Database (`db_uas`)

1. **`departments`**: Master data departemen (`id`, `name`, `code`, `description`).
2. **`positions`**: Master data jabatan per departemen (`id`, `department_id`, `name`, `base_salary`).
3. **`employees`**: Data induk pegawai (`id`, `nip`, `full_name`, `gender`, `phone`, `address`, `department_id`, `position_id`, `join_date`, `status`).
4. **`users`**: Akun login & hak akses (`id`, `employee_id`, `email`, `password_hash`, `role`: `'hrd' | 'spv' | 'karyawan'`, `status`).
5. **`attendances`**: Presensi harian pegawai (`id`, `employee_id`, `date`, `clock_in`, `clock_out`, `status`, `method`: `'face' | 'manual'`, `liveness_passed`, `notes`).
6. **`leave_requests`**: Pengajuan cuti/izin (`id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `reason`, `medical_certificate_path`, `status`, `approved_by`).
7. **`company_announcements`**: Pengumuman perusahaan (`id`, `title`, `body`, `created_by`, `published_at`).

File SQL tersedia di [backend/database/gapjoten_hris_database.sql](file:///c:/laragon/www/Final-Project-FWD-GAPJOTEN-HRIS_Kel3/backend/database/gapjoten_hris_database.sql).

---

## Panduan Menjalankan Proyek

### 1. Backend (Laravel 13)
Buka Terminal bawaan **Laragon** (PHP 8.3) atau terminal dengan PHP 8.3 di `PATH`:
```bash
cd backend
php artisan serve
```
Server berjalan di `http://127.0.0.1:8000`.

### 2. Frontend (React JSX + Vite)
```bash
cd frontend
npm run dev
```
Aplikasi web berjalan di `http://localhost:5173`.

---

## Akun Demo

| Role | Email | Password | Keterangan |
| :--- | :--- | :--- | :--- |
| **Karyawan** | `budi@gapjoten.id` | `karyawan123` | Divisi Engineering |
| **SPV** | `spv@gapjoten.id` | `spv123` | Supervisor Divisi Engineering |
| **HRD** | `hrd@gapjoten.id` | `hrd123` | Administrator Utama HRD |
