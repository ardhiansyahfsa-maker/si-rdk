/* =========================================================================
   SI-RDK · grc.js — Interfacing SI-RDK → SI-GRC
   Penugasan strategis yang berdampak OJK-wide dialirkan ke SI-GRC sebagai
   input profil risiko satuan kerja pengampu tindak lanjut:
     1. Penandaan MRDK      — Admin MRDK menandai penugasan strategis OJK-wide   (SI-RDK)
     2. Pengiriman MRDK     — Admin MRDK mengirim ke SI-GRC                       (SI-RDK)
     3. Pengelompokan risiko— Admin SI-GRC menetapkan kategori & risiko, lalu
                              menginput ke profil risiko satker                  (SI-GRC)
     4. Konfirmasi RQO      — Risk & Quality Officer satker mengonfirmasi        (SI-GRC)
     → Selesai: tercatat di profil risiko satker.
   Tahap 3–4 terjadi di SI-GRC; di SI-RDK tampil sebagai status balik (callback).
   Hak akses SI-RDK tetap tiga peran (Admin MRDK, Satker, Pimpinan). Untuk demo,
   Admin MRDK dapat menyimulasikan status balik SI-GRC (tombol "Simulasi SI-GRC").
   ========================================================================= */

const GRC_CATEGORIES = ['Risiko Strategis', 'Risiko Operasional', 'Risiko Kepatuhan', 'Risiko Reputasi', 'Risiko Hukum'];
const GRC_LEVELS = ['Tinggi', 'Sedang', 'Rendah'];
const GRC_STATUSES = ['Menunggu Penugasan', 'Siap Dikirim', 'Menunggu Pengelompokan Risiko', 'Menunggu Konfirmasi RQO', 'Perlu Sinkron Ulang', 'Selesai'];
const GRC_ENDPOINT = 'POST /api/grc/v1/risk-inputs';
const GRC_CALLBACK = 'POST /api/sirdk/v1/grc-status (callback dari SI-GRC)';
Object.assign(BADGE_CLASS, {
  'Menunggu Penugasan': 'b-outline', 'Siap Dikirim': 'b-blue', 'Menunggu Pengelompokan Risiko': 'b-amber',
  'Menunggu Konfirmasi RQO': 'b-amber', 'Perlu Sinkron Ulang': 'b-violet', 'Selesai': 'b-teal'
});
ui.grc = { q: '', status: '', satker: '' };

/* ------------------------------ Aturan ----------------------------------- */
/** Indikator pelaksanaan yang dikirim sebagai bahan bagi Admin SI-GRC (aturan prototipe, bukan penilaian risiko). */
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
/** Sidik data pelaksanaan: bila berubah setelah selesai dicatat → perlu sinkron ulang. */
const grcFingerprint = ap => [ap.satker, ap.progress, execStatus(ap), ap.verificationStatus, ap.targetDate, grcSignal(ap).level].join('|');
function grcStatus(ap) {
  if (!ap.strategic) return null;
  if (!ap.satker) return 'Menunggu Penugasan';
  const g = ap.grc || {};
  if (g.stage === 'sent') return 'Menunggu Pengelompokan Risiko';
  if (g.stage === 'mapped') return 'Menunggu Konfirmasi RQO';
  if (g.stage === 'confirmed') return grcFingerprint(ap) === g.doneFp ? 'Selesai' : 'Perlu Sinkron Ulang';
  return 'Siap Dikirim';
}
const GRC_SENDABLE = ['Siap Dikirim', 'Perlu Sinkron Ulang'];
function grcPlans() {
  const all = appState.actionPlans.filter(a => a.strategic);
  return cu().role === 'satker' ? all.filter(a => a.satker === cu().satker) : all;
}
/** Item yang menunggu tindakan peran yang sedang login. */
function grcTodo() {
  const r = cu().role;
  if (r === 'admin') return grcPlans().filter(a => GRC_SENDABLE.includes(grcStatus(a)));
  return [];
}
const grcPending = grcTodo;
const sigTag = lv => `<span class="prio ${lv}">${lv.toUpperCase()}</span>`;
const strategicTag = () => `<span class="badge b-violet" title="Penugasan strategis berdampak OJK-wide — dialirkan ke SI-GRC">Strategis · SI-GRC</span>`;
const canSendGRC = ap => isRole('admin') && GRC_SENDABLE.includes(grcStatus(ap));
/* Simulasi status balik SI-GRC (demo) — hanya Admin MRDK */
const canMapGRC = ap => isRole('admin') && grcStatus(ap) === 'Menunggu Pengelompokan Risiko';
const canConfirmGRC = ap => isRole('admin') && grcStatus(ap) === 'Menunggu Konfirmasi RQO';
const GRC_SYS = { name: 'SI-GRC', role: 'system' };

