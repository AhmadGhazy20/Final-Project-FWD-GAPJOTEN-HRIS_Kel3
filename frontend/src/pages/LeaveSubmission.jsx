import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api.js';

const LeaveSubmission = ({ mode = 'cuti' }) => {
  const isSick = mode === 'sakit';
  const navigate = useNavigate();

  const [leaveType, setLeaveType] = useState(isSick ? 'sick' : 'annual');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFeedback({ message: '', error: '' });

    try {
      const formData = new FormData();
      formData.append('leave_type', isSick ? 'sick' : leaveType);
      formData.append('start_date', startDate);
      formData.append('end_date', endDate);
      formData.append('reason', reason);
      if (file) {
        formData.append('medical_certificate', file);
      }

      const res = await api.submitKaryawanLeave(formData);
      setFeedback({ message: res.message, error: '' });
      setReason('');
      setFile(null);
      setTimeout(() => navigate('/status-pengajuan'), 1000);
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal mengirim pengajuan' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Administrasi Kehadiran</div>
          <h1 className="page-title">{isSick ? 'Pengajuan Izin Sakit' : 'Pengajuan Cuti'}</h1>
          <p className="page-subtitle">
            {isSick
              ? 'Ajukan izin sakit dengan melampirkan surat keterangan dokter (PDF/JPG/PNG, maks 2 MB).'
              : 'Ajukan cuti tahunan, melahirkan, atau tanpa gaji untuk diperiksa oleh HRD.'}
          </p>
        </div>
      </div>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}

      <section className="panel" style={{ maxWidth: '640px' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {!isSick && (
            <div>
              <label className="notes-label" htmlFor="leave-type">Jenis Cuti</label>
              <select
                id="leave-type"
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value)}
                className="notes-input"
              >
                <option value="annual">Cuti Tahunan</option>
                <option value="maternity">Cuti Melahirkan</option>
                <option value="unpaid">Cuti Tanpa Gaji</option>
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label className="notes-label" htmlFor="start-date">Tanggal Mulai</label>
              <input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="notes-input"
              />
            </div>
            <div>
              <label className="notes-label" htmlFor="end-date">Tanggal Selesai</label>
              <input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="notes-input"
              />
            </div>
          </div>

          <div>
            <label className="notes-label" htmlFor="leave-reason">Alasan / Keterangan</label>
            <textarea
              id="leave-reason"
              rows="3"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isSick ? 'Jelaskan kondisi kesehatan Anda...' : 'Jelaskan keperluan cuti Anda...'}
              required
              className="notes-input"
            />
          </div>

          {isSick && (
            <div>
              <label className="notes-label" htmlFor="medical-cert">Unggah Surat Dokter (Wajib)</label>
              <input
                id="medical-cert"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                required
                className="notes-input"
              />
              <small style={{ color: '#64748b' }}>Format diperbolehkan: PDF, JPG, PNG (maksimal 2 MB).</small>
            </div>
          )}

          <div className="approval-note">
            Pengajuan akan tersimpan dengan status <strong>Menunggu</strong> hingga diputuskan oleh HRD.
          </div>

          <div>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? 'Mengirim...' : isSick ? 'Kirim Izin Sakit' : 'Kirim Pengajuan Cuti'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default LeaveSubmission;
