// ============================================================
// INO ERP — Google Apps Script Backend
// ============================================================
// Changelog v2.0 (Audit Fixes):
// - Tambah session-based auth (login → token → validate per request)
// - Tambah LockService untuk prevent race condition pada bulk writes
// - Semua mutation endpoint sekarang memerlukan valid session token
// - Read endpoints tetap terbuka (GET) untuk compatibility
// ============================================================

function doGet(e) {
  if (e && e.parameter && e.parameter.app === 'pos') {
    return HtmlService.createTemplateFromFile('index_POS')
      .evaluate()
      .setTitle('INO POS')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('INO ERP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ============================================================
// CANONICAL SCHEMA & AUDIT HEADERS (W0.3 / D4)
// ============================================================
const SCHEMA = {
  "Products": ["sku", "kategori", "subKategori", "nama", "satuan", "hargaJual", "hpp", "safetyStock", "stok", "status", "supplierUtama", "lokasi", "masaSimpan", "catatan"],
  "Customers": ["id", "nama", "kontak", "email", "telp", "alamat", "piutang"],
  "Suppliers": ["id", "nama", "kontak", "email", "telp", "alamat", "hutang"],
  "PurchaseOrders": ["id", "tanggal", "supplierId", "supplier", "metode", "subtotal", "diskon", "pajak", "grandTotal", "statusLogistik", "statusBayar", "totalPaid", "platform", "catatan", "dibuatOleh", "tanggalUpdate", "taxMode", "ppnStatus", "dpp", "ppnNilai", "isDirectPaid", "paidAt", "_hash"],
  "PurchaseOrderItems": ["noPO", "sku", "nama", "qty", "qtyReceived", "qtyReturned", "satuan", "harga", "diskon", "ppn", "subtotal", "_hash"],
  "SalesOrders": ["id", "tanggal", "customerId", "pelanggan", "metode", "subtotal", "diskon", "pajak", "grandTotal", "statusLogistik", "statusBayar", "totalPaid", "platform", "kasir", "catatan", "taxMode", "ppnStatus", "dpp", "ppnNilai", "voidedBy", "voidedAt", "voidAlasan", "_hash"],
  "SalesOrderItems": ["noSO", "sku", "nama", "qty", "qtyShipped", "qtyReturned", "harga", "hpp", "diskon", "ppn", "subtotal", "_hash"],
  "CashLedger": ["id", "tanggal", "ref", "keterangan", "kategori", "debit", "kredit", "saldo", "akun", "metode", "_hash"],
  "InventoryLog": ["tanggal", "sku", "nama", "tipe", "qtySistem", "qtyFisik", "selisih", "satuan", "HPP", "subtotal", "catatan", "operator", "_hash"],
  "Settings": ["key", "value"],
  "Users": ["email", "nama", "role", "pin", "salt", "preHashHmac", "created_at", "updated_at"],
  "CashAccounts": ["nomor", "nama", "jenis", "aktif"],
  "PaymentMethods": ["id", "nama", "akun", "aktif"],
  "VoidLog": ["id", "tanggal", "docType", "docId", "kasir", "nilai", "alasan", "timestamp", "_hash"],
  "_AuditLog": ["id", "timestamp", "action", "sheet", "recordId", "user", "details", "_hash"],
  "_Sessions": ["token", "username", "role", "nama", "created_at", "expires_at"],
  "BOMs": ["id", "skuHasil", "namaHasil", "qtyHasil", "biayaLain", "bahanBakuJson"],
  "Platforms": ["nama", "aktif"]
};

/**
 * W0.3 — Audit statis & runtime header sheet live vs canonical SCHEMA.
 * Fungsi baca-saja, tidak mengubah data apa pun di Spreadsheet.
 */
function auditSheetHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const report = {
    timestamp: new Date().toISOString(),
    missingSheets: [],
    extraSheets: [],
    sheetDetails: {}
  };

  const allSheets = ss.getSheets();
  const existingSheetNames = allSheets.map(s => s.getName());

  for (const sheetName in SCHEMA) {
    const expectedHeaders = SCHEMA[sheetName];
    const sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      report.missingSheets.push(sheetName);
      report.sheetDetails[sheetName] = {
        status: 'MISSING',
        missingColumns: expectedHeaders,
        extraColumns: [],
        actualHeaders: [],
        expectedHeaders: expectedHeaders
      };
      continue;
    }

    const lastCol = sheet.getLastColumn();
    let actualHeaders = [];
    if (lastCol > 0) {
      actualHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim()).filter(Boolean);
    }

    const missingColumns = expectedHeaders.filter(h => actualHeaders.indexOf(h) === -1);
    const extraColumns = actualHeaders.filter(h => expectedHeaders.indexOf(h) === -1);

    report.sheetDetails[sheetName] = {
      status: (missingColumns.length === 0 && extraColumns.length === 0) ? 'OK' : 'MISMATCH',
      missingColumns: missingColumns,
      extraColumns: extraColumns,
      actualHeaders: actualHeaders,
      expectedHeaders: expectedHeaders
    };
  }

  for (const name of existingSheetNames) {
    if (!SCHEMA[name] && !name.startsWith('_Backup_')) {
      report.extraSheets.push(name);
    }
  }

  Logger.log("=== HASIL AUDIT HEADER SPREADSHEET (W0.3) ===");
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

// ----------------------------------------------------
// SESSION & AUTH MANAGEMENT (S1, S4, S5)
// ----------------------------------------------------
const SESSION_SHEET = '_Sessions';
const USERS_SHEET = 'Users';
const SESSION_EXPIRY_HOURS = 24;

const SHEET_PRODUCTS = 'Products';
const SHEET_CUSTOMERS = 'Customers';
const SHEET_SALES_ORDERS = 'SalesOrders';
const SHEET_CASH_LEDGER = 'CashLedger';

/**
 * Komputasi HMAC-SHA256 untuk preHash password dari klien.
 * Menggunakan salt per-user dan server-side pepper dari Script Properties.
 */
function computeHmac_(salt, preHash) {
  const pepper = PropertiesService.getScriptProperties().getProperty('AUTH_PEPPER') || 'INO_ERP_PEPPER_2026_DEFAULT';
  const message = String(salt) + ':' + String(preHash);
  const rawSignature = Utilities.computeHmacSha256Signature(message, pepper);
  return rawSignature.map(b => ('0' + (b & 0xFF).toString(16)).slice(-2)).join('');
}

/**
 * Mendapatkan sheet _Sessions untuk menyimpan token login.
 */
function getSessionSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SESSION_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SESSION_SHEET);
    sh.appendRow(['token', 'username', 'role', 'nama', 'created_at', 'expires_at']);
    try { sh.hideSheet(); } catch (e) {}
  }
  return sh;
}

/**
 * Bersihkan sesi kedaluwarsa dari _Sessions.
 */
function cleanupExpiredSessions_() {
  try {
    const sh = getSessionSheet_();
    const data = sh.getDataRange().getValues();
    if (data.length <= 1) return;
    const now = new Date();
    for (let i = data.length - 1; i >= 1; i--) {
      const expires = new Date(data[i][5]);
      if (isNaN(expires.getTime()) || now >= expires) {
        sh.deleteRow(i + 1);
      }
    }
  } catch (e) {
    Logger.log('cleanupExpiredSessions_ warning: ' + e.message);
  }
}

/**
 * Validasi session token. Mengembalikan info user atau null jika invalid/expired.
 */
function validateToken_(token) {
  if (!token) return null;
  const sh = getSessionSheet_();
  const data = sh.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(token)) {
      const expires = new Date(data[i][5]);
      if (now < expires) {
        return {
          username: String(data[i][1]),
          role: String(data[i][2]),
          nama: String(data[i][3])
        };
      } else {
        sh.deleteRow(i + 1);
        return null;
      }
    }
  }
  return null;
}

/**
 * Memastikan token valid. Melempar error UNAUTHORIZED jika tidak valid.
 */
