/* =========================================================================
   SI-RDK · rekap.js — Rekap & Laporan per Bidang → Satker
   Rekap dihasilkan langsung dari data SI-RDK Terintegrasi pada posisi tanggal
   tertentu (hari ini / akhir TW / tanggal pilihan). Basis progres default:
   TERVERIFIKASI = progres pada update terakhir yang disetujui MRDK.
   ========================================================================= */

ui.rekap = { pos: 'today', date: '', basis: 'verified', showEmpty: true, closed: {} };

function rekapCutoff() {
  const r = ui.rekap; const y = +todayISO().slice(0, 4);
  if (r.pos === 'custom' && r.date) return r.date;
  if (/^tw[1-4]$/.test(r.pos)) return twEnd(y, +r.pos[2] - 1);
  if (/^tw[1-4]p$/.test(r.pos)) return twEnd(y - 1, +r.pos[2] - 1);
  return todayISO();
}
const rkVerified = (ap, D) => { const s = ap.submissions.filter(x => x.result === 'Disetujui' && x.resultAt && tsDay(x.resultAt) <= D); return s.length ? s.at(-1).progressTo : 0; };
const rkReported = (ap, D) => progressAt(ap, D);
function rkPlan(ap, D) {
  const ver = rkVerified(ap, D), rep = rkReported(ap, D); const prog = ui.rekap.basis === 'verified' ? ver : rep;
  const st = prog >= 100 ? 'Selesai' : ap.targetDate && ap.targetDate < D ? 'Terlambat' : prog <= 0 ? 'Belum Mulai' : 'Dalam Proses';
  const pend = ap.submissions.some(s => tsDay(s.at) <= D && (!s.result || !s.resultAt || tsDay(s.resultAt) > D));
  let behind = false;
  const t = ap.traj;
  if (t && t.status === 'approved' && t.satker === ap.satker && t.reviewAt && tsDay(t.reviewAt) <= D && prog < 100) {
    const ended = t.items.map((it, i) => ({ ...it, i })).filter(it => !it.locked && twEnd(t.year, it.i) < D);
    if (ended.length && prog < ended.at(-1).target) behind = true;
  }
  const q = quadOf(ap);
  return { ap, ver, rep, prog, st, pend, behind, p12: q === 'P1' || q === 'P2', strat: !!ap.strategic };
}
function rkAgg(items) {
  const n = items.length; const sum = k => items.reduce((a, x) => a + x[k], 0);
  return {
    n, selesai: items.filter(x => x.st === 'Selesai').length, proses: items.filter(x => x.st === 'Dalam Proses').length, belum: items.filter(x => x.st === 'Belum Mulai').length,
    late: items.filter(x => x.st === 'Terlambat').length, pend: items.filter(x => x.pend).length, behind: items.filter(x => x.behind).length,
    p12: items.filter(x => x.p12).length, strat: items.filter(x => x.strat).length,
    avg: n ? Math.round(sum('prog') / n) : 0, avgVer: n ? Math.round(sum('ver') / n) : 0, avgRep: n ? Math.round(sum('rep') / n) : 0, rate: n ? Math.round(items.filter(x => x.st === 'Selesai').length / n * 100) : 0
  };
}
function rekapData() {
  const D = rekapCutoff();
  const items = appState.actionPlans.filter(a => tsDay(a.createdAt) <= D).map(a => rkPlan(a, D));
  const groups = bidangList().map(b => ({ code: b.code, name: b.name })).concat([{ code: '—', name: '' }]);
  const out = groups.map(g => {
    const inB = items.filter(x => (x.ap.bidang || '') === g.name);
    const sats = appState.masters.satker.filter(s => s.bidang === g.name).map(s => ({ type: 'satker', key: s.key, name: s.name, pic: s.pic, items: inB.filter(x => x.ap.satker === s.name) }));
    const other = inB.filter(x => !sats.some(s => s.name === x.ap.satker));
    if (other.length) sats.push({ type: 'satker', key: '—', name: other.every(x => !x.ap.satker) ? 'Belum ditugaskan ke satker' : 'Satker lain', items: other, unassigned: true });
    sats.forEach(s => s.k = rkAgg(s.items));
    return { type: 'bidang', code: g.code, name: g.name || 'Bidang belum ditetapkan', raw: g.name, items: inB, k: rkAgg(inB), sats };
  }).filter(g => g.code !== '—' || g.items.length);
  return { D, items, groups: out, total: rkAgg(items) };
}

