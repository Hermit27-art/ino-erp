/**
 * INO ERP — Backend Google Apps Script
 * ------------------------------------------------------
 * STATUS MIGRASI:
 * - Modul SETTING & USER/LOGIN → sudah dipindah, baca/tulis LANGSUNG ke
 *   sheet SHEET_SETTING dengan skema kolom sama persis seperti sistem lama
 *   (lihat Global_Constants.gs bagian INO.SETTING).
 * - Modul lain (produk, customer, supplier, PO, sales, dst) → BELUM
 *   dipindah, masih pakai AppState generik (giliran berikutnya).
 * - Menu/form GAS lama ("🌿 INO ERP" di Sheets) sudah PENSIUN. Jangan
 *   dipakai lagi untuk input — hanya app React yang boleh menulis.
 */

const SHEET_APPSTATE = 'AppState';
const SHEET_SETTING = 'SHEET_SETTING';

// ponytail: kolom ini HARUS sama dengan INO.SETTING di Global_Constants.gs
const SETTING_COL = {
  PROFIL_KEY: 1, PROFIL_VAL: 2, KATEGORI: 3, SUB_KATEGORI: 4, SATUAN: 5,
  PREFIX: 6, PREFIX_LABEL: 7, PLATFORM: 8,
  USER_EMAIL: 9, USER_NAMA: 10, USER_ROLE: 11, USER_PASS_HASH: 12,
  TEMPAT_SIMPAN: 13,
};
const SETTING_ROW_DATA = 3;
const PROFIL_KEYS = ['NAMA_TOKO', 'ALAMAT_TOKO', 'TELP_TOKO', 'KOTA_TOKO', 'PPN_RATE', 'DRIVE_FOLDER_STRUK', 'METODE_HPP_DEFAULT', 'MATA_UANG', 'FORMAT_TANGGAL'];

function getAppStateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SHEET_APPSTATE);
  if (!sh) { sh = ss.insertSheet(SHEET_APPSTATE); sh.appendRow(['key', 'value', 'updated_at']); }
  return sh;
}

function getSettingSheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_SETTING);
  if (!sh) throw new Error('Sheet SHEET_SETTING tidak ditemukan. Jalankan setup dulu.');
  return sh;
}

function hashPassword_(plain) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(plain));
  return digest.map(b => (b < 0 ? b + 256 : b).toString(16).padStart(2, '0')).join('');
}

function readColumn_(sh, col) {
  const lastRow = sh.getLastRow();
  if (lastRow < SETTING_ROW_DATA) return [];
  return sh.getRange(SETTING_ROW_DATA, col, lastRow - SETTING_ROW_DATA + 1, 1)
    .getValues().map(r => String(r[0]).trim()).filter(Boolean);
}

function writeColumn_(sh, col, values) {
  const maxRows = sh.getMaxRows();
  if (maxRows >= SETTING_ROW_DATA) sh.getRange(SETTING_ROW_DATA, col, maxRows - SETTING_ROW_DATA + 1, 1).clearContent();
  if (values.length) sh.getRange(SETTING_ROW_DATA, col, values.length, 1).setValues(values.map(v => [v]));
}