function requireAuth_(token) {
  const user = validateToken_(token);
  if (!user) {
    throw new Error('UNAUTHORIZED: Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.');
  }
  return user;
}

/**
 * Memastikan token valid dan memiliki peran yang diizinkan (S4 / DEC-10).
 * allowedRoles: array string, misal ['Superadmin'], ['Admin', 'Superadmin'], ['Kasir', 'Admin', 'Superadmin']
 */
function requireRole_(token, allowedRoles) {
  const user = requireAuth_(token);
  if (!allowedRoles || !allowedRoles.includes(user.role)) {
    throw new Error('FORBIDDEN: Peran \'' + user.role + '\' tidak memiliki izin untuk operasi ini.');
  }
  return user;
}

/**
 * Login — verifikasi kredensial, proteksi brute-force dengan rate limit CacheService,
 * upgrade otomatis password legacy ke HMAC-SHA256 ber-salt (S5).
 */
function login(username, preHash) {
  if (!username || !preHash) {
    return { ok: false, error: 'Username dan password wajib diisi.' };
  }

  const cleanUser = String(username).trim().toLowerCase();
  const cache = CacheService.getScriptCache();
  const rateLimitKey = 'login_fails_' + cleanUser;
  const failAttempts = Number(cache.get(rateLimitKey) || 0);

  // Rate limit: 5 gagal dalam 15 menit (900 detik)
  if (failAttempts >= 5) {
    return {
      ok: false,
      error: 'Terlalu banyak percobaan login gagal. Akun diblokir sementara selama 15 menit.'
    };
  }

  cleanupExpiredSessions_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Periksa sheet Users
  const usersSheet = ss.getSheetByName(USERS_SHEET);
  if (usersSheet) {
    const usersData = usersSheet.getDataRange().getValues();
    if (usersData.length > 1) {
      const headers = usersData[0];
      const emailIdx = headers.indexOf('email');
      const namaIdx = headers.indexOf('nama');
      const roleIdx = headers.indexOf('role');
      const pinIdx = headers.indexOf('pin');
      const saltIdx = headers.indexOf('salt');
      const hmacIdx = headers.indexOf('preHashHmac');

      for (let i = 1; i < usersData.length; i++) {
        const row = usersData[i];
        const storedEmail = String(row[emailIdx] || '').trim().toLowerCase();
        if (storedEmail !== cleanUser) continue;

        let isMatch = false;
        const storedSalt = saltIdx !== -1 ? String(row[saltIdx] || '').trim() : '';
        const storedHmac = hmacIdx !== -1 ? String(row[hmacIdx] || '').trim() : '';
        const storedPin = pinIdx !== -1 ? String(row[pinIdx] || '').trim() : '';

        if (storedSalt && storedHmac) {
          // Kredensial modern ber-salt + HMAC
          const calculatedHmac = computeHmac_(storedSalt, preHash);
          if (calculatedHmac === storedHmac) isMatch = true;
        } else if (storedPin && storedPin === preHash) {
          // Kredensial legacy — upgrade otomatis tanpa paksa reset password
          isMatch = true;
          const newSalt = Utilities.getUuid();
          const newHmac = computeHmac_(newSalt, preHash);
          if (saltIdx !== -1) usersSheet.getRange(i + 1, saltIdx + 1).setValue(newSalt);
          if (hmacIdx !== -1) usersSheet.getRange(i + 1, hmacIdx + 1).setValue(newHmac);
          if (pinIdx !== -1) usersSheet.getRange(i + 1, pinIdx + 1).setValue(''); // Hapus hash polos
          const updatedIdx = headers.indexOf('updated_at');
          if (updatedIdx !== -1) usersSheet.getRange(i + 1, updatedIdx + 1).setValue(new Date());
          Logger.log('Upgraded legacy password for user: ' + cleanUser);
        }

        if (isMatch) {
          cache.remove(rateLimitKey);
          const token = Utilities.getUuid();
          const now = new Date();
          const expires = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
          const sessionSheet = getSessionSheet_();
          sessionSheet.appendRow([
            token,
            storedEmail,
            String(row[roleIdx] || 'Kasir'),
            String(row[namaIdx] || ''),
            now,
            expires
          ]);

          return {
            ok: true,
            token: token,
            user: {
              username: storedEmail,
              nama: String(row[namaIdx] || ''),
              role: String(row[roleIdx] || 'Kasir')
            }
          };
        }
      }
    }
  }

  // 2. Cek Superadmin dari legacy Settings (jika belum dimigrasi ke Users)
  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet) {
    const sData = settingsSheet.getDataRange().getValues();
    let superUser = '';
    let superPass = '';
    let superPassRow = -1;
    let superUserRow = -1;

    for (let i = 1; i < sData.length; i++) {
      const k = String(sData[i][0] || '').trim();
      const v = String(sData[i][1] || '').trim();
      if (k === 'login_username') { superUser = v.toLowerCase(); superUserRow = i + 1; }
      if (k === 'login_password') { superPass = v; superPassRow = i + 1; }
    }

    if (superUser && superPass && cleanUser === superUser && preHash === superPass) {
      // Migrasi superadmin dari Settings ke sheet Users
      let uSheet = ss.getSheetByName(USERS_SHEET);
      if (!uSheet) {
        setupSheetsAndHeaders();
        uSheet = ss.getSheetByName(USERS_SHEET);
      }
      const salt = Utilities.getUuid();
      const hmac = computeHmac_(salt, preHash);
      const now = new Date();
      uSheet.appendRow([superUser, 'Superadmin', 'Superadmin', '', salt, hmac, now, now]);

      // Hapus kredensial rahasia dari sheet Settings (S1)
      if (superPassRow !== -1) settingsSheet.deleteRow(superPassRow);
      if (superUserRow !== -1 && superUserRow !== superPassRow) {
        const adjRow = superUserRow > superPassRow ? superUserRow - 1 : superUserRow;
        settingsSheet.deleteRow(adjRow);
      }

      cache.remove(rateLimitKey);
      const token = Utilities.getUuid();
      const expires = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);
      getSessionSheet_().appendRow([token, superUser, 'Superadmin', 'Superadmin', now, expires]);

      return {
        ok: true,
        token: token,
        user: { username: superUser, nama: 'Superadmin', role: 'Superadmin' }
      };
    }
  }

  // Catat kegagalan untuk rate limiting
  const newFails = failAttempts + 1;
  cache.put(rateLimitKey, String(newFails), 900);
  const remaining = 5 - newFails;
  return {
    ok: false,
    error: 'Username atau password salah. Sisa kesempatan: ' + remaining
  };
}

/**
 * Validasi session saat app mount di frontend.
 */
function validateSession(token) {
  const user = validateToken_(token);
  if (user) return { ok: true, user: user };
  return { ok: false };
}

/**
 * Logout — batalkan sesi.
 */
function logoutSession(token) {
  if (!token) return { ok: true };
  const sh = getSessionSheet_();
  const data = sh.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === String(token)) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return { ok: true };
}

/**
 * Status inisialisasi sistem (S1).
 * Dapat dipanggil publik tanpa token untuk mengetahui apakah sistem sudah disetup.
 */
function getBootstrapStatus() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let initialized = false;
  let storeName = 'INO ERP';

  // Cek apakah ada Superadmin di Users
  const uSheet = ss.getSheetByName(USERS_SHEET);
  if (uSheet && uSheet.getLastRow() > 1) {
    const data = uSheet.getDataRange().getValues();
    const roleIdx = data[0].indexOf('role');
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][roleIdx] || '').trim().toLowerCase() === 'superadmin') {
        initialized = true;
        break;
      }
    }
  }

  // Cek nama toko di Settings
  const sSheet = ss.getSheetByName('Settings');
  if (sSheet && sSheet.getLastRow() > 1) {
    const sData = sSheet.getDataRange().getValues();
    for (let i = 1; i < sData.length; i++) {
      const k = String(sData[i][0] || '').trim();
      if (k === 'nama_toko') storeName = String(sData[i][1] || 'INO ERP');
      if (k === 'login_username' && !initialized) initialized = true;
    }
  }

  return { initialized: initialized, storeName: storeName };
}

