# PRD — Hardening Keamanan & Integritas Data INO ERP (+ POS "re-feel")

| | |
|---|---|
| Versi | 1.0 — 11 Okt 2026 |
| Repo | `Hermit27-art/ino-erp` (branch `main`) |
| Eksekutor | Antigravity (agent) |
| Dasar | Audit statis seluruh sumber (belum dijalankan terhadap Sheet/deployment nyata) |
| Status | Fase 0–2 siap dikerjakan. Fase 3 menunggu Decision Log (§4). |

---

## 0. Aturan eksekusi untuk Antigravity (baca dulu, wajib)

1. **Jangan menyentuh Spreadsheet atau deployment produksi.** Semua pengujian memakai *salinan* Sheet dan deployment GAS terpisah (W0.1).
2. **Satu work item = satu commit kecil.** Setelah tiap item jalankan `npm run lint` dan `npm run build`; tempel hasilnya di pesan commit.
3. **Jangan menulis ulang `src/App.tsx`** (9.451 baris). Sentuh hanya fungsi yang disebut di work item.
4. **Tidak ada dependency baru**, kecuali `vitest` sebagai devDependency di W4.4.
5. Jika kolom *Jawaban* di Decision Log (§4) kosong, pakai kolom **Default**, beri komentar `// DECISION-xx: default dipakai` di kode, lalu daftar semuanya di laporan akhir.
6. **Dilarang menjalankan** `resetSemuaData`, `runDummyCleanupMigration`, atau `saveAll*` terhadap data nyata.
7. Ragu soal logika uang/stok → **berhenti dan tanya**, jangan menebak.
8. Prinsip: YAGNI. Pakai fitur bawaan (`LockService`, `CacheService`, `PropertiesService`) sebelum membuat abstraksi. Menghapus kode mati lebih baik daripada menambah kode. Tandai simplifikasi sengaja dengan komentar `ponytail:`.
9. **Tidak boleh malas** pada: validasi input di trust boundary (server GAS), error handling yang mencegah kehilangan data, keamanan, dan accessibility.

---

## 1. Ringkasan temuan

| Sev | ID | Temuan | Dampak |
|---|---|---|---|
| 🔴 Kritis | S1 | `saveAppSettings` tanpa auth, menimpa seluruh sheet Settings; `getAppSettings` tanpa auth mengembalikan `login_password` (hash superadmin); `login()` menerima hash itu langsung. Wizard "Buat Perusahaan Baru" bisa dibuka dari layar login. | Siapa pun dengan URL bisa jadi Superadmin atau menimpa kredensial. |
| 🔴 Kritis | S2 | `resetSemuaData()` bisa dipanggil lewat `google.script.run` tanpa auth. Komentar kodenya salah mengira fungsi ini tak bisa dipicu dari luar. | Seluruh Products, Customers, SalesOrders, CashLedger bisa dikosongkan. |
| 🔴 Kritis | D1 | Setiap aksi (kirim SO, terima PO, bayar, retur, void) memodifikasi salinan memori klien lalu `saveAllProducts/Customers/CashLedger/...` **menimpa seluruh tabel**. 52 pemanggilan `saveAll*` tanpa `await` vs 13 dengan `await`. | Lost update: penjualan POS terhapus oleh snapshot lama user ERP; kegagalan simpan senyap. |
| 🟠 Tinggi | S3 | Semua `get*`, `getProdukList`, `getCustomerList`, `getRiwayatHariIni`, `getRingkasanDashboard` tanpa token. | HPP, piutang, hutang, omzet terbuka. |
| 🟠 Tinggi | S4 | Role hanya membatasi **menu UI** (`allowedRoles`); server hanya cek "token valid". | Kasir bisa memanggil `deleteProduct`, `saveAll*`, dsb. langsung. |
| 🟠 Tinggi | S5 | Kredensial = SHA-256 tanpa salt dari sisi klien (hash = password-equivalent). Tanpa rate limit. Default PIN `1234`/`5678` plaintext di kode (`App.tsx:504`). User tim hanya di `localStorage`, tidak pernah ditulis ke sheet `Users` yang dibaca `login()`. | Pass-the-hash, brute force; Admin/Kasir tak bisa login di mode GAS kecuali sheet diisi manual. |
| 🟠 Tinggi | S6 | `simpanTransaksiPenjualan` memercayai `total`, `harga`, `qty`, `kasir` dari klien; `decrementStock_` meng-clamp ke 0 (`Math.max`); qty negatif menambah stok. | Harga/stok bisa dimanipulasi; selisih stok hilang diam-diam. |
| 🟠 Tinggi | D2 | POS dan ERP berbeda aturan bayar: POS menandai semua metode (termasuk "Piutang") **Lunas** dan mencatat kas masuk ke Bank tanpa menaikkan piutang; ERP menandai semua selain "Tunai" sebagai **Belum Lunas**. | Laporan kas/piutang salah. |
| 🟠 Tinggi | D3 | `getSalesOrders` menimpa `items` dengan `itemsBySO[id] \|\| []`, sedangkan POS menyimpan item sebagai JSON di header. | Item order POS tak terlihat di ERP; void SO POS tidak mengembalikan stok. |
| 🟠 Tinggi | D4 | Skema `setup_sheets.gs` ≠ field yang ditulis kode (mis. `supplier`, `metode`, `statusBayar`, `totalPaid`, `platform`, `qtyShipped`, `qtyReturned`, `hpp`; Consignments sama sekali beda). `saveItemToSheet` membuang field tak dikenal tanpa error. **Berlaku jika Sheet live memakai skema itu (lihat DEC-13).** | Data hilang senyap saat simpan. |
| 🟡 Sedang | D5 | Void SO tidak membalik kas; Void atas Draft **menambah** stok (padahal tak pernah dikurangi); void setelah retur menambah dua kali; piutang hanya dikurangi jika status `Belum Lunas`, bukan `Cicilan`. Retur atas SO lunas tak mencatat refund. | Stok & kas menyimpang. |
| 🟡 Sedang | D6 | Tanggal di klien memakai `toISOString()` (UTC) di 22 tempat, server memakai GMT+8. Tanggal kolom Sheet bisa otomatis jadi objek `Date`, memecah perbandingan `so.tanggal === today`. | Transaksi 00:00–08:00 WITA tercatat tanggal kemarin; dashboard "hari ini" meleset. |
| 🟡 Sedang | D7 | ID dokumen = `randomUUID().slice(0,4)` (65.536 kemungkinan/hari, 6 tempat) dan penyimpanan bersifat *upsert by id*. | Tabrakan ID menimpa dokumen lain tanpa pesan. |
| 🟡 Sedang | B1–B6 | PPN: setting 11% (`App.tsx:466`) tapi perhitungan hardcode `0.12` (2 di App, 4 di tab). HPP: ledger stok memakai Moving Average/FIFO, Laba-Rugi memakai `product.hpp` manual yang tak pernah diperbarui saat barang masuk; fallback `12000` di 7 tempat. Piutang/hutang dikaitkan via **nama** (`c.nama === so.pelanggan`). `kasir`/`operator` di-hardcode `'Administrator'`. Draft SO tak punya jalur rilis. Tidak ada konversi satuan (kg↔gram) dan POS membandingkan `'ml'` sementara ERP `'Ml'`. | Angka laporan tak konsisten. |
| 🟢 Rendah | H | `README.md` & `GOOGLE_SHEETS_SETUP.md` menjelaskan arsitektur lain (`VITE_SHEETS_API_URL`, `AppState`, `GEMINI_API_KEY`) yang tidak ada di kode. `deploy.yml` men-deploy ke GitHub Pages yang berjalan tanpa GAS = mode `localStorage` saja. 20+ berkas sampah (lihat W4.1). `xlsx@0.18.5` rentan (prototype pollution, ReDoS, tanpa patch di npm). BOM, riwayat produksi, kategori, satuan, prefix, user hanya di `localStorage`. | Kebingungan, data hilang antar-perangkat. |