// ── BACA SEMUA SETTING (GET ?action=settings) ──
function getSettingsData_() {
  const sh = getSettingSheet_();
  const lastRow = sh.getLastRow();
  const profil = {};
  if (lastRow >= SETTING_ROW_DATA) {
    sh.getRange(SETTING_ROW_DATA, SETTING_COL.PROFIL_KEY, lastRow - SETTING_ROW_DATA + 1, 2).getValues()
      .forEach(r => { const k = String(r[0]).trim(); if (PROFIL_KEYS.includes(k)) profil[k] = r[1]; });
  }
  const prefixes = lastRow >= SETTING_ROW_DATA
    ? sh.getRange(SETTING_ROW_DATA, SETTING_COL.PREFIX, lastRow - SETTING_ROW_DATA + 1, 2).getValues()
        .filter(r => String(r[0]).trim()).map(r => ({ prefix: String(r[0]).trim(), label: String(r[1] || '').trim() }))
    : [];
  // ponytail: password HASH tidak pernah dikirim ke frontend, cukup username/nama/role
  const users = lastRow >= SETTING_ROW_DATA
    ? sh.getRange(SETTING_ROW_DATA, SETTING_COL.USER_EMAIL, lastRow - SETTING_ROW_DATA + 1, 4).getValues()
        .filter(r => String(r[0]).trim())
        .map(r => ({ username: String(r[0]).trim(), nama: String(r[1] || '').trim(), role: String(r[2] || '').trim() }))
    : [];

  return {
    ino_nama_toko: profil.NAMA_TOKO || 'INO ERP',
    ino_alamat_toko: profil.ALAMAT_TOKO || '',
    ino_telp_toko: profil.TELP_TOKO || '',
    ino_kota_toko: profil.KOTA_TOKO || '',
    ino_ppn_rate: parseFloat(profil.PPN_RATE) || 0.11,
    ino_drive_folder_struk: profil.DRIVE_FOLDER_STRUK || '',
    ino_metode_hpp_default: profil.METODE_HPP_DEFAULT || 'Moving Average',
    ino_mata_uang: profil.MATA_UANG || 'IDR',
    ino_format_tanggal: profil.FORMAT_TANGGAL || 'dd/MM/yyyy',
    ino_setting_categories: readColumn_(sh, SETTING_COL.KATEGORI),
    ino_setting_subcategories: readColumn_(sh, SETTING_COL.SUB_KATEGORI),
    ino_setting_units: readColumn_(sh, SETTING_COL.SATUAN),
    ino_setting_platforms: readColumn_(sh, SETTING_COL.PLATFORM),
    ino_setting_storages: readColumn_(sh, SETTING_COL.TEMPAT_SIMPAN),
    ino_setting_prefixes: prefixes,
    ino_setting_users: users,
  };
}

// ── SIMPAN SETTING (POST action=saveSettings) — semua field opsional, isi yang berubah saja ──
function saveSettings_(payload) {
  const sh = getSettingSheet_();

  if (payload.profil) {
    const lastRow = sh.getLastRow();
    const rows = lastRow >= SETTING_ROW_DATA
      ? sh.getRange(SETTING_ROW_DATA, SETTING_COL.PROFIL_KEY, lastRow - SETTING_ROW_DATA + 1, 1).getValues()
      : [];
    Object.keys(payload.profil).forEach(key => {
      if (!PROFIL_KEYS.includes(key)) return; // tolak key yang tidak dikenal
      const rowIdx = rows.findIndex(r => String(r[0]).trim() === key);
      if (rowIdx === -1) sh.appendRow([key, payload.profil[key]]);
      else sh.getRange(SETTING_ROW_DATA + rowIdx, SETTING_COL.PROFIL_VAL).setValue(payload.profil[key]);
    });
  }
  if (payload.categories) writeColumn_(sh, SETTING_COL.KATEGORI, payload.categories);
  if (payload.subcategories) writeColumn_(sh, SETTING_COL.SUB_KATEGORI, payload.subcategories);
  if (payload.units) writeColumn_(sh, SETTING_COL.SATUAN, payload.units);
  if (payload.platforms) writeColumn_(sh, SETTING_COL.PLATFORM, payload.platforms);
  if (payload.storages) writeColumn_(sh, SETTING_COL.TEMPAT_SIMPAN, payload.storages);
  if (payload.prefixes) {
    const maxRows = sh.getMaxRows();
    if (maxRows >= SETTING_ROW_DATA) sh.getRange(SETTING_ROW_DATA, SETTING_COL.PREFIX, maxRows - SETTING_ROW_DATA + 1, 2).clearContent();
    if (payload.prefixes.length) {
      sh.getRange(SETTING_ROW_DATA, SETTING_COL.PREFIX, payload.prefixes.length, 2)
        .setValues(payload.prefixes.map(p => [p.prefix, p.label || '']));
    }
  }
  return { ok: true };
}