/** Kontrak data yang dikirim SI-RDK ke SI-GRC (satu record per penugasan). Kategori risiko TIDAK dikirim — ditetapkan Admin SI-GRC. */
function grcPayload(ap) {
  const s = grcSignal(ap); const g = ap.grc || {}; const sat = (appState.masters?.satker || MASTER_SATKER).find(x => x.name === ap.satker);
  return {
    source_system: 'SI-RDK', source_ref: ap.id, grc_ref: g.riskId || null, submission: g.recorded ? 'update' : 'new',
    classification: 'Penugasan Strategis', impact_scope: 'OJK-wide', mrdk_note: g.note || null,
    owner_unit: { code: sat?.key || null, name: ap.satker, bidang: ap.bidang, pic: ap.pic },
    assignment: { rdk_date: ap.rdkDate, topic: ap.topic, directive: ap.arahan, source_document: ap.documentName, priority: ap.priority },
    execution: { target_date: ap.targetDate, progress_pct: ap.progress, status: execStatus(ap), verification_status: ap.verificationStatus, last_update: ap.updateDate || null, obstacles: ap.kendala || null },
    execution_indicator: { level: s.level, reason: s.reason }
  };
}

/* ------------------------------ Mock API --------------------------------- */
/** POST /api/grc/v1/risk-inputs — kirim batch penugasan ke antrian Admin SI-GRC */
api.pushToGRC = async (records, onProgress) => {
  await tick(1100, onProgress);
  return records.map(r => ({ source_ref: r.source_ref, http: 202, state: 'queued_for_risk_mapping' }));
};

async function sendToGRC(ids) {
  const plans = ids.map(findPlan).filter(a => a && canSendGRC(a));
  if (!plans.length) return toast('Tidak ada penugasan yang dapat dikirim.', 'info');
  toast(`Mengirim ${plans.length} penugasan ke SI-GRC…`, 'info');
  const now = new Date().toISOString();
  plans.forEach(ap => { const g = ap.grc; if (!g.riskId) { appState.seq.grc = (appState.seq.grc || 0) + 1; g.riskId = `GRC-RI-2026-${String(appState.seq.grc).padStart(4, '0')}`; } });
  const payload = plans.map(grcPayload);
  const res = await api.pushToGRC(payload);
  plans.forEach(ap => {
    const prev = grcStatus(ap); const g = ap.grc;
    Object.assign(g, { stage: 'sent', sentAt: now, sentBy: cu().name, mapping: null, confirm: null });
    audit('Kirim ke SI-GRC', ap.id, prev, 'Menunggu Pengelompokan Risiko', `${g.riskId} · ${g.recorded ? 'pembaruan' : 'input baru'}`);
  });
  appState.grcLog = appState.grcLog || [];
  appState.seq.grcLog = (appState.seq.grcLog || 0) + 1;
  appState.grcLog.unshift({ id: 'SYNC-' + String(appState.seq.grcLog).padStart(4, '0'), at: now, by: cu().name, endpoint: GRC_ENDPOINT, refs: plans.map(a => a.id), result: res.map(r => `${r.source_ref}: ${r.http} Accepted`), payload });
  toast(`${plans.length} penugasan terkirim ke SI-GRC.`);
  commit();
}

