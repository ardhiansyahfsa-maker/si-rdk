# SI-RDK (Prototype)

Aplikasi web statis (HTML, CSS, JavaScript) tanpa proses build.

## Deploy di Render
- New + → **Static Site** → pilih repo ini
- Branch: `main`
- Build Command: kosongkan (atau `echo ok`)
- Publish Directory: `.`

Catatan: data aplikasi tersimpan di localStorage browser masing-masing pengguna.

## Integrasi SI-GRC (simulasi)
Penugasan **strategis berdampak OJK-wide** dialirkan ke SI-GRC sebagai input profil risiko satker pengampu melalui 4 tahap:
1. **Usulan MRDK** (admin) – klasifikasi strategis, kategori risiko, alasan dampak.
2. **Tanggapan Satker** (pemilik risiko) – setuju / keberatan + catatan mitigasi.
3. **Pengiriman MRDK** – ke kotak validasi SI-GRC; keberatan satker / pengembalian wajib dijustifikasi.
4. **Validasi SI-GRC** (fungsi manajemen risiko, akun `grc` / `grc123`) – terima atau kembalikan; menetapkan kategori & level yang dicatat.

Hanya input yang diterima validator yang tercatat di profil risiko. Menu: **Integrasi → Integrasi SI-GRC**. Kontrak data: `grcPayload()` di `js/grc.js`.
