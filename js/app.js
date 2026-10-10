/* =========================================================================
   SI-RDK · app.js
   Core: utilities, state + persistence, domain rules, mock API, UI kit
   (toast/modal/confirm/drawer/charts), router, auth, notifications,
   global search, export/print. Page modules register through registerPage().
   ========================================================================= */

/* ---------------------------- Utilities ---------------------------------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const toISO = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const todayISO = () => toISO(new Date());
function addDays(iso, n) { const d = new Date(iso + 'T00:00:00'); d.setDate(d.getDate() + n); return toISO(d); }
function diffDays(a, b) { return Math.round((new Date(a + 'T00:00:00') - new Date(b + 'T00:00:00')) / 864e5); }
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONL = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function fmtDate(iso) { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${d} ${MON[+m - 1]} ${y}`; }
function fmtDateLong(iso) { if (!iso) return '—'; const [y, m, d] = iso.slice(0, 10).split('-'); return `${+d} ${MONL[+m - 1]} ${y}`; }
function fmtDT(ts) { if (!ts) return '—'; const d = new Date(ts); return `${String(d.getDate()).padStart(2, '0')} ${MON[d.getMonth()]} ${d.getFullYear()} ${fmtTime(ts)}`; }
function fmtTime(ts) { const d = new Date(ts); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }
function tsDay(ts) { return toISO(new Date(ts)); }
function relTime(ts) {
  const s = (Date.now() - new Date(ts).getTime()) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return `${Math.floor(s / 60)} menit lalu`;
  if (s < 86400) return `${Math.floor(s / 3600)} jam lalu`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} hari lalu`;
  return fmtDate(tsDay(ts));
}
function fmtSize(b) { if (!b) return '—'; return b > 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.round(b / 1024) + ' KB'; }
const initials = n => String(n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
const firstName = n => String(n || '').split(' ')[0];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const debounce = (fn, ms = 160) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function highlight(text, q) {
  const t = esc(text); if (!q) return t;
  const i = String(text).toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return t;
  return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
}

/* ------------------------------- Icons ----------------------------------- */
const ICONS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  gauge: '<path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/>',
  list: '<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/>',
  bars: '<path d="M3 3v18h18"/><path d="M7 16h8"/><path d="M7 11h12"/><path d="M7 6h4"/>',
  file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><path d="M7 8h8"/><path d="M7 12h10"/><path d="M7 16h6"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14a9 3 0 0 0 18 0V5"/><path d="M3 12a9 3 0 0 0 18 0"/>',
  pencil: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  sliders: '<path d="M4 21v-7"/><path d="M4 10V3"/><path d="M12 21v-9"/><path d="M12 8V3"/><path d="M20 21v-5"/><path d="M20 12V3"/><path d="M1 14h6"/><path d="M9 8h6"/><path d="M17 16h6"/>',
  history: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/>',
  bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  menu: '<path d="M4 6h16"/><path d="M4 12h16"/><path d="M4 18h16"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  chevDown: '<path d="m6 9 6 6 6-6"/>', chevRight: '<path d="m9 18 6-6-6-6"/>', chevLeft: '<path d="m15 18-6-6 6-6"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  upload: '<path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 2.5 8.2"/><path d="M12 12v9"/><path d="m16 16-4-4-4 4"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  printer: '<path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  eye: '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  sparkles: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  alert: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  rerun: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  sheet: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><path d="M14 2v6h6"/><path d="M8 13h2"/><path d="M14 13h2"/><path d="M8 17h2"/><path d="M14 17h2"/>',
  clip: '<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
  checkCircle: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
  xCircle: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/>',
  send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
  activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  sort: '<path d="m21 16-4 4-4-4"/><path d="M17 20V4"/><path d="m3 8 4-4 4 4"/><path d="M7 4v16"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  flag: '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><path d="M4 22v-7"/>',
  target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7Z"/><path d="m2 17 10 5 10-5"/><path d="m2 12 10 5 10-5"/>'
};
const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ''}</svg>`;

/* --------------------------- State & storage ----------------------------- */
const STORAGE_KEY = 'sirdk.state.v1';
const SESSION_KEY = 'sirdk.session.v1';
const appState = { currentUser: null, users: [], masters: {}, documents: [], actionPlans: [], notifications: [], auditLogs: [], grcLog: [], seq: {}, seededAt: null, version: 0 };
const ui = {
  route: 'dashboard', params: {}, drawerPlan: null,
  reg: { q: '', bidang: '', satker: '', status: '', ver: '', assign: '', prog: '', rdkFrom: '', rdkTo: '', targetTo: '', priority: '', strat: '', sort: { key: 'id', dir: 1 }, page: 1, size: 10, showFilters: false },
  docs: { q: '', type: '', status: '', source: '', sort: { key: 'upload_date', dir: -1 } },
  dreg: { q: '', doc: '' },
  upd: { tab: 'action', satker: '' },
  ver: { tab: 'Menunggu Verifikasi', q: '' },
  audit: { q: '', action: '', role: '', from: '', to: '', view: 'timeline', limit: 60 },
  ocr: { doc: null, edit: false, view: 'preview' },
  uploads: [], uploadMeta: { source: 'Rapat Dewan Komisioner', type: 'Risalah RDK' }
};
const charts = {};
let storageOK = true;

function loadState() {
  let raw = null;
  try { raw = localStorage.getItem(STORAGE_KEY); } catch (e) { storageOK = false; }
  let parsed = null;
  if (raw) { try { parsed = JSON.parse(raw); } catch (e) { parsed = null; } }
  if (!parsed || parsed.version !== SEED_VERSION) parsed = buildSeed();
  Object.assign(appState, parsed);
  try {
    const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    const fresh = s && appState.users.find(u => u.username === s.username && u.active);
    if (fresh) appState.currentUser = { ...s, ...fresh };
  } catch (e) { /* no session */ }
  saveState();
}
function saveState() {
  if (!storageOK) return;
  try {
    const { currentUser, ...persist } = appState;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persist));
    if (currentUser) localStorage.setItem(SESSION_KEY, JSON.stringify(currentUser)); else localStorage.removeItem(SESSION_KEY);
  } catch (e) { storageOK = false; }
}
function resetDemo() {
  const user = appState.currentUser;
  Object.assign(appState, buildSeed());
  const fresh = user && appState.users.find(u => u.username === user.username);
  appState.currentUser = fresh ? { ...user, ...fresh } : user;
  ui.uploads = []; ui.ocr.doc = null;
  scanOverdue();
  saveState();
}
const cu = () => appState.currentUser || {};

/* ---------------------------- Domain rules ------------------------------- */
const EXEC_STATUSES = ['Belum Mulai', 'Dalam Proses', 'Menunggu Arahan', 'Selesai', 'Terlambat'];
const VER_STATUSES = ['Belum Diverifikasi', 'Menunggu Verifikasi', 'Disetujui', 'Ditolak', 'Perlu Perbaikan'];
const ASSIGN_STATUSES = ['Sudah Ditugaskan', 'Belum Ditugaskan'];
const PRIORITIES = ['Tinggi', 'Sedang', 'Rendah'];
const STATUS_COLOR = { 'Selesai': '#2EAD6B', 'Dalam Proses': '#2986B8', 'Menunggu Arahan': '#F5A623', 'Belum Mulai': '#A7B4C1', 'Terlambat': '#D9534F' };
const BADGE_CLASS = {
  'Belum Mulai': 'b-grey', 'Dalam Proses': 'b-blue', 'Menunggu Arahan': 'b-amber', 'Selesai': 'b-green', 'Terlambat': 'b-red',
  'Belum Diverifikasi': 'b-outline', 'Menunggu Verifikasi': 'b-amber', 'Disetujui': 'b-green', 'Ditolak': 'b-red', 'Perlu Perbaikan': 'b-violet',
  'Sudah Ditugaskan': 'b-teal', 'Belum Ditugaskan': 'b-outline',
  'Belum Diproses': 'b-grey', 'Sedang Diproses': 'b-blue', 'Perlu Review': 'b-amber', 'Tersimpan di Register': 'b-teal', 'Belum Diekstraksi': 'b-grey', 'Diunggah': 'b-grey', 'Draft': 'b-outline', 'Aktif': 'b-green', 'Nonaktif': 'b-outline'
};
const badge = (text, extra = '') => `<span class="badge ${BADGE_CLASS[text] || 'b-grey'} ${extra}">${esc(text)}</span>`;

/** Status Pelaksanaan — rules §16 / §31: 100% → Selesai; target lewat & <100% → Terlambat; 0% → Belum Mulai; else Dalam Proses. */
function baseStatus(ap) {
  if (ap.progress >= 100) return 'Selesai';
  if (ap.manualStatus === 'Menunggu Arahan') return 'Menunggu Arahan';
  if (ap.progress <= 0) return 'Belum Mulai';
  return 'Dalam Proses';
}
function execStatus(ap) {
  if (ap.progress >= 100) return 'Selesai';
  if (ap.targetDate && ap.targetDate < todayISO()) return 'Terlambat';
  return baseStatus(ap);
}
const assignStatus = ap => ap.satker ? 'Sudah Ditugaskan' : 'Belum Ditugaskan';
const daysToTarget = ap => ap.targetDate ? diffDays(ap.targetDate, todayISO()) : null;
function pbar(ap) {
  const st = execStatus(ap);
  const cls = st === 'Selesai' ? 'done' : st === 'Terlambat' ? 'late' : st === 'Menunggu Arahan' ? 'hold' : '';
  return `<div class="pbar"><div class="track"><div class="fill ${cls}" style="width:${ap.progress}%"></div></div><span class="val">${ap.progress}%</span></div>`;
}
function targetCell(ap) {
  const d = daysToTarget(ap); const st = execStatus(ap);
  let hint = '';
  if (st === 'Selesai') hint = '';
  else if (d < 0) hint = `<div class="small" style="color:var(--danger-ink)">lewat ${-d} hari</div>`;
  else if (d <= 14) hint = `<div class="small" style="color:var(--warn-ink)">${d === 0 ? 'hari ini' : d + ' hari lagi'}</div>`;
  return `<span class="nowrap tnum">${fmtDate(ap.targetDate)}</span>${hint}`;
}

const isRole = (...r) => r.includes(cu().role);
function visiblePlans() { const u = cu(); return u.role === 'satker' ? appState.actionPlans.filter(a => a.satker === u.satker) : appState.actionPlans; }
const findPlan = id => appState.actionPlans.find(a => a.id === id);
const findDoc = id => appState.documents.find(d => d.document_id === id);
const satkerInfo = name => appState.masters.satker.find(s => s.name === name);

/** Business rule §31.1 / §31.4 / §31.5 — may the current user submit an update for this plan? */
function updateLock(ap) {
  const u = cu();
  if (u.role !== 'satker') return u.role === 'viewer' ? 'Mode baca saja' : 'Update dilakukan oleh Satker';
  if (ap.satker !== u.satker) return 'Bukan tanggung jawab Satker Anda';
  if (ap.verificationStatus === 'Menunggu Verifikasi') return 'Menunggu Verifikasi';
  if (ap.progress >= 100 && ap.verificationStatus === 'Disetujui') return 'Selesai & Disetujui';
  return null;
}
const canUpdate = ap => updateLock(ap) === null;

function computeKpis(plans = visiblePlans()) {
  const k = { total: plans.length, belum: 0, proses: 0, arahan: 0, selesai: 0, terlambat: 0, mv: 0, perbaikan: 0, ditolak: 0, disetujui: 0, unassigned: 0, avg: 0, rate: 0 };
  let sum = 0;
  plans.forEach(a => {
    const s = execStatus(a);
    if (s === 'Belum Mulai') k.belum++; else if (s === 'Dalam Proses') k.proses++; else if (s === 'Menunggu Arahan') k.arahan++; else if (s === 'Selesai') k.selesai++; else if (s === 'Terlambat') k.terlambat++;
    if (a.verificationStatus === 'Menunggu Verifikasi') k.mv++;
    if (a.verificationStatus === 'Perlu Perbaikan') k.perbaikan++;
    if (a.verificationStatus === 'Ditolak') k.ditolak++;
    if (a.verificationStatus === 'Disetujui') k.disetujui++;
    if (!a.satker) k.unassigned++;
    sum += a.progress;
  });
  k.avg = plans.length ? Math.round(sum / plans.length) : 0;
  k.rate = plans.length ? Math.round(k.selesai / plans.length * 100) : 0;
  k.docs = cu().role === 'satker' ? new Set(plans.map(p => p.documentId)).size : appState.documents.length;
  k.sessions = new Set(plans.map(p => p.rdkDate + '|' + p.topic)).size;
  return k;
}

/* --------------------------- Audit & notify ------------------------------ */
function audit(action, entity, oldValue, newValue, comment = '', who) {
  const u = who || cu();
  appState.seq.log = (appState.seq.log || 0) + 1;
  appState.auditLogs.push({
    id: 'LOG-' + String(appState.seq.log).padStart(5, '0'), ts: new Date().toISOString(),
    user: u.name || 'Sistem', role: u.role || 'system', action, entity, oldValue: oldValue ?? '-', newValue: newValue ?? '-', comment
  });
}
function notify(to, text, kind, link) {
  appState.seq.notif = (appState.seq.notif || 0) + 1;
  appState.notifications.unshift({ id: 'N' + appState.seq.notif, to, text, kind, link, at: new Date().toISOString(), readBy: [] });
}
function notifsForUser() {
  const u = cu(); if (!u.username) return [];
  return appState.notifications.filter(n => n.to.includes('all') || n.to.includes(u.role) || (u.role === 'satker' && n.to.includes('satker:' + u.satker)));
}
const unreadCount = () => notifsForUser().filter(n => !n.readBy.includes(cu().username)).length;

/** Business rule §31.8: overdue plans flip to "Terlambat" automatically; record it once with a system log + notification. */
function scanOverdue() {
  let changed = false;
  appState.actionPlans.forEach(ap => {
    if (execStatus(ap) === 'Terlambat' && !ap.overdueNotified) {
      ap.overdueNotified = true; changed = true;
      audit('Status Otomatis', ap.id, baseStatus(ap), 'Terlambat', `Target ${fmtDate(ap.targetDate)} terlewati dengan progress ${ap.progress}%`, { name: 'Sistem', role: 'system' });
      const to = ['admin', 'viewer']; if (ap.satker) to.push('satker:' + ap.satker);
      notify(to, `${ap.id} telah melewati target penyelesaian (${fmtDate(ap.targetDate)}).`, 'late', { type: 'plan', id: ap.id });
    }
    if (execStatus(ap) !== 'Terlambat' && ap.overdueNotified && ap.progress < 100 && ap.targetDate >= todayISO()) ap.overdueNotified = false;
  });
  return changed;
}

/* -------------------------------------------------------------------------
   Mock API. Each method mirrors an endpoint a backend would expose; swap
   the bodies for fetch() calls without touching the UI code.
   ------------------------------------------------------------------------- */
const api = {
  /** POST /api/documents  (multipart upload) */
  async uploadDocument(file, meta, onProgress) {
    await tick(900, onProgress);
    appState.seq.doc += 1;
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    return {
      document_id: `DOC-2026-${String(appState.seq.doc).padStart(3, '0')}`,
      document_name: file.name, document_type: meta.type, source: meta.source, document_number: meta.number || '—',
      document_date: meta.date || todayISO(), upload_date: new Date().toISOString(), uploaded_by: cu().name,
      file_size: file.size || 0, pages: Math.max(2, Math.min(18, Math.round((file.size || 400000) / 120000))), ext,
      document_status: 'Diunggah', ocr_status: 'Belum Diproses', extraction_status: 'Belum Diekstraksi',
      template: guessTemplate(file.name), topic: '', ocr_accuracy: null, extraction: null, saved_plan_ids: []
    };
  },
  /** POST /api/documents/:id/ocr */
  async runOCR(doc, onProgress) { await tick(1500, onProgress); return { accuracy: +(95.5 + Math.random() * 3.6).toFixed(1), pages: doc.pages }; },
  /** POST /api/documents/:id/extract-text */
  async extractText(doc, onProgress) { await tick(900, onProgress); return { paragraphs: 12 + doc.pages * 3 }; },
  /** POST /api/documents/:id/structure  (LLM → JSON schema of arahan) */
  async structureWithLLM(doc, onProgress) {
    await tick(1300, onProgress);
    const tpl = EXTRACTION_LIBRARY[doc.template] || EXTRACTION_LIBRARY.default;
    const rdk = tpl.rdkDate || doc.document_date || todayISO();
    const minTarget = addDays(todayISO(), 30);
    return tpl.items.map((it, i) => {
      const sat = it.satker ? satkerInfo(it.satker) : null;
      let target = addDays(rdk, it.days); if (target < minTarget) target = addDays(minTarget, i * 15);
      return {
        include: true, rdkDate: rdk, topic: tpl.topic, arahan: it.arahan, bidang: sat ? sat.bidang : (it.bidang || ''), satker: sat ? sat.name : '',
        assignmentStatus: sat ? 'Sudah Ditugaskan' : 'Belum Ditugaskan', respon: 'Belum ada respon', completedDate: '', tindakLanjut: it.tindakLanjut,
        priority: it.priority, targetDate: target, conf: confidences(doc.document_id + i + Date.now())
      };
    });
  }
};
function tick(ms, onProgress) {
  return new Promise(res => {
    const start = performance.now();
    const step = () => {
      const p = Math.min(1, (performance.now() - start) / ms);
      onProgress && onProgress(p);
      if (p >= 1) res(); else setTimeout(step, 90);
    };
    step();
  });
}
function guessTemplate(name) {
  const n = name.toLowerCase();
  if (/asurans|polis|ppdp/.test(n)) return 'asuransi';
  if (/bank|perbankan|digital/.test(n)) return 'bank';
  return 'default';
}

/* ------------------------------ Toasts ----------------------------------- */
function toast(msg, type = 'success') {
  const root = $('#toast-root'); if (!root) return;
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  const ic = type === 'error' ? 'alert' : type === 'warn' ? 'alert' : type === 'info' ? 'info' : 'check';
  el.innerHTML = `<span class="ti">${icon(ic, 'sm')}</span><span>${esc(msg)}</span>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 220); }, type === 'error' ? 4200 : 3200);
}

