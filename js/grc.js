/* =========================================================================
   SI-RDK · grc.js — Interfacing SI-RDK → SI-GRC
   Penugasan yang diklasifikasikan "Strategis · berdampak OJK-wide" dialirkan
   ke SI-GRC sebagai input profil risiko satuan kerja pengampu tindak lanjut.
   Prototipe: pengiriman disimulasikan (api.pushToGRC); payload mengikuti
   kontrak data yang diusulkan di bawah sehingga dapat diganti dengan fetch().
   ========================================================================= */

const GRC_CATEGORIES = ['Risiko Strategis', 'Risiko Operasional', 'Risiko Kepatuhan', 'Risiko Reputasi', 'Risiko Hukum'];
const GRC_STATUSES = ['Menunggu Penugasan', 'Antrian Kirim', 'Perlu Sinkron Ulang', 'Tersinkron'];
const GRC_ENDPOINT = 'POST /api/grc/v1/risk-inputs';
Object.assign(BADGE_CLASS, { 'Menunggu Penugasan': 'b-outline', 'Antrian Kirim': 'b-amber', 'Perlu Sinkron Ulang': 'b-violet', 'Tersinkron': 'b-teal' });
ui.grc = { q: '', status: '', satker: '' };

/** Sinyal risiko yang dikirim ke profil risiko satker (aturan prototipe, dapat disesuaikan). */
function grcSignal(ap) {
  const st = execStatus(ap); const d = daysToTarget(ap);
  if (st === 'Selesai' && ap.verificationStatus === 'Disetujui') return { level: 'Rendah', reason: 'Tindak lanjut selesai dan disetujui MRDK' };
  if (st === 'Terlambat') return { level: 'Tinggi', reason: `Melewati target ${-d} hari dengan progress ${ap.progress}%` };
  if (['Ditolak', 'Perlu Perbaikan'].includes(ap.verificationStatus)) return { level: 'Sedang', reason: `Update satker ${ap.verificationStatus === 'Ditolak' ? 'ditolak' : 'dikembalikan untuk perbaikan'} oleh MRDK` };
  if (st === 'Menunggu Arahan') return { level: 'Sedang', reason: 'Pelaksanaan menunggu arahan pimpinan' };
  if (st !== 'Selesai' && d != null && d <= 30 && ap.progress < 50) return { level: 'Sedang', reason: `Target ${d} hari lagi, progress baru ${ap.progress}%` };
  if (st === 'Selesai') return { level: 'Rendah', reason: 'Selesai, menunggu verifikasi MRDK' };
  return { level: 'Rendah', reason: 'Pelaksanaan sesuai rencana' };
}
/** Sidik data: bila berubah sejak pengiriman terakhir → perlu sinkron ulang. */
const grcFingerprint = ap => [ap.satker, ap.progress, execStatus(ap), ap.verificationStatus, ap.targetDate, grcSignal(ap).level, ap.grc?.category].join('|');
function grcStatus(ap) {
  if (!ap.strategic) return null;
  if (!ap.satker) return 'Menunggu Penugasan';
  if (!ap.grc?.syncedAt) return 'Antrian Kirim';
  return grcFingerprint(ap) === ap.grc.fp ? 'Tersinkron' : 'Perlu Sinkron Ulang';
}
const grcPlans = () => appState.actionPlans.filter(a => a.strategic);
const grcPending = () => grcPlans().filter(a => ['Antrian Kirim', 'Perlu Sinkron Ulang'].includes(grcStatus(a)));
const sigTag = lv => `<span class="prio ${lv}">${lv.toUpperCase()}</span>`;
const strategicTag = () => `<span class="badge b-violet" title="Penugasan strategis berdampak OJK-wide — dialirkan ke SI-GRC">Strategis · SI-GRC</span>`;

