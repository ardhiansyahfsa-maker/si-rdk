/* =========================================================================
   SI-RDK · trajectory.js — Kategori Atensi Pemantauan & Trajectory
   Seluruh arahan DK wajib ditindaklanjuti. Kategori atensi TIDAK menilai
   kepentingan arahan, melainkan intensitas pemantauan oleh MRDK, dan
   diturunkan otomatis dari atribut faktual:
     · Horizon  : Segera / Tahun Berjalan / Berkelanjutan
     · Cakupan  : OJK-wide / Lintas Satker / Satu Satker
   Alur: MRDK mencatat atribut → satker konfirmasi / ajukan penyesuaian →
   satker susun trajectory TW I–IV → MRDK setujui / kembalikan.
   ========================================================================= */

const HORIZONS = ['Segera', 'Tahun Berjalan', 'Berkelanjutan'];
const SCOPES = ['OJK-wide', 'Lintas Satker', 'Satu Satker'];
const H_SCORE = { 'Segera': 3, 'Tahun Berjalan': 2, 'Berkelanjutan': 1 };
const S_SCORE = { 'OJK-wide': 3, 'Lintas Satker': 2, 'Satu Satker': 1 };
const HORIZON_HINT = { 'Segera': 'Jangka waktu ≤ 3 bulan sejak arahan, atau tenggat yang ditetapkan DK / DPR / BPK', 'Tahun Berjalan': 'Diselesaikan dalam tahun takwim arahan', 'Berkelanjutan': 'Program berkelanjutan atau lintas tahun' };
const SCOPE_HINT = { 'OJK-wide': 'Berdampak ke seluruh OJK atau lintas sektor jasa keuangan · otomatis dialirkan ke SI-GRC', 'Lintas Satker': 'Melibatkan lebih dari satu satker atau bidang', 'Satu Satker': 'Diselesaikan dalam lingkup satker pelaksana' };
const QUADRANTS = {
  AK: { label: 'Atensi Khusus', cls: 'b-red', prio: 'Atensi Khusus' },
  AT: { label: 'Atensi Tinggi', cls: 'b-amber', prio: 'Atensi Tinggi' },
  PR: { label: 'Pemantauan Reguler', cls: 'b-blue', prio: 'Pemantauan Reguler' }
};
const ATENSI_NOTE = 'Seluruh arahan Dewan Komisioner wajib ditindaklanjuti; kategori atensi menunjukkan intensitas pemantauan oleh MRDK, bukan tingkat kepentingan arahan.';
const TW = ['TW I', 'TW II', 'TW III', 'TW IV'];
const twEnd = (y, i) => `${y}-${['03-31', '06-30', '09-30', '12-31'][i]}`;
const twStart = (y, i) => `${y}-${['01-01', '04-01', '07-01', '10-01'][i]}`;
const PREP_STATUSES = ['Menunggu Penetapan Atensi', 'Menunggu Konfirmasi Satker', 'Penyesuaian Diajukan', 'Menyusun Trajectory', 'Trajectory Dikembalikan', 'Menunggu Persetujuan Trajectory', 'Trajectory Disetujui'];
const TRACK_STATUSES = ['Tertinggal', 'Sesuai Trajectory', 'Selesai'];
Object.assign(BADGE_CLASS, {
  'Menunggu Penetapan Atensi': 'b-outline', 'Menunggu Konfirmasi Satker': 'b-amber', 'Penyesuaian Diajukan': 'b-violet',
  'Menyusun Trajectory': 'b-blue', 'Trajectory Dikembalikan': 'b-violet', 'Menunggu Persetujuan Trajectory': 'b-amber', 'Trajectory Disetujui': 'b-teal',
  'Tertinggal': 'b-red', 'Sesuai Trajectory': 'b-green', 'Tercapai': 'b-green', 'Tidak Tercapai': 'b-red', 'Berjalan': 'b-blue', 'Akan Datang': 'b-outline'
});
ui.traj = { q: '', prep: '', track: '', quad: '', satker: '' };

/* ------------------------------ Aturan ----------------------------------- */
/** Kategori atensi dari atribut faktual horizon × cakupan. */
function quadrantOf(h, sc) {
  if (!h || !sc) return null;
  const t = H_SCORE[h] + S_SCORE[sc];
  return t >= 6 ? 'AK' : t === 5 ? 'AT' : 'PR';
}
const quadOf = ap => ap.cls ? quadrantOf(ap.cls.horizon, ap.cls.scope) : null;
const clsFacts = c => c ? `${esc(c.horizon)} · ${esc(c.scope)}` : '—';
const quadBadge = q => q ? `<span class="badge ${QUADRANTS[q].cls}">${QUADRANTS[q].label}</span>` : '<span class="muted small">Belum ditetapkan</span>';

