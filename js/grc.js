/* =========================================================================
   SI-RDK · grc.js — Interfacing SI-RDK → SI-GRC
   Penugasan strategis yang berdampak OJK-wide dialirkan ke SI-GRC sebagai
   input profil risiko satuan kerja pengampu tindak lanjut, melalui empat tahap:
     1. Usulan MRDK        — Admin MRDK menandai penugasan strategis OJK-wide
     2. Tanggapan Satker   — satker pemilik risiko menyatakan setuju / keberatan
     3. Pengiriman MRDK    — Admin MRDK mengirim ke SI-GRC (keberatan wajib dijustifikasi)
     4. Validasi SI-GRC    — fungsi manajemen risiko menerima / mengembalikan;
                             hanya input yang DITERIMA yang tercatat di profil risiko.
   Prototipe: pengiriman disimulasikan (api.pushToGRC); payload mengikuti
   kontrak data di grcPayload() sehingga dapat diganti dengan fetch().
   ========================================================================= */

const GRC_CATEGORIES = ['Risiko Strategis', 'Risiko Operasional', 'Risiko Kepatuhan', 'Risiko Reputasi', 'Risiko Hukum'];
const GRC_LEVELS = ['Tinggi', 'Sedang', 'Rendah'];
const GRC_STATUSES = ['Menunggu Penugasan', 'Menunggu Tanggapan Satker', 'Keberatan Satker', 'Siap Dikirim', 'Menunggu Validasi SI-GRC', 'Dikembalikan SI-GRC', 'Perlu Sinkron Ulang', 'Diterima SI-GRC'];
const GRC_ENDPOINT = 'POST /api/grc/v1/risk-inputs';
const GRC_VALIDATOR_LABEL = 'Fungsi Manajemen Risiko (Validator SI-GRC)';
Object.assign(BADGE_CLASS, {
  'Menunggu Penugasan': 'b-outline', 'Menunggu Tanggapan Satker': 'b-amber', 'Keberatan Satker': 'b-red', 'Siap Dikirim': 'b-blue',
  'Menunggu Validasi SI-GRC': 'b-amber', 'Dikembalikan SI-GRC': 'b-violet', 'Perlu Sinkron Ulang': 'b-violet', 'Diterima SI-GRC': 'b-teal',
  'Setuju': 'b-green', 'Keberatan': 'b-red', 'Diterima': 'b-teal', 'Dikembalikan': 'b-violet'
});
ui.grc = { q: '', status: '', satker: '' };

/* ------------------------------ Aturan ----------------------------------- */
/** Sinyal risiko usulan SI-RDK (aturan prototipe). Level final ditetapkan validator SI-GRC. */
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
/** Sidik data: bila berubah setelah diterima SI-GRC → perlu sinkron ulang. */
const grcFingerprint = ap => [ap.satker, ap.progress, execStatus(ap), ap.verificationStatus, ap.targetDate, grcSignal(ap).level, ap.grc?.category].join('|');
function grcStatus(ap) {
  if (!ap.strategic) return null;
  if (!ap.satker) return 'Menunggu Penugasan';
  const g = ap.grc || {};
  if (['proposed', 'objected', 'agreed'].includes(g.stage) && g.resp && g.resp.satker !== ap.satker) return 'Menunggu Tanggapan Satker';
  switch (g.stage) {
    case 'objected': return 'Keberatan Satker';
    case 'agreed': return 'Siap Dikirim';
    case 'sent': return 'Menunggu Validasi SI-GRC';
    case 'returned': return 'Dikembalikan SI-GRC';
    case 'accepted': return grcFingerprint(ap) === g.acceptedFp ? 'Diterima SI-GRC' : 'Perlu Sinkron Ulang';
    default: return 'Menunggu Tanggapan Satker';
  }
}
const GRC_SENDABLE = ['Siap Dikirim', 'Perlu Sinkron Ulang', 'Keberatan Satker', 'Dikembalikan SI-GRC'];
const GRC_BULK = ['Siap Dikirim', 'Perlu Sinkron Ulang'];
function grcPlans() {
  const all = appState.actionPlans.filter(a => a.strategic);
  return cu().role === 'satker' ? all.filter(a => a.satker === cu().satker) : all;
}
/** Item yang menunggu tindakan peran yang sedang login. */
function grcTodo() {
  const r = cu().role;
  if (r === 'admin') return grcPlans().filter(a => GRC_SENDABLE.includes(grcStatus(a)));
  if (r === 'satker') return grcPlans().filter(a => grcStatus(a) === 'Menunggu Tanggapan Satker');
  if (r === 'grc') return grcPlans().filter(a => grcStatus(a) === 'Menunggu Validasi SI-GRC');
  return [];
}
const grcPending = grcTodo;
const sigTag = lv => `<span class="prio ${lv}">${lv.toUpperCase()}</span>`;
const strategicTag = () => `<span class="badge b-violet" title="Penugasan strategis berdampak OJK-wide — dialirkan ke SI-GRC">Strategis · SI-GRC</span>`;
const canRespondGRC = ap => isRole('satker') && ap.satker === cu().satker && ['Menunggu Tanggapan Satker', 'Keberatan Satker', 'Siap Dikirim'].includes(grcStatus(ap));
const canSendGRC = ap => isRole('admin') && GRC_SENDABLE.includes(grcStatus(ap));
const canValidateGRC = ap => isRole('grc') && grcStatus(ap) === 'Menunggu Validasi SI-GRC';

