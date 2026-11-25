export const attendanceStatusLabel = (status) => {
  const labels = {
    not_checked_in: 'Belum Absen',
    present: 'Hadir',
    late: 'Terlambat',
    sick: 'Izin Sakit',
    leave: 'Cuti',
    absent: 'Alpa',
  };
  return labels[status] || status;
};

export const leaveStatusLabel = (status) => {
  const labels = {
    pending: 'Menunggu',
    approved: 'Disetujui',
    rejected: 'Ditolak',
  };
  return labels[status] || status;
};

export const leaveTypeLabel = (type) => {
  const labels = {
    annual: 'Cuti Tahunan',
    sick: 'Izin Sakit',
    maternity: 'Cuti Melahirkan',
    unpaid: 'Cuti Tanpa Gaji',
  };
  return labels[type] || type;
};

export const formatDate = (value) => {
  if (!value) return '-';
  const dateObj = new Date(String(value).includes('T') ? value : `${value}T00:00:00`);
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(dateObj);
};

export const formatDateTime = (value) => {
  if (!value) return '-';
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(String(value).replace(' ', 'T')));
};
