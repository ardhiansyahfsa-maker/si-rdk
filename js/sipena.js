/* =========================================================================
   SI-RDK · sipena.js — Integrasi SIPENA (disposisi ADK)
   Berlaku KHUSUS untuk Laporan Singkat Raker/RDP dengan DPR (sumber Komisi XI).
   · Laporan singkat beserta disposisi ADK ditarik otomatis dari SIPENA.
   · Laporan singkat = sumber APA yang ditindaklanjuti (poin Kesimpulan/Keputusan).
   · Disposisi ADK di SIPENA = sumber SIAPA yang menyelesaikan (satker).
     LLM hanya memecah laporan singkat menjadi poin; tidak menetapkan satker.
   · Penugasan ke satker di luar tujuan disposisi ditandai dan wajib beralasan.
   Prototipe: penarikan disimulasikan (api.pullSipena); kontrak data mengikuti
   SIPENA_CONTRACT sehingga dapat diganti panggilan API SIPENA sebenarnya.
   Arahan RDK (Keputusan RDK / ND Arahan DK) tidak memakai disposisi SIPENA.
   ========================================================================= */

const SIPENA_ENDPOINT = 'GET /api/sipena/v1/naskah?jenis=lapsing-dpr&sejak={last_pull}';
const isDprDoc = d => !!d && d.source === 'Komisi XI DPR RI';
const dispList = d => (d && d.sipena && d.sipena.disp) || [];
const dispTargets = d => [...new Set(dispList(d).flatMap(x => x.to))];
const dispFor = (d, satker) => dispList(d).find(x => x.to.includes(satker)) || null;
/** Informasi disposisi untuk satu penugasan. */
function planDisp(ap) {
  const d = findDoc(ap.documentId); if (!isDprDoc(d)) return null;
  const targets = dispTargets(d); const x = ap.satker ? dispFor(d, ap.satker) : null;
  return { doc: d, agenda: d.sipena?.agenda || null, disp: x, targets, deviated: !!ap.satker && !!d.sipena && !x, pulled: !!d.sipena };
}
const dispLabel = x => x ? `${x.no} · ${x.from}` : '';

/* ------------------------------ Mock SIPENA ------------------------------ */
/** Naskah yang "tersedia" di SIPENA tetapi belum ditarik ke SI-RDK (simulasi). */
const SIPENA_POOL = [
  { n: 'Laporan Singkat Raker Komisi XI - Pengawasan Pinjaman Daring dan Pembiayaan.pdf', type: 'Laporan Singkat Raker', no: 'LS/RAKER/XI/2026/11', agenda: 'SIPENA-2026-08831', rdk: -4, tpl: 'lpbbti', topic: 'Pengawasan Pinjaman Daring dan Pembiayaan',
    disp: [{ from: 'ADK Bidang PVML', to: ['DPLJ', 'DPVL'], isi: 'Mohon ditindaklanjuti sesuai kewenangan dan dilaporkan perkembangannya kepada DK.' }, { from: 'ADK Bidang PEPK', to: ['DPLK'], isi: 'Mohon diperhatikan aspek pelindungan konsumen dan penanganan pengaduan.' }] }
];
api.pullSipena = async (onProgress) => {
  await tick(1200, onProgress);
  const have = new Set(appState.documents.map(d => d.sipena?.agenda).filter(Boolean));
  return SIPENA_POOL.filter(x => !have.has(x.agenda));
};
let sipenaDispSeq = 900;
function sipenaDispRecords(list, date) {
  return list.map(x => ({ no: `DISP-${++sipenaDispSeq}/${x.from.replace('ADK Bidang ', '')}/2026`, date, from: x.from, to: x.to.map(k => satkerByCode(k)?.name).filter(Boolean), isi: x.isi }));
}
const satkerByCode = k => appState.masters.satker.find(s => s.key === k);

