/* =========================================================================
   SI-RDK · documents.js — Dokumen Rujukan, upload pipeline, simulated
   OCR → text extraction → LLM structuring, Document Intelligence page.
   ========================================================================= */

const UPLOAD_STAGES = ['Uploading', 'OCR Processing', 'Extracting', 'Structuring', 'Completed'];
const ACCEPT_EXT = ['pdf', 'docx', 'doc', 'png', 'jpg', 'jpeg', 'tif', 'tiff'];
const docExt = d => (d.ext || d.document_name.split('.').pop() || '').toLowerCase();
const docIcon = d => { const e = docExt(d); const c = e === 'pdf' ? 'pdf' : (e === 'docx' || e === 'doc') ? 'docx' : 'img'; return `<span class="doc-ic ${c}">${esc(e.toUpperCase().slice(0, 4))}</span>`; };
const docArahanCount = d => appState.actionPlans.filter(a => a.documentId === d.document_id).length || (d.extraction ? d.extraction.items.length : 0);

/* --------------------------- Processing core ----------------------------- */
async function processDocument(doc, onStage, onLog) {
  const log = onLog || (() => { });
  const prev = doc.extraction_status;
  doc.ocr_status = 'Sedang Diproses'; doc.document_status = 'Diproses'; doc.extraction_status = 'Sedang Diekstraksi';
  log(`[ocr] Memuat ${doc.pages} halaman dari ${doc.document_name}`);
  let shown = 0;
  const ocr = await api.runOCR(doc, p => {
    onStage(1, p);
    const page = Math.min(doc.pages, Math.floor(p * doc.pages));
    while (shown < page) { shown++; log(`[ocr] Halaman ${shown}/${doc.pages} dikenali · keyakinan ${(95 + Math.random() * 4.5).toFixed(1)}%`); }
  });
  doc.ocr_accuracy = ocr.accuracy;
  log(`[ocr] Selesai · akurasi rata-rata ${ocr.accuracy}%`, true);
  const tx = await api.extractText(doc, p => onStage(2, p));
  log(`[text] Normalisasi teks, ${tx.paragraphs} paragraf, deteksi struktur "Pokok-pokok Arahan"`, true);
  log('[llm] Skema keluaran: arahan_rdk.v2 (9 field + prioritas + usulan target)');
  let said = false;
  const items = await api.structureWithLLM(doc, p => { onStage(3, p); if (p > .55 && !said) { said = true; log('[llm] Memetakan bidang dan satker penanggung jawab ke master data'); } });
  log(`[llm] ${items.length} poin arahan teridentifikasi`, true);
  items.forEach((it, i) => log(`[llm]  #${i + 1} → ${it.satker || 'satker belum teridentifikasi'} (${Math.round((it.conf.satker || .8) * 100)}%)`));
  doc.ocr_status = 'Selesai'; doc.document_status = 'Selesai'; doc.extraction_status = 'Perlu Review';
  doc.topic = items[0]?.topic || doc.topic;
  doc.extraction = { runAt: new Date().toISOString(), model: 'SI-RDK Extractor v2 (simulasi)', items };
  audit('Ekstraksi Dokumen', doc.document_id, prev, 'Perlu Review', `${items.length} poin arahan teridentifikasi · akurasi OCR ${ocr.accuracy}%`);
  return items;
}

/** Modal used by "Process Document" and "Re-run Extraction" (§12). */
function openProcessModal(docId, { rerun = false } = {}) {
  const doc = findDoc(docId); if (!doc) return;
  const stages = [{ label: 'OCR Processing', to: 70 }, { label: 'Text Extraction', to: 85 }, { label: 'LLM Structuring', to: 95 }, { label: 'Completed', to: 100 }];
  const m = openModal({
    title: rerun ? 'Re-run Extraction' : 'Process Document', sub: esc(doc.document_name), dismissible: false, size: '',
    body: `<div class="proc-stages">${stages.map((s, i) => `<div class="proc-stage" id="ps-${i}"><span class="st-ic"></span><span>${s.label}</span><span class="pct">—</span></div>`).join('')}</div>
      <div class="proc-bar"><i id="proc-fill"></i></div><div class="small muted" style="display:flex;justify-content:space-between"><span id="proc-label">Menyiapkan…</span><span class="tnum" id="proc-pct">0%</span></div>
      <div class="proc-log" id="proc-log"></div>`,
    foot: [{ label: 'Tinjau Hasil Ekstraksi', cls: 'primary', icon: 'arrowRight', id: 'proc-done', onClick: mm => { mm.close(); ui.ocr.doc = docId; ui.ocr.edit = false; if (ui.route === 'ocr') renderPage(true); else go('ocr', { doc: docId }); } }]
  });
  const doneBtn = $('#proc-done', m.el); doneBtn.disabled = true;
  const setStage = (idx, p) => {
    const from = idx === 0 ? 0 : stages[idx - 1].to; const val = Math.round(from + (stages[idx].to - from) * p);
    stages.forEach((s, i) => { const el = $('#ps-' + i, m.el); if (!el) return; el.className = 'proc-stage ' + (i < idx ? 'done' : i === idx ? 'active' : ''); if (i < idx) { el.querySelector('.st-ic').innerHTML = icon('check', 'sm'); el.querySelector('.pct').textContent = stages[i].to + '%'; } });
    const cur = $('#ps-' + idx, m.el); if (cur) cur.querySelector('.pct').textContent = val + '%';
    $('#proc-fill', m.el).style.width = val + '%'; $('#proc-pct', m.el).textContent = val + '%'; $('#proc-label', m.el).textContent = stages[idx].label + '…';
  };
  const log = (t, ok) => { const box = $('#proc-log', m.el); if (!box) return; box.insertAdjacentHTML('beforeend', `<div class="${ok ? 'ok' : ''}">${esc(t)}</div>`); box.scrollTop = box.scrollHeight; };
  log(`[job] ${rerun ? 'Re-run' : 'Proses'} ${doc.document_id} dimulai oleh ${cu().name}`);
  const job = processDocument(doc, (stage, p) => setStage(stage - 1, p), log);
  renderPageIfDocs();
  job.then(items => {
    setStage(3, 1);
    const el = $('#ps-3', m.el); if (el) { el.className = 'proc-stage done'; el.querySelector('.st-ic').innerHTML = icon('check', 'sm'); }
    $('#proc-label', m.el).textContent = `Completed ✓ — ${items.length} poin arahan siap direview`;
    log('[job] Completed ✓', true);
    doneBtn.disabled = false;
    notify(['admin'], `Ekstraksi ${doc.document_id} selesai: ${items.length} poin arahan perlu direview.`, 'info', { type: 'doc', id: doc.document_id });
    toast('Dokumen berhasil diproses.');
    commit();
  });
}
function renderPageIfDocs() { if (['documents', 'ocr'].includes(ui.route)) renderPage(true); }

