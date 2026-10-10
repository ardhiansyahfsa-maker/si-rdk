# SI-RDK (Prototype)

Aplikasi web statis (HTML, CSS, JavaScript) tanpa proses build.

## Deploy di Render
- New + → **Static Site** → pilih repo ini
- Branch: `main`
- Build Command: kosongkan (atau `echo ok`)
- Publish Directory: `.`

Catatan: data aplikasi tersimpan di localStorage browser masing-masing pengguna.

## Integrasi SI-GRC (simulasi)
Penugasan yang diklasifikasikan **Strategis · berdampak OJK-wide** dialirkan ke SI-GRC sebagai input
profil risiko satker pengampu tindak lanjut. Menu: **Integrasi → Integrasi SI-GRC**; klasifikasi diatur
dari detail rencana aksi (bagian "Integrasi SI-GRC"). Kontrak data: `grcPayload()` di `js/grc.js`.
