function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('INO ERP')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
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
    'hargaJual', 'hpp', 'safetyStock', 'stok', 'masaSimpan', 'piutang', 'hutang',
    'qtyReceived', 'qtySold', 'qtyReturned', 'harga', 'komisiPct', 'subtotal',
    'diskon', 'ppn', 'grandTotal', 'qty', 'hargaBeli', 'pajak', 'debit', 'kredit',
    'saldo', 'qtySistem', 'qtyFisik', 'selisih', 'HPP'
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

// Helper to save whole bulk arrays (replaces all contents)
function saveAllToSheet(sheetName, items) {
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
}

// ----------------------------------------------------
// PRODUCTS
// ----------------------------------------------------
function getProducts() { try { return getSheetData('Products'); } catch(e) { throw new Error(e.message); } }
function saveProduct(product) { try { saveItemToSheet('Products', product, 'sku'); return true; } catch(e) { throw new Error(e.message); } }
function deleteProduct(sku) { try { deleteItemFromSheet('Products', sku, 'sku'); return true; } catch(e) { throw new Error(e.message); } }
function saveAllProducts(products) { try { saveAllToSheet('Products', products); return true; } catch(e) { throw new Error(e.message); } }

// ----------------------------------------------------
// CUSTOMERS
// ----------------------------------------------------
function getCustomers() { try { return getSheetData('Customers'); } catch(e) { throw new Error(e.message); } }
function saveCustomer(customer) { try { saveItemToSheet('Customers', customer, 'id'); return true; } catch(e) { throw new Error(e.message); } }
function deleteCustomer(id) { try { deleteItemFromSheet('Customers', id, 'id'); return true; } catch(e) { throw new Error(e.message); } }
function saveAllCustomers(customers) { try { saveAllToSheet('Customers', customers); return true; } catch(e) { throw new Error(e.message); } }

// ----------------------------------------------------
// SUPPLIERS
// ----------------------------------------------------
function getSuppliers() { try { return getSheetData('Suppliers'); } catch(e) { throw new Error(e.message); } }
function saveSupplier(supplier) { try { saveItemToSheet('Suppliers', supplier, 'id'); return true; } catch(e) { throw new Error(e.message); } }
function deleteSupplier(id) { try { deleteItemFromSheet('Suppliers', id, 'id'); return true; } catch(e) { throw new Error(e.message); } }
function saveAllSuppliers(suppliers) { try { saveAllToSheet('Suppliers', suppliers); return true; } catch(e) { throw new Error(e.message); } }

// ----------------------------------------------------
// CONSIGNMENTS
// ----------------------------------------------------
function getConsignments() { try { return getSheetData('Consignments'); } catch(e) { throw new Error(e.message); } }
function saveConsignment(consignment) { try { saveItemToSheet('Consignments', consignment, 'id'); return true; } catch(e) { throw new Error(e.message); } }
function deleteConsignment(id) { try { deleteItemFromSheet('Consignments', id, 'id'); return true; } catch(e) { throw new Error(e.message); } }
function saveAllConsignments(consignments) { try { saveAllToSheet('Consignments', consignments); return true; } catch(e) { throw new Error(e.message); } }

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

function savePurchaseOrder(order) {
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
      // Re-fetch after deletion in case rows shifted or it is empty now
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
  }
}

function deletePurchaseOrder(id) {
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

function saveAllPurchaseOrders(orders) {
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
    
    saveAllToSheet('PurchaseOrders', headers);
    saveAllToSheet('PurchaseOrderItems', allItems);
    return true;
  } catch(e) {
    throw new Error(e.message);
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

function saveSalesOrder(order) {
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
  }
}

function deleteSalesOrder(id) {
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

function saveAllSalesOrders(orders) {
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
    
    saveAllToSheet('SalesOrders', headers);
    saveAllToSheet('SalesOrderItems', allItems);
    return true;
  } catch(e) {
    throw new Error(e.message);
  }
}

// ----------------------------------------------------
// CASH LEDGER
// ----------------------------------------------------
function getCashLedger() { try { return getSheetData('CashLedger'); } catch(e) { throw new Error(e.message); } }
function saveCashEntry(entry) { try { saveItemToSheet('CashLedger', entry, 'id'); return true; } catch(e) { throw new Error(e.message); } }
function deleteCashEntry(id) { try { deleteItemFromSheet('CashLedger', id, 'id'); return true; } catch(e) { throw new Error(e.message); } }
function saveAllCashLedger(ledger) { try { saveAllToSheet('CashLedger', ledger); return true; } catch(e) { throw new Error(e.message); } }

// ----------------------------------------------------
// INVENTORY LOG (Append Only / Full Replace)
// ----------------------------------------------------
function getOpnameLog() { try { return getSheetData('InventoryLog'); } catch(e) { throw new Error(e.message); } }

function appendOpnameLog(logEntry) {
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

function saveAllOpnameLog(logs) { try { saveAllToSheet('InventoryLog', logs); return true; } catch(e) { throw new Error(e.message); } }
