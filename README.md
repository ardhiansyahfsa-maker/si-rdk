# SI-RDK Terintegrasi (Prototype)

Sistem Informasi Rapat Dewan Komisioner Dashboard Pemantauan Strategis.

Aplikasi web statis (HTML, CSS, JavaScript) tanpa proses build.

## Deploy di Render
- New + → **Static Site** → pilih repo ini
- Branch: `main`
- Build Command: kosongkan (atau `echo ok`)
- Publish Directory: `.`

Catatan: data aplikasi tersimpan di localStorage browser masing-masing pengguna.

## Integrasi SI-GRC (simulasi)
Penugasan **strategis berdampak OJK-wide** dialirkan ke SI-GRC sebagai input profil risiko satker pengampu:
1. **Penandaan strategis** – Admin MRDK (SI-RDK).
2. **Kirim ke SI-GRC** – Admin MRDK (SI-RDK).
3. **Pengelompokan risiko & input profil risiko satker** – Admin SI-GRC (akun demo `grc` / `grc123`).
4. **Konfirmasi Risk & Quality Officer satker** – di SI-GRC (akun demo `rqo` / `rqo123`, Departemen Pengawasan Bank) → **Selesai**.

Tahap 3–4 terjadi di SI-GRC; SI-RDK menerima status baliknya. Menu: **Integrasi → Integrasi SI-GRC**. Kontrak data: `grcPayload()` di `js/grc.js`.