/* ------------------------------ Upload ----------------------------------- */
function startUploads(files) {
  if (!isRole('admin')) { toast('Hanya Admin / MRDK yang dapat mengunggah dokumen.', 'error'); return; }
  const meta = readUploadMeta();
  Array.from(files).forEach(file => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPT_EXT.includes(ext)) { toast(`Format .${ext} tidak didukung. Gunakan PDF, DOCX, atau gambar hasil pindai.`, 'error'); return; }
    if (file.size > 25 * 1048576) { toast(`${file.name} melebihi batas 25 MB.`, 'error'); return; }
    runUploadJob(file, meta);
  });
}
function readUploadMeta() {
  const m = ui.uploadMeta;
  ['source', 'type', 'number', 'date'].forEach(k => { const el = $('#up-' + k); if (el) m[k] = el.value; });
  return { ...m };
}
async function runUploadJob(file, meta) {
  const job = { id: 'J' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: file.name, size: file.size, stage: 0, pct: 0, status: 'running', docId: null, count: 0 };
  ui.uploads.unshift(job);
  renderQueue();
  const upd = (stage, p) => { job.stage = stage; job.pct = p; paintJob(job); };
  try {
    const doc = await api.uploadDocument(file, meta, p => upd(0, p));
    appState.documents.unshift(doc);
    job.docId = doc.document_id;
    audit('Upload Dokumen', doc.document_id, '-', doc.document_name);
    saveState();
    if (ui.route === 'documents') refreshDocTable();
    const items = await processDocument(doc, upd);
    job.stage = 4; job.pct = 1; job.status = 'done'; job.count = items.length;
    notify(['admin'], `Dokumen ${doc.document_id} selesai diproses: ${items.length} poin arahan perlu direview.`, 'info', { type: 'doc', id: doc.document_id });
    toast('Dokumen berhasil diproses.');
    commit();
  } catch (e) {
    job.status = 'error'; paintJob(job); toast('Pemrosesan dokumen gagal: ' + (e.message || e), 'error');
  }
}
function jobHTML(j) {
  return `<div class="q-item" id="job-${j.id}">
    <div class="q-top"><span style="display:flex;gap:10px;align-items:center;min-width:0">${icon('file')}<span class="q-name">${esc(j.name)}</span></span>
      <span class="small muted nowrap">${fmtSize(j.size)}</span></div>
    <div class="mini-steps">${UPLOAD_STAGES.map((s, i) => `<div class="ms ${i < j.stage || j.status === 'done' ? 'done' : i === j.stage ? 'active' : ''}"><i><em style="width:${i < j.stage || j.status === 'done' ? 100 : i === j.stage ? Math.round(j.pct * 100) : 0}%"></em></i>${s}</div>`).join('')}</div>
    ${j.status === 'done' ? `<div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;gap:8px;flex-wrap:wrap"><span class="small" style="color:var(--success-ink)">${icon('checkCircle', 'sm')} Completed · ${j.count} poin arahan diekstraksi</span><button class="btn xs primary" data-act="viewDoc" data-id="${j.docId}">Tinjau hasil ${icon('arrowRight', 'sm')}</button></div>` : ''}
    ${j.status === 'error' ? `<div class="small" style="color:var(--danger-ink);margin-top:8px">Gagal diproses.</div>` : ''}
  </div>`;
}
function paintJob(j) { const el = document.getElementById('job-' + j.id); if (el) el.outerHTML = jobHTML(j); }
function renderQueue() {
  const box = $('#upload-queue'); if (!box) return;
  box.innerHTML = ui.uploads.length ? ui.uploads.slice(0, 6).map(jobHTML).join('') : `<div class="empty" style="padding:28px 12px"><b>Belum ada unggahan pada sesi ini</b>Dokumen yang diunggah diproses otomatis: Uploading → OCR → Extracting → Structuring → Completed.</div>`;
}

/* --------------------------- Dokumen Rujukan ----------------------------- */
function filteredDocs() {
  const f = ui.docs; const q = f.q.trim().toLowerCase();
  let rows = appState.documents.filter(d =>
    (!q || [d.document_id, d.document_name, d.source, d.document_type, d.document_number, d.uploaded_by].some(v => String(v || '').toLowerCase().includes(q))) &&
    (!f.type || d.document_type === f.type) && (!f.source || d.source === f.source) && (!f.status || d.ocr_status === f.status || d.extraction_status === f.status));
  const k = f.sort.key, dir = f.sort.dir;
  const val = d => k === 'count' ? docArahanCount(d) : String(d[k] ?? '');
  rows.sort((a, b) => { const x = val(a), y = val(b); return (typeof x === 'number' ? x - y : x.localeCompare(y)) * dir; });
  return rows;
}
function docTableHTML() {
  const rows = filteredDocs();
  const admin = isRole('admin');
  if (!rows.length) return `<div class="empty"><b>Tidak ada dokumen yang cocok</b>Ubah kata kunci atau filter.</div>`;
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>No</th><th>Nama Dokumen</th><th>Tanggal</th><th>Sumber</th><th>Jenis Dokumen</th><th>Status OCR</th><th>Status Ekstraksi</th><th class="num">Jumlah Arahan</th><th>Uploader</th><th>Action</th></tr></thead><tbody>
  ${rows.map((d, i) => {
    const busy = d.ocr_status === 'Sedang Diproses';
    return `<tr>
    <td data-label="No" class="tnum">${i + 1}</td>
    <td data-label="" class="full"><div class="doc-name">${docIcon(d)}<span style="min-width:0"><b>${esc(d.document_name)}</b><small class="mono">${d.document_id}</small><small> · ${fmtSize(d.file_size)} · ${d.pages} hlm</small></span></div></td>
    <td data-label="Tanggal"><span class="nowrap tnum">${fmtDate(d.document_date)}</span><div class="small muted nowrap">unggah ${fmtDate(tsDay(d.upload_date))}</div></td>
    <td data-label="Sumber">${esc(d.source)}</td><td data-label="Jenis">${esc(d.document_type)}</td>
    <td data-label="Status OCR">${badge(d.ocr_status)}${d.ocr_accuracy ? `<div class="small muted tnum">akurasi ${d.ocr_accuracy.toFixed(1)}%</div>` : ''}</td>
    <td data-label="Status Ekstraksi">${badge(d.extraction_status)}</td>
    <td data-label="Jumlah Arahan" class="num tnum"><b>${docArahanCount(d)}</b></td>
    <td data-label="Uploader">${esc(d.uploaded_by)}</td>
    <td data-label="Action"><div class="btn-group" style="flex-wrap:nowrap;gap:4px">
      <button class="btn xs" data-act="viewDoc" data-id="${d.document_id}" title="Lihat dokumen & hasil ekstraksi">${icon('eye', 'sm')}View</button>
      ${admin ? `<button class="btn xs ${d.ocr_status === 'Belum Diproses' ? 'primary' : ''}" data-act="processDoc" data-id="${d.document_id}" ${busy ? 'disabled' : ''}>${icon('sparkles', 'sm')}${d.ocr_status === 'Belum Diproses' ? 'Process' : 'Re-run'}</button>
      <button class="btn xs ghost" data-act="deleteDoc" data-id="${d.document_id}" title="Hapus dokumen" aria-label="Hapus ${esc(d.document_id)}" ${busy ? 'disabled' : ''}>${icon('trash', 'sm')}</button>` : ''}
    </div></td></tr>`;
  }).join('')}</tbody></table></div><div class="tbl-foot"><span>${rows.length} dari ${appState.documents.length} dokumen</span><span class="muted">Klik View untuk membuka Document Intelligence</span></div>`;
}
function refreshDocTable() { const el = $('#doc-table'); if (el) el.innerHTML = docTableHTML(); }

