// ============================================================
// INO ERP — Setup & Migrasi Schema Google Sheets (Idempoten)
// ============================================================

// ponytail: R1 - SCHEMA didefinisikan secara kanonikal di Code_ERP.gs.
// Semua file .gs berbagi satu scope global di Google Apps Script.

function setupSheetsAndHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Logger.log("=== MEMULAI SETUP / MIGRASI SKEMA SPREADSHEET ===");
  
  for (const sheetName in SCHEMA) {
    let sheet = ss.getSheetByName(sheetName);
    const expectedHeaders = SCHEMA[sheetName];
    
    // 1. Buat sheet jika belum ada
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      if (sheetName.startsWith('_')) {
        try { sheet.hideSheet(); } catch (e) {}
      }
      const range = sheet.getRange(1, 1, 1, expectedHeaders.length);
      range.setValues([expectedHeaders]);
      range.setFontWeight("bold");
      sheet.setFrozenRows(1);
      Logger.log("✓ Sheet baru dibuat: " + sheetName + " (" + expectedHeaders.length + " kolom)");
      continue;
    }
    
    // 2. Jika sheet sudah ada, cek header eksisting (idempoten — jangan timpa data)
    const lastCol = sheet.getLastColumn();
    let currentHeaders = [];
    if (lastCol > 0) {
      currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(h => String(h || '').trim());
    }
    
    if (currentHeaders.length === 0 || (currentHeaders.length === 1 && currentHeaders[0] === '')) {
      // Baris 1 kosong, set header baru
      const range = sheet.getRange(1, 1, 1, expectedHeaders.length);
      range.setValues([expectedHeaders]);
      range.setFontWeight("bold");
      sheet.setFrozenRows(1);
      Logger.log("✓ Header diisi untuk sheet kosong: " + sheetName);
    } else {
      // Cari kolom yang belum ada di sheet
      const missingColumns = expectedHeaders.filter(h => currentHeaders.indexOf(h) === -1);
      if (missingColumns.length > 0) {
        const startCol = currentHeaders.length + 1;
        const addRange = sheet.getRange(1, startCol, 1, missingColumns.length);
        addRange.setValues([missingColumns]);
        addRange.setFontWeight("bold");
        Logger.log("✓ Menambahkan " + missingColumns.length + " kolom baru ke " + sheetName + ": " + missingColumns.join(', '));
      } else {
        Logger.log("✓ Skema sudah sesuai untuk: " + sheetName);
      }
    }
  }
  
  Logger.log("=== SETUP SELESAI: Seluruh tabel dan kolom telah diselaraskan tanpa kehilangan data ===");
}
