# SI-RDK Terintegrasi (Prototype)

Sistem Informasi Rapat Dewan Komisioner Dashboard Pemantauan Strategis.

Aplikasi web statis (HTML, CSS, JavaScript) tanpa proses build.

## Deploy di Render
- New + → **Static Site** → pilih repo ini
- Branch: `main`
- Build Command: kosongkan (atau `echo ok`)
- Publish Directory: `.`

Catatan: data aplikasi tersimpan di localStorage browser masing-masing pengguna.

## Hak akses
Tiga peran: **Admin MRDK** (`admin` / `admin123`), **Satker** (`satker` / `satker123`), **Pimpinan** (`viewer` / `viewer123`).

## Rekap & Laporan
Menu **Monitoring → Rekap & Laporan** (Admin MRDK, Pimpinan): rekap bertingkat **9 bidang OJK → satuan kerja**
yang dihasilkan langsung dari data SI-RDK Terintegrasi.
- Posisi data: hari ini, akhir TW, atau tanggal tertentu.
- Basis progres: **terverifikasi MRDK** (default; update terakhir yang disetujui) atau dilaporkan satker.
- Ekspor Excel 3 sheet: *Rekap Bidang & Satker*, *Rekap Bidang*, *Rincian Penugasan*; juga CSV dan cetak.

## Prioritas & Trajectory
Menu **Monitoring → Prioritas & Trajectory**:
1. **Admin MRDK** menetapkan **Urgensi** dan **Dampak** (Tinggi/Sedang/Rendah) → kuadran P1 Kritis · P2 Tinggi · P3 Sedang · P4 Rendah.
2. **Satker** mengonfirmasi, atau mengajukan penyesuaian (MRDK menetapkan final).
3. Setelah dikonfirmasi, **Satker** menyusun **trajectory 4 triwulan** (TW I–IV tahun takwim): target progres kumulatif + tahapan/keluaran; TW IV = 100%; TW yang berakhir sebelum tanggal RDK otomatis 0%.
4. **Admin MRDK** menyetujui atau mengembalikan trajectory.

Setelah disetujui, progres dibandingkan dengan target TW terakhir yang telah berakhir → *Sesuai Trajectory* / *Tertinggal* / *Selesai*.

## Integrasi SI-GRC (simulasi)
Penugasan **strategis berdampak OJK-wide** dialirkan ke SI-GRC sebagai input profil risiko satker pengampu:
1. **Penandaan strategis** – Admin MRDK (SI-RDK).
2. **Kirim ke SI-GRC** – Admin MRDK (SI-RDK).
3. **Pengelompokan risiko & input profil risiko satker** – Admin SI-GRC (di SI-GRC).
4. **Konfirmasi Risk & Quality Officer satker** – di SI-GRC → **Selesai**.

Tahap 3–4 terjadi di SI-GRC; SI-RDK hanya menerima status baliknya. Untuk demo, Admin MRDK dapat menekan
**Simulasi SI-GRC** untuk menghasilkan status balik tersebut. Kontrak data: `grcPayload()` di `js/grc.js`.