/* ------------------------------ Tahap 1–2 · MRDK ------------------------- */
Actions.grcClassify = el => {
  if (!isRole('admin')) return toast('Hanya Admin / MRDK yang dapat menandai penugasan strategis.', 'error');
  const ap = findPlan(el.dataset.id); if (!ap) return;
  const g = ap.grc || {};
  openModal({
    title: 'Penandaan Penugasan Strategis', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`, size: 'sm',
    body: `<label class="check"><input type="checkbox" id="gc-on" ${ap.strategic ? 'checked' : ''}><span><b>Penugasan strategis · berdampak OJK-wide</b><br><span class="small muted">Dikirim ke SI-GRC. Pengelompokan risiko ditetapkan Admin SI-GRC dan dikonfirmasi RQO satker.</span></span></label>
      <div class="field" style="margin-top:12px"><label for="gc-note">Catatan untuk SI-GRC <span class="small muted">(opsional)</span></label><textarea class="textarea" id="gc-note" style="min-height:60px" placeholder="Mis. konteks arahan DK atau pertimbangan dampak OJK-wide">${esc(g.note || '')}</textarea></div>
      ${g.recorded ? `<div class="ai-banner warn" style="margin-top:12px">${icon('info')}<span>Penugasan ini sudah tercatat di profil risiko ${esc(ap.satker)} (<span class="mono">${esc(g.riskId)}</span>). Pencabutan tanda akan diberitahukan ke Admin SI-GRC.</span></div>` : ''}`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', icon: 'save', onClick: m => {
      const on = $('#gc-on', m.el).checked, note = $('#gc-note', m.el).value.trim(); const was = ap.strategic;
      if (on === was && note === (g.note || '')) { m.close(); return; }
      ap.strategic = on; ap.grc = { ...g, note, stage: g.stage || 'flagged', flaggedAt: g.flaggedAt || new Date().toISOString(), flaggedBy: g.flaggedBy || cu().name };
      if (on !== was) audit('Tandai Strategis', ap.id, was ? 'Strategis OJK-wide' : 'Non-strategis', on ? 'Strategis OJK-wide' : 'Dicabut', note);
      m.close(); toast(on ? (ap.satker ? 'Ditandai strategis · siap dikirim ke SI-GRC.' : 'Ditandai strategis. Tetapkan satker agar dapat dikirim.') : 'Tanda strategis dicabut.'); commit();
    } }]
  });
};
Actions.grcSync = el => {
  if (!isRole('admin')) return;
  const ids = el.dataset.id ? [el.dataset.id] : grcPlans().filter(a => GRC_SENDABLE.includes(grcStatus(a))).map(a => a.id);
  if (!ids.length) return toast('Tidak ada penugasan yang siap dikirim.', 'info');
  confirmDialog({ title: 'Kirim ke SI-GRC?', message: `${ids.length} penugasan strategis akan dikirim ke <b>SI-GRC</b>. Admin SI-GRC akan mengelompokkan ke risiko yang sesuai dan menginputnya ke profil risiko satker, lalu dikonfirmasi RQO satker.`, confirmLabel: 'Kirim', onConfirm: () => sendToGRC(ids) });
};

/* ------------------------------ Tahap 3 · Admin SI-GRC (simulasi) -------- */
Actions.grcMap = el => {
  const ap = findPlan(el.dataset.id); if (!ap || !canMapGRC(ap)) return;
  const g = ap.grc; const s = grcSignal(ap); const prev = g.recorded || {};
  openModal({
    title: 'Simulasi SI-GRC · Pengelompokan Risiko', sub: `<span class="mono">${g.riskId}</span> · ${ap.id} · ${esc(ap.satker)}`,
    body: `<div class="ai-banner" style="margin-bottom:12px">${icon('info')}<span><b>Demo.</b> Tahap ini dilakukan Admin SI-GRC di aplikasi SI-GRC; di sini disimulasikan untuk menghasilkan status balik ke SI-RDK.</span></div>
      <dl class="kv" style="margin-bottom:14px">
        <dt>Penugasan</dt><dd>${esc(ap.arahan)}</dd>
        ${g.note ? `<dt>Catatan MRDK</dt><dd>${esc(g.note)}</dd>` : ''}
        <dt>Pelaksanaan</dt><dd>${badge(execStatus(ap))} ${ap.progress}% · target ${fmtDate(ap.targetDate)}</dd>
        <dt>Indikator SI-RDK</dt><dd>${sigTag(s.level)} <span class="small muted">· ${esc(s.reason)}</span></dd>
        ${g.recorded ? `<dt>Tercatat saat ini</dt><dd>${esc(g.recorded.category)} · ${esc(g.recorded.riskName)} · ${sigTag(g.recorded.level)}</dd>` : ''}
      </dl>
      <div class="form-grid">
        <div class="field"><label for="gm-cat">Kategori risiko <span class="req">*</span></label><select class="select" id="gm-cat"><option value="">— Pilih —</option>${GRC_CATEGORIES.map(c => `<option ${c === prev.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label for="gm-lv">Level risiko <span class="req">*</span></label><select class="select" id="gm-lv">${GRC_LEVELS.map(l => `<option ${l === (prev.level || s.level) ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field span-2"><label for="gm-name">Risiko pada profil risiko satker <span class="req">*</span></label><input class="input" id="gm-name" value="${esc(prev.riskName || '')}" placeholder="Mis. Keterlambatan penyelesaian kebijakan …"></div>
        <div class="field span-2"><label for="gm-note">Catatan Admin SI-GRC <span class="small muted">(opsional)</span></label><textarea class="textarea" id="gm-note" style="min-height:56px"></textarea></div>
      </div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simulasikan', cls: 'primary', icon: 'save', onClick: m => {
      const category = $('#gm-cat', m.el).value, level = $('#gm-lv', m.el).value, riskName = $('#gm-name', m.el).value.trim(), note = $('#gm-note', m.el).value.trim();
      if (!category) { $('#gm-cat', m.el).classList.add('invalid'); return toast('⚠ Kategori risiko wajib dipilih.', 'error'); }
      if (!riskName) { $('#gm-name', m.el).classList.add('invalid'); return toast('⚠ Risiko pada profil risiko wajib diisi.', 'error'); }
      g.mapping = { category, level, riskName, note, by: 'Admin SI-GRC', at: new Date().toISOString() }; g.stage = 'mapped';
      audit('Pengelompokan Risiko (SI-GRC)', ap.id, 'Menunggu Pengelompokan Risiko', 'Menunggu Konfirmasi RQO', `${g.riskId} · ${category} · ${riskName} · level ${level}${note ? ' · ' + note : ''}`, GRC_SYS);
      notify(['admin', 'satker:' + ap.satker], `${ap.id} dikelompokkan Admin SI-GRC sebagai ${category} — menunggu konfirmasi RQO ${satkerShort(ap.satker)}.`, 'info', { type: 'plan', id: ap.id });
      m.close(); toast('Status SI-GRC diterima: menunggu konfirmasi RQO.'); commit();
    } }]
  });
};

