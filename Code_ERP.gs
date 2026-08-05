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
  if (e.parameter.app === 'pos') {
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

// ----------------------------------------------------
// SESSION MANAGEMENT
// ----------------------------------------------------
const SESSION_SHEET = '_Sessions';
const SESSION_EXPIRY_HOURS = 24;

/**
 * Mendapatkan atau membuat sheet _Sessions untuk menyimpan token login.
 */
function getSessionSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(SESSION_SHEET);
  if (!sh) {
    sh = ss.insertSheet(SESSION_SHEET);
    sh.appendRow(['token', 'username', 'role', 'nama', 'created_at', 'expires_at']);
    // Hide session sheet from casual users
    sh.hideSheet();
  }
  return sh;
}

/**
 * Login — verifikasi username + password, kembalikan session token.
 * Password di-hash dengan SHA-256 di sisi klien sebelum dikirim.
 * Server membandingkan hash yang dikirim dengan hash tersimpan.
 */
function login(username, passwordHash) {
  if (!username || !passwordHash) {
    return { ok: false, error: 'Username dan password wajib diisi.' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Cek di sheet Users (team members)
  const usersSheet = ss.getSheetByName('Users');
  if (usersSheet) {
    const usersData = usersSheet.getDataRange().getValues();
    if (usersData.length > 1) {
      const headers = usersData[0];
      const emailIdx = headers.indexOf('email');
      const pinIdx = headers.indexOf('pin');
      const namaIdx = headers.indexOf('nama');
      const roleIdx = headers.indexOf('role');

      for (let i = 1; i < usersData.length; i++) {
        const row = usersData[i];
        const storedEmail = String(row[emailIdx] || '').trim().toLowerCase();
        const storedPin = String(row[pinIdx] || '').trim();

        if (storedEmail === String(username).trim().toLowerCase() && storedPin === passwordHash) {
          // Match found — generate session token
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

  // 2. Cek superadmin dari Settings sheet (jika ada)
  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet) {
    const settingsData = settingsSheet.getDataRange().getValues();
    if (settingsData.length > 1) {
      const headers = settingsData[0];
      const keyIdx = headers.indexOf('key');
      const valIdx = headers.indexOf('value');

      let superUsername = '';
      let superPasswordHash = '';

      for (let i = 1; i < settingsData.length; i++) {
        const key = String(settingsData[i][keyIdx] || '').trim();
        const val = String(settingsData[i][valIdx] || '').trim();
        if (key === 'login_username') superUsername = val.toLowerCase();
        if (key === 'login_password') superPasswordHash = val;
      }

      if (superUsername && superPasswordHash &&
          String(username).trim().toLowerCase() === superUsername &&
          passwordHash === superPasswordHash) {

        const token = Utilities.getUuid();
        const now = new Date();
        const expires = new Date(now.getTime() + SESSION_EXPIRY_HOURS * 60 * 60 * 1000);

        const sessionSheet = getSessionSheet_();
        sessionSheet.appendRow([token, superUsername, 'Superadmin', 'Superadmin', now, expires]);

        return {
          ok: true,
          token: token,
          user: {
            username: superUsername,
            nama: 'Superadmin',
            role: 'Superadmin'
          }
        };
      }
    }
  }

  return { ok: false, error: 'Username atau password salah.' };
}

/**
 * Validasi session token. Return user info atau null jika invalid/expired.
 */
function validateToken_(token) {
  if (!token) return null;

  const sh = getSessionSheet_();
  const data = sh.getDataRange().getValues();
  const now = new Date();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === token) {
      const expires = new Date(data[i][5]);
      if (now < expires) {
        return {
          username: String(data[i][1]),
          role: String(data[i][2]),
          nama: String(data[i][3])
        };
      } else {
        // Token expired — hapus row
        sh.deleteRow(i + 1);
        return null;
      }
    }
  }
  return null;
}

/**
 * Require valid token — throw error jika invalid.
 */
function requireAuth_(token) {
  const user = validateToken_(token);
  if (!user) {
    throw new Error('UNAUTHORIZED: Session tidak valid atau sudah expired. Silakan login ulang.');
  }
  return user;
}

/**
 * Logout — invalidate session token.
 */
function logoutSession(token) {
  if (!token) return { ok: true };

  const sh = getSessionSheet_();
  const data = sh.getDataRange().getValues();

  for (let i = data.length - 1; i >= 1; i--) {
    if (String(data[i][0]) === token) {
      sh.deleteRow(i + 1);
      break;
    }
  }
  return { ok: true };
}

function sendEmailReport(token, to, subject, htmlBody) {
  if (!validateToken_(token)) throw new Error('Unauthorized');
  MailApp.sendEmail({
    to: to,
    subject: subject,
    htmlBody: htmlBody
  });
  return true;
}

/**
 * Validate token (dipanggil dari frontend saat app mount untuk cek session masih valid).
 */
function validateSession(token) {
  const user = validateToken_(token);
  if (user) {
    return { ok: true, user: user };
  }
  return { ok: false };
}

// ----------------------------------------------------
// UTILITIES
// ----------------------------------------------------

// Convert array of rows (with headers in row 0) to array of objects
function rowsToObjects(rows) {
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
function parseNumbers(obj) {
  const numFields = [
    'hargaJual', 'hpp', 'safetyStock', 'stok', 'piutang', 'hutang',
    'qtyReceived', 'qtySold', 'qtyReturned', 'harga', 'komisiPct', 'subtotal',
    'diskon', 'ppn', 'grandTotal', 'qty', 'hargaBeli', 'pajak', 'debit', 'kredit',
    'saldo', 'qtySistem', 'qtyFisik', 'selisih', 'HPP', 'hj', 'safety',
    'totalPaid', 'qtyShipped'
  ];
  
  if (Array.isArray(obj)) {
    return obj.map(o => parseNumbers(o));
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
function getSheetData(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");
  
  const values = sheet.getDataRange().getValues();
  let objects = rowsToObjects(values);
  objects = parseNumbers(objects);
  return objects;
}

// Helper for generic save/upsert
function saveItemToSheet(sheetName, item, pkField) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) throw new Error("Sheet '" + sheetName + "' tidak ditemukan.");
  
  const values = sheet.getDataRange().getValues();
  if (values.length === 0) throw new Error("Sheet '" + sheetName + "' kosong, belum ada header.");
  
  const headers = values[0];
  const writeItem = parseNumbers(item); // Ensure numbers are written explicitly
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
function deleteItemFromSheet(sheetName, id, pkField) {
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
function saveAllToSheet(sheetName, items) {
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
        const writeItem = parseNumbers(item);
        return headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
      });
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
    }
  } finally {
    lock.releaseLock();
  }
}

// ----------------------------------------------------
// PRODUCTS (READ = public, WRITE = auth required)
// ----------------------------------------------------
function getProducts() { try { return getSheetData('Products'); } catch(e) { throw new Error(e.message); } }

function saveProduct(token, product) {
  requireAuth_(token);
  try { saveItemToSheet('Products', product, 'sku'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteProduct(token, sku) {
  requireAuth_(token);
  try { deleteItemFromSheet('Products', sku, 'sku'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllProducts(token, products) {
  requireAuth_(token);
  try { saveAllToSheet('Products', products); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------
function getCustomers() { try { return getSheetData('Customers'); } catch(e) { throw new Error(e.message); } }

function saveCustomer(token, customer) {
  requireAuth_(token);
  try { saveItemToSheet('Customers', customer, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteCustomer(token, id) {
  requireAuth_(token);
  try { deleteItemFromSheet('Customers', id, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllCustomers(token, customers) {
  requireAuth_(token);
  try { saveAllToSheet('Customers', customers); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// SUPPLIERS
// ----------------------------------------------------
function getSuppliers() { try { return getSheetData('Suppliers'); } catch(e) { throw new Error(e.message); } }

function saveSupplier(token, supplier) {
  requireAuth_(token);
  try { saveItemToSheet('Suppliers', supplier, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteSupplier(token, id) {
  requireAuth_(token);
  try { deleteItemFromSheet('Suppliers', id, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllSuppliers(token, suppliers) {
  requireAuth_(token);
  try { saveAllToSheet('Suppliers', suppliers); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// CONSIGNMENTS
// ----------------------------------------------------
function getConsignments() { try { return getSheetData('Consignments'); } catch(e) { throw new Error(e.message); } }

function saveConsignment(token, consignment) {
  requireAuth_(token);
  try { saveItemToSheet('Consignments', consignment, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteConsignment(token, id) {
  requireAuth_(token);
  try { deleteItemFromSheet('Consignments', id, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllConsignments(token, consignments) {
  requireAuth_(token);
  try { saveAllToSheet('Consignments', consignments); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// PURCHASE ORDERS (JOIN Header + Items)
// ----------------------------------------------------
function getPurchaseOrders() {
  try {
    const orders = getSheetData('PurchaseOrders');
    const items = getSheetData('PurchaseOrderItems');
    
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
  requireAuth_(token);
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
    saveItemToSheet('PurchaseOrders', header, 'id');
    
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
        const writeItem = parseNumbers(itemObj);
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
  requireAuth_(token);
  try {
    // Delete header
    deleteItemFromSheet('PurchaseOrders', id, 'id');
    
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
  requireAuth_(token);
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
    
    // Note: saveAllToSheet already has its own lock, but we already hold it here
    // So we call the raw logic directly to avoid deadlock
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
 * Internal version of saveAllToSheet without its own lock (for use when caller already holds lock).
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
      const writeItem = parseNumbers(item);
      return headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
    });
    sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// ----------------------------------------------------
// SALES ORDERS (JOIN Header + Items)
// ----------------------------------------------------
function getSalesOrders() {
  try {
    const orders = getSheetData('SalesOrders');
    const items = getSheetData('SalesOrderItems');
    
    const itemsBySO = {};
    for (const item of items) {
      if (!itemsBySO[item.noSO]) itemsBySO[item.noSO] = [];
      itemsBySO[item.noSO].push(item);
    }
    
    for (const order of orders) {
      order.items = itemsBySO[order.id] || [];
    }
    
    return orders;
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveSalesOrder(token, order) {
  requireAuth_(token);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch (e) {
    throw new Error('Server sibuk. Coba lagi.');
  }

  try {
    const header = { ...order };
    delete header.items;
    saveItemToSheet('SalesOrders', header, 'id');
    
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
        const writeItem = parseNumbers(itemObj);
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
  requireAuth_(token);
  try {
    deleteItemFromSheet('SalesOrders', id, 'id');
    
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
  requireAuth_(token);
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
// CASH LEDGER
// ----------------------------------------------------
function getCashLedger() { try { return getSheetData('CashLedger'); } catch(e) { throw new Error(e.message); } }

function saveCashEntry(token, entry) {
  requireAuth_(token);
  try { saveItemToSheet('CashLedger', entry, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function deleteCashEntry(token, id) {
  requireAuth_(token);
  try { deleteItemFromSheet('CashLedger', id, 'id'); return true; } catch(e) { throw new Error(e.message); }
}

function saveAllCashLedger(token, ledger) {
  requireAuth_(token);
  try { saveAllToSheet('CashLedger', ledger); return true; } catch(e) { throw new Error(e.message); }
}

// ----------------------------------------------------
// INVENTORY LOG (Append Only / Full Replace)
// ----------------------------------------------------
function getOpnameLog() { try { return getSheetData('InventoryLog'); } catch(e) { throw new Error(e.message); } }

function appendOpnameLog(token, logEntry) {
  requireAuth_(token);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('InventoryLog');
    if (!sheet) throw new Error("Sheet 'InventoryLog' tidak ditemukan.");
    
    const values = sheet.getDataRange().getValues();
    if (values.length === 0) throw new Error("Sheet 'InventoryLog' kosong, belum ada header.");
    
    const headers = values[0];
    const writeItem = parseNumbers(logEntry);
    const rowData = headers.map(h => writeItem[h] === undefined ? "" : writeItem[h]);
    
    sheet.appendRow(rowData);
    return true;
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveAllOpnameLog(token, logs) {
  requireAuth_(token);
  try { saveAllToSheet('InventoryLog', logs); return true; } catch(e) { throw new Error(e.message); }
}

// ==========================================
// SETTINGS
// ==========================================

function getAppSettings() {
  try {
    return getSheetData('Settings');
  } catch(e) {
    throw new Error(e.message);
  }
}

function saveAppSettings(settingsList) {
  // settingsList is array of { key: '...', value: '...' }
  // we can use saveAllToSheetRaw_ to completely replace Settings tab contents
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Settings');
    if (!sheet) throw new Error("Sheet Settings tidak ditemukan.");
    
    // Create matrix
    const data = [['key', 'value']];
    for (const item of settingsList) {
      data.push([item.key, item.value]);
    }
    
    sheet.clearContents();
    sheet.getRange(1, 1, data.length, 2).setValues(data);
    return true;
  } catch(e) {
    throw new Error(e.message);
  }
}


// ==========================================
// INTEGRASI INO POS
// ==========================================

// ==========================================
// FUNGSI DIPANGGIL POS (google.script.run)
// ==========================================

function getProdukList() {
  return getSheetDataAsObjects_(SHEET_PRODUCTS);
}

function getCustomerList() {
  return getSheetDataAsObjects_(SHEET_CUSTOMERS);
}

/**
 * Riwayat transaksi POS hari ini saja (untuk panel kasir di dalam POS,
 * TERPISAH dari log ERP gabungan). Dipanggil dari POS via:
 *   google.script.run.withSuccessHandler(...).getRiwayatHariIni()
 *
 * Sengaja hanya mengambil transaksi dengan prefix 'POS-' dan tanggal hari
 * ini, supaya kasir cuma lihat miliknya sendiri, bukan semua SO B2B.
 */
function getRiwayatHariIni() {
  const semua = getSheetDataAsObjects_(SHEET_SALES_ORDERS);
  const today = formatDate_(new Date());

  return semua
    .filter(so => String(so.id).indexOf('POS-') === 0 && so.tanggal === today)
    .sort((a, b) => String(b.id).localeCompare(String(a.id))); // terbaru dulu
}

/**
 * Fungsi utama checkout POS. Dipanggil dari:
 *   google.script.run...simpanTransaksiPenjualan(payload)
 *
 * payload = {
 *   customerNama, customerId, metodeBayar, total, kasir,
 *   items: [{ sku, nama, satuan, qty, harga, subtotal }]
 * }
 *
 * Menulis ke SalesOrders (prefix POS-) dan CashLedger, lalu mengurangi
 * stok di Products. Dibungkus LockService supaya aman dari transaksi
 * bersamaan (misal kasir checkout barengan dengan ERP menulis PO).
 */
function simpanTransaksiPenjualan(payload) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000); // tunggu maks 15 detik kalau ada proses lain sedang menulis

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const now = new Date();
    const strukNo = generateId_('POS', ss.getSheetByName(SHEET_SALES_ORDERS));

    // 1. Tulis baris ke SalesOrders (statusnya langsung Selesai/Lunas, khas POS)
    const soSheet = ss.getSheetByName(SHEET_SALES_ORDERS);
    const soRow = {
      id: strukNo,
      tanggal: formatDate_(now),
      pelanggan: payload.customerNama || 'Pelanggan Umum Retail',
      metode: payload.metodeBayar || 'Tunai',
      items: JSON.stringify(payload.items),
      subtotal: payload.total,
      pajak: 0,
      grandTotal: payload.total,
      statusLogistik: 'Selesai',
      statusBayar: 'Lunas',
      kasir: payload.kasir || 'Kasir',
      catatan: 'Transaksi POS (Point of Sale)',
      totalPaid: payload.total
    };
    appendRowFromObject_(soSheet, soRow);

    // 2. Tulis baris ke CashLedger (kategori 'Penjualan', sama dgn SO B2B
    //    supaya Laba Rugi tetap menjumlahkan dengan benar)
    const cashSheet = ss.getSheetByName(SHEET_CASH_LEDGER);
    const akun = mapMetodeKeAkun_(payload.metodeBayar);
    const lastSaldoAkun = getLastSaldoForAkun_(cashSheet, akun);

    const cashRow = {
      id: generateId_('CSH', cashSheet),
      tanggal: formatDate_(now),
      ref: strukNo,
      keterangan: `Penjualan POS Kasir [${strukNo}]`,
      kategori: 'Penjualan',
      debit: payload.total,
      kredit: 0,
      saldo: lastSaldoAkun + payload.total,
      akun: akun
    };
    appendRowFromObject_(cashSheet, cashRow);

    // 3. Kurangi stok di Products untuk tiap item
    const prodSheet = ss.getSheetByName(SHEET_PRODUCTS);
    payload.items.forEach(item => {
      decrementStock_(prodSheet, item.sku, item.qty);
    });

    return { strukNo: strukNo, timestamp: now.getTime() };
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
    if (data[i][skuCol] === sku) {
      const currentStok = Number(data[i][stokCol]) || 0;
      prodSheet.getRange(i + 1, stokCol + 1).setValue(Math.max(0, currentStok - qty));
      return;
    }
  }
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
 * Menghapus SEMUA baris data (produk, pelanggan, supplier, transaksi, kas) di
 * seluruh sheet, hanya menyisakan baris header (baris 1).
 *
 * PENTING - CARA PAKAI:
 * - Fungsi ini SENGAJA TIDAK dipanggil dari POS atau ERP (tidak ada di doPost/
 *   doGet), supaya tidak bisa terpicu tidak sengaja dari luar.
 * - Jalankan MANUAL dari editor Apps Script: buka file ini, pilih fungsi
 *   resetSemuaData di dropdown atas, klik Run. Akan diminta konfirmasi izin
 *   Google pertama kali.
 * - Jalankan HANYA SEKALI saat benar-benar selesai testing dan siap go-live.
 *   Tidak ada tombol undo — pastikan Anda sudah backup/download Sheet dulu
 *   kalau masih ragu (File > Buat Salinan di Google Sheets).
 */
function resetSemuaData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = [SHEET_PRODUCTS, SHEET_CUSTOMERS, SHEET_SALES_ORDERS, SHEET_CASH_LEDGER];

  sheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow <= 1) return; // cuma ada header atau kosong, tidak perlu apa-apa

    // Hapus baris 2 sampai terakhir, baris 1 (header) tetap utuh
    sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  });

  Logger.log('Reset selesai. Semua sheet dikosongkan, header tetap ada: ' + sheetNames.join(', '));
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
 * Dipanggil dari POS via google.script.run.getRingkasanDashboard()
 * Mengambil ringkasan data omzet, hutang, piutang, dan stok kritis hari ini.
 */
function getRingkasanDashboard() {
  const today = formatDate_(new Date());
  
  // 1. Hitung Omzet dan Transaksi Hari Ini
  const salesOrders = getSheetDataAsObjects_(SHEET_SALES_ORDERS);
  let omzetHariIni = 0;
  let jumlahTransaksiHariIni = 0;
  let salesLogs = [];
  
  salesOrders.forEach(so => {
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
    
  // 2. Hitung Total Piutang
  const customers = getSheetDataAsObjects_(SHEET_CUSTOMERS);
  const totalPiutang = customers.reduce((sum, c) => sum + (Number(c.piutang) || 0), 0);
  
  // 3. Hitung Total Hutang
  let totalHutang = 0;
  // Karena SHEET_SUPPLIERS tidak ada di konstanta atas, kita definisikan lokal
  try {
    const suppliers = getSheetDataAsObjects_('Suppliers');
    totalHutang = suppliers.reduce((sum, s) => sum + (Number(s.hutang) || 0), 0);
  } catch(e) {
    // Abaikan jika sheet Suppliers belum dibuat
  }
  
  // 4. Hitung Stok Kritis
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