// ── TAMBAH/UPDATE USER (POST action=saveUser) — password SELALU di-hash sebelum disimpan ──
function saveUser_(user) {
  if (!user.username || !user.password) throw new Error('username & password wajib diisi.');
  const sh = getSettingSheet_();
  const lastRow = sh.getLastRow();
  const rows = lastRow >= SETTING_ROW_DATA
    ? sh.getRange(SETTING_ROW_DATA, SETTING_COL.USER_EMAIL, lastRow - SETTING_ROW_DATA + 1, 1).getValues()
    : [];
  const rowIdx = rows.findIndex(r => String(r[0]).trim().toLowerCase() === user.username.trim().toLowerCase());
  const rowData = [user.username.trim(), user.nama || '', user.role || 'Kasir', hashPassword_(user.password)];
  if (rowIdx === -1) sh.getRange(sh.getLastRow() + 1, SETTING_COL.USER_EMAIL, 1, 4).setValues([rowData]);
  else sh.getRange(SETTING_ROW_DATA + rowIdx, SETTING_COL.USER_EMAIL, 1, 4).setValues([rowData]);
  return { ok: true };
}

// ── LOGIN (POST action=login) — verifikasi username + password di server, hash dibandingkan di sini ──
function login_(username, password) {
  const sh = getSettingSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < SETTING_ROW_DATA) return { ok: false, error: 'Belum ada user terdaftar.' };
  const rows = sh.getRange(SETTING_ROW_DATA, SETTING_COL.USER_EMAIL, lastRow - SETTING_ROW_DATA + 1, 4).getValues();
  const hash = hashPassword_(password);
  const match = rows.find(r =>
    String(r[0]).trim().toLowerCase() === String(username).trim().toLowerCase() &&
    String(r[3]).trim() === hash
  );
  if (!match) return { ok: false, error: 'Username atau password salah.' };
  return { ok: true, username: match[0], nama: match[1], role: match[2] };
}

// ================================================================
// MODUL: PRODUK, PO, SALES ORDER, STOCK OPNAME
// ------------------------------------------------------
// Strategi: array di React tetap "sumber kebenaran" (semua kalkulasi HPP/
// stok/status sudah dihitung di frontend). Sheet di sini cuma MIRROR penuh
// (overwrite semua baris tiap ada perubahan) — bukan append-log per baris.
// Ini cukup untuk histori (tiap PO/SO immutable, di-void bukan dihapus),
// tapi BUKAN mutasi stok kronologis (TRANS_INVENTORY_LOG belum digarap,
// giliran berikutnya kalau diperlukan).
// ================================================================

const COL = {
  DB: 14, PO_HDR: 15, PO_DTL: 7, SLS_HDR: 12, SLS_DTL: 6, SO: 14,
};
const ROW_START = {
  DB: 5, PO_HDR: 7, PO_DTL: 7, SLS_HDR: 7, SLS_DTL: 7, SO: 4,
};

function requireSheet_(name) {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sh) throw new Error('Sheet "' + name + '" tidak ditemukan.');
  return sh;
}

function overwriteRows_(sh, rowStart, colCount, rows) {
  const maxRows = sh.getMaxRows();
  if (maxRows >= rowStart) sh.getRange(rowStart, 1, maxRows - rowStart + 1, colCount).clearContent();
  if (!rows.length) return;
  sh.getRange(rowStart, 1, rows.length, colCount).setValues(rows);
}

function readRows_(sh, rowStart, colCount) {
  const lastRow = sh.getLastRow();
  if (lastRow < rowStart) return [];
  return sh.getRange(rowStart, 1, lastRow - rowStart + 1, colCount).getValues()
    .filter(r => String(r[0]).trim() !== '' || String(r[1]).trim() !== '');
}

// ── PRODUK (DB_MASTER) ──
function saveProducts_(products) {
  if (!Array.isArray(products)) throw new Error('payload produk harus array.');
  const rows = products.filter(p => p && p.sku).map(p => [
    p.sku, p.kategori || '', p.subKat || '', p.nama || '', p.satuan || '',
    Number(p.hj) || 0, Number(p.hpp) || 0, Number(p.safety) || 0, Number(p.stok) || 0,
    p.status || 'Aktif', p.supplier || '', p.tempatSimpan || '', p.masaSmp || '', p.catatan || '',
  ]);
  overwriteRows_(requireSheet_('DB_MASTER'), ROW_START.DB, COL.DB, rows);
  return { ok: true, count: rows.length };
}

function readProducts_() {
  return readRows_(requireSheet_('DB_MASTER'), ROW_START.DB, COL.DB).map(r => ({
    sku: r[0], kategori: r[1], subKat: r[2], nama: r[3], satuan: r[4],
    hj: Number(r[5]) || 0, hpp: Number(r[6]) || 0, safety: Number(r[7]) || 0, stok: Number(r[8]) || 0,
    status: r[9], supplier: r[10], tempatSimpan: r[11], masaSmp: r[12], catatan: r[13],
  }));
}

