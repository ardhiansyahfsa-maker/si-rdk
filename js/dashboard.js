/* =========================================================================
   SI-RDK · dashboard.js — Dashboard utama, Executive Dashboard, Progress Satker
   Every number on these pages is computed from appState at render time.
   ========================================================================= */

function monthBuckets(n = 6) {
  const out = []; const d = new Date(); d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const m = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const end = new Date(m.getFullYear(), m.getMonth() + 1, 0);
    out.push({ label: `${MON[m.getMonth()]} ${String(m.getFullYear()).slice(2)}`, end: toISO(end), start: toISO(m) });
  }
  return out;
}

function satkerStats(plans = appState.actionPlans) {
  return appState.masters.satker.map(s => {
    const list = plans.filter(a => a.satker === s.name);
    const k = computeKpis(list);
    return { ...s, list, k };
  }).filter(s => s.list.length);
}

function priorityScore(ap) {
  const st = execStatus(ap);
  if (st === 'Selesai') return null;
  const d = daysToTarget(ap);
  let score = 0; const why = [];
  if (isLate(ap)) { score += 1000 + (-d) * 4; why.push({ t: `Terlambat ${-d} hari`, c: 'red' }); }
  else if (d <= 21) { score += 600 + (21 - d) * 10; why.push({ t: d === 0 ? 'Deadline hari ini' : `Deadline ${d} hari lagi`, c: 'amber' }); }
  if (ap.priority === 'Tinggi') { score += 200; why.push({ t: 'Prioritas tinggi', c: 'red' }); }
  const last = ap.updateDate || ap.createdAt.slice(0, 10);
  const since = diffDays(todayISO(), last);
  if (!ap.updateDate) { score += 140; why.push({ t: 'Belum ada update', c: 'grey' }); }
  else if (since > 21) { score += 80 + since; why.push({ t: `Tidak ada update ${since} hari`, c: 'grey' }); }
  if (!ap.satker) { score += 120; why.push({ t: 'Belum ditugaskan', c: 'grey' }); }
  return { score, why };
}
function topPriority(plans, n = 6) {
  return plans.map(a => ({ a, p: priorityScore(a) })).filter(x => x.p && x.p.score >= 200).sort((x, y) => y.p.score - x.p.score).slice(0, n);
}

function riskPanel(k, plans) {
  const near = plans.filter(a => { const d = daysToTarget(a); const s = execStatus(a); return s !== 'Selesai' && !isLate(a) && d >= 0 && d <= 14; }).length;
  const rows = [
    { sev: 'red', n: k.terlambat, t: 'action terlambat', s: 'Target terlewati, progress < 100%', f: 'status:Terlambat' },
    { sev: 'amber', n: k.mv, t: 'action menunggu verifikasi', s: isRole('admin') ? 'Perlu direview Admin / MRDK' : 'Sedang direview Admin / MRDK', f: isRole('admin') ? 'goto:verification' : 'ver:Menunggu Verifikasi' },
    { sev: 'yellow', n: k.belum, t: 'action menunggu respon', s: 'Belum ada progres dari Satker', f: 'status:Menunggu Respon' },
    { sev: 'amber', n: near, t: 'mendekati deadline', s: 'Target dalam 14 hari ke depan', f: 'near:14' },
    { sev: 'violet', n: k.perbaikan + k.ditolak, t: 'perlu perbaikan / ditolak', s: 'Menunggu update ulang dari Satker', f: 'ver:Perlu Perbaikan,Ditolak' }
  ];
  const behind = plans.filter(a => trackStatus(a)?.st === 'Tertinggal').length;
  rows.splice(1, 0, { sev: 'red', n: behind, t: 'tertinggal dari trajectory', s: 'Progres di bawah target TW yang telah berakhir', f: 'traj:Tertinggal' });
  if (!isRole('satker')) rows.push({ sev: 'violet', n: k.unassigned, t: 'belum ditugaskan', s: 'Belum memiliki Satker penanggung jawab', f: 'assign:Belum Ditugaskan' });
  return `<div class="risk">${rows.map(r => `<button class="risk-row" data-act="kpi" data-f="${esc(r.f)}"><span class="sev ${r.sev}"></span><span><b>${esc(r.t.charAt(0).toUpperCase() + r.t.slice(1))}</b><small>${esc(r.s)}</small></span><span class="cnt">${r.n}</span></button>`).join('')}</div>`;
}

function priorityList(plans, n = 6) {
  const top = topPriority(plans, n);
  if (!top.length) return `<div class="empty"><b>Tidak ada action prioritas</b>Seluruh rencana aksi berjalan sesuai target.</div>`;
  return `<div class="prio-list">${top.map((x, i) => `<button class="prio-item" data-act="openPlan" data-id="${x.a.id}">
    <span class="rank">${i + 1}</span>
    <span style="min-width:0"><div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="mono" style="color:var(--blue-700);font-weight:600">${x.a.id}</span>${statusHTML(x.a)}${quadOf(x.a) ? quadBadge(quadOf(x.a)) : `<span class="prio ${x.a.priority}">${x.a.priority.toUpperCase()}</span>`}</div>
      <div class="clamp-1" style="margin-top:3px">${esc(x.a.arahan)}</div>
      <div class="small muted">${esc(x.a.satker || 'Belum ditugaskan')} · target ${fmtDate(x.a.targetDate)}</div></span>
    <span style="text-align:right;display:flex;flex-direction:column;gap:2px;align-items:flex-end">${x.p.why.slice(0, 2).map(w => `<span class="why ${w.c} nowrap">${esc(w.t)}</span>`).join('')}</span></button>`).join('')}</div>`;
}

