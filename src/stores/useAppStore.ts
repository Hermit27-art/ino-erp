// src/stores/useAppStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, PurchaseOrder, SalesOrder, Customer, Supplier, CashEntry, OpnameLogEntry, Consignment, BOM } from '../types';

interface AppState {
  // Master Data
  products: Product[];
  customers: Customer[];
  suppliers: Supplier[];
  
  // Transactions
  purchaseOrders: PurchaseOrder[];
  salesOrders: SalesOrder[];
  cashLedger: CashEntry[];
  consignments: Consignment[];
  boms: BOM[];
  opnameLog: OpnameLogEntry[];
  riwayatProduksi: any[];

  // Settings
  settingCategories: { nama: string; subKat: string[] }[];
  settingUnits: { nama: string }[];
  settingStorage: { nama: string }[];
  settingUsersList: any[];
  settingCashAccounts: { nama: string; noRek: string }[];

  namaToko: string;
  alamatToko: string;
  namaPimpinan: string;
  pesanNota: string;
  tipeBisnis: string;
  isLoginActive: boolean;

  // Actions - Initialization
  setProducts: (products: Product[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setSuppliers: (suppliers: Supplier[]) => void;
  setPurchaseOrders: (pos: PurchaseOrder[]) => void;
  setSalesOrders: (sos: SalesOrder[]) => void;
  setCashLedger: (ledger: CashEntry[]) => void;
  setConsignments: (csgs: Consignment[]) => void;
  setBoms: (boms: BOM[]) => void;
  setOpnameLog: (logs: OpnameLogEntry[]) => void;
  setRiwayatProduksi: (riwayat: any[]) => void;

  // Actions - Cash Ledger Helpers
  addCashEntry: (entry: CashEntry) => void;
  deleteCashEntry: (id: string) => void;
  recalculateCashBalance: (akun: string) => void;

  // Actions - Settings
  setSettingCategories: (categories: { nama: string; subKat: string[] }[]) => void;
  setSettingUnits: (units: { nama: string }[]) => void;
  setSettingStorage: (storage: { nama: string }[]) => void;
  setSettingUsersList: (users: any[]) => void;
  setSettingCashAccounts: (accounts: { nama: string; noRek: string }[]) => void;
  setTokoProfile: (namaToko: string, alamatToko: string, namaPimpinan: string, pesanNota: string, tipeBisnis: string) => void;
  setIsLoginActive: (active: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial State
      products: [],
      customers: [],
      suppliers: [],
      purchaseOrders: [],
      salesOrders: [],
      cashLedger: [],
      consignments: [],
      boms: [],
      opnameLog: [],
      riwayatProduksi: [],
      settingCategories: [{ nama: 'Bahan Baku', subKat: [] }, { nama: 'Barang Jadi', subKat: [] }, { nama: 'Kemasan', subKat: [] }],
      settingUnits: [{ nama: 'pcs' }, { nama: 'kg' }, { nama: 'liter' }],
      settingStorage: [{ nama: 'Gudang Utama' }],
      settingUsersList: [],
      settingCashAccounts: [{ nama: 'Kas Tunai', noRek: '-' }, { nama: 'BCA 123', noRek: '12345678' }],
      namaToko: 'INO ERP',
      alamatToko: 'Alamat Toko Belum Diatur',
      namaPimpinan: 'Owner',
      pesanNota: 'Terima kasih atas kunjungan Anda',
      tipeBisnis: 'Retail',
      isLoginActive: false,

      // Setters
      setProducts: (products) => set({ products }),
      setCustomers: (customers) => set({ customers }),
      setSuppliers: (suppliers) => set({ suppliers }),
      setPurchaseOrders: (purchaseOrders) => set({ purchaseOrders }),
      setSalesOrders: (salesOrders) => set({ salesOrders }),
      setCashLedger: (cashLedger) => set({ cashLedger }),
      setConsignments: (consignments) => set({ consignments }),
      setBoms: (boms) => set({ boms }),
      setOpnameLog: (opnameLog) => set({ opnameLog }),
      setRiwayatProduksi: (riwayatProduksi) => set({ riwayatProduksi }),

      // Cash Ledger Logic (Fix for M2)
      recalculateCashBalance: (akun) => {
        set((state) => {
          const newLedger = [...state.cashLedger];
          
          // Pisahkan ledger untuk akun target dan akun lainnya
          const targetLedger = newLedger.filter(c => (c.akun || 'Bank') === akun);
          const otherLedger = newLedger.filter(c => (c.akun || 'Bank') !== akun);
          
          // Sort akun target berdasarkan tanggal (ascending), lalu id (jika tanggal sama)
          targetLedger.sort((a, b) => {
            if (a.tanggal === b.tanggal) return a.id.localeCompare(b.id);
            return a.tanggal.localeCompare(b.tanggal);
          });
          
          // Recalculate running balance
          let runningBalance = 0;
          for (let i = 0; i < targetLedger.length; i++) {
            const entry = targetLedger[i];
            runningBalance += entry.debit;
            runningBalance -= entry.kredit;
            entry.saldo = runningBalance;
          }
          
          return { cashLedger: [...targetLedger, ...otherLedger] };
        });
      },
      addCashEntry: (entry) => {
        set((state) => ({ cashLedger: [...state.cashLedger, entry] }));
        get().recalculateCashBalance(entry.akun || 'Bank');
      },
      deleteCashEntry: (id) => {
        let akunToRecalc = '';
        set((state) => {
          const entry = state.cashLedger.find(c => c.id === id);
          if (entry) akunToRecalc = entry.akun || 'Bank';
          return { cashLedger: state.cashLedger.filter(c => c.id !== id) };
        });
        if (akunToRecalc) {
          get().recalculateCashBalance(akunToRecalc);
        }
      },

      // Setting Setters
      setSettingCategories: (settingCategories) => set({ settingCategories }),
      setSettingUnits: (settingUnits) => set({ settingUnits }),
      setSettingStorage: (settingStorage) => set({ settingStorage }),
      setSettingUsersList: (settingUsersList) => set({ settingUsersList }),
      setSettingCashAccounts: (settingCashAccounts) => set({ settingCashAccounts }),
      setTokoProfile: (namaToko, alamatToko, namaPimpinan, pesanNota, tipeBisnis) => set({ namaToko, alamatToko, namaPimpinan, pesanNota, tipeBisnis }),
      setIsLoginActive: (isLoginActive) => set({ isLoginActive }),
    }),
    {
      name: 'ino-app-store', // key in localStorage
      storage: createJSONStorage(() => localStorage),
    }
  )
);
