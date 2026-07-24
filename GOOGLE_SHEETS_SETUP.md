# Menyambungkan INO ERP ke Google Sheets

Aplikasi ini defaultnya menyimpan data di `localStorage` browser (mode lama,
tampilan sama persis). Kalau kamu isi `VITE_SHEETS_API_URL`, aplikasi otomatis
membaca & menulis data ke Google Sheets kamu, dan localStorage jadi cache
offline saja. Tidak ada perubahan tampilan.

## 1. Pasang Apps Script di Google Sheet kamu

1. Buka Google Sheet yang mau dipakai sebagai database.
2. Menu **Extensions > Apps Script**.
3. Hapus isi default di `Code.gs`, lalu paste isi file
   `google-apps-script/Code.gs` dari repo ini.
4. Klik **Deploy > New deployment**.
5. Pilih tipe **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
6. Klik **Deploy**, izinkan akses saat diminta.
7. Copy **Web app URL** yang muncul (bentuknya
   `https://script.google.com/macros/s/XXXXX/exec`).

> ⚠️ **Catatan keamanan**: "Anyone" berarti siapa pun yang tahu URL ini bisa
> baca/tulis data. Ini setara dengan login di aplikasi sekarang yang juga
> masih di sisi browser (belum ada autentikasi server). Kalau nanti mau
> lebih aman, itu pekerjaan terpisah (butuh token/autentikasi di Apps
> Script) — kasih tahu saya kalau mau lanjut ke situ.

## 2. Sambungkan ke aplikasi React

1. Copy `.env.example` jadi `.env.local`.
2. Isi:
   ```
   VITE_SHEETS_API_URL="https://script.google.com/macros/s/XXXXX/exec"
   ```
3. Jalankan `npm run dev` seperti biasa (atau build ulang kalau sudah deploy).

Setiap kali ada perubahan data (tambah produk, buat PO, dll), aplikasi akan
otomatis mengirim ke Google Sheets (sheet baru bernama `AppState` akan
terbentuk otomatis). Saat aplikasi dibuka, data terbaru dari Sheets ditarik
sekali di awal.

## 3. Migrasi data lama (opsional)

Kalau kamu sudah punya data tersimpan di localStorage (dari pemakaian
sebelumnya) dan mau dipindah ke Sheets: buka aplikasi dulu **sebelum**
mengisi `VITE_SHEETS_API_URL`, lalu setelah diisi dan dibuka ulang, klik
sembarang tombol simpan di tiap modul satu-satu (produk, customer, dst) agar
data ke-push ke Sheets. Kalau datanya banyak dan mau sekali jalan, bilang ke
saya — saya bisa buatkan skrip migrasi kecil.
