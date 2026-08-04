function setupSheetsAndHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Define the schema for sheets and their respective headers
  const schema = {
    "Products": ["sku", "kategori", "subKategori", "nama", "satuan", "hargaJual", "hpp", "safetyStock", "stok", "status", "supplierUtama", "lokasi", "masaSimpan", "catatan"],
    "Customers": ["id", "nama", "kontak", "email", "telp", "alamat", "piutang"],
    "Suppliers": ["id", "nama", "kontak", "email", "telp", "alamat", "hutang"],
    "Consignments": ["id", "consignor", "tanggal", "sku", "nama", "qtyReceived", "qtySold", "qtyReturned", "harga", "komisiPct", "status", "catatan"],
    "PurchaseOrders": ["id", "tanggal", "supplierId", "namaSupplier", "terminPembayaran", "jatuhTempo", "subtotal", "diskon", "ppn", "grandTotal", "statusLogistik", "statusPembayaran", "dibuatOleh", "tanggalUpdate", "catatan"],
    "PurchaseOrderItems": ["noPO", "sku", "namaProduk", "qty", "qtyReceived", "satuan", "hargaBeli", "subtotal"],
    "SalesOrders": ["id", "tanggal", "pelanggan", "metodePembayaran", "subtotal", "diskon", "pajak", "grandTotal", "statusLogistik", "statusPembayaran", "kasir", "catatan"],
    "SalesOrderItems": ["noSO", "sku", "namaProduk", "qty", "hargaJual", "subtotal"],
    "CashLedger": ["id", "tanggal", "ref", "keterangan", "kategori", "debit", "kredit", "saldo", "akun"],
    "InventoryLog": ["tanggal", "sku", "nama", "tipe", "qtySistem", "qtyFisik", "selisih", "satuan", "HPP", "subtotal", "catatan", "operator"],
    "Settings": ["key", "value"]
  };
  
  // Iterate through the schema and setup each sheet
  for (const sheetName in schema) {
    let sheet = ss.getSheetByName(sheetName);
    
    // 1. Create sheet if it doesn't exist
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log("Created new sheet: " + sheetName);
    } else {
      Logger.log("Sheet already exists: " + sheetName);
    }
    
    // 2. Set headers on the first row
    const headers = schema[sheetName];
    if (headers && headers.length > 0) {
      const range = sheet.getRange(1, 1, 1, headers.length);
      range.setValues([headers]);
      
      // Optional: Bold the headers for better visibility and freeze the top row
      range.setFontWeight("bold");
      sheet.setFrozenRows(1);
      
      Logger.log("-> Headers set for: " + sheetName);
    }
  }
  
  Logger.log("Setup complete! Semua tab dan header sudah berhasil dibuat.");
}
