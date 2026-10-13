/* =========================================================================
   SI-RDK · iru.js — Data realisasi IRU (Key Risk Indicator) Risiko Pengaturan
   IRU di SI-GRC: "Concern yang perlu direspon dengan penyesuaian atau
   pengkinian ketentuan" (Desired 100% · Acceptable 100%), dinilai triwulanan.
   · Penugasan ditandai "memerlukan penyesuaian/pengkinian ketentuan" (saran
     LLM saat ekstraksi, ditetapkan MRDK) — apa pun cakupannya.
   · Pemilik risiko: departemen pengaturan pada bidang terkait. Departemen
     Hukum tercatat sebagai satker terkait (harmonisasi & penyelarasan).
   · Realisasi = peraturan selesai (progres 100% disetujui MRDK) ÷ concern.
   · SI-RDK hanya memasok data; status IRU ditetapkan di SI-GRC.
   ========================================================================= */

const IRU = {
  risk: 'Risiko Pengaturan', name: 'Concern yang perlu direspon dengan penyesuaian atau pengkinian ketentuan',
  desired: '100%', acceptable: '100%', endpoint: 'POST /api/grc/v1/kri-realizations', related: 'DHUK'
};
const REG_DEPTS = ['DPNP', 'DPMS', 'DPPM', 'DPPP', 'DPPL', 'DPIA', 'DPPK'];
const REG_OWNER_BY_BIDANG = { PBKN: 'DPNP', PMDK: 'DPPM', PPDP: 'DPPP', PVML: 'DPPL', IAKD: 'DPIA', BMKS: 'DPPK' };
/** Saran awal (LLM) — arahan yang meminta penyusunan/penyesuaian ketentuan. */
const REG_HINT = /(menyusun|menyempurnakan|merevisi|mengkinikan|menerbitkan|penyesuaian|pengkinian|mengubah)[^.]{0,60}(POJK|SEOJK|ketentuan|pengaturan|regulasi|peraturan)/i;
const regNeeded = ap => !!ap?.reg?.needed;
const satkerOfKey = k => (appState.masters?.satker || MASTER_SATKER).find(s => s.key === k);
function regOwnerKey(ap) {
  if (ap.reg?.owner) return ap.reg.owner;
  const k = satkerInfo(ap.satker)?.key;
  if (REG_DEPTS.includes(k)) return k;
  return REG_OWNER_BY_BIDANG[bidangCode(ap.bidang)] || null;
}
ui.iru = ui.iru || { period: '', open: {} };

/* ------------------------------ Periode ---------------------------------- */
function iruPeriods() {
  const y = +todayISO().slice(0, 4);
  return [y - 1, y].flatMap(yr => [1, 2, 3, 4].map(q => ({ id: `${yr}-TW${q}`, label: `TW ${['I', 'II', 'III', 'IV'][q - 1]} ${yr}`, start: `${yr}-${String(q * 3 - 2).padStart(2, '0')}-01`, end: `${yr}-${['03-31', '06-30', '09-30', '12-31'][q - 1]}`, yr })))
    .filter(p => p.start <= todayISO());
}
const iruCurrent = () => iruPeriods().at(-1);
const iruPeriod = () => iruPeriods().find(p => p.id === ui.iru.period) || iruCurrent();