---

## 2. Arsitektur saat ini (fakta)

- **Frontend**: React 19 + Vite + `vite-plugin-singlefile` → satu `index.html` yang dihosting di Google Apps Script. Komunikasi lewat `google.script.run`.
- **`src/App.tsx`**: satu fungsi `App()` ±9.000 baris, 162 `useState`, 130 `any`. Tab yang sudah diekstrak: `PurchaseOrderTab`, `SalesOrderTab`, `SettingsTab`, `ReportsTab`, `CashLedgerTab`. **State & logika bisnis tetap di `App()`**.
- **Backend**: `Code_ERP.gs` (±1.200 baris). Google Sheets sebagai DB. PO/SO = sheet header + sheet item (`noPO`/`noSO`). Kunci primer hanya string, upsert by `id`.
- **POS**: `index_POS.html` (brand "re-feel — Zero Waste Refill Store · Bali"), dibuka lewat `?app=pos`, menjual per Gram/ml dengan tare/netto.
- **Sesi**: token UUID di sheet tersembunyi `_Sessions`, kedaluwarsa 24 jam. ERP menyimpan token di `sessionStorage`, POS di `localStorage`.
- **Mode lokal** (`npm run dev` / GitHub Pages): tanpa GAS, seluruh data di `localStorage`.
- **Kode mati**: `src/stores/useAppStore.ts` (zustand; tak ada yang mengimpor), `src/utils/migration.ts` (`runDummyCleanupMigration` menghapus transaksi sebelum 2026-06-01; tak dipanggil), jalur edit SO (`setIsEditingSo(true)` tak pernah dipanggil).
- **Kesehatan build**: `tsc --noEmit` 0 error (tidak bermakna karena `any` meluas). `npm audit --omit=dev`: 7 kerentanan (5 high), termasuk `xlsx` tanpa perbaikan.
- **Tidak ditemukan** rahasia (API key, URL deployment GAS, token) di sumber maupun `.git/config`.

---

## 3. Sasaran & non-sasaran

**Sasaran**
1. Tak ada lagi jalur yang memungkinkan pihak tak berwenang membaca/menimpa/menghapus data.
2. Stok, piutang, hutang, dan saldo kas **hanya berubah lewat operasi server yang atomik** (satu sumber kebenaran), sehingga dua pengguna bersamaan tidak saling menimpa.
3. POS dan ERP memakai aturan pembayaran, struktur data, dan vocabulary status yang sama.
4. Tidak ada data yang hilang senyap (field dibuang, simpan gagal tanpa pesan).

**Non-sasaran (sengaja, ponytail)**
- Tidak migrasi ke database lain (kecuali DEC-01 menunjukkan skala yang tak muat di Sheets — lihat Fase 5).
- Tidak menulis ulang UI/`App.tsx`, tidak mengganti state management, tidak menambah fitur baru.
- **Tidak ada modul keuangan/akuntansi** (biaya umum, gaji, sewa, aset tetap, neraca, laba bersih). Itu aplikasi terpisah; di sini cukup skema Sheet yang stabil dan terdokumentasi agar bisa disambung kelak.
- Tidak multi-tenant (kecuali DEC-01 menjawab sebaliknya).
- Tidak mengganti kerangka UI atau menambah library.

---

## 4. Decision Log (pemilik mengisi kolom *Jawaban*)

Kolom **Default** dipakai jika *Jawaban* kosong. Fase 3 baru dikerjakan setelah DEC terkait terjawab atau default disetujui.

