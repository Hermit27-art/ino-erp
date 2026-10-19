<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/a65f8a54-c1d7-4dc7-bbcc-422a3587ded7

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Catatan Keamanan & Konfigurasi (Security & Configuration)

- **AUTH_PEPPER**: Script Property untuk pepper HMAC autentikasi. Jika belum diisi, sistem otomatis membuat nilai acak pada pemanggilan pertama dan menyimpannya di Script Properties (tanpa string fallback di kode).
- **Catatan Migrasi Test Copy**: Pengguna yang dibuat menggunakan pepper default lama (`INO_ERP_PEPPER_2026_DEFAULT`) harus dibuat ulang atau di-reset PIN-nya pada Sheet pengujian.
