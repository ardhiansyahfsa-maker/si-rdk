/* =========================================================================
   SI-RDK · sipena.js — Integrasi SIPENA (disposisi ADK)
   Berlaku KHUSUS untuk Laporan Singkat Raker/RDP dengan DPR (sumber Komisi XI).
   · Laporan singkat beserta disposisi ADK ditarik otomatis dari SIPENA.
   · Satker penanggung jawab ditetapkan dari tujuan disposisi ADK — bukan dari
     usulan LLM. LLM hanya memecah laporan singkat menjadi poin-poin arahan.
   · Penugasan ke satker di luar tujuan disposisi ditandai dan wajib beralasan.
   Prototipe: penarikan disimulasikan (api.pullSipena); kontrak data mengikuti
   SIPENA_CONTRACT sehingga dapat diganti panggilan API SIPENA sebenarnya.
   Arahan RDK (Risalah RDK / ND Arahan DK) tidak memakai disposisi SIPENA.
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
  { n: 'Laporan Singkat Raker Komisi XI - Pengawasan Pinjaman Daring dan Pembiayaan.pdf', type: 'Laporan Singkat Raker', no: 'LS/RAKER/XI/2026/11', agenda: 'SIPENA-2026-08831', rdk: -4, tpl: 'lpbbti',
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
      document_status: 'Diunggah', ocr_status: 'Belum Diproses', extraction_status: 'Belum Diekstraksi', template: x.tpl, topic: '', ocr_accuracy: null, extraction: null, saved_plan_ids: [],
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
  if (!doc.sipena) { log('[sipena] Disposisi ADK belum tersedia — satker belum dapat ditetapkan'); items.forEach(it => { it.llmSatker = it.satker; it.satker = ''; it.bidang = it.bidang || ''; it.assignmentStatus = 'Belum Ditugaskan'; }); return; }
  const targets = dispTargets(doc);
  items.forEach(it => {
    it.llmSatker = it.satker;
    let s = targets.includes(it.satker) ? it.satker : null;
    if (!s) { const sameB = targets.find(t => satkerInfo(t)?.bidang === it.bidang); s = sameB || (targets.length === 1 ? targets[0] : null); }
    it.satker = s || ''; it.bidang = s ? satkerInfo(s).bidang : it.bidang; it.assignmentStatus = s ? 'Sudah Ditugaskan' : 'Belum Ditugaskan';
    it.dispNo = s ? dispFor(doc, s).no : '';
    if (it.conf) it.conf.satker = s ? 1 : it.conf.satker;
  });
  log(`[sipena] Satker ditetapkan dari ${dispList(doc).length} disposisi ADK (${doc.sipena.agenda}) · usulan LLM hanya sebagai pembanding`, true);
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