| ID | Pertanyaan kebijakan | Default | Jawaban |
|---|---|---|---|
| DEC-01 | Satu bisnis atau multi-bisnis? Skala? Sheets cukup? | Satu bisnis, Sheets cukup | **Khusus satu perusahaan; proyek portofolio pemilik.** Tidak perlu multi-tenant. Wizard 'Buat Perusahaan Baru' hanya untuk setup pertama (dikunci server oleh S1). |
| DEC-02 | QRIS / Transfer / Debit: uang langsung masuk (Lunas, akun Bank) atau piutang? Hanya "Piutang"/"Tempo" yang jadi piutang? | Tunai/QRIS/Transfer/Debit = Lunas; hanya Piutang/Tempo = piutang | |
| DEC-03 | PPN: aturan & tarif. | User bebas memilih | Pemilik **tidak yakin aturannya** → aplikasi bersikap netral dan **memberi kebebasan ke user**: tidak ada aturan pajak yang dipaksakan. Usaha PKP dengan fasilitas bebas PPN (jenis fasilitas dikonfirmasi ke akuntan bila dipakai untuk pelaporan). |
| DEC-04 | Metode HPP resmi: Moving Average, FIFO, atau manual? | Moving Average, diperbarui saat penerimaan PO; HPP di-snapshot ke item SO saat dijual | Moving Average dulu (fokus). Opsi FIFO tetap ada di setting, tidak perlu diprioritaskan/diuji. |
| DEC-05 | Void/retur atas transaksi yang sudah dibayar: refund tunai, kredit toko, atau tak ada refund? Siapa yang berhak? Batas waktu? | Refund = entri kas pembalik; hanya Admin+; tanpa batas waktu (belum ada tutup buku) | **Void ≠ Retur.** Void = transaksi dibatalkan, tetap tercatat sebagai `Void` (siapa, kapan, alasan), **tidak dihitung** di laporan/dashboard/ranking/AR. Retur = barang kembali setelah dikirim/diterima. Berlaku untuk POS maupun SO/PO. Siapa yang boleh void: lihat DEC-15. |
| DEC-06 | Kapan kas keluar & hutang PO dicatat? | Saat barang diterima | **Alur: Pesan → Rilis → Terima → Bayar.** Pembayaran = peristiwa tersendiri; tanggal pembayaran opsional; status Sudah/Belum dibayar. PO yang langsung dibayar saat dipesan tetap berstatus Dirilis dengan kotak centang **'Sudah dibayar'**. Hutang timbul saat barang **diterima**, bukan saat rilis. *(Menggantikan perilaku lama.)* |
| DEC-07 | Konversi satuan. | Tidak ada konversi | **Tidak ada konversi satuan di aplikasi.** Satuan per produk diatur user (mis. ml, liter, kg, jerigen); konversi diserahkan ke user/akuntan. |
| DEC-08 | Stok boleh negatif / jual saat stok kosong? | Tidak; server menolak | Tidak boleh negatif. |
| DEC-09 | Alur SO: perlu pengiriman bertahap (kirim sebagian, stok berkurang saat kirim) atau SO rilis = stok keluar langsung? Draft SO dirilis bagaimana? | Rilis = stok keluar langsung; Draft bisa di-rilis atau dihapus; hapus jalur "Terkirim Sebagian" | SO bertahap seperti PO: Draft → Rilis (Menunggu Pengiriman) → Kirim (boleh parsial; stok berkurang saat kirim) → Bayar. POS tetap checkout instan. |
| DEC-10 | Matriks peran. Siapa boleh melihat HPP/laba? | Kasir: POS + lihat produk/pelanggan (tanpa HPP); Admin: semua transaksi, void/retur, tanpa Settings/Users/Reset; Superadmin: semua | Setuju default. |
| DEC-11 | Akses web app GAS: "Anyone" atau terbatas akun Google/domain? Siapa mengelola user tim? | Anggap terburuk "Anyone"; hanya Superadmin mengelola user | Anyone. Setuju default. |
| DEC-12 | Fitur yang benar-benar dipakai: Konsinyasi, BOM/Produksi, Wastage, `export_code`, "Celah Import", multi-platform (Tokopedia dll.). | Yang tak dipakai dihapus dari UI | Konsinyasi tidak dipakai → hapus. Import dipakai → pertahankan (Superadmin). Platform: jangan diubah sekarang. Nama barang/BOM/platform sengaja boleh dikelola & ditarik langsung di Spreadsheet sebagai data master (bukan transaksi). |
| DEC-14 | Ruang lingkup aplikasi & definisi laba. | Aplikasi = operasional | **Aplikasi ini khusus operasional** (penjualan, pembelian, stok, piutang/hutang, saldo akun dari transaksi). Keuangan (biaya umum, gaji, sewa, aset tetap, neraca) = aplikasi terpisah yang nanti disambung. Maka laba di dashboard = **Laba Kotor** (Penjualan − HPP); tidak ada Laba Bersih. |
| DEC-15 | Void POS: siapa yang boleh? | Kasir boleh void langsung dengan alasan wajib | **Void POS diizinkan dan fleksibel**; wajib tercatat (Void Log), tidak mengubah angka apa pun di ERP. *Tafsiran: kasir boleh langsung void; kontrolnya Void Log, bukan persetujuan.* Void SO/PO tetap Admin+. |
| DEC-16 | Akun & metode pembayaran. | Diatur di Settings | **Diatur di Settings (database):** daftar akun (Kas Kasir, bank A/B/C, …); **tiap akun punya daftar metode pembayaran** yang bisa ditambah user (mis. BCA: Transfer, QRIS, Debit). Tiap mutasi harus mencatat akun **dan** metode dengan jelas. |
| DEC-13 | Header Sheet live. | Anggap = `setup_sheets.gs` | **Pemilik tidak perlu menyalin.** Antigravity menjalankan `auditSheetHeaders()` pada salinan Sheet (W0.3). |

---

## 5. Rencana kerja

Urutan wajib: Fase 0 → 1 → 2 → 3 → 4. Fase 1 adalah **gerbang go-live**: jangan buka akses ke pengguna nyata sebelum S1–S6 lolos.

### Fase 0 — Prasyarat

| ID | Pekerjaan | Kriteria terima |
|---|---|---|
| W0.1 | **(Pemilik)** Salin Spreadsheet (File → Buat salinan) dan buat deployment GAS uji yang terhubung ke salinan itu. Antigravity hanya boleh menguji ke sini. | URL uji tersedia; Sheet produksi tidak disentuh. |
| W0.2 | Buat branch `hardening`. Catat baseline: `npm ci && npm run lint && npm run build` lolos. | Hasil baseline tercatat di commit pertama. |
| W0.3 | Jalankan `auditSheetHeaders()` (fungsi baru, baca-saja) di salinan Sheet: bandingkan header tiap sheet dengan kolom yang dibutuhkan kode (`types.ts` + penulisan di `Code_ERP.gs`); laporkan kolom hilang/berlebih dan sheet hilang. Tempel hasilnya di laporan. | Laporan tersedia sebelum D4. |

### Fase 1 — Keamanan (gerbang go-live)

Semua berkas: `Code_ERP.gs`, `src/authService.ts`, `src/dataService.ts`, `src/App.tsx` (login/wizard), `src/tabs/SettingsTab.tsx`, `index_POS.html`.

**S1 — Kunci Settings & wizard** *(Kritis)*
- Pecah Settings menjadi *publik* (whitelist: `nama_toko`, `tipe_bisnis`, `alamat_toko`, `telp_toko`, `kota_toko`, `mata_uang`, `ppn_rate`, `metode_hpp_default`) dan *rahasia* (`login_username`, `login_password` — **pindahkan keluar dari sheet Settings**, simpan sebagai baris Superadmin di sheet `Users`).
- `getAppSettings()` hanya mengembalikan kunci publik dan butuh token valid. Tambah `getBootstrapStatus()` tanpa token yang hanya mengembalikan `{initialized: boolean}`.
- `saveAppSettings(token, list)`: butuh peran Superadmin, hanya menerima kunci whitelist, **tidak** memakai `clearContents` (update per kunci di bawah lock).
- Wizard "Buat Perusahaan Baru": server hanya mengizinkan jika `initialized === false`; selain itu butuh token Superadmin. Sembunyikan tombolnya di login jika sudah terinisialisasi.
- *Terima*: (a) `getAppSettings()` tanpa token → `UNAUTHORIZED`; (b) dengan token Kasir tak pernah memuat `login_password`; (c) `saveAppSettings` tanpa token Superadmin ditolak dan sheet tak berubah; (d) pada sistem terinisialisasi wizard ditolak server.

