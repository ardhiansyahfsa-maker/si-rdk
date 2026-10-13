/* =========================================================================
   SI-RDK · data.js
   Master data, demo accounts, mock dataset and the simulated extraction
   library. Dates are generated relative to the first time the prototype is
   opened, so "Terlambat" and "mendekati deadline" stay meaningful in demos.
   ========================================================================= */

const SEED_VERSION = 19;

const ROLE_LABEL = { admin: 'Admin / MRDK', satker: 'Satker Pelaksana', viewer: 'Pimpinan' };

const MASTER_BIDANG = [
  { code: 'KSAR', name: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko' },
  { code: 'MS', name: 'Manajemen Strategis' },
  { code: 'PBKN', name: 'Pengawasan Perbankan' },
  { code: 'PMDK', name: 'Pengawasan Pasar Modal, Keuangan Derivatif, dan Bursa Karbon' },
  { code: 'PPDP', name: 'Pengawasan Perusahaan Asuransi dan Dana Pensiun' },
  { code: 'PVML', name: 'Pengawasan Perusahaan Pembiayaan, Modal Ventura, Keuangan Mikro, dan Lembaga Jasa Keuangan Lainnya' },
  { code: 'IAKD', name: 'Inovasi Teknologi Sektor Keuangan, Aset Keuangan Digital, Aset Kripto' },
  { code: 'PEPK', name: 'Pengawasan Perilaku Pelaku Usaha Jasa Keuangan dan Pelindungan Konsumen' },
  { code: 'BMKS', name: 'Pengawasan Bursa Mineral dan Komoditas Strategis' }
];

const MASTER_SATKER = [
  { key: 'DSKT', name: 'Departemen Surveillance dan Kebijakan Sektor Jasa Keuangan Terintegrasi', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC DSKT' },
  { key: 'DPZT', name: 'Departemen Koordinasi Pengawasan dan Perizinan Terintegrasi', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC DPZT' },
  { key: 'DPDS', name: 'Departemen Pengelolaan Data dan Statistik', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC DPDS' },
  { key: 'DINP', name: 'Departemen Internasional dan APU-PPT', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC DINP' },
  { key: 'DOSB', name: 'Departemen Organisasi, SDM, dan Budaya', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC DOSB' },
  { key: 'OJKI', name: 'OJK Institute', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC OJKI' },
  { key: 'DPAI', name: 'Departemen Audit Internal', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC DPAI' },
  { key: 'DRPK', name: 'Departemen Manajemen Risiko dan Pengendalian Kualitas', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC DRPK' },
  { key: 'DPIK', name: 'Departemen Penegakan Integritas dan Audit Khusus', bidang: 'Kebijakan Strategis, Audit Internal, dan Manajemen Risiko', pic: 'PIC DPIK' },
  { key: 'DMND', name: 'Departemen Manajemen dan Pengembangan OJK Daerah', bidang: 'Manajemen Strategis', pic: 'PIC DMND' },
  { key: 'DPSI', name: 'Departemen Pengelolaan Sistem Informasi', bidang: 'Manajemen Strategis', pic: 'PIC DPSI' },
  { key: 'DPEA', name: 'Departemen Pengembangan Aplikasi', bidang: 'Manajemen Strategis', pic: 'PIC DPEA' },
  { key: 'UKTF', name: 'Unit Khusus Transformasi', bidang: 'Manajemen Strategis', pic: 'PIC UKTF' },
  { key: 'DPSU', name: 'Departemen Perencanaan Strategis dan Keuangan', bidang: 'Manajemen Strategis', pic: 'PIC DPSU' },
  { key: 'DSHK', name: 'Departemen Sekretariat Dewan Komisioner dan Hubungan Kelembagaan', bidang: 'Manajemen Strategis', pic: 'PIC DSHK' },
  { key: 'DLOG', name: 'Departemen Logistik', bidang: 'Manajemen Strategis', pic: 'PIC DLOG' },
  { key: 'DHUK', name: 'Departemen Hukum', bidang: 'Manajemen Strategis', pic: 'PIC DHUK' },
  { key: 'DPJK', name: 'Departemen Penyidikan Sektor Jasa Keuangan', bidang: 'Manajemen Strategis', pic: 'PIC DPJK' },
  { key: 'DPNP', name: 'Departemen Pengaturan dan Pengembangan Perbankan', bidang: 'Pengawasan Perbankan', pic: 'PIC DPNP' },
  { key: 'DPKP', name: 'Departemen Pengendalian Kualitas dan Pengembangan Pengawasan Perbankan', bidang: 'Pengawasan Perbankan', pic: 'Lina Marlina' },
  { key: 'DIMB', name: 'Departemen Perizinan dan Manajemen Krisis Perbankan', bidang: 'Pengawasan Perbankan', pic: 'PIC DIMB' },
  { key: 'DPMS', name: 'Departemen Pengaturan dan Pengembangan UMKM dan Keuangan Syariah', bidang: 'Pengawasan Perbankan', pic: 'PIC DPMS' },
  { key: 'DPBP', name: 'Departemen Pengawasan Bank Pemerintah', bidang: 'Pengawasan Perbankan', pic: 'PIC DPBP' },
  { key: 'DPBS', name: 'Departemen Pengawasan Bank Syariah', bidang: 'Pengawasan Perbankan', pic: 'PIC DPBS' },
  { key: 'DRPD', name: 'Departemen Pemeriksaan Khusus dan Pengawasan Perbankan Daerah', bidang: 'Pengawasan Perbankan', pic: 'PIC DRPD' },
  { key: 'DPKO', name: 'Departemen Pengawasan Konglomerasi Keuangan', bidang: 'Pengawasan Perbankan', pic: 'PIC DPKO' },
  { key: 'DPW1', name: 'Departemen Pengawasan Bank Swasta 1', bidang: 'Pengawasan Perbankan', pic: 'Sari Indrawati' },
  { key: 'DPW2', name: 'Departemen Pengawasan Bank Swasta 2', bidang: 'Pengawasan Perbankan', pic: 'PIC DPW2' },
  { key: 'DPPM', name: 'Departemen Pengaturan dan Pengembangan Pasar Modal, Keuangan Derivatif dan Bursa Karbon', bidang: 'Pengawasan Pasar Modal, Keuangan Derivatif, dan Bursa Karbon', pic: 'Arief Rahman' },
  { key: 'DPZP', name: 'Departemen Perizinan Kelembagaan dan Profesi Pelaku', bidang: 'Pengawasan Pasar Modal, Keuangan Derivatif, dan Bursa Karbon', pic: 'PIC DPZP' },
  { key: 'DPVR', name: 'Departemen Pengawasan Pengelolaan Investasi dan Pasar Modal Regional', bidang: 'Pengawasan Pasar Modal, Keuangan Derivatif, dan Bursa Karbon', pic: 'PIC DPVR' },
  { key: 'DPLE', name: 'Departemen Pengawasan Lembaga Efek', bidang: 'Pengawasan Pasar Modal, Keuangan Derivatif, dan Bursa Karbon', pic: 'PIC DPLE' },
  { key: 'DNEK', name: 'Departemen Penilaian Emiten, Perusahaan Publik, dan Perizinan Keuangan Derivatif dan Bursa Karbon', bidang: 'Pengawasan Pasar Modal, Keuangan Derivatif, dan Bursa Karbon', pic: 'PIC DNEK' },
  { key: 'DPEP', name: 'Departemen Pengawasan Emiten dan Perusahaan Publik', bidang: 'Pengawasan Pasar Modal, Keuangan Derivatif, dan Bursa Karbon', pic: 'PIC DPEP' },
  { key: 'DPTP', name: 'Departemen Pengawasan Keuangan Derivatif, Bursa Karbon, Transaksi Efek dan Pemeriksaan Khusus', bidang: 'Pengawasan Pasar Modal, Keuangan Derivatif, dan Bursa Karbon', pic: 'PIC DPTP' },
  { key: 'DPPP', name: 'Departemen Pengaturan dan Pengembangan Perasuransian, Penjaminan dan Dana Pensiun', bidang: 'Pengawasan Perusahaan Asuransi dan Dana Pensiun', pic: 'PIC DPPP' },
  { key: 'DIPD', name: 'Departemen Perizinan, Pemeriksaan Khusus dan Pengendalian Kualitas Pengawasan Perasuransian, Penjaminan dan Dana Pensiun', bidang: 'Pengawasan Perusahaan Asuransi dan Dana Pensiun', pic: 'PIC DIPD' },
  { key: 'DAKR', name: 'Departemen Aktuaria', bidang: 'Pengawasan Perusahaan Asuransi dan Dana Pensiun', pic: 'PIC DAKR' },
  { key: 'DAJP', name: 'Departemen Pengawasan Asuransi dan Jasa Penunjang', bidang: 'Pengawasan Perusahaan Asuransi dan Dana Pensiun', pic: 'Maya Kusuma' },
  { key: 'DPDK', name: 'Departemen Pengawasan Penjaminan, Dana Pensiun dan Pengawasan Khusus', bidang: 'Pengawasan Perusahaan Asuransi dan Dana Pensiun', pic: 'PIC DPDK' },
  { key: 'DPPL', name: 'Departemen Pengaturan dan Pengembangan Lembaga Pembiayaan, Perusahaan Modal Ventura, Lembaga Keuangan Mikro dan Lembaga Jasa Keuangan Lainnya', bidang: 'Pengawasan Perusahaan Pembiayaan, Modal Ventura, Keuangan Mikro, dan Lembaga Jasa Keuangan Lainnya', pic: 'PIC DPPL' },
  { key: 'DZPL', name: 'Departemen Perizinan, Pemeriksaan Khusus dan Pengendalian Kualitas Pengawasan Lembaga Pembiayaan, Perusahaan Modal Ventura, Lembaga Keuangan Mikro dan Lembaga Jasa Keuangan Lainnya', bidang: 'Pengawasan Perusahaan Pembiayaan, Modal Ventura, Keuangan Mikro, dan Lembaga Jasa Keuangan Lainnya', pic: 'PIC DZPL' },
  { key: 'DPVL', name: 'Departemen Pengawasan Lembaga Pembiayaan, Perusahaan Modal Ventura dan Lembaga Keuangan Khusus', bidang: 'Pengawasan Perusahaan Pembiayaan, Modal Ventura, Keuangan Mikro, dan Lembaga Jasa Keuangan Lainnya', pic: 'PIC DPVL' },
  { key: 'DPLJ', name: 'Departemen Pengawasan Lembaga Keuangan Mikro dan Lembaga Jasa Keuangan Lainnya', bidang: 'Pengawasan Perusahaan Pembiayaan, Modal Ventura, Keuangan Mikro, dan Lembaga Jasa Keuangan Lainnya', pic: 'PIC DPLJ' },
  { key: 'DPIA', name: 'Departemen Pengaturan dan Perizinan Inovasi Teknologi Sektor Keuangan, Aset Keuangan Digital dan Aset Kripto', bidang: 'Inovasi Teknologi Sektor Keuangan, Aset Keuangan Digital, Aset Kripto', pic: 'PIC DPIA' },
  { key: 'DPIR', name: 'Departemen Pengawasan Inovasi Teknologi Sektor Keuangan, Aset Keuangan Digital dan Aset Kripto', bidang: 'Inovasi Teknologi Sektor Keuangan, Aset Keuangan Digital, Aset Kripto', pic: 'Nadia Putri' },
  { key: 'DPLK', name: 'Departemen Pelindungan Konsumen', bidang: 'Pengawasan Perilaku Pelaku Usaha Jasa Keuangan dan Pelindungan Konsumen', pic: 'PIC DPLK' },
  { key: 'DPUK', name: 'Departemen Pengawasan Perilaku Pelaku Usaha Jasa Keuangan', bidang: 'Pengawasan Perilaku Pelaku Usaha Jasa Keuangan dan Pelindungan Konsumen', pic: 'Budi Santoso' },
  { key: 'DLIK', name: 'Departemen Literasi, Inklusi Keuangan, dan Komunikasi', bidang: 'Pengawasan Perilaku Pelaku Usaha Jasa Keuangan dan Pelindungan Konsumen', pic: 'Dimas Prasetyo' },
  { key: 'DPBK', name: 'Departemen Pengawasan Lembaga dan Transaksi Bursa Mineral dan Komoditas Strategis', bidang: 'Pengawasan Bursa Mineral dan Komoditas Strategis', pic: 'PIC DPBK' },
  { key: 'DPPK', name: 'Departemen Pengaturan dan Perizinan Bursa Mineral dan Komoditas Strategis', bidang: 'Pengawasan Bursa Mineral dan Komoditas Strategis', pic: 'PIC DPPK' }
];

const MASTER_TOPICS = [
  'Penguatan Pengawasan dan Perlindungan Konsumen',
  'Evaluasi Kinerja dan Rekomendasi Komisi XI',
  'Pemberantasan Pinjaman Online Ilegal',
  'Penguatan Tata Kelola Asuransi',
  'Pendalaman Pasar Modal',
  'Literasi dan Inklusi Keuangan',
  'Pengawasan Aset Kripto dan ITSK',
  'Stabilitas Sektor Jasa Keuangan',
  'Tata Kelola Pengawasan',
  'Transformasi Digital Perbankan'
];

const DOC_SOURCES = ['Rapat Dewan Komisioner', 'Komisi XI DPR RI', 'Sekretariat Dewan Komisioner', 'BPK RI', 'Lainnya'];
const DOC_TYPES = ['Risalah RDK', 'Laporan Singkat RDP', 'Laporan Singkat Raker', 'Nota Dinas Arahan', 'Laporan Hasil Pemeriksaan', 'Dokumen Rujukan Lain'];

const DEMO_USERS = [
  { username: 'admin', password: 'admin123', name: 'Ardhiansyah K', role: 'admin', satker: null, title: 'Manajer Senior MRDK', active: true },
  { username: 'satker', password: 'satker123', name: 'Budi Santoso', role: 'satker', satker: 'Departemen Pengawasan Perilaku Pelaku Usaha Jasa Keuangan', title: 'PIC Departemen Pengawasan Perilaku Pelaku Usaha Jasa Keuangan', active: true },
  { username: 'viewer', password: 'viewer123', name: 'Hendra Gunawan', role: 'viewer', satker: null, title: 'Kepala Eksekutif', active: true },
  { username: 'satker.dpw1', password: 'satker123', name: 'Sari Indrawati', role: 'satker', satker: 'Departemen Pengawasan Bank Swasta 1', title: 'PIC Departemen Pengawasan Bank Swasta 1', active: true },
  { username: 'satker.dlik', password: 'satker123', name: 'Dimas Prasetyo', role: 'satker', satker: 'Departemen Literasi, Inklusi Keuangan, dan Komunikasi', title: 'PIC Departemen Literasi, Inklusi Keuangan, dan Komunikasi', active: true },
  { username: 'mrdk.2', password: 'admin123', name: 'Yoga Pratama', role: 'admin', satker: null, title: 'Staf MRDK', active: false }
];

/* --------------------------------------------------------------------------
   Simulated OCR + LLM output. In production, api.structureWithLLM() would
   call the extraction service; here it picks a template by document key.
   -------------------------------------------------------------------------- */
const EXTRACTION_LIBRARY = {
  default: {
    rdkDate: '2026-09-15',
    topic: 'Penguatan Pengawasan dan Perlindungan Konsumen',
    items: [
      { arahan: 'Memperkuat mekanisme pengawasan terhadap aktivitas jasa keuangan digital dan meningkatkan perlindungan konsumen.', satker: 'Departemen Pengawasan Perilaku Pelaku Usaha Jasa Keuangan', tindakLanjut: 'Pengembangan mekanisme monitoring dan evaluasi.', priority: 'Atensi Tinggi', days: 90 },
      { arahan: 'Melakukan evaluasi atas efektivitas penanganan pengaduan konsumen pada PUJK sektor perbankan.', satker: 'Departemen Pelindungan Konsumen', tindakLanjut: 'Penyusunan kerangka evaluasi dan pengumpulan data pengaduan.', priority: 'Pemantauan Reguler', days: 120 },
      { arahan: 'Menyusun kajian kebutuhan pengaturan atas layanan Buy Now Pay Later (BNPL) dan paylater perbankan.', satker: '', bidang: 'Pengawasan Perusahaan Pembiayaan, Modal Ventura, Keuangan Mikro, dan Lembaga Jasa Keuangan Lainnya', tindakLanjut: 'Menunggu penetapan satker penanggung jawab.', priority: 'Pemantauan Reguler', days: 150 }
    ]
  },
  asuransi: {
    topic: 'Penguatan Tata Kelola Asuransi',
    items: [
      { arahan: 'Mempercepat penyelesaian klaim pemegang polis pada perusahaan asuransi bermasalah dan memastikan transparansi informasi kepada konsumen.', satker: 'Departemen Pengawasan Asuransi dan Jasa Penunjang', tindakLanjut: 'Penyusunan rencana penyelesaian klaim dan publikasi status penanganan.', priority: 'Atensi Tinggi', days: 60 },
      { arahan: 'Memperketat pengawasan produk asuransi yang dikaitkan dengan investasi (PAYDI), termasuk pemasaran melalui bancassurance.', satker: 'Departemen Pengawasan Asuransi dan Jasa Penunjang', tindakLanjut: 'Pemeriksaan tematik pemasaran PAYDI pada bank mitra.', priority: 'Atensi Tinggi', days: 90 },
      { arahan: 'Meningkatkan edukasi kepada masyarakat mengenai hak dan kewajiban pemegang polis.', satker: 'Departemen Literasi, Inklusi Keuangan, dan Komunikasi', tindakLanjut: 'Penyusunan materi edukasi dan kampanye digital.', priority: 'Pemantauan Reguler', days: 120 }
    ]
  },
  lpbbti: {
    topic: 'Pengawasan Pinjaman Daring dan Pembiayaan',
    items: [
      { arahan: 'Memperketat pengawasan penyelenggara LPBBTI terkait tingkat wanprestasi (TWP90) dan pemenuhan ekuitas minimum, termasuk penegakan sanksi atas penyelenggara yang tidak memenuhi ketentuan.', satker: 'Departemen Pengawasan Perilaku Pelaku Usaha Jasa Keuangan', tindakLanjut: 'Pemeriksaan tematik penyelenggara dengan TWP90 di atas ambang batas.', priority: 'Atensi Tinggi', days: 90 },
      { arahan: 'Mengevaluasi praktik pembiayaan Buy Now Pay Later oleh perusahaan pembiayaan dan dampaknya terhadap kualitas pembiayaan rumah tangga.', satker: 'Departemen Pengawasan Lembaga Pembiayaan, Perusahaan Modal Ventura dan Lembaga Keuangan Khusus', tindakLanjut: 'Analisis portofolio BNPL dan penyusunan rekomendasi pengaturan.', priority: 'Pemantauan Reguler', days: 120 },
      { arahan: 'Memperkuat penanganan pengaduan konsumen pinjaman daring, khususnya terkait praktik penagihan yang tidak beretika dan penyalahgunaan data pribadi.', satker: 'Departemen Pengawasan Perilaku Pelaku Usaha Jasa Keuangan', tindakLanjut: 'Penyusunan mekanisme eskalasi pengaduan penagihan.', priority: 'Atensi Tinggi', days: 60 },
      { arahan: 'Menyampaikan laporan perkembangan tindak lanjut kepada Komisi XI DPR RI pada rapat kerja berikutnya.', satker: '', bidang: 'Pengawasan Perusahaan Pembiayaan, Modal Ventura, Keuangan Mikro, dan Lembaga Jasa Keuangan Lainnya', tindakLanjut: 'Penyusunan bahan laporan perkembangan.', priority: 'Pemantauan Reguler', days: 150 }
    ]
  },
  bank: {
    topic: 'Transformasi Digital Perbankan',
    items: [
      { arahan: 'Memperkuat ketahanan siber dan manajemen risiko teknologi informasi pada bank digital.', satker: 'Departemen Pengendalian Kualitas dan Pengembangan Pengawasan Perbankan', tindakLanjut: 'Asesmen maturitas keamanan siber pada bank digital.', priority: 'Atensi Tinggi', days: 75 },
      { arahan: 'Menyusun pengaturan layanan perbankan berbasis open API serta pelindungan data nasabah.', satker: 'Departemen Pengaturan dan Perizinan Inovasi Teknologi Sektor Keuangan, Aset Keuangan Digital dan Aset Kripto', tindakLanjut: 'Penyusunan naskah akademik pengaturan open API.', priority: 'Pemantauan Reguler', days: 150 },
      { arahan: 'Melakukan asesmen kesiapan BPR dalam implementasi digitalisasi layanan.', satker: '', bidang: 'Pengawasan Perbankan', tindakLanjut: 'Menunggu penetapan satker penanggung jawab.', priority: 'Pemantauan Reguler', days: 180 }
    ]
  }
};

/* --------------------------------------------------------------------------
   Seed builder
   -------------------------------------------------------------------------- */
function buildSeed() {
  const base = todayISO();
  const D = n => addDays(base, n);
  const nowMs = Date.now();
  // timestamp n days ago at hh:mm, never in the future
  const T = (n, hh = 9, mm = 0) => {
    const d = new Date(D(n) + 'T00:00:00');
    d.setHours(hh, mm, 0, 0);
    return new Date(Math.min(d.getTime(), nowMs - 60000)).toISOString();
  };
  const satkerByKey = Object.fromEntries(MASTER_SATKER.map(s => [s.key, s]));

  const docSpecs = [
    { n: 'Risalah RDK No. 31-RDK-2026 Pengawasan dan Pelindungan Konsumen.pdf', type: 'Risalah RDK', src: 'Rapat Dewan Komisioner', rdk: -22, up: -20, topic: MASTER_TOPICS[0], no: 'No. 31/RDK/2026' },
    { n: 'Laporan Singkat RDP Komisi XI - Evaluasi Kinerja Semester I 2026.pdf', type: 'Laporan Singkat RDP', src: 'Komisi XI DPR RI', rdk: -70, up: -67, topic: MASTER_TOPICS[1], no: 'LS/RDP/XI/2026/07' },
    { n: 'Risalah RDK No. 18-RDK-2026 Pinjaman Online Ilegal.pdf', type: 'Risalah RDK', src: 'Rapat Dewan Komisioner', rdk: -110, up: -108, topic: MASTER_TOPICS[2], no: 'No. 18/RDK/2026' },
    { n: 'ND Arahan DK - Penguatan Tata Kelola Asuransi.docx', type: 'Nota Dinas Arahan', src: 'Sekretariat Dewan Komisioner', rdk: -55, up: -54, topic: MASTER_TOPICS[3], no: 'ND-112/SDK/2026' },
    { n: 'Risalah RDK No. 14-RDK-2026 Pendalaman Pasar Modal.pdf', type: 'Risalah RDK', src: 'Rapat Dewan Komisioner', rdk: -130, up: -128, topic: MASTER_TOPICS[4], no: 'No. 14/RDK/2026' },
    { n: 'Laporan Singkat Raker Komisi XI - Program Kerja dan Anggaran OJK 2027.pdf', type: 'Laporan Singkat Raker', src: 'Komisi XI DPR RI', rdk: -40, up: -38, topic: MASTER_TOPICS[5], no: 'LS/RAKER/XI/2026/09' },
    { n: 'Risalah RDK No. 29-RDK-2026 Pengawasan Aset Kripto.pdf', type: 'Risalah RDK', src: 'Rapat Dewan Komisioner', rdk: -30, up: -29, topic: MASTER_TOPICS[6], no: 'No. 29/RDK/2026' },
    { n: 'Risalah RDK No. 09-RDK-2026 Stabilitas Sektor Jasa Keuangan.pdf', type: 'Risalah RDK', src: 'Rapat Dewan Komisioner', rdk: -160, up: -158, topic: MASTER_TOPICS[7], no: 'No. 09/RDK/2026' },
    { n: 'LHP BPK RI - Kinerja Pengawasan Sektor Jasa Keuangan TA 2025.pdf', type: 'Laporan Hasil Pemeriksaan', src: 'BPK RI', rdk: -90, up: -86, topic: MASTER_TOPICS[8], no: 'LHP 21/LHP/XV/2026' },
    { n: 'ND Arahan DK - Edukasi Keuangan Daerah.docx', type: 'Nota Dinas Arahan', src: 'Sekretariat Dewan Komisioner', rdk: -15, up: -14, topic: MASTER_TOPICS[5], no: 'ND-147/SDK/2026' },
    { n: 'Laporan Singkat RDP Komisi XI - Pelindungan Konsumen Asuransi.pdf', type: 'Laporan Singkat RDP', src: 'Komisi XI DPR RI', rdk: -6, up: -2, topic: MASTER_TOPICS[3], no: 'LS/RDP/XI/2026/10', pending: true, tpl: 'asuransi' },
    { n: 'Risalah RDK No. 33-RDK-2026 Digitalisasi Perbankan.pdf', type: 'Risalah RDK', src: 'Rapat Dewan Komisioner', rdk: -3, up: -1, topic: MASTER_TOPICS[9], no: 'No. 33/RDK/2026', pending: true, tpl: 'bank' }
  ];

  const documents = docSpecs.map((s, i) => ({
    document_id: `DOC-2026-${String(i + 1).padStart(3, '0')}`,
    document_name: s.n,
    document_type: s.type,
    source: s.src,
    document_number: s.no,
    document_date: D(s.rdk),
    upload_date: T(s.up, 8 + (i % 5), 10 + i * 3),
    uploaded_by: 'Ardhiansyah K',
    file_size: 380000 + i * 91234,
    pages: 4 + (i % 5),
    document_status: s.pending ? 'Diunggah' : 'Selesai',
    ocr_status: s.pending ? 'Belum Diproses' : 'Selesai',
    extraction_status: s.pending ? 'Belum Diekstraksi' : 'Tersimpan di Register',
    template: s.tpl || null,
    topic: s.topic,
    ocr_accuracy: s.pending ? null : 96.4 + (i % 4) * 0.7,
    extraction: null,
    saved_plan_ids: []
  }));

  // [docIdx, satkerKey|null, arahan, progress, verification, targetOffset, priority, lastUpdateOffset, extra]
  const P = [
    [1, 'DPUK', 'Memperkuat mekanisme pengawasan terhadap aktivitas jasa keuangan digital dan meningkatkan perlindungan konsumen.', 40, 'Menunggu Verifikasi', 40, 'Tinggi', -2, { prev: 20, tl: 'Pengembangan mekanisme monitoring dan evaluasi; penyusunan draf indikator pengawasan perilaku PUJK digital.', out: 'Draf kerangka monitoring market conduct digital (v0.4)', kd: 'Integrasi data pengaduan dari APPK belum real-time.' }],
    [1, 'DPLK', 'Menyusun pedoman penanganan pengaduan konsumen lintas sektor yang terintegrasi dengan Aplikasi Portal Pelindungan Konsumen (APPK).', 100, 'Disetujui', 10, 'Tinggi', -8, { prev: 70, done: -8, tl: 'Pedoman telah ditetapkan melalui Keputusan Anggota Dewan Komisioner dan disosialisasikan ke PUJK.', out: 'KADK Pedoman Penanganan Pengaduan Terintegrasi', vn: 'Sesuai. Dokumen penetapan telah dilampirkan.' }],
    [1, 'DPW1', 'Melakukan thematic review atas praktik penagihan kredit oleh bank umum, termasuk penggunaan pihak ketiga.', 55, 'Belum Diverifikasi', 35, 'Sedang', -4, { tl: 'Thematic review pada 12 bank umum; 7 bank telah selesai diperiksa.', out: 'Kertas kerja thematic review', kd: 'Keterbatasan jumlah pemeriksa di Kantor Regional.' }],
    [2, 'DAJP', 'Menyampaikan laporan tindak lanjut rekomendasi Komisi XI atas penanganan perusahaan asuransi jiwa bermasalah.', 55, 'Menunggu Verifikasi', 12, 'Tinggi', -1, { prev: 35, tl: 'Penyusunan laporan progres penanganan 4 perusahaan asuransi jiwa dalam pengawasan khusus.', out: 'Draf laporan tindak lanjut kepada Komisi XI', kd: 'Menunggu data dari likuidator untuk 1 perusahaan.' }],
    [2, 'DRPD', 'Meningkatkan efektivitas pengawasan terhadap BPR/BPRS dengan rasio permodalan di bawah ketentuan.', 70, 'Disetujui', 20, 'Tinggi', -10, { prev: 45, tl: 'Penetapan 18 BPR dalam pengawasan intensif dan penyusunan rencana tindak penyehatan.', out: 'Daftar BPR pengawasan intensif dan rencana penyehatan', vn: 'Progres disetujui. Lanjutkan pemantauan rencana penyehatan.' }],
    [2, 'DLIK', 'Menyusun peta jalan peningkatan indeks literasi keuangan di wilayah 3T (terdepan, terluar, tertinggal).', 20, 'Perlu Perbaikan', 60, 'Sedang', -7, { prev: 0, tl: 'Pengumpulan data indeks literasi per provinsi.', vn: 'Mohon lampirkan baseline indeks literasi per provinsi dan rincian target tahunan.' }],
    [3, 'DPUK', 'Mengintensifkan koordinasi Satgas PASTI untuk pemblokiran entitas pinjaman online ilegal.', 100, 'Disetujui', -25, 'Tinggi', -42, { prev: 80, done: -42, tl: 'Pemblokiran 1.240 entitas pinjol ilegal bersama Kementerian Komdigi dan Satgas PASTI.', out: 'Laporan Satgas PASTI Triwulan III', vn: 'Disetujui.' }],
    [7, 'DPIR', 'Melakukan pengawasan terhadap bursa aset kripto yang baru berdiri, meliputi kesiapan infrastruktur perdagangan, tata kelola, manajemen risiko, dan pelindungan konsumen.', 60, 'Belum Diverifikasi', -6, 'Tinggi', -21, { tl: 'Pemeriksaan kesiapan sistem perdagangan, kliring, dan kustodian bursa kripto; penyusunan kerangka pengawasan berbasis risiko.', kd: 'Data transaksi harian dari bursa belum tersambung ke sistem pengawasan OJK.' }],
    [3, 'DLIK', 'Menyelenggarakan kampanye edukasi waspada pinjaman online ilegal di 34 provinsi.', 85, 'Menunggu Verifikasi', 18, 'Sedang', -1, { prev: 70, tl: 'Kampanye telah terlaksana di 29 provinsi.', out: 'Rekap peserta dan materi kampanye' }],
    [4, 'DIPD', 'Melakukan penilaian kembali (fit and proper) pihak utama pada perusahaan asuransi dalam pengawasan khusus.', 45, 'Belum Diverifikasi', 15, 'Tinggi', -9, { tl: 'Penilaian kembali 9 dari 20 pihak utama selesai.' }],
    [4, 'DPPP', 'Menyusun rancangan POJK pemisahan unit usaha syariah perusahaan asuransi.', 0, 'Belum Diverifikasi', 75, 'Sedang', null, {}],
    [4, 'DPDK', 'Menyiapkan skema program penjaminan polis bersama Lembaga Penjamin Simpanan.', 15, 'Belum Diverifikasi', 90, 'Sedang', -12, { manual: 'Menunggu Arahan', tl: 'Kajian awal skema penjaminan polis.', kd: 'Menunggu arahan Dewan Komisioner terkait opsi pendanaan program.' }],
    [5, 'DPPM', 'Mempercepat implementasi bursa karbon dan perluasan instrumen yang diperdagangkan.', 75, 'Disetujui', -12, 'Tinggi', -25, { prev: 50, tl: 'Penambahan 2 instrumen unit karbon dan pengembangan perdagangan internasional.', vn: 'Disetujui sebagai progres; target perlu disesuaikan.' }],
    [5, 'DPTP', 'Memperkuat pengawasan transaksi saham tidak wajar dan praktik manipulasi harga.', 100, 'Menunggu Verifikasi', 8, 'Tinggi', -1, { prev: 80, done: -1, tl: 'Implementasi full call auction dan penyempurnaan unusual market activity monitoring.', out: 'Laporan implementasi sistem surveillance' }],
    [5, 'DPVR', 'Meningkatkan jumlah investor ritel melalui program Sekolah Pasar Modal di daerah.', 100, 'Disetujui', -40, 'Rendah', -52, { prev: 75, done: -52, tl: 'Program terlaksana di 120 kota; pertumbuhan SID 18% yoy.', out: 'Laporan pelaksanaan Sekolah Pasar Modal', vn: 'Disetujui.' }],
    [6, 'DLIK', 'Mengalokasikan program inklusi keuangan bagi UMKM dan pelaku usaha ultra mikro.', 30, 'Belum Diverifikasi', 45, 'Sedang', -14, { tl: 'Penyusunan skema pembiayaan klaster bersama TPAKD.' }],
    [6, 'DLIK', 'Mengoptimalkan peran Tim Percepatan Akses Keuangan Daerah (TPAKD) dalam perluasan akses keuangan.', 0, 'Belum Diverifikasi', 50, 'Rendah', null, {}],
    [7, 'DPIA', 'Menyusun ketentuan pelindungan konsumen aset kripto pasca peralihan pengawasan dari Bappebti.', 50, 'Menunggu Verifikasi', 30, 'Tinggi', -3, { prev: 30, tl: 'Rancangan POJK telah melalui uji publik tahap I.', out: 'RPOJK Pelindungan Konsumen Aset Kripto' }],
    [7, 'DPIR', 'Melakukan pemeriksaan kepatuhan pedagang aset kripto terhadap ketentuan APU-PPT.', 0, 'Belum Diverifikasi', -3, 'Tinggi', null, {}],
    [8, 'DPKO', 'Melakukan stress test risiko kredit dan risiko pasar terhadap bank sistemik.', 100, 'Disetujui', -60, 'Tinggi', -72, { prev: 60, done: -72, tl: 'Stress test terhadap 15 D-SIB selesai dan hasilnya dilaporkan ke RDK.', out: 'Laporan hasil stress test D-SIB', vn: 'Disetujui.' }],
    [8, 'DPW1', 'Memantau eksposur perbankan terhadap sektor properti dan komoditas.', 90, 'Ditolak', 25, 'Sedang', -5, { prev: 75, tl: 'Pemantauan bulanan eksposur 40 bank terbesar.', vn: 'Data eksposur yang dilampirkan masih posisi Juni. Mohon gunakan posisi terkini.' }],
    [9, 'DPKP', 'Menindaklanjuti rekomendasi BPK terkait dokumentasi proses pengawasan berbasis risiko.', 65, 'Perlu Perbaikan', -15, 'Tinggi', -11, { prev: 40, tl: 'Penyempurnaan SOP dokumentasi RBS; 3 dari 5 rekomendasi telah ditindaklanjuti.', vn: 'Lampirkan bukti penetapan SOP dan surat penyampaian ke BPK.' }],
    [9, 'DPUK', 'Memperbaiki mekanisme pengenaan sanksi administratif dan pemantauan pembayaran denda.', 25, 'Belum Diverifikasi', 40, 'Sedang', -16, { tl: 'Pemetaan proses bisnis pengenaan sanksi administratif.' }],
    [10, null, 'Menyusun modul edukasi keuangan berbasis kearifan lokal untuk Kantor OJK di daerah.', 0, 'Belum Diverifikasi', 80, 'Sedang', null, { bidang: 'Pengawasan Perilaku Pelaku Usaha Jasa Keuangan dan Pelindungan Konsumen' }],
    [10, 'DPLK', 'Mengevaluasi efektivitas penanganan pengaduan konsumen pada PUJK di daerah.', 30, 'Perlu Perbaikan', 28, 'Sedang', -6, { prev: 10, tl: 'Evaluasi pada 6 Kantor OJK daerah.', vn: 'Mohon lengkapi data pengaduan per kantor dan lampirkan rekap tindak lanjut.' }],
    [9, 'DRPK', 'Memperkuat penerapan manajemen risiko terintegrasi dan pengendalian kualitas pada seluruh satuan kerja OJK.', 45, 'Disetujui', 50, 'Tinggi', -9, { prev: 25, tl: 'Pemutakhiran profil risiko 52 satuan kerja dan uji petik pengendalian kualitas.', out: 'Laporan profil risiko satker semester I', vn: 'Disetujui.' }],
    [9, 'DPAI', 'Melakukan audit internal atas efektivitas tindak lanjut rekomendasi BPK RI pada satuan kerja pengawasan.', 30, 'Menunggu Verifikasi', 35, 'Tinggi', -2, { prev: 10, tl: 'Audit lapangan pada 4 satuan kerja pengawasan perbankan dan pasar modal.' }],
    [8, 'DINP', 'Menyiapkan bahan penilaian bersama (mutual evaluation) FATF terkait penerapan APU-PPT di sektor jasa keuangan.', 60, 'Disetujui', 70, 'Tinggi', -12, { prev: 40, tl: 'Penyusunan technical compliance questionnaire dan koordinasi dengan PPATK.', vn: 'Disetujui.' }],
    [2, 'DPSU', 'Menyelaraskan rencana strategis dan rencana kerja anggaran OJK 2027 dengan rekomendasi Komisi XI DPR RI.', 70, 'Disetujui', 30, 'Tinggi', -8, { prev: 50, tl: 'Penyesuaian RKA 2027 dan indikator kinerja utama OJK.', out: 'Draf RKA OJK 2027', vn: 'Disetujui.' }],
    [1, 'UKTF', 'Mempercepat program transformasi digital proses bisnis pengawasan OJK berbasis supervisory technology.', 35, 'Belum Diverifikasi', 80, 'Sedang', -15, { tl: 'Penyusunan cetak biru SupTech dan pilot dashboard pengawasan terintegrasi.' }],
    [10, 'DMND', 'Memperkuat peran Kantor OJK di daerah dalam pengawasan dan edukasi keuangan sesuai karakteristik wilayah.', 20, 'Belum Diverifikasi', 60, 'Sedang', -10, { tl: 'Pemetaan kebutuhan kapasitas 35 Kantor OJK.' }],
    [3, 'DPLJ', 'Memperketat pengawasan penyelenggara LPBBTI (pinjaman daring) yang belum memenuhi ketentuan ekuitas minimum.', 55, 'Disetujui', 20, 'Tinggi', -7, { prev: 35, tl: 'Penetapan rencana tindak 12 penyelenggara LPBBTI.', out: 'Daftar LPBBTI dalam pengawasan intensif', vn: 'Disetujui.' }],
    [3, 'DPPL', 'Menyusun pengaturan layanan Buy Now Pay Later (BNPL) oleh perusahaan pembiayaan.', 40, 'Menunggu Verifikasi', 65, 'Sedang', -3, { prev: 20, tl: 'Rancangan POJK BNPL telah dibahas dengan asosiasi.' }],
    [2, 'DPVL', 'Meningkatkan pengawasan perusahaan pembiayaan dengan rasio pembiayaan bermasalah (NPF) di atas ketentuan.', 25, 'Belum Diverifikasi', -4, 'Tinggi', -20, { tl: 'Identifikasi 9 perusahaan pembiayaan dengan NPF di atas 5%.', kd: 'Data restrukturisasi belum lengkap.' }],
    [8, 'DPPK', 'Menyusun kerangka pengaturan penyelenggaraan bursa mineral dan komoditas strategis.', 35, 'Disetujui', 85, 'Tinggi', -6, { prev: 15, tl: 'Kajian benchmarking bursa komoditas di 4 yurisdiksi.', vn: 'Disetujui.' }],
    [8, 'DPBK', 'Memetakan calon penyelenggara dan pelaku transaksi bursa mineral dan komoditas strategis.', 20, 'Belum Diverifikasi', 55, 'Sedang', -11, { tl: 'Inventarisasi calon penyelenggara dan anggota bursa.' }],
    [8, 'DPPK', 'Berkoordinasi dengan kementerian terkait dalam penetapan komoditas strategis yang diperdagangkan di bursa.', 0, 'Belum Diverifikasi', 95, 'Sedang', null, {}]
  ];

  const auditLogs = [];
  let logSeq = 0;
  const log = (ts, user, role, action, entity, oldValue, newValue, comment = '') => {
    auditLogs.push({ id: 'LOG-' + String(++logSeq).padStart(5, '0'), ts, user, role, action, entity, oldValue, newValue, comment });
  };

  documents.forEach((d, i) => {
    const s = docSpecs[i];
    log(d.upload_date, 'Ardhiansyah K', 'admin', 'Upload Dokumen', d.document_id, '-', d.document_name);
    if (!s.pending) {
      log(T(s.up, 13, 5 + i), 'Sistem OCR/LLM', 'system', 'Ekstraksi Dokumen', d.document_id, 'Belum Diproses', 'Selesai', `Akurasi OCR ${d.ocr_accuracy.toFixed(1)}%`);
    }
  });

  const actionPlans = P.map((p, i) => {
    const [docIdx, sk, arahan, progress, ver, tOff, prio, uOff, x] = p;
    const doc = documents[docIdx - 1];
    const spec = docSpecs[docIdx - 1];
    const sat = sk ? satkerByKey[sk] : null;
    const id = `RA-2026-${String(i + 1).padStart(3, '0')}`;
    const createdAt = T(spec.up + 1, 10, 15 + i);
    const ap = {
      id, documentId: doc.document_id, documentName: doc.document_name,
      rdkDate: D(spec.rdk), topic: spec.topic, arahan,
      bidang: sat ? sat.bidang : (x.bidang || ''), satker: sat ? sat.name : '', pic: sat ? sat.pic : '',
      priority: legacyAtensi(prio), targetDate: D(tOff), progress, manualStatus: x.manual || null,
      tindakLanjut: x.tl || '', output: x.out || '', kendala: x.kd || '', catatan: '',
      completedDate: x.done != null ? D(x.done) : '',
      verificationStatus: ver, verificationNote: x.vn || '',
      evidence: [], submissions: [], draft: null,
      updateDate: uOff != null ? D(uOff) : '', latestUpdate: x.tl || '',
      createdAt, updatedAt: uOff != null ? T(uOff, 15, 20) : createdAt,
      overdueNotified: false, strategic: false, grc: null
    };
    doc.saved_plan_ids.push(id);

    log(createdAt, 'Ardhiansyah K', 'admin', 'Registrasi Rencana Aksi', id, '-', 'Register', `Hasil ekstraksi ${doc.document_id}`);
    if (sat) log(T(spec.up + 2, 9, 5 + i), 'Ardhiansyah K', 'admin', 'Assignment', id, 'Satker: -', `Satker: ${sat.name}`);

    if (uOff != null && progress > 0) {
      const prev = x.prev != null ? x.prev : Math.max(0, progress - 25);
      if (prev > 0) log(T(uOff - 9, 10, 40), sat.pic, 'satker', 'Update Progress', id, '0%', prev + '%');
      log(T(uOff, 14, 10 + (i % 40)), sat.pic, 'satker', 'Update Progress', id, prev + '%', progress + '%', x.tl ? x.tl.slice(0, 90) : '');
      if (x.manual) log(T(uOff, 14, 12), sat.pic, 'satker', 'Update Status', id, 'Dalam Proses', x.manual, x.kd || '');
      if (x.out || progress >= 40) {
        ap.evidence.push({ name: `Bukti_Tindak_Lanjut_${id}.pdf`, size: 220000 + i * 17000, uploadedAt: T(uOff, 14, 30), by: sat.pic });
        log(T(uOff, 14, 31), sat.pic, 'satker', 'Upload Bukti', id, '-', `Bukti_Tindak_Lanjut_${id}.pdf`);
      }
      if (ver !== 'Belum Diverifikasi') {
        const subAt = T(uOff, 15, 20);
        log(subAt, sat.pic, 'satker', 'Submit Verifikasi', id, 'Draft', 'Menunggu Verifikasi');
        const sub = {
          at: subAt, by: sat.pic, progressFrom: prev, progressTo: progress,
          status: progress >= 100 ? 'Selesai' : (x.manual || 'Dalam Proses'),
          tindakLanjut: x.tl || '', output: x.out || '', kendala: x.kd || '', catatan: '', targetDate: D(tOff),
          evidence: ap.evidence.map(e => e.name), result: null, resultNote: '', resultBy: '', resultAt: ''
        };
        if (ver !== 'Menunggu Verifikasi') {
          const vAt = T(Math.min(uOff + 1, -1), 10, 5 + (i % 50));
          sub.result = ver; sub.resultNote = x.vn || ''; sub.resultBy = 'Ardhiansyah K'; sub.resultAt = vAt;
          log(vAt, 'Ardhiansyah K', 'admin', 'Verifikasi', id, 'Menunggu Verifikasi', ver, x.vn || '');
        }
        ap.submissions.push(sub);
      }
    }
    return ap;
  });

  // Plans already overdue in the seed: record when the system flagged them
  actionPlans.forEach((ap, i) => {
    if (ap.progress < 100 && ap.targetDate < base) {
      ap.overdueNotified = true;
      const tOff = P[i][5];
      log(T(tOff + 1, 0, 5), 'Sistem', 'system', 'Status Otomatis', ap.id, ap.progress > 0 ? 'Dalam Proses' : 'Menunggu Respon', 'Label Terlambat', `Target ${fmtDate(ap.targetDate)} terlewati dengan progress ${ap.progress}%`);
      ap._late = T(tOff + 1, 0, 5);
    }
  });

  // Penugasan strategis OJK-wide → SI-GRC: Tandai (MRDK) → Kirim (MRDK) → Kelompokkan & input profil risiko (Admin SI-GRC) → Konfirmasi RQO
  // [planIdx, catatan MRDK, { f: hari tandai, s: hari kirim, m: [kategori, risiko, level, hari], c: hari konfirmasi, then: kondisi saat selesai }]
  const MR = 'Ardhiansyah K', GA = 'Rudi Hartono';
  const RQO = { 'Departemen Pengendalian Kualitas dan Pengembangan Pengawasan Perbankan': 'Lina Marlina' };
  const rqoOf = sat => RQO[sat] || `RQO ${(MASTER_SATKER.find(x => x.name === sat) || {}).key || ''}`.trim();
  const G = [
    [0, 'Kerangka pengawasan market conduct digital berlaku lintas sektor PUJK.', { f: -7, s: -6, m: ['Risiko Strategis', 'Ketidakefektifan pengawasan market conduct atas aktivitas keuangan digital', 'Rendah', -5], c: -4 }],
    [2, 'Praktik penagihan pihak ketiga memengaruhi kepercayaan publik terhadap industri perbankan dan OJK.', { f: -4, s: -3, m: ['Risiko Reputasi', 'Praktik penagihan tidak patut oleh pihak ketiga yang bekerja sama dengan bank', 'Sedang', -2] }],
    [3, 'Rekomendasi Komisi XI DPR RI.', { f: -14, s: -13, m: ['Risiko Reputasi', 'Penurunan kepercayaan publik atas penanganan asuransi jiwa bermasalah', 'Sedang', -12], c: -11, then: { progress: 35, verificationStatus: 'Belum Diverifikasi' } }],
    [4, '', { f: -14, s: -13, m: ['Risiko Strategis', 'Tidak tercapainya penyehatan BPR/BPRS sesuai rencana', 'Rendah', -12], c: -11 }],
    [7, 'Bursa kripto baru beroperasi; target telah terlewati.', { f: -3, s: -1 }],
    [11, 'Memerlukan keputusan kebijakan lintas lembaga (OJK–LPS).', { f: -3, s: -2 }],
    [12, 'Agenda nasional dengan eksposur kebijakan OJK-wide.', { f: -9, s: -8, m: ['Risiko Strategis', 'Keterlambatan pengembangan dan pendalaman bursa karbon', 'Tinggi', -7], c: -6 }],
    [17, 'Ketentuan baru pasca peralihan pengawasan aset kripto dari Bappebti.', { f: -2 }],
    [19, '', { f: -77, s: -76, m: ['Risiko Strategis', 'Kerentanan bank sistemik terhadap tekanan risiko kredit dan pasar tidak teridentifikasi', 'Rendah', -75], c: -74 }],
    [21, 'Rekomendasi BPK RI atas pengawasan berbasis risiko.', { f: -6, s: -5, m: ['Risiko Kepatuhan', 'Tindak lanjut rekomendasi BPK tidak tuntas tepat waktu', 'Tinggi', -3] }],
    [22, '', { f: -1 }],
    [23, 'Akan digunakan seluruh Kantor OJK di daerah.', { f: -2 }]
  ];
  const grcLog = []; let grcSeq = 0, syncSeq = 0;
  G.slice().sort((a, b) => a[2].f - b[2].f).forEach(([idx, note, x]) => {
    const ap = actionPlans[idx];
    const snap = x.then ? { ...ap, ...x.then } : ap;
    const g = ap.grc = { note, stage: 'flagged', flaggedAt: T(x.f, 9, 30 + (idx % 20)), flaggedBy: MR };
    ap.strategic = true;
    log(g.flaggedAt, MR, 'admin', 'Tandai Strategis', ap.id, 'Non-strategis', 'Strategis OJK-wide', note);
    if (!x.s || !ap.satker) return;
    g.riskId = `GRC-RI-2026-${String(++grcSeq).padStart(4, '0')}`;
    Object.assign(g, { stage: 'sent', sentAt: T(x.s, 15, 5 + (idx % 40)), sentBy: MR });
    log(g.sentAt, MR, 'admin', 'Kirim ke SI-GRC', ap.id, 'Siap Dikirim', 'Menunggu Pengelompokan Risiko', `${g.riskId} · input baru`);
    grcLog.push({ id: '', at: g.sentAt, by: MR, endpoint: 'POST /api/grc/v1/risk-inputs', refs: [ap.id], result: [`${ap.id}: 202 Accepted`], payload: [grcPayload(snap)] });
    if (!x.m) return;
    const [category, riskName, level, md] = x.m;
    g.mapping = { category, riskName, level, note: '', by: GA, at: T(md, 10, 15 + (idx % 40)) }; g.stage = 'mapped';
    log(g.mapping.at, 'SI-GRC · ' + GA, 'system', 'Pengelompokan Risiko (SI-GRC)', ap.id, 'Menunggu Pengelompokan Risiko', 'Menunggu Konfirmasi RQO', `${g.riskId} · ${category} · ${riskName} · level ${level}`);
    if (x.c == null) return;
    const by = rqoOf(ap.satker); const at = T(x.c, 13, 20 + (idx % 30));
    g.confirm = { by, at, note: '' }; g.stage = 'confirmed';
    g.recorded = { category, level, riskName, at }; g.doneFp = grcFingerprint(snap);
    log(at, 'SI-GRC · ' + by, 'system', 'Konfirmasi RQO (SI-GRC)', ap.id, 'Menunggu Konfirmasi RQO', 'Selesai', `${g.riskId} · tercatat ${category} level ${level}`);
  });
  grcLog.sort((a, b) => a.at.localeCompare(b.at)).forEach(l => { l.id = 'SYNC-' + String(++syncSeq).padStart(4, '0'); });
  grcLog.reverse();

  // Kategori atensi (atribut faktual horizon × cakupan) & trajectory TW I–IV
  const after = (iso, days, h = 10) => { const d = new Date(iso); d.setDate(d.getDate() + days); d.setHours(h, 10 + days % 40, 0, 0); return new Date(Math.min(d.getTime(), nowMs - 120000)).toISOString(); };
  const STATE = { 23: 'none', 20: 'none', 10: 'proposed', 16: 'proposed', 22: 'proposed', 15: 'adjust', 24: 'confirmed', 18: 'confirmed', 5: 'returned', 2: 'submitted', 8: 'submitted' };
  const OUT = [['Kajian awal dan rencana kerja'], ['Kajian awal dan rencana kerja', 'Penyelesaian dan pelaporan hasil'], ['Kajian dan pemetaan permasalahan', 'Penyusunan konsep / rancangan', 'Penyelesaian dan pelaporan hasil'], ['Kajian dan pemetaan permasalahan', 'Penyusunan konsep / rancangan', 'Pelaksanaan dan koordinasi pemangku kepentingan', 'Penyelesaian dan pelaporan hasil']];
  const mkTraj = ap => {
    const year = +ap.rdkDate.slice(0, 4); const ends = ['03-31', '06-30', '09-30', '12-31'].map(e => `${year}-${e}`);
    const active = [0, 1, 2, 3].filter(i => ends[i] >= ap.rdkDate); const n = active.length;
    return { year, items: [0, 1, 2, 3].map(i => { const k = active.indexOf(i); return k < 0 ? { target: 0, output: '', locked: true } : { target: i === 3 ? 100 : Math.round((k + 1) / n * 100 / 5) * 5, output: OUT[n - 1][k], locked: false }; }) };
  };
  actionPlans.forEach((ap, i) => {
    const st = STATE[i] || 'approved'; if (st === 'none') return;
    // Atribut faktual: horizon dari jarak target, cakupan dari penanda strategis / sifat penugasan
    const dTo = diffDays(ap.targetDate, ap.rdkDate);  // jangka waktu yang diberikan sejak arahan
    const horizon = dTo <= 90 ? 'Segera' : ap.targetDate <= `${ap.rdkDate.slice(0, 4)}-12-31` ? 'Tahun Berjalan' : 'Berkelanjutan';
    const scope = ap.strategic ? 'OJK-wide' : (P[i][6] === 'Tinggi' || i % 3 === 0) ? 'Lintas Satker' : 'Satu Satker';
    const q = quadrantOf(horizon, scope); ap.priority = QUADRANTS[q].prio;
    const at = after(ap.createdAt, 1, 9);
    ap.cls = { horizon, scope, note: '', by: MR, at, status: 'proposed', satker: null, proposal: null };
    log(at, MR, 'admin', 'Penetapan Atensi', ap.id, '-', `${QUADRANTS[q].label} (${horizon} · ${scope})`, '');
    if (st === 'proposed' || !ap.satker) return;
    if (st === 'adjust') {
      ap.cls.status = 'adjust'; ap.cls.satker = ap.satker;
      ap.cls.proposal = { horizon: 'Berkelanjutan', scope, note: 'Program bersifat berkelanjutan dan dijadwalkan bersama TPAKD lintas tahun.', by: ap.pic, at: after(ap.createdAt, 2, 14) };
      log(ap.cls.proposal.at, ap.pic, 'satker', 'Usulan Penyesuaian Atensi', ap.id, `${horizon} · ${scope}`, `Berkelanjutan · ${scope}`, ap.cls.proposal.note);
      return;
    }
    Object.assign(ap.cls, { status: 'confirmed', satker: ap.satker, confirmedBy: ap.pic, confirmedAt: after(ap.createdAt, 2, 11) });
    log(ap.cls.confirmedAt, ap.pic, 'satker', 'Konfirmasi Atensi', ap.id, 'Menunggu Konfirmasi Satker', 'Dikonfirmasi', QUADRANTS[q].label);
    if (st === 'confirmed') return;
    const t = mkTraj(ap); const sub = after(ap.createdAt, 4, 15);
    ap.traj = { ...t, satker: ap.satker, status: 'submitted', by: ap.pic, at: sub, submittedAt: sub };
    log(sub, ap.pic, 'satker', 'Ajukan Trajectory', ap.id, 'Menyusun Trajectory', 'Menunggu Persetujuan Trajectory', t.items.map((it, k) => `TW ${['I', 'II', 'III', 'IV'][k]} ${it.target}%`).join(' · '));
    if (st === 'submitted') return;
    const rv = after(ap.createdAt, 5, 10);
    if (st === 'returned') {
      Object.assign(ap.traj, { status: 'returned', reviewBy: MR, reviewAt: rv, reviewNote: 'Target TW III terlalu rendah dibanding target selesai; mohon rinci keluaran per provinsi.' });
      log(rv, MR, 'admin', 'Persetujuan Trajectory', ap.id, 'Menunggu Persetujuan Trajectory', 'Dikembalikan', ap.traj.reviewNote);
      return;
    }
    Object.assign(ap.traj, { status: 'approved', reviewBy: MR, reviewAt: rv, reviewNote: '' });
    log(rv, MR, 'admin', 'Persetujuan Trajectory', ap.id, 'Menunggu Persetujuan Trajectory', 'Disetujui', '');
  });

  // Extraction snapshots for already-processed documents (what the LLM produced at the time)
  documents.forEach(d => {
    if (d.ocr_status !== 'Selesai') return;
    d.extraction = {
      runAt: d.upload_date, model: 'SI-RDK Extractor v2 (simulasi)',
      items: actionPlans.filter(a => a.documentId === d.document_id).map(a => ({
        include: true, rdkDate: a.rdkDate, topic: a.topic, arahan: a.arahan, bidang: a.bidang, satker: a.satker,
        assignmentStatus: a.satker ? 'Sudah Ditugaskan' : 'Belum Ditugaskan', respon: 'Belum ada respon', completedDate: '',
        tindakLanjut: 'Penyusunan rencana tindak lanjut oleh satker penanggung jawab.', priority: a.priority, targetDate: a.targetDate,
        conf: confidences(d.document_id + a.id)
      }))
    };
  });

  /* ---- SIPENA: laporan singkat DPR + disposisi ADK (ditarik otomatis) ----
     Disposisi dibentuk per bidang dari satker penanggung jawab; RA-2026-005
     sengaja dibuat menyimpang (disposisi ke DPKP, ditugaskan ke DRPD). */
  const bCode = name => (MASTER_BIDANG.find(b => b.name === name) || {}).code || '';
  const DISP_ISI = 'Mohon ditindaklanjuti sesuai kewenangan dan dilaporkan perkembangannya melalui SI-RDK.';
  const DISP_OVERRIDE = { 'RA-2026-005': 'DPKP' };
  let dispSeq = 840, agendaSeq = 8100;
  documents.forEach((d, i) => {
    if (d.source !== 'Komisi XI DPR RI') return;
    const spec = docSpecs[i];
    d.uploaded_by = 'SIPENA (otomatis)';
    const plans = actionPlans.filter(a => a.documentId === d.document_id);
    const targets = spec.pending
      ? ['DAJP', 'DPPP', 'DPLK'].map(k => satkerByKey[k])
      : plans.map(a => a.satker ? (DISP_OVERRIDE[a.id] ? satkerByKey[DISP_OVERRIDE[a.id]] : MASTER_SATKER.find(s => s.name === a.satker)) : null).filter(Boolean);
    const byB = {};
    targets.forEach(s => { (byB[s.bidang] = byB[s.bidang] || []); if (!byB[s.bidang].includes(s.name)) byB[s.bidang].push(s.name); });
    const dispDate = D(spec.rdk + 2);
    const agenda = `SIPENA-2026-0${(agendaSeq += 37)}`;
    d.sipena = {
      agenda, receivedAt: T(spec.up, 7, 40), pulledAt: d.upload_date,
      disp: Object.entries(byB).map(([b, to]) => ({ no: `DISP-${++dispSeq}/${bCode(b)}/2026`, date: dispDate, from: 'ADK Bidang ' + bCode(b), to, isi: DISP_ISI }))
    };
    log(d.upload_date, 'Sistem SIPENA', 'system', 'Tarik SIPENA', d.document_id, '-', `${agenda} · ${d.sipena.disp.length} disposisi`, d.sipena.disp.map(x => `${x.from} → ${x.to.map(n => MASTER_SATKER.find(s => s.name === n).key).join(', ')}`).join('; '));
    plans.forEach(a => {
      const x = d.sipena.disp.find(y => y.to.includes(a.satker));
      a.disp = { agenda, no: x?.no || '', from: x?.from || '', date: x?.date || '' };
      if (a.satker && !x) {
        const tg = d.sipena.disp.flatMap(y => y.to);
        a.dispDeviation = { note: 'Objek arahan (BPR/BPRS dengan permodalan di bawah ketentuan) berada dalam pengawasan DRPD; dialihkan dari DPKP setelah koordinasi dengan Kepala Departemen terkait.', by: 'Ardhiansyah K', at: a.createdAt, targets: tg };
        log(a.createdAt, 'Ardhiansyah K', 'admin', 'Penugasan di Luar Disposisi', a.id, 'Tujuan disposisi: ' + tg.map(n => MASTER_SATKER.find(s => s.name === n).key).join(', '), a.satker, a.dispDeviation.note);
      }
    });
  });

  auditLogs.sort((a, b) => a.ts.localeCompare(b.ts));

  const notifications = [];
  let nSeq = 0;
  const note = (to, text, kind, link, at) => notifications.push({ id: 'N' + (++nSeq), to, text, kind, link, at, readBy: [] });
  actionPlans.filter(a => a.verificationStatus === 'Menunggu Verifikasi').forEach(a =>
    note(['admin'], `Rencana aksi ${a.id} menunggu verifikasi.`, 'warn', { type: 'verify', id: a.id }, a.updatedAt));
  actionPlans.filter(a => a.verificationStatus === 'Perlu Perbaikan' || a.verificationStatus === 'Ditolak').forEach(a =>
    note(['satker:' + a.satker], `${a.id} ${a.verificationStatus === 'Ditolak' ? 'ditolak' : 'dikembalikan untuk perbaikan'} oleh Admin MRDK.`, 'late', { type: 'plan', id: a.id }, a.submissions.at(-1)?.resultAt || a.updatedAt));
  actionPlans.filter(a => a._late).forEach(a => { note(['admin', 'viewer', 'satker:' + a.satker], `${a.id} telah melewati target penyelesaian (${fmtDate(a.targetDate)}).`, 'late', { type: 'plan', id: a.id }, a._late); delete a._late; });
  note(['admin'], 'Dokumen baru "Laporan Singkat RDP Komisi XI - Pelindungan Konsumen Asuransi.pdf" siap diproses.', 'info', { type: 'doc', id: 'DOC-2026-011' }, documents[10].upload_date);
  note(['admin', 'viewer'], 'DPTP melakukan update progress RA-2026-014 menjadi 100%.', 'ok', { type: 'plan', id: 'RA-2026-014' }, actionPlans[13].updatedAt);
  note(['satker:Departemen Pelindungan Konsumen'], 'RA-2026-002 telah disetujui Admin MRDK.', 'ok', { type: 'plan', id: 'RA-2026-002' }, actionPlans[1].submissions[0].resultAt);
  note(['admin'], '4 penugasan strategis siap/perlu dikirim ke SI-GRC.', 'warn', { type: 'grc' }, T(0, 7, 30));
  note(['admin'], 'DLIK mengajukan koreksi atribut atensi RA-2026-016.', 'warn', { type: 'plan', id: 'RA-2026-016' }, actionPlans[15].cls.proposal.at);
  note(['admin'], '2 trajectory menunggu persetujuan MRDK (RA-2026-003, RA-2026-009).', 'warn', { type: 'plan', id: 'RA-2026-003' }, actionPlans[8].traj.submittedAt);
  note(['satker:Departemen Pengawasan Perilaku Pelaku Usaha Jasa Keuangan'], 'Mohon konfirmasi atribut atensi RA-2026-023 yang dicatat MRDK.', 'warn', { type: 'plan', id: 'RA-2026-023' }, actionPlans[22].cls.at);
  note(['satker:Departemen Pelindungan Konsumen'], 'Atribut atensi RA-2026-025 telah dikonfirmasi — silakan susun trajectory.', 'info', { type: 'plan', id: 'RA-2026-025' }, actionPlans[24].cls.confirmedAt);
  note(['satker:Departemen Literasi, Inklusi Keuangan, dan Komunikasi'], 'Trajectory RA-2026-006 dikembalikan MRDK untuk diperbaiki.', 'late', { type: 'plan', id: 'RA-2026-006' }, actionPlans[5].traj.reviewAt);
  notifications.sort((a, b) => b.at.localeCompare(a.at));

  return {
    version: SEED_VERSION,
    seededAt: new Date().toISOString(),
    users: DEMO_USERS.map(u => ({ ...u })),
    masters: { bidang: MASTER_BIDANG.map(b => ({ ...b })), satker: MASTER_SATKER.map(s => ({ ...s })), topics: [...MASTER_TOPICS], sources: [...DOC_SOURCES], types: [...DOC_TYPES] },
    documents, actionPlans, notifications, auditLogs, grcLog,
    seq: { doc: documents.length, ra: actionPlans.length, log: logSeq, notif: nSeq, grc: grcSeq, grcLog: syncSeq }
  };
}

/* Deterministic pseudo-random confidences so a document always shows the same scores */
function confidences(seed) {
  let h = 0;
  for (const c of String(seed)) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const r = () => { h = (h * 1103515245 + 12345) >>> 0; return (h % 1000) / 1000; };
  const f = (lo, hi) => +(lo + r() * (hi - lo)).toFixed(2);
  return { rdkDate: f(.96, .995), topic: f(.9, .99), arahan: f(.88, .98), bidang: f(.78, .95), satker: f(.74, .95), assignmentStatus: f(.85, .97), tindakLanjut: f(.7, .9) };
}