Actions.sipenaPull = async () => {
  if (!isRole('admin')) return;
  toast('Menarik laporan singkat dan disposisi dari SIPENA…', 'info');
  const res = await api.pullSipena();
  const now = new Date().toISOString(); appState.sipenaPulledAt = now;
  if (!res.length) { audit('Tarik SIPENA', 'SIPENA', '-', 'Tidak ada naskah baru'); toast('Tidak ada laporan singkat baru di SIPENA.', 'info'); commit(); return; }
  res.forEach(x => {
    appState.seq.doc += 1;
    const id = `DOC-2026-${String(appState.seq.doc).padStart(3, '0')}`; const date = addDays(todayISO(), x.rdk);
    const doc = {
      document_id: id, document_name: x.n, document_type: x.type, source: 'Komisi XI DPR RI', document_number: x.no, document_date: date,
      upload_date: now, uploaded_by: 'SIPENA (otomatis)', file_size: 512000, pages: 6, ext: 'pdf',
      document_status: 'Diunggah', ocr_status: 'Belum Diproses', extraction_status: 'Belum Diekstraksi', template: x.tpl, topic: x.topic || '', ocr_accuracy: null, extraction: null, saved_plan_ids: [],
      sipena: { agenda: x.agenda, receivedAt: now, pulledAt: now, disp: sipenaDispRecords(x.disp, addDays(date, 2)) }
    };
    appState.documents.push(doc);
    audit('Tarik SIPENA', id, '-', `${x.agenda} · ${doc.sipena.disp.length} disposisi`, doc.sipena.disp.map(d => `${d.from} → ${d.to.map(satkerShort).join(', ')}`).join('; '));
  });
  notify(['admin'], `${res.length} laporan singkat Raker/RDP DPR beserta disposisi ADK ditarik dari SIPENA dan siap diproses.`, 'info', { type: 'doc', id: appState.documents.at(-1).document_id });
  toast(`${res.length} laporan singkat baru ditarik dari SIPENA beserta disposisinya.`);
  commit();
};

/* ------------------------------ Ekstraksi -------------------------------- */
/** Dipanggil setelah strukturisasi LLM: satker mengikuti tujuan disposisi ADK. */
function applyDispositionToItems(doc, items, log = () => { }) {
  if (!isDprDoc(doc)) return;
  if (!doc.sipena) { log('[sipena] Disposisi ADK belum tersedia — satker belum dapat ditetapkan'); items.forEach(it => { it.mapAuto = false; it.satker = ''; it.bidang = it.bidang || ''; it.assignmentStatus = 'Belum Ditugaskan'; }); return; }
  const targets = dispTargets(doc);
  items.forEach(it => {
    // Laporan singkat tidak menyebut satker: hanya topik/bidang poin yang dipakai sebagai petunjuk pemetaan awal
    const hint = it.satker; delete it.llmSatker;
    let s = targets.length === 1 ? targets[0] : null; it.mapAuto = false;
    if (!s && targets.length > 1) { s = targets.includes(hint) ? hint : (targets.find(t => satkerInfo(t)?.bidang === it.bidang) || null); it.mapAuto = !!s; }
    it.satker = s || ''; it.bidang = s ? satkerInfo(s).bidang : it.bidang; it.assignmentStatus = s ? 'Sudah Ditugaskan' : 'Belum Ditugaskan';
    it.dispNo = s ? dispFor(doc, s).no : '';
    if (it.conf) it.conf.satker = s ? 1 : it.conf.satker;
  });
  log(`[sipena] Penanggung jawab ditetapkan dari ${dispList(doc).length} disposisi ADK (${doc.sipena.agenda}) — bukan dari laporan singkat`, true);
}
/** Lampirkan rujukan disposisi ke penugasan baru dari dokumen DPR. */
function attachDisposition(ap, doc, note) {
  if (!isDprDoc(doc) || !doc.sipena) return;
  const x = ap.satker ? dispFor(doc, ap.satker) : null;
  ap.disp = { agenda: doc.sipena.agenda, no: x?.no || '', from: x?.from || '', date: x?.date || '' };
  if (ap.satker && !x) { ap.dispDeviation = { note, by: cu().name, at: new Date().toISOString(), targets: dispTargets(doc) }; audit('Penugasan di Luar Disposisi', ap.id, 'Tujuan disposisi: ' + dispTargets(doc).map(satkerShort).join(', '), ap.satker, note); }
}