**S2 — Kunci `resetSemuaData`** *(Kritis)*
- Tetap bernama `resetSemuaData` (agar muncul di dropdown Run editor), tetapi tolak jalan kecuali Script Property `ALLOW_RESET === 'true'`; hapus property itu otomatis setelah selesai. Salin semua sheet ke `_Backup_<sheet>_<timestamp>` sebelum menghapus. Cakup juga `Suppliers`/`PurchaseOrders`/`PurchaseOrderItems`/`SalesOrderItems`/`Consignments`/`InventoryLog` (saat ini hanya 4 sheet: Products, Customers, SalesOrders, CashLedger).
- Perbarui komentar kode yang menyesatkan.
- *Terima*: memanggil `google.script.run.resetSemuaData()` dari konsol browser → error, tak ada data berubah.

**S3 — Auth di semua endpoint baca** *(Tinggi)*
- Tambah parameter `token` + `requireAuth_` ke semua `get*`, `getProdukList`, `getCustomerList`, `getRiwayatHariIni`, `getRingkasanDashboard`. Perbarui `dataService.ts` dan `index_POS.html`.
- Untuk peran Kasir: hapus `hpp`, `piutang`, `hutang` dari respons (sesuai DEC-10).
- *Terima*: setiap endpoint tanpa token → `UNAUTHORIZED`.

**S4 — Peran di server** *(Tinggi)*
- Tambah `requireRole_(token, [...peran])` dan terapkan sesuai matriks DEC-10 ke setiap fungsi tulis, termasuk `sendEmailReport`, void, retur, opname, `saveAll*`, user & settings.
- *Terima*: tes manual dengan token Kasir: `deleteProduct`, `saveAllProducts`, `saveAppSettings` ditolak; checkout POS tetap jalan.

**S5 — Kredensial & user** *(Tinggi)*
- Server menyimpan `HMAC-SHA256(salt_per_user + pepper, preHash)`; `pepper` di Script Properties. **Pertahankan SHA-256 di klien sebagai pre-hash** (tanpa perubahan UI) dan upgrade entri legacy saat login sukses pertama (tanpa paksa reset password).
- Rate limit login lewat `CacheService`: 5 gagal / 15 menit per username → tolak sementara.
- Hapus default `admin@toko.com/1234` dan `kasir@toko.com/5678` (`App.tsx:503-506`). Jangan pernah mengirim kolom `pin` ke klien.
- User tim: tambah endpoint Superadmin-only `listUsers`, `saveUser`, `deleteUser`, `resetPin` yang membaca/menulis sheet `Users` (tambahkan ke setup). Hubungkan `SettingsTab` ke endpoint ini (hapus penyimpanan `ino_setting_users` di `localStorage` pada mode GAS).
- Bersihkan baris `_Sessions` kedaluwarsa saat login. Pindahkan token POS dari `localStorage` ke `sessionStorage`.
- *Terima*: dump sheet `Users` tak memuat hash polos yang bisa dipakai login; 6 percobaan salah berturut-turut ditolak; user tim bisa dibuat dari UI lalu login.

**S6 — Validasi checkout POS di server** *(Tinggi)*
- Di `simpanTransaksiPenjualan`: ambil harga dari sheet Products (server), abaikan `harga`/`subtotal`/`total` dari klien kecuali ada izin diskon sesuai DEC-10; `qty` harus angka hingga > 0; SKU harus ada & aktif; stok cukup (tolak, **jangan clamp**, ikuti DEC-08); metode bayar ∈ whitelist; `kasir` diambil dari token, bukan payload; hitung total di server.
- Ganti `decrementStock_` agar melempar error jika stok tak cukup.
- *Terima*: payload dengan `total: 1`, qty negatif, SKU palsu, atau stok tak cukup → ditolak, tak ada baris yang tertulis.

**S7 — `sendEmailReport`** *(Sedang)*
- Hanya Admin+; penerima dibatasi ke email pemilik di Settings (atau allowlist); escape HTML pada `subject`/`body`; batas frekuensi.

**S8 — Dependensi & import** *(Sedang)*
- "Celah Import" (`SettingsTab`, tab `dev`) hanya Superadmin. Untuk `xlsx`: batasi parsing ke berkas milik Superadmin dan catat risiko; ganti ke build SheetJS terbaru yang dipublikasikan resmi jika tersedia tanpa dependency baru. Jalankan `npm audit fix` untuk `postcss`/`source-map-js`.

### Fase 2 — Integritas data

**D1 — Operasi delta server-side; hentikan `saveAll*` di jalur panas** *(Kritis)*
Tambahkan endpoint (semua di bawah `LockService`, semua menerima `opId` unik dari klien untuk idempotensi — simpan 6 jam di `CacheService`):
- `adjustStock(token, opId, [{sku, delta, ref, alasan}])` — baca stok *terkini* dari Sheet, hitung, tolak jika hasil < 0 (DEC-08), tulis.
- `adjustBalance(token, opId, 'customer'|'supplier', id, delta)` untuk piutang/hutang.
- `appendCashEntry(token, opId, entry)` — server memberi `id` dan menghitung `saldo` per akun; `deleteCashEntry` menghitung ulang saldo baris sesudahnya untuk akun itu.
- Opname: server menghitung `selisih = qtyFisik − stok_terkini` (jangan percaya `qtySistem` dari klien).
- `saveProduct`/`saveCustomer`/`saveSupplier` **mengabaikan** `stok`/`piutang`/`hutang` pada update (hanya boleh diisi saat insert).
- `saveAllProducts/Customers/Suppliers/SalesOrders/PurchaseOrders/CashLedger`: Superadmin-only, dan wajib membuat snapshot `_Backup_*` dulu. Dipakai hanya oleh import.
- Ganti semua pemanggil di `App.tsx` dan `src/tabs/*`: `submitPoReceipt`, `submitSoShipment`, `submitPoPayment`, `submitSoPayment`, `submitPoRetur`, `submitSoRetur`, `handleApprovePO`, `processSavePO`, `processSaveSO`, `handleVoidPO`, `handleVoidSO`, `handleStockOpnameConfirmAction`, entri kas manual, dan `CashLedgerTab`. Perubahan status dokumen memakai `saveSalesOrder`/`savePurchaseOrder` (upsert satu baris), bukan `saveAll*`.
- *Terima (tes konkurensi, wajib)*: Tab A (ERP) memuat produk X (stok 10). Tab B (POS) menjual 3 unit X. Tab A kemudian mengirim SO 1 unit X. **Stok akhir = 6**. Ulangi dengan dua tab ERP menerima PO bersamaan. Grep `saveAll(Products|Customers|Suppliers|CashLedger|SalesOrders|PurchaseOrders)` di `src/` hanya tersisa di alur import Superadmin.

**D2 — `await` + penanganan error + rollback UI** *(Kritis)*
- Semua pemanggilan simpan di `App.tsx`/tab harus di-`await` dalam `try/catch`; jika gagal, tampilkan toast error dan **kembalikan state** (atau muat ulang dari server). Hapus pola "update UI optimis tanpa menunggu".
- Tombol aksi dinonaktifkan selama request berjalan (cegah klik ganda).
- *Terima*: matikan jaringan/paksa error GAS di uji → UI menampilkan error dan tidak menampilkan data yang tak tersimpan.