function prepStatus(ap) {
  const c = ap.cls;
  if (!c) return 'Menunggu Penetapan Atensi';
  if (!ap.satker) return 'Menunggu Konfirmasi Satker';
  if (c.status !== 'confirmed' || c.satker !== ap.satker) return c.status === 'adjust' && c.satker === ap.satker ? 'Penyesuaian Diajukan' : 'Menunggu Konfirmasi Satker';
  const t = ap.traj && ap.traj.satker === ap.satker ? ap.traj : null;
  if (!t || t.status === 'draft') return 'Menyusun Trajectory';
  if (t.status === 'returned') return 'Trajectory Dikembalikan';
  if (t.status === 'submitted') return 'Menunggu Persetujuan Trajectory';
  return 'Trajectory Disetujui';
}
/** Progres realisasi per tanggal, dari riwayat Update Progress di audit trail. */
function progressAt(ap, iso) {
  if (iso >= todayISO()) return ap.progress;
  let p = 0;
  appState.auditLogs.forEach(l => { if (l.entity === ap.id && l.action === 'Update Progress' && tsDay(l.ts) <= iso) { const v = parseInt(l.newValue, 10); if (!isNaN(v)) p = v; } });
  return p;
}
/** Status tiap TW pada trajectory. */
function twRows(ap) {
  const t = ap.traj; if (!t) return [];
  const today = todayISO();
  return t.items.map((it, i) => {
    const end = twEnd(t.year, i), start = twStart(t.year, i);
    let st = 'Akan Datang', real = null;
    if (it.locked) st = '—';
    else if (end < today) { real = progressAt(ap, end); st = real >= it.target ? 'Tercapai' : 'Tidak Tercapai'; }
    else if (start <= today) { real = ap.progress; st = 'Berjalan'; }
    return { ...it, i, end, start, st, real };
  });
}
/** Posisi terhadap trajectory yang disetujui (per hari ini). */
function trackStatus(ap) {
  if (prepStatus(ap) !== 'Trajectory Disetujui') return null;
  if (ap.progress >= 100) return { st: 'Selesai', gap: 0 };
  const t = ap.traj; const today = todayISO();
  const ended = t.items.map((it, i) => ({ ...it, i })).filter(it => !it.locked && twEnd(t.year, it.i) < today);
  if (!ended.length) return { st: 'Sesuai Trajectory', gap: 0, ref: null };
  const ref = ended.at(-1); const gap = ref.target - ap.progress;
  return { st: gap > 0 ? 'Tertinggal' : 'Sesuai Trajectory', gap, ref };
}
const visibleTrajPlans = () => visiblePlans();
function trajTodo() {
  const r = cu().role; const ps = visibleTrajPlans();
  if (r === 'admin') return ps.filter(a => ['Menunggu Penetapan Atensi', 'Penyesuaian Diajukan', 'Menunggu Persetujuan Trajectory'].includes(prepStatus(a)));
  if (r === 'satker') return ps.filter(a => ['Menunggu Konfirmasi Satker', 'Menyusun Trajectory', 'Trajectory Dikembalikan'].includes(prepStatus(a)));
  return [];
}