/** Kontrak data yang dikirim ke SI-GRC (satu record per penugasan). */
function grcPayload(ap) {
  const s = grcSignal(ap); const g = ap.grc || {}; const sat = (appState.masters?.satker || MASTER_SATKER).find(x => x.name === ap.satker);
  return {
    source_system: 'SI-RDK', source_ref: ap.id, risk_input_id: g.riskId || null, submission: g.recorded ? 'update' : 'new',
    classification: 'Penugasan Strategis', impact_scope: 'OJK-wide',
    owner_unit: { code: sat?.key || null, name: ap.satker, bidang: ap.bidang, pic: ap.pic },
    proposed_risk_category: g.category || 'Risiko Strategis', impact_rationale: g.note || '',
    assignment: { rdk_date: ap.rdkDate, topic: ap.topic, directive: ap.arahan, source_document: ap.documentName, priority: ap.priority },
    execution: { target_date: ap.targetDate, progress_pct: ap.progress, status: execStatus(ap), verification_status: ap.verificationStatus, last_update: ap.updateDate || null, obstacles: ap.kendala || null },
    proposed_risk_signal: { level: s.level, reason: s.reason },
    owner_response: g.resp ? { decision: g.resp.decision, note: g.resp.note, by: g.resp.by, at: g.resp.at } : null,
    mrdk_note: g.mrdkNote || null
  };
}

/* ------------------------------ Mock API --------------------------------- */
/** POST /api/grc/v1/risk-inputs — kirim batch input risiko ke kotak masuk validasi SI-GRC */
api.pushToGRC = async (records, onProgress) => {
  await tick(1100, onProgress);
  return records.map(r => ({ source_ref: r.source_ref, http: 202, state: 'pending_validation' }));
};

async function sendToGRC(ids, mrdkNote = '') {
  const plans = ids.map(findPlan).filter(a => a && canSendGRC(a));
  if (!plans.length) return toast('Tidak ada penugasan yang dapat dikirim.', 'info');
  toast(`Mengirim ${plans.length} penugasan ke SI-GRC…`, 'info');
  const now = new Date().toISOString();
  plans.forEach(ap => {
    const g = ap.grc;
    if (!g.riskId) { appState.seq.grc = (appState.seq.grc || 0) + 1; g.riskId = `GRC-RI-2026-${String(appState.seq.grc).padStart(4, '0')}`; }
    if (mrdkNote) g.mrdkNote = mrdkNote;
  });
  const payload = plans.map(grcPayload);
  const res = await api.pushToGRC(payload);
  plans.forEach(ap => {
    const prev = grcStatus(ap); const g = ap.grc; const s = grcSignal(ap);
    Object.assign(g, { stage: 'sent', sentAt: now, sentBy: cu().name, sentLevel: s.level, val: null });
    audit('Kirim ke SI-GRC', ap.id, prev, 'Menunggu Validasi SI-GRC', `${g.riskId} · ${g.recorded ? 'pembaruan' : 'input baru'} · sinyal usulan ${s.level}${mrdkNote ? ' · ' + mrdkNote : ''}`);
    notify(['satker:' + ap.satker], `${ap.id} dikirim MRDK ke SI-GRC dan menunggu validasi fungsi manajemen risiko.`, 'info', { type: 'plan', id: ap.id });
  });
  notify(['grc'], `${plans.length} input risiko dari SI-RDK menunggu validasi (${plans.map(a => a.id).join(', ')}).`, 'warn', { type: 'grc' });
  appState.grcLog = appState.grcLog || [];
  appState.seq.grcLog = (appState.seq.grcLog || 0) + 1;
  appState.grcLog.unshift({ id: 'SYNC-' + String(appState.seq.grcLog).padStart(4, '0'), at: now, by: cu().name, endpoint: GRC_ENDPOINT, refs: plans.map(a => a.id), result: res.map(r => `${r.source_ref}: ${r.http} Accepted (menunggu validasi)`), payload });
  toast(`${plans.length} penugasan terkirim ke SI-GRC dan menunggu validasi.`);
  commit();
}