// ── PURCHASE ORDER (LOG_PO_HEADER + LOG_PO_DETAIL) ──
function savePurchaseOrders_(pos) {
  if (!Array.isArray(pos)) throw new Error('payload PO harus array.');
  const validPos = pos.filter(po => po && po.id);
  const headerRows = validPos.map(po => [
    po.tanggal || '', po.id, '', po.supplier || '', po.metode || '', '',
    Number(po.subtotal) || 0, 0, Number(po.pajak) || 0, Number(po.grandTotal) || 0,
    po.statusLogistik || '', po.statusBayar || '', '', po.tanggal || '', po.catatan || '',
  ]);
  const detailRows = [];
  validPos.forEach(po => (po.items || []).forEach(it => {
    if (!it || !it.sku) return;
    detailRows.push([po.id, it.sku, it.nama || '', Number(it.qty) || 0, it.satuan || '', Number(it.harga) || 0, Number(it.subtotal) || 0]);
  }));
  overwriteRows_(requireSheet_('LOG_PO_HEADER'), ROW_START.PO_HDR, COL.PO_HDR, headerRows);
  overwriteRows_(requireSheet_('LOG_PO_DETAIL'), ROW_START.PO_DTL, COL.PO_DTL, detailRows);
  return { ok: true, count: headerRows.length };
}

function readPurchaseOrders_() {
  const headers = readRows_(requireSheet_('LOG_PO_HEADER'), ROW_START.PO_HDR, COL.PO_HDR);
  const details = readRows_(requireSheet_('LOG_PO_DETAIL'), ROW_START.PO_DTL, COL.PO_DTL);
  return headers.map(h => {
    const noPo = h[1];
    const items = details.filter(d => d[0] === noPo).map(d => ({
      sku: d[1], nama: d[2], qty: Number(d[3]) || 0, satuan: d[4], harga: Number(d[5]) || 0, subtotal: Number(d[6]) || 0,
    }));
    return {
      id: noPo, tanggal: h[0], supplier: h[3], metode: h[4], items,
      subtotal: Number(h[6]) || 0, pajak: Number(h[8]) || 0, grandTotal: Number(h[9]) || 0,
      statusLogistik: h[10], statusBayar: h[11], catatan: h[14],
    };
  });
}

// ── SALES ORDER (LOG_SALES_HEADER + LOG_SALES_DETAIL) ──
function saveSalesOrders_(sos) {
  if (!Array.isArray(sos)) throw new Error('payload SO harus array.');
  const validSos = sos.filter(so => so && so.id);
  const headerRows = validSos.map(so => [
    so.tanggal || '', so.id, so.pelanggan || '', so.metode || '',
    Number(so.subtotal) || 0, 0, Number(so.pajak) || 0, Number(so.grandTotal) || 0,
    so.statusLogistik || '', so.statusBayar || '', '', so.catatan || '',
  ]);
  const detailRows = [];
  validSos.forEach(so => (so.items || []).forEach(it => {
    if (!it || !it.sku) return;
    detailRows.push([so.id, it.sku, it.nama || '', Number(it.qty) || 0, Number(it.harga) || 0, Number(it.subtotal) || 0]);
  }));
  overwriteRows_(requireSheet_('LOG_SALES_HEADER'), ROW_START.SLS_HDR, COL.SLS_HDR, headerRows);
  overwriteRows_(requireSheet_('LOG_SALES_DETAIL'), ROW_START.SLS_DTL, COL.SLS_DTL, detailRows);
  return { ok: true, count: headerRows.length };
}

function readSalesOrders_() {
  const headers = readRows_(requireSheet_('LOG_SALES_HEADER'), ROW_START.SLS_HDR, COL.SLS_HDR);
  const details = readRows_(requireSheet_('LOG_SALES_DETAIL'), ROW_START.SLS_DTL, COL.SLS_DTL);
  return headers.map(h => {
    const noSo = h[1];
    const items = details.filter(d => d[0] === noSo).map(d => ({
      sku: d[1], nama: d[2], qty: Number(d[3]) || 0, harga: Number(d[4]) || 0, subtotal: Number(d[5]) || 0,
    }));
    return {
      id: noSo, tanggal: h[0], pelanggan: h[2], metode: h[3], items,
      subtotal: Number(h[4]) || 0, pajak: Number(h[6]) || 0, grandTotal: Number(h[7]) || 0,
      statusLogistik: h[8], statusBayar: h[9], catatan: h[11],
    };
  });
}

