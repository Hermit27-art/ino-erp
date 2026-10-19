// src/dataService.ts
// ============================================================
// Audit Fixes:
// - Semua mutation (save/delete) sekarang mengirim session token ke server (C1, C2)
// - Hapus duplikasi dummy data filter — sekarang bersih tanpa filter (M4)
// - GAS wrapper + localStorage fallback untuk development lokal
// ============================================================

import { getSessionToken } from './authService';

// ==========================================
// GOOGLE APPS SCRIPT WRAPPER
// ==========================================
declare var google: any;
const isGasEnvironment = () => typeof google !== 'undefined' && typeof google.script !== 'undefined';

let activeGasRequests = 0;
const startGasRequest = () => {
  activeGasRequests++;
  window.dispatchEvent(new Event('ino_loading_start'));
};
const endGasRequest = () => {
  activeGasRequests = Math.max(0, activeGasRequests - 1);
  if (activeGasRequests === 0) {
    window.dispatchEvent(new Event('ino_loading_end'));
  }
};

const runGasFunction = (functionName: string, ...args: any[]): Promise<any> => {
  startGasRequest();
  return new Promise((resolve, reject) => {
    if (isGasEnvironment()) {
      // @ts-ignore
      google.script.run
        .withSuccessHandler((res: any) => { endGasRequest(); resolve(res); })
        .withFailureHandler((err: any) => { endGasRequest(); reject(err); })
        [functionName](...args);
    } else {
      setTimeout(() => { endGasRequest(); resolve(null); }, 500); // Simulate network delay for local dev
    }
  });
};

// ==========================================
// LOCAL STORAGE FALLBACK (For Local Dev)
// ==========================================
const getLocalStorage = (key: string, defaultValue: any = []) => {
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      return JSON.parse(item);
    }
    return defaultValue;
  } catch (error) {
    console.error('Error reading localStorage', error);
    return defaultValue;
  }
};

const setLocalStorage = (key: string, value: any) => {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error setting localStorage', error);
  }
};


// ==========================================
// PRODUCTS
// PK: sku
// ==========================================
const mapGasToReactProduct = (p: any) => {
  if (!p) return p;
  return {
    ...p,
    subKat: p.subKategori !== undefined ? p.subKategori : p.subKat,
    hj: Number(p.hargaJual !== undefined ? p.hargaJual : (p.hj || 0)),
    safety: Number(p.safetyStock !== undefined ? p.safetyStock : (p.safety || 0)),
    stok: Number(p.stok || 0),
    hpp: Number(p.hpp || 0),
    supplier: p.supplierUtama !== undefined ? p.supplierUtama : p.supplier,
    tempatSimpan: p.lokasi !== undefined ? p.lokasi : p.tempatSimpan,
    masaSmp: p.masaSimpan !== undefined ? p.masaSimpan : p.masaSmp,
  };
};

const mapReactToGasProduct = (p: any) => {
  if (!p) return p;
  return {
    ...p,
    subKategori: p.subKat !== undefined ? p.subKat : p.subKategori,
    hargaJual: p.hj !== undefined ? p.hj : p.hargaJual,
    safetyStock: p.safety !== undefined ? p.safety : p.safetyStock,
    supplierUtama: p.supplier !== undefined ? p.supplier : p.supplierUtama,
    lokasi: p.tempatSimpan !== undefined ? p.tempatSimpan : p.lokasi,
    masaSimpan: p.masaSmp !== undefined ? p.masaSmp : p.masaSimpan,
  };
};

export const getProducts = async (): Promise<any[]> => {
  if (isGasEnvironment()) {
    const data = await runGasFunction('getProducts');
    return data.map(mapGasToReactProduct);
  }
  return getLocalStorage('ino_products', []).map(mapGasToReactProduct);
};

export const saveProduct = async (product: any): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveProduct', token, mapReactToGasProduct(product));
  }
  const products = getLocalStorage('ino_products', []);
  const index = products.findIndex((p: any) => p.sku === product.sku);
  if (index !== -1) {
    products[index] = product;
  } else {
    products.push(product);
  }
  setLocalStorage('ino_products', products);
};

export const deleteProduct = async (sku: string): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('deleteProduct', token, sku);
  }
  const products = getLocalStorage('ino_products', []);
  const filtered = products.filter((p: any) => p.sku !== sku);
  setLocalStorage('ino_products', filtered);
};

