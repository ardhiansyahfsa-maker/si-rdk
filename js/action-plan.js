/* =========================================================================
   SI-RDK · action-plan.js — Register Rencana Aksi, Register data ekstraksi,
   detail drawer, assignment (Admin), Update Satker page + update form.
   ========================================================================= */

/* ------------------------------ Plan table ------------------------------- */
const PLAN_COLS = {
  no: { label: 'No', cell: (a, i) => `<span class="tnum">${i + 1}</span>` },
  id: { label: 'ID', sort: 'id', cell: a => `<span class="id">${a.id}</span>${a.strategic ? '<div style="margin-top:4px"><span class="badge b-violet" title="Penugasan strategis OJK-wide — dialirkan ke SI-GRC">SI-GRC</span></div>' : ''}` },
  rdk: { label: 'Tanggal RDK', sort: 'rdkDate', cell: a => `<span class="nowrap tnum">${fmtDate(a.rdkDate)}</span>` },
  topic: { label: 'Topik', sort: 'topic', cell: a => `<span class="clamp-2" style="min-width:140px;max-width:200px">${esc(a.topic)}</span>` },
  arahan: { label: 'Poin Arahan', cls: 'arahan', full: true, cell: a => `<span class="clamp-2">${esc(a.arahan)}</span>` },
  bidang: { label: 'Bidang', sort: 'bidang', cell: a => `<span style="display:block;min-width:120px">${esc(a.bidang || '—')}</span>` },
  satker: { label: 'Satker', sort: 'satker', cell: a => a.satker ? `<span style="display:block;min-width:130px">${esc(a.satker)}</span>` : '<span class="muted">—</span>' },
  assign: { label: 'Status Penugasan', sort: 'assign', cell: a => badge(assignStatus(a)) },
  status: { label: 'Status Pelaksanaan', sort: 'status', cell: a => badge(execStatus(a)) },
  progress: { label: 'Progress', sort: 'progress', cell: a => pbar(a) },
  target: { label: 'Target Selesai', sort: 'targetDate', cell: a => targetCell(a) },
  ver: { label: 'Status Verifikasi', sort: 'verificationStatus', cell: a => badge(a.verificationStatus) },
  prio: { label: 'Prioritas', sort: 'priority', cell: a => `<span class="prio ${a.priority}">${a.priority.toUpperCase()}</span>` },
  update: { label: 'Last Update', sort: 'updateDate', cell: a => a.updateDate ? `<span class="nowrap tnum">${fmtDate(a.updateDate)}</span>` : '<span class="muted">Belum ada</span>' },
  action: { label: 'Action', cell: a => `<div class="btn-group" style="flex-wrap:nowrap;gap:4px"><button class="btn xs" data-act="openPlan" data-id="${a.id}">${icon('eye', 'sm')}Detail</button>${canUpdate(a) ? `<button class="btn xs green" data-act="openUpdate" data-id="${a.id}">Update</button>` : ''}${isRole('admin') ? `<button class="btn xs ghost" data-act="assignPlan" data-id="${a.id}" title="Ubah penugasan">${icon('users', 'sm')}</button>` : ''}</div>` },
  updAction: { label: 'Action', cell: a => updateActionCell(a) }
};
function updateActionCell(a) {
  const lock = updateLock(a);
  if (!lock) {
    const label = a.draft ? 'Lanjutkan Draft' : (['Perlu Perbaikan', 'Ditolak'].includes(a.verificationStatus) ? 'Perbaiki Update' : 'Update Status');
    return `<button class="btn sm green" data-act="openUpdate" data-id="${a.id}">${icon('pencil', 'sm')}${label}</button>`;
  }
  if (lock === 'Menunggu Verifikasi') return `<button class="btn sm waiting" disabled title="Update tidak dapat diubah sampai Admin melakukan review">${icon('clock', 'sm')}Menunggu Verifikasi</button>`;
  if (lock === 'Selesai & Disetujui') return `<span class="badge b-green">Selesai & disetujui</span>`;
  return `<button class="btn sm" data-act="openPlan" data-id="${a.id}">${icon('eye', 'sm')}Detail</button>`;
}
function planTable(plans, cols, opts = {}) {
  if (!plans.length) return `<div class="empty"><b>${esc(opts.emptyTitle || 'Tidak ada rencana aksi')}</b>${esc(opts.emptyText || 'Ubah filter atau kata kunci pencarian.')}</div>`;
  const sort = opts.sort; const offset = opts.offset || 0;
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr>${cols.map(c => {
    const d = PLAN_COLS[c]; const sorted = sort && d.sort && sort.key === d.sort;
    return d.sort && sort ? `<th class="sortable ${sorted ? 'sorted' : ''}" data-act="${opts.sortAct}" data-key="${d.sort}" aria-sort="${sorted ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}">${esc(d.label)}<span class="sort">${sorted ? (sort.dir > 0 ? '▲' : '▼') : '↕'}</span></th>` : `<th>${esc(d.label)}</th>`;
  }).join('')}</tr></thead><tbody>${plans.map((a, i) => `<tr class="clickable" tabindex="0" data-act="openPlan" data-id="${a.id}">${cols.map(c => `<td data-label="${c === 'arahan' ? 'Poin Arahan' : c === 'action' || c === 'updAction' ? '' : esc(PLAN_COLS[c].label)}" class="${PLAN_COLS[c].cls || ''} ${PLAN_COLS[c].full ? 'full' : ''}">${PLAN_COLS[c].cell(a, i + offset)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

/* ---------------------------- Filtering/sort ------------------------------ */
const inList = (val, list) => !list || list.split(',').includes(val);
function filterPlans(plans, f) {
  const q = (f.q || '').trim().toLowerCase();
  const today = todayISO();
  return plans.filter(a => {
    if (q && ![a.id, a.topic, a.arahan, a.satker, a.bidang, a.pic, a.documentName, a.tindakLanjut].some(v => String(v || '').toLowerCase().includes(q))) return false;
    if (!inList(execStatus(a), f.status)) return false;
    if (!inList(a.verificationStatus, f.ver)) return false;
    if (!inList(assignStatus(a), f.assign)) return false;
    if (f.satker && !inList(a.satker, f.satker)) return false;
    if (f.bidang && a.bidang !== f.bidang) return false;
    if (f.priority && a.priority !== f.priority) return false;
    if (f.strat === 'Strategis (SI-GRC)' && !a.strategic) return false;
    if (f.strat === 'Non-strategis' && a.strategic) return false;
    if (f.rdkFrom && a.rdkDate < f.rdkFrom) return false;
    if (f.rdkTo && a.rdkDate > f.rdkTo) return false;
    if (f.targetTo && a.targetDate > f.targetTo) return false;
    if (f.prog) {
      const p = a.progress;
      if (f.prog === '0' && p !== 0) return false;
      if (f.prog === '1-49' && (p < 1 || p > 49)) return false;
      if (f.prog === '50-99' && (p < 50 || p > 99)) return false;
      if (f.prog === '100' && p < 100) return false;
    }
    if (f.near) { const d = diffDays(a.targetDate, today); const s = execStatus(a); if (s === 'Selesai' || s === 'Terlambat' || d < 0 || d > f.near) return false; }
    return true;
  });
}
function sortPlans(plans, sort) {
  const { key, dir } = sort;
  const v = a => key === 'status' ? EXEC_STATUSES.indexOf(execStatus(a)) : key === 'assign' ? assignStatus(a) : key === 'priority' ? PRIORITIES.indexOf(a.priority) : a[key] ?? '';
  return [...plans].sort((a, b) => { const x = v(a), y = v(b); return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y))) * dir || a.id.localeCompare(b.id); });
}

/* ------------------------- Register Rencana Aksi ------------------------- */
function regRows() { return sortPlans(filterPlans(visiblePlans(), ui.reg), ui.reg.sort); }
const optList = (vals, cur, all) => `<option value="">${all}</option>` + (cur && !vals.includes(cur) ? `<option value="${esc(cur)}" selected>${esc(cur.split(',').join(' / '))}</option>` : '') + vals.map(v => `<option ${v === cur ? 'selected' : ''}>${esc(v)}</option>`).join('');
function regChips() {
  const f = ui.reg; const L = { q: 'Kata kunci', status: 'Status', ver: 'Verifikasi', assign: 'Penugasan', satker: 'Satker', bidang: 'Bidang', priority: 'Prioritas', strat: 'Klasifikasi', rdkFrom: 'RDK dari', rdkTo: 'RDK s.d.', targetTo: 'Target s.d.', prog: 'Progress', near: 'Deadline ≤' };
  const chips = Object.keys(L).filter(k => f[k]).map(k => {
    let v = f[k]; if (['rdkFrom', 'rdkTo', 'targetTo'].includes(k)) v = fmtDate(v); if (k === 'near') v = v + ' hari'; if (k === 'prog') v = v + '%'; if (typeof v === 'string') v = v.split(',').join(' / ');
    return `<span class="chip">${esc(L[k])}: <b>${esc(v)}</b><button data-act="regClear" data-k="${k}" aria-label="Hapus filter ${esc(L[k])}">${icon('x', 'sm')}</button></span>`;
  });
  return chips.length ? `<div class="active-filters">${chips.join('')}<button class="link-btn small" data-act="regReset">Reset semua</button></div>` : '';
}
function regTableHTML() {
  const rows = regRows(); const f = ui.reg;
  const pages = Math.max(1, Math.ceil(rows.length / f.size)); f.page = clamp(f.page, 1, pages);
  const slice = rows.slice((f.page - 1) * f.size, f.page * f.size);
  const btns = []; for (let p = 1; p <= pages; p++) if (p === 1 || p === pages || Math.abs(p - f.page) <= 1) btns.push(p); else if (btns.at(-1) !== '…') btns.push('…');
  return `${regChips()}${planTable(slice, ['no', 'id', 'rdk', 'topic', 'arahan', 'bidang', 'satker', 'assign', 'status', 'progress', 'target', 'ver', 'action'], { sort: f.sort, sortAct: 'regSort', offset: (f.page - 1) * f.size })}
    <div class="tbl-foot"><span>Menampilkan <b class="tnum">${rows.length ? (f.page - 1) * f.size + 1 : 0}–${Math.min(f.page * f.size, rows.length)}</b> dari <b class="tnum">${rows.length}</b> rencana aksi${rows.length !== visiblePlans().length ? ` (difilter dari ${visiblePlans().length})` : ''}</span>
      <span style="display:flex;gap:10px;align-items:center;flex-wrap:wrap"><select class="select sm" style="width:auto" data-change="regSize" aria-label="Baris per halaman">${[10, 25, 50].map(n => `<option value="${n}" ${f.size === n ? 'selected' : ''}>${n} / halaman</option>`).join('')}</select>
      <span class="pager"><button data-act="regPage" data-p="${f.page - 1}" ${f.page <= 1 ? 'disabled' : ''} aria-label="Sebelumnya">${icon('chevLeft', 'sm')}</button>${btns.map(p => p === '…' ? '<span class="muted">…</span>' : `<button class="${p === f.page ? 'on' : ''}" data-act="regPage" data-p="${p}">${p}</button>`).join('')}<button data-act="regPage" data-p="${f.page + 1}" ${f.page >= pages ? 'disabled' : ''} aria-label="Berikutnya">${icon('chevRight', 'sm')}</button></span></span></div>`;
}
function refreshReg() { const el = $('#reg-table'); if (el) el.innerHTML = regTableHTML(); }

registerPage('register', {
  render() {
    const f = ui.reg; const plans = visiblePlans(); const ms = appState.masters;
    const sat = cu().role === 'satker';
    const rdkDates = [...new Set(plans.map(a => a.rdkDate))].sort().reverse();
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Monitoring · Rencana Aksi</div><h1>Register Rencana Aksi</h1><div class="sub">${sat ? `Rencana aksi yang menjadi tanggung jawab <b>${esc(cu().satker)}</b>.` : 'Seluruh rencana aksi hasil pemetaan dokumen rujukan.'} Klik baris untuk melihat detail.</div></div>${exportButtons('register')}</div>
      <section class="panel">
        <div class="toolbar">
          <div class="grow">${icon('search')}<input class="input" id="rf-q" placeholder="Cari ID, topik, poin arahan, satker, bidang…" value="${esc(f.q)}" data-input="regSearch"></div>
          <select class="select sm" id="rf-status" data-change="regFilter" aria-label="Status pelaksanaan">${optList(EXEC_STATUSES, f.status, 'Semua status')}</select>
          ${sat ? '' : `<select class="select sm" id="rf-satker" data-change="regFilter" aria-label="Satker">${optList(ms.satker.map(s => s.name), f.satker, 'Semua satker')}</select>`}
          <select class="select sm" id="rf-ver" data-change="regFilter" aria-label="Status verifikasi">${optList(VER_STATUSES, f.ver, 'Semua verifikasi')}</select>
          <button class="btn sm ${f.showFilters ? 'primary' : ''}" data-act="regToggleFilters">${icon('filter', 'sm')}Filter lanjutan</button>
        </div>
        <div class="filters" id="reg-adv" ${f.showFilters ? '' : 'hidden'}>
          <div class="field"><label for="rf-rdkFrom">Tanggal RDK dari</label><input class="input sm" type="date" id="rf-rdkFrom" value="${esc(f.rdkFrom)}" data-change="regFilter"></div>
          <div class="field"><label for="rf-rdkTo">Tanggal RDK s.d.</label><input class="input sm" type="date" id="rf-rdkTo" value="${esc(f.rdkTo)}" data-change="regFilter"></div>
          <div class="field"><label for="rf-bidang">Bidang</label><select class="select sm" id="rf-bidang" data-change="regFilter">${optList([...new Set(ms.satker.map(s => s.bidang))], f.bidang, 'Semua bidang')}</select></div>
          <div class="field"><label for="rf-assign">Status penugasan</label><select class="select sm" id="rf-assign" data-change="regFilter">${optList(ASSIGN_STATUSES, f.assign, 'Semua')}</select></div>
          <div class="field"><label for="rf-prog">Progress</label><select class="select sm" id="rf-prog" data-change="regFilter"><option value="">Semua</option>${[['0', '0% (belum mulai)'], ['1-49', '1–49%'], ['50-99', '50–99%'], ['100', '100%']].map(([v, l]) => `<option value="${v}" ${f.prog === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          <div class="field"><label for="rf-targetTo">Target selesai s.d.</label><input class="input sm" type="date" id="rf-targetTo" value="${esc(f.targetTo)}" data-change="regFilter"></div>
          <div class="field"><label for="rf-priority">Prioritas</label><select class="select sm" id="rf-priority" data-change="regFilter">${optList(PRIORITIES, f.priority, 'Semua')}</select></div>
          <div class="field"><label for="rf-strat">Klasifikasi</label><select class="select sm" id="rf-strat" data-change="regFilter">${optList(['Strategis (SI-GRC)', 'Non-strategis'], f.strat, 'Semua')}</select></div>
          <div class="field"><label>Sesi RDK</label><select class="select sm" data-change="regRdk" aria-label="Pilih sesi RDK"><option value="">Pilih tanggal…</option>${rdkDates.map(d => `<option value="${d}" ${f.rdkFrom === d && f.rdkTo === d ? 'selected' : ''}>${fmtDate(d)}</option>`).join('')}</select></div>
        </div>
        <div id="reg-table">${regTableHTML()}</div>
      </section>
    </div>`;
  }
});
Actions.regSearch = debounce(el => { ui.reg.q = el.value; ui.reg.page = 1; refreshReg(); }, 140);
Actions.regFilter = () => {
  const f = ui.reg;
  ['status', 'satker', 'ver', 'rdkFrom', 'rdkTo', 'bidang', 'assign', 'prog', 'targetTo', 'priority', 'strat'].forEach(k => { const el = $('#rf-' + k); if (el) f[k] = el.value; });
  f.page = 1; refreshReg();
};
Actions.regRdk = el => { ui.reg.rdkFrom = el.value; ui.reg.rdkTo = el.value; ui.reg.page = 1; renderPage(true); };
Actions.regToggleFilters = () => { ui.reg.showFilters = !ui.reg.showFilters; renderPage(true); };
Actions.regSort = el => { const k = el.dataset.key; const s = ui.reg.sort; ui.reg.sort = { key: k, dir: s.key === k ? -s.dir : 1 }; refreshReg(); };
Actions.regPage = el => { ui.reg.page = +el.dataset.p; refreshReg(); $('#reg-table')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
Actions.regSize = el => { ui.reg.size = +el.value; ui.reg.page = 1; refreshReg(); };
Actions.regClear = el => { const k = el.dataset.k; ui.reg[k] = k === 'near' ? 0 : ''; ui.reg.page = 1; renderPage(true); };
Actions.regReset = () => { resetRegFilters(); renderPage(true); };
const PLAN_EXPORT_COLS = [
  { label: 'ID', get: a => a.id, w: 13 }, { label: 'Tanggal RDK', get: a => a.rdkDate, w: 12 }, { label: 'Topik RDK', get: a => a.topic, w: 36 },
  { label: 'Poin Arahan', get: a => a.arahan, w: 70 }, { label: 'Bidang', get: a => a.bidang, w: 28 }, { label: 'Satker', get: a => a.satker, w: 40 }, { label: 'PIC', get: a => a.pic, w: 16 },
  { label: 'Status Penugasan', get: a => assignStatus(a), w: 16 }, { label: 'Status Pelaksanaan', get: a => execStatus(a), w: 16 }, { label: 'Progress (%)', get: a => a.progress, w: 10 },
  { label: 'Prioritas', get: a => a.priority, w: 9 }, { label: 'Target Selesai', get: a => a.targetDate, w: 13 }, { label: 'Status Verifikasi', get: a => a.verificationStatus, w: 18 },
  { label: 'Catatan Verifikasi', get: a => a.verificationNote, w: 40 }, { label: 'Tindak Lanjut', get: a => a.tindakLanjut, w: 50 }, { label: 'Output', get: a => a.output, w: 36 },
  { label: 'Kendala', get: a => a.kendala, w: 36 }, { label: 'Tanggal Update', get: a => a.updateDate, w: 13 }, { label: 'Tanggal Selesai', get: a => a.completedDate, w: 13 },
  { label: 'Jumlah Bukti', get: a => a.evidence.length, w: 10 }, { label: 'Sumber Dokumen', get: a => a.documentName, w: 50 }
];
Exporters.register = () => ({ name: 'Register_Rencana_Aksi', sheet: 'Register RA', title: 'Register Rencana Aksi', subtitle: `${regRows().length} rencana aksi sesuai filter aktif`, rows: regRows(), columns: PLAN_EXPORT_COLS });

/* ------------------- Register data ekstraksi (Dokumen › Register) -------- */
function responOf(a) {
  if (execStatus(a) === 'Selesai') return a.verificationStatus === 'Disetujui' ? 'Selesai (terverifikasi)' : 'Selesai';
  if (a.updateDate) return 'Sudah direspon';
  return 'Belum ada respon';
}
function dregRows() {
  const f = ui.dreg; const q = f.q.trim().toLowerCase();
  return visiblePlans().filter(a => (!f.doc || a.documentId === f.doc) && (!q || [a.id, a.topic, a.arahan, a.satker, a.bidang, a.tindakLanjut].some(v => String(v || '').toLowerCase().includes(q))))
    .sort((a, b) => b.rdkDate.localeCompare(a.rdkDate) || a.id.localeCompare(b.id));
}
function dregTableHTML() {
  const rows = dregRows();
  if (!rows.length) return '<div class="empty"><b>Tidak ada data</b>Ubah kata kunci atau pilihan dokumen.</div>';
  let last = null; let n = 0;
  const body = rows.map(a => {
    let g = '';
    if (a.documentId !== last) { last = a.documentId; g = `<tr class="group"><td colspan="11" data-label="">${icon('file', 'sm')} ${esc(a.documentName)} <span class="muted mono" style="font-weight:500">· ${a.documentId}</span></td></tr>`; }
    n++;
    const r = responOf(a);
    return g + `<tr class="clickable" tabindex="0" data-act="openPlan" data-id="${a.id}"><td data-label="No" class="tnum">${n}</td><td data-label="ID"><span class="id">${a.id}</span></td>
      <td data-label="Tanggal RDK" class="nowrap tnum">${fmtDate(a.rdkDate)}</td><td data-label="Topik RDK">${esc(a.topic)}</td><td data-label="Poin Arahan" class="arahan full">${esc(a.arahan)}</td>
      <td data-label="Bidang PJ">${esc(a.bidang || '—')}</td><td data-label="Satker PJ">${esc(a.satker || '—')}</td><td data-label="Status Penugasan">${badge(assignStatus(a))}</td>
      <td data-label="Respon / Selesai"><span class="badge plain ${r.startsWith('Selesai') ? 'b-green' : r === 'Sudah direspon' ? 'b-blue' : 'b-outline'}">${r}</span></td>
      <td data-label="Tanggal Selesai" class="nowrap tnum">${fmtDate(a.completedDate)}</td><td data-label="Tindak Lanjut" class="full"><span class="clamp-2" style="min-width:200px">${esc(a.tindakLanjut || a.extractedTindakLanjut || '—')}</span></td></tr>`;
  }).join('');
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>No</th><th>ID</th><th>Tanggal RDK</th><th>Topik RDK</th><th>Poin Arahan / Penugasan</th><th>Bidang Penanggung Jawab</th><th>Satker Penanggung Jawab</th><th>Status Penugasan</th><th>Respon / Selesai</th><th>Tanggal Selesai</th><th>Tindak Lanjut</th></tr></thead><tbody>${body}</tbody></table></div>
    <div class="tbl-foot"><span>${rows.length} baris dari ${new Set(rows.map(r => r.documentId)).size} dokumen</span></div>`;
}
registerPage('dataregister', {
  render() {
    const f = ui.dreg;
    const docs = appState.documents.filter(d => appState.actionPlans.some(a => a.documentId === d.document_id));
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Dokumen · Register</div><h1>Register Data Arahan</h1><div class="sub">Struktur data hasil ekstraksi per dokumen rujukan — format register yang digunakan dashboard.</div></div>${exportButtons('dataregister')}</div>
      <section class="panel"><div class="toolbar">
        <div class="grow">${icon('search')}<input class="input" placeholder="Cari topik, arahan, satker, tindak lanjut…" value="${esc(f.q)}" data-input="dregSearch"></div>
        <select class="select sm" data-change="dregDoc" aria-label="Dokumen" style="max-width:320px"><option value="">Semua dokumen</option>${docs.map(d => `<option value="${d.document_id}" ${f.doc === d.document_id ? 'selected' : ''}>${d.document_id} · ${esc(d.document_name.slice(0, 42))}</option>`).join('')}</select>
      </div><div id="dreg-table">${dregTableHTML()}</div></section></div>`;
  }
});
Actions.dregSearch = debounce(el => { ui.dreg.q = el.value; $('#dreg-table').innerHTML = dregTableHTML(); }, 140);
Actions.dregDoc = el => { ui.dreg.doc = el.value; $('#dreg-table').innerHTML = dregTableHTML(); };
Exporters.dataregister = () => ({
  name: 'Register_Data_Arahan', sheet: 'Register Arahan', title: 'Register Data Arahan', subtitle: 'Hasil ekstraksi dokumen rujukan', rows: dregRows(),
  columns: [
    { label: 'ID', get: a => a.id, w: 13 }, { label: 'Dokumen', get: a => a.documentName, w: 50 }, { label: 'Tanggal RDK', get: a => a.rdkDate, w: 12 }, { label: 'Topik RDK', get: a => a.topic, w: 36 },
    { label: 'Poin Arahan / Penugasan', get: a => a.arahan, w: 70 }, { label: 'Bidang Penanggung Jawab', get: a => a.bidang, w: 28 }, { label: 'Satker Penanggung Jawab', get: a => a.satker, w: 40 },
    { label: 'Status Penugasan', get: a => assignStatus(a), w: 16 }, { label: 'Respon / Selesai', get: a => responOf(a), w: 20 }, { label: 'Tanggal Selesai', get: a => a.completedDate, w: 13 },
    { label: 'Tindak Lanjut', get: a => a.tindakLanjut || a.extractedTindakLanjut || '', w: 50 }
  ]
});

/* ------------------------------ Detail drawer ---------------------------- */
function renderPlanDetail(ap) {
  const st = execStatus(ap); const d = daysToTarget(ap); const lock = updateLock(ap);
  const doc = findDoc(ap.documentId);
  const logs = appState.auditLogs.filter(l => l.entity === ap.id).slice().reverse();
  const verCallout = ap.verificationNote && ['Perlu Perbaikan', 'Ditolak', 'Disetujui'].includes(ap.verificationStatus)
    ? `<div class="ai-banner ${ap.verificationStatus === 'Disetujui' ? 'ok' : ap.verificationStatus === 'Ditolak' ? 'red' : 'violet'}" style="margin-top:12px">${icon(ap.verificationStatus === 'Disetujui' ? 'checkCircle' : 'undo')}<span><b>Catatan verifikasi:</b> ${esc(ap.verificationNote)}</span></div>` : '';
  const kv = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  return `<div class="drawer-head">
      <div class="row"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="mono" style="font-weight:600;color:var(--blue-700);font-size:13px">${ap.id}</span>${badge(st)}${badge(ap.verificationStatus)}<span class="prio ${ap.priority}">PRIORITAS ${ap.priority.toUpperCase()}</span></div>
        <button class="icon-btn" data-act="closeDrawer" aria-label="Tutup detail">${icon('x')}</button></div>
      <h2>${esc(ap.arahan)}</h2>
      <div class="small muted">${esc(ap.topic)}</div>
    </div>
    <div class="drawer-body">
      <div class="d-sec"><div class="section-label">Informasi Arahan</div><dl class="kv">
        ${kv('Tanggal RDK', fmtDateLong(ap.rdkDate))}${kv('Topik', esc(ap.topic))}
        ${kv('Poin Arahan', `<div class="quote">${esc(ap.arahan)}</div>`)}
        ${kv('Sumber Dokumen', doc && canSee('ocr') ? `<button class="link-btn" data-act="viewDoc" data-id="${doc.document_id}" style="text-align:left">${esc(ap.documentName)}</button>` : esc(ap.documentName))}
      </dl></div>
      <div class="d-sec"><div class="section-label"><span>Penanggung Jawab</span>${isRole('admin') ? `<button class="btn xs" data-act="assignPlan" data-id="${ap.id}">${icon('users', 'sm')}Ubah penugasan</button>` : ''}</div><dl class="kv">
        ${kv('Bidang', esc(ap.bidang || '—'))}${kv('Satker', ap.satker ? esc(ap.satker) : '<span style="color:var(--warn-ink)">Belum ditugaskan</span>')}${kv('PIC', esc(ap.pic || '—'))}${kv('Status Penugasan', badge(assignStatus(ap)))}
      </dl></div>
      ${grcDrawerSection(ap)}
      <div class="d-sec"><div class="section-label">Status</div><dl class="kv">
        ${kv('Status', badge(st) + (ap.manualStatus && st !== ap.manualStatus && st !== 'Selesai' ? ` <span class="small muted">(dilaporkan: ${esc(ap.manualStatus)})</span>` : ''))}
        ${kv('Progress', pbar(ap))}
        ${kv('Target Selesai', `${fmtDateLong(ap.targetDate)} ${st === 'Selesai' ? '' : d < 0 ? `<span class="small" style="color:var(--danger-ink)">· lewat ${-d} hari</span>` : `<span class="small muted">· ${d} hari lagi</span>`}`)}
        ${kv('Last Update', ap.updateDate ? `${fmtDateLong(ap.updateDate)}` : '<span class="muted">Belum ada update</span>')}
        ${kv('Tanggal Selesai', fmtDateLong(ap.completedDate))}
        ${kv('Status Verifikasi', badge(ap.verificationStatus))}
      </dl>${verCallout}${ap.draft && cu().role === 'satker' ? `<div class="ai-banner" style="margin-top:12px">${icon('save')}<span>Draft update tersimpan ${relTime(ap.draft.savedAt)} (progress ${ap.draft.progress}%). Draft belum terlihat oleh Admin.</span></div>` : ''}</div>
      <div class="d-sec"><div class="section-label">Tindak Lanjut</div><dl class="kv">
        ${kv('Tindak lanjut', esc(ap.tindakLanjut || ap.extractedTindakLanjut || '—'))}${kv('Output', esc(ap.output || '—'))}${kv('Kendala', esc(ap.kendala || '—'))}${kv('Catatan', esc(ap.catatan || '—'))}
      </dl></div>
      <div class="d-sec"><div class="section-label">Dokumen Pendukung (${ap.evidence.length})</div>${evidenceList(ap.evidence)}</div>
      ${ap.submissions.length ? `<div class="d-sec"><div class="section-label">Riwayat Update (${ap.submissions.length})</div><div class="sub-hist">${ap.submissions.slice().reverse().map(subCard).join('')}</div></div>` : ''}
      <div class="d-sec"><div class="section-label">Audit Trail (${logs.length})</div>${logs.length ? `<div class="timeline">${logs.map(l => `<div class="tl-item"><div class="tl-time">${fmtDate(tsDay(l.ts)).slice(0, 6)}<br>${fmtTime(l.ts)}</div><div class="tl-body ${logColor(l)}"><div class="tl-title"><b>${esc(l.action)}</b> · ${esc(l.user)} <span class="muted">(${esc(ROLE_LABEL[l.role] || 'Sistem')})</span></div>${changeHTML(l)}${l.comment ? `<div class="tl-comment">${esc(l.comment)}</div>` : ''}</div></div>`).join('')}</div>` : '<div class="muted small">Belum ada catatan.</div>'}</div>
    </div>
    <div class="drawer-foot">
      ${isRole('admin') && ap.verificationStatus === 'Menunggu Verifikasi' ? `<button class="btn primary" data-act="reviewPlan" data-id="${ap.id}">${icon('shield')}Review Verifikasi</button>` : ''}
      ${cu().role === 'satker' ? (lock ? `<span class="readonly-note" style="margin-right:auto">${icon('lock', 'sm')}${esc(lock === 'Menunggu Verifikasi' ? 'Menunggu verifikasi — update terkunci sampai Admin melakukan review' : lock)}</span>` : `<button class="btn green" data-act="openUpdate" data-id="${ap.id}">${icon('pencil')}Update Status</button>`) : ''}
      ${cu().role === 'viewer' ? `<span class="readonly-note" style="margin-right:auto">${icon('lock', 'sm')}Mode baca saja</span>` : ''}
      <button class="btn ghost" data-act="closeDrawer">Tutup</button>
    </div>`;
}
function evidenceList(ev) {
  if (!ev.length) return '<div class="muted small">Belum ada bukti tindak lanjut yang diunggah.</div>';
  return `<div class="evi">${ev.map((e, i) => `<div class="evi-item">${icon('clip')}<div class="grow"><b>${esc(e.name)}</b><span class="meta">${fmtSize(e.size)} · ${esc(e.by || '')} · ${fmtDT(e.uploadedAt)}</span></div><button class="btn xs" data-act="viewEvidence" data-name="${esc(e.name)}" data-size="${e.size || 0}" data-by="${esc(e.by || '')}" data-at="${esc(e.uploadedAt || '')}">${icon('eye', 'sm')}Lihat</button></div>`).join('')}</div>`;
}
function subCard(s) {
  return `<div class="sub-card"><div class="top"><span><b>${fmtDT(s.at)}</b> · ${esc(s.by)}</span>${s.result ? badge(s.result) : badge('Menunggu Verifikasi')}</div>
    <div style="margin-top:6px;display:flex;gap:10px;flex-wrap:wrap;align-items:center"><span class="tl-change"><span class="old">${s.progressFrom}%</span>${icon('arrowRight', 'sm')}<span class="new">${s.progressTo}%</span></span><span class="small muted">${esc(s.status)} · target ${fmtDate(s.targetDate)} · ${s.evidence.length} bukti</span></div>
    ${s.tindakLanjut ? `<div class="small" style="margin-top:6px;color:var(--ink-2)">${esc(s.tindakLanjut)}</div>` : ''}
    ${s.result ? `<div class="tl-comment">${esc(s.resultBy)} · ${fmtDT(s.resultAt)}${s.resultNote ? ' — ' + esc(s.resultNote) : ''}</div>` : ''}</div>`;
}
const fileCache = {};
Actions.viewEvidence = el => {
  const { name, size, by, at } = el.dataset; const f = fileCache[name];
  const isImg = /\.(png|jpe?g|gif|webp)$/i.test(name);
  const url = f && isImg ? URL.createObjectURL(f) : null;
  openModal({
    title: 'Dokumen Pendukung', sub: esc(name), size: 'sm',
    body: `<div style="display:flex;flex-direction:column;gap:14px">${url ? `<img src="${url}" alt="${esc(name)}" style="border-radius:8px;border:1px solid var(--line)">` : `<div style="display:grid;place-items:center;height:150px;border-radius:8px;background:var(--surface-2);border:1px dashed var(--line);color:var(--ink-3);text-align:center;padding:16px">${icon('file', 'lg')}<span class="small">${f ? 'Pratinjau tersedia untuk berkas gambar.' : 'Berkas bukti tersimpan di repositori dokumen. Pratinjau isi tidak tersedia pada prototipe.'}</span></div>`}
      <dl class="kv"><dt>Nama berkas</dt><dd>${esc(name)}</dd><dt>Ukuran</dt><dd>${fmtSize(+size)}</dd><dt>Diunggah oleh</dt><dd>${esc(by || '—')}</dd><dt>Waktu</dt><dd>${fmtDT(at)}</dd></dl></div>`,
    foot: f ? [{ label: 'Tutup', cls: 'ghost' }, { label: 'Unduh berkas', cls: 'primary', icon: 'download', onClick: async m => { if (await saveFile(name, f)) m.close(); } }] : [{ label: 'Tutup', cls: 'primary' }],
    onClose: () => url && URL.revokeObjectURL(url)
  });
};

/* ------------------------------ Assignment ------------------------------- */
Actions.assignPlan = el => {
  if (!isRole('admin')) return toast('Hanya Admin / MRDK yang dapat mengubah penugasan.', 'error');
  const ap = findPlan(el.dataset.id); if (!ap) return;
  const sats = appState.masters.satker; const bidangs = [...new Set(sats.map(s => s.bidang))];
  openModal({
    title: 'Ubah Penugasan', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`,
    body: `<div class="form-grid">
      <div class="field span-2"><label for="as-satker">Satker penanggung jawab</label><select class="select" id="as-satker"><option value="">— Belum ditugaskan —</option>${sats.map(s => `<option ${s.name === ap.satker ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="as-bidang">Bidang</label><select class="select" id="as-bidang"><option value="">— Belum ditetapkan —</option>${bidangs.map(b => `<option ${b === ap.bidang ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></div>
      <div class="field"><label for="as-pic">PIC</label><input class="input" id="as-pic" value="${esc(ap.pic)}"></div>
      <div class="field"><label for="as-priority">Prioritas</label><select class="select" id="as-priority">${PRIORITIES.map(p => `<option ${p === ap.priority ? 'selected' : ''}>${p}</option>`).join('')}</select></div>
      <div class="field"><label for="as-target">Target selesai <span class="req">*</span></label><input class="input" type="date" id="as-target" value="${esc(ap.targetDate)}"></div>
      <div class="field span-2"><label for="as-note">Catatan penugasan</label><textarea class="textarea" id="as-note" style="min-height:60px" placeholder="Opsional — dicatat di audit trail"></textarea></div>
    </div>`,
    onMount: m => { $('#as-satker', m).addEventListener('change', e => { const s = satkerInfo(e.target.value); if (s) { $('#as-bidang', m).value = s.bidang; $('#as-pic', m).value = s.pic; } else { $('#as-pic', m).value = ''; } }); },
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan Penugasan', cls: 'primary', icon: 'save', onClick: m => {
      const v = id => $(id, m.el).value.trim();
      const satker = v('#as-satker'), bidang = v('#as-bidang'), pic = v('#as-pic'), priority = v('#as-priority'), target = v('#as-target'), note = v('#as-note');
      if (!target) { $('#as-target', m.el).classList.add('invalid'); return toast('⚠ Target penyelesaian wajib diisi.', 'error'); }
      const changes = [];
      if (satker !== ap.satker) changes.push(['Assignment', `Satker: ${ap.satker || '-'}`, `Satker: ${satker || '-'}`]);
      if (bidang !== ap.bidang) changes.push(['Ubah Bidang', ap.bidang || '-', bidang || '-']);
      if (pic !== ap.pic) changes.push(['Ubah PIC', ap.pic || '-', pic || '-']);
      if (priority !== ap.priority) changes.push(['Ubah Prioritas', ap.priority, priority]);
      if (target !== ap.targetDate) changes.push(['Ubah Target', fmtDate(ap.targetDate), fmtDate(target)]);
      if (!changes.length) { m.close(); return toast('Tidak ada perubahan.', 'info'); }
      confirmDialog({ title: 'Simpan perubahan penugasan?', message: `${changes.length} perubahan akan dicatat di audit trail.${satker !== ap.satker && satker ? ` Satker <b>${esc(satker)}</b> akan menerima notifikasi.` : ''}`, confirmLabel: 'Simpan', onConfirm: () => {
        const oldSat = ap.satker;
        Object.assign(ap, { satker, bidang, pic, priority, targetDate: target, updatedAt: new Date().toISOString() });
        changes.forEach(c => audit(c[0], ap.id, c[1], c[2], note));
        if (satker && satker !== oldSat) notify(['satker:' + satker], `Rencana aksi ${ap.id} ditugaskan kepada Satker Anda.`, 'info', { type: 'plan', id: ap.id });
        if (oldSat && satker !== oldSat) notify(['satker:' + oldSat], `Rencana aksi ${ap.id} dialihkan ke ${satker || 'status belum ditugaskan'}.`, 'info', { type: 'plan', id: ap.id });
        m.close(); toast('Data berhasil disimpan.'); commit();
      } });
    } }]
  });
};

/* ------------------------------ Update Satker ---------------------------- */
function updList() {
  const u = cu(); let list = visiblePlans().filter(a => a.satker);
  if (u.role === 'admin' && ui.upd.satker) list = list.filter(a => a.satker === ui.upd.satker);
  return list;
}
const UPD_TABS = [
  { id: 'action', label: 'Perlu Tindakan', test: a => canUpdate(a) || (cu().role === 'admin' && a.verificationStatus !== 'Menunggu Verifikasi' && !(a.progress >= 100 && a.verificationStatus === 'Disetujui')) },
  { id: 'waiting', label: 'Menunggu Verifikasi', test: a => a.verificationStatus === 'Menunggu Verifikasi' },
  { id: 'done', label: 'Selesai', test: a => a.progress >= 100 && a.verificationStatus === 'Disetujui' },
  { id: 'all', label: 'Semua', test: () => true }
];
registerPage('update', {
  render() {
    const u = cu(); const all = updList();
    const tab = UPD_TABS.find(t => t.id === ui.upd.tab) || UPD_TABS[0];
    const rows = sortPlans(all.filter(tab.test), { key: 'targetDate', dir: 1 }).sort((a, b) => (['Perlu Perbaikan', 'Ditolak'].includes(b.verificationStatus) - ['Perlu Perbaikan', 'Ditolak'].includes(a.verificationStatus)) || ((execStatus(b) === 'Terlambat') - (execStatus(a) === 'Terlambat')));
    const k = computeKpis(all);
    const rev = all.filter(a => ['Perlu Perbaikan', 'Ditolak'].includes(a.verificationStatus));
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Pelaksanaan · Update Satker</div><h1>Update Status Tindak Lanjut</h1>
        <div class="sub">${u.role === 'satker' ? `Rencana aksi yang menjadi tanggung jawab <b>${esc(u.satker)}</b>. Isi progres, tindak lanjut, bukti, kendala, dan target, lalu kirim untuk diverifikasi Admin / MRDK.` : 'Pemantauan pembaruan oleh Satker. Pembaruan status hanya dapat dilakukan oleh Satker penanggung jawab.'}</div></div>
        ${u.role === 'admin' ? `<select class="select sm" style="width:auto;max-width:320px" data-change="updSatker" aria-label="Filter satker"><option value="">Semua Satker</option>${appState.masters.satker.map(s => `<option ${ui.upd.satker === s.name ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>` : ''}</div>
      <div class="inline-stat">
        <span class="chip">Total tugas <b>${all.length}</b></span><span class="chip">Rata-rata progress <b>${k.avg}%</b></span>
        <span class="chip" style="color:var(--danger-ink)">Terlambat <b>${k.terlambat}</b></span><span class="chip" style="color:var(--warn-ink)">Menunggu verifikasi <b>${k.mv}</b></span>
        <span class="chip" style="color:var(--violet)">Perlu perbaikan / ditolak <b>${rev.length}</b></span><span class="chip" style="color:var(--success-ink)">Selesai <b>${k.selesai}</b></span>
      </div>
      ${rev.length && u.role === 'satker' ? `<div class="ai-banner violet">${icon('undo')}<span><b>${rev.length} update dikembalikan oleh Admin.</b> ${rev.map(a => `<button class="link-btn mono" data-act="openUpdate" data-id="${a.id}">${a.id}</button>`).join(', ')} — perbaiki sesuai catatan verifikasi lalu kirim ulang.</span></div>` : ''}
      <section class="panel">
        <div class="tabs">${UPD_TABS.map(t => `<button class="tab ${t.id === tab.id ? 'on' : ''}" data-act="updTab" data-t="${t.id}">${t.label}<span class="c">${all.filter(t.test).length}</span></button>`).join('')}</div>
        ${planTable(rows, ['id', 'arahan', 'target', 'status', 'progress', 'update', 'ver', 'updAction'], { emptyTitle: 'Tidak ada rencana aksi pada tab ini', emptyText: tab.id === 'action' ? 'Seluruh rencana aksi sudah dikirim atau selesai.' : '' })}
      </section>
    </div>`;
  }
});
Actions.updTab = el => { ui.upd.tab = el.dataset.t; renderPage(true); };
Actions.updSatker = el => { ui.upd.satker = el.value; renderPage(true); };
Actions.openUpdate = el => openUpdateForm(el.dataset.id);

function formStatusFor(ap) { const b = baseStatus(ap); return b; }
function previewStatus(p, chosen, target) {
  if (p >= 100) return 'Selesai';
  if (target && target < todayISO()) return 'Terlambat';
  if (chosen === 'Menunggu Arahan') return 'Menunggu Arahan';
  return p <= 0 ? 'Belum Mulai' : 'Dalam Proses';
}
function openUpdateForm(id) {
  const ap = findPlan(id); if (!ap) return;
  const lock = updateLock(ap);
  if (lock) { toast(lock === 'Menunggu Verifikasi' ? 'Update sedang menunggu verifikasi Admin dan belum dapat diubah.' : lock + '.', 'warn'); return; }
  const src = ap.draft || {};
  const v = { progress: src.progress ?? ap.progress, status: src.status || formStatusFor(ap), updateDate: src.updateDate || todayISO(), tindakLanjut: src.tindakLanjut ?? ap.tindakLanjut, output: src.output ?? ap.output, kendala: src.kendala ?? ap.kendala, targetDate: src.targetDate ?? ap.targetDate, catatan: src.catatan ?? '' };
  let files = (src.files || []).slice();
  const revision = ['Perlu Perbaikan', 'Ditolak'].includes(ap.verificationStatus) && ap.verificationNote;
  const filesHTML = () => [...ap.evidence.map(e => ({ ...e, saved: true })), ...files].map((f, i) => `<div class="evi-item">${icon('clip')}<div class="grow"><b>${esc(f.name)}</b><span class="meta">${fmtSize(f.size)} · ${f.saved ? 'tersimpan' : 'baru, akan diunggah'}</span></div>${f.saved ? '' : `<button type="button" class="btn xs ghost" data-rm="${i - ap.evidence.length}" aria-label="Hapus ${esc(f.name)}">${icon('x', 'sm')}</button>`}</div>`).join('') || '<div class="small muted">Belum ada bukti.</div>';
  const m = openModal({
    title: 'Update Status Tindak Lanjut', size: 'lg', sub: `<span class="mono">${ap.id}</span> · target ${fmtDate(ap.targetDate)} · ${esc(ap.satker)}`,
    body: `<div style="display:flex;flex-direction:column;gap:14px">
      ${revision ? `<div class="ai-banner ${ap.verificationStatus === 'Ditolak' ? 'red' : 'violet'}">${icon('undo')}<span><b>${esc(ap.verificationStatus)}:</b> ${esc(ap.verificationNote)}</span></div>` : ''}
      ${ap.draft ? `<div class="ai-banner">${icon('save')}<span>Melanjutkan draft yang disimpan ${relTime(ap.draft.savedAt)}.</span></div>` : ''}
      <div class="quote" style="font-size:13px">${esc(ap.arahan)}</div>
      <div class="form-grid">
        <div class="field"><label for="uf-status">Status</label><select class="select" id="uf-status">${['Belum Mulai', 'Dalam Proses', 'Menunggu Arahan', 'Selesai'].map(s => `<option ${s === v.status ? 'selected' : ''}>${s}</option>`).join('')}</select><span class="hint">“Terlambat” ditetapkan otomatis oleh sistem.</span></div>
        <div class="field"><label for="uf-date">Tanggal Update</label><input class="input" type="date" id="uf-date" value="${esc(v.updateDate)}" max="${todayISO()}"></div>
        <div class="field span-2"><label for="uf-progress">Progress</label><div class="range-row"><input type="range" id="uf-progress" min="0" max="100" step="5" value="${v.progress}"><span class="range-val" id="uf-pval">${v.progress}%</span></div>
          <span class="hint" id="uf-hint"></span></div>
        <div class="field span-2"><label for="uf-tl">Tindak Lanjut <span class="req">*</span></label><textarea class="textarea" id="uf-tl" placeholder="Uraikan kegiatan tindak lanjut yang telah dilakukan">${esc(v.tindakLanjut)}</textarea></div>
        <div class="field"><label for="uf-out">Output</label><textarea class="textarea" id="uf-out" placeholder="Dokumen / hasil yang dihasilkan">${esc(v.output)}</textarea></div>
        <div class="field"><label for="uf-kendala">Kendala</label><textarea class="textarea" id="uf-kendala" placeholder="Hambatan atau arahan yang dibutuhkan">${esc(v.kendala)}</textarea></div>
        <div class="field"><label for="uf-target">Target Penyelesaian <span class="req">*</span></label><input class="input" type="date" id="uf-target" value="${esc(v.targetDate)}"><span class="hint" id="uf-thint"></span></div>
        <div class="field"><label>Upload Bukti</label><label class="file-pick" for="uf-file">${icon('upload')}<span>Pilih berkas bukti (PDF, DOCX, XLSX, JPG, PNG)</span></label><input type="file" id="uf-file" multiple hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"></div>
        <div class="field span-2"><div class="evi" id="uf-files">${filesHTML()}</div></div>
        <div class="field span-2"><label for="uf-note">Catatan</label><textarea class="textarea" id="uf-note" style="min-height:60px" placeholder="Catatan tambahan untuk verifikator">${esc(v.catatan)}</textarea></div>
      </div></div>`,
    onMount: (el) => {
      const sel = $('#uf-status', el), rng = $('#uf-progress', el), tgt = $('#uf-target', el);
      const paint = () => {
        const p = +rng.value; $('#uf-pval', el).textContent = p + '%';
        const st = previewStatus(p, sel.value, tgt.value);
        $('#uf-hint', el).innerHTML = `Status sistem setelah disimpan: ${badge(st)}${p >= 100 ? ' · bukti wajib dilampirkan' : ''}`;
        $('#uf-thint', el).innerHTML = tgt.value && tgt.value < todayISO() && p < 100 ? '<span style="color:var(--danger-ink)">Target telah lewat — status akan menjadi Terlambat.</span>' : tgt.value !== ap.targetDate ? `<span style="color:var(--warn-ink)">Diubah dari ${fmtDate(ap.targetDate)} — perlu persetujuan Admin.</span>` : '';
      };
      rng.addEventListener('input', () => {
        const p = +rng.value;
        if (p >= 100) sel.value = 'Selesai'; else if (p === 0 && sel.value !== 'Menunggu Arahan') sel.value = 'Belum Mulai'; else if (sel.value !== 'Menunggu Arahan') sel.value = 'Dalam Proses';
        paint();
      });
      sel.addEventListener('change', () => {
        const s = sel.value; let p = +rng.value;
        if (s === 'Selesai') p = 100; else if (s === 'Belum Mulai') p = 0; else if (s === 'Dalam Proses' && (p === 0 || p === 100)) p = p === 0 ? 10 : 90; else if (s === 'Menunggu Arahan' && p === 100) p = 90;
        rng.value = p; paint();
      });
      tgt.addEventListener('change', paint);
      $('#uf-file', el).addEventListener('change', e => {
        Array.from(e.target.files).forEach(f => { if (f.size > 20 * 1048576) return toast(`${f.name} melebihi 20 MB.`, 'error'); files.push({ name: f.name, size: f.size }); fileCache[f.name] = f; });
        e.target.value = ''; $('#uf-files', el).innerHTML = filesHTML();
      });
      $('#uf-files', el).addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { files.splice(+b.dataset.rm, 1); $('#uf-files', el).innerHTML = filesHTML(); } });
      paint();
    },
    foot: [
      { label: 'Batal', cls: 'ghost', left: true },
      { label: 'Simpan Draft', icon: 'save', onClick: mm => saveUpdate(ap, mm, files, false) },
      { label: 'Kirim untuk Verifikasi', cls: 'green', icon: 'send', onClick: mm => saveUpdate(ap, mm, files, true) }
    ]
  });
  return m;
}
function readUpdateForm(el) {
  const g = s => $(s, el).value.trim();
  return { status: g('#uf-status'), progress: +g('#uf-progress'), updateDate: g('#uf-date'), tindakLanjut: g('#uf-tl'), output: g('#uf-out'), kendala: g('#uf-kendala'), targetDate: g('#uf-target'), catatan: g('#uf-note') };
}
function saveUpdate(ap, m, files, submit) {
  const el = m.el; const v = readUpdateForm(el);
  $$('.invalid', el).forEach(x => x.classList.remove('invalid'));
  const fail = (sel, msg) => { const f = $(sel, el); if (f) { f.classList.add('invalid'); f.focus(); } toast(msg, 'error'); };
  if (!v.targetDate) return fail('#uf-target', '⚠ Target penyelesaian wajib diisi.');
  if (!v.updateDate) return fail('#uf-date', '⚠ Tanggal update wajib diisi.');
  if (v.updateDate > todayISO()) return fail('#uf-date', '⚠ Tanggal update tidak boleh melebihi hari ini.');
  if (submit) {
    if (!v.tindakLanjut) return fail('#uf-tl', '⚠ Tindak lanjut wajib diisi sebelum dikirim.');
    if (v.status === 'Menunggu Arahan' && !v.kendala) return fail('#uf-kendala', '⚠ Jelaskan kendala atau arahan yang ditunggu.');
    if (v.progress >= 100 && !ap.evidence.length && !files.length) return fail('#uf-file', '⚠ Unggah minimal satu bukti untuk progress 100%.');
  }
  if (!submit) {
    ap.draft = { ...v, files: files.slice(), savedAt: new Date().toISOString() };
    ap.updatedAt = new Date().toISOString();
    audit('Simpan Draft', ap.id, '-', `Draft progress ${v.progress}%`, 'Draft belum dikirim ke verifikator');
    m.close(); toast('Data berhasil disimpan sebagai draft.'); commit();
    return;
  }
  confirmDialog({
    title: 'Kirim untuk verifikasi?', confirmLabel: 'Kirim', tone: 'green',
    message: `Progress <b>${ap.progress}% → ${v.progress}%</b>, status <b>${previewStatus(v.progress, v.status, v.targetDate)}</b>${files.length ? `, ${files.length} bukti baru` : ''}. Setelah dikirim, update <b>tidak dapat diubah</b> sampai Admin / MRDK melakukan review.`,
    onConfirm: () => {
      const now = new Date().toISOString();
      const prev = { progress: ap.progress, status: execStatus(ap), target: ap.targetDate, ver: ap.verificationStatus };
      ap.progress = v.progress;
      ap.manualStatus = v.status === 'Menunggu Arahan' && v.progress < 100 ? 'Menunggu Arahan' : null;
      Object.assign(ap, { tindakLanjut: v.tindakLanjut, output: v.output, kendala: v.kendala, catatan: v.catatan, targetDate: v.targetDate, updateDate: v.updateDate, latestUpdate: v.tindakLanjut, updatedAt: now });
      if (ap.progress >= 100) { if (!ap.completedDate) ap.completedDate = v.updateDate; } else ap.completedDate = '';
      files.forEach(f => ap.evidence.push({ name: f.name, size: f.size, uploadedAt: now, by: cu().name }));
      ap.verificationStatus = 'Menunggu Verifikasi'; ap.verificationNote = ''; ap.draft = null;
      ap.submissions.push({ at: now, by: cu().name, progressFrom: prev.progress, progressTo: v.progress, status: execStatus(ap), tindakLanjut: v.tindakLanjut, output: v.output, kendala: v.kendala, catatan: v.catatan, targetDate: v.targetDate, prevTarget: prev.target, evidence: ap.evidence.map(e => e.name), result: null, resultNote: '', resultBy: '', resultAt: '' });
      if (prev.progress !== v.progress) audit('Update Progress', ap.id, prev.progress + '%', v.progress + '%', v.tindakLanjut.slice(0, 120));
      if (prev.status !== execStatus(ap)) audit('Update Status', ap.id, prev.status, execStatus(ap), v.status === 'Menunggu Arahan' ? v.kendala : '');
      if (prev.target !== v.targetDate) audit('Ubah Target', ap.id, fmtDate(prev.target), fmtDate(v.targetDate), 'Diusulkan Satker');
      files.forEach(f => audit('Upload Bukti', ap.id, '-', f.name));
      audit('Submit Verifikasi', ap.id, 'Draft', 'Menunggu Verifikasi', v.catatan);
      notify(['admin'], `Rencana aksi ${ap.id} menunggu verifikasi.`, 'warn', { type: 'verify', id: ap.id });
      notify(['admin', 'viewer'], `${satkerShort(ap.satker)} melakukan update progress ${ap.id}: ${prev.progress}% → ${v.progress}%.`, 'info', { type: 'plan', id: ap.id });
      m.close(); toast('Update berhasil dikirim untuk verifikasi.'); commit();
    }
  });
}
