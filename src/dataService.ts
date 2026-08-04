// src/dataService.ts

// ==========================================
// GOOGLE APPS SCRIPT WRAPPER
// ==========================================
declare var google: any; // GAS runtime global — hanya tersedia di environment Google Apps Script
const isGasEnvironment = () => typeof google !== 'undefined' && typeof google.script !== 'undefined';

const runGasFunction = (functionName: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    if (isGasEnvironment()) {
      // @ts-ignore
      google.script.run
        .withSuccessHandler(resolve)
        .withFailureHandler((error: any) => {
          console.error(`GAS Error in ${functionName}:`, error);
          reject(error);
        })
        [functionName](...args);
    } else {
      reject(new Error("Not in GAS environment"));
    }
  });
};

// ==========================================
// LOCAL STORAGE FALLBACK (For Local Dev)
// ==========================================
// Helper untuk membaca dari localStorage
const getLocalStorage = (key: string, defaultValue: any = []) => {
  try {
    const item = window.localStorage.getItem(key);
    if (item) {
      let data = JSON.parse(item);
      if (Array.isArray(data)) {
        data = data.filter((entry: any) => {
          const id = entry.id || entry.sku || entry.ref || '';
          const name = entry.nama || entry.keterangan || entry.consignor || '';
          
          const isDummyId = [
            'CSG-20260601-001', 'CSG-20260610-002', 'CON-0001', 'CON-0002',
            'RTL-0001', 'RTL-0002', 'RTL-0003',
            'CSH-20260601-001', 'CSH-20260605-002', 'CSH-20260610-003', 'CSH-20260615-004', 'CSH-20260620-005', 'CSH-20260623-006', 'CSH-20260624-007',
            'PO-20260601-001', 'SO-20260610-001', 'SO-20260615-002', 'SO-20260620-003', 'SO-20260625-004',
            'FG-0001', 'RAW-0001', 'RAW-0002', 'PKG-0001', 'BOM-FG-0001',
            'MODAL-001'
          ].includes(id);

          const isDummyName = [
            'Kedai Kopi Kawan', 'PT. Kopi Gayo', 'PT. Roti Consign', 'CV. Bakery Supplier', 'PT. Donut Indonesia',
            'Setoran Modal Awal', 'Setoran Modal Kerja Retail', 'Setoran Modal Kerja Awal', 'Setoran Modal Awal Toko Konsinyasi',
            'PT. Sentosa Makmur', 'Sourdough Bakery'
          ].some(dummy => name.includes(dummy));

          return !(isDummyId || isDummyName);
        });
      }
      return data;
    }
    return defaultValue;
  } catch (error) {
    console.error('Error reading localStorage', error);
    return defaultValue;
  }
};

// Helper untuk menulis ke localStorage
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
export const getProducts = async (): Promise<any[]> => {
  if (isGasEnvironment()) return runGasFunction('getProducts');
  return getLocalStorage('ino_products', []);
};

export const saveProduct = async (product: any): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveProduct', product);
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
  if (isGasEnvironment()) return runGasFunction('deleteProduct', sku);
  const products = getLocalStorage('ino_products', []);
  const filtered = products.filter((p: any) => p.sku !== sku);
  setLocalStorage('ino_products', filtered);
};

export const saveAllProducts = async (products: any[]): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveAllProducts', products);
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
  if (isGasEnvironment()) return runGasFunction('savePurchaseOrder', order);
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
  if (isGasEnvironment()) return runGasFunction('deletePurchaseOrder', id);
  const orders = getLocalStorage('ino_purchase_orders', []);
  const filtered = orders.filter((o: any) => o.id !== id);
  setLocalStorage('ino_purchase_orders', filtered);
};

export const saveAllPurchaseOrders = async (orders: any[]): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveAllPurchaseOrders', orders);
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
  if (isGasEnvironment()) return runGasFunction('saveSalesOrder', order);
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
  if (isGasEnvironment()) return runGasFunction('deleteSalesOrder', id);
  const orders = getLocalStorage('ino_sales_orders', []);
  const filtered = orders.filter((o: any) => o.id !== id);
  setLocalStorage('ino_sales_orders', filtered);
};

export const saveAllSalesOrders = async (orders: any[]): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveAllSalesOrders', orders);
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
  if (isGasEnvironment()) return runGasFunction('saveCustomer', customer);
  const customers = getLocalStorage('ino_customers', []);
  const index = customers.findIndex((c: any) => c.id === customer.id);
  if (index !== -1) {
    customers[index] = customer;
  } else {
    customers.push(customer);
  }
  setLocalStorage('ino_customers', customers);
};

export const deleteCustomer = async (id: string): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('deleteCustomer', id);
  const customers = getLocalStorage('ino_customers', []);
  const filtered = customers.filter((c: any) => c.id !== id);
  setLocalStorage('ino_customers', filtered);
};

export const saveAllCustomers = async (customers: any[]): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveAllCustomers', customers);
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
  if (isGasEnvironment()) return runGasFunction('saveSupplier', supplier);
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
  if (isGasEnvironment()) return runGasFunction('deleteSupplier', id);
  const suppliers = getLocalStorage('ino_suppliers', []);
  const filtered = suppliers.filter((s: any) => s.id !== id);
  setLocalStorage('ino_suppliers', filtered);
};

export const saveAllSuppliers = async (suppliers: any[]): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveAllSuppliers', suppliers);
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
  if (isGasEnvironment()) return runGasFunction('saveConsignment', consignment);
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
  if (isGasEnvironment()) return runGasFunction('deleteConsignment', id);
  const consignments = getLocalStorage('ino_consignments', []);
  const filtered = consignments.filter((c: any) => c.id !== id);
  setLocalStorage('ino_consignments', filtered);
};

export const saveAllConsignments = async (consignments: any[]): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveAllConsignments', consignments);
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
  if (isGasEnvironment()) return runGasFunction('appendOpnameLog', logEntry);
  const logs = getLocalStorage('ino_opname_log', []);
  logs.push(logEntry);
  setLocalStorage('ino_opname_log', logs);
};

export const saveAllOpnameLog = async (logs: any[]): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveAllOpnameLog', logs);
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
  if (isGasEnvironment()) return runGasFunction('saveCashEntry', entry);
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
  if (isGasEnvironment()) return runGasFunction('deleteCashEntry', id);
  const ledger = getLocalStorage('ino_cash_ledger', []);
  const filtered = ledger.filter((c: any) => c.id !== id);
  setLocalStorage('ino_cash_ledger', filtered);
};

export const saveAllCashLedger = async (ledger: any[]): Promise<void> => {
  if (isGasEnvironment()) return runGasFunction('saveAllCashLedger', ledger);
  setLocalStorage('ino_cash_ledger', ledger);
};