/* ------------------------------ Tahap 1 · MRDK catat atribut atensi ----- */
const optRadios = (name, list, cur, hints) => list.map(l => `<label class="check" style="align-items:flex-start"><input type="radio" name="${name}" value="${l}" ${cur === l ? 'checked' : ''}><span><b>${l}</b> <span class="small muted">· ${hints[l]}</span></span></label>`).join('');
Actions.clsSet = el => {
  if (!isRole('admin')) return toast('Kategori atensi dicatat oleh Admin MRDK.', 'error');
  const ap = findPlan(el.dataset.id); if (!ap) return;
  const c = ap.cls || {}; const adj = prepStatus(ap) === 'Penyesuaian Diajukan';
  const h0 = adj ? c.proposal?.horizon : c.horizon, s0 = adj ? c.proposal?.scope : c.scope;
  openModal({
    title: adj ? 'Tanggapi Usulan Penyesuaian Atensi' : 'Penetapan Kategori Atensi', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`,
    body: `<div class="ai-banner" style="margin-bottom:12px">${icon('info')}<span>${ATENSI_NOTE} Kategori diturunkan otomatis dari atribut faktual berikut.</span></div>
      ${adj ? `<div class="ai-banner violet" style="margin-bottom:12px">${icon('undo')}<span><b>Usulan ${esc(satkerShort(ap.satker))}:</b> ${esc(c.proposal.horizon)} · ${esc(c.proposal.scope)} — ${esc(c.proposal.note)}<br><span class="small">Pencatatan semula: ${esc(c.horizon)} · ${esc(c.scope)}. Keputusan MRDK berikut bersifat final.</span></span></div>` : ''}
      <div class="form-grid">
        <div class="field"><label>Horizon penyelesaian</label>${optRadios('cs-h', HORIZONS, h0 || 'Tahun Berjalan', HORIZON_HINT)}</div>
        <div class="field"><label>Cakupan dampak</label>${optRadios('cs-s', SCOPES, s0 || 'Satu Satker', SCOPE_HINT)}</div>
        <div class="field span-2"><label>Kategori atensi (otomatis)</label><div id="cs-q"></div></div>
        <div class="field span-2"><label for="cs-note">Catatan MRDK <span class="small muted">(opsional)</span></label><textarea class="textarea" id="cs-note" style="min-height:56px">${esc(adj ? '' : c.note || '')}</textarea></div>
      </div>`,
    onMount: m => { const upd = () => { const h = $('input[name="cs-h"]:checked', m).value, sc = $('input[name="cs-s"]:checked', m).value; $('#cs-q', m).innerHTML = quadBadge(quadrantOf(h, sc)); }; m.addEventListener('change', upd); upd(); },
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: adj ? 'Tetapkan Final' : (ap.satker ? 'Simpan & Minta Konfirmasi' : 'Simpan'), cls: 'primary', icon: 'save', onClick: m => {
      const horizon = $('input[name="cs-h"]:checked', m.el).value, scope = $('input[name="cs-s"]:checked', m.el).value, note = $('#cs-note', m.el).value.trim();
      const q = quadrantOf(horizon, scope); const prevQ = quadOf(ap); const now = new Date().toISOString();
      if (!adj && c.horizon === horizon && c.scope === scope && (c.note || '') === note) { m.close(); return toast('Tidak ada perubahan.', 'info'); }
      ap.cls = { ...c, horizon, scope, note, by: cu().name, at: now, status: adj ? 'confirmed' : 'proposed', satker: adj ? ap.satker : null, proposal: adj ? { ...c.proposal, decidedBy: cu().name, decidedAt: now } : null };
      if (!adj) { ap.cls.confirmedBy = null; ap.cls.confirmedAt = null; }
      ap.priority = QUADRANTS[q].prio;
      audit('Penetapan Atensi', ap.id, prevQ ? QUADRANTS[prevQ].label : '-', `${QUADRANTS[q].label} (${horizon} · ${scope}})`, adj ? `Final setelah usulan penyesuaian satker${note ? ' · ' + note : ''}` : note);
      if (ap.satker) notify(['satker:' + ap.satker], adj ? `MRDK menetapkan final kategori atensi ${ap.id}: ${QUADRANTS[q].label}. Silakan susun trajectory.` : `Mohon konfirmasi atribut atensi ${ap.id}: ${horizon} · ${scope} → ${QUADRANTS[q].label}.`, 'warn', { type: 'plan', id: ap.id });
      m.close(); toast(adj ? 'Kategori atensi final ditetapkan. Satker dapat menyusun trajectory.' : 'Kategori atensi tersimpan. Menunggu konfirmasi satker.'); commit();
    } }]
  });
};

/* ------------------------------ Tahap 2 · Satker konfirmasi -------------- */
Actions.clsConfirm = el => {
  const ap = findPlan(el.dataset.id); if (!ap || !isRole('satker') || ap.satker !== cu().satker || prepStatus(ap) !== 'Menunggu Konfirmasi Satker') return;
  const c = ap.cls; const q = quadOf(ap);
  openModal({
    title: 'Konfirmasi Atribut Atensi', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`,
    body: `<dl class="kv" style="margin-bottom:14px"><dt>Kategori atensi</dt><dd>${quadBadge(q)}</dd><dt>Horizon</dt><dd><b>${esc(c.horizon)}</b> <span class="small muted">· ${HORIZON_HINT[c.horizon]}</span></dd><dt>Cakupan</dt><dd><b>${esc(c.scope)}</b> <span class="small muted">· ${SCOPE_HINT[c.scope]}</span></dd>${c.note ? `<dt>Catatan MRDK</dt><dd>${esc(c.note)}</dd>` : ''}</dl>
      <div class="small muted" style="margin-bottom:10px">${ATENSI_NOTE}</div>
      <div class="field"><label>Tanggapan Satker</label>
        <label class="check"><input type="radio" name="cc-dec" value="ok" checked>Konfirmasi — atribut sesuai, lanjut menyusun trajectory</label>
        <label class="check"><input type="radio" name="cc-dec" value="adj">Ajukan koreksi atribut ke MRDK</label></div>
      <div id="cc-adj" hidden><div class="form-grid" style="margin-top:8px">
        <div class="field"><label for="cc-h">Horizon menurut satker</label><select class="select" id="cc-h">${HORIZONS.map(l => `<option ${l === c.horizon ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field"><label for="cc-s">Cakupan menurut satker</label><select class="select" id="cc-s">${SCOPES.map(l => `<option ${l === c.scope ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field span-2"><label for="cc-note">Alasan / fakta pendukung <span class="req">*</span></label><textarea class="textarea" id="cc-note" style="min-height:60px"></textarea></div></div></div>`,
    onMount: m => m.addEventListener('change', () => { $('#cc-adj', m).hidden = $('input[name="cc-dec"]:checked', m).value !== 'adj'; }),
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Kirim', cls: 'primary', icon: 'send', onClick: m => {
      const dec = $('input[name="cc-dec"]:checked', m.el).value; const now = new Date().toISOString();
      if (dec === 'ok') {
        Object.assign(ap.cls, { status: 'confirmed', satker: ap.satker, confirmedBy: cu().name, confirmedAt: now });
        audit('Konfirmasi Atensi', ap.id, 'Menunggu Konfirmasi Satker', 'Dikonfirmasi', QUADRANTS[q].label);
        notify(['admin'], `${satkerShort(ap.satker)} mengonfirmasi atribut atensi ${ap.id} (${QUADRANTS[q].label}).`, 'ok', { type: 'plan', id: ap.id });
        m.close(); toast('Atribut atensi dikonfirmasi. Silakan susun trajectory.'); commit(); openTrajForm(ap.id); return;
      }
      const h = $('#cc-h', m.el).value, sc = $('#cc-s', m.el).value, note = $('#cc-note', m.el).value.trim();
      if (!note) { $('#cc-note', m.el).classList.add('invalid'); return toast('⚠ Alasan koreksi wajib diisi.', 'error'); }
      Object.assign(ap.cls, { status: 'adjust', satker: ap.satker, proposal: { horizon: h, scope: sc, note, by: cu().name, at: now } });
      audit('Usulan Penyesuaian Atensi', ap.id, `${ap.cls.horizon} · ${ap.cls.scope}`, `${h} · ${sc}`, note);
      notify(['admin'], `${satkerShort(ap.satker)} mengajukan koreksi atribut atensi ${ap.id}.`, 'warn', { type: 'plan', id: ap.id });
      m.close(); toast('Usulan koreksi terkirim ke Admin MRDK.'); commit();
    } }]
  });
};

/* ------------------------------ Tahap 3 · Satker susun trajectory -------- */
function openTrajForm(id) {
  const ap = findPlan(id); if (!ap || !isRole('satker') || ap.satker !== cu().satker || !['Menyusun Trajectory', 'Trajectory Dikembalikan'].includes(prepStatus(ap))) return;
  const t0 = ap.traj && ap.traj.satker === ap.satker ? ap.traj : null;
  const rdkY = +ap.rdkDate.slice(0, 4);
  const year0 = t0?.year || rdkY;
  const rows = y => TW.map((label, i) => {
    const locked = twEnd(y, i) < ap.rdkDate; const it = t0 && t0.year === y ? t0.items[i] : null;
    return `<tr data-i="${i}" ${locked ? 'class="muted"' : ''}><td><b>${label}</b><div class="small muted nowrap">s.d. ${fmtDate(twEnd(y, i))}</div></td>
      <td><input class="input sm tnum" type="number" min="0" max="100" step="5" style="width:84px" data-k="target" value="${locked ? 0 : it ? it.target : (i === 3 ? 100 : '')}" ${locked || i === 3 ? 'disabled' : ''}></td>
      <td><input class="input sm" data-k="output" style="min-width:240px" value="${esc(locked ? '' : it?.output || '')}" placeholder="${locked ? 'Sebelum arahan diterima' : 'Tahapan / keluaran yang dicapai pada TW ini'}" ${locked ? 'disabled' : ''}></td></tr>`;
  }).join('');
  openModal({
    title: 'Susun Trajectory Penyelesaian', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`, size: 'lg',
    body: `${t0?.status === 'returned' ? `<div class="ai-banner violet" style="margin-bottom:12px">${icon('undo')}<span><b>Dikembalikan MRDK:</b> ${esc(t0.reviewNote || '')}</span></div>` : ''}
      <div class="small muted" style="margin-bottom:10px">Isi target progres <b>kumulatif</b> per triwulan tahun takwim; TW IV = 100%. Triwulan yang berakhir sebelum tanggal RDK (${fmtDate(ap.rdkDate)}) otomatis 0%. Kategori atensi: ${quadBadge(quadOf(ap))} · target selesai ${fmtDate(ap.targetDate)}.</div>
      <div class="field" style="max-width:200px;margin-bottom:10px"><label for="tj-year">Tahun takwim</label><select class="select sm" id="tj-year">${[rdkY, rdkY + 1].map(y => `<option ${y === year0 ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
      <div class="tbl-wrap"><table class="rt"><thead><tr><th>Triwulan</th><th>Target (%)</th><th>Tahapan / Keluaran</th></tr></thead><tbody id="tj-rows">${rows(year0)}</tbody></table></div>
      <div class="small" id="tj-warn" style="margin-top:8px;color:var(--warn-ink)"></div>`,
    onMount: m => {
      const warn = () => { const y = +$('#tj-year', m).value; $('#tj-warn', m).textContent = ap.targetDate > `${y}-12-31` ? `⚠ Target selesai penugasan (${fmtDate(ap.targetDate)}) melewati akhir tahun ${y}.` : ''; };
      $('#tj-year', m).addEventListener('change', e => { $('#tj-rows', m).innerHTML = rows(+e.target.value); warn(); }); warn();
    },
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan Draft', cls: '', icon: 'save', onClick: m => saveTraj(ap, m, false) }, { label: 'Ajukan ke MRDK', cls: 'primary', icon: 'send', onClick: m => saveTraj(ap, m, true) }]
  });
}
function saveTraj(ap, m, submit) {
  const year = +$('#tj-year', m.el).value; const items = [];
  let err = '';
  $$('#tj-rows tr', m.el).forEach(tr => {
    const i = +tr.dataset.i; const locked = twEnd(year, i) < ap.rdkDate;
    const target = i === 3 ? 100 : locked ? 0 : Number($('[data-k="target"]', tr).value);
    const output = $('[data-k="output"]', tr).value.trim();
    if (!locked && submit) { if ($('[data-k="target"]', tr).value === '' && i < 3) err = err || `Target ${TW[i]} wajib diisi.`; if (!output) err = err || `Tahapan/keluaran ${TW[i]} wajib diisi.`; }
    if (target < 0 || target > 100) err = err || `Target ${TW[i]} harus 0–100%.`;
    items.push({ target: isNaN(target) ? 0 : target, output, locked });
  });
  for (let i = 1; i < 4; i++) if (items[i].target < items[i - 1].target) { err = err || `Target ${TW[i]} tidak boleh lebih kecil dari ${TW[i - 1]} (target kumulatif).`; }
  if (err) return toast('⚠ ' + err, 'error');
  const now = new Date().toISOString(); const prev = prepStatus(ap);
  ap.traj = { ...(ap.traj || {}), year, items, satker: ap.satker, status: submit ? 'submitted' : 'draft', by: cu().name, at: now, submittedAt: submit ? now : (ap.traj?.submittedAt || null) };
  if (submit) {
    audit('Ajukan Trajectory', ap.id, prev, 'Menunggu Persetujuan Trajectory', items.map((it, i) => `${TW[i]} ${it.target}%`).join(' · '));
    notify(['admin'], `${satkerShort(ap.satker)} mengajukan trajectory ${ap.id} (tahun ${year}) untuk disetujui.`, 'warn', { type: 'plan', id: ap.id });
  }
  m.close(); toast(submit ? 'Trajectory diajukan ke Admin MRDK.' : 'Draft trajectory tersimpan.'); commit();
}
Actions.trajEdit = el => openTrajForm(el.dataset.id);

/* ------------------------------ Tahap 4 · MRDK review trajectory --------- */
Actions.trajReview = el => {
  const ap = findPlan(el.dataset.id); if (!ap || !isRole('admin') || prepStatus(ap) !== 'Menunggu Persetujuan Trajectory') return;
  openModal({
    title: 'Persetujuan Trajectory', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.satker)}`, size: 'lg',
    body: `<div class="small muted" style="margin-bottom:10px">Atensi ${quadBadge(quadOf(ap))} · RDK ${fmtDate(ap.rdkDate)} · target selesai ${fmtDate(ap.targetDate)} · diajukan ${esc(ap.traj.by)}, ${fmtDT(ap.traj.submittedAt)}</div>
      ${trajTableHTML(ap, true)}
      <div class="field" style="margin-top:12px"><label>Keputusan</label>
        <label class="check"><input type="radio" name="tr-dec" value="ok" checked>Setujui trajectory</label>
        <label class="check"><input type="radio" name="tr-dec" value="back">Kembalikan ke satker untuk diperbaiki</label></div>
      <div class="field" style="margin-top:8px"><label for="tr-note">Catatan <span class="small muted">(wajib bila dikembalikan)</span></label><textarea class="textarea" id="tr-note" style="min-height:56px"></textarea></div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan Keputusan', cls: 'primary', icon: 'shield', onClick: m => {
      const dec = $('input[name="tr-dec"]:checked', m.el).value, note = $('#tr-note', m.el).value.trim();
      if (dec === 'back' && !note) { $('#tr-note', m.el).classList.add('invalid'); return toast('⚠ Catatan wajib diisi bila dikembalikan.', 'error'); }
      Object.assign(ap.traj, { status: dec === 'ok' ? 'approved' : 'returned', reviewBy: cu().name, reviewAt: new Date().toISOString(), reviewNote: note });
      audit('Persetujuan Trajectory', ap.id, 'Menunggu Persetujuan Trajectory', dec === 'ok' ? 'Disetujui' : 'Dikembalikan', note);
      notify(['satker:' + ap.satker], dec === 'ok' ? `Trajectory ${ap.id} disetujui MRDK.` : `Trajectory ${ap.id} dikembalikan MRDK: ${note}`, dec === 'ok' ? 'ok' : 'late', { type: 'plan', id: ap.id });
      m.close(); toast(dec === 'ok' ? 'Trajectory disetujui.' : 'Trajectory dikembalikan ke satker.'); commit();
    } }]
  });
};

/* ------------------------------ Tampilan --------------------------------- */
function trajTableHTML(ap, compact = false) {
  const rows = twRows(ap); if (!rows.length) return '<div class="small muted">Trajectory belum disusun.</div>';
  return `<div class="tbl-wrap"><table class="rt"><thead><tr><th>Triwulan</th><th>Target</th><th>Tahapan / Keluaran</th>${compact ? '' : '<th>Realisasi</th><th>Status</th>'}</tr></thead><tbody>
    ${rows.map(r => `<tr ${r.locked ? 'class="muted"' : ''}><td class="nowrap"><b>${TW[r.i]} ${ap.traj.year}</b><div class="small muted">s.d. ${fmtDate(r.end)}</div></td><td class="tnum"><b>${r.target}%</b></td><td><span class="small">${r.locked ? 'Sebelum arahan diterima' : esc(r.output || '—')}</span></td>${compact ? '' : `<td class="tnum">${r.real == null ? '—' : r.real + '%'}</td><td>${r.st === '—' ? '—' : badge(r.st)}</td>`}</tr>`).join('')}
  </tbody></table></div>`;
}
/** Grafik kecil rencana vs realisasi (SVG). */
function trajChartSVG(ap) {
  const rows = twRows(ap); if (!rows.length) return '';
  const W = 360, H = 150, L = 34, R = 10, Tp = 10, B = 26; const cw = (W - L - R) / 4;
  const x = i => L + cw * i + cw / 2, y = v => Tp + (H - Tp - B) * (1 - v / 100);
  const plan = rows.map(r => `${x(r.i)},${y(r.target)}`).join(' ');
  const realPts = rows.filter(r => r.real != null);
  const grid = [0, 50, 100].map(v => `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L - 6}" y="${y(v) + 4}" font-size="10" text-anchor="end" fill="var(--ink-3)">${v}%</text>`).join('');
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px;display:block" role="img" aria-label="Grafik rencana vs realisasi trajectory">
    ${grid}${rows.map(r => `<text x="${x(r.i)}" y="${H - 8}" font-size="10.5" text-anchor="middle" fill="var(--ink-2)">${TW[r.i]}</text>`).join('')}
    <polyline points="${plan}" fill="none" stroke="var(--blue)" stroke-width="2" stroke-dasharray="5 4"/>
    ${rows.map(r => `<circle cx="${x(r.i)}" cy="${y(r.target)}" r="3.5" fill="#fff" stroke="var(--blue)" stroke-width="2"/>`).join('')}
    ${realPts.length > 1 ? `<polyline points="${realPts.map(r => `${x(r.i)},${y(r.real)}`).join(' ')}" fill="none" stroke="var(--green)" stroke-width="2.5"/>` : ''}
    ${realPts.map(r => `<circle cx="${x(r.i)}" cy="${y(r.real)}" r="4" fill="${r.st === 'Tidak Tercapai' ? 'var(--danger)' : 'var(--green)'}"/>`).join('')}
  </svg><div class="small muted" style="display:flex;gap:14px;margin-top:4px"><span><span style="display:inline-block;width:16px;border-top:2px dashed var(--blue);vertical-align:middle"></span> Rencana</span><span><span style="display:inline-block;width:16px;border-top:2.5px solid var(--green);vertical-align:middle"></span> Realisasi</span></div>`;
}
function trajActionButtons(ap, size = 'sm') {
  const ps = prepStatus(ap); const b = []; const mine = isRole('satker') && ap.satker === cu().satker;
  if (isRole('admin') && ['Menunggu Penetapan Atensi', 'Penyesuaian Diajukan'].includes(ps)) b.push(`<button class="btn ${size} primary" data-act="clsSet" data-id="${ap.id}">${icon('flag', 'sm')}${ps === 'Penyesuaian Diajukan' ? 'Tanggapi usulan' : 'Catat atensi'}</button>`);
  if (isRole('admin') && ps === 'Menunggu Persetujuan Trajectory') b.push(`<button class="btn ${size} primary" data-act="trajReview" data-id="${ap.id}">${icon('shield', 'sm')}Review trajectory</button>`);
  if (mine && ps === 'Menunggu Konfirmasi Satker') b.push(`<button class="btn ${size} primary" data-act="clsConfirm" data-id="${ap.id}">${icon('checkCircle', 'sm')}Konfirmasi atensi</button>`);
  if (mine && ['Menyusun Trajectory', 'Trajectory Dikembalikan'].includes(ps)) b.push(`<button class="btn ${size} primary" data-act="trajEdit" data-id="${ap.id}">${icon('pencil', 'sm')}${ap.traj?.status === 'draft' ? 'Lanjutkan trajectory' : ps === 'Trajectory Dikembalikan' ? 'Perbaiki trajectory' : 'Susun trajectory'}</button>`);
  return b.join('');
}
function trajDrawerSection(ap) {
  const ps = prepStatus(ap); const c = ap.cls; const q = quadOf(ap); const tr = trackStatus(ap);
  const kv = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const t = ap.traj && ap.traj.satker === ap.satker ? ap.traj : null;
  return `<div class="d-sec"><div class="section-label"><span>Atensi & Trajectory</span>${isRole('admin') && c && !['Penyesuaian Diajukan'].includes(ps) ? `<button class="btn xs" data-act="clsSet" data-id="${ap.id}">${icon('sliders', 'sm')}Ubah atensi</button>` : ''}</div>
    <dl class="kv">
      ${kv('Kategori atensi', quadBadge(q))}
      ${c ? kv('Atribut', `${clsFacts(c)} <span class="small muted">· dicatat ${esc(c.by)}</span>`) : ''}
      ${c?.note ? kv('Catatan MRDK', esc(c.note)) : ''}
      ${c?.proposal && ps === 'Penyesuaian Diajukan' ? kv('Usulan satker', `${esc(c.proposal.horizon)} · ${esc(c.proposal.scope)} — ${esc(c.proposal.note)}`) : ''}
      ${kv('Tahap', badge(ps) + (c?.confirmedBy && c.satker === ap.satker ? ` <span class="small muted">· dikonfirmasi ${esc(c.confirmedBy)}</span>` : ''))}
      ${tr ? kv('Posisi trajectory', badge(tr.st) + (tr.st === 'Tertinggal' ? ` <span class="small" style="color:var(--danger-ink)">· kurang ${tr.gap} poin dari target ${TW[tr.ref.i]} (${tr.ref.target}%)</span>` : tr.ref ? ` <span class="small muted">· target ${TW[tr.ref.i]} ${tr.ref.target}% terpenuhi</span>` : '')) : ''}
    </dl>
    ${t?.status === 'returned' ? `<div class="ai-banner violet" style="margin-top:10px">${icon('undo')}<span><b>Dikembalikan MRDK:</b> ${esc(t.reviewNote)}</span></div>` : ''}
    ${t && t.status !== 'draft' ? `<div style="margin-top:12px">${trajTableHTML(ap)}</div>${t.status === 'approved' ? `<div style="margin-top:12px">${trajChartSVG(ap)}</div>` : ''}<div class="small muted" style="margin-top:6px">${t.status === 'approved' ? `Disetujui ${esc(t.reviewBy)} · ${fmtDT(t.reviewAt)}` : `Diajukan ${esc(t.by)} · ${fmtDT(t.submittedAt)}`}</div>` : t?.status === 'draft' ? '<div class="small muted" style="margin-top:8px">Draft trajectory tersimpan, belum diajukan.</div>' : ''}
    <div class="btn-group" style="margin-top:12px">${trajActionButtons(ap)}</div>
  </div>`;
}

/* ------------------------------ Halaman ---------------------------------- */
function trajRows() {
  const f = ui.traj; const q = f.q.trim().toLowerCase(); const mine = new Set(trajTodo().map(a => a.id));
  const qo = { AK: 0, AT: 1, PR: 2 };
  return visibleTrajPlans().filter(a =>
    (!f.prep || prepStatus(a) === f.prep) && (!f.track || trackStatus(a)?.st === f.track) && (!f.quad || quadOf(a) === f.quad) && (!f.satker || a.satker === f.satker) &&
    (!q || [a.id, a.arahan, a.satker, a.topic].some(v => String(v || '').toLowerCase().includes(q)))
  ).sort((a, b) => (mine.has(b.id) - mine.has(a.id)) || (qo[quadOf(a)] ?? 9) - (qo[quadOf(b)] ?? 9) || ((trackStatus(b)?.gap || 0) - (trackStatus(a)?.gap || 0)) || a.id.localeCompare(b.id));
}
function trajMini(ap) {
  const rows = twRows(ap); if (!rows.length || ap.traj.satker !== ap.satker) return '<span class="muted small">—</span>';
  return `<div style="display:flex;gap:3px">${rows.map(r => { const c = r.locked ? 'var(--grey-50)' : ap.traj.status !== 'approved' ? 'var(--surface-2)' : r.st === 'Tercapai' ? 'var(--success-50)' : r.st === 'Tidak Tercapai' ? 'var(--danger-50)' : r.st === 'Berjalan' ? 'var(--blue-50)' : 'var(--surface-2)'; return `<span title="${TW[r.i]}: target ${r.target}%${r.real != null ? ' · realisasi ' + r.real + '%' : ''}" style="min-width:34px;text-align:center;border-radius:6px;padding:3px 2px;background:${c};font-size:11px;line-height:1.2"><b>${TW[r.i].replace('TW ', '')}</b><br>${r.locked ? '–' : r.target + '%'}</span>`; }).join('')}</div>`;
}
function trajTableRowsHTML() {
  const rows = trajRows();
  if (!rows.length) return '<div class="empty"><b>Tidak ada penugasan</b>Ubah filter pencarian.</div>';
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>ID</th><th>Poin Arahan</th><th>Satker</th><th>Atensi</th><th>Tahap</th><th>Trajectory (target kumulatif)</th><th>Progres · Posisi</th><th>Action</th></tr></thead><tbody>
    ${rows.map(a => { const tr = trackStatus(a); return `<tr class="clickable" tabindex="0" data-act="openPlan" data-id="${a.id}">
      <td data-label="ID"><span class="id">${a.id}</span></td>
      <td data-label="Poin Arahan" class="arahan full"><span class="clamp-2">${esc(a.arahan)}</span></td>
      <td data-label="Satker">${a.satker ? `<span style="display:block;min-width:120px">${esc(a.satker)}</span>` : '<span style="color:var(--warn-ink)">Belum ditugaskan</span>'}</td>
      <td data-label="Atensi">${quadBadge(quadOf(a))}${a.cls ? `<div class="small muted" style="margin-top:3px;min-width:120px">${clsFacts(a.cls)}</div>` : ''}</td>
      <td data-label="Tahap">${badge(prepStatus(a))}</td>
      <td data-label="Trajectory">${trajMini(a)}</td>
      <td data-label="Progres · Posisi"><div class="tnum" style="font-weight:600">${a.progress}%</div>${tr ? badge(tr.st) + (tr.st === 'Tertinggal' ? `<div class="small" style="color:var(--danger-ink)">−${tr.gap} poin</div>` : '') : ''}</td>
      <td data-label=""><div class="btn-group" style="flex-wrap:nowrap;gap:4px">${trajActionButtons(a, 'xs')}</div></td></tr>`; }).join('')}
  </tbody></table></div><div class="tbl-foot"><span><b class="tnum">${rows.length}</b> dari <b class="tnum">${visibleTrajPlans().length}</b> penugasan</span></div>`;
}
function matrixHTML(plans, act = 'trajQuad') {
  const f = ui.traj;
  const bg = { AK: 'var(--danger-50)', AT: 'var(--warn-50)', PR: 'var(--blue-50)' };
  const cell = (h, sc) => { const q = quadrantOf(h, sc); const n = plans.filter(a => a.cls && a.cls.horizon === h && a.cls.scope === sc).length;
    return `<button data-act="${act}" data-q="${q}" data-f="quad:${q}" title="${QUADRANTS[q].label}" style="border:1px solid ${act === 'trajQuad' && f.quad === q ? 'var(--blue)' : 'var(--line)'};background:${bg[q]};border-radius:8px;padding:8px 4px;text-align:center;cursor:pointer;min-height:56px"><div style="font-size:20px;font-weight:700;color:var(--navy)" class="tnum">${n}</div><div class="small muted" style="font-size:10.5px">${QUADRANTS[q].label}</div></button>`; };
  return `<div style="display:grid;grid-template-columns:auto repeat(3,1fr);gap:6px;align-items:stretch">
    <div></div>${HORIZONS.map(h => `<div class="small muted" style="text-align:center;font-weight:600">${h}</div>`).join('')}
    ${SCOPES.map(sc => `<div class="small muted" style="font-weight:600;display:flex;align-items:center;padding-right:6px">${sc}</div>${HORIZONS.map(h => cell(h, sc)).join('')}`).join('')}
  </div><div class="small muted" style="margin-top:8px">Kolom = horizon penyelesaian · baris = cakupan dampak · ${plans.filter(a => !a.cls).length} belum dicatat.</div>`;
}
Actions.trajQuad = el => { ui.traj.quad = ui.traj.quad === el.dataset.q ? '' : el.dataset.q; renderPage(true); };
Actions.trajFilter = () => { const f = ui.traj; f.prep = $('#tf-prep').value; f.track = $('#tf-track').value; const s = $('#tf-satker'); f.satker = s ? s.value : ''; $('#traj-table').innerHTML = trajTableRowsHTML(); };
Actions.trajSearch = debounce(el => { ui.traj.q = el.value; $('#traj-table').innerHTML = trajTableRowsHTML(); }, 140);
Actions.trajPrep = el => { ui.traj.prep = ui.traj.prep === el.dataset.s ? '' : el.dataset.s; renderPage(true); };
Actions.trajTrack = el => { ui.traj.track = ui.traj.track === el.dataset.s ? '' : el.dataset.s; renderPage(true); };

registerPage('trajectory', {
  render() {
    const role = cu().role; const plans = visibleTrajPlans(); const todo = trajTodo(); const f = ui.traj;
    const approved = plans.filter(a => prepStatus(a) === 'Trajectory Disetujui');
    const behind = approved.filter(a => trackStatus(a)?.st === 'Tertinggal').length;
    const onTrack = approved.filter(a => trackStatus(a)?.st === 'Sesuai Trajectory').length;
    const done = approved.filter(a => trackStatus(a)?.st === 'Selesai').length;
    const todoLabel = { admin: 'menunggu tindakan MRDK (pencatatan atensi, usulan koreksi, review trajectory)', satker: 'menunggu tindakan Satker Anda (konfirmasi atensi / penyusunan trajectory)' }[role];
    const stageCard = (s, who, ic, tone) => { const n = plans.filter(a => prepStatus(a) === s).length; return `<button class="kpi t-${tone}" data-act="trajPrep" data-s="${esc(s)}" ${f.prep === s ? 'style="outline:2px solid var(--blue);outline-offset:-2px"' : ''}><div class="k-label"><span>${esc(s)}</span><span class="k-ic">${icon(ic, 'sm')}</span></div><div class="k-val">${n}</div><div class="k-sub">${esc(who)}</div></button>`; };
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Monitoring · Atensi & Trajectory</div><h1>Atensi & Trajectory</h1><div class="sub">Kategori <b>atensi pemantauan</b> berdasarkan atribut faktual (horizon × cakupan), dan <b>trajectory penyelesaian 4 triwulan</b> (TW I–IV tahun takwim) yang disusun satker pelaksana dan disetujui MRDK.<div class="small" style="margin-top:6px;color:var(--ink-2)"><i>${ATENSI_NOTE}</i></div></div></div>${exportButtons('trajectory')}</div>
      ${todo.length && todoLabel ? `<div class="ai-banner warn">${icon('bell')}<span><b>${todo.length} penugasan ${todoLabel}:</b> ${todo.slice(0, 8).map(a => `<button class="link-btn mono" data-act="openPlan" data-id="${a.id}">${a.id}</button>`).join(', ')}${todo.length > 8 ? ' …' : ''}</span></div>` : ''}
      <section class="panel flow" aria-label="Alur atensi dan trajectory"><div class="flow-top"><div class="section-label">Alur</div></div>
        <div class="steps">
          <div class="step"><span class="n">01</span><span style="min-width:0"><b>Pencatatan Atensi</b><small>Admin MRDK<br>Horizon & cakupan → kategori atensi</small></span></div>
          <div class="step green"><span class="n">02</span><span style="min-width:0"><b>Konfirmasi Satker</b><small>Satker pelaksana<br>Konfirmasi / ajukan penyesuaian</small></span></div>
          <div class="step green"><span class="n">03</span><span style="min-width:0"><b>Susun Trajectory</b><small>Satker pelaksana<br>Target kumulatif TW I–IV + keluaran</small></span></div>
          <div class="step"><span class="n">04</span><span style="min-width:0"><b>Persetujuan Trajectory</b><small>Admin MRDK<br>Setujui / kembalikan</small></span></div>
        </div></section>
      <section class="grid g-12-8">
        <div class="panel"><div class="panel-head"><div><h3>Matriks Atensi Pemantauan</h3><div class="desc">Jumlah penugasan per horizon × cakupan · klik sel untuk menyaring</div></div></div><div class="panel-body">${matrixHTML(plans)}</div></div>
        <div class="panel"><div class="panel-head"><div><h3>Posisi terhadap Trajectory</h3><div class="desc">Penugasan dengan trajectory disetujui · dibandingkan dengan target TW yang telah berakhir</div></div></div><div class="panel-body">
          <div class="kpis" style="grid-template-columns:repeat(3,minmax(0,1fr))">
            ${[['Tertinggal', behind, 'di bawah target TW terakhir', 'alert', 'red'], ['Sesuai Trajectory', onTrack, 'memenuhi target TW terakhir', 'checkCircle', 'green'], ['Selesai', done, 'progres 100%', 'target', 'teal']].map(([s, n, sub, ic, tone]) => `<button class="kpi t-${tone}" data-act="trajTrack" data-s="${s}" ${f.track === s ? 'style="outline:2px solid var(--blue);outline-offset:-2px"' : ''}><div class="k-label"><span>${s}</span><span class="k-ic">${icon(ic, 'sm')}</span></div><div class="k-val">${n}</div><div class="k-sub">${sub}</div></button>`).join('')}
          </div><div class="small muted" style="margin-top:10px">${approved.length} dari ${plans.length} penugasan telah memiliki trajectory disetujui.</div></div></div>
      </section>
      <section class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr))">
        ${stageCard('Menunggu Penetapan Atensi', 'Admin MRDK', 'flag', 'grey')}
        ${stageCard('Menunggu Konfirmasi Satker', 'Satker', 'clock', 'amber')}
        ${stageCard('Penyesuaian Diajukan', 'Admin MRDK', 'undo', 'grey')}
        ${stageCard('Menyusun Trajectory', 'Satker', 'pencil', 'blue')}
        ${stageCard('Menunggu Persetujuan Trajectory', 'Admin MRDK', 'shield', 'amber')}
        ${stageCard('Trajectory Disetujui', 'Dipantau per TW', 'checkCircle', 'green')}
      </section>
      <section class="panel" id="traj-list"><div class="panel-head"><div><h3>Daftar Penugasan</h3><div class="desc">Yang menunggu tindakan Anda di atas, lalu menurut kategori atensi${f.quad ? ` · disaring: <b>${QUADRANTS[f.quad].label}</b> <button class="link-btn small" data-act="trajQuad" data-q="${f.quad}">hapus</button>` : ''}</div></div></div>
        <div class="toolbar">
          <div class="grow">${icon('search')}<input class="input" placeholder="Cari ID, poin arahan, satker, topik…" value="${esc(f.q)}" data-input="trajSearch"></div>
          <select class="select sm" id="tf-prep" data-change="trajFilter" aria-label="Tahap">${optList(PREP_STATUSES, f.prep, 'Semua tahap')}</select>
          <select class="select sm" id="tf-track" data-change="trajFilter" aria-label="Posisi">${optList(TRACK_STATUSES, f.track, 'Semua posisi')}</select>
          ${role === 'satker' ? '' : `<select class="select sm" id="tf-satker" data-change="trajFilter" aria-label="Satker">${optList(appState.masters.satker.map(s => s.name), f.satker, 'Semua satker')}</select>`}
        </div>
        <div id="traj-table">${trajTableRowsHTML()}</div>
      </section>
    </div>`;
  }
});

Exporters.trajectory = () => ({
  name: 'Atensi_dan_Trajectory', sheet: 'Trajectory', title: 'Atensi Pemantauan & Trajectory Penugasan', subtitle: `${trajRows().length} penugasan`, rows: trajRows(),
  columns: [
    { label: 'ID', get: a => a.id, w: 13 }, { label: 'Poin Arahan', get: a => a.arahan, w: 70 }, { label: 'Satker', get: a => a.satker, w: 40 },
    { label: 'Horizon', get: a => a.cls?.horizon || '', w: 13 }, { label: 'Cakupan', get: a => a.cls?.scope || '', w: 13 }, { label: 'Kategori Atensi', get: a => quadOf(a) ? QUADRANTS[quadOf(a)].label : '', w: 18 },
    { label: 'Tahap', get: a => prepStatus(a), w: 30 }, { label: 'Tahun', get: a => a.traj?.year || '', w: 8 },
    ...TW.map((t, i) => ({ label: `Target ${t}`, get: a => a.traj && a.traj.satker === a.satker ? a.traj.items[i].target : '', w: 10 })),
    ...TW.map((t, i) => ({ label: `Keluaran ${t}`, get: a => a.traj && a.traj.satker === a.satker ? a.traj.items[i].output : '', w: 36 })),
    { label: 'Progres (%)', get: a => a.progress, w: 11 }, { label: 'Posisi', get: a => trackStatus(a)?.st || '', w: 18 }, { label: 'Selisih (poin)', get: a => trackStatus(a)?.gap > 0 ? trackStatus(a).gap : 0, w: 12 }
  ]
});
