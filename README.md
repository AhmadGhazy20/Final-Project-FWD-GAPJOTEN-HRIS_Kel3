# HRIS - Final Project FWD GAPJOTEN (Kelompok 3)

Aplikasi Fullstack **Sistem Absensi Karyawan** dengan 3 role: **karyawan**, **SPV**, dan **HRD**, menggunakan arsitektur terpisah (*decoupled*):

- **Frontend**: React (Vite) menggunakan format komponen **JSX** (`.jsx`).
- **Backend**: **Laravel 13** (PHP 8.3) sebagai RESTful API dengan MySQL. Fokus modul SPV: ringkasan dan monitoring tim secara read-only (sesuai SRS, SPV tidak melakukan approval; approval ada di HRD).

---

## Struktur Folder & File Proyek

```text
Final-Project-FWD-GAPJOTEN-HRIS_Kel3/
├── backend/                         # Source code Backend (Laravel 13)
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/Api/     # AuthController, EmployeeController, SpvController
│   │   │   └── Middleware/          # VerifyJwt, EnsureRole
│   │   └── Services/JwtService.php  # Sign & verify token JWT (HS256)
│   ├── bootstrap/app.php            # Registrasi route api, CORS, middleware alias
│   ├── config/cors.php              # Akses CORS untuk frontend Vite
│   ├── routes/api.php               # Definisi endpoint /api
│   ├── .env                         # Konfigurasi DB, APP_KEY, JWT_SECRET
│   ├── artisan                      # Entry point command Laravel
│   └── composer.json                # Dependensi & script backend
│
├── frontend/                        # Source code Frontend (React JSX + Vite)
│   ├── src/
│   │   ├── components/              # Komponen UI modular (.jsx)
│   │   ├── context/                 # AuthContext.jsx
│   │   ├── layouts/                 # MainLayout.jsx
│   │   ├── pages/                   # Dashboard, Employees, Login, NotFound
│   │   ├── services/api.js          # Fetch API ke backend
│   │   └── App.jsx                  # Routing React Router DOM
│   ├── .env                         # VITE_API_BASE_URL=http://localhost:5000/api
│   └── package.json
│
├── package.json                     # Script root untuk Laravel + frontend
└── README.md
```

---

## Panduan Menjalankan Proyek

### 1. Instalasi Dependensi

Dari root folder proyek:

```bash
npm run install:all
```

Atau manual:

```bash
composer install --working-dir=backend
npm --prefix frontend install
```

### 2. Konfigurasi Environment Variables

- **Backend**:
  Salin `.env.example` menjadi `.env` di folder `backend/`, lalu isi:

```dotenv
APP_URL=http://localhost:5000
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=db_uas
DB_USERNAME=root
DB_PASSWORD=
JWT_SECRET=change-me-in-local-env
JWT_EXPIRES_IN=86400
```

Generate `APP_KEY`:

```bash
php backend/artisan key:generate
```

File SQL ada di `backend/database/gapjoten_hris_database.sql`. Import file tersebut di Laragon/phpMyAdmin; script sudah membuat database **`db_uas`**.

- **Frontend**:
  Pastikan `frontend/.env` berisi:

```dotenv
VITE_API_BASE_URL=http://localhost:5000/api
```

### 3. Menjalankan Aplikasi dalam Mode Development

Buka 2 terminal terpisah:

- **Terminal 1 (Backend - Laravel)**:
  ```bash
  npm run dev:backend
  ```
  Atau:
  ```bash
  php backend/artisan serve --port=5000
  ```
  Server API berjalan di `http://localhost:5000`.

- **Terminal 2 (Frontend - React JSX / Vite)**:
  ```bash
  npm run dev:frontend
  ```
  Aplikasi frontend berjalan di `http://localhost:5173`.

---

## Endpoint API Utama (Backend)

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Pengecekan status server API |
| `POST` | `/api/auth/login` | Login user & penerbitan token JWT |
| `POST` | `/api/auth/register` | Pendaftaran akun user baru |
| `GET` | `/api/auth/profile` | Mengambil data profil user aktif |
| `GET` | `/api/employees` | Mengambil semua daftar data pegawai |
| `GET` | `/api/employees/:id` | Mengambil detail satu data pegawai |
| `POST` | `/api/employees` | Menambahkan data pegawai baru |
| `PUT` | `/api/employees/:id` | Memperbarui data pegawai |
| `DELETE` | `/api/employees/:id` | Menghapus data pegawai |
| `GET` | `/api/spv/dashboard` | Ringkasan tim & statistik cuti/izin (SPV) |
| `GET` | `/api/spv/team` | Daftar anggota tim SPV |
| `GET` | `/api/spv/my-attendance` | Absensi pribadi SPV hari ini + riwayat 7 hari |
| `POST` | `/api/spv/my-attendance/check-in` | Absen masuk SPV (face recognition) |
| `POST` | `/api/spv/my-attendance/check-out` | Absen pulang SPV |
| `GET` | `/api/spv/attendance` | Absensi tim hari ini |
| `GET` | `/api/spv/late-employees` | Daftar anggota tim yang terlambat |
| `GET` | `/api/spv/leave-requests` | Pengajuan cuti/izin tim (`?status=pending\|approved\|rejected`), read-only |

Semua endpoint `/api/spv/*` memerlukan header `Authorization: Bearer <token>` dan role `spv`. SPV tidak memiliki endpoint approval; sesuai SRS, approval cuti/izin dilakukan HRD.

### Akun demo

| Role | Email | Password |
| :--- | :--- | :--- |
| SPV | `jonathan@gapjoten.id` | `spv123` |
| HRD | `siti@gapjoten.id` | `hrd123` |
| Karyawan | `budi@gapjoten.id` | `karyawan123` |