/**
 * Setup inisial perusahaan baru (S1).
 * Hanya boleh dijalankan jika initialized === false ATAU dipanggil oleh Superadmin.
 */
function initialSetup(payload) {
  if (!payload || !payload.email || !payload.passwordHash) {
    throw new Error('Data superadmin tidak lengkap.');
  }

  const status = getBootstrapStatus();
  if (status.initialized) {
    if (!payload.token) {
      throw new Error('FORBIDDEN: Sistem sudah terinisialisasi. Setup baru hanya dapat dilakukan oleh Superadmin.');
    }
    requireRole_(payload.token, ['Superadmin']);
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let uSheet = ss.getSheetByName(USERS_SHEET);
    if (!uSheet) {
      setupSheetsAndHeaders();
      uSheet = ss.getSheetByName(USERS_SHEET);
    }

    const email = String(payload.email).trim().toLowerCase();
    const nama = String(payload.nama || 'Superadmin').trim();
    const salt = Utilities.getUuid();
    const hmac = computeHmac_(salt, payload.passwordHash);
    const now = new Date();

    // Upsert baris superadmin di Users
    const uData = uSheet.getDataRange().getValues();
    let found = false;
    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][0] || '').toLowerCase() === email) {
        uSheet.getRange(i + 1, 1, 1, 8).setValues([[
          email, nama, 'Superadmin', '', salt, hmac, uData[i][6] || now, now
        ]]);
        found = true;
        break;
      }
    }
    if (!found) {
      uSheet.appendRow([email, nama, 'Superadmin', '', salt, hmac, now, now]);
    }

    // Simpan public settings
    if (payload.settings && Array.isArray(payload.settings)) {
      saveAppSettingsInternal_(payload.settings);
    }

    return { ok: true, message: 'Inisialisasi berhasil diselesaikan.' };
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------
// USER MANAGEMENT ENDPOINTS (S5 — Superadmin Only)
// ----------------------------------------------------

/**
 * Daftar pengguna untuk tab Pengaturan (Superadmin only).
 * Tidak pernah mengirimkan pin, salt, atau hash ke sisi klien.
 */
function listUsers(token) {
  requireRole_(token, ['Superadmin']);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName(USERS_SHEET);
  if (!uSheet || uSheet.getLastRow() <= 1) return [];

  const data = uSheet.getDataRange().getValues();
  const headers = data[0];
  const emailIdx = headers.indexOf('email');
  const namaIdx = headers.indexOf('nama');
  const roleIdx = headers.indexOf('role');

  const users = [];
  for (let i = 1; i < data.length; i++) {
    const email = String(data[i][emailIdx] || '').trim();
    if (!email) continue;
    users.push({
      email: email,
      nama: String(data[i][namaIdx] || ''),
      role: String(data[i][roleIdx] || 'Kasir')
    });
  }
  return users;
}

/**
 * Simpan / perbarui user (Superadmin only).
 */
function saveUser(token, userData) {
  requireRole_(token, ['Superadmin']);
  if (!userData || !userData.email) throw new Error('Email user wajib diisi.');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let uSheet = ss.getSheetByName(USERS_SHEET);
    if (!uSheet) {
      setupSheetsAndHeaders();
      uSheet = ss.getSheetByName(USERS_SHEET);
    }

    const email = String(userData.email).trim().toLowerCase();
    const nama = String(userData.nama || '');
    const role = String(userData.role || 'Kasir');
    const uData = uSheet.getDataRange().getValues();
    const now = new Date();

    for (let i = 1; i < uData.length; i++) {
      if (String(uData[i][0] || '').toLowerCase() === email) {
        // Update user
        let salt = String(uData[i][4] || '');
        let hmac = String(uData[i][5] || '');
        if (userData.pin) {
          salt = Utilities.getUuid();
          hmac = computeHmac_(salt, userData.pin);
        }
        uSheet.getRange(i + 1, 1, 1, 8).setValues([[
          email, nama, role, '', salt, hmac, uData[i][6] || now, now
        ]]);
        return { ok: true, message: 'User diperbarui.' };
      }
    }

    // Insert user baru
    if (!userData.pin) throw new Error('Password / PIN wajib untuk user baru.');
    const salt = Utilities.getUuid();
    const hmac = computeHmac_(salt, userData.pin);
    uSheet.appendRow([email, nama, role, '', salt, hmac, now, now]);
    return { ok: true, message: 'User ditambahkan.' };
  } finally {
    lock.releaseLock();
  }
}

/**
 * Hapus user (Superadmin only). Tidak boleh menghapus akun sendiri.
 */
function deleteUser(token, emailToDelete) {
  const current = requireRole_(token, ['Superadmin']);
  const cleanEmail = String(emailToDelete || '').trim().toLowerCase();
  if (current.username.toLowerCase() === cleanEmail) {
    throw new Error('Tidak dapat menghapus akun Anda sendiri.');
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName(USERS_SHEET);
  if (!uSheet || uSheet.getLastRow() <= 1) return { ok: true };

  const data = uSheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0] || '').toLowerCase() === cleanEmail) {
      uSheet.deleteRow(i + 1);
      return { ok: true, message: 'User berhasil dihapus.' };
    }
  }
  return { ok: true };
}

/**
 * Reset PIN / Password user oleh Superadmin.
 */
function resetPin(token, email, newPreHash) {
  requireRole_(token, ['Superadmin']);
  if (!email || !newPreHash) throw new Error('Email dan password baru wajib diisi.');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const uSheet = ss.getSheetByName(USERS_SHEET);
  if (!uSheet) throw new Error('Sheet Users tidak ditemukan.');

  const data = uSheet.getDataRange().getValues();
  const cleanEmail = String(email).trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').toLowerCase() === cleanEmail) {
      const salt = Utilities.getUuid();
      const hmac = computeHmac_(salt, newPreHash);
      uSheet.getRange(i + 1, 4, 1, 5).setValues([['', salt, hmac, data[i][6], new Date()]]);
      return { ok: true, message: 'Password user berhasil direset.' };
    }
  }
  throw new Error('User tidak ditemukan.');
}

/**
 * S7 — Hardening sendEmailReport
 * Hanya dapat dipanggil oleh Admin atau Superadmin.
 * Penerima divalidasi, rate limited melalui CacheService, dan subjek disanitasi.
 */
function sendEmailReport(token, to, subject, htmlBody) {
  requireRole_(token, ['Admin', 'Superadmin']);

  const cleanTo = String(to || '').trim().toLowerCase();
  if (!cleanTo.includes('@') || cleanTo.length > 100) {
    throw new Error('Alamat email tujuan tidak valid.');
  }

  // Rate limiting pengiriman email: maks 10 email per jam
  const cache = CacheService.getScriptCache();
  const countKey = 'email_report_rate_limit';
  const sentCount = Number(cache.get(countKey) || 0);
  if (sentCount >= 10) {
    throw new Error('LIMIT_EXCEEDED: Batas pengiriman email per jam tercapai (maks 10).');
  }
  cache.put(countKey, String(sentCount + 1), 3600);

  // Sanitasi subjek untuk mencegah header injection
  const cleanSubject = String(subject || 'Laporan INO ERP')
    .replace(/[\r\n]/g, ' ')
    .slice(0, 150);

  MailApp.sendEmail({
    to: cleanTo,
    subject: cleanSubject,
    htmlBody: String(htmlBody || '')
  });
  return true;
}

// ----------------------------------------------------
// UTILITIES
// ----------------------------------------------------

// Convert array of rows (with headers in row 0) to array of objects
function rowsToObjects_(rows) {
  if (!rows || rows.length <= 1) return [];
  const headers = rows[0];
  const data = [];
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    // Hanya lewati jika seluruh sel di baris tersebut kosong (sangat longgar)
    if (row.every(cell => cell === null || cell === undefined || String(cell).trim() === '')) continue;
    
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      obj[headers[j]] = row[j];
    }
    data.push(obj);
  }
  return data;
}