**D3 — ID dan insert vs upsert** *(Sedang)*
- ID SO/PO/CSH/CUST/SUP dibuat **server** berurutan di bawah lock (pola `generateId_` yang sudah ada di POS: `PREFIX-YYYYMMDD-NNN`). Hapus 6 pemakaian `randomUUID().slice(0, 4)`.
- Pisahkan `create*` (gagal jika id sudah ada) dari `update*`.
- *Terima*: 20 pembuatan SO paralel menghasilkan 20 ID unik.

**D4 — Skema satu sumber & tanpa field hilang** *(Tinggi)*
- Buat satu konstanta `SCHEMA` di `Code_ERP.gs` yang dipakai `setup_sheets.gs` **dan** validasi runtime. `setupSheetsAndHeaders()` menjadi idempoten: menambah kolom yang kurang tanpa menghapus data.
- Selaraskan nama kolom dengan `types.ts` (atau tambahkan pemetaan eksplisit seperti `mapGasToReactProduct`) untuk **semua** entitas, termasuk: PO/SO (`supplier`, `metode`, `statusBayar`, `totalPaid`, `platform`, `returItems`), item (`qtyShipped`, `qtyReturned`, `qtyReceived`, `hpp`, `diskon`, `ppn`), `Consignments`, dan sheet baru `Users`, `BOMs`, `RiwayatProduksi`, `Settings`.
- `saveItemToSheet`/`saveAllToSheet`/`appendRowFromObject_`: **lempar error** jika objek punya kunci yang tak ada di header (jangan buang senyap).
- Kolom tanggal diformat teks (`'@'`) sebelum ditulis; `getSheetData` menormalkan objek `Date` menjadi `yyyy-MM-dd` (GMT+8).
- Hasil `auditSheetHeaders()` (W0.3) menjadi dasar migrasi: tambahkan kolom yang hilang tanpa menghapus data.
- Uji *round-trip* otomatis: simpan lalu baca tiap entitas; semua field harus kembali sama.
- *Terima*: round-trip lulus untuk semua entitas; menyimpan objek dengan kunci asing → error eksplisit.

**D5 — Satukan model SO POS & ERP** *(Tinggi)*
- `simpanTransaksiPenjualan` menulis header ke `SalesOrders` dan baris item ke `SalesOrderItems` (bukan JSON di kolom header). Pakai vocabulary status yang sama dengan ERP (satu enum, lihat B4) dan aturan pembayaran DEC-02: metode "Piutang" menaikkan piutang pelanggan dan **tidak** mencatat kas; metode lunas mencatat kas ke akun yang sesuai.
- `getSalesOrders` harus mengembalikan item order POS.
- Skrip migrasi satu kali (dijalankan manual, idempoten) untuk order POS lama yang `items`-nya berupa JSON.
- *Terima*: order POS muncul di tab Sales Order ERP lengkap dengan item; void order POS mengembalikan stok yang benar.

**D6 — Void & retur yang benar** *(Sedang)*
- Void SO/PO: balik entri kas terkait (entri pembalik, bukan hapus), kurangi piutang/hutang untuk **semua** status belum-lunas termasuk `Cicilan`, kembalikan stok hanya jika stok pernah dikurangi (bukan Draft) dan hanya sisa yang belum diretur, idempoten (void dua kali = no-op), hanya peran sesuai DEC-05.
- Retur atas dokumen lunas: ikuti DEC-05 (entri kas refund atau kredit toko).
- Tulis ulang sebagai fungsi murni di `src/domain/` agar bisa dites (lihat W4.4).
- **Void ≠ Retur.** Void hanya untuk dokumen yang belum ada barang bergerak/pembayaran final, atau transaksi instan POS (stok dikembalikan, kas dibalik). Setelah barang dikirim/diterima, jalurnya **Retur**, bukan Void.
- Dokumen Void **tidak dihapus**: simpan `voidedBy`, `voidedAt`, `voidAlasan` (alasan wajib), tetap tampil di daftar dengan badge Void dan di **Void Log** (jumlah & nilai per kasir/hari). Dikecualikan dari semua total, ranking, AR/AP, dan laporan; entri kas pembalik diberi `refId` dokumen agar laporan arus kas mengabaikan pasangan tersebut sementara saldo kas tetap benar.
- *Terima*: skenario tes (Draft→Void, Lunas tunai→Void, Cicilan→Void, retur lalu void, void ganda) menghasilkan stok, piutang, dan saldo kas yang benar.

**D7 — Laporan konsistensi (baca-saja)** *(Sedang)*
- Endpoint `getReconciliationReport(token)` (Admin+) yang melaporkan: saldo kas tersimpan vs hitung ulang per akun; piutang pelanggan vs jumlah sisa tagihan SO tak-Void; hutang supplier vs sisa PO; ID ganda; stok negatif. Tampilkan di Settings. **Tidak mengubah data.**
- *Terima*: laporan memunculkan selisih yang sengaja dibuat di Sheet uji.

**D8 — Tanggal lokal (WITA)** *(Sedang)*
- Satu helper `todayLocal()` (zona `Asia/Makassar`) menggantikan 22 pemakaian `toISOString()` untuk tanggal bisnis. Server tetap GMT+8.
- *Terima*: pada pukul 02:00 WITA transaksi baru bertanggal hari itu.

### Fase 2b — Anti-tamper & pemulihan (transaksi tidak boleh diubah diam-diam)

Prinsip jujur: Google Sheets **tidak bisa** dibuat benar-benar tak-terubah bagi pemilik file/editor skrip. Target realistis: **tamper-evident** (perubahan di luar aplikasi pasti ketahuan, sampai ke barisnya) dan **recoverable** (bisa dipulihkan). Bergantung pada D1, D3, D4, D5, D6.