function recentActivity(limit = 8) {
  const own = new Set(visiblePlans().map(a => a.id));
  const logs = appState.auditLogs.filter(l => !['Login', 'Logout', 'Export Data', 'Cetak Laporan'].includes(l.action) && (cu().role !== 'satker' || own.has(l.entity))).slice(-limit).reverse();
  if (!logs.length) return '<div class="empty"><b>Belum ada aktivitas</b></div>';
  return `<div class="timeline">${logs.map(l => `<div class="tl-item"><div class="tl-time">${fmtTime(l.ts)}<br><span style="font-size:10.5px">${fmtDate(tsDay(l.ts)).slice(0, 6)}</span></div>
    <div class="tl-body ${logColor(l)}"><div class="tl-title">${logNarrative(l)}</div></div></div>`).join('')}</div>`;
}

function kpiCard({ label, value, sub, ic, tone, f, extra = '' }) {
  return `<button class="kpi t-${tone}" data-act="kpi" data-f="${esc(f)}"><div class="k-label"><span>${esc(label)}</span><span class="k-ic">${icon(ic, 'sm')}</span></div><div class="k-val">${value}</div>${extra}<div class="k-sub">${sub}</div></button>`;
}

function processFlow(k) {
  const docs = appState.documents; const pendingDocs = docs.filter(d => d.ocr_status !== 'Selesai' || d.extraction_status === 'Perlu Review').length;
  const role = cu().role;
  const step = (n, title, sub, metric, route, green, cur) => `<button class="step ${green ? 'green' : ''} ${cur ? 'current' : ''}" data-act="flowStep" data-route="${route}"><span class="n">${n}</span><span style="min-width:0"><b>${title}</b><small>${sub}</small><div class="metric">${metric}</div></span></button>`;
  return `<section class="panel flow" aria-label="Alur proses SI-RDK">
    <div class="flow-top"><div class="section-label">Alur Proses Tindak Lanjut</div>
      <div class="flow-src"><span class="pill">Naskah Rujukan Awal</span>${icon('arrowRight', 'sm')}<span class="pill core">SI-RDK · OCR · LLM · Register · Dashboard</span>${icon('arrowRight', 'sm')}<span class="pill">Monitoring & Pemanfaatan</span></div></div>
    <div class="steps">
      ${step('01', 'Upload Dokumen', 'Penerimaan naskah & ekstraksi', role === 'satker' ? `${k.docs} dokumen rujukan` : `${docs.length} dokumen · ${pendingDocs} perlu diproses`, 'documents', false, role === 'admin' && pendingDocs > 0)}
      ${step('02', 'Dashboard', 'Pemetaan & pemantauan', `${k.total} rencana aksi dipantau`, 'register', false, role === 'viewer')}
      ${step('03', 'Update Status Satker', 'Progres, bukti, kendala', `${k.total - k.selesai} dalam pelaksanaan`, 'update', true, role === 'satker')}
      ${step('04', 'Verifikasi Admin', 'Approve · revisi · tolak', `${k.mv} menunggu verifikasi`, 'verification', false, role === 'admin' && k.mv > 0)}
    </div>
    <div class="phases"><div class="phase"><b>01</b>Penerimaan & Pemetaan</div><div class="phase g"><b>02</b>Pelaksanaan</div><div class="phase"><b>03</b>Verifikasi & Pemanfaatan</div></div>
  </section>`;
}

function kpiGrid(k) {
  return `<section class="kpis" aria-label="Indikator utama">
    ${kpiCard({ label: 'Total Dokumen', value: k.docs, sub: cu().role === 'satker' ? 'dokumen rujukan terkait Satker Anda' : `${appState.documents.filter(d => d.ocr_status === 'Selesai').length} telah diekstraksi`, ic: 'file', tone: 'blue', f: 'goto:documents' })}
    ${kpiCard({ label: 'Total Rencana Aksi', value: k.total, sub: `dari ${k.sessions} arahan RDK`, ic: 'list', tone: 'blue', f: 'all' })}
    ${kpiCard({ label: 'Menunggu Respon', value: k.belum, sub: 'belum ada progres dari Satker', ic: 'clock', tone: 'grey', f: 'status:Menunggu Respon' })}
    ${kpiCard({ label: 'Dalam Proses', value: k.proses, sub: k.arahan ? `progress 1–99% · ${k.arahan} berlabel menunggu arahan` : 'progress 1–99%', ic: 'activity', tone: 'blue', f: 'status:Dalam Proses' })}
    ${kpiCard({ label: 'Selesai', value: k.selesai, sub: `${k.rate}% dari total rencana aksi`, ic: 'checkCircle', tone: 'green', f: 'status:Selesai' })}
    ${kpiCard({ label: 'Berlabel Terlambat', value: k.terlambat, sub: 'target terlewati, progress < 100%', ic: 'alert', tone: 'red', f: 'status:Terlambat' })}
    ${kpiCard({ label: 'Menunggu Verifikasi', value: k.mv, sub: 'update dikirim Satker', ic: 'shield', tone: 'amber', f: isRole('admin') ? 'goto:verification' : 'ver:Menunggu Verifikasi' })}
    ${kpiCard({ label: 'Tingkat Penyelesaian', value: k.avg + '%', sub: 'rata-rata progress seluruh RA', ic: 'target', tone: 'teal', f: canSee('executive') ? 'goto:executive' : 'all', extra: `<div class="mini-track"><i style="width:${k.avg}%"></i></div>` })}
  </section>`;
}