const RK_COLS = [
  ['n', 'Penugasan'], ['selesai', 'Selesai'], ['proses', 'Dalam Proses'], ['belum', 'Belum Mulai'], ['late', 'Terlambat'], ['pend', 'Menunggu Verifikasi'],
  ['avg', 'Rata-rata Progres'], ['avgRep', 'Rata-rata Dilaporkan'], ['behind', 'Tertinggal Trajectory'], ['p12', 'Prioritas P1–P2'], ['strat', 'Strategis (SI-GRC)']
];
function rkCells(k, strong) {
  const v = (key, val) => {
    if (key === 'avg' || key === 'avgRep') return `<span class="tnum">${val}%</span>`;
    if (!val) return '<span class="muted">0</span>';
    const c = key === 'late' || key === 'behind' ? 'color:var(--danger-ink);font-weight:600' : key === 'pend' ? 'color:var(--warn-ink);font-weight:600' : key === 'selesai' ? 'color:var(--success-ink);font-weight:600' : '';
    return `<span class="tnum" style="${c}">${val}</span>`;
  };
  return RK_COLS.filter(([key]) => key !== 'avgRep' || ui.rekap.basis === 'verified').map(([key]) => `<td class="num" data-label="${RK_COLS.find(c => c[0] === key)[1]}" ${strong ? 'style="font-weight:600"' : ''}>${v(key, k[key])}</td>`).join('');
}
Actions.rkPos = el => { ui.rekap.pos = el.value; if (el.value === 'custom' && !ui.rekap.date) ui.rekap.date = todayISO(); renderPage(true); };
Actions.rkDate = el => { ui.rekap.date = el.value; renderPage(true); };
Actions.rkBasis = el => { ui.rekap.basis = el.dataset.v; renderPage(true); };
Actions.rkEmpty = el => { ui.rekap.showEmpty = el.checked; renderPage(true); };
Actions.rkToggle = el => { const c = el.dataset.code; ui.rekap.closed[c] = !ui.rekap.closed[c]; renderPage(true); };
Actions.rkAll = el => { const open = el.dataset.v === 'open'; bidangList().forEach(b => { ui.rekap.closed[b.code] = !open; }); ui.rekap.closed['—'] = !open; renderPage(true); };
Actions.rkSatker = el => { if (el.dataset.s) applyQuickFilter('satker:' + el.dataset.s); };
Actions.rkBidang = el => { if (el.dataset.b) applyQuickFilter('bidang:' + el.dataset.b); };

