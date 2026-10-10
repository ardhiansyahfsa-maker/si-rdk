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

## Integrasi SI-GRC (simulasi)
Penugasan **strategis berdampak OJK-wide** dialirkan ke SI-GRC sebagai input profil risiko satker pengampu:
1. **Penandaan strategis** – Admin MRDK (SI-RDK).
2. **Kirim ke SI-GRC** – Admin MRDK (SI-RDK).
3. **Pengelompokan risiko & input profil risiko satker** – Admin SI-GRC (di SI-GRC).
4. **Konfirmasi Risk & Quality Officer satker** – di SI-GRC → **Selesai**.

Tahap 3–4 terjadi di SI-GRC; SI-RDK hanya menerima status baliknya. Untuk demo, Admin MRDK dapat menekan
**Simulasi SI-GRC** untuk menghasilkan status balik tersebut. Kontrak data: `grcPayload()` di `js/grc.js`.