/** Kontrak data yang dikirim ke SI-GRC (satu record per penugasan). */
function grcPayload(ap) {
  const s = grcSignal(ap); const sat = (appState.masters?.satker || MASTER_SATKER).find(x => x.name === ap.satker);
  return {
    source_system: 'SI-RDK', source_ref: ap.id, risk_input_id: ap.grc?.riskId || null,
    classification: 'Penugasan Strategis', impact_scope: 'OJK-wide',
    owner_unit: { code: sat?.key || null, name: ap.satker, bidang: ap.bidang, pic: ap.pic },
    risk_category: ap.grc?.category || 'Risiko Strategis', impact_rationale: ap.grc?.note || '',
    assignment: { rdk_date: ap.rdkDate, topic: ap.topic, directive: ap.arahan, source_document: ap.documentName, priority: ap.priority },
    execution: { target_date: ap.targetDate, progress_pct: ap.progress, status: execStatus(ap), verification_status: ap.verificationStatus, last_update: ap.updateDate || null, obstacles: ap.kendala || null },
    risk_signal: { level: s.level, reason: s.reason }
  };
}

/* ------------------------------ Mock API --------------------------------- */
/** POST /api/grc/v1/risk-inputs — kirim batch input risiko ke SI-GRC */
api.pushToGRC = async (records, onProgress) => {
  await tick(1100, onProgress);
  return records.map(r => ({ source_ref: r.source_ref, http: r.risk_input_id ? 200 : 201 }));
};

async function syncToGRC(ids) {
  const plans = ids.map(findPlan).filter(a => a && ['Antrian Kirim', 'Perlu Sinkron Ulang'].includes(grcStatus(a)));
  if (!plans.length) return toast('Tidak ada penugasan yang perlu dikirim.', 'info');
  const t = toast(`Mengirim ${plans.length} penugasan ke SI-GRC…`, 'info');
  const payload = plans.map(grcPayload);
  const res = await api.pushToGRC(payload);
  const now = new Date().toISOString();
  plans.forEach((ap, i) => {
    const prev = grcStatus(ap); const isNew = !ap.grc.riskId;
    if (isNew) { appState.seq.grc = (appState.seq.grc || 0) + 1; ap.grc.riskId = `GRC-RI-2026-${String(appState.seq.grc).padStart(4, '0')}`; payload[i].risk_input_id = ap.grc.riskId; }
    const s = grcSignal(ap);
    Object.assign(ap.grc, { syncedAt: now, fp: grcFingerprint(ap), level: s.level, by: cu().name });
    audit('Kirim ke SI-GRC', ap.id, prev, 'Tersinkron', `${ap.grc.riskId} · ${isNew ? 'input baru' : 'pembaruan'} · sinyal risiko ${s.level}`);
    notify(['satker:' + ap.satker], `${ap.id} dialirkan ke SI-GRC sebagai input profil risiko Satker Anda (sinyal ${s.level}).`, 'info', { type: 'plan', id: ap.id });
  });
  appState.grcLog = appState.grcLog || [];
  appState.seq.grcLog = (appState.seq.grcLog || 0) + 1;
  appState.grcLog.unshift({ id: 'SYNC-' + String(appState.seq.grcLog).padStart(4, '0'), at: now, by: cu().name, endpoint: GRC_ENDPOINT, refs: plans.map(a => a.id), result: res.map(r => `${r.source_ref}: ${r.http === 201 ? '201 Created' : '200 OK'}`), payload });
  t?.remove?.();
  toast(`${plans.length} penugasan berhasil dialirkan ke SI-GRC.`);
  commit();
}