/* ------------------------------- Dashboard ------------------------------- */
registerPage('dashboard', {
  render() {
    const u = cu(); const plans = visiblePlans(); const k = computeKpis(plans);
    const latest = appState.auditLogs.at(-1);
    const recent = [...plans].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 8);
    return `<div class="page">
      <div class="page-head">
        <div><div class="crumb">SI-RDK Terintegrasi · Dashboard</div><h1>Selamat datang, ${esc(firstName(u.name))}</h1>
          <div class="sub">Berikut kondisi terkini tindak lanjut rencana aksi${u.role === 'satker' ? ` untuk <b>${esc(u.satker)}</b>` : ''}.</div></div>
        <div class="btn-group"><span class="status-line"><span class="sys-dot"></span>Sistem aktif · pembaruan terakhir ${latest ? fmtDT(latest.ts) : '—'}</span>
          ${canSee('executive') ? `<button class="btn sm" data-act="go" data-route="executive">${icon('gauge')}Executive view</button>` : ''}
          ${u.role === 'satker' ? `<button class="btn sm green" data-act="go" data-route="update">${icon('pencil')}Update status</button>` : ''}
          ${u.role === 'admin' ? `<button class="btn sm primary" data-act="go" data-route="documents">${icon('upload')}Upload dokumen</button>` : ''}</div>
      </div>
      ${processFlow(k)}
      ${kpiGrid(k)}
      <section class="grid g-12-8">
        <div class="panel"><div class="panel-head"><div><h3>Progress Keseluruhan</h3><div class="desc">Distribusi status pelaksanaan · klik segmen untuk memfilter</div></div></div>
          <div class="panel-body"><div class="chart-box short"><canvas id="ch-donut" aria-label="Donut status pelaksanaan"></canvas><div class="donut-center"><div><b>${k.total}</b><span>rencana aksi</span></div></div></div>
          <div class="legend" id="donut-legend"></div></div></div>
        <div class="panel"><div class="panel-head"><div><h3>${u.role === 'satker' ? 'Progress per Rencana Aksi' : 'Progress per Satker'}</h3><div class="desc">${u.role === 'satker' ? 'Progress setiap rencana aksi Satker Anda' : 'Rata-rata progress rencana aksi tiap Satker penanggung jawab'}</div></div>
          ${u.role !== 'satker' && canSee('satker') ? `<button class="btn sm ghost" data-act="go" data-route="satker">Detail ${icon('chevRight', 'sm')}</button>` : ''}</div>
          <div class="panel-body"><div class="chart-box short"><canvas id="ch-satker"></canvas></div></div></div>
      </section>
      <section class="grid g-3 charts">
        <div class="panel"><div class="panel-head"><div><h3>Trend Penyelesaian</h3><div class="desc">Kumulatif per bulan, 6 bulan terakhir</div></div></div><div class="panel-body"><div class="chart-box short"><canvas id="ch-trend"></canvas></div></div></div>
        <div class="panel"><div class="panel-head"><div><h3>Status Rencana Aksi per Bidang</h3><div class="desc">Komposisi status pelaksanaan</div></div></div><div class="panel-body"><div class="chart-box short"><canvas id="ch-stack"></canvas></div></div></div>
        <div class="panel"><div class="panel-head"><div><h3>Topik RDK</h3><div class="desc">Jumlah rencana aksi per topik</div></div></div><div class="panel-body"><div class="chart-box short"><canvas id="ch-topic"></canvas></div></div></div>
      </section>
      <section class="grid g-2">
        <div class="panel"><div class="panel-head"><div><h3>Risk / Attention Required</h3><div class="desc">Klik untuk melihat rencana aksi terkait</div></div></div>${riskPanel(k, plans)}</div>
        <div class="panel"><div class="panel-head"><div><h3>Aktivitas Terbaru</h3><div class="desc">Diambil dari audit trail</div></div>${canSee('audit') ? `<button class="btn sm ghost" data-act="go" data-route="audit">Audit trail ${icon('chevRight', 'sm')}</button>` : ''}</div><div class="panel-body">${recentActivity(8)}</div></div>
      </section>
      <section class="panel">
        <div class="panel-head"><div><h3>Rencana Aksi Terkini</h3><div class="desc">8 rencana aksi dengan pembaruan terbaru · klik baris untuk detail</div></div><button class="btn sm" data-act="go" data-route="register">Lihat register lengkap ${icon('chevRight', 'sm')}</button></div>
        ${planTable(recent, ['id', 'arahan', 'satker', 'status', 'progress', 'target', 'ver'])}
      </section>
    </div>`;
  },
  mount() { drawDashboardCharts(visiblePlans()); }
});

