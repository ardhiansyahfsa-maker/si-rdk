# SI-RDK Terintegrasi (Prototype)

Sistem Informasi Rapat Dewan Komisioner Dashboard Pemantauan Strategis.

Aplikasi web statis (HTML, CSS, JavaScript) tanpa proses build.

## Deploy di Render
- New + → **Static Site** → pilih repo ini
- Branch: `main`
- Build Command: kosongkan (atau `echo ok`)
- Publish Directory: `.`

Catatan: data aplikasi tersimpan di localStorage browser masing-masing pengguna.

## Status pelaksanaan
Tiga status (selaras SI-RDK eksisting): **Menunggu Respon** (progres 0%), **Dalam Proses** (1–99%), **Selesai** (100%).
Label penanda tambahan (bukan status): **Terlambat** (otomatis bila target terlewati dan progres < 100%),
**Menunggu Arahan** (ditandai satker), **Menunggu Verifikasi** (update satker belum direview MRDK).

## Hak akses
Tiga peran: **Admin MRDK** (`admin` / `admin123`), **Satker** (`satker` / `satker123` — DPUK; juga `satker.dpw1`, `satker.dlik`), **Pimpinan** (`viewer` / `viewer123`).

Master data memuat 9 bidang dan 51 satuan kerja OJK.

## Rekap & Laporan
Menu **Monitoring → Rekap & Laporan** (Admin MRDK, Pimpinan): rekap bertingkat **9 bidang OJK → satuan kerja**
yang dihasilkan langsung dari data SI-RDK Terintegrasi.
- Posisi data: hari ini, akhir TW, atau tanggal tertentu.
- Basis progres: **terverifikasi MRDK** (default; update terakhir yang disetujui) atau dilaporkan satker.
- Ekspor **PDF** (A4 landscape, kop OJK, nomor halaman; berisi rekap bidang & satker + rincian per bidang).
- Ekspor Excel 3 sheet: *Rekap Bidang & Satker*, *Rekap Bidang*, *Rincian Penugasan*; juga CSV dan cetak.

## Laporan PDF untuk Dewan Komisioner
Tombol **Laporan PDF untuk DK** di Executive Dashboard menghasilkan laporan A4 berisi: ringkasan eksekutif;
(1) status penyelesaian dengan 2 status (Dalam Proses · Selesai) dan rincian per bidang; (2) penugasan yang
mendekati jatuh tempo (≤ 30 hari), terlambat, dan tertinggal trajectory; (3) pemisahan arahan RDK/DK vs hasil
rapat dengan Komisi XI; (4) statistik kategori atensi serta daftar Atensi Khusus dan Atensi Tinggi.

## Atensi & Trajectory
Menu **Monitoring → Atensi & Trajectory**. *Seluruh arahan DK wajib ditindaklanjuti; kategori atensi menunjukkan
intensitas pemantauan oleh MRDK, bukan tingkat kepentingan arahan.*
1. **Admin MRDK** mencatat atribut faktual: **horizon** (Segera ≤ 3 bulan sejak arahan / Tahun Berjalan / Berkelanjutan)
   dan **cakupan** (OJK-wide / Lintas Satker / Satu Satker).
   Kategori diturunkan otomatis: **Atensi Khusus**, **Atensi Tinggi**, **Pemantauan Reguler**.
2. **Satker** mengonfirmasi atau mengajukan koreksi atribut (MRDK menetapkan final).
3. Satker menyusun **trajectory 4 triwulan** (TW I–IV tahun takwim), lalu **Admin MRDK** menyetujui atau mengembalikan.

## Integrasi SIPENA — disposisi ADK (simulasi)

Berlaku **khusus Laporan Singkat Raker/RDP dengan Komisi XI DPR RI**. Arahan RDK (Risalah RDK, ND Arahan DK) tidak memakai disposisi.

1. **Tarik otomatis** — laporan singkat beserta disposisi ADK ditarik dari SIPENA (tombol *Tarik dari SIPENA* di Dokumen Rujukan; produksi: penarikan terjadwal ke `GET /api/sipena/v1/naskah?jenis=lapsing-dpr`). Dokumen tercatat dengan pengunggah "SIPENA (otomatis)" dan nomor agenda SIPENA.
2. **Satker dari disposisi** — LLM hanya memecah laporan singkat menjadi poin-poin. Satker penanggung jawab ditetapkan dari tujuan disposisi ADK; usulan LLM ditampilkan sebagai pembanding saja. Jika satu disposisi ditujukan ke beberapa satker, MRDK memetakan tiap poin ke salah satu tujuan.
3. **Penyimpangan wajib beralasan** — penugasan ke satker di luar tujuan disposisi (saat Save to Register maupun Ubah Penugasan) wajib disertai alasan, ditandai merah di drawer, dan dicatat di audit trail ("Penugasan di Luar Disposisi").
4. **Ketertelusuran** — nomor disposisi tampil di drawer rencana aksi, dapat dicari/difilter di Register (filter *Disposisi SIPENA*), ikut di export Register dan Rekap (kolom *Disposisi ADK (SIPENA)*), serta di Laporan PDF untuk DK bagian 3.b (Komisi XI).

Catatan prototipe: label "ADK Bidang X" dan nomor disposisi (DISP-…) bersifat contoh; format sebenarnya mengikuti SIPENA.

## Integrasi SI-GRC (simulasi)
Penugasan **strategis berdampak OJK-wide** dialirkan ke SI-GRC sebagai input profil risiko satker pengampu:
1. **Penandaan strategis** – Admin MRDK (SI-RDK).
2. **Kirim ke SI-GRC** – Admin MRDK (SI-RDK).
3. **Pengelompokan risiko & input profil risiko satker** – Admin SI-GRC (di SI-GRC).
4. **Konfirmasi Risk & Quality Officer satker** – di SI-GRC → **Selesai**.

Tahap 3–4 terjadi di SI-GRC; SI-RDK hanya menerima status baliknya. Untuk demo, Admin MRDK dapat menekan
**Simulasi SI-GRC** untuk menghasilkan status balik tersebut. Kontrak data: `grcPayload()` di `js/grc.js`.