// Normalize known numeric fields to Number type safely
function parseNumbers_(obj) {
  const numFields = [
    'hargaJual', 'hpp', 'safetyStock', 'stok', 'piutang', 'hutang',
    'qtyReceived', 'qtySold', 'qtyReturned', 'harga', 'komisiPct', 'subtotal',
    'diskon', 'ppn', 'grandTotal', 'qty', 'hargaBeli', 'pajak', 'debit', 'kredit',
    'saldo', 'qtySistem', 'qtyFisik', 'selisih', 'HPP', 'hj', 'safety',
    'totalPaid', 'qtyShipped'
  ];
  
  if (Array.isArray(obj)) {
    return obj.map(o => parseNumbers_(o));
  }
  if (obj && typeof obj === 'object') {
    const newObj = { ...obj };
    for (const key in newObj) {
      if (numFields.includes(key)) {
        let val = newObj[key];
        if (val === null || val === undefined || val === '') {
          newObj[key] = 0;
        } else {
          newObj[key] = Number(val);
          if (isNaN(newObj[key])) newObj[key] = 0;
        }
      }
    }
    return newObj;
  }
  return obj;
}

// Helper to get data mapped to object headers
function getSheetData_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");
  
  const values = sheet.getDataRange().getValues();
  let objects = rowsToObjects_(values);
  objects = parseNumbers_(objects);
  return objects;
}

// Helper for generic save/upsert
function saveItemToSheet_(sheetName, item, pkField) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");
  
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) throw new Error("Sheet '" + sheetName + "' kosong, belum ada header.");
  
  const headers = values[0];
  const writeItem = parseNumbers_(item); // Ensure numbers are written explicitly
  const rowData = headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
  
  const pkIndex = headers.indexOf(pkField);
  if (pkIndex === -1) throw new Error("Primary key '" + pkField + "' tidak ditemukan di header '" + sheetName + "'.");
  
  let found = false;
  for (let i = 1; i < values.length; i++) {
    if (values[i][pkIndex] == writeItem[pkField]) {
      // Update existing row (i + 1 due to 1-indexed Sheets, i starts at 1 for row 2)
      sheet.getRange(i + 1, 1, 1, headers.length).setValues([rowData]);
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow(rowData);
  }
}

