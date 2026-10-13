/* =========================================================================
   SI-RDK · brief.js — Laporan PDF untuk Dewan Komisioner
   Cerminan Executive Dashboard dalam satu dokumen PDF, sehingga DK tetap
   terinformasi tanpa harus login. Urutan isi:
     1. Status penugasan (2 status untuk DK: Dalam Proses · Selesai)
     2. Perhatian: mendekati jatuh tempo, terlambat, tertinggal trajectory
     3. Pemisahan sumber: Arahan RDK/DK vs Hasil Rapat dengan Komisi XI
     4. Statistik kategori atensi & daftar Atensi Khusus dan Atensi Tinggi
   ========================================================================= */

const BRIEF_NEAR_DAYS = 30;
/** Status untuk DK: Menunggu Respon + Dalam Proses = "Dalam Proses". */
const dkStatus = ap => ap.progress >= 100 ? 'Selesai' : 'Dalam Proses';
function srcCategory(ap) {
  const src = findDoc(ap.documentId)?.source || '';
  if (src === 'Rapat Dewan Komisioner' || src === 'Sekretariat Dewan Komisioner') return 'RDK';
  if (src === 'Komisi XI DPR RI') return 'KXI';
  return 'LAIN';
}
const SRC_LABEL = { RDK: 'Arahan / Penugasan Dewan Komisioner (RDK)', KXI: 'Hasil Rapat dengan Komisi XI DPR RI', LAIN: 'Sumber Lain (BPK RI, dll.)' };

