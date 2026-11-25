import React, { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import gapjotenLogo from '../assets/gapjoten-logo.png';
import './Login.css';

const REMEMBERED_EMAIL_KEY = 'gapjoten_remembered_email';

const COPY = {
  id: {
    brandName: 'GAPJOTEN',
    brandSub: 'HUMAN RESOURCE INFORMATION SYSTEM',
    pill: 'PEOPLE • TECHNOLOGY • GROWTH',
    heroTitleLine1: 'Satu ruang.',
    heroTitleLine2: 'Seluruh potensi tim.',
    heroDesc:
      'Kelola kehadiran, data karyawan, dan cuti dengan lebih terhubung — dari mana saja.',
    rolesCardTitle: 'Dirancang untuk setiap peran',
    rolesCardSub: 'Akses yang tepat. Kolaborasi yang lebih baik.',
    roles: [
      {
        key: 'hrd',
        badge: 'HRD',
        title: 'Kelola SDM organisasi',
        desc: 'Data karyawan, kehadiran & kebijakan',
      },
      {
        key: 'spv',
        badge: 'SPV',
        title: 'Pimpin tim dengan lebih siap',
        desc: 'Pantau tim & tinjau pengajuan cuti',
      },
      {
        key: 'karyawan',
        badge: 'Karyawan',
        title: 'Fokus pada hari kerja Anda',
        desc: 'Absensi wajah & layanan mandiri',
      },
    ],
    quoteLine1: 'Lebih sedikit administrasi.',
    quoteLine2: 'Lebih banyak ruang untuk bertumbuh.',
    copyright: '© 2025 GAPJOTEN HRIS',
    langLabel: 'Bahasa Indonesia',
    eyebrow: 'SELAMAT DATANG KEMBALI',
    heading: 'Masuk ke workspace Anda',
    subtitle: 'Gunakan akun kerja yang telah didaftarkan oleh HRD.',
    emailLabel: 'Email perusahaan',
    emailPlaceholder: 'nama@gapjoten.id',
    passwordLabel: 'Kata sandi',
    passwordPlaceholder: 'Masukkan kata sandi',
    showPassword: 'Tampilkan',
    hidePassword: 'Sembunyikan',
    rememberMe: 'Ingat saya',
    forgotPassword: 'Lupa kata sandi?',
    submit: 'Masuk ke akun',
    submitting: 'Memproses...',
    roleTitle: 'Akses mengikuti role akun Anda',
    roleDesc:
      'Anda akan diarahkan ke portal HRD, SPV, atau Karyawan sesuai hak akses yang diberikan perusahaan.',
    noAccount: 'Belum memiliki akun? Hubungi HRD perusahaan Anda.',
    privacy: 'Privasi',
    terms: 'Ketentuan penggunaan',
    helpCenter: 'Pusat bantuan',
    brandCaption: 'GAPJOTEN HRIS • Ruang kerja digital Anda',
    defaultError: 'Login gagal, periksa email & kata sandi Anda.',
    modals: {
      forgot: {
        title: 'Reset Kata Sandi',
        paragraphs: [
          'Untuk keamanan akun perusahaan, pengaturan ulang kata sandi dikelola langsung oleh tim HRD.',
          'Silakan hubungi admin HRD atau kirim pesan ke hrd@gapjoten.id dengan menyertakan nama lengkap dan NIP Anda.',
        ],
      },
      privacy: {
        title: 'Kebijakan Privasi',
        paragraphs: [
          'GAPJOTEN HRIS hanya mengumpulkan data kepegawaian, absensi, dan pengajuan cuti untuk keperluan operasional internal perusahaan.',
          'Seluruh data akun dan rekaman kehadiran dijaga kerahasiaannya dan hanya dapat diakses sesuai hak akses peran (HRD, SPV, dan Karyawan).',
        ],
      },
      terms: {
        title: 'Ketentuan Penggunaan',
        paragraphs: [
          'Akun workspace GAPJOTEN HRIS bersifat pribadi dan hanya boleh digunakan oleh karyawan yang terdaftar oleh HRD.',
          'Pengguna wajib menjaga kerahasiaan kata sandi serta tidak membagikan akses portal kepada pihak lain.',
        ],
      },
      help: {
        title: 'Pusat Bantuan Login',
        paragraphs: [
          'Pastikan Anda menggunakan email perusahaan aktif yang telah didaftarkan oleh HRD (contoh: nama@gapjoten.id).',
          'Jika mengalami kendala masuk atau akun belum aktif, hubungi tim HRD perusahaan Anda.',
        ],
      },
    },
    closeModal: 'Tutup',
  },
  en: {
    brandName: 'GAPJOTEN',
    brandSub: 'HUMAN RESOURCE INFORMATION SYSTEM',
    pill: 'PEOPLE • TECHNOLOGY • GROWTH',
    heroTitleLine1: 'One space.',
    heroTitleLine2: 'Every team potential.',
    heroDesc:
      'Manage attendance, employee records, and leave requests more seamlessly — from anywhere.',
    rolesCardTitle: 'Built for every role',
    rolesCardSub: 'The right access. Better collaboration.',
    roles: [
      {
        key: 'hrd',
        badge: 'HRD',
        title: 'Manage organizational HR',
        desc: 'Employee data, attendance & policies',
      },
      {
        key: 'spv',
        badge: 'SPV',
        title: 'Lead your team proactively',
        desc: 'Monitor team & review leave requests',
      },
      {
        key: 'karyawan',
        badge: 'Employee',
        title: 'Focus on your workday',
        desc: 'Face attendance & self-service',
      },
    ],
    quoteLine1: 'Less administration.',
    quoteLine2: 'More room to grow.',
    copyright: '© 2025 GAPJOTEN HRIS',
    langLabel: 'English',
    eyebrow: 'WELCOME BACK',
    heading: 'Sign in to your workspace',
    subtitle: 'Use the work account registered by HRD.',
    emailLabel: 'Company email',
    emailPlaceholder: 'name@gapjoten.id',
    passwordLabel: 'Password',
    passwordPlaceholder: 'Enter your password',
    showPassword: 'Show',
    hidePassword: 'Hide',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    submit: 'Sign in to account',
    submitting: 'Signing in...',
    roleTitle: 'Access follows your account role',
    roleDesc:
      'You will be directed to the HRD, SPV, or Employee portal based on the permissions granted by your company.',
    noAccount: "Don't have an account yet? Contact your company HRD.",
    privacy: 'Privacy',
    terms: 'Terms of use',
    helpCenter: 'Help center',
    brandCaption: 'GAPJOTEN HRIS • Your digital workspace',
    defaultError: 'Sign in failed, please check your email and password.',
    modals: {
      forgot: {
        title: 'Reset Password',
        paragraphs: [
          'For company account security, password resets are managed directly by the HRD team.',
          'Please contact your HRD administrator or email hrd@gapjoten.id with your full name and employee ID.',
        ],
      },
      privacy: {
        title: 'Privacy Policy',
        paragraphs: [
          'GAPJOTEN HRIS only collects employment, attendance, and leave request data for internal company operations.',
          'All account data and attendance records are kept confidential and accessible strictly based on role permissions.',
        ],
      },
      terms: {
        title: 'Terms of Use',
        paragraphs: [
          'GAPJOTEN HRIS workspace accounts are personal and may only be used by employees registered by HRD.',
          'Users must keep their passwords confidential and never share portal access with others.',
        ],
      },
      help: {
        title: 'Login Help Center',
        paragraphs: [
          'Make sure you enter the active company email registered by HRD (e.g., name@gapjoten.id).',
          'If you experience sign-in issues or your account is not yet active, please contact your HRD team.',
        ],
      },
    },
    closeModal: 'Close',
  },
};

const Login = () => {
  const savedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY) || '';
  const [email, setEmail] = useState(savedEmail);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(Boolean(savedEmail));
  const [language, setLanguage] = useState('id');
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const langDropdownRef = useRef(null);
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const t = COPY[language];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      if (rememberMe) {
        localStorage.setItem(REMEMBERED_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBERED_EMAIL_KEY);
      }
      navigate('/');
    } catch (err) {
      setError(err.message || t.defaultError);
    } finally {
      setLoading(false);
    }
  };

  const modalContent = activeModal ? t.modals[activeModal] : null;

  return (
    <div className="login-split">
      {/* Left Brand & Role Showcase Panel */}
      <aside className="login-showcase">
        <div className="login-brand">
          <div className="login-brand-badge">
            <img src={gapjotenLogo} alt="GAPJOTEN HRIS" className="login-brand-img" />
          </div>
          <div>
            <div className="login-brand-name">{t.brandName}</div>
            <div className="login-brand-sub">{t.brandSub}</div>
          </div>
        </div>

        <div className="login-hero">
          <div className="login-pill">{t.pill}</div>

          <h2 className="login-hero-title">
            {t.heroTitleLine1}
            <br />
            {t.heroTitleLine2}
          </h2>

          <p className="login-hero-desc">{t.heroDesc}</p>

          <section className="login-roles-card" aria-label={t.rolesCardTitle}>
            <div className="login-roles-header">
              <div className="login-roles-title">{t.rolesCardTitle}</div>
              <div className="login-roles-sub">{t.rolesCardSub}</div>
            </div>

            <div className="login-roles-list">
              {t.roles.map((role) => (
                <div key={role.key} className="login-role-row">
                  <span className={`login-role-badge ${role.key}`}>{role.badge}</span>
                  <div>
                    <div className="login-role-item-title">{role.title}</div>
                    <div className="login-role-item-desc">{role.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="login-showcase-bottom">
          <div>
            <div className="login-quote-bar" />
            <p className="login-quote-text">
              {t.quoteLine1}
              <br />
              {t.quoteLine2}
            </p>
          </div>
          <div className="login-copyright">{t.copyright}</div>
        </div>
      </aside>

      {/* Right Login Form Panel */}
      <div className="login-page">
        <header className="login-topbar">
          <div className="login-lang-wrapper" ref={langDropdownRef}>
            <button
              type="button"
              className="login-lang-trigger"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              aria-expanded={langMenuOpen}
              aria-haspopup="listbox"
            >
              <span>{t.langLabel}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path
                  d="M3 4.5L6 7.5L9 4.5"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {langMenuOpen && (
              <div className="login-lang-menu" role="listbox">
                <button
                  type="button"
                  className={`login-lang-option ${language === 'id' ? 'active' : ''}`}
                  onClick={() => {
                    setLanguage('id');
                    setLangMenuOpen(false);
                  }}
                >
                  <span>Bahasa Indonesia</span>
                  {language === 'id' && <span>✓</span>}
                </button>
                <button
                  type="button"
                  className={`login-lang-option ${language === 'en' ? 'active' : ''}`}
                  onClick={() => {
                    setLanguage('en');
                    setLangMenuOpen(false);
                  }}
                >
                  <span>English</span>
                  {language === 'en' && <span>✓</span>}
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="login-main">
          <div className="login-eyebrow">{t.eyebrow}</div>
          <h1 className="login-heading">{t.heading}</h1>
          <p className="login-subtitle">{t.subtitle}</p>

          {error && (
            <div className="alert error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="login-field">
              <label htmlFor="login-email" className="login-label">
                {t.emailLabel}
              </label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                autoComplete="email"
                required
                className="login-input"
              />
            </div>

            <div className="login-field">
              <label htmlFor="login-password" className="login-label">
                {t.passwordLabel}
              </label>
              <div className="login-password-wrapper">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  autoComplete="current-password"
                  required
                  className="login-password-input"
                />
                <button
                  type="button"
                  className="login-toggle-password"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                >
                  {showPassword ? t.hidePassword : t.showPassword}
                </button>
              </div>
            </div>

            <div className="login-options-row">
              <label className="login-remember">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="login-checkbox"
                />
                <span>{t.rememberMe}</span>
              </label>

              <button
                type="button"
                className="login-text-action"
                onClick={() => setActiveModal('forgot')}
              >
                {t.forgotPassword}
              </button>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              <span>{loading ? t.submitting : t.submit}</span>
              {!loading && (
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 8H12.5M12.5 8L8.5 4M12.5 8L8.5 12"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </form>

          <div className="login-role-box">
            <div className="login-role-title">{t.roleTitle}</div>
            <p className="login-role-desc">{t.roleDesc}</p>
          </div>

          <p className="login-register-note">{t.noAccount}</p>

          <footer className="login-footer">
            <div className="login-footer-links">
              <button
                type="button"
                className="login-footer-link"
                onClick={() => setActiveModal('privacy')}
              >
                {t.privacy}
              </button>
              <button
                type="button"
                className="login-footer-link"
                onClick={() => setActiveModal('terms')}
              >
                {t.terms}
              </button>
            </div>

            <button
              type="button"
              className="login-help-link"
              onClick={() => setActiveModal('help')}
            >
              <span>{t.helpCenter}</span>
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path
                  d="M4.25 9.75L9.75 4.25M9.75 4.25H5.25M9.75 4.25V8.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </footer>

          <div className="login-brand-caption">{t.brandCaption}</div>
        </main>
      </div>

      {modalContent && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          onClick={() => setActiveModal(null)}
        >
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 id="login-modal-title" style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0d2137' }}>
                {modalContent.title}
              </h2>
              <button
                type="button"
                className="modal-close"
                onClick={() => setActiveModal(null)}
                aria-label={t.closeModal}
              >
                ×
              </button>
            </div>
            <div className="login-modal-body">
              {modalContent.paragraphs.map((text, idx) => (
                <p key={idx}>{text}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