/* ------------------------------ Modals ----------------------------------- */
const modalStack = [];
function openModal({ title, sub = '', body = '', size = '', foot = [], onMount, dismissible = true, onClose }) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
    <div class="modal-head"><div><h3>${esc(title)}</h3>${sub ? `<div class="sub">${sub}</div>` : ''}</div>
      ${dismissible ? `<button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button>` : ''}</div>
    <div class="modal-body">${body}</div>
    ${foot.length ? `<div class="modal-foot">${foot.map((b, i) => `<button type="button" class="btn ${b.cls || ''} ${b.left ? 'left' : ''}" data-fi="${i}" ${b.id ? `id="${b.id}"` : ''}>${b.icon ? icon(b.icon) : ''}${esc(b.label)}</button>`).join('')}</div>` : ''}
  </div>`;
  $('#modal-root').appendChild(ov);
  const m = { el: ov, close: () => { ov.remove(); const i = modalStack.indexOf(m); if (i >= 0) modalStack.splice(i, 1); onClose && onClose(); } };
  modalStack.push(m);
  ov.addEventListener('click', e => {
    if (e.target === ov && dismissible) m.close();
    if (e.target.closest('[data-close]')) m.close();
    const fb = e.target.closest('[data-fi]');
    if (fb && fb.closest('.overlay') === ov) { const b = foot[+fb.dataset.fi]; b.onClick ? b.onClick(m) : m.close(); }
  });
  onMount && onMount(ov.querySelector('.modal'), m);
  const first = ov.querySelector('.modal-body input:not([type=hidden]):not([type=range]), .modal-body textarea, .modal-body select');
  if (first && !('ontouchstart' in window)) setTimeout(() => first.focus(), 30);
  return m;
}
/** Confirmation dialog for important actions (§30). Optional mandatory note. */
function confirmDialog({ title, message, confirmLabel = 'Ya, lanjutkan', tone = 'primary', note = null, onConfirm }) {
  const body = `<p style="color:var(--ink-2)">${message}</p>${note ? `<div class="field" style="margin-top:14px"><label for="cf-note">${esc(note.label)}${note.required ? ' <span class="req">*</span>' : ''}</label><textarea class="textarea" id="cf-note" placeholder="${esc(note.placeholder || '')}">${esc(note.value || '')}</textarea></div>` : ''}`;
  return openModal({
    title, body, size: 'sm', foot: [
      { label: 'Batal', cls: 'ghost' },
      { label: confirmLabel, cls: tone, onClick: m => {
        const t = m.el.querySelector('#cf-note'); const v = t ? t.value.trim() : '';
        if (note && note.required && !v) { t.classList.add('invalid'); toast(note.error || 'Catatan wajib diisi.', 'error'); t.focus(); return; }
        m.close(); onConfirm && onConfirm(v);
      } }
    ]
  });
}
function closeTopLayer() {
  if (modalStack.length) { modalStack[modalStack.length - 1].close(); return true; }
  if (ui.drawerPlan) { closeDrawer(); return true; }
  return false;
}

/* ------------------------------ Drawer ----------------------------------- */
function openDrawer(planId) {
  if (!findPlan(planId)) { toast('Rencana aksi tidak ditemukan.', 'error'); return; }
  ui.drawerPlan = planId;
  renderDrawer();
}
function closeDrawer() { ui.drawerPlan = null; $('#drawer-root').innerHTML = ''; }
function renderDrawer() {
  const root = $('#drawer-root');
  if (!ui.drawerPlan) { root.innerHTML = ''; return; }
  const ap = findPlan(ui.drawerPlan);
  if (!ap) { closeDrawer(); return; }
  const scrollTop = $('.drawer-body', root)?.scrollTop || 0;
  root.innerHTML = `<div class="drawer-overlay" data-act="closeDrawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Detail ${esc(ap.id)}">${renderPlanDetail(ap)}</aside>`;
  const b = $('.drawer-body', root); if (b) b.scrollTop = scrollTop;
}

/* ------------------------------ Charts ----------------------------------- */
function mkChart(id, cfg) {
  const el = document.getElementById(id);
  if (!el) return null;
  if (typeof Chart === 'undefined') {
    el.parentElement.insertAdjacentHTML('beforeend', '<div class="chart-fallback">Grafik membutuhkan Chart.js dari CDN. Periksa koneksi internet lalu muat ulang.</div>');
    return null;
  }
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(el, cfg);
  return charts[id];
}
function destroyCharts() { Object.keys(charts).forEach(k => { try { charts[k].destroy(); } catch (e) { } delete charts[k]; }); }
function setupChartDefaults() {
  if (typeof Chart === 'undefined') return;
  Chart.defaults.font.family = "'Inter', Arial, sans-serif";
  Chart.defaults.font.size = 11;
  Chart.defaults.color = '#4A5B6C';
  Chart.defaults.borderColor = '#E9EEF3';
  Chart.defaults.plugins.legend.display = false;
  Chart.defaults.plugins.tooltip.backgroundColor = '#1A2939';
  Chart.defaults.plugins.tooltip.padding = 10;
  Chart.defaults.plugins.tooltip.cornerRadius = 6;
  Chart.defaults.plugins.tooltip.titleFont = { weight: '600', size: 12 };
  Chart.defaults.maintainAspectRatio = false;
  Chart.defaults.animation.duration = 450;
}
const wrapLabel = (s, n = 22) => { const w = String(s).split(' '); const out = []; let line = ''; w.forEach(x => { if ((line + ' ' + x).trim().length > n) { out.push(line.trim()); line = x; } else line += ' ' + x; }); if (line.trim()) out.push(line.trim()); return out; };

/* ------------------------------ Router ----------------------------------- */
const Pages = {};
function registerPage(id, def) { Pages[id] = def; }
const PAGE_ACCESS = {
  dashboard: ['admin', 'satker', 'viewer'], executive: ['admin', 'viewer'], register: ['admin', 'satker', 'viewer'], satker: ['admin', 'viewer'],
  documents: ['admin', 'viewer'], ocr: ['admin', 'viewer'], dataregister: ['admin', 'viewer'], update: ['admin', 'satker'],
  verification: ['admin'], grc: ['admin', 'viewer', 'satker'], users: ['admin'], master: ['admin'], audit: ['admin']
};
const canSee = r => (PAGE_ACCESS[r] || []).includes(cu().role);
const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { group: 'Monitoring', items: [{ id: 'executive', label: 'Executive Dashboard', icon: 'gauge' }, { id: 'register', label: 'Rencana Aksi', icon: 'list' }, { id: 'satker', label: 'Progress Satker', icon: 'bars' }] },
  { group: 'Dokumen', items: [{ id: 'documents', label: 'Dokumen Rujukan', icon: 'file' }, { id: 'ocr', label: 'OCR & Extraction', icon: 'scan' }, { id: 'dataregister', label: 'Register', icon: 'database' }] },
  { group: 'Pelaksanaan', items: [{ id: 'update', label: 'Update Satker', icon: 'pencil' }] },
  { group: 'Verifikasi', items: [{ id: 'verification', label: 'Verifikasi Admin', icon: 'shield' }] },
  { group: 'Integrasi', items: [{ id: 'grc', label: 'Integrasi SI-GRC', icon: 'layers' }] },
  { group: 'Administration', items: [{ id: 'users', label: 'User', icon: 'users' }, { id: 'master', label: 'Master Data', icon: 'sliders' }, { id: 'audit', label: 'Audit Trail', icon: 'history' }] }
];
function navBadge(id) {
  const k = computeKpis();
  if (id === 'verification') return k.mv ? `<span class="nb hot">${k.mv}</span>` : '';
  if (id === 'update' && isRole('satker')) { const n = visiblePlans().filter(a => canUpdate(a) && (a.verificationStatus === 'Perlu Perbaikan' || a.verificationStatus === 'Ditolak' || execStatus(a) === 'Terlambat' || a.progress === 0)).length; return n ? `<span class="nb hot">${n}</span>` : ''; }
  if (id === 'documents') { const n = appState.documents.filter(d => d.ocr_status !== 'Selesai').length; return n ? `<span class="nb">${n}</span>` : ''; }
  if (id === 'ocr') { const n = appState.documents.filter(d => d.extraction_status === 'Perlu Review').length; return n ? `<span class="nb hot">${n}</span>` : ''; }
  if (id === 'grc') { const n = grcTodo().length; return n ? `<span class="nb hot">${n}</span>` : ''; }
  if (id === 'register') return `<span class="nb">${visiblePlans().length}</span>`;
  return '';
}
function renderNav() {
  const item = it => canSee(it.id) ? `<a class="nav-item ${it.group ? '' : ''} ${ui.route === it.id ? 'active' : ''}" href="#${it.id}" data-act="go" data-route="${it.id}" title="${esc(it.label)}">${icon(it.icon, 'lg')}<span>${esc(it.label)}</span>${navBadge(it.id)}</a>` : '';
  $('#sidenav').innerHTML = NAV.map(n => {
    if (!n.group) return item(n);
    const inner = n.items.map(item).join('');
    return inner ? `<div class="nav-group">${esc(n.group)}</div>${inner}` : '';
  }).join('');
  $('#sidebar-foot').innerHTML = `<div><span class="sys-dot"></span><b>Sistem aktif</b></div><div style="margin-top:4px">Mode prototipe · data tersimpan di browser${storageOK ? '' : ' (penyimpanan lokal tidak tersedia)'}</div>`;
  const u = cu();
  const bn = [{ id: 'dashboard', label: 'Dashboard', icon: 'dashboard' }, { id: 'register', label: 'Rencana Aksi', icon: 'list' }];
  if (u.role === 'satker') bn.push({ id: 'update', label: 'Update', icon: 'pencil' });
  if (u.role === 'admin') bn.push({ id: 'documents', label: 'Dokumen', icon: 'file' }, { id: 'verification', label: 'Verifikasi', icon: 'shield' });
  if (u.role === 'viewer') bn.push({ id: 'executive', label: 'Eksekutif', icon: 'gauge' });
  if (u.role === 'satker') bn.push({ id: 'grc', label: 'SI-GRC', icon: 'layers' });
  $('#bottomnav').innerHTML = bn.map(b => {
    const nb = navBadge(b.id).replace('class="nb hot"', 'class="nb"');
    return `<button class="bn ${ui.route === b.id ? 'on' : ''}" data-act="go" data-route="${b.id}">${icon(b.icon)}<span>${esc(b.label)}</span>${b.id === 'register' ? '' : nb}</button>`;
  }).join('') + `<button class="bn" data-act="toggleSidebar">${icon('menu')}<span>Menu</span></button>`;
}
function go(route, params = {}) {
  ui.route = route; ui.params = params;
  if (location.hash.slice(1) !== route) { ui.skipHash = true; try { location.hash = route; } catch (e) { ui.skipHash = false; } }
  closeDropdowns(); setSidebar(false);
  renderPage();
}
function renderPage(keepScroll = false) {
  if (!appState.currentUser) return;
  if (!Pages[ui.route]) ui.route = 'dashboard';
  const y = window.scrollY;
  destroyCharts();
  const main = $('#main');
  if (!canSee(ui.route)) {
    main.innerHTML = `<div class="page"><div class="panel"><div class="locked"><div class="ic">${icon('lock', 'lg')}</div><b style="color:var(--ink-2)">Akses dibatasi</b><span>Halaman ini tidak tersedia untuk peran ${esc(ROLE_LABEL[cu().role])}.</span><button class="btn primary" data-act="go" data-route="dashboard">Kembali ke Dashboard</button></div></div></div>`;
  } else {
    main.innerHTML = Pages[ui.route].render(ui.params || {});
    Pages[ui.route].mount && Pages[ui.route].mount(ui.params || {});
  }
  renderNav();
  window.scrollTo(0, keepScroll ? y : 0);
}
/** Apply a state change: persist → chrome → page → open drawer. */
function commit() {
  scanOverdue();
  saveState();
  renderChrome();
  renderPage(true);
  if (ui.drawerPlan) renderDrawer();
}

/* ------------------------------ Chrome ----------------------------------- */
function renderChrome() {
  const u = cu();
  $('#avatar').textContent = initials(u.name);
  $('#avatar').className = 'avatar ' + u.role;
  $('#profile-name').textContent = u.name;
  $('#profile-role').textContent = ROLE_LABEL[u.role] + (u.satker ? ' · ' + satkerShort(u.satker) : '');
  const c = unreadCount(); const el = $('#notif-count');
  el.hidden = !c; el.textContent = c > 9 ? '9+' : c;
  if (!$('#notif-panel').hidden) renderNotifPanel();
}
const satkerShort = name => (satkerInfo(name)?.key) || name;
function setSidebar(open) {
  const app = $('#app');
  const narrow = window.matchMedia('(max-width: 1100px)').matches;
  if (narrow) { app.classList.toggle('expanded', open); $('#scrim').hidden = !open; }
  else if (open === false) { /* desktop keeps its collapsed state */ }
}
function closeDropdowns(except) {
  ['#notif-panel', '#profile-menu', '#gsearch-results'].forEach(s => { if (s !== except && $(s)) $(s).hidden = true; });
}
function renderNotifPanel() {
  const list = notifsForUser().slice(0, 40);
  const uname = cu().username;
  const icMap = { warn: 'clock', late: 'alert', ok: 'checkCircle', info: 'info' };
  $('#notif-panel').innerHTML = `<div class="dd-head"><span>Notifikasi (${unreadCount()} belum dibaca)</span>${list.length ? '<button class="link-btn small" data-act="markAllRead">Tandai semua dibaca</button>' : ''}</div>
    <div class="notif-list">${list.length ? list.map(n => `<button class="notif ${n.readBy.includes(uname) ? '' : 'unread'}" data-act="openNotif" data-id="${n.id}">
      <span class="ic ${n.kind}">${icon(icMap[n.kind] || 'info', 'sm')}</span><span><div class="txt">${esc(n.text)}</div><div class="when">${relTime(n.at)}</div></span></button>`).join('') : '<div class="dd-empty">Belum ada notifikasi.</div>'}</div>`;
}
function renderProfileMenu() {
  const u = cu();
  $('#profile-menu').innerHTML = `<div class="pm-head"><b>${esc(u.name)}</b><span>${esc(u.title || '')}</span><div style="margin-top:8px">${badge(ROLE_LABEL[u.role], 'plain')}</div>${u.satker ? `<div class="small muted" style="margin-top:6px">${esc(u.satker)}</div>` : ''}</div>
    <button class="menu-item" data-act="switchRole">${icon('users')}Masuk sebagai peran lain</button>
    ${u.role === 'admin' ? `<button class="menu-item" data-act="resetDemo">${icon('rerun')}Reset data demo</button>` : ''}
    <button class="menu-item danger" data-act="logout">${icon('logout')}Keluar</button>`;
}

/* --------------------------- Global search ------------------------------- */
let searchIdx = -1;
function runGlobalSearch(q) {
  const box = $('#gsearch-results');
  q = q.trim();
  if (q.length < 2) { box.hidden = true; return; }
  const ql = q.toLowerCase();
  const plans = visiblePlans().filter(a => [a.id, a.topic, a.arahan, a.satker, a.bidang, a.pic].some(v => String(v || '').toLowerCase().includes(ql))).slice(0, 7);
  const docs = canSee('documents') ? appState.documents.filter(d => [d.document_id, d.document_name, d.source, d.document_type, d.document_number].some(v => String(v || '').toLowerCase().includes(ql))).slice(0, 5) : [];
  const sats = appState.masters.satker.filter(s => (cu().role !== 'satker' || s.name === cu().satker) && [s.name, s.bidang, s.key].some(v => v.toLowerCase().includes(ql))).slice(0, 3);
  let html = '';
  if (plans.length) html += `<div class="dd-head">Rencana aksi</div>` + plans.map(a => `<button class="dd-item" data-act="searchPick" data-kind="plan" data-id="${a.id}">${icon('list')}<span style="min-width:0"><div class="t"><span class="mono">${highlight(a.id, q)}</span> · ${highlight(a.topic, q)}</div><div class="s clamp-1">${highlight(a.arahan, q)}</div><div class="s">${highlight(a.satker || 'Belum ditugaskan', q)}</div></span></button>`).join('');
  if (sats.length) html += `<div class="dd-head">Satker / Bidang</div>` + sats.map(s => `<button class="dd-item" data-act="searchPick" data-kind="satker" data-id="${esc(s.name)}">${icon('building')}<span><div class="t">${highlight(s.name, q)}</div><div class="s">${highlight(s.bidang, q)}</div></span></button>`).join('');
  if (docs.length) html += `<div class="dd-head">Dokumen</div>` + docs.map(d => `<button class="dd-item" data-act="searchPick" data-kind="doc" data-id="${d.document_id}">${icon('file')}<span style="min-width:0"><div class="t clamp-1">${highlight(d.document_name, q)}</div><div class="s">${d.document_id} · ${esc(d.source)}</div></span></button>`).join('');
  box.innerHTML = html || `<div class="dd-empty">Tidak ada hasil untuk “${esc(q)}”.</div>`;
  box.hidden = false; searchIdx = -1;
}

/* --------------------------- Export & print ------------------------------ */
async function saveFile(filename, blob) {
  try {
    if (window.claude && typeof window.claude.use === 'function') {
      const dl = await window.claude.use('downloads');
      if (dl) { await dl.save({ filename, data: blob }); return true; }
    }
  } catch (err) {
    if (err && err.code === 'declined') { toast('Unduhan dibatalkan.', 'info'); return false; }
    if (err && err.code === 'rate_limited') { toast('Konfirmasi unduhan sebelumnya masih terbuka.', 'warn'); return false; }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    return true;
  } catch (e) { toast('Browser menolak unduhan.', 'error'); return false; }
}
async function exportData({ name, sheet = 'Data', columns, rows, format }) {
  if (!rows.length) { toast('Tidak ada data untuk diekspor dengan filter saat ini.', 'warn'); return; }
  const stamp = todayISO().replace(/-/g, '');
  const header = columns.map(c => c.label);
  const body = rows.map(r => columns.map(c => { const v = c.get(r); return v == null ? '' : v; }));
  let ok = false;
  if (format === 'xlsx') {
    if (typeof XLSX === 'undefined') { toast('Library SheetJS belum termuat. Gunakan Export CSV.', 'error'); return; }
    const ws = XLSX.utils.aoa_to_sheet([header, ...body]);
    ws['!cols'] = columns.map(c => ({ wch: c.w || 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 31));
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    ok = await saveFile(`${name}_${stamp}.xlsx`, new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  } else {
    const q = v => { const s = String(v).replace(/"/g, '""'); return /[",\n;]/.test(s) ? `"${s}"` : s; };
    const csv = '﻿' + [header, ...body].map(r => r.map(q).join(',')).join('\r\n');
    ok = await saveFile(`${name}_${stamp}.csv`, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  }
  if (ok) { audit('Export Data', name, '-', `${format.toUpperCase()} · ${rows.length} baris`); saveState(); toast(`Export ${format.toUpperCase()} berhasil (${rows.length} baris).`); }
}
function reportHTML({ title, subtitle, columns, rows }) {
  return `<div class="report"><div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #233548;padding-bottom:8px">
    <div><div style="font-size:11px;letter-spacing:.08em;color:#555">OTORITAS JASA KEUANGAN · SI-RDK Terintegrasi</div><h2>${esc(title)}</h2><div style="font-size:11px;color:#555">${esc(subtitle || '')}</div></div>
    <div style="font-size:10.5px;color:#555;text-align:right">Dicetak: ${fmtDT(new Date().toISOString())}<br>Oleh: ${esc(cu().name)} (${esc(ROLE_LABEL[cu().role])})</div></div>
    <table><thead><tr>${columns.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${columns.map(c => `<td>${esc(c.get(r) ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div style="font-size:10px;color:#777;margin-top:10px">${rows.length} baris · Dokumen dihasilkan oleh prototipe SI-RDK Terintegrasi.</div></div>`;
}
function printReport(opts) {
  if (!opts.rows.length) { toast('Tidak ada data untuk dicetak.', 'warn'); return; }
  const html = reportHTML(opts);
  const embedded = window.self !== window.top;
  openModal({
    title: 'Pratinjau Cetak', sub: esc(opts.title), size: 'xl',
    body: `${embedded ? `<div class="ai-banner" style="margin-bottom:12px">${icon('info')}<span>Tampilan ini berjalan di dalam bingkai yang tidak mengizinkan dialog cetak. Unduh versi cetak, buka di browser, dan dialog cetak akan muncul otomatis.</span></div>` : ''}<div class="print-preview">${html}</div>`,
    foot: [
      { label: 'Tutup', cls: 'ghost' },
      embedded
        ? { label: 'Unduh versi cetak (.html)', cls: 'primary', icon: 'download', onClick: async m => {
            const doc = `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(opts.title)}</title><style>body{font-family:Arial,sans-serif;margin:24px;color:#111}h2{margin:2px 0}table{width:100%;border-collapse:collapse;font-size:11px;margin-top:12px}th,td{border:1px solid #bbb;padding:4px 6px;text-align:left;vertical-align:top}th{background:#EEF2F5}@page{size:landscape;margin:12mm}</style></head><body>${html}<script>window.onload=function(){window.print()}<\/script></body></html>`;
            if (await saveFile(`${opts.name || 'laporan'}_${todayISO().replace(/-/g, '')}.html`, new Blob([doc], { type: 'text/html' }))) { audit('Cetak Laporan', opts.name || opts.title, '-', `${opts.rows.length} baris`); saveState(); toast('Versi cetak berhasil diunduh.'); m.close(); }
          } }
        : { label: 'Cetak', cls: 'primary', icon: 'printer', onClick: m => {
            $('#print-root').innerHTML = html; audit('Cetak Laporan', opts.name || opts.title, '-', `${opts.rows.length} baris`); saveState();
            m.close(); setTimeout(() => window.print(), 50);
          } }
    ]
  });
}
/** Shared toolbar buttons: Export Excel / Export CSV / Print */
const exportButtons = key => `<div class="btn-group">
  <button class="btn sm" data-act="export" data-key="${key}" data-fmt="xlsx">${icon('sheet')}Export Excel</button>
  <button class="btn sm" data-act="export" data-key="${key}" data-fmt="csv">${icon('download')}Export CSV</button>
  <button class="btn sm" data-act="export" data-key="${key}" data-fmt="print">${icon('printer')}Print</button></div>`;
const Exporters = {};
function runExport(key, fmt) {
  const ex = Exporters[key]; if (!ex) return;
  const def = ex();
  if (fmt === 'print') printReport(def); else exportData({ ...def, format: fmt });
}

/* ------------------------------- Auth ------------------------------------ */
function renderLogin(err = '', prefill = {}) {
  const v = $('#login-view');
  v.innerHTML = `<div class="login">
    <section class="login-side">
      <div>
        <div><span style="display:inline-block;background:#fff;border-radius:10px;padding:8px 12px"><img class="logo-img " src="assets/logo-ojk.png?v=9" alt="Otoritas Jasa Keuangan" style="height:44px"></span></div>
        <h1 style="margin-top:34px">SI-RDK Terintegrasi</h1>
      </div>
      <p class="login-tagline">Membangun OJK yang Responsif dan Akuntabel</p>
      <div style="font-size:11.5px;color:#7F95AA">Prototipe untuk demonstrasi. Autentikasi, OCR, dan LLM disimulasikan.</div>
    </section>
    <section class="login-main">
      <form class="login-card" id="login-form" novalidate>
        <div><img class="logo-img " src="assets/logo-ojk.png?v=9" alt="Otoritas Jasa Keuangan" style="height:44px;display:block"><div style="margin-top:14px"><h2>Masuk ke SI-RDK Terintegrasi</h2><div class="small muted">Sistem Informasi Rapat Dewan Komisioner Dashboard Pemantauan Strategis</div></div></div>
        ${err ? `<div class="login-err" role="alert">${esc(err)}</div>` : ''}
        <div class="field"><label for="lg-user">Username</label><input class="input" id="lg-user" autocomplete="username" value="${esc(prefill.username || '')}" placeholder="mis. admin"></div>
        <div class="field"><label for="lg-pass">Password</label><input class="input" id="lg-pass" type="password" autocomplete="current-password" value="${esc(prefill.password || '')}" placeholder="••••••••"></div>
        <div class="field"><label for="lg-role">Role</label><select class="select" id="lg-role">
          <option value="">Sesuai akun</option>${Object.entries(ROLE_LABEL).map(([k, l]) => `<option value="${k}" ${prefill.role === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
        <button class="btn primary" type="submit" style="height:40px">Masuk</button>
        <div><div class="section-label" style="margin-bottom:8px">Akun demo — klik untuk mengisi</div>
          <div class="demo-accounts">
            <button type="button" class="demo-acc" data-demo="admin|admin123|admin"><b>Admin MRDK</b><span>admin</span></button>
            <button type="button" class="demo-acc" data-demo="satker|satker123|satker"><b>Satker</b><span>satker</span></button>
            <button type="button" class="demo-acc" data-demo="viewer|viewer123|viewer"><b>Pimpinan</b><span>viewer</span></button>
          </div></div>
      </form>
    </section></div>`;
  v.hidden = false; $('#app').hidden = true;
  $('#login-form').addEventListener('submit', e => { e.preventDefault(); doLogin($('#lg-user').value.trim(), $('#lg-pass').value, $('#lg-role').value); });
  $$('.demo-acc', v).forEach(b => b.addEventListener('click', () => {
    const [u, p, r] = b.dataset.demo.split('|');
    $('#lg-user').value = u; $('#lg-pass').value = p; $('#lg-role').value = r;
    $('#login-form .btn.primary').focus();
  }));
}
function doLogin(username, password, role) {
  if (!username || !password) { renderLogin('Username dan password wajib diisi.', { username, role }); return; }
  const u = appState.users.find(x => x.username.toLowerCase() === username.toLowerCase());
  if (!u || u.password !== password) { renderLogin('Username atau password salah.', { username, role }); return; }
  if (!u.active) { renderLogin('Akun ini dinonaktifkan. Hubungi Admin MRDK.', { username, role }); return; }
  if (role && role !== u.role) { renderLogin(`Akun "${u.username}" terdaftar sebagai ${ROLE_LABEL[u.role]}, bukan ${ROLE_LABEL[role]}.`, { username, role }); return; }
  appState.currentUser = { username: u.username, name: u.name, role: u.role, satker: u.satker, title: u.title };
  audit('Login', 'Sesi', '-', ROLE_LABEL[u.role]);
  scanOverdue(); saveState();
  showApp();
  go('dashboard');
  toast(`Selamat datang, ${firstName(u.name)}.`, 'info');
}
function logout(silent) {
  if (appState.currentUser) audit('Logout', 'Sesi', ROLE_LABEL[cu().role], '-');
  appState.currentUser = null; saveState();
  closeDrawer(); modalStack.slice().forEach(m => m.close()); destroyCharts(); closeDropdowns(); $('#toast-root').innerHTML = '';
  renderLogin();
  if (!silent) toast('Anda telah keluar.', 'info');
}
function showApp() {
  $('#login-view').hidden = true; $('#login-view').innerHTML = '';
  $('#app').hidden = false;
  renderChrome();
}

/* --------------------------- Event delegation ---------------------------- */
const Actions = {
  go: el => { const p = {}; Object.keys(el.dataset).forEach(k => { if (!['act', 'route'].includes(k)) p[k] = el.dataset[k]; }); go(el.dataset.route, p); },
  toggleSidebar: () => {
    const app = $('#app');
    if (window.matchMedia('(max-width: 1100px)').matches) setSidebar(!app.classList.contains('expanded'));
    else app.classList.toggle('collapsed');
  },
  closeSidebar: () => setSidebar(false),
  toggleNotif: () => { const p = $('#notif-panel'); const open = p.hidden; closeDropdowns('#notif-panel'); if (open) renderNotifPanel(); p.hidden = !open; },
  toggleProfile: () => { const p = $('#profile-menu'); const open = p.hidden; closeDropdowns('#profile-menu'); if (open) renderProfileMenu(); p.hidden = !open; },
  markAllRead: () => { notifsForUser().forEach(n => { if (!n.readBy.includes(cu().username)) n.readBy.push(cu().username); }); saveState(); renderChrome(); renderNotifPanel(); },
  openNotif: el => {
    const n = appState.notifications.find(x => x.id === el.dataset.id); if (!n) return;
    if (!n.readBy.includes(cu().username)) n.readBy.push(cu().username);
    saveState(); closeDropdowns(); renderChrome();
    openLink(n.link);
  },
  openPlan: el => openDrawer(el.dataset.id),
  closeDrawer: () => closeDrawer(),
  logout: () => confirmDialog({ title: 'Keluar dari SI-RDK Terintegrasi?', message: 'Sesi Anda akan diakhiri. Data yang sudah disimpan tetap tersedia.', confirmLabel: 'Keluar', onConfirm: () => logout() }),
  switchRole: () => logout(true),
  resetDemo: () => confirmDialog({ title: 'Reset data demo?', message: 'Seluruh perubahan (dokumen unggahan, update, verifikasi, audit trail) akan dihapus dan data kembali ke kondisi awal.', confirmLabel: 'Reset data', tone: 'danger', onConfirm: () => { closeDropdowns(); closeDrawer(); resetDemo(); renderChrome(); go('dashboard'); toast('Data demo telah dikembalikan ke kondisi awal.'); } }),
  searchPick: el => {
    $('#gsearch-results').hidden = true; $('#gsearch-input').value = ''; $('#gsearch-input').blur();
    const { kind, id } = el.dataset;
    if (kind === 'plan') openDrawer(id);
    else if (kind === 'doc') go('ocr', { doc: id });
    else if (kind === 'satker') { resetRegFilters(); ui.reg.satker = id; go('register'); }
  },
  export: el => runExport(el.dataset.key, el.dataset.fmt)
};
function openLink(link) {
  if (!link) return;
  if (link.type === 'plan') { if (!findPlan(link.id)) return toast('Rencana aksi sudah tidak tersedia.', 'warn'); go(cu().role === 'satker' ? 'update' : 'register'); openDrawer(link.id); }
  else if (link.type === 'verify') { go('verification'); if (typeof openReview === 'function' && findPlan(link.id)) openReview(link.id); }
  else if (link.type === 'grc') { go(canSee('grc') ? 'grc' : 'dashboard'); }
  else if (link.type === 'doc') { if (!findDoc(link.id)) return toast('Dokumen sudah dihapus.', 'warn'); go(canSee('ocr') ? 'ocr' : 'dashboard', { doc: link.id }); }
}
function resetRegFilters() { Object.assign(ui.reg, { q: '', bidang: '', satker: '', status: '', ver: '', assign: '', prog: '', rdkFrom: '', rdkTo: '', targetTo: '', priority: '', strat: '', near: 0, page: 1 }); }

function bindGlobalEvents() {
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-act]');
    if (!e.target.closest('.top-actions') && !e.target.closest('#gsearch')) closeDropdowns();
    if (!el || el.closest('#login-view')) return;
    const fn = Actions[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el, e); }
  });
  document.addEventListener('input', e => { const el = e.target.closest('[data-input]'); if (el && Actions[el.dataset.input]) Actions[el.dataset.input](el, e); });
  document.addEventListener('change', e => { const el = e.target.closest('[data-change]'); if (el && Actions[el.dataset.change]) Actions[el.dataset.change](el, e); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (!$('#gsearch-results').hidden || !$('#notif-panel').hidden || !$('#profile-menu').hidden) { closeDropdowns(); return; } closeTopLayer(); return; }
    const tag = (e.target.tagName || '').toLowerCase();
    if (e.key === '/' && !['input', 'textarea', 'select'].includes(tag) && appState.currentUser && !modalStack.length) { e.preventDefault(); $('#gsearch-input').focus(); }
    if (e.key === 'Enter' && e.target.matches('tr[data-act]')) Actions[e.target.dataset.act]?.(e.target, e);
  });
  const gi = $('#gsearch-input');
  gi.addEventListener('input', debounce(() => runGlobalSearch(gi.value), 120));
  gi.addEventListener('focus', () => { if (gi.value.trim().length >= 2) runGlobalSearch(gi.value); });
  gi.addEventListener('keydown', e => {
    const items = $$('#gsearch-results .dd-item');
    if (!items.length) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault(); searchIdx = (searchIdx + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items.forEach((it, i) => it.classList.toggle('active', i === searchIdx)); items[searchIdx].scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') { e.preventDefault(); Actions.searchPick(items[Math.max(0, searchIdx)]); }
  });
  window.addEventListener('hashchange', () => {
    if (ui.skipHash) { ui.skipHash = false; return; }
    const r = location.hash.slice(1);
    if (appState.currentUser && Pages[r] && r !== ui.route) { ui.route = r; ui.params = {}; renderPage(); }
  });
  window.addEventListener('resize', debounce(() => { if (!window.matchMedia('(max-width: 1100px)').matches) { $('#app').classList.remove('expanded'); $('#scrim').hidden = true; } }, 150));
  window.addEventListener('storage', e => { if (e.key === STORAGE_KEY && appState.currentUser) { const u = appState.currentUser; loadState(); appState.currentUser = u; renderChrome(); renderPage(true); } });
}
