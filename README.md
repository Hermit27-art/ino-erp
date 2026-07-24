# INO ERP

Aplikasi ERP (Produk, Stok, PO, SO, BOM, Kas, dll) untuk UMKM. React + Vite,
awalnya digenerate lewat Google AI Studio.

## Jalankan Lokal

**Prasyarat:** Node.js

1. Install dependency: `npm install`
2. (Opsional) Sambungkan ke Google Sheets sebagai backend — lihat
   [`GOOGLE_SHEETS_SETUP.md`](./GOOGLE_SHEETS_SETUP.md). Kalau dilewati,
   aplikasi tetap jalan normal pakai `localStorage` browser.
3. Jalankan: `npm run dev`

## Build Production

```
npm run build
```

Hasil build ada di folder `dist/` — file statis, bisa di-host di mana saja
(GitHub Pages, Netlify, Vercel, dll).