/** Realisasi per pemilik risiko pada suatu periode (kumulatif dalam tahun berjalan). */
function iruRows(p = iruPeriod()) {
  const D = p.end < todayISO() ? p.end : todayISO(); const yStart = `${p.yr}-01-01`;
  const list = appState.actionPlans.filter(a => regNeeded(a) && a.rdkDate <= p.end)
    .filter(a => !(rkVerified(a, `${p.yr - 1}-12-31`) >= 100)); // yang sudah selesai sebelum tahun berjalan tidak dihitung
  const by = {};
  list.forEach(a => { const k = regOwnerKey(a) || '—'; (by[k] = by[k] || []).push({ ap: a, done: rkVerified(a, D) >= 100 }); });
  return Object.entries(by).map(([k, items]) => {
    const done = items.filter(x => x.done).length;
    return { key: k, owner: satkerOfKey(k), items, total: items.length, done, pct: Math.round(done / items.length * 100) };
  }).sort((a, b) => a.pct - b.pct || b.total - a.total);
}
function iruPayload(p = iruPeriod()) {
  const rel = satkerOfKey(IRU.related);
  return iruRows(p).map(r => ({
    source_system: 'SI-RDK', kri: IRU.name, risk: IRU.risk, period: p.id, period_end: p.end,
    owner_unit: r.owner ? { code: r.owner.key, name: r.owner.name } : null, related_unit: { code: rel?.key, name: rel?.name, role: 'harmonisasi dan penyelarasan' },
    definition: 'peraturan selesai (progres 100% disetujui MRDK) ÷ concern yang perlu penyesuaian/pengkinian ketentuan',
    numerator: r.done, denominator: r.total, realization_pct: r.pct, kri_status: 'ditetapkan SI-GRC',
    items: r.items.map(x => ({ ref: x.ap.id, directive: x.ap.arahan, source_document: x.ap.documentName, implementing_unit: x.ap.satker, progress_pct: x.ap.progress, completed: x.done, completed_date: x.ap.completedDate || null }))
  }));
}