function drawDashboardCharts(plans) {
  const k = computeKpis(plans);
  const order = ['Selesai', 'Dalam Proses', 'Menunggu Respon'];
  const counts = { 'Selesai': k.selesai, 'Dalam Proses': k.proses, 'Menunggu Respon': k.belum };
  const lg = $('#donut-legend');
  if (lg) lg.innerHTML = order.map(s => `<span data-act="kpi" data-f="status:${s}"><i style="background:${STATUS_COLOR[s]}"></i>${s} <em>${counts[s]}</em></span>`).join('');
  mkChart('ch-donut', {
    type: 'doughnut',
    data: { labels: order, datasets: [{ data: order.map(s => counts[s]), backgroundColor: order.map(s => STATUS_COLOR[s]), borderColor: '#fff', borderWidth: 2, hoverOffset: 4 }] },
    options: { cutout: '70%', onClick: (e, els) => { if (els.length) applyQuickFilter('status:' + order[els[0].index]); }, plugins: { tooltip: { callbacks: { label: c => ` ${c.label}: ${c.raw} (${k.total ? Math.round(c.raw / k.total * 100) : 0}%)` } } } }
  });

  const isSat = cu().role === 'satker';
  const rows = isSat ? plans.map(a => ({ label: a.id, v: a.progress, f: a.id })) : satkerStats(plans).map(s => ({ label: s.key, full: s.name, v: s.k.avg, n: s.list.length, f: 'satker:' + s.name }));
  const col = v => v >= 75 ? '#2EAD6B' : v >= 40 ? '#2986B8' : '#F5A623';
  mkChart('ch-satker', {
    type: 'bar',
    data: { labels: rows.map(r => r.label), datasets: [{ data: rows.map(r => r.v), backgroundColor: rows.map(r => col(r.v)), borderRadius: 4, barThickness: 16 }] },
    options: {
      indexAxis: 'y', scales: { x: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#EEF2F5' } }, y: { grid: { display: false }, ticks: { font: { family: "'IBM Plex Mono', monospace", size: 11 } } } },
      onClick: (e, els) => { if (!els.length) return; const r = rows[els[0].index]; if (isSat) openDrawer(r.f); else applyQuickFilter(r.f); },
      plugins: { tooltip: { callbacks: { title: c => rows[c[0].dataIndex].full || rows[c[0].dataIndex].label, label: c => ` ${isSat ? 'Progress' : 'Rata-rata progress'}: ${c.raw}%${rows[c.dataIndex].n != null ? ` · ${rows[c.dataIndex].n} RA` : ''}` } } }
    }
  });

  const months = monthBuckets(6);
  mkChart('ch-trend', {
    type: 'line',
    data: {
      labels: months.map(m => m.label), datasets: [
        { label: 'Terdaftar (kumulatif)', data: months.map(m => plans.filter(a => a.createdAt.slice(0, 10) <= m.end).length), borderColor: '#2986B8', backgroundColor: 'rgba(41,134,184,.08)', fill: true, tension: .3, pointRadius: 3 },
        { label: 'Selesai (kumulatif)', data: months.map(m => plans.filter(a => a.progress >= 100 && a.completedDate && a.completedDate <= m.end).length), borderColor: '#2EAD6B', backgroundColor: 'rgba(46,173,107,.1)', fill: true, tension: .3, pointRadius: 3 }
      ]
    },
    options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10, usePointStyle: true } } }, scales: { y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF2F5' } }, x: { grid: { display: false } } } }
  });

  const bidang = [...new Set(plans.map(a => a.bidang || 'Belum ditetapkan'))];
  mkChart('ch-stack', {
    type: 'bar',
    data: { labels: bidang.map(b => bidangCode(b) || wrapLabel(b, 16)), datasets: order.map(s => ({ label: s, data: bidang.map(b => plans.filter(a => (a.bidang || 'Belum ditetapkan') === b && execStatus(a) === s).length), backgroundColor: STATUS_COLOR[s], borderRadius: 2, maxBarThickness: 34 })) },
    options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } }, tooltip: { mode: 'index', callbacks: { title: c => bidang[c[0].dataIndex] } } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0 } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF2F5' } } },
      onClick: (e, els) => { if (els.length) applyQuickFilter('bidang:' + bidang[els[0].index]); } }
  });

  const topics = Object.entries(plans.reduce((m, a) => (m[a.topic] = (m[a.topic] || 0) + 1, m), {})).sort((a, b) => b[1] - a[1]);
  mkChart('ch-topic', {
    type: 'bar',
    data: { labels: topics.map(t => wrapLabel(t[0], 24)), datasets: [{ data: topics.map(t => t[1]), backgroundColor: '#19A88A', borderRadius: 4, barThickness: 12 }] },
    options: { indexAxis: 'y', scales: { x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF2F5' } }, y: { grid: { display: false }, ticks: { font: { size: 10 } } } },
      onClick: (e, els) => { if (els.length) { resetRegFilters(); ui.reg.q = topics[els[0].index][0]; go('register'); } } }
  });
}

/** KPI / risk / chart shortcuts → open the register with a filter applied. */
function applyQuickFilter(f) {
  if (!f) return;
  if (f.startsWith('goto:')) { const r = f.slice(5); if (canSee(r)) go(r); else { resetRegFilters(); go('register'); } return; }
  if (f.startsWith('traj:')) { Object.assign(ui.traj, { q: '', prep: '', quad: '', satker: '', track: f.slice(5) }); go('trajectory'); return; }
  if (f.startsWith('quad:')) { Object.assign(ui.traj, { q: '', prep: '', track: '', satker: '', quad: f.slice(5) }); go('trajectory'); return; }
  if (f.startsWith('grc:')) { Object.assign(ui.grc, { q: '', satker: '', status: f.slice(4) }); go('grc'); return; }
  resetRegFilters();
  if (f !== 'all') {
    const [key, val] = [f.slice(0, f.indexOf(':')), f.slice(f.indexOf(':') + 1)];
    if (key === 'near') ui.reg.near = +val;
    else ui.reg[key === 'status' ? 'status' : key === 'ver' ? 'ver' : key === 'assign' ? 'assign' : key === 'satker' ? 'satker' : 'bidang'] = val;
  }
  go('register');
}
Actions.kpi = el => applyQuickFilter(el.dataset.f);
Actions.flowStep = el => {
  const r = el.dataset.route;
  if (canSee(r)) go(r); else if (r === 'update' || r === 'verification') applyQuickFilter(r === 'update' ? 'status:Dalam Proses,Menunggu Arahan,Terlambat' : 'ver:Menunggu Verifikasi'); else go('register');
};