/* ------------------------------ Tampilan --------------------------------- */
const sipenaChip = d => isDprDoc(d) ? (d.sipena ? `<div style="margin-top:4px"><span class="badge b-teal" title="Ditarik otomatis dari SIPENA">SIPENA · ${esc(d.sipena.agenda)}</span><div class="small muted">${dispList(d).length} disposisi ADK → ${dispTargets(d).map(satkerShort).join(', ')}</div></div>` : `<div style="margin-top:4px"><span class="badge b-amber">Disposisi SIPENA belum tersedia</span></div>`) : '';
function dispListHTML(d, highlight) {
  if (!isDprDoc(d)) return '';
  if (!d.sipena) return `<div class="ai-banner warn">${icon('alert')}<span>Disposisi ADK untuk laporan singkat ini belum ditarik dari SIPENA. Satker penanggung jawab belum dapat ditetapkan.</span></div>`;
  return `<div class="evi">${dispList(d).map(x => `<div class="evi-item" style="align-items:flex-start;${highlight && x.to.includes(highlight) ? 'border-color:var(--teal, #19A88A);background:var(--success-50)' : ''}">${icon('send')}<div class="grow"><b>${esc(x.from)}</b> → ${x.to.map(t => `<span class="${t === highlight ? '' : 'muted'}">${esc(satkerShort(t))}</span>`).join(', ')}<div class="small mono muted" style="margin-top:2px">${esc(x.no)} · ${fmtDate(x.date)}</div><div class="small" style="margin-top:3px">“${esc(x.isi)}”</div></div></div>`).join('')}</div>
    <div class="small muted" style="margin-top:6px">Agenda SIPENA <span class="mono">${esc(d.sipena.agenda)}</span> · ditarik ${fmtDT(d.sipena.pulledAt)}</div>`;
}
function dispDrawerSection(ap) {
  const pd = planDisp(ap); if (!pd) return '';
  const dev = ap.dispDeviation;
  return `<div class="d-sec"><div class="section-label">Rujukan Disposisi ADK (SIPENA)</div>
    ${pd.deviated ? `<div class="ai-banner red" style="margin-bottom:10px">${icon('alert')}<span><b>Satker di luar tujuan disposisi.</b> ${dev?.note ? 'Alasan: ' + esc(dev.note) + ` <span class="small muted">(${esc(dev.by)}, ${fmtDT(dev.at)})</span>` : 'Belum ada alasan tercatat.'}</span></div>` : pd.disp ? `<div class="ai-banner ok" style="margin-bottom:10px">${icon('checkCircle')}<span>Penugasan sesuai disposisi <b>${esc(pd.disp.from)}</b> · <span class="mono">${esc(pd.disp.no)}</span></span></div>` : ''}
    ${dispListHTML(pd.doc, ap.satker)}</div>`;
}
const dispExport = ap => { const pd = planDisp(ap); if (!pd) return ''; if (!pd.pulled) return 'Belum ditarik'; return pd.disp ? `${pd.disp.no} (${pd.disp.from})` : 'DI LUAR DISPOSISI'; };

/* ------------------------------ Penugasan manual ------------------------- */
/** Validasi saat Admin mengubah satker penugasan dari dokumen DPR. Mengembalikan pesan error atau null. */
function dispAssignCheck(ap, satker, note) {
  const d = findDoc(ap.documentId); if (!isDprDoc(d) || !d.sipena || !satker) return null;
  if (dispFor(d, satker)) return null;
  return note ? null : `Satker ${satkerShort(satker)} tidak termasuk tujuan disposisi ADK (${dispTargets(d).map(satkerShort).join(', ')}). Isi catatan penugasan sebagai alasan.`;
}
function dispAfterAssign(ap, note) {
  const d = findDoc(ap.documentId); if (!isDprDoc(d) || !d.sipena) return;
  const x = ap.satker ? dispFor(d, ap.satker) : null;
  ap.disp = { agenda: d.sipena.agenda, no: x?.no || '', from: x?.from || '', date: x?.date || '' };
  if (ap.satker && !x) { ap.dispDeviation = { note, by: cu().name, at: new Date().toISOString(), targets: dispTargets(d) }; audit('Penugasan di Luar Disposisi', ap.id, 'Tujuan disposisi: ' + dispTargets(d).map(satkerShort).join(', '), ap.satker, note); }
  else delete ap.dispDeviation;
}

