import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import gapjotenLogo from '../assets/gapjoten-logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Login gagal, periksa email & password Anda.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div className="card" style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src={gapjotenLogo} alt="GAPJOTEN HRIS" className="login-logo" />
          <h2 style={{ marginBottom: '0.25rem' }}>GAPJOTEN HRIS</h2>
          <p style={{ color: '#64748b', fontSize: '0.85rem' }}>
            Smart Workforce Management System
          </p>
        </div>

        {error && (
          <div className="alert error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="budi@gapjoten.id"
              required
              className="notes-input"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: 500 }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="notes-input"
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '0.25rem', padding: '0.75rem' }}
          >
            {loading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>
        </form>

        <div style={{ marginTop: '1.25rem', padding: '0.75rem', background: '#f8fafc', borderRadius: '8px', fontSize: '0.8rem', color: '#475569' }}>
          <strong>Akun Demo Tersedia:</strong>
          <div>HRD (Admin Utama): <code>hrd@gapjoten.id</code> / <code>hrd123</code></div>
          <div>SPV (Engineering): <code>spv@gapjoten.id</code> / <code>spv123</code></div>
          <div>Karyawan (Engineering): <code>budi@gapjoten.id</code> / <code>karyawan123</code></div>
        </div>
      </div>
    </div>
  );
};

export default Login;