// ── STOCK OPNAME (TRANS_SO&WASTE_LOG) ──
function saveOpnameLog_(logs) {
  if (!Array.isArray(logs)) throw new Error('payload opname harus array.');
  const rows = logs.filter(o => o && o.sku).map((o, idx) => [
    o.tanggal || '', o.id || ('OPN-' + idx), o.sku, o.nama || '', o.tipe || '', o.satuan || '',
    Number(o.qtySistem) || 0, Number(o.qtyFisik) || 0, Number(o.selisih) || 0,
    Number(o.HPP) || 0, Number(o.subtotal) || 0, '', o.catatan || '', o.operator || '',
  ]);
  overwriteRows_(requireSheet_('TRANS_SO&WASTE_LOG'), ROW_START.SO, COL.SO, rows);
  return { ok: true, count: rows.length };
}

function readOpnameLog_() {
  return readRows_(requireSheet_('TRANS_SO&WASTE_LOG'), ROW_START.SO, COL.SO).map(r => ({
    tanggal: r[0], id: r[1], sku: r[2], nama: r[3], tipe: r[4], satuan: r[5],
    qtySistem: Number(r[6]) || 0, qtyFisik: Number(r[7]) || 0, selisih: Number(r[8]) || 0,
    HPP: Number(r[9]) || 0, subtotal: Number(r[10]) || 0, catatan: r[12], operator: r[13],
  }));
}

function getModuleData_() {
  return {
    ino_products: readProducts_(),
    ino_purchase_orders: readPurchaseOrders_(),
    ino_sales_orders: readSalesOrders_(),
    ino_opname_log: readOpnameLog_(),
  };
}

// ================================================================
// ROUTER — doGet / doPost
// ================================================================
function doGet(e) {
  if (e.parameter.action === 'settings') return jsonOut_(getSettingsData_());
  if (e.parameter.action === 'data') return jsonOut_(getModuleData_());

  // fallback: modul yang belum dipindah masih baca dari AppState
  const sheet = getAppStateSheet_();
  const rows = sheet.getDataRange().getValues();
  const result = {};
  for (let i = 1; i < rows.length; i++) {
    const key = rows[i][0];
    if (!key) continue;
    try { result[key] = JSON.parse(rows[i][1]); } catch (err) { result[key] = rows[i][1]; }
  }
  return jsonOut_(result);
}

function doPost(e) {
  const body = JSON.parse(e.postData.contents);

  try {
    if (body.action === 'saveSettings') return jsonOut_(saveSettings_(body.payload || {}));
    if (body.action === 'saveUser') return jsonOut_(saveUser_(body.payload || {}));
    if (body.action === 'login') return jsonOut_(login_(body.username, body.password));
    if (body.action === 'saveProducts') return jsonOut_(saveProducts_(body.payload || []));
    if (body.action === 'savePurchaseOrders') return jsonOut_(savePurchaseOrders_(body.payload || []));
    if (body.action === 'saveSalesOrders') return jsonOut_(saveSalesOrders_(body.payload || []));
    if (body.action === 'saveOpnameLog') return jsonOut_(saveOpnameLog_(body.payload || []));
  } catch (err) {
    return jsonOut_({ ok: false, error: err.message });
  }

  // fallback: modul yang belum dipindah masih tulis ke AppState (key/value generik)
  const key = body.key;
  const value = body.value;
  if (!key) return jsonOut_({ ok: false, error: 'key kosong' });

  const sheet = getAppStateSheet_();
  const rows = sheet.getDataRange().getValues();
  let rowIndex = -1;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === key) { rowIndex = i + 1; break; }
  }
  const json = JSON.stringify(value);
  const now = new Date();
  if (rowIndex === -1) sheet.appendRow([key, json, now]);
  else sheet.getRange(rowIndex, 2, 1, 2).setValues([[json, now]]);
  return jsonOut_({ ok: true });
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
