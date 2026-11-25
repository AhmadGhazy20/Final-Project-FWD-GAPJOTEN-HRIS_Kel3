import React from 'react';

const Help = () => {
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Portal SPV</div>
          <h1 className="page-title">Pusat bantuan</h1>
          <p className="page-subtitle">Panduan singkat menggunakan portal supervisor GAPJOTEN.</p>
        </div>
      </div>

      <section className="panel">
        <div className="workspace-item">
          <span className="workspace-index">01</span>
          <div>
            <strong>Memantau kehadiran</strong>
            <p>Gunakan menu Rekap kehadiran tim untuk melihat detail absensi anggota.</p>
          </div>
        </div>
        <div className="workspace-item">
          <span className="workspace-index">02</span>
          <div>
            <strong>Meninjau cuti & izin</strong>
            <p>SPV hanya meninjau tahap pertama. Keputusan akhir dilakukan oleh HRD.</p>
          </div>
        </div>
        <div className="workspace-item">
          <span className="workspace-index">03</span>
          <div>
            <strong>Keamanan data</strong>
            <p>Data Anda terlindungi dan hanya dapat diakses oleh role yang berhak.</p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Help;