registerPage('documents', {
  render() {
    const admin = isRole('admin'); const m = ui.uploadMeta; const ms = appState.masters;
    const f = ui.docs;
    const sortVal = `${f.sort.key}:${f.sort.dir}`;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Dokumen · Dokumen Rujukan</div><h1>Dokumen Rujukan</h1><div class="sub">Naskah arahan RDK, laporan Komisi XI, dan rujukan lain yang menjadi dasar rencana aksi.</div></div>
        ${admin ? '' : `<span class="readonly-note">${icon('lock', 'sm')}Mode baca saja</span>`}</div>
      ${admin ? `<section class="panel"><div class="panel-head"><div><h3>Upload Dokumen</h3><div class="desc">PDF, DOCX, atau hasil pindai (JPG/PNG/TIFF), maks. 25 MB per berkas. Dokumen diproses otomatis setelah diunggah.</div></div></div>
        <div class="panel-body"><div class="upload-grid">
          <div style="display:flex;flex-direction:column;gap:12px">
            <div class="form-grid">
              <div class="field"><label for="up-source">Sumber</label><select class="select" id="up-source">${ms.sources.map(s => `<option ${s === m.source ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
              <div class="field"><label for="up-type">Jenis Dokumen</label><select class="select" id="up-type">${ms.types.map(s => `<option ${s === m.type ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
              <div class="field"><label for="up-number">Nomor Dokumen</label><input class="input" id="up-number" placeholder="mis. No. 34/RDK/2026" value="${esc(m.number || '')}"></div>
              <div class="field"><label for="up-date">Tanggal Dokumen</label><input class="input" type="date" id="up-date" value="${esc(m.date || todayISO())}"></div>
            </div>
            <label class="dropzone" id="dropzone" for="file-input" tabindex="0">
              <span class="big-ic">${icon('upload', 'lg')}</span><b>Seret & lepas dokumen di sini</b><small>atau <u>pilih berkas</u> dari komputer · dapat lebih dari satu berkas</small>
              <input type="file" id="file-input" multiple accept=".pdf,.docx,.doc,.png,.jpg,.jpeg,.tif,.tiff" hidden>
            </label>
            <div class="small muted">Contoh untuk demo: unggah berkas apa pun bernama “…asuransi….pdf” atau “…perbankan….pdf” untuk melihat hasil ekstraksi yang berbeda.</div>
          </div>
          <div><div class="section-label" style="margin-bottom:10px">Antrian Pemrosesan</div><div class="queue" id="upload-queue"></div></div>
        </div></div></section>` : ''}
      <section class="panel">
        <div class="panel-head"><div><h3>Daftar Dokumen</h3><div class="desc">${appState.documents.length} dokumen · ${appState.documents.filter(d => d.ocr_status !== 'Selesai').length} belum diproses · ${appState.documents.filter(d => d.extraction_status === 'Perlu Review').length} perlu review</div></div>${exportButtons('documents')}</div>
        <div class="toolbar">
          <div class="grow">${icon('search')}<input class="input" id="doc-q" placeholder="Cari nama, nomor, sumber, uploader…" value="${esc(f.q)}" data-input="docFilter"></div>
          <select class="select sm" id="doc-type" data-change="docFilter" aria-label="Filter jenis"><option value="">Semua jenis</option>${ms.types.map(s => `<option ${f.type === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <select class="select sm" id="doc-source" data-change="docFilter" aria-label="Filter sumber"><option value="">Semua sumber</option>${ms.sources.map(s => `<option ${f.source === s ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select>
          <select class="select sm" id="doc-status" data-change="docFilter" aria-label="Filter status"><option value="">Semua status</option>${['Belum Diproses', 'Selesai', 'Perlu Review', 'Tersimpan di Register'].map(s => `<option ${f.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
          <select class="select sm" id="doc-sort" data-change="docFilter" aria-label="Urutkan">${[['upload_date:-1', 'Terbaru diunggah'], ['upload_date:1', 'Terlama diunggah'], ['document_date:-1', 'Tanggal dokumen terbaru'], ['document_name:1', 'Nama A–Z'], ['count:-1', 'Jumlah arahan terbanyak']].map(([v, l]) => `<option value="${v}" ${sortVal === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
        </div>
        <div id="doc-table">${docTableHTML()}</div>
      </section>
    </div>`;
  },
  mount() {
    renderQueue();
    const dz = $('#dropzone'); if (!dz) return;
    const fi = $('#file-input');
    fi.addEventListener('change', () => { if (fi.files.length) startUploads(fi.files); fi.value = ''; });
    ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', e => { if (e.dataTransfer.files.length) startUploads(e.dataTransfer.files); });
    dz.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } });
    ['up-source', 'up-type', 'up-number', 'up-date'].forEach(id => $('#' + id).addEventListener('change', readUploadMeta));
  }
});
Actions.docFilter = debounce(() => {
  const f = ui.docs; f.q = $('#doc-q').value; f.type = $('#doc-type').value; f.source = $('#doc-source').value; f.status = $('#doc-status').value;
  const [k, d] = $('#doc-sort').value.split(':'); f.sort = { key: k, dir: +d };
  refreshDocTable();
}, 120);
Actions.viewDoc = el => { ui.ocr.doc = el.dataset.id; ui.ocr.edit = false; go('ocr', { doc: el.dataset.id }); };
Actions.processDoc = el => {
  const d = findDoc(el.dataset.id); if (!d) return;
  if (d.ocr_status === 'Belum Diproses') openProcessModal(d.document_id);
  else confirmDialog({ title: 'Jalankan ulang ekstraksi?', message: `Hasil ekstraksi <b>${esc(d.document_id)}</b> akan diganti dengan hasil baru. Rencana aksi yang sudah ada di register tidak berubah.`, confirmLabel: 'Re-run Extraction', onConfirm: () => openProcessModal(d.document_id, { rerun: true }) });
};
Actions.deleteDoc = el => {
  const d = findDoc(el.dataset.id); if (!d) return;
  const n = appState.actionPlans.filter(a => a.documentId === d.document_id).length;
  confirmDialog({
    title: 'Hapus dokumen?', tone: 'danger', confirmLabel: 'Hapus dokumen',
    message: `<b>${esc(d.document_name)}</b> akan dihapus dari daftar dokumen rujukan.${n ? ` <br><br>${n} rencana aksi yang berasal dari dokumen ini <b>tetap tersimpan</b> di register dengan referensi nama dokumen.` : ''}`,
    note: { label: 'Alasan penghapusan', required: true, placeholder: 'mis. dokumen duplikat / salah unggah', error: '⚠ Alasan penghapusan wajib diisi.' },
    onConfirm: reason => {
      appState.documents = appState.documents.filter(x => x !== d);
      appState.actionPlans.filter(a => a.documentId === d.document_id).forEach(a => { a.documentName = d.document_name + ' (dihapus)'; });
      if (ui.ocr.doc === d.document_id) ui.ocr.doc = null;
      audit('Hapus Dokumen', d.document_id, d.document_name, '-', reason);
      toast('Dokumen berhasil dihapus.');
      commit();
    }
  });
};
Exporters.documents = () => ({
  name: 'Dokumen_Rujukan', sheet: 'Dokumen', title: 'Daftar Dokumen Rujukan', subtitle: `${filteredDocs().length} dokumen`, rows: filteredDocs(),
  columns: [
    { label: 'ID Dokumen', get: d => d.document_id, w: 14 }, { label: 'Nama Dokumen', get: d => d.document_name, w: 60 }, { label: 'Nomor', get: d => d.document_number, w: 20 },
    { label: 'Tanggal Dokumen', get: d => d.document_date, w: 14 }, { label: 'Sumber', get: d => d.source, w: 26 }, { label: 'Jenis Dokumen', get: d => d.document_type, w: 24 },
    { label: 'Status OCR', get: d => d.ocr_status, w: 14 }, { label: 'Status Ekstraksi', get: d => d.extraction_status, w: 20 }, { label: 'Jumlah Arahan', get: d => docArahanCount(d), w: 12 },
    { label: 'Uploader', get: d => d.uploaded_by, w: 18 }, { label: 'Tanggal Unggah', get: d => fmtDT(d.upload_date), w: 18 }
  ]
});

/* ------------------------- Document Intelligence ------------------------- */
const EX_FIELDS = [
  ['rdkDate', 'Tanggal RDK'], ['topic', 'Topik RDK'], ['arahan', 'Poin Arahan / Penugasan'], ['bidang', 'Bidang Penanggung Jawab'], ['satker', 'Satker Penanggung Jawab'],
  ['assignmentStatus', 'Status Penugasan'], ['respon', 'Respon / Selesai'], ['completedDate', 'Tanggal Selesai'], ['tindakLanjut', 'Tindak Lanjut']
];
function pickOcrDoc() {
  let id = ui.params.doc || ui.ocr.doc;
  if (!id || !findDoc(id)) {
    const docs = appState.documents;
    id = (docs.find(d => d.extraction_status === 'Perlu Review') || docs.find(d => d.ocr_status === 'Belum Diproses') || docs[0] || {}).document_id;
  }
  if (ui.ocr.doc !== id) { ui.ocr.edit = false; }
  ui.ocr.doc = id; ui.params.doc = id;
  return id ? findDoc(id) : null;
}
function paperHTML(doc) {
  const items = doc.extraction?.items || [];
  const done = doc.ocr_status === 'Selesai' && items.length;
  const rdk = items[0]?.rdkDate || doc.document_date;
  const topic = items[0]?.topic || doc.topic || '—';
  return `<div class="paper ${done ? '' : 'pending'}">
    ${done ? `<span class="stamp">OCR ${doc.ocr_accuracy ? doc.ocr_accuracy.toFixed(1) + '%' : ''}</span>` : `<span class="stamp" style="color:var(--ink-3);border-color:var(--line);background:#fff">BELUM DIPROSES</span>`}
    <div class="lh"><img class="logo-img " src="assets/logo-ojk.png?v=9" alt="Otoritas Jasa Keuangan" style="height:44px"></div>
    <h4>${esc(doc.document_type)}</h4><div class="nomor">${esc(doc.document_number || '')}</div>
    <table class="meta"><tr><td>Hari/Tanggal</td><td>:</td><td><span class="${done ? 'hl' : ''}">${fmtDateLong(rdk)}</span></td></tr>
      <tr><td>Agenda</td><td>:</td><td><span class="${done ? 'hl' : ''}">${esc(topic)}</span></td></tr>
      <tr><td>Sumber</td><td>:</td><td>${esc(doc.source)}</td></tr></table>
    <p>Dengan memperhatikan pembahasan dalam rapat, disampaikan pokok-pokok arahan sebagai berikut:</p>
    ${done ? `<ol>${items.map((it, i) => `<li id="pv-li-${i}"><span class="hl">${esc(it.arahan)}</span>${it.satker ? ` Penanggung jawab: <span class="hl">${esc(it.satker)}</span>.` : ''}</li>`).join('')}</ol>`
      : `<div style="display:flex;flex-direction:column;gap:9px;margin:14px 0">${[92, 86, 95, 70, 88, 60].map(w => `<div style="height:9px;width:${w}%;background:#E6EAEE;border-radius:3px"></div>`).join('')}</div>`}
    <p>Seluruh satuan kerja diminta menyampaikan perkembangan tindak lanjut melalui SI-RDK secara berkala.</p>
    <div class="sign">Jakarta, ${fmtDateLong(doc.document_date)}<br>Sekretariat Dewan Komisioner<br><br><br><i>(ditandatangani secara elektronik)</i></div>
  </div>`;
}
function ocrRawText(doc) {
  const items = doc.extraction?.items || [];
  if (doc.ocr_status !== 'Selesai') return 'Dokumen belum melalui proses OCR.\nKlik "Process Document" untuk menjalankan OCR dan ekstraksi.';
  return [`--- halaman 1/${doc.pages} ---`, 'OTORITAS JASA KEUANGAN', 'REPUBLIK INDONESIA', '', doc.document_type.toUpperCase(), doc.document_number || '', '',
    `Hari/Tanggal : ${fmtDateLong(items[0]?.rdkDate || doc.document_date)}`, `Agenda       : ${items[0]?.topic || doc.topic}`, `Sumber       : ${doc.source}`, '',
    'Dengan memperhatikan pembahasan dalam rapat, disampaikan pokok-pokok arahan sebagai berikut:',
    ...items.map((it, i) => `${i + 1}. ${it.arahan}${it.satker ? ' Penanggung jawab: ' + it.satker + '.' : ''}`), '',
    `--- halaman 2/${doc.pages} ---`, 'Seluruh satuan kerja diminta menyampaikan perkembangan tindak lanjut melalui SI-RDK secara berkala.', '',
    `Jakarta, ${fmtDateLong(doc.document_date)}`, 'Sekretariat Dewan Komisioner', '(ditandatangani secara elektronik)'].join('\n');
}
function confTag(v) { if (v == null) return ''; const p = Math.round(v * 100); return `<span class="conf ${p < 85 ? 'mid' : ''}" title="Tingkat keyakinan model">${p}%</span>`; }
function exItemHTML(it, i, edit, doc) {
  const sats = appState.masters.satker; const bidangs = [...new Set(sats.map(s => s.bidang))];
  const ro = (k, v) => `<div class="dl ${k === 'arahan' || k === 'tindakLanjut' || k === 'topic' ? 'span-2' : ''}"><dt>${EX_FIELDS.find(f => f[0] === k)[1]} ${confTag(it.conf?.[k])}</dt><dd>${v}</dd></div>`;
  const inp = (k, html) => `<div class="field ${k === 'arahan' || k === 'tindakLanjut' || k === 'topic' ? 'span-2' : ''}"><label for="ex-${i}-${k}">${EX_FIELDS.find(f => f[0] === k)[1]}</label>${html}</div>`;
  const body = edit ? `<div class="form-grid">
      ${inp('rdkDate', `<input class="input" type="date" id="ex-${i}-rdkDate" value="${esc(it.rdkDate)}">`)}
      ${inp('assignmentStatus', `<input class="input" id="ex-${i}-assignmentStatus" value="${esc(it.satker ? 'Sudah Ditugaskan' : 'Belum Ditugaskan')}" disabled>`)}
      ${inp('topic', `<select class="select" id="ex-${i}-topic">${[...new Set([it.topic, ...appState.masters.topics])].map(t => `<option ${t === it.topic ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>`)}
      ${inp('arahan', `<textarea class="textarea" id="ex-${i}-arahan">${esc(it.arahan)}</textarea>`)}
      ${inp('bidang', `<select class="select" id="ex-${i}-bidang"><option value="">— Belum ditetapkan —</option>${bidangs.map(b => `<option ${b === it.bidang ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select>`)}
      ${inp('satker', `<select class="select" id="ex-${i}-satker" data-change="exSatker" data-i="${i}"><option value="">— Belum ditugaskan —</option>${sats.map(s => `<option ${s.name === it.satker ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>`)}
      ${inp('respon', `<input class="input" id="ex-${i}-respon" value="${esc(it.respon)}">`)}
      ${inp('completedDate', `<input class="input" type="date" id="ex-${i}-completedDate" value="${esc(it.completedDate)}">`)}
      ${inp('tindakLanjut', `<textarea class="textarea" id="ex-${i}-tindakLanjut" style="min-height:60px">${esc(it.tindakLanjut)}</textarea>`)}
      <div class="field"><label for="ex-${i}-priority">Prioritas</label><select class="select" id="ex-${i}-priority">${PRIORITIES.map(p => `<option ${p === it.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="field"><label for="ex-${i}-targetDate">Usulan Target Selesai</label><input class="input" type="date" id="ex-${i}-targetDate" value="${esc(it.targetDate)}"></div>
    </div>`
    : `<dl class="dl-grid" style="margin:0">
      ${ro('rdkDate', fmtDateLong(it.rdkDate))}${ro('assignmentStatus', badge(it.satker ? 'Sudah Ditugaskan' : 'Belum Ditugaskan'))}
      ${ro('topic', esc(it.topic))}${ro('arahan', `“${esc(it.arahan)}”`)}
      ${ro('bidang', esc(it.bidang || '—'))}${ro('satker', it.satker ? esc(it.satker) : '<span style="color:var(--warn-ink)">Belum teridentifikasi</span>')}
      ${ro('respon', esc(it.respon || '—'))}${ro('completedDate', fmtDate(it.completedDate))}
      ${ro('tindakLanjut', esc(it.tindakLanjut || '—'))}
      <div class="dl"><dt>Prioritas (usulan)</dt><dd><span class="prio ${it.priority}">${it.priority.toUpperCase()}</span></dd></div>
      <div class="dl"><dt>Target selesai (usulan)</dt><dd>${fmtDate(it.targetDate)}</dd></div>
    </dl>`;
  const canSave = isRole('admin') && doc.extraction_status !== 'Tersimpan di Register';
  return `<div class="ex-card ${it.include === false ? 'excluded' : ''}" data-i="${i}">
    <div class="ex-head"><b>Poin Arahan ${i + 1} dari ${doc.extraction.items.length}</b>
      ${canSave ? `<label class="check small"><input type="checkbox" data-change="exInclude" data-i="${i}" ${it.include !== false ? 'checked' : ''}>Simpan ke register</label>` : ''}</div>
    <div class="ex-body">${body}</div></div>`;
}

registerPage('ocr', {
  render() {
    const doc = pickOcrDoc();
    if (!doc) return `<div class="page"><div class="page-head"><div><div class="crumb">Dokumen · OCR & Extraction</div><h1>Document Intelligence</h1></div></div><div class="panel"><div class="empty"><b>Belum ada dokumen</b>Unggah dokumen rujukan terlebih dahulu.</div></div></div>`;
    const admin = isRole('admin');
    const items = doc.extraction?.items || [];
    const processed = doc.ocr_status === 'Selesai' && doc.extraction;
    const busy = doc.ocr_status === 'Sedang Diproses';
    const saved = doc.extraction_status === 'Tersimpan di Register';
    const plans = appState.actionPlans.filter(a => a.documentId === doc.document_id);
    const low = items.filter(it => Object.values(it.conf || {}).some(v => v < .85)).length;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Dokumen · OCR & Extraction</div><h1>Document Intelligence</h1><div class="sub">Pratinjau dokumen di kiri, hasil OCR dan strukturisasi LLM di kanan.</div></div>
        <div class="btn-group">
          <select class="select sm" data-change="ocrPick" aria-label="Pilih dokumen" style="max-width:340px">${appState.documents.map(d => `<option value="${d.document_id}" ${d.document_id === doc.document_id ? 'selected' : ''}>${d.document_id} · ${esc(d.document_name.slice(0, 48))}${d.document_name.length > 48 ? '…' : ''}</option>`).join('')}</select>
        </div></div>
      ${admin && processed ? `<div class="btn-group">
          ${ui.ocr.edit ? `<button class="btn sm primary" data-act="exSave">${icon('check')}Simpan Perubahan</button><button class="btn sm ghost" data-act="exCancel">Batal</button>`
          : `<button class="btn sm" data-act="exEdit">${icon('pencil')}Edit Extraction</button>`}
          <button class="btn sm" data-act="exRerun" ${ui.ocr.edit || busy ? 'disabled' : ''}>${icon('rerun')}Re-run Extraction</button>
          <button class="btn sm green" data-act="exRegister" ${ui.ocr.edit || saved ? 'disabled' : ''}>${icon('database')}${saved ? 'Tersimpan di Register' : 'Save to Register'}</button>
        </div>` : ''}
      <div class="di">
        <section class="panel">
          <div class="tabs"><button class="tab ${ui.ocr.view === 'preview' ? 'on' : ''}" data-act="ocrView" data-v="preview">${icon('eye', 'sm')}Pratinjau Dokumen</button><button class="tab ${ui.ocr.view === 'raw' ? 'on' : ''}" data-act="ocrView" data-v="raw">${icon('scan', 'sm')}Teks OCR</button></div>
          ${ui.ocr.view === 'raw' ? `<div class="ocr-raw">${esc(ocrRawText(doc))}</div>` : `<div class="paper-wrap">${paperHTML(doc)}</div>`}
        </section>
        <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
          <section class="panel"><div class="panel-head"><h3>Document Information</h3><span>${badge(doc.ocr_status === 'Selesai' ? doc.extraction_status : doc.ocr_status)}</span></div>
            <div class="panel-body"><dl class="dl-grid" style="margin:0">
              <div class="dl span-2"><dt>Nama dokumen</dt><dd><b style="font-weight:600">${esc(doc.document_name)}</b></dd></div>
              <div class="dl"><dt>ID / Nomor</dt><dd><span class="mono">${doc.document_id}</span> · ${esc(doc.document_number || '—')}</dd></div>
              <div class="dl"><dt>Tanggal</dt><dd>${fmtDateLong(doc.document_date)}</dd></div>
              <div class="dl"><dt>Sumber</dt><dd>${esc(doc.source)}</dd></div>
              <div class="dl"><dt>Jenis dokumen</dt><dd>${esc(doc.document_type)}</dd></div>
              <div class="dl"><dt>Diunggah</dt><dd>${esc(doc.uploaded_by)} · ${fmtDT(doc.upload_date)}</dd></div>
              <div class="dl"><dt>OCR</dt><dd>${doc.pages} halaman${doc.ocr_accuracy ? ` · akurasi ${doc.ocr_accuracy.toFixed(1)}%` : ''}</dd></div>
            </dl></div></section>
          <section class="panel"><div class="panel-head"><div><h3>Extracted Information</h3><div class="desc">${processed ? `${items.length} poin arahan · ${esc(doc.extraction.model)} · ${fmtDT(doc.extraction.runAt)}` : 'Belum ada hasil ekstraksi'}</div></div></div>
            <div class="panel-body" style="display:flex;flex-direction:column;gap:12px">
            ${busy ? `<div class="ai-banner">${icon('sparkles')}<span>Dokumen sedang diproses. Hasil akan tampil di sini setelah selesai.</span></div>` : ''}
            ${!processed && !busy ? `<div class="empty" style="padding:28px 10px"><b>Dokumen belum diproses</b>Jalankan OCR dan strukturisasi LLM untuk mengekstrak poin arahan.${admin ? `<div style="margin-top:14px"><button class="btn primary" data-act="processDoc" data-id="${doc.document_id}">${icon('sparkles')}Process Document</button></div>` : ''}</div>` : ''}
            ${processed && saved ? `<div class="ai-banner ok">${icon('checkCircle')}<span>Tersimpan di register sebagai ${plans.map(p => `<button class="link-btn mono" data-act="openPlan" data-id="${p.id}">${p.id}</button>`).join(', ') || '—'}.</span></div>` : ''}
            ${processed && !saved ? `<div class="ai-banner ${low ? 'warn' : ''}">${icon('sparkles')}<span>Hasil ekstraksi otomatis${low ? `. <b>${low} poin</b> memiliki field dengan keyakinan di bawah 85% (ditandai kuning) — periksa sebelum disimpan` : ' siap direview'}. Arahkan kursor ke kartu untuk menyorot teks sumber.</span></div>` : ''}
            ${processed ? items.map((it, i) => exItemHTML(it, i, ui.ocr.edit && admin, doc)).join('') : ''}
            </div></section>
        </div>
      </div>
    </div>`;
  },
  mount() {
    $$('.ex-card').forEach(c => {
      c.addEventListener('mouseenter', () => { const li = document.getElementById('pv-li-' + c.dataset.i); if (li) { li.classList.add('focus'); } });
      c.addEventListener('mouseleave', () => { const li = document.getElementById('pv-li-' + c.dataset.i); if (li) li.classList.remove('focus'); });
    });
  }
});
Actions.ocrPick = el => { ui.ocr.doc = el.value; ui.ocr.edit = false; ui.params = { doc: el.value }; renderPage(); };
Actions.ocrView = el => { ui.ocr.view = el.dataset.v; renderPage(true); };
Actions.exEdit = () => { ui.ocr.edit = true; renderPage(true); };
Actions.exCancel = () => { ui.ocr.edit = false; renderPage(true); };
Actions.exSatker = el => {
  const s = satkerInfo(el.value); const i = el.dataset.i;
  const b = $(`#ex-${i}-bidang`); if (s && b) b.value = s.bidang;
  const a = $(`#ex-${i}-assignmentStatus`); if (a) a.value = el.value ? 'Sudah Ditugaskan' : 'Belum Ditugaskan';
};
Actions.exInclude = el => { const doc = findDoc(ui.ocr.doc); doc.extraction.items[+el.dataset.i].include = el.checked; saveState(); el.closest('.ex-card').classList.toggle('excluded', !el.checked); };
Actions.exSave = () => {
  const doc = findDoc(ui.ocr.doc); if (!doc) return;
  let changes = 0;
  doc.extraction.items.forEach((it, i) => {
    ['rdkDate', 'topic', 'arahan', 'bidang', 'satker', 'respon', 'completedDate', 'tindakLanjut', 'priority', 'targetDate'].forEach(k => {
      const el = $(`#ex-${i}-${k}`); if (!el) return;
      const v = el.value.trim();
      if (v !== (it[k] || '')) { changes++; it[k] = v; if (it.conf && it.conf[k] != null) it.conf[k] = 1; }
    });
    it.assignmentStatus = it.satker ? 'Sudah Ditugaskan' : 'Belum Ditugaskan';
  });
  const empty = doc.extraction.items.find(it => !it.arahan);
  if (empty) { toast('⚠ Poin arahan tidak boleh kosong.', 'error'); return; }
  ui.ocr.edit = false;
  if (changes) audit('Edit Ekstraksi', doc.document_id, 'Hasil LLM', `${changes} field dikoreksi`, 'Koreksi manual oleh Admin');
  toast(changes ? `Data berhasil disimpan (${changes} field dikoreksi).` : 'Tidak ada perubahan.', changes ? 'success' : 'info');
  commit();
};
Actions.exRerun = () => {
  const doc = findDoc(ui.ocr.doc);
  confirmDialog({ title: 'Re-run Extraction?', message: 'OCR dan strukturisasi LLM akan dijalankan ulang. Koreksi manual pada hasil saat ini akan diganti.' + (doc.saved_plan_ids.length ? ' Rencana aksi yang sudah tersimpan di register tidak berubah.' : ''), confirmLabel: 'Jalankan ulang', onConfirm: () => openProcessModal(doc.document_id, { rerun: true }) });
};
Actions.exRegister = () => {
  const doc = findDoc(ui.ocr.doc); if (!doc || !doc.extraction) return;
  const sel = doc.extraction.items.filter(it => it.include !== false);
  if (!sel.length) { toast('⚠ Pilih minimal satu poin arahan untuk disimpan.', 'error'); return; }
  const existing = new Set(appState.actionPlans.filter(a => a.documentId === doc.document_id).map(a => a.arahan.trim().toLowerCase()));
  const fresh = sel.filter(it => !existing.has(it.arahan.trim().toLowerCase()));
  const dup = sel.length - fresh.length;
  if (!fresh.length) { toast('Seluruh poin arahan terpilih sudah ada di register.', 'warn'); return; }
  const unassigned = fresh.filter(it => !it.satker).length;
  confirmDialog({
    title: 'Simpan ke Register?', confirmLabel: `Simpan ${fresh.length} rencana aksi`, tone: 'green',
    message: `${fresh.length} poin arahan akan didaftarkan sebagai rencana aksi baru${unassigned ? `, ${unassigned} di antaranya berstatus <b>Belum Ditugaskan</b> dan perlu ditetapkan Satkernya` : ''}.${dup ? ` ${dup} poin dilewati karena sudah ada di register.` : ''} Satker penanggung jawab akan menerima notifikasi.`,
    onConfirm: () => {
      const ids = [];
      fresh.forEach(it => {
        appState.seq.ra += 1;
        const id = `RA-2026-${String(appState.seq.ra).padStart(3, '0')}`;
        const sat = satkerInfo(it.satker);
        const now = new Date().toISOString();
        appState.actionPlans.push({
          id, documentId: doc.document_id, documentName: doc.document_name, rdkDate: it.rdkDate, topic: it.topic, arahan: it.arahan,
          bidang: it.bidang || (sat ? sat.bidang : ''), satker: it.satker || '', pic: sat ? sat.pic : '', priority: it.priority || 'Sedang', targetDate: it.targetDate,
          progress: 0, manualStatus: null, tindakLanjut: '', output: '', kendala: '', catatan: '', completedDate: '',
          verificationStatus: 'Belum Diverifikasi', verificationNote: '', evidence: [], submissions: [], draft: null,
          updateDate: '', latestUpdate: '', createdAt: now, updatedAt: now, overdueNotified: false, extractedTindakLanjut: it.tindakLanjut
        });
        ids.push(id); doc.saved_plan_ids.push(id);
        audit('Registrasi Rencana Aksi', id, '-', 'Register', `Hasil ekstraksi ${doc.document_id}`);
        if (it.satker) {
          audit('Assignment', id, 'Satker: -', `Satker: ${it.satker}`);
          notify(['satker:' + it.satker], `Rencana aksi baru ${id} ditugaskan kepada Satker Anda.`, 'info', { type: 'plan', id });
        }
      });
      doc.extraction_status = 'Tersimpan di Register';
      notify(['admin', 'viewer'], `${ids.length} rencana aksi baru dari ${doc.document_id} masuk ke register.`, 'ok', { type: 'plan', id: ids[0] });
      toast(`${ids.length} rencana aksi berhasil disimpan ke register (${ids[0]}${ids.length > 1 ? '–' + ids.at(-1).slice(-3) : ''}).`);
      commit();
    }
  });
};