/* ------------------------------ Tahap 1 · Usulan MRDK -------------------- */
Actions.grcClassify = el => {
  if (!isRole('admin')) return toast('Hanya Admin / MRDK yang dapat mengusulkan klasifikasi.', 'error');
  const ap = findPlan(el.dataset.id); if (!ap) return;
  const g = ap.grc || {};
  openModal({
    title: 'Usulan Klasifikasi Strategis', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`,
    body: `<div class="form-grid">
      <label class="check span-2"><input type="checkbox" id="gc-on" ${ap.strategic ? 'checked' : ''}><span><b>Penugasan strategis · berdampak OJK-wide</b><br><span class="small muted">Diusulkan untuk dialirkan ke SI-GRC sebagai input profil risiko satker pengampu. Satker akan diminta menanggapi sebelum dikirim.</span></span></label>
      <div class="field"><label for="gc-cat">Usulan kategori risiko</label><select class="select" id="gc-cat">${GRC_CATEGORIES.map(c => `<option ${c === (g.category || 'Risiko Strategis') ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label>Satker pengampu (pemilik risiko)</label><input class="input" value="${esc(ap.satker || 'Belum ditugaskan')}" disabled></div>
      <div class="field span-2"><label for="gc-note">Alasan dampak OJK-wide <span class="req">*</span></label><textarea class="textarea" id="gc-note" style="min-height:64px" placeholder="Mis. menyangkut kebijakan lintas sektor, eksposur reputasi OJK, atau rekomendasi DPR/BPK">${esc(g.note || '')}</textarea></div>
      ${g.stage && !['proposed', 'objected', 'agreed'].includes(g.stage) && ap.strategic ? `<div class="ai-banner warn span-2">${icon('info')}<span>Penugasan ini sudah dikirim ke SI-GRC. Perubahan kategori/alasan akan meminta tanggapan ulang satker sebelum dikirim kembali.</span></div>` : ''}
    </div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan Usulan', cls: 'primary', icon: 'save', onClick: m => {
      const on = $('#gc-on', m.el).checked, category = $('#gc-cat', m.el).value, note = $('#gc-note', m.el).value.trim();
      if (on && !note) { $('#gc-note', m.el).classList.add('invalid'); return toast('⚠ Alasan dampak OJK-wide wajib diisi.', 'error'); }
      const was = ap.strategic; const changed = category !== g.category || note !== g.note;
      if (!on && !was) { m.close(); return; }
      if (on && was && !changed) { m.close(); return toast('Tidak ada perubahan.', 'info'); }
      ap.strategic = on;
      if (on) {
        ap.grc = { ...g, category, note, stage: 'proposed', proposedAt: new Date().toISOString(), proposedBy: cu().name, resp: null };
        audit('Usulan Strategis', ap.id, was ? `${g.category}` : 'Non-strategis', `Strategis · ${category}`, note);
        if (ap.satker) notify(['satker:' + ap.satker], `Mohon tanggapan: ${ap.id} diusulkan MRDK sebagai penugasan strategis OJK-wide untuk dialirkan ke profil risiko Satker Anda di SI-GRC.`, 'warn', { type: 'plan', id: ap.id });
      } else {
        audit('Usulan Strategis', ap.id, 'Strategis', 'Dicabut', 'Tidak lagi dialirkan ke SI-GRC');
        if (g.recorded) notify(['grc'], `MRDK mencabut klasifikasi strategis ${ap.id} (${g.riskId}). Mohon tinjau input pada profil risiko ${ap.satker}.`, 'info', { type: 'grc' });
      }
      m.close(); toast(on ? (ap.satker ? 'Usulan tersimpan. Satker diminta menanggapi.' : 'Usulan tersimpan. Tetapkan satker agar dapat ditanggapi.') : 'Klasifikasi strategis dicabut.'); commit();
    } }]
  });
};

/* ------------------------------ Tahap 2 · Tanggapan Satker --------------- */
Actions.grcRespond = el => {
  const ap = findPlan(el.dataset.id); if (!ap || !canRespondGRC(ap)) return toast('Tanggapan hanya dapat diberikan oleh satker pemilik risiko sebelum dikirim ke SI-GRC.', 'error');
  const g = ap.grc; const s = grcSignal(ap); const cur = g.resp && g.resp.satker === ap.satker ? g.resp : null;
  openModal({
    title: 'Tanggapan Satker Pemilik Risiko', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`,
    body: `<dl class="kv" style="margin-bottom:14px">
        <dt>Usulan MRDK</dt><dd>${strategicTag()} · ${esc(g.category)}</dd>
        <dt>Alasan dampak</dt><dd>${esc(g.note)}</dd>
        <dt>Sinyal risiko usulan</dt><dd>${sigTag(s.level)} <span class="small muted">· ${esc(s.reason)}</span></dd>
      </dl>
      <div class="field"><label>Tanggapan Satker</label>
        <label class="check"><input type="radio" name="gr-dec" value="Setuju" ${cur?.decision !== 'Keberatan' ? 'checked' : ''}>Setuju dialirkan ke profil risiko satker di SI-GRC</label>
        <label class="check"><input type="radio" name="gr-dec" value="Keberatan" ${cur?.decision === 'Keberatan' ? 'checked' : ''}>Keberatan (mis. dampak tidak OJK-wide, kategori/sinyal kurang tepat)</label></div>
      <div class="field" style="margin-top:10px"><label for="gr-note">Catatan / mitigasi yang sedang dilakukan <span class="small muted">(wajib bila keberatan)</span></label><textarea class="textarea" id="gr-note" style="min-height:70px" placeholder="Tanggapan ini ikut dikirim ke SI-GRC sebagai bahan validasi fungsi manajemen risiko.">${esc(cur?.note || '')}</textarea></div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Kirim Tanggapan', cls: 'primary', icon: 'send', onClick: m => {
      const decision = $('input[name="gr-dec"]:checked', m.el).value; const note = $('#gr-note', m.el).value.trim();
      if (decision === 'Keberatan' && !note) { $('#gr-note', m.el).classList.add('invalid'); return toast('⚠ Alasan keberatan wajib diisi.', 'error'); }
      const prev = grcStatus(ap);
      g.resp = { decision, note, by: cu().name, at: new Date().toISOString(), satker: ap.satker };
      g.stage = decision === 'Setuju' ? 'agreed' : 'objected';
      audit('Tanggapan Satker (SI-GRC)', ap.id, prev, decision, note);
      notify(['admin'], `${satkerShort(ap.satker)} ${decision === 'Setuju' ? 'menyetujui' : 'mengajukan keberatan atas'} usulan SI-GRC ${ap.id}.`, decision === 'Setuju' ? 'ok' : 'warn', { type: 'plan', id: ap.id });
      m.close(); toast('Tanggapan terkirim ke Admin MRDK.'); commit();
    } }]
  });
};

/* ------------------------------ Tahap 3 · Pengiriman MRDK ---------------- */
Actions.grcSync = el => {
  if (!isRole('admin')) return;
  if (el.dataset.id) {
    const ap = findPlan(el.dataset.id); if (!ap || !canSendGRC(ap)) return;
    const st = grcStatus(ap); const needNote = ['Keberatan Satker', 'Dikembalikan SI-GRC'].includes(st);
    const ctx = st === 'Keberatan Satker' ? `<div class="ai-banner red" style="margin-bottom:12px">${icon('alert')}<span><b>Satker keberatan:</b> ${esc(ap.grc.resp?.note || '')}</span></div>`
      : st === 'Dikembalikan SI-GRC' ? `<div class="ai-banner violet" style="margin-bottom:12px">${icon('undo')}<span><b>Dikembalikan SI-GRC:</b> ${esc(ap.grc.val?.note || '')}</span></div>` : '';
    return openModal({
      title: st === 'Perlu Sinkron Ulang' ? 'Kirim Pembaruan ke SI-GRC' : 'Kirim ke SI-GRC', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.satker)}`, size: 'sm',
      body: `${ctx}<div class="small muted" style="margin-bottom:10px">Data masuk ke kotak validasi SI-GRC. Sinyal risiko baru tercatat di profil risiko satker setelah diterima ${GRC_VALIDATOR_LABEL.toLowerCase()}.</div>
        <div class="field"><label for="gs-note">${st === 'Keberatan Satker' ? 'Justifikasi MRDK meneruskan meski satker keberatan' : st === 'Dikembalikan SI-GRC' ? 'Penjelasan / perbaikan atas catatan SI-GRC' : 'Catatan MRDK untuk validator'} ${needNote ? '<span class="req">*</span>' : '<span class="small muted">(opsional)</span>'}</label><textarea class="textarea" id="gs-note" style="min-height:70px"></textarea></div>`,
      foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Kirim', cls: 'primary', icon: 'send', onClick: m => {
        const note = $('#gs-note', m.el).value.trim();
        if (needNote && !note) { $('#gs-note', m.el).classList.add('invalid'); return toast('⚠ Catatan MRDK wajib diisi.', 'error'); }
        m.close(); sendToGRC([ap.id], note);
      } }]
    });
  }
  const ids = grcPlans().filter(a => GRC_BULK.includes(grcStatus(a))).map(a => a.id);
  if (!ids.length) return toast('Tidak ada penugasan berstatus Siap Dikirim / Perlu Sinkron Ulang.', 'info');
  confirmDialog({ title: 'Kirim ke SI-GRC?', message: `${ids.length} penugasan (Siap Dikirim / Perlu Sinkron Ulang) akan dikirim ke kotak validasi <b>SI-GRC</b>. Penugasan dengan keberatan satker atau yang dikembalikan SI-GRC dikirim satu per satu dengan justifikasi.`, confirmLabel: 'Kirim', onConfirm: () => sendToGRC(ids) });
};

