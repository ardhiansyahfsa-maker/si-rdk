/* =========================================================================
   SI-RDK · data.js
   Master data, demo accounts, mock dataset and the simulated extraction
   library. Dates are generated relative to the first time the prototype is
   opened, so "Terlambat" and "mendekati deadline" stay meaningful in demos.
   ========================================================================= */

const SEED_VERSION = 6;

const ROLE_LABEL = { admin: 'Admin / MRDK', satker: 'Satker Pelaksana', viewer: 'Viewer / Pimpinan' };

const MASTER_SATKER = [
  { key: 'DMC', name: 'Direktorat Market Conduct', bidang: 'Pengawasan Perilaku PUJK', pic: 'Budi Santoso' },
  { key: 'DPB', name: 'Departemen Pengawasan Bank', bidang: 'Pengawasan Perbankan', pic: 'Sari Indrawati' },
  { key: 'DPPM', name: 'Departemen Pengawasan Pasar Modal', bidang: 'Pengawasan Pasar Modal', pic: 'Arief Rahman' },
  { key: 'DIKNB', name: 'Departemen Pengawasan Asuransi dan Dana Pensiun', bidang: 'Pengawasan PPDP', pic: 'Maya Kusuma' },
  { key: 'DLIK', name: 'Departemen Literasi dan Inklusi Keuangan', bidang: 'Edukasi dan Pelindungan Konsumen', pic: 'Dimas Prasetyo' },
  { key: 'DITSK', name: 'Departemen Pengawasan ITSK dan Aset Kripto', bidang: 'Pengawasan ITSK dan Aset Kripto', pic: 'Nadia Putri' }
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
  { username: 'admin', password: 'admin123', name: 'Ardhiansyah K', role: 'admin', satker: null, title: 'Direktur MRDK', active: true },
  { username: 'satker', password: 'satker123', name: 'Budi Santoso', role: 'satker', satker: 'Direktorat Market Conduct', title: 'PIC Direktorat Market Conduct', active: true },
  { username: 'viewer', password: 'viewer123', name: 'Hendra Gunawan', role: 'viewer', satker: null, title: 'Kepala Eksekutif', active: true },
  { username: 'satker.dpb', password: 'satker123', name: 'Sari Indrawati', role: 'satker', satker: 'Departemen Pengawasan Bank', title: 'PIC Departemen Pengawasan Bank', active: true },
  { username: 'satker.dlik', password: 'satker123', name: 'Dimas Prasetyo', role: 'satker', satker: 'Departemen Literasi dan Inklusi Keuangan', title: 'PIC Departemen Literasi dan Inklusi Keuangan', active: true },
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
      { arahan: 'Memperkuat mekanisme pengawasan terhadap aktivitas jasa keuangan digital dan meningkatkan perlindungan konsumen.', satker: 'Direktorat Market Conduct', tindakLanjut: 'Pengembangan mekanisme monitoring dan evaluasi.', priority: 'Tinggi', days: 90 },
      { arahan: 'Melakukan evaluasi atas efektivitas penanganan pengaduan konsumen pada PUJK sektor perbankan.', satker: 'Departemen Pengawasan Bank', tindakLanjut: 'Penyusunan kerangka evaluasi dan pengumpulan data pengaduan.', priority: 'Sedang', days: 120 },
      { arahan: 'Menyusun kajian kebutuhan pengaturan atas layanan Buy Now Pay Later (BNPL) dan paylater perbankan.', satker: '', bidang: 'Pengawasan PPDP', tindakLanjut: 'Menunggu penetapan satker penanggung jawab.', priority: 'Sedang', days: 150 }
    ]
  },
  asuransi: {
    topic: 'Penguatan Tata Kelola Asuransi',
    items: [
      { arahan: 'Mempercepat penyelesaian klaim pemegang polis pada perusahaan asuransi bermasalah dan memastikan transparansi informasi kepada konsumen.', satker: 'Departemen Pengawasan Asuransi dan Dana Pensiun', tindakLanjut: 'Penyusunan rencana penyelesaian klaim dan publikasi status penanganan.', priority: 'Tinggi', days: 60 },
      { arahan: 'Memperketat pengawasan produk asuransi yang dikaitkan dengan investasi (PAYDI), termasuk pemasaran melalui bancassurance.', satker: 'Departemen Pengawasan Asuransi dan Dana Pensiun', tindakLanjut: 'Pemeriksaan tematik pemasaran PAYDI pada bank mitra.', priority: 'Tinggi', days: 90 },
      { arahan: 'Meningkatkan edukasi kepada masyarakat mengenai hak dan kewajiban pemegang polis.', satker: 'Departemen Literasi dan Inklusi Keuangan', tindakLanjut: 'Penyusunan materi edukasi dan kampanye digital.', priority: 'Sedang', days: 120 }
    ]
  },
  bank: {
    topic: 'Transformasi Digital Perbankan',
    items: [
      { arahan: 'Memperkuat ketahanan siber dan manajemen risiko teknologi informasi pada bank digital.', satker: 'Departemen Pengawasan Bank', tindakLanjut: 'Asesmen maturitas keamanan siber pada bank digital.', priority: 'Tinggi', days: 75 },
      { arahan: 'Menyusun pengaturan layanan perbankan berbasis open API serta pelindungan data nasabah.', satker: 'Departemen Pengawasan ITSK dan Aset Kripto', tindakLanjut: 'Penyusunan naskah akademik pengaturan open API.', priority: 'Sedang', days: 150 },
      { arahan: 'Melakukan asesmen kesiapan BPR dalam implementasi digitalisasi layanan.', satker: '', bidang: 'Pengawasan Perbankan', tindakLanjut: 'Menunggu penetapan satker penanggung jawab.', priority: 'Rendah', days: 180 }
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
    [1, 'DMC', 'Memperkuat mekanisme pengawasan terhadap aktivitas jasa keuangan digital dan meningkatkan perlindungan konsumen.', 40, 'Menunggu Verifikasi', 40, 'Tinggi', -2, { prev: 20, tl: 'Pengembangan mekanisme monitoring dan evaluasi; penyusunan draf indikator pengawasan perilaku PUJK digital.', out: 'Draf kerangka monitoring market conduct digital (v0.4)', kd: 'Integrasi data pengaduan dari APPK belum real-time.' }],
    [1, 'DMC', 'Menyusun pedoman penanganan pengaduan konsumen lintas sektor yang terintegrasi dengan Aplikasi Portal Pelindungan Konsumen (APPK).', 100, 'Disetujui', 10, 'Tinggi', -8, { prev: 70, done: -8, tl: 'Pedoman telah ditetapkan melalui Keputusan Anggota Dewan Komisioner dan disosialisasikan ke PUJK.', out: 'KADK Pedoman Penanganan Pengaduan Terintegrasi', vn: 'Sesuai. Dokumen penetapan telah dilampirkan.' }],
    [1, 'DPB', 'Melakukan thematic review atas praktik penagihan kredit oleh bank umum, termasuk penggunaan pihak ketiga.', 55, 'Belum Diverifikasi', 35, 'Sedang', -4, { tl: 'Thematic review pada 12 bank umum; 7 bank telah selesai diperiksa.', out: 'Kertas kerja thematic review', kd: 'Keterbatasan jumlah pemeriksa di Kantor Regional.' }],
    [2, 'DIKNB', 'Menyampaikan laporan tindak lanjut rekomendasi Komisi XI atas penanganan perusahaan asuransi jiwa bermasalah.', 55, 'Menunggu Verifikasi', 12, 'Tinggi', -1, { prev: 35, tl: 'Penyusunan laporan progres penanganan 4 perusahaan asuransi jiwa dalam pengawasan khusus.', out: 'Draf laporan tindak lanjut kepada Komisi XI', kd: 'Menunggu data dari likuidator untuk 1 perusahaan.' }],
    [2, 'DPB', 'Meningkatkan efektivitas pengawasan terhadap BPR/BPRS dengan rasio permodalan di bawah ketentuan.', 70, 'Disetujui', 20, 'Tinggi', -10, { prev: 45, tl: 'Penetapan 18 BPR dalam pengawasan intensif dan penyusunan rencana tindak penyehatan.', out: 'Daftar BPR pengawasan intensif dan rencana penyehatan', vn: 'Progres disetujui. Lanjutkan pemantauan rencana penyehatan.' }],
    [2, 'DLIK', 'Menyusun peta jalan peningkatan indeks literasi keuangan di wilayah 3T (terdepan, terluar, tertinggal).', 20, 'Perlu Perbaikan', 60, 'Sedang', -7, { prev: 0, tl: 'Pengumpulan data indeks literasi per provinsi.', vn: 'Mohon lampirkan baseline indeks literasi per provinsi dan rincian target tahunan.' }],
    [3, 'DMC', 'Mengintensifkan koordinasi Satgas PASTI untuk pemblokiran entitas pinjaman online ilegal.', 100, 'Disetujui', -25, 'Tinggi', -42, { prev: 80, done: -42, tl: 'Pemblokiran 1.240 entitas pinjol ilegal bersama Kementerian Komdigi dan Satgas PASTI.', out: 'Laporan Satgas PASTI Triwulan III', vn: 'Disetujui.' }],
    [3, 'DITSK', 'Mengembangkan sistem deteksi dini iklan pinjaman online ilegal di media sosial.', 60, 'Belum Diverifikasi', -6, 'Tinggi', -21, { tl: 'Prototipe crawler dan model klasifikasi iklan selesai diuji internal.', kd: 'Pengadaan lisensi API media sosial tertunda.' }],
    [3, 'DLIK', 'Menyelenggarakan kampanye edukasi waspada pinjaman online ilegal di 34 provinsi.', 85, 'Menunggu Verifikasi', 18, 'Sedang', -1, { prev: 70, tl: 'Kampanye telah terlaksana di 29 provinsi.', out: 'Rekap peserta dan materi kampanye' }],
    [4, 'DIKNB', 'Melakukan penilaian kembali (fit and proper) pihak utama pada perusahaan asuransi dalam pengawasan khusus.', 45, 'Belum Diverifikasi', 15, 'Tinggi', -9, { tl: 'Penilaian kembali 9 dari 20 pihak utama selesai.' }],
    [4, 'DIKNB', 'Menyusun rancangan POJK pemisahan unit usaha syariah perusahaan asuransi.', 0, 'Belum Diverifikasi', 75, 'Sedang', null, {}],
    [4, 'DIKNB', 'Menyiapkan skema program penjaminan polis bersama Lembaga Penjamin Simpanan.', 15, 'Belum Diverifikasi', 90, 'Sedang', -12, { manual: 'Menunggu Arahan', tl: 'Kajian awal skema penjaminan polis.', kd: 'Menunggu arahan Dewan Komisioner terkait opsi pendanaan program.' }],
    [5, 'DPPM', 'Mempercepat implementasi bursa karbon dan perluasan instrumen yang diperdagangkan.', 75, 'Disetujui', -12, 'Tinggi', -25, { prev: 50, tl: 'Penambahan 2 instrumen unit karbon dan pengembangan perdagangan internasional.', vn: 'Disetujui sebagai progres; target perlu disesuaikan.' }],
    [5, 'DPPM', 'Memperkuat pengawasan transaksi saham tidak wajar dan praktik manipulasi harga.', 100, 'Menunggu Verifikasi', 8, 'Tinggi', -1, { prev: 80, done: -1, tl: 'Implementasi full call auction dan penyempurnaan unusual market activity monitoring.', out: 'Laporan implementasi sistem surveillance' }],
    [5, 'DPPM', 'Meningkatkan jumlah investor ritel melalui program Sekolah Pasar Modal di daerah.', 100, 'Disetujui', -40, 'Rendah', -52, { prev: 75, done: -52, tl: 'Program terlaksana di 120 kota; pertumbuhan SID 18% yoy.', out: 'Laporan pelaksanaan Sekolah Pasar Modal', vn: 'Disetujui.' }],
    [6, 'DLIK', 'Mengalokasikan program inklusi keuangan bagi UMKM dan pelaku usaha ultra mikro.', 30, 'Belum Diverifikasi', 45, 'Sedang', -14, { tl: 'Penyusunan skema pembiayaan klaster bersama TPAKD.' }],
    [6, 'DLIK', 'Mengoptimalkan peran Tim Percepatan Akses Keuangan Daerah (TPAKD) dalam perluasan akses keuangan.', 0, 'Belum Diverifikasi', 50, 'Rendah', null, {}],
    [7, 'DITSK', 'Menyusun ketentuan pelindungan konsumen aset kripto pasca peralihan pengawasan dari Bappebti.', 50, 'Menunggu Verifikasi', 30, 'Tinggi', -3, { prev: 30, tl: 'Rancangan POJK telah melalui uji publik tahap I.', out: 'RPOJK Pelindungan Konsumen Aset Kripto' }],
    [7, 'DITSK', 'Melakukan pemeriksaan kepatuhan pedagang aset kripto terhadap ketentuan APU-PPT.', 0, 'Belum Diverifikasi', -3, 'Tinggi', null, {}],
    [8, 'DPB', 'Melakukan stress test risiko kredit dan risiko pasar terhadap bank sistemik.', 100, 'Disetujui', -60, 'Tinggi', -72, { prev: 60, done: -72, tl: 'Stress test terhadap 15 D-SIB selesai dan hasilnya dilaporkan ke RDK.', out: 'Laporan hasil stress test D-SIB', vn: 'Disetujui.' }],
    [8, 'DPB', 'Memantau eksposur perbankan terhadap sektor properti dan komoditas.', 90, 'Ditolak', 25, 'Sedang', -5, { prev: 75, tl: 'Pemantauan bulanan eksposur 40 bank terbesar.', vn: 'Data eksposur yang dilampirkan masih posisi Juni. Mohon gunakan posisi terkini.' }],
    [9, 'DPB', 'Menindaklanjuti rekomendasi BPK terkait dokumentasi proses pengawasan berbasis risiko.', 65, 'Perlu Perbaikan', -15, 'Tinggi', -11, { prev: 40, tl: 'Penyempurnaan SOP dokumentasi RBS; 3 dari 5 rekomendasi telah ditindaklanjuti.', vn: 'Lampirkan bukti penetapan SOP dan surat penyampaian ke BPK.' }],
    [9, 'DMC', 'Memperbaiki mekanisme pengenaan sanksi administratif dan pemantauan pembayaran denda.', 25, 'Belum Diverifikasi', 40, 'Sedang', -16, { tl: 'Pemetaan proses bisnis pengenaan sanksi administratif.' }],
    [10, null, 'Menyusun modul edukasi keuangan berbasis kearifan lokal untuk Kantor OJK di daerah.', 0, 'Belum Diverifikasi', 80, 'Sedang', null, { bidang: 'Edukasi dan Pelindungan Konsumen' }],
    [10, 'DMC', 'Mengevaluasi efektivitas penanganan pengaduan konsumen pada PUJK di daerah.', 30, 'Perlu Perbaikan', 28, 'Sedang', -6, { prev: 10, tl: 'Evaluasi pada 6 Kantor OJK daerah.', vn: 'Mohon lengkapi data pengaduan per kantor dan lampirkan rekap tindak lanjut.' }]
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
      priority: prio, targetDate: D(tOff), progress, manualStatus: x.manual || null,
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
      log(T(tOff + 1, 0, 5), 'Sistem', 'system', 'Status Otomatis', ap.id, ap.progress > 0 ? 'Dalam Proses' : 'Belum Mulai', 'Terlambat', `Target ${fmtDate(ap.targetDate)} terlewati dengan progress ${ap.progress}%`);
      ap._late = T(tOff + 1, 0, 5);
    }
  });

  // Penugasan strategis OJK-wide → dialirkan ke SI-GRC (input profil risiko satker pengampu)
  // [planIdx, kategori, alasan dampak, sinkron: 'cur' | 'stale' | null, hari sinkron, kondisi saat dikirim (untuk 'stale')]
  const G = [
    [0, 'Risiko Strategis', 'Kerangka pengawasan market conduct digital berlaku lintas seluruh sektor PUJK.', 'cur', -2],
    [3, 'Risiko Reputasi', 'Rekomendasi Komisi XI DPR RI; menyangkut kepercayaan publik terhadap pengawasan OJK.', 'stale', -9, { progress: 35, verificationStatus: 'Belum Diverifikasi' }],
    [4, 'Risiko Strategis', 'Penyehatan BPR/BPRS berdampak pada stabilitas sistem dan arah kebijakan pengawasan OJK.', 'cur', -9],
    [7, 'Risiko Operasional', 'Deteksi dini pinjol ilegal menopang pelindungan konsumen nasional lintas sektor.', 'stale', -25, { progress: 40, targetDate: D(10) }],
    [11, 'Risiko Strategis', 'Skema penjaminan polis memerlukan keputusan kebijakan lintas lembaga (OJK–LPS).', null],
    [12, 'Risiko Strategis', 'Bursa karbon merupakan agenda nasional dengan eksposur kebijakan OJK-wide.', 'cur', -5],
    [17, 'Risiko Kepatuhan', 'Ketentuan baru pasca peralihan pengawasan aset kripto dari Bappebti.', null],
    [19, 'Risiko Strategis', 'Hasil stress test D-SIB menjadi masukan kebijakan stabilitas sektor jasa keuangan.', 'cur', -70],
    [21, 'Risiko Kepatuhan', 'Tindak lanjut rekomendasi BPK RI atas pengawasan berbasis risiko lintas satker.', 'cur', -10],
    [23, 'Risiko Operasional', 'Modul edukasi akan digunakan seluruh Kantor OJK di daerah.', null]
  ];
  const grcLog = []; let grcSeq = 0;
  G.slice().sort((a, b) => (a[4] ?? 0) - (b[4] ?? 0)).forEach(([idx, category, note, sync, day, then]) => {
    const ap = actionPlans[idx];
    ap.strategic = true; ap.grc = { category, note };
    log(sync ? T(day - 1, 9, 30 + (idx % 20)) : T(-1, 9, 30 + (idx % 20)), 'Ardhiansyah K', 'admin', 'Klasifikasi Strategis', ap.id, 'Non-strategis', 'Strategis (SI-GRC)', `${category} · ${note}`);
    if (!sync) return;
    const snap = sync === 'stale' ? { ...ap, ...then } : ap;
    const at = T(day, 16, 5 + (idx % 40));
    const riskId = `GRC-RI-2026-${String(++grcSeq).padStart(4, '0')}`;
    const lv = grcSignal(snap).level;
    Object.assign(ap.grc, { riskId, syncedAt: at, fp: grcFingerprint(snap), level: lv, by: 'Ardhiansyah K' });
    log(at, 'Ardhiansyah K', 'admin', 'Kirim ke SI-GRC', ap.id, 'Antrian Kirim', 'Tersinkron', `${riskId} · input baru · sinyal risiko ${lv}`);
    grcLog.push({ id: 'SYNC-' + String(grcSeq).padStart(4, '0'), at, by: 'Ardhiansyah K', endpoint: 'POST /api/grc/v1/risk-inputs', refs: [ap.id], result: [`${ap.id}: 201 Created`], payload: [{ ...grcPayload(snap), risk_input_id: riskId }] });
  });
  grcLog.sort((a, b) => b.at.localeCompare(a.at));

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
  note(['admin', 'viewer'], 'Departemen Pengawasan Pasar Modal melakukan update progress RA-2026-014 menjadi 100%.', 'ok', { type: 'plan', id: 'RA-2026-014' }, actionPlans[13].updatedAt);
  note(['satker:Direktorat Market Conduct'], 'RA-2026-002 telah disetujui Admin MRDK.', 'ok', { type: 'plan', id: 'RA-2026-002' }, actionPlans[1].submissions[0].resultAt);
  note(['admin'], 'Data pelaksanaan 2 penugasan strategis berubah sejak dikirim ke SI-GRC — perlu sinkron ulang.', 'warn', { type: 'grc' }, T(0, 7, 30));
  notifications.sort((a, b) => b.at.localeCompare(a.at));

  return {
    version: SEED_VERSION,
    seededAt: new Date().toISOString(),
    users: DEMO_USERS.map(u => ({ ...u })),
    masters: { satker: MASTER_SATKER.map(s => ({ ...s })), topics: [...MASTER_TOPICS], sources: [...DOC_SOURCES], types: [...DOC_TYPES] },
    documents, actionPlans, notifications, auditLogs, grcLog,
    seq: { doc: documents.length, ra: actionPlans.length, log: logSeq, notif: nSeq, grc: grcSeq, grcLog: grcSeq }
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
