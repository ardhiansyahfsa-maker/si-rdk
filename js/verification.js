/* =========================================================================
   SI-RDK · verification.js — Verifikasi Tindak Lanjut (Admin / MRDK)
   Approve → Disetujui · Return → Perlu Perbaikan (catatan wajib) ·
   Reject → Ditolak (alasan wajib). Every decision is audited and notified.
   ========================================================================= */

const VER_TABS = ['Menunggu Verifikasi', 'Disetujui', 'Perlu Perbaikan', 'Ditolak', 'Semua'];
function verRows() {
  const t = ui.ver.tab; const q = ui.ver.q.trim().toLowerCase();
  let rows = appState.actionPlans.filter(a => a.submissions.length && (t === 'Semua' || a.verificationStatus === t));
  if (q) rows = rows.filter(a => [a.id, a.satker, a.arahan, a.topic].some(v => String(v || '').toLowerCase().includes(q)));
  const last = a => a.submissions.at(-1).at;
  return rows.sort((a, b) => t === 'Menunggu Verifikasi' ? last(a).localeCompare(last(b)) : last(b).localeCompare(last(a)));
}
function verTableHTML() {
  const rows = verRows();
  if (!rows.length) return `<div class="empty"><b>${ui.ver.tab === 'Menunggu Verifikasi' ? 'Tidak ada update yang menunggu verifikasi' : 'Tidak ada data'}</b>${ui.ver.tab === 'Menunggu Verifikasi' ? 'Seluruh update Satker sudah direview.' : ''}</div>`;
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>No</th><th>ID</th><th>Satker</th><th>Poin Arahan</th><th>Progress</th><th>Status</th><th>Tanggal Update</th><th>Evidence</th><th>Verifikasi</th><th>Action</th></tr></thead><tbody>
    ${rows.map((a, i) => { const s = a.submissions.at(-1); const waitDays = diffDays(todayISO(), tsDay(s.at)); return `<tr class="clickable" tabindex="0" data-act="reviewPlan" data-id="${a.id}">
      <td data-label="No" class="tnum">${i + 1}</td><td data-label="ID"><span class="id">${a.id}</span></td>
      <td data-label="Satker"><span style="display:block;min-width:130px">${esc(a.satker)}</span><span class="small muted">${esc(s.by)}</span></td>
      <td data-label="Poin Arahan" class="arahan full"><span class="clamp-2">${esc(a.arahan)}</span></td>
      <td data-label="Progress"><div class="tl-change" style="margin:0 0 4px"><span class="old">${s.progressFrom}%</span>${icon('arrowRight', 'sm')}<span class="new">${s.progressTo}%</span></div>${pbar(a)}</td>
      <td data-label="Status">${badge(execStatus(a))}</td>
      <td data-label="Tanggal Update"><span class="nowrap tnum">${fmtDT(s.at)}</span>${a.verificationStatus === 'Menunggu Verifikasi' ? `<div class="small" style="color:${waitDays > 2 ? 'var(--danger-ink)' : 'var(--ink-3)'}">menunggu ${waitDays === 0 ? '< 1' : waitDays} hari</div>` : ''}</td>
      <td data-label="Evidence"><span class="chip">${icon('clip', 'sm')}${a.evidence.length} berkas</span></td>
      <td data-label="Verifikasi">${badge(a.verificationStatus)}</td>
      <td data-label=""><button class="btn sm ${a.verificationStatus === 'Menunggu Verifikasi' ? 'primary' : ''}" data-act="reviewPlan" data-id="${a.id}">${icon(a.verificationStatus === 'Menunggu Verifikasi' ? 'shield' : 'eye', 'sm')}Review</button></td></tr>`; }).join('')}
  </tbody></table></div><div class="tbl-foot"><span>${rows.length} update</span><span class="muted">${ui.ver.tab === 'Menunggu Verifikasi' ? 'Diurutkan dari yang paling lama menunggu' : 'Diurutkan dari yang terbaru'}</span></div>`;
}
registerPage('verification', {
  render() {
    const all = appState.actionPlans; const c = s => all.filter(a => a.verificationStatus === s).length;
    const card = (s, tone, ic, sub) => `<button class="kpi t-${tone}" data-act="verTab" data-t="${s}" style="${ui.ver.tab === s ? 'box-shadow:0 0 0 2px var(--blue) inset' : ''}"><div class="k-label"><span>${s}</span><span class="k-ic">${icon(ic, 'sm')}</span></div><div class="k-val">${c(s)}</div><div class="k-sub">${sub}</div></button>`;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Verifikasi · Verifikasi Admin</div><h1>Verifikasi Tindak Lanjut</h1><div class="sub">Review update yang dikirim Satker. Setujui, kembalikan untuk perbaikan, atau tolak dengan catatan.</div></div>${exportButtons('verification')}</div>
      <section class="kpis">
        ${card('Menunggu Verifikasi', 'amber', 'clock', 'perlu direview')}
        ${card('Disetujui', 'green', 'checkCircle', 'update diterima')}
        ${card('Ditolak', 'red', 'xCircle', 'update ditolak')}
        ${card('Perlu Perbaikan', 'teal', 'undo', 'dikembalikan ke Satker')}
      </section>
      <section class="panel">
        <div class="tabs">${VER_TABS.map(t => `<button class="tab ${ui.ver.tab === t ? 'on' : ''}" data-act="verTab" data-t="${t}">${t}<span class="c">${t === 'Semua' ? all.filter(a => a.submissions.length).length : c(t)}</span></button>`).join('')}</div>
        <div class="toolbar"><div class="grow">${icon('search')}<input class="input" placeholder="Cari ID, satker, poin arahan…" value="${esc(ui.ver.q)}" data-input="verSearch"></div></div>
        <div id="ver-table">${verTableHTML()}</div>
      </section></div>`;
  }
});
Actions.verTab = el => { ui.ver.tab = el.dataset.t; renderPage(true); };
Actions.verSearch = debounce(el => { ui.ver.q = el.value; $('#ver-table').innerHTML = verTableHTML(); }, 140);
Actions.reviewPlan = el => openReview(el.dataset.id);
Exporters.verification = () => ({
  name: 'Verifikasi_Tindak_Lanjut', sheet: 'Verifikasi', title: `Verifikasi Tindak Lanjut — ${ui.ver.tab}`, subtitle: `${verRows().length} update`, rows: verRows(),
  columns: [
    { label: 'ID', get: a => a.id, w: 13 }, { label: 'Satker', get: a => a.satker, w: 40 }, { label: 'Poin Arahan', get: a => a.arahan, w: 70 },
    { label: 'Progress Sebelum (%)', get: a => a.submissions.at(-1).progressFrom, w: 12 }, { label: 'Progress (%)', get: a => a.progress, w: 10 }, { label: 'Status', get: a => execStatus(a), w: 16 },
    { label: 'Tanggal Update', get: a => fmtDT(a.submissions.at(-1).at), w: 18 }, { label: 'Jumlah Evidence', get: a => a.evidence.length, w: 10 },
    { label: 'Status Verifikasi', get: a => a.verificationStatus, w: 18 }, { label: 'Catatan Verifikasi', get: a => a.verificationNote, w: 50 }
  ]
});