/* ------------------------------ Tahap 4 · Validasi SI-GRC ---------------- */
Actions.grcValidate = el => {
  const ap = findPlan(el.dataset.id); if (!ap || !canValidateGRC(ap)) return toast('Validasi dilakukan oleh fungsi manajemen risiko (Validator SI-GRC).', 'error');
  const g = ap.grc; const s = grcSignal(ap);
  openModal({
    title: 'Validasi Input Profil Risiko', sub: `<span class="mono">${g.riskId}</span> · ${ap.id} · ${esc(ap.satker)}`,
    body: `<dl class="kv" style="margin-bottom:14px">
        <dt>Penugasan</dt><dd>${esc(ap.arahan)}</dd>
        <dt>Usulan MRDK</dt><dd>${esc(g.category)} · ${esc(g.note)}</dd>
        <dt>Tanggapan satker</dt><dd>${g.resp ? `${badge(g.resp.decision)} ${esc(g.resp.note || '')} <span class="small muted">· ${esc(g.resp.by)}</span>` : '—'}</dd>
        ${g.mrdkNote ? `<dt>Catatan MRDK</dt><dd>${esc(g.mrdkNote)}</dd>` : ''}
        <dt>Pelaksanaan</dt><dd>${badge(execStatus(ap))} ${ap.progress}% · target ${fmtDate(ap.targetDate)}</dd>
        <dt>Sinyal usulan</dt><dd>${sigTag(s.level)} <span class="small muted">· ${esc(s.reason)}</span></dd>
        ${g.recorded ? `<dt>Tercatat saat ini</dt><dd>${sigTag(g.recorded.level)} · ${esc(g.recorded.category)} <span class="small muted">· sejak ${fmtDate(g.recorded.at)}</span></dd>` : ''}
      </dl>
      <div class="form-grid">
        <div class="field span-2"><label>Keputusan validasi</label>
          <label class="check"><input type="radio" name="gv-dec" value="Diterima" checked>Terima — catat ke profil risiko ${esc(ap.satker)}</label>
          <label class="check"><input type="radio" name="gv-dec" value="Dikembalikan">Kembalikan ke MRDK untuk dilengkapi/diperbaiki</label></div>
        <div class="field"><label for="gv-cat">Kategori risiko yang dicatat</label><select class="select" id="gv-cat">${GRC_CATEGORIES.map(c => `<option ${c === g.category ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
        <div class="field"><label for="gv-lv">Level risiko yang dicatat</label><select class="select" id="gv-lv">${GRC_LEVELS.map(l => `<option ${l === s.level ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <div class="field span-2"><label for="gv-note">Catatan validator <span class="small muted">(wajib bila dikembalikan atau level/kategori disesuaikan)</span></label><textarea class="textarea" id="gv-note" style="min-height:64px"></textarea></div>
      </div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan Validasi', cls: 'primary', icon: 'shield', onClick: m => {
      const decision = $('input[name="gv-dec"]:checked', m.el).value, category = $('#gv-cat', m.el).value, level = $('#gv-lv', m.el).value, note = $('#gv-note', m.el).value.trim();
      const adjusted = category !== g.category || level !== s.level;
      if ((decision === 'Dikembalikan' || adjusted) && !note) { $('#gv-note', m.el).classList.add('invalid'); return toast('⚠ Catatan validator wajib diisi.', 'error'); }
      const now = new Date().toISOString();
      g.val = { decision, note, by: cu().name, at: now, level, category };
      if (decision === 'Diterima') {
        g.stage = 'accepted'; g.category = category; g.recorded = { level, category, at: now }; g.acceptedFp = grcFingerprint(ap);
        audit('Validasi SI-GRC', ap.id, 'Menunggu Validasi SI-GRC', 'Diterima', `${g.riskId} · dicatat ${category} level ${level}${adjusted ? ' (disesuaikan validator)' : ''}${note ? ' · ' + note : ''}`);
        notify(['admin', 'satker:' + ap.satker], `${ap.id} diterima SI-GRC dan tercatat di profil risiko ${satkerShort(ap.satker)} (${category}, ${level}).`, 'ok', { type: 'plan', id: ap.id });
      } else {
        g.stage = 'returned';
        audit('Validasi SI-GRC', ap.id, 'Menunggu Validasi SI-GRC', 'Dikembalikan', `${g.riskId} · ${note}`);
        notify(['admin'], `${ap.id} dikembalikan SI-GRC: ${note}`, 'late', { type: 'plan', id: ap.id });
      }
      m.close(); toast(decision === 'Diterima' ? 'Input diterima dan tercatat di profil risiko satker.' : 'Input dikembalikan ke MRDK.'); commit();
    } }]
  });
};

/* ------------------------------ Payload & log ---------------------------- */
const jsonBlock = obj => `<pre class="mono" style="margin:0;max-height:52vh;overflow:auto;background:var(--surface-2);border:1px solid var(--line);border-radius:8px;padding:12px;font-size:11.5px;line-height:1.5;white-space:pre-wrap;word-break:break-word">${esc(JSON.stringify(obj, null, 2))}</pre>`;
Actions.grcPayload = el => {
  const ap = findPlan(el.dataset.id); if (!ap) return;
  openModal({ title: 'Payload ke SI-GRC', sub: `<span class="mono">${GRC_ENDPOINT}</span> · ${ap.id}`, body: `<div class="small muted" style="margin-bottom:8px">Data yang akan/terakhir dikirim untuk penugasan ini berdasarkan kondisi saat ini.</div>${jsonBlock(grcPayload(ap))}`, foot: [{ label: 'Tutup', cls: 'primary' }] });
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
  if (canRespondGRC(ap)) b.push(`<button class="btn ${size} primary" data-act="grcRespond" data-id="${ap.id}">${icon('pencil', 'sm')}${grcStatus(ap) === 'Menunggu Tanggapan Satker' ? 'Tanggapi' : 'Ubah tanggapan'}</button>`);
  if (canSendGRC(ap)) b.push(`<button class="btn ${size} primary" data-act="grcSync" data-id="${ap.id}">${icon('send', 'sm')}${grcStatus(ap) === 'Perlu Sinkron Ulang' ? 'Kirim pembaruan' : grcStatus(ap) === 'Siap Dikirim' ? 'Kirim' : 'Teruskan'}</button>`);
  if (canValidateGRC(ap)) b.push(`<button class="btn ${size} primary" data-act="grcValidate" data-id="${ap.id}">${icon('shield', 'sm')}Validasi</button>`);
  return b.join('');
}
function grcStepsHTML(ap) {
  const g = ap.grc || {}; const st = grcStatus(ap);
  const respOk = g.resp && g.resp.satker === ap.satker;
  const step = (n, title, state, body) => `<div class="tl-item"><div class="tl-time" style="font-weight:600">${n}</div><div class="tl-body ${state}"><div class="tl-title"><b>${title}</b></div>${body}</div></div>`;
  const who = (by, at) => by ? `<div class="tl-meta">${esc(by)} · ${fmtDT(at)}</div>` : '';
  return `<div class="timeline">
    ${step('1', 'Usulan MRDK', 'green', `<div class="small">${esc(g.category || '—')} · ${esc(g.note || '—')}</div>${who(g.proposedBy, g.proposedAt)}`)}
    ${step('2', 'Tanggapan Satker', !ap.satker ? '' : respOk ? (g.resp.decision === 'Setuju' ? 'green' : 'red') : 'amber', !ap.satker ? '<div class="small muted">Menunggu penetapan satker pengampu</div>' : respOk ? `<div>${badge(g.resp.decision)}</div>${g.resp.note ? `<div class="tl-comment">${esc(g.resp.note)}</div>` : ''}${who(g.resp.by, g.resp.at)}` : '<div class="small" style="color:var(--warn-ink)">Menunggu tanggapan satker pemilik risiko</div>')}
    ${step('3', 'Pengiriman MRDK', g.sentAt ? 'green' : '', g.sentAt ? `<div class="small">Terkirim · <span class="mono">${esc(g.riskId)}</span> · sinyal usulan ${esc(g.sentLevel || '-')}</div>${g.mrdkNote ? `<div class="tl-comment">${esc(g.mrdkNote)}</div>` : ''}${who(g.sentBy, g.sentAt)}` : `<div class="small muted">${st === 'Siap Dikirim' || st === 'Keberatan Satker' ? 'Menunggu keputusan MRDK' : 'Belum dikirim'}</div>`)}
    ${step('4', 'Validasi SI-GRC', g.stage === 'sent' ? 'amber' : g.val ? (g.val.decision === 'Diterima' ? 'green' : 'violet') : '', g.stage === 'sent' ? '<div class="small" style="color:var(--warn-ink)">Menunggu validasi fungsi manajemen risiko</div>' + (g.recorded ? `<div class="small muted">Tercatat sebelumnya: ${esc(g.recorded.category)} · ${esc(g.recorded.level)}</div>` : '') : g.val ? `<div>${badge(g.val.decision)}${g.val.decision === 'Diterima' ? ` <span class="small">${esc(g.val.category)} · level ${esc(g.val.level)}</span>` : ''}</div>${g.val.note ? `<div class="tl-comment">${esc(g.val.note)}</div>` : ''}${who(g.val.by, g.val.at)}` : '<div class="small muted">Belum divalidasi</div>')}
  </div>`;
}
function grcDrawerSection(ap) {
  const admin = isRole('admin');
  if (!ap.strategic) return `<div class="d-sec"><div class="section-label"><span>Integrasi SI-GRC</span>${admin ? `<button class="btn xs" data-act="grcClassify" data-id="${ap.id}">${icon('flag', 'sm')}Usulkan strategis</button>` : ''}</div><div class="small muted">Bukan penugasan strategis OJK-wide — tidak dialirkan ke SI-GRC.</div></div>`;
  const st = grcStatus(ap); const s = grcSignal(ap); const g = ap.grc || {};
  const kv = (k, v) => `<dt>${k}</dt><dd>${v}</dd>`;
  return `<div class="d-sec"><div class="section-label"><span>Integrasi SI-GRC</span>${admin ? `<button class="btn xs" data-act="grcClassify" data-id="${ap.id}">${icon('sliders', 'sm')}Ubah usulan</button>` : ''}</div><dl class="kv">
      ${kv('Klasifikasi', strategicTag() + ' <span class="small muted">dampak OJK-wide</span>')}
      ${kv('Pemilik risiko', ap.satker ? esc(ap.satker) : '<span style="color:var(--warn-ink)">Belum ditugaskan</span>')}
      ${kv('Status', badge(st))}
      ${kv('Sinyal usulan', `${sigTag(s.level)} <span class="small muted">· ${esc(s.reason)}</span>`)}
      ${kv('Tercatat di profil risiko', g.recorded ? `${sigTag(g.recorded.level)} · ${esc(g.recorded.category)} <span class="small muted">· <span class="mono">${esc(g.riskId)}</span></span>` : '<span class="muted">Belum tercatat</span>')}
    </dl>
    ${st === 'Perlu Sinkron Ulang' ? `<div class="ai-banner violet" style="margin-top:12px">${icon('rerun')}<span>Data pelaksanaan berubah sejak diterima SI-GRC. Kirim pembaruan agar profil risiko satker mutakhir.</span></div>` : ''}
    <div class="section-label" style="margin-top:14px">Tahapan</div>${grcStepsHTML(ap)}
    <div class="btn-group" style="margin-top:12px">${grcActionButtons(ap)}<button class="btn sm" data-act="grcPayload" data-id="${ap.id}">${icon('eye', 'sm')}Lihat payload</button></div>
  </div>`;
}

/* ------------------------------ Halaman ---------------------------------- */
function grcRows() {
  const f = ui.grc; const q = f.q.trim().toLowerCase();
  const role = cu().role; const mine = new Set(grcTodo().map(a => a.id));
  const lv = { Tinggi: 0, Sedang: 1, Rendah: 2 };
  return grcPlans().filter(a =>
    (!f.status || grcStatus(a) === f.status) && (!f.satker || a.satker === f.satker) &&
    (!q || [a.id, a.arahan, a.satker, a.grc?.category, a.grc?.riskId, a.topic].some(v => String(v || '').toLowerCase().includes(q)))
  ).sort((a, b) => (mine.has(b.id) - mine.has(a.id)) || GRC_STATUSES.indexOf(grcStatus(a)) - GRC_STATUSES.indexOf(grcStatus(b)) || lv[grcSignal(a).level] - lv[grcSignal(b).level] || a.id.localeCompare(b.id));
}
function grcLatestNote(a) {
  const g = a.grc || {}; const st = grcStatus(a);
  if (st === 'Keberatan Satker') return g.resp?.note;
  if (st === 'Dikembalikan SI-GRC') return g.val?.note;
  if (st === 'Menunggu Validasi SI-GRC') return g.mrdkNote || (g.resp?.note ? 'Satker: ' + g.resp.note : '');
  return '';
}
function grcTableHTML() {
  const rows = grcRows();
  if (!rows.length) return `<div class="empty"><b>Tidak ada penugasan</b>${isRole('admin') ? 'Ubah filter, atau usulkan penugasan strategis dari detail rencana aksi.' : 'Ubah filter pencarian.'}</div>`;
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>ID</th><th>Poin Arahan</th><th>Satker Pemilik Risiko</th><th>Kategori</th><th>Sinyal Usulan</th><th>Tahapan</th><th>Tercatat di SI-GRC</th><th>Action</th></tr></thead><tbody>
    ${rows.map(a => { const st = grcStatus(a); const s = grcSignal(a); const g = a.grc || {}; const n = grcLatestNote(a); return `<tr class="clickable" tabindex="0" data-act="openPlan" data-id="${a.id}">
      <td data-label="ID"><span class="id">${a.id}</span></td>
      <td data-label="Poin Arahan" class="arahan full"><span class="clamp-2">${esc(a.arahan)}</span></td>
      <td data-label="Satker">${a.satker ? `<span style="display:block;min-width:130px">${esc(a.satker)}</span>` : '<span style="color:var(--warn-ink)">Belum ditugaskan</span>'}</td>
      <td data-label="Kategori"><span class="nowrap">${esc(g.category || '—')}</span></td>
      <td data-label="Sinyal Usulan">${sigTag(s.level)}<div class="small muted" style="min-width:130px">${esc(s.reason)}</div></td>
      <td data-label="Tahapan">${badge(st)}${n ? `<div class="small muted clamp-2" style="min-width:150px;margin-top:4px">${esc(n)}</div>` : ''}</td>
      <td data-label="Tercatat di SI-GRC">${g.recorded ? `${sigTag(g.recorded.level)}<div class="mono small nowrap">${esc(g.riskId)}</div>` : '<span class="muted small">Belum tercatat</span>'}</td>
      <td data-label=""><div class="btn-group" style="flex-wrap:nowrap;gap:4px">${grcActionButtons(a, 'xs')}<button class="btn xs" data-act="grcPayload" data-id="${a.id}" title="Lihat payload">${icon('eye', 'sm')}</button></div></td>
    </tr>`; }).join('')}
  </tbody></table></div><div class="tbl-foot"><span><b class="tnum">${rows.length}</b> dari <b class="tnum">${grcPlans().length}</b> penugasan strategis</span></div>`;
}
function grcProfileRows() {
  const by = {};
  grcPlans().filter(a => a.satker).forEach(a => { (by[a.satker] = by[a.satker] || []).push(a); });
  return Object.entries(by).map(([name, list]) => {
    const lv = { Tinggi: 0, Sedang: 0, Rendah: 0 }; list.forEach(a => { if (a.grc?.recorded) lv[a.grc.recorded.level]++; });
    const proc = list.filter(a => ['Menunggu Tanggapan Satker', 'Siap Dikirim', 'Menunggu Validasi SI-GRC', 'Perlu Sinkron Ulang'].includes(grcStatus(a))).length;
    const issue = list.filter(a => ['Keberatan Satker', 'Dikembalikan SI-GRC'].includes(grcStatus(a))).length;
    return { name, info: satkerInfo(name), list, lv, rec: lv.Tinggi + lv.Sedang + lv.Rendah, proc, issue };
  }).sort((a, b) => b.lv.Tinggi - a.lv.Tinggi || b.lv.Sedang - a.lv.Sedang || b.list.length - a.list.length);
}
const GRC_STAGE_CARDS = [
  { s: 'Menunggu Tanggapan Satker', who: 'Satker', ic: 'clock', tone: 'amber' },
  { s: 'Keberatan Satker', who: 'MRDK', ic: 'alert', tone: 'red' },
  { s: 'Siap Dikirim', who: 'MRDK', ic: 'send', tone: 'blue' },
  { s: 'Menunggu Validasi SI-GRC', who: 'Manajemen Risiko', ic: 'shield', tone: 'amber' },
  { s: 'Dikembalikan SI-GRC', who: 'MRDK', ic: 'undo', tone: 'grey' },
  { s: 'Perlu Sinkron Ulang', who: 'MRDK', ic: 'rerun', tone: 'grey' },
  { s: 'Diterima SI-GRC', who: 'Tercatat di profil risiko', ic: 'checkCircle', tone: 'green' },
  { s: 'Menunggu Penugasan', who: 'MRDK · tetapkan satker', ic: 'users', tone: 'grey' }
];

registerPage('grc', {
  render() {
    const role = cu().role; const all = grcPlans(); const todo = grcTodo(); const f = ui.grc;
    const prof = grcProfileRows(); const logs = role === 'satker' ? [] : (appState.grcLog || []).slice(0, 12);
    const bulk = all.filter(a => GRC_BULK.includes(grcStatus(a))).length;
    const roleNote = { admin: 'Anda mengusulkan klasifikasi, menindaklanjuti tanggapan satker, dan mengirim ke SI-GRC.', satker: `Anda adalah pemilik risiko. Tanggapi usulan MRDK sebelum penugasan dialirkan ke profil risiko <b>${esc(cu().satker || '')}</b>.`, grc: 'Anda memvalidasi input dari SI-RDK. Hanya input yang Anda terima yang tercatat di profil risiko satker.', viewer: 'Mode baca saja.' }[role] || '';
    const todoLabel = { admin: 'perlu tindakan MRDK', satker: 'menunggu tanggapan Anda', grc: 'menunggu validasi Anda' }[role];
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Integrasi · SI-GRC</div><h1>Integrasi SI-GRC</h1><div class="sub">Penugasan <b>strategis yang berdampak OJK-wide</b> dialirkan ke SI-GRC sebagai input <b>profil risiko satuan kerja pengampu</b>, setelah ditanggapi satker dan divalidasi fungsi manajemen risiko. ${roleNote}</div></div>
        <div class="btn-group">${role === 'satker' ? '' : exportButtons('grc')}${role === 'admin' ? `<button class="btn primary" data-act="grcSync" ${bulk ? '' : 'disabled'}>${icon('send')}Kirim ${bulk ? bulk + ' ' : ''}yang siap</button>` : ''}</div></div>
      ${todo.length && todoLabel ? `<div class="ai-banner warn">${icon('bell')}<span><b>${todo.length} penugasan ${todoLabel}:</b> ${todo.slice(0, 6).map(a => `<button class="link-btn mono" data-act="openPlan" data-id="${a.id}">${a.id}</button>`).join(', ')}${todo.length > 6 ? ' …' : ''}</span></div>` : ''}
      <section class="panel flow" aria-label="Tahapan pengaliran data ke SI-GRC">
        <div class="flow-top"><div class="section-label">Tahapan Pengaliran Data</div></div>
        <div class="steps">
          <div class="step"><span class="n">01</span><span style="min-width:0"><b>Usulan MRDK</b><small>Klasifikasi strategis OJK-wide, kategori & alasan dampak</small></span></div>
          <div class="step green"><span class="n">02</span><span style="min-width:0"><b>Tanggapan Satker</b><small>Pemilik risiko: setuju / keberatan + mitigasi</small></span></div>
          <div class="step"><span class="n">03</span><span style="min-width:0"><b>Pengiriman MRDK</b><small>${esc(GRC_ENDPOINT)} · keberatan wajib dijustifikasi</small></span></div>
          <div class="step green"><span class="n">04</span><span style="min-width:0"><b>Validasi SI-GRC</b><small>Manajemen risiko menerima / mengembalikan; menetapkan kategori & level</small></span></div>
        </div>
        <div class="small muted" style="padding:0 18px 14px">Sinyal risiko dari SI-RDK bersifat <b>usulan</b>; kategori dan level yang tercatat di profil risiko ditetapkan validator SI-GRC. Perubahan data pelaksanaan setelah diterima otomatis ditandai <i>Perlu Sinkron Ulang</i> dan divalidasi kembali.</div>
      </section>
      <section class="kpis" aria-label="Status per tahapan">
        ${GRC_STAGE_CARDS.map(c => { const n = all.filter(a => grcStatus(a) === c.s).length; return `<button class="kpi t-${c.tone} ${f.status === c.s ? 'on' : ''}" data-act="grcStage" data-s="${esc(c.s)}" ${f.status === c.s ? 'style="outline:2px solid var(--blue);outline-offset:-2px"' : ''}><div class="k-label"><span>${esc(c.s)}</span><span class="k-ic">${icon(c.ic, 'sm')}</span></div><div class="k-val">${n}</div><div class="k-sub">${esc(c.who)}</div></button>`; }).join('')}
      </section>
      <section class="panel"><div class="panel-head"><div><h3>Profil Risiko per Satker Pemilik Risiko</h3><div class="desc">Hanya input yang <b>diterima validator SI-GRC</b> yang dihitung sebagai tercatat · klik baris untuk melihat penugasannya</div></div></div>
        ${prof.length ? `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Satker Pemilik Risiko</th><th>Penugasan Strategis</th><th>Tercatat · Tinggi</th><th>Tercatat · Sedang</th><th>Tercatat · Rendah</th><th>Dalam Proses</th><th>Keberatan / Dikembalikan</th></tr></thead><tbody>
          ${prof.map(p => `<tr class="clickable" tabindex="0" data-act="grcPickSatker" data-s="${esc(p.name)}"><td data-label="Satker"><b style="font-weight:600">${esc(p.name)}</b><div class="small muted">${esc(p.info?.bidang || '')}</div></td><td data-label="Penugasan" class="tnum">${p.list.length}</td><td data-label="Tinggi" class="tnum">${p.lv.Tinggi ? `<span class="prio Tinggi">${p.lv.Tinggi}</span>` : '0'}</td><td data-label="Sedang" class="tnum">${p.lv.Sedang ? `<span class="prio Sedang">${p.lv.Sedang}</span>` : '0'}</td><td data-label="Rendah" class="tnum">${p.lv.Rendah}</td><td data-label="Dalam proses" class="tnum">${p.proc}</td><td data-label="Keberatan / Dikembalikan" class="tnum">${p.issue ? `<span style="color:var(--danger-ink);font-weight:600">${p.issue}</span>` : '0'}</td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><b>Belum ada data</b>Belum ada penugasan strategis dengan satker pengampu.</div>'}
      </section>
      <section class="panel" id="grc-list"><div class="panel-head"><div><h3>Penugasan Strategis · OJK-wide</h3><div class="desc">Yang menunggu tindakan Anda ditampilkan paling atas</div></div></div>
        <div class="toolbar">
          <div class="grow">${icon('search')}<input class="input" placeholder="Cari ID, poin arahan, satker, kategori, ID SI-GRC…" value="${esc(f.q)}" data-input="grcSearch"></div>
          <select class="select sm" id="gf-status" data-change="grcFilter" aria-label="Tahapan">${optList(GRC_STATUSES, f.status, 'Semua tahapan')}</select>
          ${role === 'satker' ? '' : `<select class="select sm" id="gf-satker" data-change="grcFilter" aria-label="Satker">${optList([...new Set(grcPlans().map(a => a.satker).filter(Boolean))].sort(), f.satker, 'Semua satker')}</select>`}
        </div>
        <div id="grc-table">${grcTableHTML()}</div>
      </section>
      ${role === 'satker' ? '' : `<section class="panel"><div class="panel-head"><div><h3>Log Pertukaran Data</h3><div class="desc">Riwayat pengiriman ke SI-GRC (simulasi) · ${esc(GRC_ENDPOINT)}</div></div></div>
        ${logs.length ? `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>ID</th><th>Waktu</th><th>Oleh</th><th>Penugasan</th><th>Respons</th><th></th></tr></thead><tbody>
          ${logs.map(l => `<tr><td data-label="ID"><span class="mono small">${l.id}</span></td><td data-label="Waktu"><span class="nowrap tnum">${fmtDT(l.at)}</span></td><td data-label="Oleh">${esc(l.by)}</td><td data-label="Penugasan" class="full"><span class="small">${l.refs.map(r => `<span class="mono">${r}</span>`).join(', ')}</span></td><td data-label="Respons"><span class="badge b-green">${l.result.length} diterima kotak validasi</span></td><td data-label=""><button class="btn xs" data-act="grcLogView" data-id="${l.id}">${icon('eye', 'sm')}Payload</button></td></tr>`).join('')}
        </tbody></table></div>` : '<div class="empty"><b>Belum ada pengiriman</b>Riwayat akan muncul setelah data dikirim ke SI-GRC.</div>'}
      </section>`}
    </div>`;
  }
});

Exporters.grc = () => ({
  name: 'Input_Profil_Risiko_SI-GRC', sheet: 'Input SI-GRC', title: 'Penugasan Strategis OJK-wide · Input Profil Risiko SI-GRC', subtitle: `${grcRows().length} penugasan strategis`, rows: grcRows(),
  columns: [
    { label: 'ID', get: a => a.id, w: 13 }, { label: 'Poin Arahan', get: a => a.arahan, w: 70 }, { label: 'Satker Pemilik Risiko', get: a => a.satker, w: 40 },
    { label: 'Usulan Kategori', get: a => a.grc?.category || '', w: 20 }, { label: 'Alasan Dampak OJK-wide', get: a => a.grc?.note || '', w: 50 },
    { label: 'Tanggapan Satker', get: a => a.grc?.resp?.decision || '', w: 14 }, { label: 'Catatan Satker', get: a => a.grc?.resp?.note || '', w: 40 },
    { label: 'Progress (%)', get: a => a.progress, w: 11 }, { label: 'Status Pelaksanaan', get: a => execStatus(a), w: 18 },
    { label: 'Sinyal Usulan', get: a => grcSignal(a).level, w: 12 }, { label: 'Tahapan', get: a => grcStatus(a), w: 24 },
    { label: 'Validasi SI-GRC', get: a => a.grc?.val?.decision || '', w: 14 }, { label: 'Catatan Validator', get: a => a.grc?.val?.note || '', w: 40 },
    { label: 'Tercatat · Kategori', get: a => a.grc?.recorded?.category || '', w: 20 }, { label: 'Tercatat · Level', get: a => a.grc?.recorded?.level || '', w: 14 }, { label: 'ID Input SI-GRC', get: a => a.grc?.riskId || '', w: 18 }
  ]
});
