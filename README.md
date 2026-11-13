# HRIS - Final Project FWD GAPJOTEN (Kelompok 3)

Aplikasi Fullstack **Human Resource Information System (HRIS)** dengan arsitektur terpisah (*decoupled*):
- **Frontend**: React (Vite) menggunakan format komponen **JSX** (`.jsx`).
- **Backend**: **Node.js** dengan framework Express.js (RESTful API).

---

## 📁 Struktur Folder & File Proyek

```text
Final-Project-FWD-GAPJOTEN-HRIS_Kel3/
├── backend/                         # Source code Backend (Node.js & Express)
│   ├── src/
│   │   ├── config/                  # Konfigurasi database & env
│   │   │   └── database.js
│   │   ├── controllers/             # Logika bisnis request & response
│   │   │   ├── authController.js    # Endpoint auth (login, register)
│   │   │   └── employeeController.js# Endpoint CRUD data pegawai
│   │   ├── middlewares/             # Middleware express
│   │   │   ├── authMiddleware.js    # Verifikasi token JWT
│   │   │   └── errorHandler.js      # Global error & 404 handler
│   │   ├── models/                  # Skema & model data
│   │   │   ├── employeeModel.js     # Struktur tabel pegawai
│   │   │   └── userModel.js         # Struktur tabel user / admin
│   │   ├── routes/                  # Definisi route URL API
│   │   │   ├── authRoutes.js        # Route /api/auth
│   │   │   ├── employeeRoutes.js    # Route /api/employees
│   │   │   └── index.js             # Route induk API
│   │   ├── utils/                   # Helper & utility
│   │   │   └── apiResponse.js       # Standard format respons JSON
│   │   ├── app.js                   # Inisialisasi Express & middleware
│   │   └── server.js                # Entry point server HTTP (port listen)
│   ├── .env.example                 # Contoh template environment variables
│   ├── .gitignore                   # Ignore node_modules & file sensitif backend
│   └── package.json                 # Dependensi & script backend
│
├── frontend/                        # Source code Frontend (React JSX + Vite)
│   ├── public/                      # Static assets publik
│   ├── src/
│   │   ├── assets/                  # Gambar, icon, font lokal
│   │   ├── components/              # Komponen UI modular (.jsx)
│   │   │   └── common/
│   │   │       ├── Navbar.jsx       # Header navigasi atas
│   │   │       └── Sidebar.jsx      # Menu navigasi samping
│   │   ├── context/                 # State management global
│   │   │   └── AuthContext.jsx      # Manajemen status login / sesi user
│   │   ├── hooks/                   # Custom React hooks
│   │   │   └── useAuth.js           # Hook akses AuthContext
│   │   ├── layouts/                 # Layout wrapper halaman
│   │   │   └── MainLayout.jsx       # Layout sidebar + navbar + content
│   │   ├── pages/                   # Komponen halaman utama (.jsx)
│   │   │   ├── Dashboard.jsx        # Halaman statistik & ringkasan
│   │   │   ├── Employees.jsx        # Halaman tabel data pegawai
│   │   │   ├── Login.jsx            # Halaman formulir login
│   │   │   └── NotFound.jsx         # Halaman 404
│   │   ├── services/                # Komunikasi API ke backend
│   │   │   └── api.js               # Service Fetch/Axios API endpoints
│   │   ├── utils/                   # Konstanta & fungsi pembantu
│   │   │   └── constants.js         # URL API & variabel global
│   │   ├── App.css                  # Style CSS aplikasi & layout
│   │   ├── App.jsx                  # Routing React Router DOM (.jsx)
│   │   ├── index.css                # CSS reset & global styling
│   │   └── main.jsx                 # Entry point React (ReactDOM.render)
│   ├── .env.example                 # Contoh variabel env frontend (API URL)
│   ├── .gitignore                   # Ignore node_modules & build frontend
│   ├── index.html                   # HTML template Vite
│   ├── package.json                 # Dependensi & script frontend
│   └── vite.config.js               # Konfigurasi bundler Vite
│
├── .gitignore                       # Root gitignore
├── package.json                     # Script root untuk kemudahan manajemen
└── README.md                        # Dokumentasi proyek
```

---

## 🚀 Panduan Menjalankan Proyek

### 1. Instalasi Dependensi
Buka terminal di root folder proyek, kemudian jalankan:

```bash
# Opsi 1: Instalasi otomatis keduanya dari root
npm run install:all

# Opsi 2: Instalasi manual per direktori
cd backend && npm install
cd ../frontend && npm install
```

### 2. Konfigurasi Environment Variables

- **Backend**:
  Salin file `.env.example` menjadi `.env` di dalam folder `backend/`:
  ```bash
  cp backend/.env.example backend/.env
  ```
  Isi port (default `5000`) dan sesuaikan pengaturan database jika sudah menggunakan database aktif.

- **Frontend**:
  Salin file `.env.example` menjadi `.env` di dalam folder `frontend/`:
  ```bash
  cp frontend/.env.example frontend/.env
  ```
  Pastikan `VITE_API_BASE_URL=http://localhost:5000/api`.

### 3. Menjalankan Aplikasi dalam Mode Development

Buka 2 terminal terpisah:

- **Terminal 1 (Backend - Node.js / Express)**:
  ```bash
  cd backend
  npm run dev
  ```
  Server API berjalan di `http://localhost:5000`.

- **Terminal 2 (Frontend - React JSX / Vite)**:
  ```bash
  cd frontend
  npm run dev
  ```
  Aplikasi frontend berjalan di `http://localhost:5173`.

---

## 📡 Endpoint API Utama (Backend)

| Method | Endpoint | Keterangan |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Pengecekan status server API |
| `POST` | `/api/auth/login` | Login user & penerbitan token |
| `POST` | `/api/auth/register` | Pendaftaran akun user baru |
| `GET` | `/api/auth/profile` | Mengambil data profil user aktif |
| `GET` | `/api/employees` | Mengambil semua daftar data pegawai |
| `GET` | `/api/employees/:id` | Mengambil detail satu data pegawai |
| `POST` | `/api/employees` | Menambahkan data pegawai baru |
| `PUT` | `/api/employees/:id` | Memperbarui data pegawai |
| `DELETE` | `/api/employees/:id` | Menghapus data pegawai |