/* ------------------------------ Klasifikasi ------------------------------ */
Actions.grcClassify = el => {
  if (!isRole('admin')) return toast('Hanya Admin / MRDK yang dapat mengubah klasifikasi.', 'error');
  const ap = findPlan(el.dataset.id); if (!ap) return;
  const g = ap.grc || {};
  openModal({
    title: 'Klasifikasi Penugasan', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`,
    body: `<div class="form-grid">
      <label class="check span-2"><input type="checkbox" id="gc-on" ${ap.strategic ? 'checked' : ''}><span><b>Penugasan strategis · berdampak OJK-wide</b><br><span class="small muted">Dialirkan ke SI-GRC sebagai input profil risiko satker pengampu tindak lanjut.</span></span></label>
      <div class="field"><label for="gc-cat">Kategori risiko</label><select class="select" id="gc-cat">${GRC_CATEGORIES.map(c => `<option ${c === (g.category || 'Risiko Strategis') ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Satker pengampu (pemilik risiko)</label><input class="input" value="${esc(ap.satker || 'Belum ditugaskan')}" disabled></div>
      <div class="field span-2"><label for="gc-note">Alasan dampak OJK-wide</label><textarea class="textarea" id="gc-note" style="min-height:64px" placeholder="Mis. menyangkut kebijakan lintas sektor, eksposur reputasi OJK, atau rekomendasi DPR/BPK">${esc(g.note || '')}</textarea></div>
    </div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan Klasifikasi', cls: 'primary', icon: 'save', onClick: m => {
      const on = $('#gc-on', m.el).checked, category = $('#gc-cat', m.el).value, note = $('#gc-note', m.el).value.trim();
      if (on && !note) { $('#gc-note', m.el).classList.add('invalid'); return toast('⚠ Alasan dampak OJK-wide wajib diisi.', 'error'); }
      const was = ap.strategic;
      ap.strategic = on; ap.grc = { ...(ap.grc || {}), category, note };
      if (on !== was) audit('Klasifikasi Strategis', ap.id, was ? 'Strategis (SI-GRC)' : 'Non-strategis', on ? 'Strategis (SI-GRC)' : 'Non-strategis', on ? `${category} · ${note}` : 'Tidak lagi dialirkan ke SI-GRC');
      else if (on) audit('Klasifikasi Strategis', ap.id, g.category || '-', category, note);
      m.close(); toast(on ? (ap.satker ? 'Penugasan masuk antrian kirim SI-GRC.' : 'Ditandai strategis. Tetapkan satker agar dapat dikirim ke SI-GRC.') : 'Klasifikasi strategis dicabut.'); commit();
    } }]
  });
};
Actions.grcSync = el => {
  if (!isRole('admin')) return;
  const ids = el.dataset.id ? [el.dataset.id] : grcPending().map(a => a.id);
  confirmDialog({ title: 'Kirim ke SI-GRC?', message: `${ids.length} penugasan strategis akan dikirim ke <b>SI-GRC</b> sebagai input profil risiko satker pengampu. Pengiriman dicatat di audit trail dan log pertukaran data.`, confirmLabel: 'Kirim', onConfirm: () => syncToGRC(ids) });
};
const jsonBlock = obj => `<pre class="mono" style="margin:0;max-height:52vh;overflow:auto;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${esc(JSON.stringify(obj, null, 2))}</pre>`;
Actions.grcPayload = el => {
  const ap = findPlan(el.dataset.id); if (!ap) return;
  openModal({ title: 'Payload ke SI-GRC', sub: `<span class="mono">${GRC_ENDPOINT}</span> · ${ap.id}`, body: `<div class="small muted" style="margin-bottom:8px">Data yang akan/terakhir dikirim untuk penugasan ini berdasarkan kondisi saat ini.</div>${jsonBlock(grcPayload(ap))}`, foot: [{ label: 'Tutup', cls: 'primary' }] });
};
Actions.grcLogView = el => {
  const l = (appState.grcLog || []).find(x => x.id === el.dataset.id); if (!l) return;
  openModal({ title: `Log pengiriman ${l.id}`, sub: `<span class="mono">${esc(l.endpoint)}</span> · ${fmtDT(l.at)} · ${esc(l.by)}`, size: '', body: `<div class="small" style="margin-bottom:8px"><b>Respons:</b> ${l.result.map(esc).join(' · ')}</div>${jsonBlock({ records: l.payload })}`, foot: [{ label: 'Tutup', cls: 'primary' }] });
};
Actions.grcFilter = () => { const f = ui.grc; f.status = $('#gf-status').value; f.satker = $('#gf-satker').value; $('#grc-table').innerHTML = grcTableHTML(); };
Actions.grcSearch = debounce(el => { ui.grc.q = el.value; $('#grc-table').innerHTML = grcTableHTML(); }, 140);
Actions.grcPickSatker = el => { ui.grc.satker = el.dataset.s; renderPage(true); $('#grc-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };

/* ------------------------------ Drawer section --------------------------- */
function grcDrawerSection(ap) {
  const kv = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  const admin = isRole('admin');
  if (!ap.strategic) return `<div class="d-sec"><div class="section-label"><span>Integrasi SI-GRC</span>${admin ? `<button class="btn xs" data-act="grcClassify" data-id="${ap.id}">${icon('flag', 'sm')}Tandai strategis</button>` : ''}</div><div class="small muted">Bukan penugasan strategis OJK-wide — tidak dialirkan ke SI-GRC.</div></div>`;
  const st = grcStatus(ap); const s = grcSignal(ap); const g = ap.grc || {};
  return `<div class="d-sec"><div class="section-label"><span>Integrasi SI-GRC</span>${admin ? `<button class="btn xs" data-act="grcClassify" data-id="${ap.id}">${icon('sliders', 'sm')}Ubah klasifikasi</button>` : ''}</div><dl class="kv">
      ${kv('Klasifikasi', strategicTag() + ' <span class="small muted">dampak OJK-wide</span>')}
      ${kv('Kategori risiko', esc(g.category || '—'))}
      ${kv('Alasan dampak', esc(g.note || '—'))}
      ${kv('Pemilik risiko', ap.satker ? esc(ap.satker) : '<span style="color:var(--warn-ink)">Belum ditugaskan</span>')}
      ${kv('Sinyal risiko', `${sigTag(s.level)} <span class="small muted">· ${esc(s.reason)}</span>`)}
      ${kv('Status SI-GRC', badge(st))}
      ${kv('ID input SI-GRC', g.riskId ? `<span class="mono">${g.riskId}</span>` : '<span class="muted">Belum terdaftar</span>')}
      ${kv('Sinkron terakhir', g.syncedAt ? `${fmtDT(g.syncedAt)} <span class="small muted">· sinyal saat itu ${esc(g.level || '-')}</span>` : '—')}
    </dl>
    ${st === 'Perlu Sinkron Ulang' ? `<div class="ai-banner violet" style="margin-top:12px">${icon('rerun')}<span>Data pelaksanaan berubah sejak pengiriman terakhir. Kirim ulang agar profil risiko satker di SI-GRC mutakhir.</span></div>` : ''}
    <div class="btn-group" style="margin-top:12px">${admin && ['Antrian Kirim', 'Perlu Sinkron Ulang'].includes(st) ? `<button class="btn sm primary" data-act="grcSync" data-id="${ap.id}">${icon('send', 'sm')}Kirim ke SI-GRC</button>` : ''}<button class="btn sm" data-act="grcPayload" data-id="${ap.id}">${icon('eye', 'sm')}Lihat payload</button></div>
  </div>`;
}

/* ------------------------------ Halaman ---------------------------------- */
function grcRows() {
  const f = ui.grc; const q = f.q.trim().toLowerCase();
  const order = { 'Perlu Sinkron Ulang': 0, 'Antrian Kirim': 1, 'Menunggu Penugasan': 2, 'Tersinkron': 3 };
  const lv = { Tinggi: 0, Sedang: 1, Rendah: 2 };
  return grcPlans().filter(a =>
    (!f.status || grcStatus(a) === f.status) && (!f.satker || a.satker === f.satker) &&
    (!q || [a.id, a.arahan, a.satker, a.grc?.category, a.grc?.riskId, a.topic].some(v => String(v || '').toLowerCase().includes(q)))
  ).sort((a, b) => order[grcStatus(a)] - order[grcStatus(b)] || lv[grcSignal(a).level] - lv[grcSignal(b).level] || a.id.localeCompare(b.id));
}
function grcTableHTML() {
  const rows = grcRows(); const admin = isRole('admin');
  if (!rows.length) return '<div class="empty"><b>Tidak ada penugasan strategis</b>Ubah filter, atau tandai penugasan sebagai strategis dari detail rencana aksi.</div>';
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>ID</th><th>Poin Arahan</th><th>Satker Pengampu</th><th>Kategori Risiko</th><th>Sinyal Risiko</th><th>Status SI-GRC</th><th>Data di SI-GRC</th><th>Action</th></tr></thead><tbody>
    ${rows.map(a => { const st = grcStatus(a); const s = grcSignal(a); return `<tr class="clickable" tabindex="0" data-act="openPlan" data-id="${a.id}">
      <td data-label="ID"><span class="id">${a.id}</span></td>
      <td data-label="Poin Arahan" class="arahan full"><span class="clamp-2">${esc(a.arahan)}</span></td>
      <td data-label="Satker Pengampu">${a.satker ? `<span style="display:block;min-width:130px">${esc(a.satker)}</span>` : '<span style="color:var(--warn-ink)">Belum ditugaskan</span>'}</td>
      <td data-label="Kategori Risiko"><span class="nowrap">${esc(a.grc?.category || '—')}</span></td>
      <td data-label="Sinyal Risiko">${sigTag(s.level)}<div class="small muted" style="min-width:140px">${esc(s.reason)}</div></td>
      <td data-label="Status SI-GRC">${badge(st)}</td>
      <td data-label="Data di SI-GRC">${a.grc?.riskId ? `<span class="mono small nowrap">${a.grc.riskId}</span><div class="small muted nowrap tnum">${fmtDT(a.grc.syncedAt)}</div>` : '<span class="muted small">Belum terkirim</span>'}</td>
      <td data-label=""><div class="btn-group" style="flex-wrap:nowrap;gap:4px">${admin && ['Antrian Kirim', 'Perlu Sinkron Ulang'].includes(st) ? `<button class="btn xs primary" data-act="grcSync" data-id="${a.id}">${icon('send', 'sm')}Kirim</button>` : ''}<button class="btn xs" data-act="grcPayload" data-id="${a.id}" title="Lihat payload">${icon('eye', 'sm')}Payload</button></div></td>
    </tr>`; }).join('')}
  </tbody></table></div><div class="tbl-foot"><span><b class="tnum">${rows.length}</b> dari <b class="tnum">${grcPlans().length}</b> penugasan strategis</span></div>`;
}
function grcProfileRows() {
  const by = {};
  grcPlans().filter(a => a.satker).forEach(a => { (by[a.satker] = by[a.satker] || []).push(a); });
  return Object.entries(by).map(([name, list]) => {
    const lv = { Tinggi: 0, Sedang: 0, Rendah: 0 }; list.forEach(a => lv[grcSignal(a).level]++);
    return { name, info: satkerInfo(name), list, lv, synced: list.filter(a => grcStatus(a) === 'Tersinkron').length };
  }).sort((a, b) => b.lv.Tinggi - a.lv.Tinggi || b.lv.Sedang - a.lv.Sedang || b.list.length - a.list.length);
}

registerPage('grc', {
  render() {
    const all = grcPlans(); const pend = grcPending(); const admin = isRole('admin');
    const synced = all.filter(a => grcStatus(a) === 'Tersinkron').length;
    const waitAssign = all.filter(a => grcStatus(a) === 'Menunggu Penugasan').length;
    const high = all.filter(a => a.satker && grcSignal(a).level === 'Tinggi').length;
    const prof = grcProfileRows(); const f = ui.grc; const logs = (appState.grcLog || []).slice(0, 12);
    const kpi = (label, value, sub, ic, tone) => `<div class="kpi t-${tone} static"><div class="k-label"><span>${label}</span><span class="k-ic">${icon(ic, 'sm')}</span></div><div class="k-val">${value}</div><div class="k-sub">${sub}</div></div>`;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Integrasi · SI-GRC</div><h1>Integrasi SI-GRC</h1><div class="sub">Penugasan <b>strategis yang berdampak OJK-wide</b> dialirkan ke SI-GRC sebagai input <b>profil risiko satuan kerja pengampu</b> tindak lanjut.</div></div>
        <div class="btn-group">${exportButtons('grc')}${admin ? `<button class="btn primary" data-act="grcSync" ${pend.length ? '' : 'disabled'}>${icon('send')}Kirim ${pend.length ? pend.length + ' ' : ''}ke SI-GRC</button>` : ''}</div></div>
      <section class="panel flow" aria-label="Alur interfacing SI-GRC">
        <div class="flow-top"><div class="section-label">Alur Pengaliran Data</div>
          <div class="flow-src"><span class="pill">SI-RDK · Register Rencana Aksi</span>${icon('arrowRight', 'sm')}<span class="pill core">Klasifikasi Strategis OJK-wide</span>${icon('arrowRight', 'sm')}<span class="pill">Antarmuka ${esc(GRC_ENDPOINT)}</span>${icon('arrowRight', 'sm')}<span class="pill core">SI-GRC · Profil Risiko Satker Pengampu</span></div></div>
        <div class="small muted" style="padding:0 18px 14px">Yang dialirkan: identitas penugasan, satker pengampu (pemilik risiko), kategori risiko, progres & status pelaksanaan, status verifikasi, serta <b>sinyal risiko</b> (Tinggi/Sedang/Rendah). Perubahan data setelah pengiriman otomatis ditandai <i>Perlu Sinkron Ulang</i>.</div>
      </section>
      <section class="kpis k5">
        ${kpi('Penugasan Strategis', all.length, `dari ${appState.actionPlans.length} rencana aksi`, 'flag', 'blue')}
        ${kpi('Tersinkron', synced, 'data SI-GRC mutakhir', 'checkCircle', 'green')}
        ${kpi('Perlu Dikirim', pend.length, `${pend.filter(a => grcStatus(a) === 'Perlu Sinkron Ulang').length} sinkron ulang · ${pend.filter(a => grcStatus(a) === 'Antrian Kirim').length} baru`, 'send', 'amber')}
        ${kpi('Menunggu Penugasan', waitAssign, 'belum ada satker pengampu', 'users', 'grey')}
        ${kpi('Sinyal Risiko Tinggi', high, 'penugasan strategis terlambat', 'alert', 'red')}
      </section>
      <section class="panel"><div class="panel-head"><div><h3>Input Profil Risiko per Satker Pengampu</h3><div class="desc">Ringkasan yang diterima SI-GRC untuk setiap satker · klik baris untuk melihat penugasannya</div></div></div>
        ${prof.length ? `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Satker Pengampu</th><th>Bidang</th><th>Penugasan Strategis</th><th>Sinyal Tinggi</th><th>Sinyal Sedang</th><th>Sinyal Rendah</th><th>Tersinkron</th></tr></thead><tbody>
          ${prof.map(p => `<tr class="clickable" tabindex="0" data-act="grcPickSatker" data-s="${esc(p.name)}"><td data-label="Satker"><b style="font-weight:600">${esc(p.name)}</b></td><td data-label="Bidang">${esc(p.info?.bidang || '—')}</td><td data-label="Penugasan" class="tnum">${p.list.length}</td><td data-label="Tinggi" class="tnum">${p.lv.Tinggi ? `<span class="prio Tinggi">${p.lv.Tinggi}</span>` : '0'}</td><td data-label="Sedang" class="tnum">${p.lv.Sedang ? `<span class="prio Sedang">${p.lv.Sedang}</span>` : '0'}</td><td data-label="Rendah" class="tnum">${p.lv.Rendah}</td><td data-label="Tersinkron" class="tnum">${p.synced}/${p.list.length}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><b>Belum ada data</b>Tandai penugasan strategis dan tetapkan satker pengampunya.</div>'}
      </section>
      <section class="panel" id="grc-list"><div class="panel-head"><div><h3>Penugasan Strategis · OJK-wide</h3><div class="desc">Diurutkan: perlu sinkron ulang → antrian kirim → menunggu penugasan → tersinkron</div></div></div>
        <div class="toolbar">
          <div class="grow">${icon('search')}<input class="input" placeholder="Cari ID, poin arahan, satker, kategori, ID SI-GRC…" value="${esc(f.q)}" data-input="grcSearch"></div>
          <select class="select sm" id="gf-status" data-change="grcFilter" aria-label="Status SI-GRC">${optList(GRC_STATUSES, f.status, 'Semua status SI-GRC')}</select>
          <select class="select sm" id="gf-satker" data-change="grcFilter" aria-label="Satker">${optList([...new Set(grcPlans().map(a => a.satker).filter(Boolean))].sort(), f.satker, 'Semua satker')}</select>
        </div>
        <div id="grc-table">${grcTableHTML()}</div>
      </section>
      <section class="panel"><div class="panel-head"><div><h3>Log Pertukaran Data</h3><div class="desc">Riwayat pengiriman ke SI-GRC (simulasi) · ${esc(GRC_ENDPOINT)}</div></div></div>
        ${logs.length ? `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>ID</th><th>Waktu</th><th>Oleh</th><th>Penugasan</th><th>Respons</th><th></th></tr></thead><tbody>
          ${logs.map(l => `<tr><td data-label="ID"><span class="mono small">${l.id}</span></td><td data-label="Waktu"><span class="nowrap tnum">${fmtDT(l.at)}</span></td><td data-label="Oleh">${esc(l.by)}</td><td data-label="Penugasan" class="full"><span class="small">${l.refs.map(r => `<span class="mono">${r}</span>`).join(', ')}</span></td><td data-label="Respons"><span class="badge b-green">${l.result.length} berhasil</span></td><td data-label=""><button class="btn xs" data-act="grcLogView" data-id="${l.id}">${icon('eye', 'sm')}Payload</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><b>Belum ada pengiriman</b>Riwayat akan muncul setelah data dikirim ke SI-GRC.</div>'}
      </section>
    </div>`;
  }
});

Exporters.grc = () => ({
  name: 'Input_Profil_Risiko_SI-GRC', sheet: 'Input SI-GRC', title: 'Penugasan Strategis OJK-wide · Input Profil Risiko SI-GRC', subtitle: `${grcRows().length} penugasan strategis`, rows: grcRows(),
  columns: [
    { label: 'ID', get: a => a.id, w: 13 }, { label: 'Poin Arahan', get: a => a.arahan, w: 70 }, { label: 'Satker Pengampu', get: a => a.satker, w: 40 }, { label: 'Bidang', get: a => a.bidang, w: 28 },
    { label: 'Kategori Risiko', get: a => a.grc?.category || '', w: 20 }, { label: 'Alasan Dampak OJK-wide', get: a => a.grc?.note || '', w: 50 },
    { label: 'Progress (%)', get: a => a.progress, w: 11 }, { label: 'Status Pelaksanaan', get: a => execStatus(a), w: 18 }, { label: 'Status Verifikasi', get: a => a.verificationStatus, w: 18 },
    { label: 'Sinyal Risiko', get: a => grcSignal(a).level, w: 12 }, { label: 'Alasan Sinyal', get: a => grcSignal(a).reason, w: 40 },
    { label: 'Status SI-GRC', get: a => grcStatus(a), w: 18 }, { label: 'ID Input SI-GRC', get: a => a.grc?.riskId || '', w: 18 }, { label: 'Sinkron Terakhir', get: a => a.grc?.syncedAt ? fmtDT(a.grc.syncedAt) : '', w: 18 }
  ]
});
