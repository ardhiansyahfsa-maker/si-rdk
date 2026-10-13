/* =========================================================================
   SI-RDK · naskah.js — Format baku Keputusan Rapat Dewan Komisioner (KRDK)
   Struktur naskah: kop OJK · KEPUTUSAN RAPAT DEWAN KOMISIONER · No. xx/KRDK/yyyy
   · hari, tanggal · Topik · Keputusan ("Dewan Komisioner menyetujui …")
   · Arahan ("Dewan Komisioner memberikan arahan kepada: 1. <penerima> untuk …")
   · Ditetapkan di Jakarta · Pemimpin Rapat, Ketua Dewan Komisioner.
   OCR/LLM hanya mengambil bagian ARAHAN: penerima arahan → satker/bidang
   penanggung jawab, isi arahan → poin arahan. Bagian KEPUTUSAN dicatat sebagai
   konteks dan tidak menjadi poin tindak lanjut.
   ========================================================================= */

const isKrdkDoc = d => !!d && d.document_type === 'Keputusan RDK';
const KRDK_DAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const krdkDay = iso => `${KRDK_DAYS[new Date(iso + 'T00:00:00').getDay()]}, ${fmtDateLong(iso)}`;
/** Penerima arahan sebagaimana tertulis di naskah. Satker → "Kepala <satker>";
    hanya bidang → pejabat tingkat bidang (satker dipetakan MRDK). */
function krdkAddressee(satker, bidang) {
  if (satker) return `Kepala ${satker}`;
  const b = (typeof MASTER_BIDANG !== 'undefined' ? MASTER_BIDANG : []).find(x => x.name === bidang);
  if (!b) return 'Anggota Dewan Komisioner terkait';
  return ['KSAR', 'MS'].includes(b.code) ? `Anggota Dewan Komisioner Bidang ${b.name}` : `Kepala Eksekutif Bidang ${b.name}`;
}
const krdkAddr = it => it.addressee || krdkAddressee(it.satker, it.bidang);
function krdkKeputusan(doc) {
  if (doc.extraction?.keputusan) return doc.extraction.keputusan;
  const t = (doc.extraction?.items?.[0]?.topic || doc.topic || 'materi rapat').toLowerCase();
  return `Dewan Komisioner menyetujui kebijakan ${t} sebagaimana disampaikan dalam materi rapat, dengan memperhatikan masukan Anggota Dewan Komisioner.`;
}
const krdkLc = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
const krdkNo = doc => (doc.document_number || 'No. …/KRDK/2026');

function krdkPaperHTML(doc) {
  const items = doc.extraction?.items || []; const done = doc.ocr_status === 'Selesai' && items.length;
  const date = items[0]?.rdkDate || doc.document_date; const topic = items[0]?.topic || doc.topic || '…';
  const hl = v => `<span class="${done ? 'hl' : ''}">${v}</span>`;
  return `<div class="paper krdk ${done ? '' : 'pending'}">
    ${done ? `<span class="stamp">OCR ${doc.ocr_accuracy ? doc.ocr_accuracy.toFixed(1) + '%' : ''}</span>` : `<span class="stamp" style="color:var(--ink-3);border-color:var(--line);background:#fff">BELUM DIPROSES</span>`}
    <div class="krdk-logo"><img src="assets/logo-ojk.png?v=9" alt="Otoritas Jasa Keuangan"></div>
    <div class="krdk-title">KEPUTUSAN<br>RAPAT DEWAN KOMISIONER<br>${hl(esc(krdkNo(doc)))}<br>${hl(esc(krdkDay(date)))}</div>
    <p class="krdk-topik"><b>Topik:&nbsp; ${hl(esc(topic))}</b></p>
    <p class="krdk-h"><i><u>Keputusan:</u></i></p>
    <p>${done ? `<span class="ctx" title="Dicatat sebagai konteks — bukan poin tindak lanjut">${esc(krdkKeputusan(doc))}</span>` : '<span class="ph" style="width:80%"></span>'}</p>
    <p class="krdk-h"><b><u>Arahan:</u></b></p>
    <p>Dewan Komisioner memberikan arahan kepada:</p>
    ${done ? `<ol>${items.map((it, i) => `<li id="pv-li-${i}"><span class="hl">${esc(krdkAddr(it))}</span> untuk <span class="hl">${esc(krdkLc(it.arahan).replace(/\.$/, ''))}</span>.</li>`).join('')}</ol>`
      : `<div style="display:flex;flex-direction:column;gap:9px;margin:10px 0 14px 18px">${[88, 70, 92, 64].map(w => `<div style="height:9px;width:${w}%;background:#E6EAEE;border-radius:3px"></div>`).join('')}</div>`}
    <div class="krdk-sign">Ditetapkan di Jakarta,<br>Pada tanggal ${esc(fmtDateLong(date))}<br><br>Pemimpin Rapat<br>KETUA DEWAN KOMISIONER<br><br><br><br><span class="muted">(nama Ketua Dewan Komisioner)</span></div>
  </div>`;
}
function krdkRawText(doc) {
  const items = doc.extraction?.items || [];
  if (doc.ocr_status !== 'Selesai') return 'Dokumen belum melalui proses OCR.\nKlik "Process Document" untuk menjalankan OCR dan ekstraksi.';
  const date = items[0]?.rdkDate || doc.document_date;
  return [`--- halaman 1/${doc.pages} ---`, 'OTORITAS JASA KEUANGAN', '', 'KEPUTUSAN', 'RAPAT DEWAN KOMISIONER', krdkNo(doc), krdkDay(date), '',
    `Topik: ${items[0]?.topic || doc.topic}`, '', 'Keputusan:', krdkKeputusan(doc), '', 'Arahan:', 'Dewan Komisioner memberikan arahan kepada:',
    ...items.map((it, i) => `${i + 1}. ${krdkAddr(it)} untuk ${krdkLc(it.arahan).replace(/\.$/, '')}.`), '',
    'Ditetapkan di Jakarta,', `Pada tanggal ${fmtDateLong(date)}`, '', 'Pemimpin Rapat', 'KETUA DEWAN KOMISIONER'].join('\n');
}
function krdkInfoHTML(doc) {
  if (!isKrdkDoc(doc) || doc.ocr_status !== 'Selesai') return '';
  return `<div class="dl span-2"><dt>Keputusan (konteks, bukan poin tindak lanjut)</dt><dd>${esc(krdkKeputusan(doc))}</dd></div>
    <div class="dl"><dt>Pemimpin Rapat</dt><dd>Ketua Dewan Komisioner</dd></div>`;
}
/** Dipanggil setelah strukturisasi LLM untuk naskah KRDK. */
function applyKrdkStructure(doc, items, log = () => { }) {
  if (!isKrdkDoc(doc)) return;
  items.forEach(it => { it.addressee = krdkAddressee(it.satker, it.bidang); });
  doc._krdkKeputusan = krdkKeputusan({ ...doc, extraction: { items } });
  log('[llm] Bagian KEPUTUSAN dicatat sebagai konteks · poin tindak lanjut diambil dari bagian ARAHAN', true);
  items.forEach((it, i) => log(`[llm]  #${i + 1} penerima "${it.addressee}" → ${it.satker ? satkerShort(it.satker) : 'tingkat bidang, satker perlu dipetakan MRDK'}`));
}