| ID | Pekerjaan |
|---|---|
| T1 | **Kunci akses.** Web app "Execute as: Me"; Sheet **tidak dibagikan** ke siapa pun selain pemilik; semua sheet diproteksi (`Protection`, editor hanya pemilik). Pengecualian hanya sheet data master DEC-12 yang sengaja boleh diedit. Dokumentasikan di README. Tambah sheet pertama `_BACA_DULU` berisi peringatan: *jangan membuka/mengedit Sheet ini; semua lewat aplikasi*; tulis aturan operasional yang sama di README. |
| T2 | **Hash chain.** Sheet transaksi (`SalesOrders`, `SalesOrderItems`, `PurchaseOrders`, `PurchaseOrderItems`, `CashLedger`, `VoidLog`, `_AuditLog`) punya kolom `_hash` = SHA-256(hash baris sebelumnya + *field inti* yang dikanonikalisasi: id, tanggal, pihak, item/harga/qty, total, taxMode, akun, debit, kredit). Field status (logistik/bayar/totalPaid) bukan inti: berubah hanya lewat endpoint transisi (kirim, terima, bayar, void, retur) dan tiap transisi ditulis ke `_AuditLog`. **Hash kepala + jumlah baris tiap sheet disimpan di Script Properties (bukan di sheet)** sehingga sistem tetap "mengingat" meski sheet dihapus/diganti. Penulisan hash di bawah `LockService` yang sama dengan penulisan baris. |
| T3 | `verifyIntegrity()`: hitung ulang rantai; laporkan baris yang diubah, baris hilang/ditambah di luar aplikasi, sheet hilang, header berubah. Jalan otomatis harian (time trigger) + tombol Superadmin; hasil tampil di dashboard tab Kontrol; email ke pemilik bila gagal. |
| T4 | **Backup harian** (time trigger): salin Spreadsheet ke folder Drive `INO-ERP-Backup`, simpan 30 salinan terakhir. Tulis dan **uji** prosedur pemulihan. Setelah restore, `resealIntegrity()` (hanya dijalankan manual dari editor skrip; dijaga Script Property `ALLOW_RESEAL`, tercatat di `_AuditLog`) membangun ulang hash kepala. |
| T5 | **Pemantau struktur**: installable `onChange` trigger mencatat hapus sheet/baris/kolom ke `_AuditLog` dan mengirim email ke pemilik. |
| T6 | **Go-Live Lock**: Script Property `GO_LIVE_LOCKED=true` (hanya bisa di-set pemilik dari editor skrip) menonaktifkan permanen `saveAll*`, import, `resetSemuaData`, setup destruktif, dan semua jalur edit dokumen selain endpoint transisi. Sebelum dikunci: jalankan `verifyIntegrity()` dan backup. |

*Terima* (pada Sheet uji): (a) mengubah 1 nominal secara manual → `verifyIntegrity` menunjuk baris tepatnya; (b) menghapus 1 baris → terdeteksi; (c) menghapus seluruh sheet → terdeteksi + email terkirim; (d) restore dari backup + `resealIntegrity()` → verifikasi lulus; (e) dengan `GO_LIVE_LOCKED`, pemanggilan `saveAll*` dan import ditolak; (f) transaksi normal (jual, kirim, terima, bayar, void, retur) tetap lolos verifikasi.

### Fase 3 — Aturan bisnis (mengikuti Decision Log)

| ID | Pekerjaan | Bergantung pada |
|---|---|---|
| B1 | Pajak per dokumen PO/SO, **sepenuhnya dikendalikan user**: `taxMode` ∈ {`INCLUDE` (harga sudah termasuk PPN), `EXCLUDE` (PPN ditambahkan), `NONE`} dan `ppnStatus` ∈ {`TERUTANG`, `DIBEBASKAN`, `NONE`}. Simpan `dpp`, `ppnNilai`, `taxMode`, `ppnStatus`. Satu fungsi `calcTax(subtotal, taxMode, rate)` dengan `rate` dari Settings (ganti `* 0.12` di `App.tsx:2994,3193`, `PurchaseOrderTab.tsx:370,378`, `SalesOrderTab.tsx:299,307`). Settings: `ppn_rate`, **default `taxMode`**, **default `ppnStatus`**; user boleh menimpa per dokumen (perubahan tercatat). **Aplikasi tidak memaksakan aturan pajak** (tidak ada kewajiban include/exclude, tidak ada pemaksaan NONE); beri teks bantuan netral "konfirmasi ke akuntan". Laporan PPN memisahkan: PPN Keluaran terutang, PPN Masukan, dan nilai (DPP) yang dibebaskan. Backfill dokumen lama dari kolom `pajak`. | DEC-03 |
| B8 | **Akun & metode pembayaran (Settings → Database). Bersifat aditif: `CashLedgerTab` dan entri manual yang ada TIDAK diubah/dihapus sekarang.** Kondisi: akun sudah bisa di-CRUD (nomor, nama, jenis, fungsi) tetapi hanya di `localStorage`; tidak ada daftar metode bayar; `determineAccount` (`App.tsx:486`) dan `mapMetodeKeAkun_` (server) hanya membedakan 'tunai' → `'Kas Tunai'`, lainnya → `'Bank'` (hardcode). Pekerjaan: (1) sheet `CashAccounts` (nomor, nama, jenis Kas/Bank, aktif) dan `PaymentMethods` (id, nama, akun, aktif); satu akun boleh punya banyak metode; (2) halaman Settings (Superadmin) untuk tambah/ubah/nonaktifkan akun dan metode; (3) form SO/PO/POS memilih **metode** dari daftar; akun mengikuti metode; (4) tiap mutasi menyimpan `akun` dan `metode`; (5) hapus hardcode `'Bank'`/`'Kas Tunai'` di klien dan server; (6) migrasi: akun & metode awal dibuat dari data yang ada, entri lama `akun='Bank'` dipetakan ke akun pilihan pemilik; (7) **Cek Saldo** per akun (input saldo aktual → tampil selisih, hasil cek disimpan, saldo tidak berubah otomatis). | DEC-16 |
| B2 | HPP: perbarui `product.hpp` saat penerimaan PO sesuai metode terpilih; simpan `hpp` pada item SO saat dijual; Laba-Rugi memakai `hpp` item. **Hapus semua fallback `12000`** (`App.tsx:882,940,957,1823,2027,3786`, `ReportsTab.tsx:129`) — produk tak ditemukan harus ditampilkan sebagai anomali, bukan diganti angka. | DEC-04 |
| B3 | Tambah `customerId`/`supplierId` pada SO/PO; ganti pencocokan `c.nama === so.pelanggan`; backfill dari nama dengan laporan nama ganda/tak cocok. Hentikan auto-create pelanggan/supplier `auto@inoerp.com` (minta konfirmasi dengan dialog). | — |
| B4 | Satu enum status (`statusLogistik`, `statusBayar`) di `types.ts` dan `Code_ERP.gs`; ganti nilai liar (`DIPESAN`, `Diterima Sebagian`, `Terkirim Sebagian`, `Belum Dibayar`/`Belum Lunas`/`Belum Bayar`, `Cicilan`/`Parsial`, `Selesai`/`Terkirim`). Jalur rilis Draft SO sesuai DEC-09. | DEC-09 **DEC-09 terjawab:** SO meniru alur PO; stok berkurang saat *kirim* (bukan saat rilis); jalur parsial dipertahankan; void/retur D6 hanya mengembalikan qty yang sudah dikirim. |
| B5 | **Tanpa konversi satuan** (DEC-07). Hanya samakan daftar satuan dan bandingkan tanpa peka huruf besar-kecil (`'ml'` vs `'Ml'`, `index_POS.html:621,673`). | DEC-07 |
| B6 | `kasir`/`operator` diambil dari sesi login (`App.tsx:3218,3332`). | — |
| B7 | **Alur PO & pembayaran** (DEC-06): Pesan → Rilis → Terima → Bayar. Pembayaran peristiwa tersendiri dengan tanggal opsional dan status Sudah/Belum. Kotak centang **'Sudah dibayar'** (+ tanggal) saat membuat PO untuk PO bayar langsung → kas keluar dicatat saat itu. Hutang timbul saat **diterima** untuk sisa yang belum dibayar. Hapus pencatatan kas/hutang otomatis saat rilis di `processSavePO` (`App.tsx:2958`). | DEC-06 |