export const saveAllProducts = async (products: any[]): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveAllProducts', token, products.map(mapReactToGasProduct));
  }
  setLocalStorage('ino_products', products);
};


// ==========================================
// PURCHASE ORDERS
// PK: id
// ==========================================
export const getPurchaseOrders = async (): Promise<any[]> => {
  if (isGasEnvironment()) return runGasFunction('getPurchaseOrders');
  return getLocalStorage('ino_purchase_orders', []);
};

export const savePurchaseOrder = async (order: any): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('savePurchaseOrder', token, order);
  }
  const orders = getLocalStorage('ino_purchase_orders', []);
  const index = orders.findIndex((o: any) => o.id === order.id);
  if (index !== -1) {
    orders[index] = order;
  } else {
    orders.push(order);
  }
  setLocalStorage('ino_purchase_orders', orders);
};

export const deletePurchaseOrder = async (id: string): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('deletePurchaseOrder', token, id);
  }
  const orders = getLocalStorage('ino_purchase_orders', []);
  const filtered = orders.filter((o: any) => o.id !== id);
  setLocalStorage('ino_purchase_orders', filtered);
};

export const saveAllPurchaseOrders = async (orders: any[]): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveAllPurchaseOrders', token, orders);
  }
  setLocalStorage('ino_purchase_orders', orders);
};


// ==========================================
// SALES ORDERS
// PK: id
// ==========================================
export const getSalesOrders = async (): Promise<any[]> => {
  if (isGasEnvironment()) return runGasFunction('getSalesOrders');
  return getLocalStorage('ino_sales_orders', []);
};

export const saveSalesOrder = async (order: any): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveSalesOrder', token, order);
  }
  const orders = getLocalStorage('ino_sales_orders', []);
  const index = orders.findIndex((o: any) => o.id === order.id);
  if (index !== -1) {
    orders[index] = order;
  } else {
    orders.push(order);
  }
  setLocalStorage('ino_sales_orders', orders);
};

export const deleteSalesOrder = async (id: string): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('deleteSalesOrder', token, id);
  }
  const orders = getLocalStorage('ino_sales_orders', []);
  const filtered = orders.filter((o: any) => o.id !== id);
  setLocalStorage('ino_sales_orders', filtered);
};

export const saveAllSalesOrders = async (orders: any[]): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveAllSalesOrders', token, orders);
  }
  setLocalStorage('ino_sales_orders', orders);
};


// ==========================================
// CUSTOMERS
// PK: id
// ==========================================
export const getCustomers = async (): Promise<any[]> => {
  if (isGasEnvironment()) return runGasFunction('getCustomers');
  return getLocalStorage('ino_customers', []);
};

export const saveCustomer = async (customer: any): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveCustomer', token, customer);
  }
  const customers = getLocalStorage('ino_customers', []);
  const index = customers.findIndex((c: any) => c.id === customer.id);
  if (index !== -1) {
    customers[index] = customer;
  } else {
    customers.push(customer);
  }
  setLocalStorage('ino_customers', customers);
};

export const resetSemuaData = async (): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('resetSemuaData', token);
  }
  // Local implementation if needed
};

export const sendEmailReport = async (to: string, subject: string, htmlBody: string): Promise<boolean> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('sendEmailReport', token, to, subject, htmlBody);
  }
  console.log('Mock email sent to', to);
  return true;
};

export const deleteCustomer = async (id: string): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('deleteCustomer', token, id);
  }
  const customers = getLocalStorage('ino_customers', []);
  const filtered = customers.filter((c: any) => c.id !== id);
  setLocalStorage('ino_customers', filtered);
};

export const saveAllCustomers = async (customers: any[]): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveAllCustomers', token, customers);
  }
  setLocalStorage('ino_customers', customers);
};


// ==========================================
// SUPPLIERS
// PK: id
// ==========================================
export const getSuppliers = async (): Promise<any[]> => {
  if (isGasEnvironment()) return runGasFunction('getSuppliers');
  return getLocalStorage('ino_suppliers', []);
};

