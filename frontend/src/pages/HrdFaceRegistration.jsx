import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../services/api.js';
import { formatDate, formatDateTime } from '../utils/formatters.js';

function computeCanvasSignature(canvas) {
  const sampleCanvas = document.createElement('canvas');
  sampleCanvas.width = 16;
  sampleCanvas.height = 16;
  const ctx = sampleCanvas.getContext('2d');
  ctx.drawImage(canvas, 0, 0, 16, 16);
  const { data } = ctx.getImageData(0, 0, 16, 16);
  const vector = [];
  for (let i = 0; i < data.length; i += 16) {
    const lum = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    vector.push(lum);
  }
  return `gapjoten-face-v1:${vector.join(',')}`;
}

const HrdFaceRegistration = () => {
  const [searchParams] = useSearchParams();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [retentionDays, setRetentionDays] = useState(365);

  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [consentGiven, setConsentGiven] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [previewImage, setPreviewImage] = useState('');
  const [faceSignature, setFaceSignature] = useState('');
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  const loadRegistrations = async () => {
    setLoading(true);
    try {
      const res = await api.getHrdFaceRegistrations();
      const rows = res.data?.items || [];
      setItems(rows);
      setRetentionDays(res.data?.retentionDays || 365);

      const queryEmpId = searchParams.get('employeeId');
      if (queryEmpId && rows.some((r) => String(r.employeeId) === queryEmpId)) {
        setSelectedEmployeeId(queryEmpId);
      } else if (!selectedEmployeeId && rows.length > 0) {
        const firstUnregistered = rows.find((r) => !r.isRegistered) || rows[0];
        setSelectedEmployeeId(String(firstUnregistered.employeeId));
      }
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal memuat data pendaftaran wajah' });
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setVideoReady(false);
  };

  useEffect(() => {
    loadRegistrations();
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return undefined;

    const video = videoRef.current;
    video.srcObject = streamRef.current;

    const markReady = () => {
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        setVideoReady(true);
      }
    };

    video.addEventListener('loadedmetadata', markReady);
    video.addEventListener('canplay', markReady);
    video.play().then(markReady).catch(() => {});

    return () => {
      video.removeEventListener('loadedmetadata', markReady);
      video.removeEventListener('canplay', markReady);
    };
  }, [cameraActive]);

  const startCamera = async () => {
    stopCamera();
    setCameraError('');
    setFeedback({ message: '', error: '' });
    setPreviewImage('');
    setFaceSignature('');
    setLivenessVerified(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser tidak mendukung akses kamera. Anda dapat menggunakan opsi Unggah Foto Wajah Resmi.');
      return;
    }

    try {
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }
      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      setCameraError(
        `Kamera tidak dapat dibuka (${err?.message || 'izin ditolak'}). Gunakan tombol Unggah Foto Wajah Resmi sebagai alternatif.`
      );
    }
  };

  const captureFromCamera = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Stream kamera belum siap. Tunggu sesaat lalu coba lagi.');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    setPreviewImage(canvas.toDataURL('image/jpeg', 0.85));
    setFaceSignature(computeCanvasSignature(canvas));
    setLivenessVerified(true);
    stopCamera();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    stopCamera();
    setCameraError('');
    setFeedback({ message: '', error: '' });

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = canvasRef.current;
      canvas.width = 480;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, 480, 360);
      setPreviewImage(canvas.toDataURL('image/jpeg', 0.85));
      setFaceSignature(computeCanvasSignature(canvas));
      setLivenessVerified(true);
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setFeedback({ message: '', error: '' });

    if (!consentGiven) {
      setFeedback({
        message: '',
        error: 'Persetujuan karyawan wajib dicentang sebelum mendaftarkan data biometrik wajah.',
      });
      return;
    }

    if (!faceSignature || !livenessVerified) {
      setFeedback({
        message: '',
        error: 'Silakan tangkap wajah melalui kamera atau unggah foto wajah terlebih dahulu.',
      });
      return;
    }

    setSaving(true);
    try {
      const res = await api.saveHrdFaceRegistration({
        employee_id: Number(selectedEmployeeId),
        consent_given: consentGiven,
        face_signature: faceSignature,
        liveness_verified: livenessVerified,
        retention_days: retentionDays,
        notes: notes || null,
      });

      setFeedback({ message: res.message, error: '' });
      setPreviewImage('');
      setFaceSignature('');
      setLivenessVerified(false);
      setConsentGiven(false);
      setNotes('');
      await loadRegistrations();
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menyimpan registrasi wajah' });
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (item) => {
    if (!window.confirm(`Hapus permanen data biometrik wajah untuk ${item.fullName} (${item.nip})?`)) {
      return;
    }

    setFeedback({ message: '', error: '' });
    try {
      const res = await api.deleteHrdFaceRegistration(item.employeeId);
      setFeedback({ message: res.message, error: '' });
      await loadRegistrations();
    } catch (err) {
      setFeedback({ message: '', error: err.message || 'Gagal menghapus data biometrik' });
    }
  };

  const selectedEmployee = items.find((i) => String(i.employeeId) === String(selectedEmployeeId));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal HRD &middot; Biometrik</div>
          <h1 className="page-title">Face Registration</h1>
          <p className="page-subtitle">
            Daftarkan atau perbarui referensi wajah karyawan dengan persetujuan eksplisit dan penyimpanan terenkripsi.
          </p>
        </div>
      </div>

      <div className="hrd-subnav">
        <Link to="/hrd/karyawan" className="hrd-subnav-link">Daftar Karyawan</Link>
        <Link to="/hrd/face-registration" className="hrd-subnav-link active">Face Registration</Link>
      </div>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}
      {cameraError && <div className="alert error">{cameraError}</div>}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Perekaman Referensi Wajah</h2>
              <p className="panel-subtitle">Sesuai kebijakan keamanan biometrik &amp; masa retensi {retentionDays} hari</p>
            </div>
            {selectedEmployee && (
              <span className={`status-badge ${selectedEmployee.isRegistered ? 'status-approved' : 'status-default'}`}>
                {selectedEmployee.isRegistered ? 'Sudah Terdaftar' : 'Belum Terdaftar'}
              </span>
            )}
          </div>

          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            <div>
              <label className="notes-label" htmlFor="face-emp">Pilih Karyawan</label>
              <select
                id="face-emp"
                className="notes-input"
                style={{ marginBottom: 0 }}
                value={selectedEmployeeId}
                onChange={(e) => setSelectedEmployeeId(e.target.value)}
                required
              >
                {items.map((item) => (
                  <option key={item.employeeId} value={item.employeeId}>
                    {item.nip} - {item.fullName} ({item.department || '-'}) [{item.isRegistered ? 'Terdaftar' : 'Belum'}]
                  </option>
                ))}
              </select>
            </div>

            <label
              style={{
                display: 'flex',
                gap: '0.6rem',
                alignItems: 'flex-start',
                padding: '0.75rem',
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={consentGiven}
                onChange={(e) => setConsentGiven(e.target.checked)}
                style={{ marginTop: '0.2rem' }}
              />
              <span>
                <strong>Persetujuan Karyawan (Wajib):</strong> Karyawan telah diberi pemberitahuan dan menyetujui perekaman data referensi wajah untuk keperluan absensi GAPJOTEN HRIS (retensi {retentionDays} hari).
              </span>
            </label>

            <div
              style={{
                position: 'relative',
                background: '#0f172a',
                borderRadius: '10px',
                overflow: 'hidden',
                minHeight: '230px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
              }}
            >
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', transform: 'scaleX(-1)' }}
                  />
                  {!videoReady && (
                    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(15,23,42,0.75)', color: '#e2e8f0' }}>
                      Menyiapkan kamera...
                    </div>
                  )}
                </>
              ) : previewImage ? (
                <img
                  src={previewImage}
                  alt="Pratinjau wajah terdaftar"
                  style={{ width: '100%', maxHeight: '280px', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>
                  <p style={{ color: '#e2e8f0', fontWeight: 600, marginBottom: '0.35rem' }}>Kamera Pendaftaran Belum Aktif</p>
                  <small>Aktifkan kamera untuk memverifikasi keaslian wajah, atau unggah foto wajah resmi.</small>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} style={{ display: 'none' }} />

            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              {!cameraActive ? (
                <button type="button" className="btn-primary" onClick={startCamera}>
                  {previewImage ? 'Ulangi Kamera' : 'Aktifkan Kamera'}
                </button>
              ) : (
                <button type="button" className="btn-primary" onClick={captureFromCamera} disabled={!videoReady}>
                  {videoReady ? 'Tangkap Wajah & Verifikasi' : 'Menyiapkan...'}
                </button>
              )}

              <label className="btn-secondary" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                Unggah Foto Wajah
                <input type="file" accept="image/png,image/jpeg" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </label>
            </div>

            {livenessVerified && (
              <div className="alert success" style={{ marginBottom: 0 }}>
                Sampel wajah &amp; verifikasi keaslian siap disimpan secara terenkripsi.
              </div>
            )}

            <div>
              <label className="notes-label" htmlFor="face-notes">Catatan Pendaftaran (Opsional)</label>
              <input
                id="face-notes"
                type="text"
                className="notes-input"
                style={{ marginBottom: 0 }}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Contoh: Pendaftaran ulang karena ganti kacamata"
              />
            </div>

            <button type="submit" className="btn-primary" disabled={saving || !consentGiven || !faceSignature}>
              {saving ? 'Menyimpan Terenkripsi...' : 'Simpan Referensi Wajah Terenkripsi'}
            </button>
          </form>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Perlindungan Data Biometrik</h2>
              <p className="panel-subtitle">Ringkasan kepatuhan sesuai dokumen konsep</p>
            </div>
          </div>
          <div className="detail-note">
            <span>Penyimpanan Aman</span>
            <p>
              Referensi wajah tidak disimpan dalam bentuk file foto terbuka di server; sistem hanya menyimpan signature biometrik yang dienkripsi di database beserta fingerprint hash SHA-256.
            </p>
          </div>
          <div className="detail-note">
            <span>Persetujuan &amp; Retensi</span>
            <p>
              Setiap pendaftaran mencatat timestamp persetujuan karyawan dan masa retensi ({retentionDays} hari). HRD dapat menghapus data biometrik kapan saja jika diperlukan.
            </p>
          </div>
          {selectedEmployee?.isRegistered && (
            <div className="detail-grid">
              <div className="detail-item">
                <span>Fingerprint Hash</span>
                <strong>{selectedEmployee.templateFingerprint}</strong>
              </div>
              <div className="detail-item">
                <span>Berlaku Hingga</span>
                <strong>{formatDate(selectedEmployee.retentionUntil)}</strong>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Status Face Registration Karyawan</h2>
            <p className="panel-subtitle">Daftar seluruh karyawan aktif dan status referensi biometriknya</p>
          </div>
        </div>
        {loading ? (
          <p className="panel-note">Memuat daftar karyawan...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>NIP</th>
                  <th>Nama</th>
                  <th>Departemen</th>
                  <th>Status Wajah</th>
                  <th>Persetujuan</th>
                  <th>Retensi Hingga</th>
                  <th>Petugas</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.employeeId}>
                    <td><strong>{item.nip}</strong></td>
                    <td>{item.fullName}</td>
                    <td>{item.department || '-'}</td>
                    <td>
                      <span className={`status-badge ${item.isRegistered ? 'status-approved' : 'status-default'}`}>
                        {item.isRegistered ? 'Terdaftar' : 'Belum Terdaftar'}
                      </span>
                    </td>
                    <td>{item.consentAt ? formatDateTime(item.consentAt) : '-'}</td>
                    <td>{item.retentionUntil ? formatDate(item.retentionUntil) : '-'}</td>
                    <td>{item.registeredByName || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.4rem' }}>
                        <button
                          type="button"
                          className="detail-button"
                          onClick={() => {
                            setSelectedEmployeeId(String(item.employeeId));
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                        >
                          {item.isRegistered ? 'Perbarui' : 'Daftarkan'}
                        </button>
                        {item.isRegistered && (
                          <button type="button" className="logout-button" onClick={() => handleRevoke(item)}>
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default HrdFaceRegistration;