/* ------------------------- Format Laporan Singkat DPR ---------------------
   Mengikuti format baku Laporan Singkat Komisi XI DPR RI: kop DPR RI, judul,
   daftar mitra kerja, tabel identitas rapat, lalu KESIMPULAN/KEPUTUSAN.
   Identitas rapat diekstrak OCR dan disimpan di doc.sipena.meta (atau
   diturunkan dari tanggal dokumen untuk data demo). */
const DPR_MITRA = 'BERMITRA DENGAN KEMENTERIAN KEUANGAN, KEMENTERIAN PERENCANAAN PEMBANGUNAN NASIONAL (PPN)/BAPPENAS, BANK INDONESIA (BI), OTORITAS JASA KEUANGAN (OJK): PERBANKAN DAN LEMBAGA KEUANGAN BUKAN BANK (LKBB), LEMBAGA PENJAMIN SIMPANAN (LPS), BADAN PENGAWASAN KEUANGAN DAN PEMBANGUNAN (BPKP), SETJEN BADAN PEMERIKSA KEUANGAN (BPK) RI, LEMBAGA KEBIJAKAN PENGADAAN BARANG/JASA PEMERINTAH (LKPP), LEMBAGA PEMBIAYAAN EKSPOR INDONESIA (LPEI), DAN BUMN (PMN DAN PRIVATISASI), DAN BADAN PENGELOLA INVESTASI (BPI) DAYA ANAGATA NUSANTARA (DANANTARA) DAN PENGELOLAAN HOLDING INVESTASI';
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
function dprMeta(doc) {
  if (doc.sipena?.meta) return doc.sipena.meta;
  const dt = new Date(doc.document_date + 'T00:00:00'); const y = dt.getFullYear(), m = dt.getMonth() + 1;
  const ts = m >= 8 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
  const masa = m >= 8 && m <= 10 ? 1 : (m >= 11 || m <= 2) ? 2 : m <= 4 ? 3 : m <= 5 ? 4 : 5;
  const h = [...doc.document_id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const raker = /raker/i.test(doc.document_type);
  return {
    rapatKe: 8 + (h % 20), tahunSidang: ts, masaSidang: ROMAN[masa],
    jenisRapat: `${raker ? 'Rapat Kerja' : 'Rapat Dengar Pendapat'} / ke-${2 + (h % 6)}`,
    dengan: raker ? 'Ketua Dewan Komisioner Otoritas Jasa Keuangan' : 'Dewan Komisioner Otoritas Jasa Keuangan',
    sifat: 'Terbuka', hari: `${HARI[dt.getDay()]}, ${fmtDateLong(doc.document_date)}`,
    waktu: `Pukul ${['10.00', '13.00', '14.00', '19.00'][h % 4]} WIB s.d. Selesai`,
    tempat: 'Ruang Rapat Komisi XI DPR RI, Gedung Nusantara I', ketua: 'Pimpinan Komisi XI DPR RI',
    acara: doc.extraction?.items?.[0]?.topic || doc.topic || ''
  };
}
const DPR_META_ROWS = [['rapatKe', 'Rapat Ke'], ['tahunSidang', 'Tahun Sidang'], ['masaSidang', 'Masa Persidangan'], ['jenisRapat', 'Jenis Rapat/ke-'], ['dengan', 'Dengan'], ['sifat', 'Sifat Rapat'], ['hari', 'Hari, Tanggal'], ['waktu', 'Waktu'], ['tempat', 'Tempat'], ['ketua', 'Ketua Rapat'], ['acara', 'Acara']];
/** Kalimat kesimpulan yang bukan tindak lanjut (dilewati LLM). */
const dprNonAction = meta => `Komisi XI DPR RI dapat memahami penjelasan ${meta.dengan.replace('Otoritas Jasa Keuangan', 'OJK')} mengenai ${String(meta.acara || 'materi rapat').toLowerCase()}.`;
const lcFirst = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
function dprPaperHTML(doc) {
  const items = doc.extraction?.items || []; const done = doc.ocr_status === 'Selesai' && items.length; const m = dprMeta(doc);
  const hl = v => `<span class="${done ? 'hl' : ''}">${esc(v)}</span>`;
  return `<div class="paper dpr ${done ? '' : 'pending'}">
    ${done ? `<span class="stamp">OCR ${doc.ocr_accuracy ? doc.ocr_accuracy.toFixed(1) + '%' : ''}</span>` : `<span class="stamp" style="color:var(--ink-3);border-color:var(--line);background:#fff">BELUM DIPROSES</span>`}
    <div class="dpr-kop"><div class="emblem" title="Lambang Negara (placeholder)">LAMBANG<br>NEGARA</div><b>DEWAN PERWAKILAN RAKYAT</b><u><b>REPUBLIK INDONESIA</b></u></div>
    <div class="dpr-title"><u>LAPORAN SINGKAT</u><br><u>KOMISI XI DPR RI</u></div>
    <p class="dpr-mitra">${DPR_MITRA.replace('HOLDING', '<i>HOLDING</i>')}</p>
    <table class="meta dpr-meta">${DPR_META_ROWS.map(([k, l]) => `<tr><td>${l}</td><td>:</td><td>${k === 'ketua' ? `<b>${esc(m[k])}</b>` : k === 'sifat' ? `<b>${esc(m[k])}</b>` : ['jenisRapat', 'hari', 'acara', 'rapatKe'].includes(k) ? hl(m[k]) : esc(m[k])}</td></tr>`).join('')}</table>
    <div class="dpr-sec">I. PENDAHULUAN</div>
    <p>Rapat dibuka pukul ${esc(m.waktu.replace('Pukul ', '').split(' ')[0])} WIB oleh ${esc(m.ketua)} dengan agenda ${esc(m.acara || 'sebagaimana tersebut di atas')}.</p>
    <div class="dpr-sec">II. KESIMPULAN/KEPUTUSAN</div>
    ${done ? `<ol><li class="skip" title="Bukan poin tindak lanjut — dilewati LLM">${esc(dprNonAction(m))}</li>${items.map((it, i) => `<li id="pv-li-${i}"><span class="hl">Komisi XI DPR RI meminta OJK untuk ${esc(lcFirst(it.arahan))}</span></li>`).join('')}</ol>`
      : `<div style="display:flex;flex-direction:column;gap:9px;margin:14px 0">${[92, 86, 95, 70, 88, 60].map(w => `<div style="height:9px;width:${w}%;background:#E6EAEE;border-radius:3px"></div>`).join('')}</div>`}
    <p>Rapat ditutup pukul ${esc(['12.30', '16.15', '17.40', '22.05'][(m.rapatKe) % 4])} WIB.</p>
  </div>`;
}
function dprRawText(doc) {
  const items = doc.extraction?.items || []; const m = dprMeta(doc);
  if (doc.ocr_status !== 'Selesai') return 'Dokumen belum melalui proses OCR.\nKlik "Process Document" untuk menjalankan OCR dan ekstraksi.';
  return [`--- halaman 1/${doc.pages} ---`, '[lambang negara]', 'DEWAN PERWAKILAN RAKYAT', 'REPUBLIK INDONESIA', '', 'LAPORAN SINGKAT', 'KOMISI XI DPR RI', '', DPR_MITRA, '',
    ...DPR_META_ROWS.map(([k, l]) => `${l.padEnd(17)}: ${m[k]}`), '', 'I. PENDAHULUAN', `Rapat dibuka oleh ${m.ketua} dengan agenda ${m.acara}.`, '',
    `--- halaman 2/${doc.pages} ---`, 'II. KESIMPULAN/KEPUTUSAN', `1. ${dprNonAction(m)}`, ...items.map((it, i) => `${i + 2}. Komisi XI DPR RI meminta OJK untuk ${lcFirst(it.arahan)}`), '', 'Rapat ditutup.'].join('\n');
}
function dprInfoHTML(doc) {
  if (!isDprDoc(doc)) return ''; const m = dprMeta(doc);
  return `<div class="dl"><dt>Rapat</dt><dd>Rapat ke-${esc(m.rapatKe)} · ${esc(m.jenisRapat)}</dd></div>
    <div class="dl"><dt>Tahun Sidang / Masa Persidangan</dt><dd>${esc(m.tahunSidang)} · Masa Persidangan ${esc(m.masaSidang)}</dd></div>
    <div class="dl"><dt>Dengan</dt><dd>${esc(m.dengan)}</dd></div>
    <div class="dl"><dt>Sifat / Waktu</dt><dd>${esc(m.sifat)} · ${esc(m.waktu)}</dd></div>`;
}
