/* =========================================================================
   SI-RDK · audit.js — Audit Trail, plus Administration (User, Master Data)
   ========================================================================= */

function logColor(l) {
  if (l.action === 'Verifikasi') return l.newValue === 'Disetujui' ? 'green' : l.newValue === 'Ditolak' ? 'red' : 'violet';
  if (l.action === 'Status Otomatis' || l.action === 'Hapus Dokumen') return 'red';
  if (l.action === 'Submit Verifikasi') return 'amber';
  if (l.action === 'Kirim ke SI-GRC' || l.action === 'Klasifikasi Strategis') return 'violet';
  if (['Update Progress', 'Update Status', 'Upload Bukti', 'Simpan Draft'].includes(l.action)) return 'green';
  if (['Login', 'Logout', 'Export Data', 'Cetak Laporan'].includes(l.action)) return 'grey';
  return '';
}
function entityLink(id) {
  if (/^RA-/.test(id) && findPlan(id)) return `<button class="link-btn mono" data-act="openPlan" data-id="${id}">${id}</button>`;
  if (/^DOC-/.test(id) && findDoc(id) && canSee('ocr')) return `<button class="link-btn mono" data-act="viewDoc" data-id="${id}">${id}</button>`;
  return `<span class="mono">${esc(id)}</span>`;
}
function logNarrative(l) {
  const u = `<b>${esc(l.user)}</b>`; const e = entityLink(l.entity);
  switch (l.action) {
    case 'Update Progress': return `${u} memperbarui ${e} <span class="tl-change"><span class="old">${esc(l.oldValue)}</span>→<span class="new">${esc(l.newValue)}</span></span>`;
    case 'Verifikasi': return `${u} ${l.newValue === 'Disetujui' ? 'menyetujui' : l.newValue === 'Ditolak' ? 'menolak update' : 'mengembalikan untuk perbaikan'} ${e}`;
    case 'Submit Verifikasi': return `${u} mengirim ${e} untuk verifikasi`;
    case 'Upload Bukti': return `${u} mengirim bukti tindak lanjut ${e}`;
    case 'Registrasi Rencana Aksi': return `${u} mendaftarkan ${e} ke register`;
    case 'Assignment': return `${u} menugaskan ${e} → ${esc(String(l.newValue).replace('Satker: ', ''))}`;
    case 'Upload Dokumen': return `${u} mengunggah ${e}`;
    case 'Ekstraksi Dokumen': return `Ekstraksi OCR/LLM ${e} selesai · ${esc(l.comment || l.newValue)}`;
    case 'Status Otomatis': return `${e} berubah otomatis menjadi <b style="color:var(--danger-ink)">Terlambat</b>`;
    case 'Update Status': return `${u} mengubah status ${e} menjadi ${esc(l.newValue)}`;
    case 'Simpan Draft': return `${u} menyimpan draft update ${e}`;
    case 'Hapus Dokumen': return `${u} menghapus dokumen ${esc(l.entity)}`;
    case 'Kirim ke SI-GRC': return `${u} mengalirkan ${e} ke SI-GRC sebagai input profil risiko satker`;
    case 'Klasifikasi Strategis': return `${u} mengubah klasifikasi ${e}: ${esc(l.newValue)}`;
    case 'Edit Ekstraksi': return `${u} mengoreksi hasil ekstraksi ${e}`;
    default: return `${u} · ${esc(l.action)} ${e}`;
  }
}
function changeHTML(l) {
  if ((l.oldValue === '-' || !l.oldValue) && (l.newValue === '-' || !l.newValue)) return '';
  return `<div class="tl-change"><span class="old">${esc(l.oldValue || '-')}</span>${icon('arrowRight', 'sm')}<span class="new">${esc(l.newValue || '-')}</span></div>`;
}