/* ------------------------------ Tahap 4 · RQO Satker (simulasi) ---------- */
Actions.grcConfirm = el => {
  const ap = findPlan(el.dataset.id); if (!ap || !canConfirmGRC(ap)) return;
  const g = ap.grc; const mp = g.mapping;
  openModal({
    title: 'Simulasi SI-GRC · Konfirmasi RQO', sub: `<span class="mono">${g.riskId}</span> · ${ap.id} · ${esc(ap.satker)}`, size: 'sm',
    body: `<div class="ai-banner" style="margin-bottom:12px">${icon('info')}<span><b>Demo.</b> Konfirmasi dilakukan Risk & Quality Officer satker di aplikasi SI-GRC.</span></div>
      <dl class="kv">
        <dt>Penugasan</dt><dd>${esc(ap.arahan)}</dd>
        <dt>Kategori risiko</dt><dd>${esc(mp.category)}</dd>
        <dt>Risiko</dt><dd>${esc(mp.riskName)}</dd>
        <dt>Level</dt><dd>${sigTag(mp.level)}</dd>
        <dt>Diinput oleh</dt><dd>${esc(mp.by)} · ${fmtDT(mp.at)}${mp.note ? `<div class="tl-comment">${esc(mp.note)}</div>` : ''}</dd>
      </dl>
      <div class="field" style="margin-top:12px"><label for="gq-note">Catatan RQO <span class="small muted">(opsional)</span></label><textarea class="textarea" id="gq-note" style="min-height:56px"></textarea></div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Konfirmasi', cls: 'primary', icon: 'checkCircle', onClick: m => {
      const note = $('#gq-note', m.el).value.trim(); const now = new Date().toISOString();
      g.confirm = { by: `RQO ${satkerShort(ap.satker)}`, at: now, note }; g.stage = 'confirmed';
      g.recorded = { category: mp.category, level: mp.level, riskName: mp.riskName, at: now }; g.doneFp = grcFingerprint(ap);
      audit('Konfirmasi RQO (SI-GRC)', ap.id, 'Menunggu Konfirmasi RQO', 'Selesai', `${g.riskId} · tercatat ${mp.category} level ${mp.level}${note ? ' · ' + note : ''}`, GRC_SYS);
      notify(['admin', 'viewer', 'satker:' + ap.satker], `${ap.id} selesai: tercatat di profil risiko ${satkerShort(ap.satker)} (${mp.category}, ${mp.level}).`, 'ok', { type: 'plan', id: ap.id });
      m.close(); toast('Status SI-GRC diterima: selesai, tercatat di profil risiko satker.'); commit();
    } }]
  });
};

/* ------------------------------ Payload & log ---------------------------- */
const jsonBlock = obj => `<pre class="mono" style="margin:0;max-height:52vh;overflow:auto;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${esc(JSON.stringify(obj, null, 2))}</pre>`;
Actions.grcPayload = el => {
  const ap = findPlan(el.dataset.id); if (!ap) return;
  const g = ap.grc || {};
  const cb = g.mapping ? { grc_ref: g.riskId, source_ref: ap.id, state: g.stage === 'confirmed' ? 'confirmed_by_rqo' : 'mapped_pending_rqo', risk_category: g.mapping.category, risk_name: g.mapping.riskName, risk_level: g.mapping.level, mapped_by: g.mapping.by, confirmed_by: g.confirm?.by || null, confirmed_at: g.confirm?.at || null } : null;
  openModal({ title: 'Pertukaran Data SI-RDK ⇄ SI-GRC', sub: ap.id, body: `<div class="section-label">Dikirim SI-RDK · <span class="mono">${GRC_ENDPOINT}</span></div>${jsonBlock(grcPayload(ap))}${cb ? `<div class="section-label" style="margin-top:14px">Status balik SI-GRC · <span class="mono">${esc(GRC_CALLBACK)}</span></div>${jsonBlock(cb)}` : ''}`, foot: [{ label: 'Tutup', cls: 'primary' }] });
};
Actions.grcLogView = el => {
  const l = (appState.grcLog || []).find(x => x.id === el.dataset.id); if (!l) return;
  openModal({ title: `Log pengiriman ${l.id}`, sub: `<span class="mono">${esc(l.endpoint)}</span> · ${fmtDT(l.at)} · ${esc(l.by)}`, body: `<div class="small" style="margin-bottom:8px"><b>Respons:</b> ${l.result.map(esc).join(' · ')}</div>${jsonBlock({ records: l.payload })}`, foot: [{ label: 'Tutup', cls: 'primary' }] });
};
Actions.grcFilter = () => { const f = ui.grc; f.status = $('#gf-status').value; const s = $('#gf-satker'); f.satker = s ? s.value : ''; $('#grc-table').innerHTML = grcTableHTML(); };
Actions.grcSearch = debounce(el => { ui.grc.q = el.value; $('#grc-table').innerHTML = grcTableHTML(); }, 140);
Actions.grcPickSatker = el => { ui.grc.satker = el.dataset.s; ui.grc.status = ''; renderPage(true); $('#grc-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };
Actions.grcStage = el => { ui.grc.status = ui.grc.status === el.dataset.s ? '' : el.dataset.s; renderPage(true); $('#grc-list')?.scrollIntoView({ block: 'start', behavior: 'smooth' }); };

/* ------------------------------ Drawer section --------------------------- */
function grcActionButtons(ap, size = 'sm') {
  const b = [];
  if (canSendGRC(ap)) b.push(`<button class="btn ${size} primary" data-act="grcSync" data-id="${ap.id}">${icon('send', 'sm')}${grcStatus(ap) === 'Perlu Sinkron Ulang' ? 'Kirim pembaruan' : 'Kirim'}</button>`);
  if (canMapGRC(ap)) b.push(`<button class="btn ${size} ghost" data-act="grcMap" data-id="${ap.id}" title="Demo: simulasikan status balik dari SI-GRC">${icon('rerun', 'sm')}Simulasi SI-GRC</button>`);
  if (canConfirmGRC(ap)) b.push(`<button class="btn ${size} ghost" data-act="grcConfirm" data-id="${ap.id}" title="Demo: simulasikan konfirmasi RQO di SI-GRC">${icon('rerun', 'sm')}Simulasi SI-GRC</button>`);
  return b.join('');
}
function grcStepsHTML(ap) {
  const g = ap.grc || {}; const sent = ['sent', 'mapped', 'confirmed'].includes(g.stage);
  const step = (n, title, where, state, body) => `<div class="tl-item"><div class="tl-time" style="font-weight:600">${n}</div><div class="tl-body ${state}"><div class="tl-title"><b>${title}</b> <span class="small muted">· ${where}</span></div>${body}</div></div>`;
  const who = (by, at) => by ? `<div class="tl-meta">${esc(by)} · ${fmtDT(at)}</div>` : '';
  const wait = t => `<div class="small" style="color:var(--warn-ink)">${t}</div>`;
  return `<div class="timeline">
    ${step('1', 'Penandaan strategis', 'MRDK', 'green', `<div class="small">${g.note ? esc(g.note) : 'Penugasan strategis berdampak OJK-wide'}</div>${who(g.flaggedBy, g.flaggedAt)}`)}
    ${step('2', 'Pengiriman ke SI-GRC', 'MRDK', sent ? 'green' : 'amber', sent ? `<div class="small">Terkirim · <span class="mono">${esc(g.riskId)}</span></div>${who(g.sentBy, g.sentAt)}` : ap.satker ? wait('Siap dikirim') : wait('Menunggu penetapan satker'))}
    ${step('3', 'Pengelompokan & input profil risiko', 'Admin SI-GRC', g.mapping ? 'green' : g.stage === 'sent' ? 'amber' : '', g.mapping ? `<div class="small">${esc(g.mapping.category)} · ${esc(g.mapping.riskName)} · level <b>${esc(g.mapping.level)}</b></div>${g.mapping.note ? `<div class="tl-comment">${esc(g.mapping.note)}</div>` : ''}${who(g.mapping.by, g.mapping.at)}` : g.stage === 'sent' ? wait('Menunggu Admin SI-GRC') : '<div class="small muted">Belum</div>')}
    ${step('4', 'Konfirmasi RQO satker', 'SI-GRC', g.confirm ? 'green' : g.stage === 'mapped' ? 'amber' : '', g.confirm ? `<div class="small">Dikonfirmasi · tercatat di profil risiko</div>${g.confirm.note ? `<div class="tl-comment">${esc(g.confirm.note)}</div>` : ''}${who(g.confirm.by, g.confirm.at)}` : g.stage === 'mapped' ? wait('Menunggu Risk & Quality Officer') : '<div class="small muted">Belum</div>')}
  </div>`;
}
function grcDrawerSection(ap) {
  const admin = isRole('admin');
  if (!ap.strategic) return `<div class="d-sec"><div class="section-label"><span>Integrasi SI-GRC</span>${admin ? `<button class="btn xs" data-act="grcClassify" data-id="${ap.id}">${icon('flag', 'sm')}Tandai strategis</button>` : ''}</div><div class="small muted">Bukan penugasan strategis OJK-wide — tidak dialirkan ke SI-GRC.</div></div>`;
  const st = grcStatus(ap); const s = grcSignal(ap); const g = ap.grc || {};
  const kv = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  return `<div class="d-sec"><div class="section-label"><span>Integrasi SI-GRC</span>${admin ? `<button class="btn xs" data-act="grcClassify" data-id="${ap.id}">${icon('sliders', 'sm')}Ubah tanda</button>` : ''}</div><dl class="kv">
      ${kv('Klasifikasi', strategicTag() + ' <span class="small muted">dampak OJK-wide</span>')}
      ${kv('Pemilik risiko', ap.satker ? esc(ap.satker) : '<span style="color:var(--warn-ink)">Belum ditugaskan</span>')}
      ${kv('Status', badge(st))}
      ${kv('Indikator pelaksanaan', `${sigTag(s.level)} <span class="small muted">· ${esc(s.reason)}</span>`)}
      ${kv('Tercatat di profil risiko', g.recorded ? `${esc(g.recorded.category)} · ${esc(g.recorded.riskName)} · ${sigTag(g.recorded.level)} <span class="small muted">· <span class="mono">${esc(g.riskId)}</span></span>` : '<span class="muted">Belum tercatat</span>')}
    </dl>
    ${st === 'Perlu Sinkron Ulang' ? `<div class="ai-banner violet" style="margin-top:12px">${icon('rerun')}<span>Data pelaksanaan berubah sejak tercatat di SI-GRC. Kirim pembaruan agar profil risiko satker mutakhir.</span></div>` : ''}
    <div class="section-label" style="margin-top:14px">Tahapan</div>${grcStepsHTML(ap)}
    <div class="btn-group" style="margin-top:12px">${grcActionButtons(ap)}<button class="btn sm" data-act="grcPayload" data-id="${ap.id}">${icon('eye', 'sm')}Lihat data</button></div>
  </div>`;
}

/* ------------------------------ Halaman ---------------------------------- */
function grcRows() {
  const f = ui.grc; const q = f.q.trim().toLowerCase(); const mine = new Set(grcTodo().map(a => a.id));
  const lv = { Tinggi: 0, Sedang: 1, Rendah: 2 };
  return grcPlans().filter(a =>
    (!f.status || grcStatus(a) === f.status) && (!f.satker || a.satker === f.satker) &&
    (!q || [a.id, a.arahan, a.satker, a.grc?.recorded?.category, a.grc?.mapping?.riskName, a.grc?.riskId, a.topic].some(v => String(v || '').toLowerCase().includes(q)))
  ).sort((a, b) => (mine.has(b.id) - mine.has(a.id)) || GRC_STATUSES.indexOf(grcStatus(a)) - GRC_STATUSES.indexOf(grcStatus(b)) || lv[grcSignal(a).level] - lv[grcSignal(b).level] || a.id.localeCompare(b.id));
}
function grcTableHTML() {
  const rows = grcRows();
  if (!rows.length) return `<div class="empty"><b>Tidak ada penugasan</b>${isRole('admin') ? 'Ubah filter, atau tandai penugasan strategis dari detail rencana aksi.' : 'Ubah filter pencarian.'}</div>`;
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>ID</th><th>Poin Arahan</th><th>Satker Pemilik Risiko</th><th>Indikator Pelaksanaan</th><th>Status</th><th>Pengelompokan Risiko (SI-GRC)</th><th>Action</th></tr></thead><tbody>
    ${rows.map(a => { const st = grcStatus(a); const s = grcSignal(a); const g = a.grc || {}; const mp = g.mapping || g.recorded; return `<tr class="clickable" tabindex="0" data-act="openPlan" data-id="${a.id}">
      <td data-label="ID"><span class="id">${a.id}</span>${g.riskId ? `<div class="mono small muted nowrap">${esc(g.riskId)}</div>` : ''}</td>
      <td data-label="Poin Arahan" class="arahan full"><span class="clamp-2">${esc(a.arahan)}</span></td>
      <td data-label="Satker">${a.satker ? `<span style="display:block;min-width:130px">${esc(a.satker)}</span>` : '<span style="color:var(--warn-ink)">Belum ditugaskan</span>'}</td>
      <td data-label="Indikator">${sigTag(s.level)}<div class="small muted" style="min-width:130px">${esc(s.reason)}</div></td>
      <td data-label="Status">${badge(st)}</td>
      <td data-label="Pengelompokan Risiko">${mp ? `<div class="small" style="min-width:170px"><b style="font-weight:600">${esc(mp.category)}</b> · ${sigTag(mp.level)}<div class="muted clamp-2">${esc(mp.riskName)}</div></div>` : '<span class="muted small">Belum dikelompokkan</span>'}</td>
      <td data-label=""><div class="btn-group" style="flex-wrap:nowrap;gap:4px">${grcActionButtons(a, 'xs')}<button class="btn xs" data-act="grcPayload" data-id="${a.id}" title="Lihat data pertukaran">${icon('eye', 'sm')}</button></div></td>
    </tr>`; }).join('')}
  </tbody></table></div><div class="tbl-foot"><span><b class="tnum">${rows.length}</b> dari <b class="tnum">${grcPlans().length}</b> penugasan strategis</span></div>`;
}
function grcProfileRows() {
  const by = {};
  grcPlans().filter(a => a.satker).forEach(a => { (by[a.satker] = by[a.satker] || []).push(a); });
  return Object.entries(by).map(([name, list]) => {
    const lv = { Tinggi: 0, Sedang: 0, Rendah: 0 }; list.forEach(a => { if (a.grc?.recorded) lv[a.grc.recorded.level]++; });
    const proc = list.filter(a => ['Siap Dikirim', 'Menunggu Pengelompokan Risiko', 'Menunggu Konfirmasi RQO', 'Perlu Sinkron Ulang'].includes(grcStatus(a))).length;
    return { name, info: satkerInfo(name), list, lv, proc };
  }).sort((a, b) => b.lv.Tinggi - a.lv.Tinggi || b.lv.Sedang - a.lv.Sedang || b.list.length - a.list.length);
}
const GRC_STAGE_CARDS = [
  { s: 'Siap Dikirim', who: 'Admin MRDK · SI-RDK', ic: 'send', tone: 'blue' },
  { s: 'Menunggu Pengelompokan Risiko', who: 'Admin SI-GRC', ic: 'layers', tone: 'amber' },
  { s: 'Menunggu Konfirmasi RQO', who: 'RQO satker · SI-GRC', ic: 'shield', tone: 'amber' },
  { s: 'Selesai', who: 'Tercatat di profil risiko', ic: 'checkCircle', tone: 'green' },
  { s: 'Perlu Sinkron Ulang', who: 'Admin MRDK · data berubah', ic: 'rerun', tone: 'grey' },
  { s: 'Menunggu Penugasan', who: 'Admin MRDK · tetapkan satker', ic: 'users', tone: 'grey' }
];

registerPage('grc', {
  render() {
    const role = cu().role; const all = grcPlans(); const todo = grcTodo(); const f = ui.grc;
    const prof = grcProfileRows(); const logs = role === 'satker' ? [] : (appState.grcLog || []).slice(0, 12);
    const bulk = all.filter(a => GRC_SENDABLE.includes(grcStatus(a))).length;
    const roleNote = {
      admin: 'Anda menandai penugasan strategis dan mengirimnya ke SI-GRC.',
      satker: 'Mode baca: status penugasan Satker Anda yang dialirkan ke SI-GRC.', viewer: 'Mode baca saja.'
    }[role] || '';
    const todoLabel = { admin: 'siap/perlu dikirim ke SI-GRC' }[role];
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Integrasi · SI-GRC</div><h1>Integrasi SI-GRC</h1><div class="sub">Penugasan <b>strategis yang berdampak OJK-wide</b> dialirkan ke SI-GRC sebagai input <b>profil risiko satuan kerja pengampu</b>. ${roleNote}</div></div>
        <div class="btn-group">${role === 'satker' ? '' : exportButtons('grc')}${role === 'admin' ? `<button class="btn primary" data-act="grcSync" ${bulk ? '' : 'disabled'}>${icon('send')}Kirim ${bulk ? bulk + ' ' : ''}ke SI-GRC</button>` : ''}</div></div>
      ${todo.length && todoLabel ? `<div class="ai-banner warn">${icon('bell')}<span><b>${todo.length} penugasan ${todoLabel}:</b> ${todo.slice(0, 6).map(a => `<button class="link-btn mono" data-act="openPlan" data-id="${a.id}">${a.id}</button>`).join(', ')}${todo.length > 6 ? ' …' : ''}</span></div>` : ''}
      <section class="panel flow" aria-label="Tahapan pengaliran data ke SI-GRC">
        <div class="flow-top"><div class="section-label">Tahapan</div>
          <div class="flow-src"><span class="pill core">SI-RDK</span>${icon('arrowRight', 'sm')}<span class="pill">${esc(GRC_ENDPOINT)}</span>${icon('arrowRight', 'sm')}<span class="pill core">SI-GRC</span>${icon('arrowRight', 'sm')}<span class="pill">status balik ke SI-RDK</span></div></div>
        <div class="steps">
          <div class="step"><span class="n">01</span><span style="min-width:0"><b>Penandaan Strategis</b><small>Admin MRDK · SI-RDK<br>Tandai penugasan strategis OJK-wide</small></span></div>
          <div class="step"><span class="n">02</span><span style="min-width:0"><b>Kirim ke SI-GRC</b><small>Admin MRDK · SI-RDK<br>Data penugasan & indikator pelaksanaan</small></span></div>
          <div class="step green"><span class="n">03</span><span style="min-width:0"><b>Pengelompokan Risiko</b><small>Admin SI-GRC · SI-GRC<br>Tetapkan kategori & risiko, input ke profil risiko satker</small></span></div>
          <div class="step green"><span class="n">04</span><span style="min-width:0"><b>Konfirmasi RQO</b><small>Risk & Quality Officer satker · SI-GRC<br>Konfirmasi → <b>selesai</b></small></span></div>
        </div>
        <div class="small muted" style="padding:0 18px 14px">Kategori, nama risiko, dan level ditetapkan sepenuhnya di SI-GRC. Indikator pelaksanaan dari SI-RDK hanya bahan pertimbangan. Perubahan data pelaksanaan setelah selesai otomatis ditandai <i>Perlu Sinkron Ulang</i>.</div>
      </section>
      <section class="kpis" aria-label="Status per tahapan" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
        ${GRC_STAGE_CARDS.map(c => { const n = all.filter(a => grcStatus(a) === c.s).length; return `<button class="kpi t-${c.tone}" data-act="grcStage" data-s="${esc(c.s)}" ${f.status === c.s ? 'style="outline:2px solid var(--blue);outline-offset:-2px"' : ''}><div class="k-label"><span>${esc(c.s)}</span><span class="k-ic">${icon(c.ic, 'sm')}</span></div><div class="k-val">${n}</div><div class="k-sub">${esc(c.who)}</div></button>`; }).join('')}
      </section>
      <section class="panel"><div class="panel-head"><div><h3>Profil Risiko per Satker Pemilik Risiko</h3><div class="desc">Hanya yang sudah <b>dikonfirmasi RQO</b> dihitung tercatat · klik baris untuk melihat penugasannya</div></div></div>
        ${prof.length ? `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Satker Pemilik Risiko</th><th>Penugasan Strategis</th><th>Tercatat · Tinggi</th><th>Tercatat · Sedang</th><th>Tercatat · Rendah</th><th>Dalam Proses</th></tr></thead><tbody>
          ${prof.map(p => `<tr class="clickable" tabindex="0" data-act="grcPickSatker" data-s="${esc(p.name)}"><td data-label="Satker"><b style="font-weight:600">${esc(p.name)}</b><div class="small muted">${esc(p.info?.bidang || '')}</div></td><td data-label="Penugasan" class="tnum">${p.list.length}</td><td data-label="Tinggi" class="tnum">${p.lv.Tinggi ? `<span class="prio Tinggi">${p.lv.Tinggi}</span>` : '0'}</td><td data-label="Sedang" class="tnum">${p.lv.Sedang ? `<span class="prio Sedang">${p.lv.Sedang}</span>` : '0'}</td><td data-label="Rendah" class="tnum">${p.lv.Rendah}</td><td data-label="Dalam proses" class="tnum">${p.proc}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><b>Belum ada data</b>Belum ada penugasan strategis dengan satker pengampu.</div>'}
      </section>
      <section class="panel" id="grc-list"><div class="panel-head"><div><h3>Penugasan Strategis · OJK-wide</h3><div class="desc">Yang menunggu tindakan Anda ditampilkan paling atas</div></div></div>
        <div class="toolbar">
          <div class="grow">${icon('search')}<input class="input" placeholder="Cari ID, poin arahan, satker, kategori/risiko, ID SI-GRC…" value="${esc(f.q)}" data-input="grcSearch"></div>
          <select class="select sm" id="gf-status" data-change="grcFilter" aria-label="Status">${optList(GRC_STATUSES, f.status, 'Semua status')}</select>
          ${role === 'satker' ? '' : `<select class="select sm" id="gf-satker" data-change="grcFilter" aria-label="Satker">${optList([...new Set(grcPlans().map(a => a.satker).filter(Boolean))].sort(), f.satker, 'Semua satker')}</select>`}
        </div>
        <div id="grc-table">${grcTableHTML()}</div>
      </section>
      ${role !== 'satker' ? `<section class="panel"><div class="panel-head"><div><h3>Log Pengiriman SI-RDK → SI-GRC</h3><div class="desc">Riwayat pengiriman (simulasi) · ${esc(GRC_ENDPOINT)}</div></div></div>
        ${logs.length ? `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>ID</th><th>Waktu</th><th>Oleh</th><th>Penugasan</th><th>Respons</th><th></th></tr></thead><tbody>
          ${logs.map(l => `<tr><td data-label="ID"><span class="mono small">${l.id}</span></td><td data-label="Waktu"><span class="nowrap tnum">${fmtDT(l.at)}</span></td><td data-label="Oleh">${esc(l.by)}</td><td data-label="Penugasan" class="full"><span class="small">${l.refs.map(r => `<span class="mono">${r}</span>`).join(', ')}</span></td><td data-label="Respons"><span class="badge b-green">${l.result.length} diterima SI-GRC</span></td><td data-label=""><button class="btn xs" data-act="grcLogView" data-id="${l.id}">${icon('eye', 'sm')}Payload</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><b>Belum ada pengiriman</b>Riwayat akan muncul setelah data dikirim ke SI-GRC.</div>'}
      </section>` : ''}
    </div>`;
  }
});

Exporters.grc = () => ({
  name: 'Penugasan_Strategis_SI-GRC', sheet: 'SI-GRC', title: 'Penugasan Strategis OJK-wide · Pengaliran ke SI-GRC', subtitle: `${grcRows().length} penugasan strategis`, rows: grcRows(),
  columns: [
    { label: 'ID', get: a => a.id, w: 13 }, { label: 'ID SI-GRC', get: a => a.grc?.riskId || '', w: 16 }, { label: 'Poin Arahan', get: a => a.arahan, w: 70 }, { label: 'Satker Pemilik Risiko', get: a => a.satker, w: 40 },
    { label: 'Catatan MRDK', get: a => a.grc?.note || '', w: 36 }, { label: 'Progress (%)', get: a => a.progress, w: 11 }, { label: 'Status Pelaksanaan', get: a => execStatus(a), w: 18 },
    { label: 'Indikator Pelaksanaan', get: a => grcSignal(a).level, w: 12 }, { label: 'Status', get: a => grcStatus(a), w: 28 },
    { label: 'Kategori Risiko', get: a => (a.grc?.mapping || a.grc?.recorded)?.category || '', w: 20 }, { label: 'Risiko', get: a => (a.grc?.mapping || a.grc?.recorded)?.riskName || '', w: 50 },
    { label: 'Level', get: a => (a.grc?.mapping || a.grc?.recorded)?.level || '', w: 10 }, { label: 'Dikelompokkan oleh', get: a => a.grc?.mapping?.by || '', w: 18 }, { label: 'Dikonfirmasi RQO', get: a => a.grc?.confirm?.by || '', w: 18 }
  ]
});