/* --------------------------- Executive Dashboard ------------------------- */
/* ----------------------------- Executive ------------------------------- */
function bidangStats(plans) {
  const today = todayISO();
  return bidangList().map(b => {
    const list = plans.filter(a => a.bidang === b.name); const k = computeKpis(list);
    const ver = list.length ? Math.round(list.reduce((t, a) => t + rkVerified(a, today), 0) / list.length) : 0;
    const verDone = list.filter(a => rkVerified(a, today) >= 100).length;
    return { ...b, list, k, ver, verDone, behind: list.filter(a => trackStatus(a)?.st === 'Tertinggal').length, p12: list.filter(a => ['P1', 'P2'].includes(quadOf(a))).length, strat: list.filter(a => a.strategic).length };
  });
}
function bidangTable(rows) {
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Bidang</th><th class="num">Penugasan</th><th class="num">Selesai</th><th class="num">Dalam Proses</th><th class="num">Menunggu Respon</th><th class="num">Terlambat</th><th>Progres Terverifikasi <span class="muted" style="font-weight:400">(dilaporkan)</span></th><th class="num">Tertinggal Trajectory</th><th class="num">P1–P2</th><th class="num">Strategis</th></tr></thead><tbody>
    ${rows.map(b => `<tr class="clickable" tabindex="0" data-act="kpi" data-f="bidang:${esc(b.name)}">
      <td data-label="Bidang" class="full"><b style="font-weight:650">${esc(b.code)}</b><div class="small muted clamp-2" style="min-width:190px;max-width:260px">${esc(b.name)}</div></td>
      <td class="num tnum" data-label="Penugasan"><b>${b.k.total}</b></td><td class="num tnum" data-label="Selesai">${b.k.selesai}</td><td class="num tnum" data-label="Dalam Proses">${b.k.proses}</td><td class="num tnum" data-label="Menunggu Respon">${b.k.belum}</td>
      <td class="num tnum" data-label="Label Terlambat" style="${b.k.terlambat ? 'color:var(--danger-ink);font-weight:650' : ''}">${b.k.terlambat}</td>
      <td data-label="Terverifikasi"><div class="pbar"><div class="track"><div class="fill ${b.ver >= 75 ? 'done' : ''}" style="width:${b.ver}%"></div></div><span class="val">${b.ver}%</span></div><div class="small muted tnum">dilaporkan ${b.k.avg}%</div></td>
      <td class="num tnum" data-label="Tertinggal" style="${b.behind ? 'color:var(--danger-ink);font-weight:650' : ''}">${b.behind}</td><td class="num tnum" data-label="P1–P2">${b.p12}</td><td class="num tnum" data-label="Strategis">${b.strat}</td></tr>`).join('')}
  </tbody></table></div>`;
}
function execMatrix(plans) {
  const cell = (u, d) => { const q = quadrantOf(u, d); const n = plans.filter(a => a.cls && a.cls.urgency === u && a.cls.impact === d).length; const bg = { P1: 'var(--danger-50)', P2: 'var(--warn-50)', P3: 'var(--blue-50)', P4: 'var(--grey-50)' }[q];
    return `<button data-act="kpi" data-f="quad:${q}" style="border:1px solid var(--line);background:${bg};border-radius:8px;padding:6px 4px;text-align:center;cursor:pointer"><div style="font-size:18px;font-weight:700;color:var(--navy)" class="tnum">${n}</div><div class="small muted">${q}</div></button>`; };
  return `<div style="display:grid;grid-template-columns:auto repeat(3,1fr);gap:5px">
    <div></div>${LEVELS.slice().reverse().map(u => `<div class="small muted" style="text-align:center;font-weight:600">U ${u}</div>`).join('')}
    ${LEVELS.map(d => `<div class="small muted" style="font-weight:600;display:flex;align-items:center;padding-right:4px">D ${d}</div>${LEVELS.slice().reverse().map(u => cell(u, d)).join('')}`).join('')}</div>`;
}
const miniStat = (label, n, f, tone = '') => `<button class="risk-row" data-act="kpi" data-f="${esc(f)}" style="grid-template-columns:1fr auto;padding:9px 0"><span class="small">${label}</span><b class="tnum" style="font-size:16px;${tone}">${n}</b></button>`;

registerPage('executive', {
  render() {
    const plans = visiblePlans(); const k = computeKpis(plans); const today = todayISO();
    const stats = satkerStats(plans).sort((a, b) => b.k.avg - a.k.avg);
    const bstats = bidangStats(plans);
    const verDone = plans.filter(a => rkVerified(a, today) >= 100).length;
    const verAvg = plans.length ? Math.round(plans.reduce((t, a) => t + rkVerified(a, today), 0) / plans.length) : 0;
    const tr = s => plans.filter(a => trackStatus(a)?.st === s).length; const approved = plans.filter(a => prepStatus(a) === 'Trajectory Disetujui').length;
    const prep = plans.filter(a => !['Trajectory Disetujui'].includes(prepStatus(a))).length;
    const p1Behind = plans.filter(a => quadOf(a) === 'P1' && trackStatus(a)?.st === 'Tertinggal');
    const strat = plans.filter(a => a.strategic); const gs = s => strat.filter(a => grcStatus(a) === s).length;
    const highRec = strat.filter(a => a.grc?.recorded?.level === 'Tinggi' && grcStatus(a) === 'Selesai').length;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Monitoring · Executive Dashboard</div><h1>Executive Dashboard</h1><div class="sub">Ringkasan untuk pimpinan per ${fmtDateLong(today)}. Angka progres <b>terverifikasi</b> = update terakhir yang disetujui MRDK.</div></div>
        <div class="btn-group"><button class="btn primary sm" data-act="briefPDF" title="Laporan ringkas untuk Dewan Komisioner: status, perhatian, sumber arahan, prioritas">${icon('file')}Laporan PDF untuk DK</button>${exportButtons('rekap')}</div></div>
      <section class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))">
        <div class="kpi big t-blue static"><div class="k-label">Total Arahan RDK <span class="k-ic">${icon('flag', 'sm')}</span></div><div class="k-val">${k.sessions}</div><div class="k-sub">${k.total} penugasan · ${k.docs} dokumen rujukan</div></div>
        ${kpiCard({ label: 'Selesai Terverifikasi', value: verDone, sub: `${k.selesai} dilaporkan selesai oleh satker`, ic: 'checkCircle', tone: 'green', f: 'status:Selesai' })}
        ${kpiCard({ label: 'Progres Terverifikasi', value: verAvg + '%', sub: `dilaporkan ${k.avg}% · selisih ${k.avg - verAvg} poin`, ic: 'target', tone: 'teal', f: 'goto:rekap', extra: `<div class="mini-track"><i style="width:${verAvg}%"></i></div>` })}
        ${kpiCard({ label: 'Berlabel Terlambat', value: k.terlambat, sub: 'target terlewati, belum 100%', ic: 'alert', tone: 'red', f: 'status:Terlambat' })}
        ${kpiCard({ label: 'Tertinggal Trajectory', value: tr('Tertinggal'), sub: `dari ${approved} trajectory disetujui`, ic: 'activity', tone: 'red', f: 'traj:Tertinggal' })}
        ${kpiCard({ label: 'Menunggu Verifikasi', value: k.mv, sub: 'update menunggu review MRDK', ic: 'shield', tone: 'amber', f: isRole('admin') ? 'goto:verification' : 'ver:Menunggu Verifikasi' })}
      </section>
      <section class="grid g-12-8">
        <div class="panel"><div class="panel-head"><div><h3>Risk / Attention Required</h3><div class="desc">Hal yang memerlukan perhatian pimpinan</div></div></div>${riskPanel(k, plans)}</div>
        <div class="panel"><div class="panel-head"><div><h3>Top Priority Action</h3><div class="desc">Urutan: terlambat → mendekati deadline → prioritas tinggi → belum ada update</div></div></div>${priorityList(plans, 7)}</div>
      </section>
      <section class="grid g-12-8">
        <div class="panel"><div class="panel-head"><h3>Status Pelaksanaan</h3></div><div class="panel-body"><div class="chart-box short"><canvas id="ex-donut"></canvas><div class="donut-center"><div><b>${k.rate}%</b><span>selesai</span></div></div></div><div class="legend" id="ex-legend"></div></div></div>
        <div class="panel"><div class="panel-head"><div><h3>Status per Bidang</h3><div class="desc">Jumlah penugasan per status di 9 bidang · klik batang untuk membuka</div></div></div><div class="panel-body"><div class="chart-box"><canvas id="ex-bidang"></canvas></div></div></div>
      </section>
      <section class="panel"><div class="panel-head"><div><h3>Kinerja per Bidang</h3><div class="desc">Progres terverifikasi vs dilaporkan, keterlambatan, trajectory, prioritas, dan penugasan strategis · klik baris untuk melihat penugasan</div></div><button class="btn xs ghost" data-act="go" data-route="rekap">Rekap lengkap ${icon('chevRight', 'sm')}</button></div>${bidangTable(bstats)}</section>
      <section class="grid g-3">
        <div class="panel"><div class="panel-head"><div><h3>Matriks Prioritas</h3><div class="desc">Urgensi × dampak · ${plans.filter(a => !a.cls).length} belum ditetapkan</div></div></div><div class="panel-body">${execMatrix(plans)}</div></div>
        <div class="panel"><div class="panel-head"><div><h3>Posisi Trajectory</h3><div class="desc">${approved} dari ${plans.length} penugasan memiliki trajectory disetujui</div></div></div><div class="panel-body" style="padding-top:4px">
          ${miniStat('Tertinggal dari target TW', tr('Tertinggal'), 'traj:Tertinggal', 'color:var(--danger-ink)')}${miniStat('Sesuai trajectory', tr('Sesuai Trajectory'), 'traj:Sesuai Trajectory', 'color:var(--success-ink)')}${miniStat('Selesai', tr('Selesai'), 'traj:Selesai')}${miniStat('Belum memiliki trajectory disetujui', prep, 'goto:trajectory', 'color:var(--warn-ink)')}
          ${p1Behind.length ? `<div class="ai-banner red" style="margin-top:10px">${icon('alert')}<span><b>P1 tertinggal:</b> ${p1Behind.map(a => `<button class="link-btn mono" data-act="openPlan" data-id="${a.id}">${a.id}</button>`).join(', ')}</span></div>` : ''}</div></div>
        <div class="panel"><div class="panel-head"><div><h3>Integrasi SI-GRC</h3><div class="desc">${strat.length} penugasan strategis OJK-wide</div></div></div><div class="panel-body" style="padding-top:4px">
          ${miniStat('Tercatat di profil risiko (selesai)', gs('Selesai'), 'grc:Selesai', 'color:var(--success-ink)')}${miniStat('Diproses di SI-GRC', gs('Menunggu Pengelompokan Risiko') + gs('Menunggu Konfirmasi RQO'), 'goto:grc')}${miniStat('Siap / perlu dikirim', gs('Siap Dikirim') + gs('Perlu Sinkron Ulang'), 'grc:Siap Dikirim', 'color:var(--warn-ink)')}${miniStat('Tercatat level risiko Tinggi', highRec, 'grc:Selesai', 'color:var(--danger-ink)')}</div></div>
      </section>
      <section class="panel"><div class="panel-head"><div><h3>Status per Satker</h3><div class="desc">${stats.length} satker yang memiliki penugasan · klik batang untuk membuka</div></div></div><div class="panel-body"><div class="chart-box" style="height:${Math.max(220, stats.length * 22 + 60)}px"><canvas id="ex-stack"></canvas></div></div></section>
      <section class="panel"><div class="panel-head"><div><h3>Kinerja Satker</h3><div class="desc">Diurutkan menurut rata-rata progress · klik baris untuk melihat rencana aksi</div></div></div>${satkerTable(stats)}</section>
    </div>`;
  },
  mount() {
    const plans = visiblePlans(); const k = computeKpis(plans);
    const order = ['Selesai', 'Dalam Proses', 'Menunggu Respon'];
    const c = { 'Selesai': k.selesai, 'Dalam Proses': k.proses, 'Menunggu Respon': k.belum };
    $('#ex-legend').innerHTML = order.map(s => `<span data-act="kpi" data-f="status:${s}"><i style="background:${STATUS_COLOR[s]}"></i>${s} <em>${c[s]}</em></span>`).join('') + `<span data-act="kpi" data-f="status:Terlambat"><i style="background:${STATUS_COLOR.Terlambat}"></i>Label Terlambat <em>${k.terlambat}</em></span>`;
    mkChart('ex-donut', { type: 'doughnut', data: { labels: order, datasets: [{ data: order.map(s => c[s]), backgroundColor: order.map(s => STATUS_COLOR[s]), borderColor: '#fff', borderWidth: 2 }] }, options: { cutout: '70%', onClick: (e, els) => { if (els.length) applyQuickFilter('status:' + order[els[0].index]); } } });
    const bs = bidangStats(plans);
    const bar = (id, rows, labels, titles, onPick) => mkChart(id, {
      type: 'bar',
      data: { labels, datasets: [...order.map(st => ({ label: st, data: rows.map(r => r.list.filter(a => execStatus(a) === st).length), backgroundColor: STATUS_COLOR[st], maxBarThickness: 22, borderRadius: 2, stack: 's' })),
        { label: 'Label Terlambat', data: rows.map(r => r.list.filter(isLate).length), backgroundColor: 'rgba(217,83,79,.25)', borderColor: STATUS_COLOR.Terlambat, borderWidth: 1, maxBarThickness: 8, borderRadius: 2, stack: 'late' }] },
      options: { indexAxis: 'y', plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } }, tooltip: { mode: 'index', callbacks: { title: c2 => titles[c2[0].dataIndex] } } },
        scales: { x: { stacked: true, ticks: { precision: 0 }, grid: { color: '#EEF2F5' } }, y: { stacked: true, grid: { display: false }, ticks: { font: { family: "'IBM Plex Mono', monospace" } } } },
        onClick: (e, els) => { if (els.length) onPick(rows[els[0].index]); } }
    });
    bar('ex-bidang', bs, bs.map(b => b.code), bs.map(b => b.name), r => applyQuickFilter('bidang:' + r.name));
    const stats = satkerStats(plans);
    bar('ex-stack', stats, stats.map(s => s.key), stats.map(s => s.name), r => applyQuickFilter('satker:' + r.name));
  }
});