### Fase 3b — Redesign Dashboard (setelah D6, B2, B1 selesai agar angkanya benar)

> **Status: usulan awal.** Pemilik akan membahas desain lebih lanjut. Jangan dikerjakan sebelum desain disetujui; DB1–DB6 hanya acuan kebutuhan.

Catatan: laba = **Laba Kotor** (DEC-14). Kondisi sekarang: satu halaman panjang (`App.tsx:3745`, ±1.000 baris), grafik tren hanya 2 garis (Penjualan, Pembelian; tanpa Laba Kotor). `recharts` sudah terpasang → **tidak ada dependency baru**. Pecah menjadi komponen terpisah di `src/tabs/dashboard/` (hanya dashboard; tidak menyentuh bagian lain `App.tsx`).

Aturan umum: satu filter periode (Hari ini / 7 hari / Bulan ini / Custom) berlaku untuk semua tab; satu definisi per angka, dihitung lewat fungsi murni di `src/domain/metrics.ts` (dites di W4.4); dokumen Void tidak pernah ikut; layout nyaman di tablet landscape (nav tab bisa discroll); tiap grafik punya tooltip dan angka persen yang terbaca tanpa hover; kondisi kosong ditangani.

| ID | Tab | Isi & jenis visual |
|---|---|---|
| DB1 | **Ringkasan** | Baris KPI: Penjualan, Pembelian, Laba Kotor, Laba Kotor, Saldo Kas, Piutang, Hutang — masing-masing dengan selisih % vs periode sebelumnya. **Line chart 3 garis**: Penjualan, Pembelian, Laba Kotor per hari/minggu/bulan. Panel peringatan (jatuh tempo, stok menipis, selisih rekonsiliasi D7). |
| DB2 | **Penjualan & Pembelian** | Bar berkelompok Penjualan vs Pembelian per periode; donut komposisi penjualan per metode bayar; ringkasan jumlah transaksi, rata-rata nilai transaksi. |
| DB3 | **Piutang & Hutang** | Untuk AR dan AP masing-masing: **bar 100% bertumpuk Lunas vs Belum Dibayar dengan persen dan nominal** terlihat jelas; bar *aging* (belum jatuh tempo, 1–30, 31–60, >60 hari); tabel 10 terbesar/terlambat dengan tombol ke dokumennya. |
| DB4 | **Produk** | Ranking (bar horizontal Top 10) dengan toggle *omzet / laba / qty / margin %*; tabel *slow moving* (tak terjual N hari) dan stok menipis; ranking pelanggan untuk laba. |
| DB5 | **Saldo Akun** | Kartu per akun (Kas Kasir, BCA, Mandiri, BNI, …) berisi saldo sistem, ringkasan total Tunai vs Bank; bar kas masuk vs keluar per periode; tabel mutasi terakhir; tombol **Cek Saldo** dan riwayat hasil cek (B8). |
| DB6 | **Kontrol** | Void Log per kasir/hari (jumlah & nilai), selisih rekonsiliasi (D7), transaksi dengan HPP tak ditemukan. Khusus Admin+. |

*Terima*: (a) 6 tab tampil, berpindah tanpa memuat ulang data; (b) grafik tren memiliki 3 garis dan nilainya cocok dengan tabel sumber pada Sheet uji; (c) persen Lunas + Belum = 100% pada AR dan AP; (d) dokumen Void tidak mengubah angka apa pun di dashboard; (e) tampil benar pada lebar 768–1280 px; (f) peran Kasir tidak melihat Laba/HPP/Kontrol (DEC-10).

### Fase 3c — Petty Cash (DITUNDA, belum dikerjakan)

Modul **terpisah** (sheet dan tab sendiri) untuk kas kecil; tidak boleh mengubah logika penjualan/pembelian. Satu-satunya titik sambung: isi ulang kas kecil = transfer dari sebuah akun (mengurangi saldo akun itu); pengeluaran kecil mengurangi saldo petty cash dengan kategori dan catatan. **Belum ada spesifikasi detail; Antigravity tidak mengerjakannya** sampai pemilik memberi spesifikasi tambahan. Entri manual di `CashLedgerTab` ditinjau ulang saat modul ini dirancang, bukan sebelumnya.

### Fase 4 — Kebersihan & uji

| ID | Pekerjaan | Kriteria terima |
|---|---|---|
| W4.1 | **Setelah pemilik menyetujui daftar**, hapus: `src/stores/useAppStore.ts`, `src/utils/migration.ts`, `Code_ERP_backup.gs`, `temp.js`, `temp_code.js`, `patch.js`, `extract_reports.{js,cjs}`, `inject_reports.cjs`, `recover_reports.cjs`, `fix_2026.cjs`, `rewrite_handlers.cjs`, `app_diff.txt`, `err.log`, `recover_reports.zip` (56 MB), `.git_corrupted/`, `src_backup/`, modul **Konsinyasi** (tab, state, endpoint, sheet; DEC-12). Bagian `DEV IMPORT` dipertahankan. Pindahkan ke branch arsip bila ragu. **Jangan hapus `index_ERP_GAS.html` dan `index_POS.html`**: itu berkas yang di-paste ke proyek GAS (`index_ERP_GAS.html` = salinan build `dist/index.html`). Dokumentasikan langkah itu di W4.2. | `git status` bersih; build tetap lolos. |
| W4.2 | Tulis ulang `README.md` dan `GOOGLE_SHEETS_SETUP.md` agar sesuai kenyataan (`google.script.run`, `Code_ERP.gs`, `setupSheetsAndHeaders`, langkah deploy GAS, daftar sheet). Hapus `GEMINI_API_KEY`/`APP_URL` dari `.env.example` jika tak dipakai. | Orang baru bisa deploy hanya dengan README. |
| W4.3 | `deploy.yml` men-deploy ke GitHub Pages yang berjalan tanpa GAS (mode `localStorage`, bukan sistem produksi). Hapus workflow atau beri label "demo lokal" yang jelas di UI. | Tak ada deployment yang menyesatkan. |
| W4.4 | Tambah `vitest` (satu-satunya dependency baru). Ekstrak fungsi murni ke `src/domain/` (`calcTotals`, penerimaan PO, pengiriman/retur/void SO, saldo kas) dan tes skenario uang & stok pada D6. | `npm test` hijau; minimal skenario D6 tercakup. |
| W4.5 | Ganti `any` hanya pada **jalur uang/stok** (item, order, kas) memakai tipe di `types.ts`. Bukan seluruh berkas. | `tsc --noEmit` tetap 0 error dan kini bermakna di jalur itu. |
| W4.7 *(opsional, portofolio)* | README portofolio: tujuan, fitur, arsitektur singkat, screenshot, langkah deploy; mode demo dengan data contoh; pastikan tak ada data/kredensial perusahaan asli di repo maupun riwayat git. | Orang luar bisa memahami & mencoba proyek tanpa data asli. |
| W4.6 | Data master BOM dan daftar platform dipindah ke sheet `BOMs`/`Platforms` yang boleh diedit langsung di Spreadsheet. App hanya membaca (baris rusak diabaikan, tidak boleh crash) dan tidak ada logika transaksi di sana. Tidak ada fitur platform baru. Riwayat produksi/kategori/satuan/prefix hanya dipindah bila dipakai. | Edit di Sheet muncul di app tanpa deploy ulang. |