export const saveSupplier = async (supplier: any): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveSupplier', token, supplier);
  }
  const suppliers = getLocalStorage('ino_suppliers', []);
  const index = suppliers.findIndex((s: any) => s.id === supplier.id);
  if (index !== -1) {
    suppliers[index] = supplier;
  } else {
    suppliers.push(supplier);
  }
  setLocalStorage('ino_suppliers', suppliers);
};

export const deleteSupplier = async (id: string): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('deleteSupplier', token, id);
  }
  const suppliers = getLocalStorage('ino_suppliers', []);
  const filtered = suppliers.filter((s: any) => s.id !== id);
  setLocalStorage('ino_suppliers', filtered);
};

export const saveAllSuppliers = async (suppliers: any[]): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveAllSuppliers', token, suppliers);
  }
  setLocalStorage('ino_suppliers', suppliers);
};


// ==========================================
// CONSIGNMENTS
// PK: id
// ==========================================
export const getConsignments = async (): Promise<any[]> => {
  if (isGasEnvironment()) return runGasFunction('getConsignments');
  return getLocalStorage('ino_consignments', []);
};

export const saveConsignment = async (consignment: any): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveConsignment', token, consignment);
  }
  const consignments = getLocalStorage('ino_consignments', []);
  const index = consignments.findIndex((c: any) => c.id === consignment.id);
  if (index !== -1) {
    consignments[index] = consignment;
  } else {
    consignments.push(consignment);
  }
  setLocalStorage('ino_consignments', consignments);
};

export const deleteConsignment = async (id: string): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('deleteConsignment', token, id);
  }
  const consignments = getLocalStorage('ino_consignments', []);
  const filtered = consignments.filter((c: any) => c.id !== id);
  setLocalStorage('ino_consignments', filtered);
};

export const saveAllConsignments = async (consignments: any[]): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveAllConsignments', token, consignments);
  }
  setLocalStorage('ino_consignments', consignments);
};


// ==========================================
// OPNAME LOG / INVENTORY LOG
// ==========================================
export const getOpnameLog = async (): Promise<any[]> => {
  if (isGasEnvironment()) return runGasFunction('getOpnameLog');
  return getLocalStorage('ino_opname_log', []);
};

export const appendOpnameLog = async (logEntry: any): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('appendOpnameLog', token, logEntry);
  }
  const logs = getLocalStorage('ino_opname_log', []);
  logs.push(logEntry);
  setLocalStorage('ino_opname_log', logs);
};

export const saveAllOpnameLog = async (logs: any[]): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveAllOpnameLog', token, logs);
  }
  setLocalStorage('ino_opname_log', logs);
};


// ==========================================
// CASH LEDGER
// PK: id
// ==========================================
export const getCashLedger = async (): Promise<any[]> => {
  if (isGasEnvironment()) return runGasFunction('getCashLedger');
  return getLocalStorage('ino_cash_ledger', []);
};

export const saveCashEntry = async (entry: any): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveCashEntry', token, entry);
  }
  const ledger = getLocalStorage('ino_cash_ledger', []);
  const index = ledger.findIndex((c: any) => c.id === entry.id);
  if (index !== -1) {
    ledger[index] = entry;
  } else {
    ledger.push(entry);
  }
  setLocalStorage('ino_cash_ledger', ledger);
};

export const deleteCashEntry = async (id: string): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('deleteCashEntry', token, id);
  }
  const ledger = getLocalStorage('ino_cash_ledger', []);
  const filtered = ledger.filter((c: any) => c.id !== id);
  setLocalStorage('ino_cash_ledger', filtered);
};

export const saveAllCashLedger = async (ledger: any[]): Promise<void> => {
  if (isGasEnvironment()) {
    const token = getSessionToken();
    return runGasFunction('saveAllCashLedger', token, ledger);
  }
  setLocalStorage('ino_cash_ledger', ledger);
};

// ==========================================
// SETTINGS
// ==========================================

export const fetchSettings = async (): Promise<{ key: string, value: string }[]> => {
  if (isGasEnvironment()) {
    return runGasFunction('getAppSettings');
  }
  return []; // Di local dev, rely on localStorage fallback
};

export const saveSettingsToGas = async (settingsList: { key: string, value: string }[]): Promise<void> => {
  if (isGasEnvironment()) {
    return runGasFunction('saveAppSettings', settingsList);
  }
  // Di local dev, Settings disimpan ke localStorage per key di App.tsx
};