/* ------------------------------- Audit page ------------------------------ */
function auditRows() {
  const f = ui.audit; const q = f.q.trim().toLowerCase();
  return appState.auditLogs.filter(l =>
    (!f.action || l.action === f.action) && (!f.role || l.role === f.role) &&
    (!f.from || tsDay(l.ts) >= f.from) && (!f.to || tsDay(l.ts) <= f.to) &&
    (!q || [l.user, l.action, l.entity, l.oldValue, l.newValue, l.comment].some(v => String(v || '').toLowerCase().includes(q)))
  ).slice().reverse();
}
function auditBodyHTML() {
  const rows = auditRows(); const f = ui.audit;
  if (!rows.length) return '<div class="empty"><b>Tidak ada catatan</b>Ubah filter pencarian.</div>';
  const shown = rows.slice(0, f.limit);
  const more = rows.length > f.limit ? `<div style="padding:14px 18px;border-top:1px solid var(--line-2);text-align:center"><button class="btn sm" data-act="auditMore">Tampilkan ${Math.min(60, rows.length - f.limit)} catatan berikutnya</button> <span class="small muted">· ${shown.length} dari ${rows.length}</span></div>` : `<div class="tbl-foot"><span>${rows.length} catatan</span></div>`;
  if (f.view === 'table') {
    return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Timestamp</th><th>User</th><th>Role</th><th>Action</th><th>Entitas</th><th>Old Value</th><th>New Value</th><th>Comment</th></tr></thead><tbody>
      ${shown.map(l => `<tr><td data-label="Timestamp" class="nowrap tnum">${fmtDT(l.ts)}</td><td data-label="User">${esc(l.user)}</td><td data-label="Role">${esc(ROLE_LABEL[l.role] || 'Sistem')}</td><td data-label="Action"><b style="font-weight:600">${esc(l.action)}</b></td><td data-label="Entitas">${entityLink(l.entity)}</td><td data-label="Old Value" class="muted">${esc(l.oldValue)}</td><td data-label="New Value">${esc(l.newValue)}</td><td data-label="Comment" class="full"><span class="small">${esc(l.comment || '')}</span></td></tr>`).join('')}
    </tbody></table></div>${more}`;
  }
  let day = null;
  return `<div class="panel-body"><div class="timeline">${shown.map(l => {
    const d = tsDay(l.ts); const head = d !== day ? `<div class="tl-day">${fmtDateLong(d)}${d === todayISO() ? ' · Hari ini' : ''}</div>` : ''; day = d;
    return head + `<div class="tl-item"><div class="tl-time">${fmtTime(l.ts)}</div><div class="tl-body ${logColor(l)}">
      <div class="tl-title"><b>${esc(l.action)}</b> · ${entityLink(l.entity)}</div>
      <div class="tl-meta">${esc(l.user)} · ${esc(ROLE_LABEL[l.role] || 'Sistem')} · <span class="mono">${l.id}</span></div>
      ${changeHTML(l)}${l.comment ? `<div class="tl-comment">${esc(l.comment)}</div>` : ''}</div></div>`;
  }).join('')}</div></div>${more}`;
}
registerPage('audit', {
  render() {
    const f = ui.audit; const actions = [...new Set(appState.auditLogs.map(l => l.action))].sort();
    const today = appState.auditLogs.filter(l => tsDay(l.ts) === todayISO()).length;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Administration · Audit Trail</div><h1>Audit Trail</h1><div class="sub">Jejak seluruh perubahan data: siapa, kapan, apa yang berubah, dan catatannya. Catatan tidak dapat diubah.</div></div>${exportButtons('audit')}</div>
      <div class="inline-stat"><span class="chip">Total catatan <b>${appState.auditLogs.length}</b></span><span class="chip">Hari ini <b>${today}</b></span><span class="chip">Verifikasi <b>${appState.auditLogs.filter(l => l.action === 'Verifikasi').length}</b></span><span class="chip">Update progress <b>${appState.auditLogs.filter(l => l.action === 'Update Progress').length}</b></span></div>
      <section class="panel">
        <div class="toolbar">
          <div class="grow">${icon('search')}<input class="input" placeholder="Cari user, entitas (RA-/DOC-), nilai, komentar…" value="${esc(f.q)}" data-input="auditSearch"></div>
          <select class="select sm" id="au-action" data-change="auditFilter" aria-label="Action"><option value="">Semua action</option>${actions.map(a => `<option ${f.action === a ? 'selected' : ''}>${esc(a)}</option>`).join('')}</select>
          <select class="select sm" id="au-role" data-change="auditFilter" aria-label="Role"><option value="">Semua role</option>${[['admin', 'Admin / MRDK'], ['satker', 'Satker'], ['viewer', 'Viewer'], ['system', 'Sistem']].map(([v, l]) => `<option value="${v}" ${f.role === v ? 'selected' : ''}>${l}</option>`).join('')}</select>
          <input class="input sm" type="date" id="au-from" value="${esc(f.from)}" data-change="auditFilter" aria-label="Dari tanggal" style="width:auto">
          <input class="input sm" type="date" id="au-to" value="${esc(f.to)}" data-change="auditFilter" aria-label="Sampai tanggal" style="width:auto">
          <div class="seg" role="group" aria-label="Tampilan"><button class="${f.view === 'timeline' ? 'on' : ''}" data-act="auditView" data-v="timeline">Timeline</button><button class="${f.view === 'table' ? 'on' : ''}" data-act="auditView" data-v="table">Tabel</button></div>
        </div>
        <div id="audit-body">${auditBodyHTML()}</div>
      </section></div>`;
  }
});
Actions.auditSearch = debounce(el => { ui.audit.q = el.value; ui.audit.limit = 60; $('#audit-body').innerHTML = auditBodyHTML(); }, 150);
Actions.auditFilter = () => { const f = ui.audit; f.action = $('#au-action').value; f.role = $('#au-role').value; f.from = $('#au-from').value; f.to = $('#au-to').value; f.limit = 60; $('#audit-body').innerHTML = auditBodyHTML(); };
Actions.auditView = el => { ui.audit.view = el.dataset.v; renderPage(true); };
Actions.auditMore = () => { ui.audit.limit += 60; $('#audit-body').innerHTML = auditBodyHTML(); };
Exporters.audit = () => ({
  name: 'Audit_Trail', sheet: 'Audit Trail', title: 'Audit Trail SI-RDK', subtitle: `${auditRows().length} catatan`, rows: auditRows(),
  columns: [
    { label: 'Log ID', get: l => l.id, w: 11 }, { label: 'Timestamp', get: l => fmtDT(l.ts), w: 18 }, { label: 'User', get: l => l.user, w: 20 }, { label: 'Role', get: l => ROLE_LABEL[l.role] || 'Sistem', w: 16 },
    { label: 'Action', get: l => l.action, w: 22 }, { label: 'Entitas', get: l => l.entity, w: 14 }, { label: 'Old Value', get: l => l.oldValue, w: 26 }, { label: 'New Value', get: l => l.newValue, w: 30 }, { label: 'Comment', get: l => l.comment, w: 50 }
  ]
});

