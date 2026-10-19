// src/types.ts
// ==========================================
// Centralized Type Definitions
// ==========================================

export interface Product {
  sku: string;
  kategori: string;
  subKat: string;
  nama: string;
  satuan: string;
  hj: number;
  hpp: number;
  safety: number;
  stok: number;
  status: string;
  supplier: string;
  tempatSimpan: string;
  masaSmp: string;
  catatan: string;
}

export interface PurchaseOrderItem {
  sku: string;
  nama: string;
  qty: number;
  qtyReceived: number;
  qtyReturned: number;
  harga: number;
  diskon: number;
  ppn: number;
  subtotal: number;
}

export interface PurchaseOrder {
  id: string;
  tanggal: string;
  supplier: string;
  metode: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  pajak: number;
  grandTotal: number;
  statusLogistik: string; // 'Draft', 'Menunggu', 'Parsial', 'Diterima'
  statusBayar: string;    // 'Belum Bayar', 'Parsial', 'Lunas'
  totalPaid: number;
  catatan: string;
  platform: string;
  noPO?: string; // used when mapped in DB
}

export interface SalesOrderItem {
  sku: string;
  nama: string;
  qty: number;
  qtyShipped: number;
  qtyReturned: number;
  harga: number;
  hpp: number;
  diskon: number;
  ppn: number;
  subtotal: number;
}

export interface SalesOrder {
  id: string;
  tanggal: string;
  pelanggan: string;
  metode: string;
  items: SalesOrderItem[];
  subtotal: number;
  pajak: number;
  grandTotal: number;
  statusLogistik: string; // 'Draft', 'Menunggu', 'Parsial', 'Terkirim'
  statusBayar: string;    // 'Belum Bayar', 'Parsial', 'Lunas'
  totalPaid: number;
  catatan: string;
  platform: string;
  noSO?: string; // used when mapped in DB
}

export interface Customer {
  id: string;
  nama: string;
  kontak: string;
  email: string;
  telp: string;
  alamat: string;
  piutang: number;
}

export interface Supplier {
  id: string;
  nama: string;
  kontak: string;
  email: string;
  telp: string;
  alamat: string;
  hutang: number;
}

export interface CashEntry {
  id: string;
  tanggal: string;
  ref: string;
  keterangan: string;
  kategori: string;
  debit: number;
  kredit: number;
  saldo: number;
  akun: string;
}

export interface OpnameLogEntry {
  tanggal: string;
  sku: string;
  nama: string;
  tipe: 'OPNAME_PLUS' | 'OPNAME_MINUS';
  qtySistem: number;
  qtyFisik: number;
  selisih: number;
  hpp: number;
  catatan: string;
}

export interface Consignment {
  id: string;
  tanggalMasuk: string;
  sku: string;
  nama: string;
  consignor: string;
  qtyTerima: number;
  qtyTerjual: number;
  qtyRetur: number;
  hargaJual: number;
  komisiPct: number;
  status: 'Aktif' | 'Selesai';
}

export interface BOMItem {
  sku: string;
  nama: string;
  qty: number;
  satuan: string;
}

export interface BOM {
  id: string;
  skuHasil: string;
  namaHasil: string;
  qtyHasil: number;
  biayaLain: number;
  bahanBaku: BOMItem[];
}

export interface SettingKategori {
  nama: string;
  subKat: string[];
}

export interface SettingSatuan {
  nama: string;
}

export interface SettingStorage {
  nama: string;
}

export interface SettingUser {
  email: string;
  nama: string;
  role: string;
  pin: string; // Hash
}

export interface SettingCashAccount {
  nama: string;
  noRek: string;
}