registerPage('rekap', {
  render() {
    const r = ui.rekap; const d = rekapData(); const y = +todayISO().slice(0, 4); const today = todayISO();
    const twOpts = [[`tw4p`, `Akhir TW IV ${y - 1}`, twEnd(y - 1, 3)], ...[0, 1, 2, 3].map(i => [`tw${i + 1}`, `Akhir ${TW[i]} ${y}`, twEnd(y, i)])].filter(o => o[2] < today);
    const T = d.total; const verified = r.basis === 'verified';
    const groups = d.groups.filter(g => r.showEmpty || g.items.length);
    const head = `<tr><th style="min-width:260px">Bidang / Satuan Kerja</th>${RK_COLS.filter(([k]) => k !== 'avgRep' || verified).map(([k, l]) => `<th class="num">${k === 'avg' ? (verified ? 'Rata-rata Progres Terverifikasi' : 'Rata-rata Progres Dilaporkan') : l}</th>`).join('')}</tr>`;
    const body = groups.map(g => {
      const closed = r.closed[g.code]; const sats = g.sats.filter(s => r.showEmpty || s.items.length);
      return `<tr class="clickable" style="background:var(--surface-2)" data-act="rkToggle" data-code="${esc(g.code)}"><td data-label="Bidang"><span style="display:inline-flex;gap:8px;align-items:flex-start">${icon(closed ? 'chevRight' : 'chevDown', 'sm')}<span><b>${esc(g.code)}</b> <span class="small muted">· ${sats.length} satker</span><div class="small" style="color:var(--ink-2);max-width:340px">${esc(g.name)}</div></span></span></td>${rkCells(g.k, true)}</tr>
        ${closed ? '' : sats.map(s => `<tr class="${s.items.length ? 'clickable' : ''}" ${s.items.length && !s.unassigned ? `data-act="rkSatker" data-s="${esc(s.name)}"` : ''}><td data-label="Satker"><div style="padding-left:26px"><span class="mono small" style="color:var(--blue-700)">${esc(s.key)}</span> ${esc(s.name)}${s.pic ? `<div class="small muted">PIC: ${esc(s.pic)}</div>` : ''}</div></td>${rkCells(s.k)}</tr>`).join('')}
        ${!closed && !sats.length ? `<tr><td colspan="${RK_COLS.length + 1}"><div class="small muted" style="padding-left:26px">Belum ada satker terdaftar pada bidang ini di Master Data.</div></td></tr>` : ''}`;
    }).join('');
    const kpi = (label, value, sub, ic, tone) => `<div class="kpi t-${tone} static"><div class="k-label"><span>${label}</span><span class="k-ic">${icon(ic, 'sm')}</span></div><div class="k-val">${value}</div><div class="k-sub">${sub}</div></div>`;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Monitoring · Rekap & Laporan</div><h1>Rekap & Laporan</h1><div class="sub">Rekap per <b>bidang</b> dan <b>satuan kerja</b> yang dihasilkan langsung dari data SI-RDK Terintegrasi — tanpa penyusunan ulang di <i>master</i> Excel.</div></div>${exportButtons('rekap')}</div>
      <section class="panel"><div class="toolbar" style="flex-wrap:wrap;gap:10px">
        <div class="field" style="margin:0"><label class="small muted" for="rk-pos">Posisi data</label><select class="select sm" id="rk-pos" data-change="rkPos"><option value="today" ${r.pos === 'today' ? 'selected' : ''}>Hari ini (${fmtDate(today)})</option>${twOpts.map(([v, l]) => `<option value="${v}" ${r.pos === v ? 'selected' : ''}>${l}</option>`).join('')}<option value="custom" ${r.pos === 'custom' ? 'selected' : ''}>Tanggal tertentu…</option></select></div>
        ${r.pos === 'custom' ? `<div class="field" style="margin:0"><label class="small muted" for="rk-date">Tanggal</label><input class="input sm" type="date" id="rk-date" max="${today}" value="${esc(r.date)}" data-change="rkDate"></div>` : ''}
        <div class="field" style="margin:0"><label class="small muted">Basis progres</label><div class="seg" role="group"><button class="${verified ? 'on' : ''}" data-act="rkBasis" data-v="verified">Terverifikasi MRDK</button><button class="${!verified ? 'on' : ''}" data-act="rkBasis" data-v="reported">Dilaporkan satker</button></div></div>
        <label class="check small" style="margin-left:auto"><input type="checkbox" data-change="rkEmpty" ${r.showEmpty ? 'checked' : ''}>Tampilkan bidang/satker tanpa penugasan</label>
      </div>
      <div class="small muted" style="padding:0 18px 12px">Posisi per <b>${fmtDateLong(d.D)}</b> · ${verified ? '<b>Progres terverifikasi</b> = progres pada update terakhir yang <i>disetujui</i> MRDK s.d. tanggal posisi; update yang belum/tidak disetujui tidak dihitung.' : '<b>Progres dilaporkan</b> = progres terakhir yang dilaporkan satker s.d. tanggal posisi, termasuk yang belum diverifikasi.'}</div></section>
      <section class="kpis k5">
        ${kpi('Penugasan', T.n, `${d.groups.filter(g => g.items.length).length} bidang · ${new Set(d.items.map(x => x.ap.satker).filter(Boolean)).size} satker`, 'list', 'blue')}
        ${kpi(verified ? 'Selesai Terverifikasi' : 'Selesai (dilaporkan)', T.selesai, `${T.rate}% dari penugasan`, 'checkCircle', 'green')}
        ${kpi(verified ? 'Rata-rata Progres Terverifikasi' : 'Rata-rata Progres', T.avg + '%', verified ? `dilaporkan satker ${T.avgRep}% · selisih ${T.avgRep - T.avgVer} poin` : `terverifikasi ${T.avgVer}%`, 'target', 'teal')}
        ${kpi('Terlambat', T.late, 'melewati target, belum 100%', 'alert', 'red')}
        ${kpi('Menunggu Verifikasi', T.pend, 'update belum direview MRDK', 'shield', 'amber')}
      </section>
      <section class="panel"><div class="panel-head"><div><h3>Rekap per Bidang dan Satuan Kerja</h3><div class="desc">Klik baris bidang untuk membuka/menutup · klik satker untuk melihat daftar penugasannya</div></div><div class="btn-group"><button class="btn xs ghost" data-act="rkAll" data-v="open">Buka semua</button><button class="btn xs ghost" data-act="rkAll" data-v="close">Tutup semua</button></div></div>
        <div class="tbl-wrap has-cards"><table class="rt cards"><thead>${head}</thead><tbody>${body}
          <tr style="background:var(--blue-50)"><td data-label=""><b>TOTAL OJK</b></td>${rkCells(T, true)}</tr></tbody></table></div>
        <div class="small muted" style="padding:12px 18px">Status per tanggal posisi: <b>Selesai</b> = progres 100%; <b>Terlambat</b> = target selesai terlewati dan progres &lt; 100%; <b>Tertinggal Trajectory</b> = progres di bawah target TW terakhir pada trajectory yang disetujui. Kuadran prioritas & penanda strategis mengikuti penetapan terkini.</div>
      </section>
    </div>`;
  }
});

Exporters.rekap = () => {
  const d = rekapData(); const verified = ui.rekap.basis === 'verified';
  const basis = verified ? 'progres terverifikasi MRDK' : 'progres dilaporkan satker';
  const kc = [
    { label: 'Penugasan', get: r => r.k.n, w: 11 }, { label: 'Selesai', get: r => r.k.selesai, w: 9 }, { label: 'Dalam Proses', get: r => r.k.proses, w: 12 }, { label: 'Belum Mulai', get: r => r.k.belum, w: 11 },
    { label: 'Terlambat', get: r => r.k.late, w: 10 }, { label: 'Menunggu Verifikasi', get: r => r.k.pend, w: 18 },
    { label: `Rata-rata Progres ${verified ? 'Terverifikasi' : 'Dilaporkan'} (%)`, get: r => r.k.avg, w: 26 }, ...(verified ? [{ label: 'Rata-rata Dilaporkan (%)', get: r => r.k.avgRep, w: 22 }] : []),
    { label: 'Completion Rate (%)', get: r => r.k.rate, w: 18 }, { label: 'Tertinggal Trajectory', get: r => r.k.behind, w: 18 }, { label: 'Prioritas P1–P2', get: r => r.k.p12, w: 14 }, { label: 'Strategis (SI-GRC)', get: r => r.k.strat, w: 16 }
  ];
  const combined = [];
  d.groups.filter(g => ui.rekap.showEmpty || g.items.length).forEach(g => { combined.push({ lvl: 'Bidang', code: g.code, name: g.name, k: g.k }); g.sats.filter(s => ui.rekap.showEmpty || s.items.length).forEach(s => combined.push({ lvl: 'Satker', code: s.key, name: s.name, bidang: g.code, k: s.k })); });
  combined.push({ lvl: 'Total', code: 'OJK', name: 'TOTAL OJK', k: d.total });
  return {
    name: 'Rekap_Bidang_Satker', sheet: 'Rekap Bidang & Satker', title: 'Rekap Tindak Lanjut per Bidang dan Satuan Kerja', subtitle: `Posisi per ${fmtDateLong(d.D)} · basis ${basis}`, rows: combined,
    columns: [{ label: 'Level', get: r => r.lvl, w: 8 }, { label: 'Kode', get: r => r.code, w: 8 }, { label: 'Bidang / Satuan Kerja', get: r => (r.lvl === 'Satker' ? '   ' : '') + r.name, w: 60 }, ...kc],
    extraSheets: [
      { sheet: 'Rekap Bidang', rows: [...d.groups.map(g => ({ code: g.code, name: g.name, k: g.k })), { code: 'OJK', name: 'TOTAL OJK', k: d.total }], columns: [{ label: 'Kode', get: r => r.code, w: 8 }, { label: 'Bidang', get: r => r.name, w: 60 }, ...kc] },
      { sheet: 'Rincian Penugasan', rows: d.items, columns: [
        { label: 'ID', get: x => x.ap.id, w: 13 }, { label: 'Bidang', get: x => bidangCode(x.ap.bidang), w: 8 }, { label: 'Satker', get: x => x.ap.satker, w: 40 }, { label: 'Poin Arahan', get: x => x.ap.arahan, w: 70 },
        { label: 'Tanggal RDK', get: x => x.ap.rdkDate, w: 12 }, { label: 'Target Selesai', get: x => x.ap.targetDate, w: 13 },
        { label: 'Progres Terverifikasi (%)', get: x => x.ver, w: 14 }, { label: 'Progres Dilaporkan (%)', get: x => x.rep, w: 14 }, { label: 'Status (per posisi)', get: x => x.st, w: 14 },
        { label: 'Menunggu Verifikasi', get: x => x.pend ? 'Ya' : '', w: 12 }, { label: 'Kuadran', get: x => quadOf(x.ap) || '', w: 9 }, { label: 'Tertinggal Trajectory', get: x => x.behind ? 'Ya' : '', w: 12 },
        { label: 'Strategis (SI-GRC)', get: x => x.strat ? 'Ya' : '', w: 12 }
      ] }
    ]
  };
};