async function exportBriefPDF() {
  const plans = visiblePlans();
  if (!plans.length) return toast('Tidak ada penugasan untuk dilaporkan.', 'warn');
  toast('Menyusun Laporan PDF untuk Dewan Komisioner…', 'info');
  let JsPDF;
  try { JsPDF = await ensurePdfLib(); } catch (e) { toast('Library PDF gagal dimuat. Periksa koneksi internet lalu coba lagi.', 'error'); return; }
  const doc = new JsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 14, CW = W - 2 * M;
  const logo = await logoDataURL(); const today = todayISO();
  const C = { navy: [35, 53, 72], blue: [41, 134, 184], green: [46, 173, 107], red: [217, 83, 79], amber: [214, 140, 20], grey: [120, 130, 140], light: [244, 247, 250], line: [221, 228, 235] };
  const T = pdfText;

  /* ---------- data ---------- */
  const total = plans.length;
  const done = plans.filter(a => dkStatus(a) === 'Selesai'); const prog = plans.filter(a => dkStatus(a) === 'Dalam Proses');
  const doneVer = done.filter(a => a.verificationStatus === 'Disetujui').length;
  const near = plans.filter(a => a.progress < 100 && !isLate(a) && daysToTarget(a) != null && daysToTarget(a) <= BRIEF_NEAR_DAYS).sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const late = plans.filter(isLate).sort((a, b) => a.targetDate.localeCompare(b.targetDate));
  const behind = plans.filter(a => trackStatus(a)?.st === 'Tertinggal').sort((a, b) => trackStatus(b).gap - trackStatus(a).gap);
  const pct = n => total ? Math.round(n / total * 100) : 0;
  const quads = ['AK', 'AT', 'PR']; const byQ = q => plans.filter(a => quadOf(a) === q);
  const unclassified = plans.filter(a => !quadOf(a)).length;
  const sat = ap => satkerInfo(ap.satker)?.key || (ap.satker ? ap.satker : 'Belum ditugaskan');

  /* ---------- layout helpers ---------- */
  let y = 0;
  const header = () => {
    let x = M;
    if (logo) { const h = 10, w = h * logo.w / logo.h; doc.addImage(logo.url, 'PNG', M, 8, w, h); x = M + w + 4; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...C.navy); doc.text('SI-RDK Terintegrasi', x, 12);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(110); doc.text('Sistem Informasi Rapat Dewan Komisioner Terintegrasi', x, 15.6);
    doc.setFontSize(7); doc.text(T(`Posisi per ${fmtDateLong(today)}`), W - M, 12, { align: 'right' }); doc.text('TERBATAS', W - M, 15.6, { align: 'right' });
    doc.setDrawColor(...C.navy); doc.setLineWidth(0.5); doc.line(M, 20, W - M, 20);
    y = 26;
  };
  const newPage = () => { doc.addPage(); header(); };
  const need = h => { if (y + h > H - 16) newPage(); };
  const section = (no, title, sub) => {
    need(24); y += 2;
    doc.setFillColor(...C.navy); doc.roundedRect(M, y - 4.6, 7, 7, 1.2, 1.2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(255); doc.text(String(no), M + 3.5, y + 0.4, { align: 'center' });
    doc.setFontSize(12); doc.setTextColor(...C.navy); doc.text(T(title), M + 10, y + 0.6);
    y += 5; if (sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(100); const l = doc.splitTextToSize(T(sub), CW); doc.text(l, M, y + 1); y += l.length * 3.6 + 1; }
    y += 2;
  };
  const kpis = (items) => {
    need(24); const gap = 3, w = (CW - gap * (items.length - 1)) / items.length, h = 20;
    items.forEach((it, i) => {
      const x = M + i * (w + gap);
      doc.setFillColor(...C.light); doc.setDrawColor(...C.line); doc.roundedRect(x, y, w, h, 2, 2, 'FD');
      doc.setFillColor(...(it.color || C.navy)); doc.rect(x, y + 2, 1.2, h - 4, 'F');
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4); doc.setTextColor(90); doc.text(T(it.label), x + 4, y + 5.2);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...(it.color || C.navy)); doc.text(T(String(it.value)), x + 4, y + 13);
      if (it.sub) { doc.setFont('helvetica', 'normal'); doc.setFontSize(6.8); doc.setTextColor(110); doc.text(doc.splitTextToSize(T(it.sub), w - 7).slice(0, 2), x + 4, y + 16.8); }
    });
    y += h + 5;
  };
  const stackBar = (parts) => {
    need(14); const h = 6; let x = M; const sum = parts.reduce((t, p) => t + p.n, 0) || 1;
    parts.forEach(p => { const w = CW * p.n / sum; if (w > 0) { doc.setFillColor(...p.color); doc.rect(x, y, w, h, 'F'); if (w > 18) { doc.setFont('helvetica', 'bold'); doc.setFontSize(7.4); doc.setTextColor(255); doc.text(T(`${p.label} ${p.n} (${Math.round(p.n / sum * 100)}%)`), x + 2, y + 4.2); } x += w; } });
    y += h + 5;
  };
  const para = (text, size = 8.6) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(size); doc.setTextColor(40); const l = doc.splitTextToSize(T(text), CW); need(l.length * 4 + 2); doc.text(l, M, y); y += l.length * 4 + 2; };
  const sub = (text, color = C.navy) => { need(12); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.4); doc.setTextColor(...color); doc.text(T(text), M, y); y += 2.5; };
  const table = (head, body, colW, opts = {}) => {
    if (!body.length) { doc.setFont('helvetica', 'italic'); doc.setFontSize(8); doc.setTextColor(120); need(8); doc.text(T(opts.empty || 'Tidak ada.'), M, y + 3); y += 8; return; }
    const columnStyles = {}; colW.forEach((w, i) => { columnStyles[i] = { cellWidth: w === '*' ? 'auto' : w, halign: opts.right?.includes(i) ? 'right' : 'left' }; });
    doc.autoTable({ startY: y, margin: { left: M, right: M, top: 26, bottom: 16 }, head: [head.map(T)], body: body.map(r => r.map(v => T(v))),
      styles: { font: 'helvetica', fontSize: 7.4, cellPadding: 1.5, overflow: 'linebreak', valign: 'top', lineColor: C.line, lineWidth: 0.1 },
      headStyles: { fillColor: opts.headColor || C.navy, textColor: 255, fontStyle: 'bold' }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles,
      didParseCell: opts.bold ? d => { if (d.section === 'body' && opts.bold(d.row.index)) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.fillColor = [236, 241, 246]; } } : undefined,
      didDrawPage: () => header() });
    y = doc.lastAutoTable.finalY + 6;
  };
  const planRows = (list, extra) => list.map(a => [a.id, a.arahan, sat(a), fmtDate(a.targetDate), a.progress + '%', extra(a)]);

  /* ---------- halaman 1: judul & ringkasan ---------- */
  header();
  doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...C.navy);
  doc.text(T('Laporan Pemantauan Tindak Lanjut'), M, y + 2); doc.text(T('Arahan dan Penugasan Dewan Komisioner'), M, y + 8.5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(90);
  doc.text(T(`Posisi data per ${fmtDateLong(today)} · disusun oleh MRDK melalui SI-RDK Terintegrasi`), M, y + 14); y += 21;
  const p1 = byQ('AK'), p2 = byQ('AT');
  const summary = `Dari ${total} arahan/penugasan yang dipantau, ${done.length} (${pct(done.length)}%) telah selesai${doneVer < done.length ? ` (${doneVer} di antaranya telah diverifikasi MRDK)` : ''} dan ${prog.length} (${pct(prog.length)}%) masih dalam proses. `
    + `Terdapat ${late.length} penugasan yang telah melewati target penyelesaian, ${near.length} penugasan akan jatuh tempo dalam ${BRIEF_NEAR_DAYS} hari ke depan, dan ${behind.length} penugasan tertinggal dari trajectory yang telah disetujui. `
    + `Sebanyak ${p1.length} penugasan berada dalam kategori Atensi Khusus dan ${p2.length} dalam kategori Atensi Tinggi; ${p1.filter(isLate).length + p2.filter(isLate).length} di antaranya telah melewati target.`;
  doc.setFillColor(236, 244, 250); const sl = doc.splitTextToSize(T(summary), CW - 8); doc.roundedRect(M, y, CW, sl.length * 4.1 + 9, 2, 2, 'F');
  doc.setFont('helvetica', 'bold'); doc.setFontSize(8.4); doc.setTextColor(...C.navy); doc.text('RINGKASAN EKSEKUTIF', M + 4, y + 5);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6); doc.setTextColor(30); doc.text(sl, M + 4, y + 10); y += sl.length * 4.1 + 15;

  /* ---------- 1. status ---------- */
  section(1, 'Status Penyelesaian Penugasan', 'Untuk keperluan pelaporan kepada Dewan Komisioner, status disederhanakan menjadi dua: Dalam Proses (termasuk yang belum ada respon satker) dan Selesai (progres 100%).');
  kpis([
    { label: 'Total penugasan', value: total, sub: `${new Set(plans.map(a => a.rdkDate + '|' + a.topic)).size} arahan · ${appState.documents.length} dokumen rujukan`, color: C.navy },
    { label: 'Dalam Proses', value: `${prog.length} (${pct(prog.length)}%)`, sub: `${plans.filter(a => a.progress <= 0).length} belum ada respon satker`, color: C.blue },
    { label: 'Selesai', value: `${done.length} (${pct(done.length)}%)`, sub: `${doneVer} telah diverifikasi MRDK`, color: C.green }
  ]);
  stackBar([{ label: 'Dalam Proses', n: prog.length, color: C.blue }, { label: 'Selesai', n: done.length, color: C.green }]);
  sub('Status per bidang');
  const bs = bidangList().map(b => { const l = plans.filter(a => a.bidang === b.name); return { b, l, d: l.filter(a => dkStatus(a) === 'Selesai').length }; }).filter(x => x.l.length);
  table(['Bidang', 'Total', 'Dalam Proses', 'Selesai', '% Selesai', 'Terlambat'],
    [...bs.map(x => [`${x.b.code} — ${x.b.name}`, x.l.length, x.l.length - x.d, x.d, Math.round(x.d / x.l.length * 100) + '%', x.l.filter(isLate).length]), ['TOTAL OJK', total, prog.length, done.length, pct(done.length) + '%', late.length]],
    ['*', 14, 22, 15, 17, 18], { right: [1, 2, 3, 4, 5], bold: i => i === bs.length });

  /* ---------- 2. perhatian ---------- */
  section(2, 'Penugasan yang Memerlukan Perhatian', `Mendekati jatuh tempo = target selesai dalam ${BRIEF_NEAR_DAYS} hari ke depan dan belum 100%. Terlambat = target selesai telah terlewati dan belum 100%. Tertinggal trajectory = progres di bawah target triwulan terakhir pada trajectory yang disetujui.`);
  kpis([
    { label: `Mendekati jatuh tempo (<= ${BRIEF_NEAR_DAYS} hari)`, value: near.length, color: C.amber },
    { label: 'Terlambat', value: late.length, sub: late.length ? `rata-rata lewat ${Math.round(late.reduce((t, a) => t - daysToTarget(a), 0) / late.length)} hari` : '', color: C.red },
    { label: 'Tertinggal dari trajectory', value: behind.length, sub: `dari ${plans.filter(a => prepStatus(a) === 'Trajectory Disetujui').length} trajectory disetujui`, color: C.red }
  ]);
  const cols = ['ID', 'Arahan / Penugasan', 'Satker', 'Target', 'Progres', 'Keterangan'], cw = [20, '*', 16, 19, 14, 30];
  sub(`2.a Terlambat (${late.length})`, C.red); table(cols, planRows(late, a => `Lewat ${-daysToTarget(a)} hari`), cw, { empty: 'Tidak ada penugasan yang terlambat.', headColor: C.red });
  sub(`2.b Mendekati jatuh tempo (${near.length})`, C.amber); table(cols, planRows(near, a => daysToTarget(a) === 0 ? 'Jatuh tempo hari ini' : `${daysToTarget(a)} hari lagi`), cw, { empty: `Tidak ada penugasan yang jatuh tempo dalam ${BRIEF_NEAR_DAYS} hari.`, headColor: C.amber });
  sub(`2.c Tertinggal dari trajectory (${behind.length})`, C.red); table(cols, planRows(behind, a => { const t = trackStatus(a); return `Target ${TW[t.ref.i]} ${t.ref.target}%, kurang ${t.gap} poin`; }), cw, { empty: 'Tidak ada penugasan yang tertinggal dari trajectory.', headColor: C.red });

  /* ---------- 3. sumber ---------- */
  section(3, 'Arahan RDK dan Hasil Rapat dengan Komisi XI', 'Pemisahan berdasarkan sumber dokumen rujukan: Risalah RDK dan Nota Dinas Arahan DK dikelompokkan sebagai arahan Dewan Komisioner; Laporan Singkat Raker/RDP dikelompokkan sebagai hasil rapat dengan Komisi XI DPR RI, dengan rujukan disposisi ADK di SIPENA sebagai dasar penugasan satker.');
  const cats = ['RDK', 'KXI', 'LAIN'].map(k => { const l = plans.filter(a => srcCategory(a) === k); return { k, l, d: l.filter(a => dkStatus(a) === 'Selesai').length }; }).filter(c => c.l.length);
  table(['Sumber', 'Total', 'Dalam Proses', 'Selesai', '% Selesai', 'Terlambat', 'Tertinggal'], cats.map(c => [SRC_LABEL[c.k], c.l.length, c.l.length - c.d, c.d, Math.round(c.d / c.l.length * 100) + '%', c.l.filter(isLate).length, c.l.filter(a => trackStatus(a)?.st === 'Tertinggal').length]),
    ['*', 13, 20, 14, 16, 17, 17], { right: [1, 2, 3, 4, 5, 6] });
  cats.filter(c => c.k !== 'LAIN').forEach((c, i) => {
    sub(`3.${'ab'[i]} ${SRC_LABEL[c.k]} (${c.l.length})`);
    const kxi = c.k === 'KXI';
    table(['ID', 'Arahan / Penugasan', kxi ? 'Disposisi ADK (SIPENA)' : 'Dokumen', 'Satker', 'Status', 'Progres'], c.l.slice().sort((a, b) => (dkStatus(a) === 'Selesai') - (dkStatus(b) === 'Selesai') || a.id.localeCompare(b.id)).map(a => [a.id, a.arahan, kxi ? (planDisp(a)?.disp ? `${a.disp?.no || planDisp(a).disp.no}\n${planDisp(a).disp.from}` : planDisp(a)?.pulled ? 'Di luar disposisi' : (findDoc(a.documentId)?.document_number || '')) : (findDoc(a.documentId)?.document_number || ''), sat(a), dkStatus(a) + (isLate(a) ? ' (terlambat)' : ''), a.progress + '%']),
      [20, '*', kxi ? 34 : 28, 16, 24, 14], { right: [5] });
  });

  /* ---------- 4. atensi ---------- */
  section(4, 'Kategori Atensi Pemantauan', ATENSI_NOTE + ' Kategori diturunkan dari atribut faktual (horizon penyelesaian dan cakupan dampak) yang dicatat MRDK dan dikonfirmasi satker.');
  table(['Kategori atensi', 'Total', 'Dalam Proses', 'Selesai', 'Terlambat', 'Tertinggal'], [...quads.map(q => { const l = byQ(q); return [QUADRANTS[q].label, l.length, l.filter(a => dkStatus(a) === 'Dalam Proses').length, l.filter(a => dkStatus(a) === 'Selesai').length, l.filter(isLate).length, l.filter(a => trackStatus(a)?.st === 'Tertinggal').length]; }), ...(unclassified ? [['Belum dicatat', unclassified, '', '', '', '']] : [])],
    ['*', 16, 24, 18, 20, 20], { right: [1, 2, 3, 4, 5] });
  const prioRows = list => list.slice().sort((a, b) => (dkStatus(a) === 'Selesai') - (dkStatus(b) === 'Selesai') || isLate(b) - isLate(a) || a.targetDate.localeCompare(b.targetDate))
    .map(a => { const t = trackStatus(a); return [a.id, a.arahan, sat(a), `${a.cls.horizon} · ${a.cls.scope}`, dkStatus(a), `${a.progress}%`, fmtDate(a.targetDate), [isLate(a) ? `Terlambat ${-daysToTarget(a)} hari` : '', t?.st === 'Tertinggal' ? `Tertinggal ${t.gap} poin` : ''].filter(Boolean).join('; ') || '-']; });
  const pcols = ['ID', 'Arahan / Penugasan', 'Satker', 'Atribut (horizon · cakupan)', 'Status', 'Progres', 'Target', 'Catatan'], pcw = [19, '*', 15, 32, 19, 13, 19, 22];
  sub(`4.a Atensi Khusus (${p1.length})`, C.red); table(pcols, prioRows(p1), pcw, { empty: 'Tidak ada penugasan dengan Atensi Khusus.', headColor: C.red, right: [5] });
  sub(`4.b Atensi Tinggi (${p2.length})`, C.amber); table(pcols, prioRows(p2), pcw, { empty: 'Tidak ada penugasan dengan Atensi Tinggi.', headColor: C.amber, right: [5] });

  /* ---------- penutup ---------- */
  need(16); doc.setFont('helvetica', 'italic'); doc.setFontSize(7.6); doc.setTextColor(110);
  doc.text(doc.splitTextToSize(T('Catatan: angka dihitung otomatis dari data SI-RDK Terintegrasi pada tanggal posisi. Progres adalah capaian yang dilaporkan satker; status verifikasi MRDK tercantum pada Rekap & Laporan. Rincian lengkap tersedia pada aplikasi SI-RDK Terintegrasi.'), CW), M, y + 2);

  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) { doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(120); doc.text(T(`Dicetak ${fmtDT(new Date().toISOString())} oleh ${cu().name}`), M, H - 8); doc.text(`Halaman ${i} dari ${n}`, W - M, H - 8, { align: 'right' }); }
  if (await saveFile(`Laporan_DK_Tindak_Lanjut_${today.replace(/-/g, '')}.pdf`, doc.output('blob'))) { audit('Export Data', 'Laporan DK', '-', `PDF · ${total} penugasan · ${n} halaman`); saveState(); toast(`Laporan PDF untuk DK berhasil dibuat (${n} halaman).`); }
}
Actions.briefPDF = () => exportBriefPDF();