/* ------------------------------ Aksi ------------------------------------- */
api.pushKRI = async (records, onProgress) => { await tick(900, onProgress); return records.map(r => ({ owner: r.owner_unit?.code, http: 202 })); };
Actions.iruPeriod = el => { ui.iru.period = el.value; renderPage(true); };
Actions.iruToggle = el => { ui.iru.open[el.dataset.k] = !ui.iru.open[el.dataset.k]; renderPage(true); };
Actions.iruPayload = () => openModal({ title: 'Data Realisasi IRU → SI-GRC', sub: `<span class="mono">${esc(IRU.endpoint)}</span> · ${iruPeriod().label}`, body: jsonBlock({ records: iruPayload() }), foot: [{ label: 'Tutup', cls: 'primary' }] });
Actions.iruSend = () => {
  if (!isRole('admin')) return;
  const p = iruPeriod(); const recs = iruPayload(p);
  if (!recs.length) return toast('Tidak ada data IRU pada periode ini.', 'info');
  confirmDialog({
    title: `Kirim realisasi IRU ${p.label}?`, confirmLabel: 'Kirim',
    message: `Realisasi IRU <b>${esc(IRU.name)}</b> untuk ${recs.length} pemilik risiko akan dikirim ke SI-GRC. Status IRU ditetapkan di SI-GRC.`,
    onConfirm: async () => {
      const res = await api.pushKRI(recs); const now = new Date().toISOString();
      appState.iruLog = appState.iruLog || []; appState.iruLog.unshift({ period: p.id, at: now, by: cu().name, records: recs.length });
      appState.grcLog = appState.grcLog || []; appState.seq.grcLog = (appState.seq.grcLog || 0) + 1;
      appState.grcLog.unshift({ id: 'SYNC-' + String(appState.seq.grcLog).padStart(4, '0'), at: now, by: cu().name, endpoint: IRU.endpoint, refs: recs.map(r => `IRU ${p.id} · ${r.owner_unit?.code || '—'}`), result: res.map(r => `${r.owner}: ${r.http} Accepted`), payload: recs });
      audit('Kirim Realisasi IRU', 'IRU ' + p.id, '-', `${recs.length} pemilik risiko`, recs.map(r => `${r.owner_unit?.code || '—'} ${r.numerator}/${r.denominator} (${r.realization_pct}%)`).join('; '));
      toast(`Realisasi IRU ${p.label} terkirim ke SI-GRC.`); commit();
    }
  });
};
Actions.regEdit = el => {
  if (!isRole('admin')) return toast('Hanya Admin MRDK yang dapat menetapkan.', 'error');
  const ap = findPlan(el.dataset.id); if (!ap) return; const r = ap.reg || {};
  const auto = (() => { const k = satkerInfo(ap.satker)?.key; return REG_DEPTS.includes(k) ? k : REG_OWNER_BY_BIDANG[bidangCode(ap.bidang)] || ''; })();
  openModal({
    title: 'Penyesuaian / Pengkinian Ketentuan', sub: `<span class="mono">${ap.id}</span> · ${esc(ap.arahan.slice(0, 80))}${ap.arahan.length > 80 ? '…' : ''}`, size: 'sm',
    body: `<label class="check"><input type="checkbox" id="rg-on" ${r.needed ? 'checked' : ''}><span><b>Memerlukan penyesuaian atau pengkinian ketentuan</b><br><span class="small muted">Dihitung dalam realisasi IRU ${esc(IRU.risk)} di SI-GRC, apa pun cakupannya.</span></span></label>
      <div class="field" style="margin-top:12px"><label for="rg-owner">Pemilik risiko (departemen pengaturan)</label><select class="select" id="rg-owner"><option value="">${auto ? 'Otomatis: ' + esc(auto) : '— Pilih —'}</option>${REG_DEPTS.map(k => `<option value="${k}" ${r.owner === k ? 'selected' : ''}>${k} · ${esc(satkerOfKey(k)?.name || '')}</option>`).join('')}</select></div>
      <div class="small muted" style="margin-top:8px">Satker terkait: <b>${esc(satkerOfKey(IRU.related)?.name || 'Departemen Hukum')}</b> (harmonisasi & penyelarasan).</div>
      <div class="field" style="margin-top:12px"><label for="rg-note">Catatan <span class="small muted">(opsional)</span></label><textarea class="textarea" id="rg-note" style="min-height:56px">${esc(r.note || '')}</textarea></div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', icon: 'save', onClick: m => {
      const on = $('#rg-on', m.el).checked, owner = $('#rg-owner', m.el).value, note = $('#rg-note', m.el).value.trim();
      if (on && !owner && !auto) { $('#rg-owner', m.el).classList.add('invalid'); return toast('⚠ Pemilik risiko belum terpetakan — pilih departemen pengaturan.', 'error'); }
      const was = regNeeded(ap);
      ap.reg = { needed: on, owner: owner || null, note, by: cu().name, at: new Date().toISOString(), src: 'MRDK' };
      audit('Penandaan Penyesuaian Ketentuan', ap.id, was ? 'Ya' : 'Tidak', on ? `Ya · pemilik ${owner || auto}` : 'Tidak', note);
      m.close(); toast('Data disimpan.'); commit();
    } }]
  });
};

/* ------------------------------ Tampilan --------------------------------- */
function iruDrawerSection(ap) {
  const admin = isRole('admin');
  const btn = admin ? `<button class="btn xs" data-act="regEdit" data-id="${ap.id}">${icon('pencil', 'sm')}${regNeeded(ap) ? 'Ubah' : 'Tandai'}</button>` : '';
  if (!regNeeded(ap)) return `<div class="d-sec"><div class="section-label"><span>IRU ${esc(IRU.risk)}</span>${btn}</div><div class="small muted">Tidak memerlukan penyesuaian/pengkinian ketentuan.</div></div>`;
  const k = regOwnerKey(ap); const done = rkVerified(ap, todayISO()) >= 100;
  return `<div class="d-sec"><div class="section-label"><span>IRU ${esc(IRU.risk)}</span>${btn}</div><dl class="kv">
    <dt>Indikator</dt><dd>${esc(IRU.name)} <span class="small muted">· Desired ${IRU.desired} · Acceptable ${IRU.acceptable} (SI-GRC)</span></dd>
    <dt>Pemilik risiko</dt><dd>${k ? `<b style="font-weight:600">${esc(k)}</b> · ${esc(satkerOfKey(k)?.name || '')}` : '<span style="color:var(--warn-ink)">Belum terpetakan</span>'}</dd>
    <dt>Satker terkait</dt><dd>${esc(satkerOfKey(IRU.related)?.name || '')} <span class="small muted">· harmonisasi & penyelarasan</span></dd>
    <dt>Dihitung</dt><dd>${done ? '<span class="badge b-teal">Peraturan selesai</span>' : '<span class="badge b-amber">Belum selesai</span>'} <span class="small muted">· ${ap.reg.src === 'MRDK' ? 'ditetapkan MRDK' : 'saran LLM, disimpan MRDK'}</span></dd>
  </dl></div>`;
}
function iruPanelHTML() {
  const role = cu().role; const p = iruPeriod(); const rows = iruRows(p);
  const tot = rows.reduce((t, r) => t + r.total, 0), done = rows.reduce((t, r) => t + r.done, 0);
  const sent = (appState.iruLog || []).find(l => l.period === p.id);
  return `<section class="panel" id="iru-panel"><div class="panel-head"><div><h3>Data IRU · ${esc(IRU.risk)}</h3><div class="desc">${esc(IRU.name)} · Desired ${IRU.desired} · Acceptable ${IRU.acceptable} · dinilai triwulanan di SI-GRC</div></div>
      <div class="btn-group"><select class="select sm" data-change="iruPeriod" aria-label="Periode">${iruPeriods().map(x => `<option value="${x.id}" ${x.id === p.id ? 'selected' : ''}>${x.label}${x.id === iruCurrent().id ? ' (berjalan)' : ''}</option>`).join('')}</select>
      <button class="btn sm" data-act="iruPayload">${icon('eye', 'sm')}Lihat data</button>${role === 'admin' ? `<button class="btn sm primary" data-act="iruSend">${icon('send', 'sm')}Kirim realisasi ${esc(p.label)}</button>` : ''}</div></div>
    <div class="panel-body" style="padding-bottom:6px"><div class="small muted">Penugasan yang <b>memerlukan penyesuaian/pengkinian ketentuan</b> (apa pun cakupannya). Realisasi = peraturan selesai (progres 100% disetujui MRDK) ÷ concern, kumulatif ${p.yr} s.d. akhir periode. Pemilik risiko: departemen pengaturan bidang terkait; Departemen Hukum terkait untuk harmonisasi. <b>Status IRU ditetapkan SI-GRC.</b> ${sent ? `· Terkirim ${fmtDT(sent.at)} oleh ${esc(sent.by)}` : '· Belum dikirim untuk periode ini'}</div>
      <div class="small" style="margin-top:6px"><b class="tnum">${done}</b> dari <b class="tnum">${tot}</b> concern selesai${tot ? ` (<b>${Math.round(done / tot * 100)}%</b>)` : ''}</div></div>
    ${rows.length ? `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Pemilik Risiko (Departemen Pengaturan)</th><th class="num">Concern</th><th class="num">Peraturan Selesai</th><th class="num">Realisasi</th><th>Satker Terkait</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr><td data-label="Pemilik"><b style="font-weight:600">${esc(r.owner?.key || '—')}</b> · ${esc(r.owner?.name || 'Belum terpetakan')}<div class="small muted">${esc(r.owner?.bidang || '')}</div></td>
        <td data-label="Concern" class="num tnum">${r.total}</td><td data-label="Selesai" class="num tnum">${r.done}</td>
        <td data-label="Realisasi" class="num tnum"><b>${r.pct}%</b><div class="small muted">target ${IRU.desired}</div></td>
        <td data-label="Terkait"><span class="small">${esc(IRU.related)} · harmonisasi</span></td>
        <td data-label=""><button class="btn xs" data-act="iruToggle" data-k="${esc(r.key)}">${ui.iru.open[r.key] ? 'Tutup' : 'Rincian'}</button></td></tr>
        ${ui.iru.open[r.key] ? `<tr><td colspan="6" class="full" style="background:var(--surface-2)">${r.items.map(x => `<div class="small" style="display:flex;gap:8px;align-items:baseline;padding:4px 0"><button class="link-btn mono" data-act="openPlan" data-id="${x.ap.id}">${x.ap.id}</button><span class="grow">${esc(x.ap.arahan)}<span class="muted"> · ${esc(satkerShort(x.ap.satker) || '—')} · ${x.ap.progress}%</span></span>${x.done ? '<span class="badge b-teal">Selesai</span>' : '<span class="badge b-amber">Belum</span>'}</div>`).join('')}</td></tr>` : ''}`).join('')}
    </tbody></table></div>` : '<div class="empty"><b>Tidak ada concern pada periode ini</b>Tandai penugasan yang memerlukan penyesuaian ketentuan dari detail rencana aksi.</div>'}
  </section>`;
}