### Fase 5 — Bersyarat

Hanya jika DEC-01 menunjukkan skala di luar kemampuan Sheets (puluhan user bersamaan, ribuan transaksi/hari, banyak gerai): evaluasi database sungguhan. **Jangan dikerjakan** tanpa persetujuan tertulis pemilik.

---

## 6. Verifikasi & definisi selesai

Selesai bila **semua** terpenuhi pada deployment uji:

1. Fase 1: S1–S6 lolos kriteria terima masing-masing, diuji dengan token Kasir, token Admin, dan tanpa token.
2. Tes konkurensi D1 lulus (stok akhir 6); 20 SO paralel = 20 ID unik (D3).
3. Round-trip semua entitas lulus (D4); tak ada kolom hilang.
4. Order POS tampil lengkap di ERP (D5); skenario void/retur lulus (D6).
5. Uji anti-tamper T2–T6 lulus (a–f).
6. `npm run lint`, `npm run build`, `npm test` hijau.
7. Laporan akhir Antigravity memuat: daftar commit per work item, daftar `DECISION-xx: default dipakai`, daftar yang **tidak** dikerjakan beserta alasannya, dan hasil tes manual.

---

## 7. Lampiran A — Lokasi bukti

| Temuan | Lokasi |
|---|---|
| `login()` menerima hash langsung | `Code_ERP.gs:58` |
| Sesi/validasi token | `Code_ERP.gs:160,189` |
| `sendEmailReport` | `Code_ERP.gs:215`; klien `App.tsx:633` |
| Upsert & pembuangan field senyap | `Code_ERP.gs:302` (`saveItemToSheet`), `:355` (`saveAllToSheet`), `:613` |
| `getSalesOrders` menimpa `items` | `Code_ERP.gs:638` |
| Settings tanpa auth | `Code_ERP.gs:821` (`getAppSettings`), `:829` (`saveAppSettings`) |
| POS read tanpa auth | `Code_ERP.gs:859,863,875,1167` |
| Checkout POS | `Code_ERP.gs:897`; `mapMetodeKeAkun_` `:966`; `generateId_` `:978`; `decrementStock_` `:1053` |
| `resetSemuaData` | `Code_ERP.gs:1124` |
| Skema header | `setup_sheets.gs` (seluruh berkas) vs `src/types.ts` |
| Penerimaan PO / pengiriman SO | `App.tsx:1209` / `:1267` (menyimpan `saveAllProducts` tanpa `await`) |
| Pembayaran SO / retur SO | `App.tsx:1383` / `:1522` |
| Approve PO | `App.tsx:1603` |
| Simpan PO / SO | `App.tsx:2958` (pajak `:2994`) / `:3139` (pajak `:3193`, `kasir` `:3218`) |
| Void SO | `App.tsx:3266` |
| Opname | `App.tsx:3312` (`operator` `:3332`) |
| Default user & PIN | `App.tsx:503-506` |
| `ppnRate` state vs hardcode | `App.tsx:466` vs `:2994,3193` |
| HPP moving average/FIFO (ledger) | `App.tsx:882-1014` |
| Fallback HPP 12000 | `App.tsx:882,940,957,1823,2027,3786`; `tabs/ReportsTab.tsx:129` |
| `determineAccount` hardcode `'Bank'` | `App.tsx:486`; server `Code_ERP.gs:966` |
| Wizard Buat Perusahaan | logika `App.tsx:3347-3400`; tombol di layar login `:3566` |
| Kode mati | `src/stores/useAppStore.ts`, `src/utils/migration.ts` |
| Token POS di `localStorage` | `index_POS.html:484,542` |
| Metode bayar POS | `index_POS.html:364-368`; payload `:822-852` |
| Satuan `'ml'` huruf kecil | `index_POS.html:621,673` |
| Deploy ke Pages | `.github/workflows/deploy.yml` |

## 8. Lampiran B — Belum diaudit (tinjau sebelum menyatakan selesai)

`src/tabs/ReportsTab.tsx` (79 KB, kalkulasi laporan), logika Konsinyasi/BOM/Produksi/Wastage di `App.tsx`, komponen `SpreadsheetComponent` (ledger yang bisa diedit manual, disimpan di `localStorage`), tab `export_code`, dan perilaku nyata terhadap Sheet/deployment live. Semua temuan di dokumen ini berasal dari pembacaan kode, bukan dari menjalankan sistem.


## 9. Catatan operasional & batasan

- **Aturan emas:** setelah go-live, *tidak ada yang membuka Sheet*. Aplikasi adalah satu-satunya jalan masuk; Sheet hanya penyimpanan. Perlindungan sesungguhnya adalah T3 (deteksi) + T4 (backup harian), bukan larangan.
- **Deploy ulang:** setiap perubahan `Code_ERP.gs` butuh *deployment versi baru* GAS. Fitur baru (backup ke Drive, trigger waktu, email) meminta **otorisasi ulang** (scope Drive/trigger) saat pertama dijalankan oleh pemilik.
- **Performa:** `getSheetData` membaca seluruh sheet di tiap panggilan. Cukup untuk volume kecil; melambat bila transaksi mencapai puluhan ribu baris. `verifyIntegrity()` juga membaca seluruh baris (jalankan harian, bukan per transaksi). Jika melambat, evaluasi arsip per tahun (bukan migrasi DB).
- **Urutan penyerahan ke Antigravity:** satu fase per sesi; tinjau laporan tiap fase sebelum lanjut. Fase 3b (dashboard) dan 3c (petty cash) tidak dikerjakan tanpa desain/spesifikasi tambahan dari pemilik.
- **Belum teruji di runtime:** semua temuan berasal dari pembacaan kode; Antigravity wajib memverifikasi pada salinan Sheet sebelum mengubah perilaku.