/* ------------------------------- Users ----------------------------------- */
registerPage('users', {
  render() {
    const lastLogin = u => { const l = [...appState.auditLogs].reverse().find(x => x.action === 'Login' && x.user === u.name); return l ? fmtDT(l.ts) : '—'; };
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Administration · User</div><h1>Manajemen User</h1><div class="sub">Akun dan peran pengguna SI-RDK. Autentikasi pada prototipe ini disimulasikan.</div></div>
        <button class="btn primary sm" data-act="addUser">${icon('plus')}Tambah User</button></div>
      <section class="panel"><div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Nama</th><th>Username</th><th>Role</th><th>Satker</th><th>Status</th><th>Login terakhir</th><th>Action</th></tr></thead><tbody>
        ${appState.users.map(u => `<tr><td data-label="Nama"><span style="display:flex;align-items:center;gap:10px"><span class="avatar ${u.role}" style="width:28px;height:28px;font-size:11px">${initials(u.name)}</span><span><b style="font-weight:600">${esc(u.name)}</b><div class="small muted">${esc(u.title || '')}</div></span></span></td>
          <td data-label="Username" class="mono">${esc(u.username)}</td><td data-label="Role">${badge(ROLE_LABEL[u.role], 'plain')}</td><td data-label="Satker">${esc(u.satker || '—')}</td>
          <td data-label="Status">${badge(u.active ? 'Aktif' : 'Nonaktif')}</td><td data-label="Login terakhir" class="nowrap tnum">${lastLogin(u)}</td>
          <td data-label="">${u.username === cu().username ? '<span class="small muted">Akun Anda</span>' : `<button class="btn xs ${u.active ? '' : 'primary'}" data-act="toggleUser" data-u="${esc(u.username)}">${u.active ? 'Nonaktifkan' : 'Aktifkan'}</button>`}</td></tr>`).join('')}
      </tbody></table></div><div class="tbl-foot"><span>${appState.users.length} akun · ${appState.users.filter(u => u.active).length} aktif</span><span class="muted">Password akun baru: <span class="mono">password123</span></span></div></section></div>`;
  }
});
Actions.toggleUser = el => {
  const u = appState.users.find(x => x.username === el.dataset.u); if (!u) return;
  confirmDialog({ title: `${u.active ? 'Nonaktifkan' : 'Aktifkan'} ${u.name}?`, message: u.active ? 'Akun tidak dapat digunakan untuk masuk sampai diaktifkan kembali.' : 'Akun dapat kembali digunakan untuk masuk.', tone: u.active ? 'danger' : 'primary', confirmLabel: u.active ? 'Nonaktifkan' : 'Aktifkan', onConfirm: () => {
    u.active = !u.active; audit('Ubah Status User', u.username, u.active ? 'Nonaktif' : 'Aktif', u.active ? 'Aktif' : 'Nonaktif'); toast('Data berhasil disimpan.'); commit();
  } });
};
Actions.addUser = () => {
  openModal({
    title: 'Tambah User', body: `<div class="form-grid">
      <div class="field span-2"><label for="nu-name">Nama lengkap <span class="req">*</span></label><input class="input" id="nu-name"></div>
      <div class="field"><label for="nu-user">Username <span class="req">*</span></label><input class="input" id="nu-user" autocomplete="off"></div>
      <div class="field"><label for="nu-role">Role</label><select class="select" id="nu-role">${Object.entries(ROLE_LABEL).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></div>
      <div class="field span-2"><label for="nu-satker">Satker (untuk role Satker)</label><select class="select" id="nu-satker"><option value="">—</option>${appState.masters.satker.map(s => `<option>${esc(s.name)}</option>`).join('')}</select></div>
      <div class="field span-2"><label for="nu-title">Jabatan</label><input class="input" id="nu-title"></div></div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', icon: 'save', onClick: m => {
      const g = s => $(s, m.el).value.trim();
      const name = g('#nu-name'), username = g('#nu-user').toLowerCase(), role = g('#nu-role'), satker = g('#nu-satker'), title = g('#nu-title');
      if (!name || !username) return toast('⚠ Nama dan username wajib diisi.', 'error');
      if (!/^[a-z0-9._-]{3,}$/.test(username)) return toast('⚠ Username minimal 3 karakter: huruf kecil, angka, titik, garis.', 'error');
      if (appState.users.some(u => u.username === username)) return toast('⚠ Username sudah digunakan.', 'error');
      if (role === 'satker' && !satker) return toast('⚠ Pilih Satker untuk role Satker.', 'error');
      appState.users.push({ username, password: 'password123', name, role, satker: role === 'satker' ? satker : null, title: title || ROLE_LABEL[role], active: true });
      audit('Tambah User', username, '-', `${ROLE_LABEL[role]}${role === 'satker' ? ' · ' + satker : ''}`);
      m.close(); toast(`User ${username} berhasil ditambahkan.`); commit();
    } }]
  });
};

