import {
  getProducts, saveAllProducts,
  getCustomers, saveAllCustomers,
  getSuppliers, saveAllSuppliers,
  getPurchaseOrders, saveAllPurchaseOrders,
  getSalesOrders, saveAllSalesOrders,
  getCashLedger, saveAllCashLedger
} from '../dataService';

export const runDummyCleanupMigration = async (dummyDateThreshold: string = '2026-06-01') => {
  console.log(`[Migration] Starting dummy data cleanup (keeping data after ${dummyDateThreshold})...`);
  try {
    const products = await getProducts();
    const customers = await getCustomers();
    const suppliers = await getSuppliers();
    const po = await getPurchaseOrders();
    const so = await getSalesOrders();
    const cash = await getCashLedger();
    
    // Asumsi: Semua transaksi sebelum dummyDateThreshold adalah data palsu yang harus dihapus.
    // Jika ada field 'tanggal', kita filter. Jika tidak ada, kita asumsikan Master Data tetap dipertahankan.
    // Karena dummy data master mungkin tidak memiliki 'tanggal', kita fokus ke PO, SO, dan Kas.

    console.log(`[Migration] PO found: ${po.length}`);
    const validPO = po.filter((p: any) => p.tanggal && p.tanggal >= dummyDateThreshold);
    console.log(`[Migration] PO to keep: ${validPO.length}`);
    await saveAllPurchaseOrders(validPO);

    console.log(`[Migration] SO found: ${so.length}`);
    const validSO = so.filter((s: any) => s.tanggal && s.tanggal >= dummyDateThreshold);
    console.log(`[Migration] SO to keep: ${validSO.length}`);
    await saveAllSalesOrders(validSO);

    console.log(`[Migration] Cash Ledger found: ${cash.length}`);
    const validCash = cash.filter((c: any) => c.tanggal && c.tanggal >= dummyDateThreshold);
    console.log(`[Migration] Cash Ledger to keep: ${validCash.length}`);
    await saveAllCashLedger(validCash);
    
    // Master data: you might want to reset all 'piutang', 'hutang', and 'stok' 
    // to match only the valid PO/SO if necessary, but for now we just clean the transactions
    // or reset them to 0 if the user requested a full reset.
    // We will leave master data intact as per general ERP practices, only removing transactional dummy data.

    console.log('[Migration] Cleanup completed successfully!');
    return true;
  } catch (error) {
    console.error('[Migration] Failed:', error);
    return false;
  }
};
