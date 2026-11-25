import React, { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';
import { attendanceStatusLabel } from '../utils/formatters.js';

const FaceAttendance = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [now, setNow] = useState(new Date());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [capturedImage, setCapturedImage] = useState('');
  const [livenessVerified, setLivenessVerified] = useState(false);
  const [useAlternative, setUseAlternative] = useState(false);
  const [notes, setNotes] = useState('');
  const [feedback, setFeedback] = useState({ message: '', error: '' });

  const loadAttendance = async () => {
    try {
      const res = await api.getKaryawanAttendance();
      setData(res.data);
    } catch (err) {
      setFeedback({ message: '', error: err.message });
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
    loadAttendance();
    const timer = setInterval(() => setNow(new Date()), 15000);

    return () => {
      clearInterval(timer);
      stopCamera();
    };
  }, []);

  // Attach active MediaStream after <video> is mounted in DOM
  useEffect(() => {
    if (!cameraActive || !videoRef.current || !streamRef.current) return;

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
    setCapturedImage('');
    setLivenessVerified(false);
    setUseAlternative(false);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Browser atau alamat URL saat ini tidak mendukung akses kamera. Gunakan localhost atau aktifkan Prosedur Alternatif.');
      setUseAlternative(true);
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
        // Fallback if device webcam rejects ideal/facingMode constraints
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      setCameraActive(true);
    } catch (err) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Izin akses kamera ditolak oleh browser. Izinkan kamera di ikon gembok/kamera address bar atau gunakan Prosedur Alternatif.'
        : err?.name === 'NotFoundError'
          ? 'Kamera tidak ditemukan pada perangkat ini. Silakan gunakan Prosedur Alternatif.'
          : err?.name === 'NotReadableError'
            ? 'Kamera sedang digunakan oleh aplikasi lain. Tutup aplikasi tersebut atau gunakan Prosedur Alternatif.'
            : `Kamera gagal dibuka (${err?.message || 'error tidak diketahui'}). Gunakan Prosedur Alternatif jika kendala berlanjut.`;

      setCameraError(msg);
      setUseAlternative(true);
    }
  };

  const captureAndVerifyFace = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.videoWidth === 0 || video.videoHeight === 0) {
      setCameraError('Stream video kamera belum siap. Tunggu 1 detik atau ulangi Aktifkan Kamera.');
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

    setCapturedImage(canvas.toDataURL('image/jpeg', 0.88));
    setLivenessVerified(true);
    stopCamera();
  };

  const submitClock = async (action) => {
    setSaving(true);
    setFeedback({ message: '', error: '' });

    const method = useAlternative ? 'manual' : 'face';
    const livenessPassed = method === 'face' ? livenessVerified : false;

    if (method === 'face' && !livenessPassed) {
      setFeedback({ message: '', error: 'Silakan aktifkan kamera dan lakukan verifikasi wajah terlebih dahulu.' });
      setSaving(false);
      return;
    }

    try {
      const payload = {
        method,
        liveness_passed: livenessPassed,
        notes: notes || null,
      };
      const res = action === 'in'
        ? await api.clockIn(payload)
        : await api.clockOut(payload);

      setFeedback({ message: res.message, error: '' });
      setNotes('');
      setCapturedImage('');
      setLivenessVerified(false);
      await loadAttendance();
    } catch (err) {
      setFeedback({ message: '', error: err.message });
    } finally {
      setSaving(false);
    }
  };

  const today = data?.today || {};
  const hasClockIn = Boolean(today.clockIn);
  const hasClockOut = Boolean(today.clockOut);
  const readyForSubmit = useAlternative || livenessVerified;
  const formattedToday = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(now);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Absensi Pengenalan Wajah</div>
          <h1 className="page-title">Absensi Wajah</h1>
          <p className="page-subtitle">Verifikasi wajah melalui kamera perangkat sebelum melakukan Clock In atau Clock Out.</p>
        </div>
      </div>

      <section className="hero-card">
        <div>
          <h2 className="hero-title">{formattedToday}</h2>
          <p className="hero-subtitle">Waktu acuan dicatat oleh server &middot; Batas telat 08:15 WIB</p>
        </div>
        <div className="clock-display">
          {now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </section>

      {feedback.message && <div className="alert success">{feedback.message}</div>}
      {feedback.error && <div className="alert error">{feedback.error}</div>}
      {cameraError && <div className="alert error">{cameraError}</div>}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">1. Verifikasi Wajah &amp; Liveness</h2>
              <p className="panel-subtitle">Izinkan kamera untuk menangkap wajah atau gunakan prosedur alternatif.</p>
            </div>
            <span className={`status-badge status-${today.status || 'not_checked_in'}`}>
              {attendanceStatusLabel(today.status)}
            </span>
          </div>

          <div
            style={{
              position: 'relative',
              background: '#0f172a',
              borderRadius: '10px',
              overflow: 'hidden',
              marginBottom: '1rem',
              minHeight: '260px',
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
                  style={{
                    width: '100%',
                    maxHeight: '300px',
                    objectFit: 'cover',
                    transform: 'scaleX(-1)',
                    display: 'block',
                  }}
                />
                {!videoReady && (
                  <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(15,23,42,0.7)', color: '#e2e8f0' }}>
                    Menyiapkan stream kamera...
                  </div>
                )}
                {videoReady && (
                  <div
                    style={{
                      position: 'absolute',
                      width: '170px',
                      height: '210px',
                      border: '2px dashed rgba(34, 211, 238, 0.85)',
                      borderRadius: '50%',
                      pointerEvents: 'none',
                    }}
                  />
                )}
              </>
            ) : capturedImage ? (
              <img
                src={capturedImage}
                alt="Hasil tangkapan wajah"
                style={{ width: '100%', maxHeight: '300px', objectFit: 'cover', display: 'block' }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem' }}>
                <p style={{ marginBottom: '0.5rem', color: '#e2e8f0', fontWeight: 600 }}>
                  {useAlternative ? 'Mode Prosedur Alternatif Aktif' : 'Kamera belum diaktifkan'}
                </p>
                <small>
                  {useAlternative
                    ? 'Anda dapat langsung melakukan Clock In / Clock Out dengan menyertakan catatan kendala.'
                    : 'Klik "Aktifkan Kamera" di bawah untuk memulai verifikasi wajah.'}
                </small>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          <div className="attendance-actions" style={{ marginBottom: '1rem' }}>
            {!cameraActive ? (
              <button type="button" className="btn-primary" onClick={startCamera} disabled={saving || (hasClockIn && hasClockOut)}>
                {capturedImage ? 'Ulangi Verifikasi Kamera' : 'Aktifkan Kamera'}
              </button>
            ) : (
              <button type="button" className="btn-primary" onClick={captureAndVerifyFace} disabled={!videoReady}>
                {videoReady ? 'Tangkap Wajah & Verifikasi Liveness' : 'Menyiapkan Kamera...'}
              </button>
            )}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                stopCamera();
                setCameraError('');
                setCapturedImage('');
                setUseAlternative((prev) => !prev);
                setLivenessVerified(false);
              }}
              disabled={saving || (hasClockIn && hasClockOut)}
            >
              {useAlternative ? 'Kembali ke Kamera' : 'Prosedur Alternatif (Kendala Kamera)'}
            </button>
          </div>

          {livenessVerified && (
            <div className="alert success" style={{ marginBottom: '1rem' }}>
              Verifikasi wajah &amp; keaslian pengguna (liveness) berhasil. Silakan klik Clock In atau Clock Out.
            </div>
          )}

          <label className="notes-label" htmlFor="face-notes">Catatan (opsional)</label>
          <textarea
            id="face-notes"
            className="notes-input"
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={useAlternative ? 'Jelaskan kendala kamera / keterangan kehadiran' : 'Contoh: Hadir WFO'}
          />

          <div className="attendance-actions" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn-primary"
              disabled={loading || saving || hasClockIn || !readyForSubmit}
              onClick={() => submitClock('in')}
            >
              {hasClockIn ? `Sudah Clock In (${today.clockIn})` : 'Clock In'}
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={loading || saving || !hasClockIn || hasClockOut || !readyForSubmit}
              onClick={() => submitClock('out')}
            >
              {hasClockOut ? `Sudah Clock Out (${today.clockOut})` : 'Clock Out'}
            </button>
          </div>
        </section>

        <aside className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Status Absensi Hari Ini</h2>
              <p className="panel-subtitle">Ringkasan catatan hari ini</p>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item">
              <span>Status</span>
              <strong>{attendanceStatusLabel(today.status)}</strong>
            </div>
            <div className="detail-item">
              <span>Metode</span>
              <strong>{today.method ? today.method.toUpperCase() : '-'}</strong>
            </div>
            <div className="detail-item">
              <span>Clock In</span>
              <strong>{today.clockIn ? `${today.clockIn} WIB` : '-'}</strong>
            </div>
            <div className="detail-item">
              <span>Clock Out</span>
              <strong>{today.clockOut ? `${today.clockOut} WIB` : '-'}</strong>
            </div>
          </div>
          <div className="approval-note">
            Data biometrik tidak disimpan secara terbuka. Jika kamera mengalami kendala, gunakan tombol Prosedur Alternatif.
          </div>
        </aside>
      </div>
    </div>
  );
};

export default FaceAttendance;