/* ------------------------------ Master data ------------------------------ */
registerPage('master', {
  render() {
    const t = ui.params.tab || ui.masterTab || 'satker'; ui.masterTab = t;
    const ms = appState.masters; const count = (k, v) => appState.actionPlans.filter(a => a[k] === v).length;
    const tabs = [['satker', 'Satker & Bidang', ms.satker.length], ['topics', 'Topik RDK', ms.topics.length], ['docs', 'Sumber & Jenis Dokumen', ms.sources.length + ms.types.length]];
    let body = '';
    if (t === 'satker') body = `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Kode</th><th>Satker</th><th>Bidang</th><th>PIC</th><th class="num">Rencana Aksi</th><th>Action</th></tr></thead><tbody>${ms.satker.map((s, i) => `<tr><td data-label="Kode" class="mono">${esc(s.key)}</td><td data-label="Satker"><b style="font-weight:600">${esc(s.name)}</b></td><td data-label="Bidang">${esc(s.bidang)}</td><td data-label="PIC">${esc(s.pic)}</td><td data-label="Rencana Aksi" class="num tnum">${count('satker', s.name)}</td><td data-label=""><button class="btn xs" data-act="editSatker" data-i="${i}">${icon('pencil', 'sm')}Ubah PIC</button></td></tr>`).join('')}</tbody></table></div>`;
    if (t === 'topics') body = `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>No</th><th>Topik RDK</th><th class="num">Rencana Aksi</th><th>Action</th></tr></thead><tbody>${ms.topics.map((x, i) => `<tr><td data-label="No" class="tnum">${i + 1}</td><td data-label="Topik">${esc(x)}</td><td data-label="Rencana Aksi" class="num tnum">${count('topic', x)}</td><td data-label="">${count('topic', x) ? '<span class="small muted">Digunakan</span>' : `<button class="btn xs ghost" data-act="delMaster" data-list="topics" data-i="${i}">${icon('trash', 'sm')}Hapus</button>`}</td></tr>`).join('')}</tbody></table></div>`;
    if (t === 'docs') body = `<div class="grid g-2" style="padding:16px 18px">${[['sources', 'Sumber Dokumen', 'source'], ['types', 'Jenis Dokumen', 'document_type']].map(([k, l, f]) => `<div><div class="section-label" style="margin-bottom:8px;display:flex;justify-content:space-between">${l}<button class="btn xs" data-act="addMaster" data-list="${k}">${icon('plus', 'sm')}Tambah</button></div><div class="evi">${ms[k].map((x, i) => { const n = appState.documents.filter(d => d[f] === x).length; return `<div class="evi-item"><div class="grow"><b>${esc(x)}</b><span class="meta">${n} dokumen</span></div>${n ? '' : `<button class="btn xs ghost" data-act="delMaster" data-list="${k}" data-i="${i}" aria-label="Hapus ${esc(x)}">${icon('trash', 'sm')}</button>`}</div>`; }).join('')}</div></div>`).join('')}</div>`;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Administration · Master Data</div><h1>Master Data</h1><div class="sub">Referensi yang digunakan pemetaan LLM, penugasan, dan filter.</div></div>
        ${t === 'satker' ? `<button class="btn primary sm" data-act="addSatker">${icon('plus')}Tambah Satker</button>` : t === 'topics' ? `<button class="btn primary sm" data-act="addMaster" data-list="topics">${icon('plus')}Tambah Topik</button>` : ''}</div>
      <section class="panel"><div class="tabs">${tabs.map(([k, l, n]) => `<button class="tab ${t === k ? 'on' : ''}" data-act="go" data-route="master" data-tab="${k}">${l}<span class="c">${n}</span></button>`).join('')}</div>${body}</section></div>`;
  }
});
Actions.addMaster = el => {
  const list = el.dataset.list; const label = { topics: 'Topik RDK', sources: 'Sumber Dokumen', types: 'Jenis Dokumen' }[list];
  openModal({ title: `Tambah ${label}`, size: 'sm', body: `<div class="field"><label for="mm-val">${label}</label><input class="input" id="mm-val"></div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', onClick: m => {
      const v = $('#mm-val', m.el).value.trim(); if (!v) return toast(`⚠ ${label} wajib diisi.`, 'error');
      if (appState.masters[list].some(x => x.toLowerCase() === v.toLowerCase())) return toast('⚠ Data sudah ada.', 'error');
      appState.masters[list].push(v); audit('Tambah Master Data', label, '-', v); m.close(); toast('Data berhasil disimpan.'); commit();
    } }] });
};
Actions.delMaster = el => {
  const list = el.dataset.list; const v = appState.masters[list][+el.dataset.i];
  confirmDialog({ title: 'Hapus data master?', message: `<b>${esc(v)}</b> akan dihapus dari daftar referensi.`, tone: 'danger', confirmLabel: 'Hapus', onConfirm: () => { appState.masters[list].splice(+el.dataset.i, 1); audit('Hapus Master Data', list, v, '-'); toast('Data berhasil dihapus.'); commit(); } });
};
Actions.editSatker = el => {
  const s = appState.masters.satker[+el.dataset.i];
  openModal({ title: 'Ubah PIC Satker', sub: esc(s.name), size: 'sm', body: `<div class="field"><label for="ms-pic">PIC</label><input class="input" id="ms-pic" value="${esc(s.pic)}"></div><label class="check" style="margin-top:12px"><input type="checkbox" id="ms-apply" checked>Terapkan ke rencana aksi aktif Satker ini</label>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', onClick: m => {
      const v = $('#ms-pic', m.el).value.trim(); if (!v) return toast('⚠ PIC wajib diisi.', 'error');
      const old = s.pic; s.pic = v;
      if ($('#ms-apply', m.el).checked) appState.actionPlans.filter(a => a.satker === s.name && a.progress < 100).forEach(a => { if (a.pic !== v) { audit('Ubah PIC', a.id, a.pic || '-', v); a.pic = v; } });
      audit('Ubah Master Satker', s.key, `PIC: ${old}`, `PIC: ${v}`); m.close(); toast('Data berhasil disimpan.'); commit();
    } }] });
};
Actions.addSatker = () => {
  openModal({ title: 'Tambah Satker', body: `<div class="form-grid"><div class="field"><label for="ns-key">Kode <span class="req">*</span></label><input class="input" id="ns-key" placeholder="mis. DPKS"></div><div class="field"><label for="ns-pic">PIC <span class="req">*</span></label><input class="input" id="ns-pic"></div>
      <div class="field span-2"><label for="ns-name">Nama Satker <span class="req">*</span></label><input class="input" id="ns-name"></div><div class="field span-2"><label for="ns-bidang">Bidang <span class="req">*</span></label><input class="input" id="ns-bidang" list="ns-bidang-list"><datalist id="ns-bidang-list">${[...new Set(appState.masters.satker.map(s => s.bidang))].map(b => `<option value="${esc(b)}">`).join('')}</datalist></div></div>`,
    foot: [{ label: 'Batal', cls: 'ghost' }, { label: 'Simpan', cls: 'primary', onClick: m => {
      const g = s => $(s, m.el).value.trim(); const key = g('#ns-key').toUpperCase(), name = g('#ns-name'), bidang = g('#ns-bidang'), pic = g('#ns-pic');
      if (!key || !name || !bidang || !pic) return toast('⚠ Seluruh field wajib diisi.', 'error');
      if (appState.masters.satker.some(s => s.key === key || s.name === name)) return toast('⚠ Kode atau nama Satker sudah ada.', 'error');
      appState.masters.satker.push({ key, name, bidang, pic }); audit('Tambah Master Data', 'Satker', '-', `${key} · ${name}`); m.close(); toast('Data berhasil disimpan.'); commit();
    } }] });
};