function satkerTable(stats) {
  return `<div class="tbl-wrap has-cards"><table class="rt cards"><thead><tr><th>Satker</th><th>PIC</th><th class="num">Total</th><th class="num">Selesai</th><th class="num">Dalam Proses</th><th class="num">Menunggu Respon</th><th class="num">Label Terlambat</th><th class="num">Menunggu Verif.</th><th>Rata-rata Progress</th><th class="num">Completion</th></tr></thead><tbody>
    ${stats.map(s => `<tr class="clickable" tabindex="0" data-act="kpi" data-f="satker:${esc(s.name)}">
      <td data-label="Satker" class="full"><span class="mono small" style="color:var(--blue-700)">${esc(s.key)}</span> <b style="font-weight:600">${esc(s.name)}</b><div class="small muted">Bidang ${esc(bidangCode(s.bidang) || s.bidang)}</div></td>
      <td data-label="PIC">${/^PIC /.test(s.pic) ? '<span class="muted">—</span>' : esc(s.pic)}</td><td class="num tnum" data-label="Total">${s.k.total}</td><td class="num tnum" data-label="Selesai">${s.k.selesai}</td>
      <td class="num tnum" data-label="Proses">${s.k.proses}</td><td class="num tnum" data-label="Menunggu Respon">${s.k.belum}</td>
      <td class="num tnum" data-label="Terlambat" style="${s.k.terlambat ? 'color:var(--danger-ink);font-weight:650' : ''}">${s.k.terlambat}</td><td class="num tnum" data-label="Menunggu Verif.">${s.k.mv}</td>
      <td data-label="Rata-rata"><div class="pbar"><div class="track"><div class="fill ${s.k.avg >= 75 ? 'done' : ''}" style="width:${s.k.avg}%"></div></div><span class="val">${s.k.avg}%</span></div></td>
      <td class="num tnum" data-label="Completion"><b>${s.k.rate}%</b></td></tr>`).join('')}
  </tbody></table></div>`;
}
Exporters.satker = () => {
  const stats = satkerStats(visiblePlans());
  return {
    name: 'Kinerja_Satker', sheet: 'Kinerja Satker', title: 'Kinerja Satker — Tindak Lanjut Rencana Aksi', subtitle: `Per ${fmtDateLong(todayISO())}`, rows: stats,
    columns: [
      { label: 'Satker', get: s => s.name, w: 44 }, { label: 'Bidang', get: s => s.bidang, w: 32 }, { label: 'PIC', get: s => s.pic, w: 18 },
      { label: 'Total RA', get: s => s.k.total, w: 9 }, { label: 'Selesai', get: s => s.k.selesai, w: 9 }, { label: 'Dalam Proses', get: s => s.k.proses, w: 12 },
      { label: 'Menunggu Respon', get: s => s.k.belum, w: 15 }, { label: 'Label Terlambat', get: s => s.k.terlambat, w: 14 }, { label: 'Menunggu Verifikasi', get: s => s.k.mv, w: 18 },
      { label: 'Rata-rata Progress (%)', get: s => s.k.avg, w: 20 }, { label: 'Completion Rate (%)', get: s => s.k.rate, w: 18 }
    ]
  };
};

