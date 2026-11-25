import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const HelpCenter = () => {
  const { user } = useAuth();
  const isSpv = user?.role === 'spv';

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Preferensi</div>
          <h1 className="page-title">Pusat bantuan</h1>
          <p className="page-subtitle">Panduan cepat penggunaan GAPJOTEN HRIS sesuai peran akun Anda.</p>
        </div>
      </div>

      <div className="dashboard-grid">
        <section className="panel">
          <div className="workspace-item">
            <span className="workspace-index">01</span>
            <div>
              <strong>{isSpv ? 'Monitoring Tim' : 'Kendala Absensi Wajah'}</strong>
              <p>
                {isSpv
                  ? 'Gunakan menu Monitoring absensi dan Riwayat kehadiran untuk memantau kedisiplinan anggota divisi Anda.'
                  : 'Jika kamera perangkat mengalami kendala atau izin ditolak, gunakan tombol Prosedur Alternatif di halaman Absensi Wajah.'}
              </p>
              {!isSpv && <Link to="/absensi-wajah" className="link-button">Buka absensi wajah &rarr;</Link>}
            </div>
          </div>

          <div className="workspace-item">
            <span className="workspace-index">02</span>
            <div>
              <strong>Cuti &amp; Izin Sakit</strong>
              <p>
                {isSpv
                  ? 'SPV memantau pengajuan cuti & izin sakit tim secara read-only; persetujuan dilakukan oleh HRD.'
                  : 'Pengajuan izin sakit wajib melampirkan surat keterangan dokter (PDF/JPG/PNG, maksimal 2 MB).'}
              </p>
              <Link to={isSpv ? '/pengajuan-cuti-tim' : '/status-pengajuan'} className="link-button">
                Lihat cuti &amp; izin &rarr;
              </Link>
            </div>
          </div>

          <div className="workspace-item">
            <span className="workspace-index">03</span>
            <div>
              <strong>Perubahan Data Pribadi</strong>
              <p>Anda dapat memperbarui nama lengkap, jenis kelamin, nomor telepon, dan alamat melalui menu Profil saya.</p>
              <Link to="/profil" className="link-button">Buka profil saya &rarr;</Link>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Kontak Dukungan HRD</h2>
              <p className="panel-subtitle">Hubungi HRD untuk koreksi absensi atau perubahan data jabatan.</p>
            </div>
          </div>
          <div className="detail-grid">
            <div className="detail-item"><span>Email HRD</span><strong>hrd@gapjoten.id</strong></div>
            <div className="detail-item"><span>Jam Operasional</span><strong>08:00 - 17:00 WIB</strong></div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HelpCenter;