// Helper for generic delete
function deleteItemFromSheet_(sheetName, id, pkField) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");
  
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return; // Nothing to delete
  
  const headers = values[0];
  const pkIndex = headers.indexOf(pkField);
  if (pkIndex === -1) throw new Error("Primary key '" + pkField + "' tidak ditemukan di header '" + sheetName + "'.");
  
  for (let i = values.length - 1; i >= 1; i--) {
    if (values[i][pkIndex] == id) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

/**
 * Helper to save whole bulk arrays (replaces all contents).
 * WRAPPED WITH LockService to prevent race condition on concurrent writes.
 */
function saveAllToSheet_(sheetName, items) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000); // Wait up to 15 seconds for lock
  } catch (e) {
    throw new Error('Server sibuk (concurrent write). Coba lagi dalam beberapa detik.');
  }

  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");
    
    const values = sheet.getDataRange().getValues();
    if (values.length === 0) throw new Error("Sheet '" + sheetName + "' kosong, belum ada header.");
    
    const headers = values[0];
    
    // Clear existing content safely below the header
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
    
    if (items && items.length > 0) {
      const rows = items.map(item => {
        const writeItem = parseNumbers_(item);
        return headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
      });
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------
// PRODUCTS (S3, S4)
// ----------------------------------------------------
function getProducts(token) {
  const user = requireAuth_(token);
  try {
    const products = getSheetData_('Products');
    if (user.role === 'Kasir') {
      return products.map(p => {
        const copy = { ...p };
        delete copy.hpp;
        delete copy.HPP;
        return copy;
      });
    }
    return products;
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveProduct(token, product) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { saveItemToSheet_('Products', product, 'sku'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteProduct(token, sku) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { deleteItemFromSheet_('Products', sku, 'sku'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllProducts(token, products) {
  requireRole_(token, ['Superadmin']);
  try { saveAllToSheet_('Products', products); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// CUSTOMERS (S3, S4)
// ----------------------------------------------------
function getCustomers(token) {
  const user = requireAuth_(token);
  try {
    const customers = getSheetData_('Customers');
    if (user.role === 'Kasir') {
      return customers.map(c => {
        const copy = { ...c };
        delete copy.piutang;
        return copy;
      });
    }
    return customers;
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveCustomer(token, customer) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { saveItemToSheet_('Customers', customer, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteCustomer(token, id) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { deleteItemFromSheet_('Customers', id, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllCustomers(token, customers) {
  requireRole_(token, ['Superadmin']);
  try { saveAllToSheet_('Customers', customers); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// SUPPLIERS (S3, S4 — Admin & Superadmin only)
// ----------------------------------------------------
function getSuppliers(token) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { return getSheetData_('Suppliers'); } catch(e) { throw new Error(e.message); }
}

function saveSupplier(token, supplier) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { saveItemToSheet_('Suppliers', supplier, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteSupplier(token, id) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { deleteItemFromSheet_('Suppliers', id, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllSuppliers(token, suppliers) {
  requireRole_(token, ['Superadmin']);
  try { saveAllToSheet_('Suppliers', suppliers); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// CONSIGNMENTS (S3, S4 — Admin & Superadmin only)
// ----------------------------------------------------
function getConsignments(token) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { return getSheetData_('Consignments'); } catch(e) { throw new Error(e.message); }
}

function saveConsignment(token, consignment) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { saveItemToSheet_('Consignments', consignment, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteConsignment(token, id) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { deleteItemFromSheet_('Consignments', id, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllConsignments(token, consignments) {
  requireRole_(token, ['Superadmin']);
  try { saveAllToSheet_('Consignments', consignments); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// PURCHASE ORDERS (S3, S4 — JOIN Header + Items)
// ----------------------------------------------------
function getPurchaseOrders(token) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try {
    const orders = getSheetData_('PurchaseOrders');
    const items = getSheetData_('PurchaseOrderItems');
    
    // Group items by noPO
    const itemsByPO = {};
    for (const item of items) {
      if (!itemsByPO[item.noPO]) itemsByPO[item.noPO] = [];
      itemsByPO[item.noPO].push(item);
    }
    
    // Merge into Header
    for (const order of orders) {
      order.items = itemsByPO[order.id] || [];
    }
    
    return orders;
  } catch(e) {
    throw new Error(e.message);
  }
}

function savePurchaseOrder(token, order) {
  requireRole_(token, ['Admin', 'Superadmin']);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    throw new Error('Server sibuk. Coba lagi.');
  }

  try {
    // 1. Save Header
    const header = { ...order };
    delete header.items;
    saveItemToSheet_('PurchaseOrders', header, 'id');
    
    // 2. Refresh/Delete Old Items
    const itemsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PurchaseOrderItems');
    if (!itemsSheet) throw new Error("Sheet 'PurchaseOrderItems' tidak ditemukan.");
    
    const values = itemsSheet.getDataRange().getValues();
    if (values.length > 1) {
      const headers = values[0];
      const noPOIndex = headers.indexOf('noPO');
      for (let i = values.length - 1; i >= 1; i--) {
        if (values[i][noPOIndex] == order.id) {
          itemsSheet.deleteRow(i + 1);
        }
      }
    }
    
    // 3. Append New Items
    if (order.items && order.items.length > 0) {
      const currentValues = itemsSheet.getDataRange().getValues();
      let headers = currentValues.length > 0 ? currentValues[0] : null;
      if (!headers) throw new Error("Header di 'PurchaseOrderItems' hilang.");
      
      const rowsToAppend = order.items.map(item => {
        const itemObj = { ...item, noPO: order.id };
        const writeItem = parseNumbers_(itemObj);
        return headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
      });
      
      itemsSheet.getRange(itemsSheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    }
    return true;
  } catch(e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

function deletePurchaseOrder(token, id) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try {
    // Delete header
    deleteItemFromSheet_('PurchaseOrders', id, 'id');
    
    // Delete items
    const itemsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PurchaseOrderItems');
    if (itemsSheet) {
      const values = itemsSheet.getDataRange().getValues();
      if (values.length > 1) {
        const headers = values[0];
        const noPOIndex = headers.indexOf('noPO');
        for (let i = values.length - 1; i >= 1; i--) {
          if (values[i][noPOIndex] == id) {
            itemsSheet.deleteRow(i + 1);
          }
        }
      }
    }
    return true;
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveAllPurchaseOrders(token, orders) {
  requireRole_(token, ['Superadmin']);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    throw new Error('Server sibuk. Coba lagi.');
  }

  try {
    const headers = orders.map(o => {
      const h = { ...o };
      delete h.items;
      return h;
    });
    
    let allItems = [];
    for (const order of orders) {
      if (order.items) {
        for (const item of order.items) {
          allItems.push({ ...item, noPO: order.id });
        }
      }
    }
    
    saveAllToSheetRaw_('PurchaseOrders', headers);
    saveAllToSheetRaw_('PurchaseOrderItems', allItems);
    return true;
  } catch(e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Internal version of saveAllToSheet_ without its own lock (for use when caller already holds lock).
 */
function saveAllToSheetRaw_(sheetName, items) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");
  
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) throw new Error("Sheet '" + sheetName + "' kosong, belum ada header.");
  
  const headers = values[0];
  
  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
  }
  
  if (items && items.length > 0) {
    const rows = items.map(item => {
      const writeItem = parseNumbers_(item);
      return headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// ----------------------------------------------------
// SALES ORDERS (S3, S4, D5 — JOIN Header + Items)
// ----------------------------------------------------
function getSalesOrders(token) {
  const user = requireAuth_(token);
  try {
    const orders = getSheetData_('SalesOrders');
    const items = getSheetData_('SalesOrderItems');
    
    const itemsBySO = {};
    for (const item of items) {
      if (!itemsBySO[item.noSO]) itemsBySO[item.noSO] = [];
      itemsBySO[item.noSO].push(item);
    }
    
    for (const order of orders) {
      // D5: Prioritas ambil dari sheet SalesOrderItems. Fallback ke kolom JSON header jika legacy POS.
      if (itemsBySO[order.id] && itemsBySO[order.id].length > 0) {
        order.items = itemsBySO[order.id];
      } else if (order.items && typeof order.items === 'string' && order.items.startsWith('[')) {
        try { order.items = JSON.parse(order.items); } catch(e) {}
      } else if (!Array.isArray(order.items)) {
        order.items = [];
      }

      if (user.role === 'Kasir') {
        order.items.forEach(it => { delete it.hpp; });
      }
    }
    
    return orders;
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveSalesOrder(token, order) {
  requireRole_(token, ['Admin', 'Superadmin']);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    throw new Error('Server sibuk. Coba lagi.');
  }

  try {
    const header = { ...order };
    delete header.items;
    saveItemToSheet_('SalesOrders', header, 'id');
    
    const itemsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SalesOrderItems');
    if (!itemsSheet) throw new Error("Sheet 'SalesOrderItems' tidak ditemukan.");
    
    const values = itemsSheet.getDataRange().getValues();
    if (values.length > 1) {
      const headers = values[0];
      const noSOIndex = headers.indexOf('noSO');
      for (let i = values.length - 1; i >= 1; i--) {
        if (values[i][noSOIndex] == order.id) {
          itemsSheet.deleteRow(i + 1);
        }
      }
    }
    
    if (order.items && order.items.length > 0) {
      const currentValues = itemsSheet.getDataRange().getValues();
      let headers = currentValues.length > 0 ? currentValues[0] : null;
      if (!headers) throw new Error("Header di 'SalesOrderItems' hilang.");
      
      const rowsToAppend = order.items.map(item => {
        const itemObj = { ...item, noSO: order.id };
        const writeItem = parseNumbers_(itemObj);
        return headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
      });
      
      itemsSheet.getRange(itemsSheet.getLastRow() + 1, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
    }
    return true;
  } catch(e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

function deleteSalesOrder(token, id) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try {
    deleteItemFromSheet_('SalesOrders', id, 'id');
    
    const itemsSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('SalesOrderItems');
    if (itemsSheet) {
      const values = itemsSheet.getDataRange().getValues();
      if (values.length > 1) {
        const headers = values[0];
        const noSOIndex = headers.indexOf('noSO');
        for (let i = values.length - 1; i >= 1; i--) {
          if (values[i][noSOIndex] == id) {
            itemsSheet.deleteRow(i + 1);
          }
        }
      }
    }
    return true;
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveAllSalesOrders(token, orders) {
  requireRole_(token, ['Superadmin']);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    throw new Error('Server sibuk. Coba lagi.');
  }

  try {
    const headers = orders.map(o => {
      const h = { ...o };
      delete h.items;
      return h;
    });
    
    let allItems = [];
    for (const order of orders) {
      if (order.items) {
        for (const item of order.items) {
          allItems.push({ ...item, noSO: order.id });
        }
      }
    }
    
    saveAllToSheetRaw_('SalesOrders', headers);
    saveAllToSheetRaw_('SalesOrderItems', allItems);
    return true;
  } catch(e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------
// CASH LEDGER (S3, S4 — Admin & Superadmin only)
// ----------------------------------------------------
function getCashLedger(token) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { return getSheetData_('CashLedger'); } catch(e) { throw new Error(e.message); }
}

function saveCashEntry(token, entry) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { saveItemToSheet_('CashLedger', entry, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteCashEntry(token, id) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { deleteItemFromSheet_('CashLedger', id, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllCashLedger(token, ledger) {
  requireRole_(token, ['Superadmin']);
  try { saveAllToSheet_('CashLedger', ledger); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// INVENTORY LOG (S3, S4 — Append Only / Full Replace)
// ----------------------------------------------------
function getOpnameLog(token) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try { return getSheetData_('InventoryLog'); } catch(e) { throw new Error(e.message); }
}

function appendOpnameLog(token, logEntry) {
  requireRole_(token, ['Admin', 'Superadmin']);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InventoryLog');
    if (!sheet) throw new Error("Sheet 'InventoryLog' tidak ditemukan.");
    
    const values = sheet.getDataRange().getValues();
    if (values.length === 0) throw new Error("Sheet 'InventoryLog' kosong, belum ada header.");
    
    const headers = values[0];
    const writeItem = parseNumbers_(logEntry);
    const rowData = headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
    
    sheet.appendRow(rowData);
    return true;
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveAllOpnameLog(token, logs) {
  requireRole_(token, ['Superadmin']);
  try { saveAllToSheet_('InventoryLog', logs); return true; } catch(e) { throw new Error(e.message); }
}

// ==========================================
// SETTINGS (S1)
// ==========================================

const SETTINGS_WHITELIST = [
  'nama_toko', 'tipe_bisnis', 'alamat_toko', 'telp_toko', 'kota_toko',
  'mata_uang', 'ppn_rate', 'metode_hpp_default', 'drive_folder_struk',
  'format_tanggal', 'tax_mode_default', 'ppn_status_default'
];

/**
 * Mendapatkan pengaturan sistem publik (S1).
 * Memerlukan token valid dan HANYA mengembalikan kunci publik dalam whitelist.
 * Tidak pernah membocorkan password atau kredensial rahasia.
 */
function getAppSettings(token) {
  requireAuth_(token);
  try {
    const rawData = getSheetData_('Settings');
    return rawData.filter(item => SETTINGS_WHITELIST.includes(item.key));
  } catch(e) {
    throw new Error(e.message);
  }
}

/**
 * Menyimpan pengaturan sistem publik (S1).
 * Memerlukan peran Superadmin, hanya menerima kunci whitelist,
 * dan mengupdate in-place di bawah LockService tanpa clearContents.
 */
function saveAppSettings(token, settingsList) {
  requireRole_(token, ['Superadmin']);
  if (!settingsList || !Array.isArray(settingsList)) {
    throw new Error('Format settingsList tidak valid.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    saveAppSettingsInternal_(settingsList);
    return true;
  } catch(e) {
    throw new Error(e.message);
  } finally {
    lock.releaseLock();
  }
}

/**
 * Helper internal untuk menyimpan settings di bawah lock.
 */
function saveAppSettingsInternal_(settingsList) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    setupSheetsAndHeaders();
    sheet = ss.getSheetByName('Settings');
  }

  const values = sheet.getDataRange().getValues();
  const existingMap = {};
  for (let i = 1; i < values.length; i++) {
    const k = String(values[i][0] || '').trim();
    if (k) existingMap[k] = i + 1; // row number (1-based)
  }

  for (const item of settingsList) {
    const key = String(item.key || '').trim();
    if (!SETTINGS_WHITELIST.includes(key)) {
      // Abaikan kunci yang bukan whitelist publik (S1)
      continue;
    }
    const val = item.value !== undefined && item.value !== null ? String(item.value) : '';
    if (existingMap[key]) {
      sheet.getRange(existingMap[key], 2).setValue(val);
    } else {
      sheet.appendRow([key, val]);
      existingMap[key] = sheet.getLastRow();
    }
  }
}


// ==========================================
// INTEGRASI INO POS
// ==========================================

// ==========================================
// FUNGSI DIPANGGIL POS (S3, S6, D5)
// ==========================================

function getProdukList(token) {
  const user = requireAuth_(token);
  const products = getSheetDataAsObjects_(SHEET_PRODUCTS);
  if (user.role === 'Kasir') {
    return products.map(p => {
      const copy = { ...p };
      delete copy.hpp;
      delete copy.HPP;
      return copy;
    });
  }
  return products;
}

function getCustomerList(token) {
  const user = requireAuth_(token);
  const customers = getSheetDataAsObjects_(SHEET_CUSTOMERS);
  if (user.role === 'Kasir') {
    return customers.map(c => {
      const copy = { ...c };
      delete copy.piutang;
      return copy;
    });
  }
  return customers;
}

/**
 * Riwayat transaksi POS hari ini saja (S3).
 */
function getRiwayatHariIni(token) {
  requireAuth_(token);
  const semua = getSheetDataAsObjects_(SHEET_SALES_ORDERS);
  const today = formatDate_(new Date());

  return semua
    .filter(so => String(so.id).indexOf('POS-') === 0 && so.tanggal === today)
    .sort((a, b) => String(b.id).localeCompare(String(a.id))); // terbaru dulu
}

/**
 * Fungsi utama checkout POS (S6 & D5).
 * Validasi ketat server-side:
 * - Kasir diambil dari session token terverifikasi.
 * - Harga & HPP diambil dari sheet Products (menolak manipulasi harga dari klien).
 * - Kuantitas harus > 0 dan finite.
 * - Stok diverifikasi di server; jika tidak cukup, transaksi DITOLAK (tanpa clamp ke 0).
 * - Menulis ke SalesOrders DAN baris item ke SalesOrderItems (D5).
 * - Aturan pembayaran (DEC-02): Piutang menaikkan piutang pelanggan dan tidak masuk kas;
 *   metode lunas mencatat kas ke CashLedger.
 */
function simpanTransaksiPenjualan(payload) {
  if (!payload || !payload.token) throw new Error('UNAUTHORIZED: Token sesi kasir tidak disertakan.');
  const sessionUser = requireRole_(payload.token, ['Kasir', 'Admin', 'Superadmin']);

  if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
    throw new Error('VALIDASI_GAGAL: Transaksi harus memiliki minimal 1 item.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(15000); // Tunggu maks 15 detik

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const now = new Date();
    const prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
    if (!prodSheet) throw new Error('Sheet Products tidak ditemukan.');

    // 1. Validasi produk & stok di sisi server (S6)
    const prodData = prodSheet.getDataRange().getValues();
    if (prodData.length <= 1) throw new Error('Daftar produk di database kosong.');
    const prodHeaders = prodData[0];
    const skuIdx = prodHeaders.indexOf('sku');
    const namaIdx = prodHeaders.indexOf('nama');
    const hargaJualIdx = prodHeaders.indexOf('hargaJual');
    const hppIdx = prodHeaders.indexOf('hpp');
    const stokIdx = prodHeaders.indexOf('stok');

    // Index produk by SKU
    const productMap = {};
    for (let i = 1; i < prodData.length; i++) {
      const s = String(prodData[i][skuIdx] || '').trim();
      if (s) {
        productMap[s] = {
          rowNum: i + 1,
          sku: s,
          nama: String(prodData[i][namaIdx] || ''),
          hargaJual: Number(prodData[i][hargaJualIdx]) || 0,
          hpp: Number(prodData[i][hppIdx]) || 0,
          stok: Number(prodData[i][stokIdx]) || 0
        };
      }
    }

    // 1. Validasi produk, agregasi kuantitas per SKU & validasi stok total (R3)
    const aggregatedQtyPerSku = {};
    for (const item of payload.items) {
      const sku = String(item.sku || '').trim();
      const p = productMap[sku];
      if (!p) {
        throw new Error('PRODUK_TIDAK_DITEMUKAN: Produk dengan SKU \'' + sku + '\' tidak terdaftar di sistem.');
      }

      const qty = Number(item.qty);
      if (isNaN(qty) || !isFinite(qty) || qty <= 0) {
        throw new Error('QTY_INVALID: Kuantitas untuk ' + p.nama + ' harus berupa angka positif.');
      }

      aggregatedQtyPerSku[sku] = (aggregatedQtyPerSku[sku] || 0) + qty;
    }

    // Validasi stok agregat per SKU sebelum penulisan apa pun (R3)
    for (const sku in aggregatedQtyPerSku) {
      const totalQty = aggregatedQtyPerSku[sku];
      const p = productMap[sku];
      if (p.stok < totalQty) {
        throw new Error('STOK_TIDAK_CUKUP: Total stok produk ' + p.nama + ' (' + sku + ') tidak mencukupi (sisa: ' + p.stok + ', total diminta: ' + totalQty + ').');
      }
    }

    let serverGrandTotal = 0;
    const verifiedItems = [];

    for (const item of payload.items) {
      const sku = String(item.sku || '').trim();
      const p = productMap[sku];
      const qty = Number(item.qty);

      // Gunakan harga server (menolak pemalsuan total/harga dari klien)
      const hargaSatuan = p.hargaJual;
      const subtotalItem = Math.round(qty * hargaSatuan);
      serverGrandTotal += subtotalItem;

      verifiedItems.push({
        sku: sku,
        nama: p.nama,
        satuan: item.satuan || 'Pcs',
        qty: qty,
        hargaJual: hargaSatuan,
        hpp: p.hpp,
        subtotal: subtotalItem
      });
    }

    // 2. Generate struk ID di bawah lock (D3)
    const strukNo = generateId_('POS', ss.getSheetByName(SHEET_SALES_ORDERS));
    const metode = String(payload.metodeBayar || 'Tunai').trim();
    // DEC-02: QRIS / Transfer / Debit = Lunas; hanya Piutang / Tempo = piutang
    const isPiutang = (metode.toLowerCase().indexOf('piutang') !== -1 || metode.toLowerCase().indexOf('tempo') !== -1);
    const statusBayar = isPiutang ? 'Belum Lunas' : 'Lunas';
    const totalPaid = isPiutang ? 0 : serverGrandTotal;

    // 3. Tulis Header ke SalesOrders
    const soSheet = ss.getSheetByName(SHEET_SALES_ORDERS);
    const soRow = {
      id: strukNo,
      tanggal: formatDate_(now),
      customerId: payload.customerId || '',
      pelanggan: payload.customerNama || 'Pelanggan Umum Retail',
      metode: metode,
      items: JSON.stringify(verifiedItems.map(it => ({
        sku: it.sku, nama: it.nama, satuan: it.satuan, qty: it.qty, harga: it.hargaJual, subtotal: it.subtotal
      }))),
      subtotal: serverGrandTotal,
      diskon: 0,
      pajak: 0,
      grandTotal: serverGrandTotal,
      statusLogistik: 'Selesai',
      statusBayar: statusBayar,
      totalPaid: totalPaid,
      platform: 'Toko Langsung',
      kasir: sessionUser.nama || sessionUser.username,
      catatan: 'Transaksi POS (Point of Sale)'
    };
    appendRowFromObject_(soSheet, soRow);

    // 4. Tulis item ke SalesOrderItems (D5 — Relasional untuk konsistensi ERP)
    const soItemsSheet = ss.getSheetByName('SalesOrderItems');
    if (soItemsSheet) {
      const itemHeaders = soItemsSheet.getDataRange().getValues()[0];
      const rowsToAdd = verifiedItems.map(it => {
        const itemObj = {
          noSO: strukNo,
          sku: it.sku,
          nama: it.nama,
          qty: it.qty,
          qtyShipped: it.qty,
          qtyReturned: 0,
          harga: it.hargaJual,
          hpp: it.hpp,
          diskon: 0,
          ppn: 0,
          subtotal: it.subtotal
        };
        return itemHeaders.map(h => itemObj[h] === undefined ? '' : itemObj[h]);
      });
      soItemsSheet.getRange(soItemsSheet.getLastRow() + 1, 1, rowsToAdd.length, itemHeaders.length).setValues(rowsToAdd);
    }

    // 5. Catat pembayaran (DEC-02)
    if (isPiutang) {
      // Naikkan piutang pelanggan
      if (payload.customerId || payload.customerNama) {
        const custSheet = ss.getSheetByName(SHEET_CUSTOMERS);
        if (custSheet) {
          const cData = custSheet.getDataRange().getValues();
          const cHeaders = cData[0];
          const cIdIdx = cHeaders.indexOf('id');
          const cNamaIdx = cHeaders.indexOf('nama');
          const cPiutangIdx = cHeaders.indexOf('piutang');
          if (cPiutangIdx !== -1) {
            for (let i = 1; i < cData.length; i++) {
              const matchedId = payload.customerId && String(cData[i][cIdIdx]) === String(payload.customerId);
              const matchedNama = !payload.customerId && String(cData[i][cNamaIdx]).toLowerCase() === String(payload.customerNama).toLowerCase();
              if (matchedId || matchedNama) {
                const currentPiutang = Number(cData[i][cPiutangIdx]) || 0;
                custSheet.getRange(i + 1, cPiutangIdx + 1).setValue(currentPiutang + serverGrandTotal);
                break;
              }
            }
          }
        }
      }
    } else {
      // Catat kas masuk ke CashLedger
      const cashSheet = ss.getSheetByName(SHEET_CASH_LEDGER);
      if (cashSheet) {
        const akun = mapMetodeKeAkun_(metode);
        const lastSaldoAkun = getLastSaldoForAkun_(cashSheet, akun);
        const cashRow = {
          id: generateId_('CSH', cashSheet),
          tanggal: formatDate_(now),
          ref: strukNo,
          keterangan: 'Penjualan POS Kasir [' + strukNo + ']',
          kategori: 'Penjualan',
          debit: serverGrandTotal,
          kredit: 0,
          saldo: lastSaldoAkun + serverGrandTotal,
          akun: akun,
          metode: metode
        };
        appendRowFromObject_(cashSheet, cashRow);
      }
    }

    // 6. Kurangi stok di sheet Products secara presisi (R3: sekali per SKU dengan total agregat)
    for (const sku in aggregatedQtyPerSku) {
      const p = productMap[sku];
      const totalQty = aggregatedQtyPerSku[sku];
      prodSheet.getRange(p.rowNum, stokIdx + 1).setValue(p.stok - totalQty);
    }

    return { strukNo: strukNo, total: serverGrandTotal, timestamp: now.getTime() };
  } finally {
    lock.releaseLock();
  }
}

// ==========================================
// HELPER: MAPPING & ID GENERATION
// ==========================================

/**
 * Mapping metode bayar POS -> nama akun kas, konsisten dengan
 * determineAccount() di React App.tsx.
 */
function mapMetodeKeAkun_(metode) {
  const m = (metode || '').toLowerCase();
  if (m.indexOf('tunai') !== -1 || m.indexOf('cash') !== -1) return 'Kas Tunai';
  return 'Bank';
}

/**
 * Generate ID dengan prefix berbeda per jenis transaksi, format:
 * PREFIX-YYYYMMDD-XXX (contoh: POS-20260802-001)
 * Dicek terhadap baris yang sudah ada di sheet supaya nomor urut tidak
 * bentrok dalam satu hari yang sama.
 */
function generateId_(prefix, sheet) {
  const today = formatDateCompact_(new Date());
  const data = sheet.getDataRange().getValues();
  const header = data[0];
  const idCol = header.indexOf('id');
  if (idCol === -1) return `${prefix}-${today}-001`;

  let maxNum = 0;
  for (let i = 1; i < data.length; i++) {
    const id = String(data[i][idCol] || '');
    if (id.indexOf(`${prefix}-${today}-`) === 0) {
      const num = parseInt(id.split('-')[2], 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  return `${prefix}-${today}-${String(maxNum + 1).padStart(3, '0')}`;
}

function formatDate_(date) {
  return Utilities.formatDate(date, 'GMT+8', 'yyyy-MM-dd');
}

function formatDateCompact_(date) {
  return Utilities.formatDate(date, 'GMT+8', 'yyyyMMdd');
}

// ==========================================
// HELPER: BACA/TULIS SHEET SEBAGAI OBJECT
// ==========================================

/**
 * Membaca seluruh sheet dan mengembalikan array of objects,
 * key-nya diambil dari baris header (baris 1).
 */
function getSheetDataAsObjects_(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      let val = row[idx];
      // Kolom 'items' disimpan sebagai JSON string, parse balik jadi array
      if (h === 'items' && typeof val === 'string' && val.startsWith('[')) {
        try { val = JSON.parse(val); } catch (e) { /* biarkan string apa adanya */ }
      }
      obj[h] = val;
    });
    return obj;
  });
}

/**
 * Menambah 1 baris baru ke sheet berdasarkan object, urutan kolom
 * mengikuti urutan header yang sudah ada di baris 1 sheet tersebut.
 * Sheet HARUS sudah punya baris header sebelum fungsi ini dipakai.
 */
function appendRowFromObject_(sheet, obj) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => {
    const val = obj[h];
    if (val === undefined) return '';
    if (typeof val === 'object') return JSON.stringify(val);
    return val;
  });
  sheet.appendRow(row);
}

function decrementStock_(prodSheet, sku, qty) {
  const data = prodSheet.getDataRange().getValues();
  const headers = data[0];
  const skuCol = headers.indexOf('sku');
  const stokCol = headers.indexOf('stok');
  if (skuCol === -1 || stokCol === -1) return;

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][skuCol]).trim() === String(sku).trim()) {
      const currentStok = Number(data[i][stokCol]) || 0;
      if (currentStok < qty) {
        throw new Error('STOK_TIDAK_CUKUP: Stok untuk SKU ' + sku + ' tidak mencukupi (sisa: ' + currentStok + ', diminta: ' + qty + ').');
      }
      prodSheet.getRange(i + 1, stokCol + 1).setValue(currentStok - qty);
      return;
    }
  }
  throw new Error('PRODUK_TIDAK_DITEMUKAN: SKU ' + sku + ' tidak ditemukan.');
}

function getLastSaldoForAkun_(cashSheet, akun) {
  const data = cashSheet.getDataRange().getValues();
  if (data.length < 2) return 0;

  const headers = data[0];
  const akunCol = headers.indexOf('akun');
  const saldoCol = headers.indexOf('saldo');
  if (akunCol === -1 || saldoCol === -1) return 0;

  let lastSaldo = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i][akunCol] === akun) {
      lastSaldo = Number(data[i][saldoCol]) || 0;
    }
  }
  return lastSaldo;
}

function saveProduct_(product) {
  // Placeholder untuk endpoint ERP nanti (Prioritas 1). Belum dipakai POS.
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_PRODUCTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const skuCol = headers.indexOf('sku');

  for (let i = 1; i < data.length; i++) {
    if (data[i][skuCol] === product.sku) {
      const row = headers.map(h => product[h] !== undefined ? product[h] : data[i][headers.indexOf(h)]);
      sheet.getRange(i + 1, 1, 1, row.length).setValues([row]);
      return { updated: true };
    }
  }
  appendRowFromObject_(sheet, product);
  return { inserted: true };
}

// ==========================================
// MAINTENANCE: RESET TOTAL SEBELUM GO-LIVE
// ==========================================

/**
 * S2 — Hardening resetSemuaData
 *
 * PENGAMANAN MUTLAK:
 * - Fungsi ini DITOLAK secara server-side kecuali pemilik skrip secara eksplisit
 *   menyetel Script Property: ALLOW_RESET = 'true' di editor Apps Script (Project Settings > Script Properties).
 * - Property tersebut AKAN DIHAPUS OTOMATIS segera setelah fungsi dipicu untuk mencegah eksekusi berulang.
 * - Sebelum menghapus satu sel pun, seluruh sheet transaksi dan master disalin ke
 *   sheet cadangan bertanda waktu: '_Backup_<NamaSheet>_<YYYYMMDD_HHmmss>'.
 * - Menangani SEMUA sheet data: Products, Customers, Suppliers, SalesOrders, SalesOrderItems,
 *   PurchaseOrders, PurchaseOrderItems, CashLedger, InventoryLog, CashAccounts, PaymentMethods, VoidLog.
 * - Catatan: Mengingat fungsi GAS dapat dipicu lewat google.script.run oleh siapa pun yang
 *   memiliki URL, proteksi berbasis Script Property ini mutlak diperlukan di trust boundary server.
 */
function resetSemuaData() {
  const props = PropertiesService.getScriptProperties();
  const allowReset = props.getProperty('ALLOW_RESET');

  if (allowReset !== 'true') {
    throw new Error('DITOLAK: Operasi resetSemuaData ditolak server. Script Property ALLOW_RESET belum diaktifkan (harus bernilai \'true\').');
  }

  // Hapus izin seketika agar tidak dapat dipanggil berulang
  props.deleteProperty('ALLOW_RESET');

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const timestamp = Utilities.formatDate(new Date(), 'GMT+8', 'yyyyMMdd_HHmmss');
  const targetSheets = [
    'Products', 'Customers', 'Suppliers', 'SalesOrders', 'SalesOrderItems',
    'PurchaseOrders', 'PurchaseOrderItems', 'CashLedger', 'InventoryLog',
    'CashAccounts', 'PaymentMethods', 'VoidLog'
  ];

  Logger.log('=== MEMULAI RESET TOTAL DENGAN BACKUP OTOMATIS [' + timestamp + '] ===');

  targetSheets.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return; // Hanya ada header atau kosong

    // 1. Buat backup sheet sebelum menghapus data
    const backupName = '_Backup_' + name + '_' + timestamp;
    try {
      const backupSheet = sheet.copyTo(ss);
      backupSheet.setName(backupName);
      try { backupSheet.hideSheet(); } catch (e) {}
      Logger.log('✓ Backup dibuat: ' + backupName + ' (' + (lastRow - 1) + ' baris)');
    } catch (e) {
      Logger.log('! Peringatan backup ' + name + ': ' + e.message);
    }

    // 2. Hapus baris data (baris 2 sampai akhir), baris 1 (header) tetap utuh
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
    Logger.log('✓ Data ' + name + ' dikosongkan. Header dipertahankan.');
  });

  Logger.log('=== RESET TOTAL BERHASIL DISELESAIKAN ===');
}

// ==========================================
// KEAMANAN (nonaktif dulu, aktifkan sebelum go-live)
// ==========================================

/**
 * Contoh pengecekan token sederhana untuk doPost, BELUM diaktifkan.
 * Untuk mengaktifkan: panggil checkApiToken_(body.token) di awal doPost(),
 * dan simpan token rahasia di Script Properties (bukan hardcode di kode).
 */
function checkApiToken_(token) {
  const validToken = PropertiesService.getScriptProperties().getProperty('API_TOKEN');
  if (token !== validToken) {
    throw new Error('Token API tidak valid.');
  }
}

// ==========================================
// FUNGSI DASHBOARD POS
// ==========================================

/**
 * Dipanggil dari POS via google.script.run.getRingkasanDashboard(token) (S3)
 * Mengambil ringkasan data omzet, hutang, piutang, dan stok kritis hari ini.
 * Memerlukan token terverifikasi; Kasir tidak melihat hutang/piutang (DEC-10);
 * Dokumen Void diabaikan (DEC-05).
 */
function getRingkasanDashboard(token) {
  const user = requireAuth_(token);
  const today = formatDate_(new Date());
  
  // 1. Hitung Omzet dan Transaksi Hari Ini
  const salesOrders = getSheetDataAsObjects_(SHEET_SALES_ORDERS);
  let omzetHariIni = 0;
  let jumlahTransaksiHariIni = 0;
  let salesLogs = [];
  
  salesOrders.forEach(so => {
    // Abaikan dokumen Void (DEC-05)
    if (so.statusBayar === 'Void' || so.statusLogistik === 'Void') return;

    // Ambil semua transaksi hari ini (baik POS maupun B2B)
    if (so.tanggal === today) {
      jumlahTransaksiHariIni++;
      const total = Number(so.grandTotal) || 0;
      omzetHariIni += total;
      
      // Ambil detail items untuk format log
      let itemCount = 0;
      try {
        const items = typeof so.items === 'string' ? JSON.parse(so.items) : so.items;
        itemCount = Array.isArray(items) ? items.length : 0;
      } catch(e) {}
      
      salesLogs.push({
        struk: so.id,
        method: so.metode || 'Tunai',
        customer: so.pelanggan || 'Pelanggan Umum',
        items: `${itemCount} item`,
        amount: total
      });
    }
  });
  
  // Sort log terbaru di atas, ambil 10 teratas
  salesLogs = salesLogs
    .sort((a, b) => String(b.struk).localeCompare(String(a.struk)))
    .slice(0, 10);
    
  // 2. Hitung Total Piutang & Hutang (Kasir tidak boleh melihat angka piutang/hutang - DEC-10)
  let totalPiutang = 0;
  let totalHutang = 0;
  if (user.role !== 'Kasir') {
    const customers = getSheetDataAsObjects_(SHEET_CUSTOMERS);
    totalPiutang = customers.reduce((sum, c) => sum + (Number(c.piutang) || 0), 0);
    try {
      const suppliers = getSheetDataAsObjects_('Suppliers');
      totalHutang = suppliers.reduce((sum, s) => sum + (Number(s.hutang) || 0), 0);
    } catch(e) {
      // Abaikan jika sheet belum dibuat
    }
  }
  
  // 3. Hitung Stok Kritis
  const products = getSheetDataAsObjects_(SHEET_PRODUCTS);
  let jumlahStokKritis = 0;
  products.forEach(p => {
    const stok = Number(p.stok) || 0;
    const safety = Number(p.safetyStock) || 5; // default 5 jika kosong
    if (stok <= safety) {
      jumlahStokKritis++;
    }
  });
  
  return {
    omzetHariIni: omzetHariIni,
    jumlahTransaksiHariIni: jumlahTransaksiHariIni,
    totalPiutang: totalPiutang,
    totalHutang: totalHutang,
    jumlahStokKritis: jumlahStokKritis,
    salesLogs: salesLogs
  };
}