/* ----------------------------- Progress Satker --------------------------- */
registerPage('satker', {
  render() {
    const plans = visiblePlans(); const stats = satkerStats(plans);
    const unassigned = plans.filter(a => !a.satker).length;
    return `<div class="page">
      <div class="page-head"><div><div class="crumb">Monitoring · Progress Satker</div><h1>Progress Satker</h1><div class="sub">Capaian tindak lanjut masing-masing Satker penanggung jawab.</div></div>${exportButtons('satker')}</div>
      ${unassigned ? `<div class="ai-banner warn">${icon('alert')}<span><b>${unassigned} rencana aksi belum ditugaskan</b> ke Satker mana pun dan tidak termasuk dalam tabel ini. <button class="link-btn" data-act="kpi" data-f="assign:Belum Ditugaskan">Lihat dan tugaskan</button></span></div>` : ''}
      <section class="grid g-2">
        <div class="panel"><div class="panel-head"><div><h3>Rata-rata Progress</h3><div class="desc">Klik batang untuk membuka rencana aksi Satker</div></div></div><div class="panel-body"><div class="chart-box"><canvas id="ps-avg"></canvas></div></div></div>
        <div class="panel"><div class="panel-head"><div><h3>Komposisi Status</h3><div class="desc">Jumlah rencana aksi per status</div></div></div><div class="panel-body"><div class="chart-box"><canvas id="ps-stack"></canvas></div></div></div>
      </section>
      <section class="panel"><div class="panel-head"><h3>Rekap per Satker</h3><span class="small muted">${stats.length} Satker · ${plans.length - unassigned} rencana aksi ditugaskan</span></div>${satkerTable(stats)}</section>
    </div>`;
  },
  mount() {
    const stats = satkerStats(visiblePlans());
    mkChart('ps-avg', {
      type: 'bar', data: { labels: stats.map(s => s.key), datasets: [{ label: 'Rata-rata progress', data: stats.map(s => s.k.avg), backgroundColor: stats.map(s => s.k.avg >= 75 ? '#2EAD6B' : s.k.avg >= 40 ? '#2986B8' : '#F5A623'), borderRadius: 4, barThickness: 18 }, { label: 'Completion rate', data: stats.map(s => s.k.rate), backgroundColor: '#C9D6E2', borderRadius: 4, barThickness: 18 }] },
      options: { indexAxis: 'y', plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } }, tooltip: { callbacks: { title: c => stats[c[0].dataIndex].name, label: c => ` ${c.dataset.label}: ${c.raw}%` } } },
        scales: { x: { min: 0, max: 100, ticks: { callback: v => v + '%' }, grid: { color: '#EEF2F5' } }, y: { grid: { display: false }, ticks: { font: { family: "'IBM Plex Mono', monospace" } } } },
        onClick: (e, els) => { if (els.length) applyQuickFilter('satker:' + stats[els[0].index].name); } }
    });
    const order = ['Selesai', 'Dalam Proses', 'Menunggu Respon'];
    mkChart('ps-stack', {
      type: 'bar', data: { labels: stats.map(s => s.key), datasets: order.map(st => ({ label: st, data: stats.map(s => s.list.filter(a => execStatus(a) === st).length), backgroundColor: STATUS_COLOR[st], maxBarThickness: 36, borderRadius: 2 })) },
      options: { plugins: { legend: { display: true, position: 'bottom', labels: { boxWidth: 10, boxHeight: 10 } }, tooltip: { mode: 'index', callbacks: { title: c => stats[c[0].dataIndex].name } } }, scales: { x: { stacked: true, grid: { display: false }, ticks: { font: { family: "'IBM Plex Mono', monospace" } } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#EEF2F5' } } } }
    });
  }
});