function openReview(id) {
  const ap = findPlan(id); if (!ap) return;
  if (!isRole('admin')) { openDrawer(id); return; }
  const s = ap.submissions.at(-1);
  if (!s) { openDrawer(id); return; }
  const pending = ap.verificationStatus === 'Menunggu Verifikasi';
  const targetChanged = s.prevTarget && s.prevTarget !== s.targetDate;
  const field = (l, v) => `<div class="dl"><dt>${l}</dt><dd>${v}</dd></div>`;
  const m = openModal({
    title: `Review ${ap.id}`, size: 'xl', sub: `${esc(ap.satker)} · dikirim ${esc(s.by)} · ${fmtDT(s.at)}`,
    body: `<div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:20px" id="rv-grid">
      <div style="display:flex;flex-direction:column;gap:16px;min-width:0">
        <div><div class="section-label" style="margin-bottom:8px">Arahan</div><div class="quote">${esc(ap.arahan)}</div>
          <div class="small muted" style="margin-top:6px">${esc(ap.topic)} · RDK ${fmtDate(ap.rdkDate)} · prioritas ${ap.priority.toLowerCase()}</div></div>
        <div class="cmp"><div class="side"><small>Sebelum</small><b>${s.progressFrom}%</b></div>${icon('arrowRight', 'lg')}<div class="side"><small>Diajukan</small><b style="color:var(--green-700)">${s.progressTo}%</b></div></div>
        <dl class="dl-grid" style="margin:0">
          ${field('Status', badge(execStatus(ap)))}
          ${field('Target', `${fmtDate(s.targetDate)}${targetChanged ? ` <span class="badge b-amber plain">diubah dari ${fmtDate(s.prevTarget)}</span>` : ''}`)}
          <div class="dl span-2"><dt>Tindak lanjut Satker</dt><dd>${esc(s.tindakLanjut || '—')}</dd></div>
          ${field('Output', esc(s.output || '—'))}${field('Kendala', esc(s.kendala || '—'))}
          <div class="dl span-2"><dt>Catatan Satker</dt><dd>${esc(s.catatan || '—')}</dd></div>
        </dl>
        <div><div class="section-label" style="margin-bottom:8px">Evidence (${ap.evidence.length})</div>${evidenceList(ap.evidence)}</div>
        ${ap.submissions.length > 1 ? `<div><div class="section-label" style="margin-bottom:8px">Riwayat pengajuan sebelumnya</div><div class="sub-hist">${ap.submissions.slice(0, -1).reverse().map(subCard).join('')}</div></div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;gap:12px;min-width:0">
        <div class="panel" style="box-shadow:none"><div class="panel-head"><h3>Verification</h3>${badge(ap.verificationStatus)}</div>
          <div class="panel-body" style="display:flex;flex-direction:column;gap:12px">
          ${pending ? `<div class="field"><label for="rv-note">Catatan verifikasi</label><textarea class="textarea" id="rv-note" style="min-height:110px" placeholder="Wajib diisi untuk Return for Revision dan Reject"></textarea><span class="hint">Catatan dikirim ke Satker dan tercatat di audit trail.</span></div>
            <button class="btn green" data-v="Disetujui" style="height:38px">${icon('check')}Approve</button>
            <button class="btn warn" data-v="Perlu Perbaikan" style="height:38px">${icon('undo')}Return for Revision</button>
            <button class="btn danger" data-v="Ditolak" style="height:38px">${icon('x')}Reject</button>
            <div class="small muted">Approve → <b>Disetujui</b>. Return → <b>Perlu Perbaikan</b>, Satker dapat mengirim ulang. Reject → <b>Ditolak</b>.</div>`
          : `<dl class="kv"><dt>Hasil</dt><dd>${badge(ap.verificationStatus)}</dd><dt>Oleh</dt><dd>${esc(s.resultBy || '—')}</dd><dt>Waktu</dt><dd>${fmtDT(s.resultAt)}</dd><dt>Catatan</dt><dd>${esc(s.resultNote || ap.verificationNote || '—')}</dd></dl>
            <div class="small muted">Update ini sudah direview. Satker dapat mengirim update baru bila diperlukan.</div>`}
          </div></div>
        <button class="btn ghost" data-open-detail>${icon('eye')}Buka detail lengkap & audit trail</button>
      </div></div>`,
    onMount: el => {
      if (window.matchMedia('(max-width: 900px)').matches) $('#rv-grid', el).style.gridTemplateColumns = 'minmax(0,1fr)';
      $('[data-open-detail]', el).addEventListener('click', () => { m.close(); openDrawer(ap.id); });
      $$('[data-v]', el).forEach(b => b.addEventListener('click', () => decide(ap, b.dataset.v, m)));
    }
  });
}
function decide(ap, result, m) {
  const noteEl = $('#rv-note', m.el); const note = noteEl.value.trim();
  if (result !== 'Disetujui' && !note) {
    noteEl.classList.add('invalid'); noteEl.focus();
    return toast(result === 'Ditolak' ? '⚠ Catatan wajib diisi apabila update ditolak.' : '⚠ Catatan wajib diisi apabila update dikembalikan untuk perbaikan.', 'error');
  }
  const label = { 'Disetujui': 'Approve', 'Perlu Perbaikan': 'Return for Revision', 'Ditolak': 'Reject' }[result];
  confirmDialog({
    title: `${label} ${ap.id}?`, tone: result === 'Disetujui' ? 'green' : result === 'Ditolak' ? 'danger' : 'primary', confirmLabel: label,
    message: `Status verifikasi akan berubah menjadi <b>${result}</b>${result === 'Disetujui' && ap.progress >= 100 ? ' dan rencana aksi dinyatakan <b>Selesai</b>' : ''}. Satker <b>${esc(ap.satker)}</b> akan menerima notifikasi.${note ? `<div class="tl-comment">${esc(note)}</div>` : ''}`,
    onConfirm: () => {
      const s = ap.submissions.at(-1); const now = new Date().toISOString(); const prev = ap.verificationStatus;
      Object.assign(s, { result, resultNote: note, resultBy: cu().name, resultAt: now });
      Object.assign(ap, { verificationStatus: result, verificationNote: note, updatedAt: now });
      audit('Verifikasi', ap.id, prev, result, note);
      const txt = result === 'Disetujui' ? `${ap.id} telah disetujui Admin MRDK.` : result === 'Ditolak' ? `${ap.id} ditolak oleh Admin MRDK: ${note}` : `${ap.id} dikembalikan untuk perbaikan: ${note}`;
      notify(['satker:' + ap.satker], txt, result === 'Disetujui' ? 'ok' : 'late', { type: 'plan', id: ap.id });
      if (result === 'Disetujui' && ap.progress >= 100) notify(['viewer'], `${ap.id} selesai dan telah diverifikasi.`, 'ok', { type: 'plan', id: ap.id });
      m.close(); toast('Verifikasi berhasil.'); commit();
    }
  });
}
