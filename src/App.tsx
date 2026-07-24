import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Users, 
  AlertTriangle, 
  TrendingUp, 
  DollarSign, 
  CheckCircle,
  FileSpreadsheet,
  Download,
  MapPin,
  Plus,
  Trash2,
  Edit3,
  Code,
  Truck,
  CreditCard,
  X,
  CornerUpLeft,
  Printer,
  Mail,
  Eye,
  BookOpen,
  History,
  Settings,
  Lock,
  LogOut,
  Layers,
  Activity,
  Database,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';

// ==========================================
// LOCAL STORAGE PERSISTENCE UTILITIES
// ==========================================
// ponytail: localStorage tetap jadi cache lokal (biar buka app tetap instan & bisa offline).
// Kalau VITE_SHEETS_API_URL diisi, tiap perubahan juga dikirim ke Google Sheets via Apps Script Web App.
const SHEETS_API_URL: string = (import.meta as any).env?.VITE_SHEETS_API_URL || '';

const getLocalStorage = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
};

const setLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
  if (SHEETS_API_URL) {
    // ponytail: fire-and-forget, gagal kirim ke Sheets tidak boleh mengganggu UI (data tetap aman di localStorage)
    fetch(SHEETS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // hindari CORS preflight ke Apps Script
      body: JSON.stringify({ key, value }),
    }).catch(() => {});
  }
};

// ponytail: khusus untuk field yang sudah punya endpoint sendiri di backend (mis. saveSettings) —
// cache ke localStorage saja, JANGAN kirim ke AppState generik (biar tidak dobel/salah tempat).
const setLocalOnly = (key: string, value: any) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
};

// ==========================================
// MOCK DATA INITIALIZATION
// ==========================================
const INITIAL_PRODUCTS = [
  { sku: 'FG-0001', kategori: 'Barang Jadi', subKat: 'Roti & Kue', nama: 'Croissant Mentega Klasik', satuan: 'Pcs', hj: 25000, hpp: 12000, safety: 30, stok: 240, status: 'Aktif', supplier: 'PT. Terigu Sukses', tempatSimpan: 'Etalase Depan', masaSmp: '3 Hari', catatan: 'Panggang segar setiap pagi' },
  { sku: 'FG-0002', kategori: 'Barang Jadi', subKat: 'Roti & Kue', nama: 'Sourdough Rye Bread', satuan: 'Pcs', hj: 45000, hpp: 18000, safety: 15, stok: 12, status: 'Aktif', supplier: 'PT. Terigu Sukses', tempatSimpan: 'Etalase Depan', masaSmp: '5 Hari', catatan: 'Gunakan ragi alami' },
  { sku: 'RAW-0001', kategori: 'Bahan Baku', subKat: 'Bahan Kering', nama: 'Tepung Terigu Pro Tinggi', satuan: 'Kg', hj: 0, hpp: 12500, safety: 100, stok: 80, status: 'Aktif', supplier: 'CV. Mandiri Jaya', tempatSimpan: 'Gudang Utama', masaSmp: '6 Bulan', catatan: 'Simpan di tempat kering' },
  { sku: 'RAW-0002', kategori: 'Bahan Baku', subKat: 'Bahan Kering', nama: 'Gula Pasir Rafinasi', satuan: 'Kg', hj: 0, hpp: 14000, safety: 50, stok: 145, status: 'Aktif', supplier: 'CV. Mandiri Jaya', tempatSimpan: 'Gudang Utama', masaSmp: '1 Tahun', catatan: 'Wadah kedap udara' },
  { sku: 'RAW-0003', kategori: 'Bahan Baku', subKat: 'Bahan Basah', nama: 'Margarin Filma Premium', satuan: 'Kg', hj: 0, hpp: 32000, safety: 20, stok: 8, status: 'Aktif', supplier: 'PT. Mentega Impor', tempatSimpan: 'Gudang Dingin', masaSmp: '1 Tahun', catatan: 'Chiller suhu 4-8C' },
  { sku: 'PKG-0001', kategori: 'Kemasan', subKat: 'Packaging', nama: 'Box Croissant Kraft Tebal', satuan: 'Pcs', hj: 0, hpp: 1800, safety: 200, stok: 1500, status: 'Aktif', supplier: 'PT. Pack Prima', tempatSimpan: 'Gudang Utama', masaSmp: 'Selamanya', catatan: 'Kemasan box isi 4' }
];

const INITIAL_CUSTOMERS = [
  { id: 'CUST-001', nama: 'PT. Sentosa Makmur', kontak: 'Budi Santoso', email: 'sentosa@gmail.com', telp: '08123456789', alamat: 'Jl. Sunset Road No. 88, Seminyak, Bali', piutang: 1500000 },
  { id: 'CUST-002', nama: 'Cafe Serambi Hijau', kontak: 'Rina Wijaya', email: 'serambi@gmail.com', telp: '08198765432', alamat: 'Jl. Raya Ubud No. 12, Ubud, Bali', piutang: 750000 },
  { id: 'CUST-003', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
];

const INITIAL_SUPPLIERS = [
  { id: 'SUP-001', nama: 'PT. Terigu Sukses', kontak: 'Agus Salim', email: 'sales@terigusukses.com', telp: '031-1234567', alamat: 'Kawasan Industri Rungkut Block C-12, Surabaya', hutang: 1200000 },
  { id: 'SUP-002', nama: 'CV. Mandiri Jaya', kontak: 'Dewi Lestari', email: 'dewi@mandirijaya.com', telp: '021-9876543', alamat: 'Jl. Jendral Sudirman No. 45, Jakarta Pusat', hutang: 2500000 },
  { id: 'SUP-003', nama: 'PT. Mentega Impor', kontak: 'Robert Tan', email: 'robert@mentegaimpor.co.id', telp: '021-5556677', alamat: 'Pergudangan Bandara Mas Blok B-9, Tangerang', hutang: 0 }
];

const INITIAL_PURCHASE_ORDERS = [
  { id: 'PO-20260110-001', tanggal: '2026-01-10', supplier: 'CV. Mandiri Jaya', metode: 'Kredit 30 Hari', items: [{ sku: 'RAW-0001', nama: 'Tepung Terigu Pro Tinggi', qty: 60, satuan: 'Kg', harga: 12500, subtotal: 750000 }, { sku: 'RAW-0002', nama: 'Gula Pasir Rafinasi', qty: 80, satuan: 'Kg', harga: 14000, subtotal: 1120000 }], subtotal: 1870000, pajak: 224400, grandTotal: 2094400, statusLogistik: 'Diterima', statusBayar: 'Lunas', catatan: 'Pembelian awal tahun' },
  { id: 'PO-20260215-001', tanggal: '2026-02-15', supplier: 'PT. Mentega Impor', metode: 'Tunai', items: [{ sku: 'RAW-0003', nama: 'Margarin Filma Premium', qty: 30, satuan: 'Kg', harga: 32000, subtotal: 960000 }], subtotal: 960000, pajak: 115200, grandTotal: 1075200, statusLogistik: 'Diterima', statusBayar: 'Lunas', catatan: 'Restock margarin bulanan' },
  { id: 'PO-20260312-001', tanggal: '2026-03-12', supplier: 'CV. Mandiri Jaya', metode: 'Tunai', items: [{ sku: 'RAW-0001', nama: 'Tepung Terigu Pro Tinggi', qty: 70, satuan: 'Kg', harga: 12500, subtotal: 875000 }], subtotal: 875000, pajak: 105000, grandTotal: 980000, statusLogistik: 'Diterima', statusBayar: 'Lunas', catatan: 'Restock bahan kering' },
  { id: 'PO-20260405-001', tanggal: '2026-04-05', supplier: 'CV. Mandiri Jaya', metode: 'Kredit 30 Hari', items: [{ sku: 'RAW-0002', nama: 'Gula Pasir Rafinasi', qty: 50, satuan: 'Kg', harga: 14000, subtotal: 700000 }], subtotal: 700000, pajak: 84000, grandTotal: 784000, statusLogistik: 'Diterima', statusBayar: 'Lunas', catatan: 'Restock gula rafinasi' },
  { id: 'PO-20260510-099', tanggal: '2026-05-10', supplier: 'CV. Mandiri Jaya', metode: 'Kredit 30 Hari', items: [{ sku: 'RAW-0003', nama: 'Margarin Filma Premium', qty: 50, satuan: 'Kg', harga: 32000, subtotal: 1600000 }], subtotal: 1600000, pajak: 192000, grandTotal: 1792000, statusLogistik: 'Diterima', statusBayar: 'Belum Dibayar', catatan: 'Tagihan Jatuh Tempo (Overdue)' },
  { id: 'PO-20260620-001', tanggal: '2026-06-20', supplier: 'CV. Mandiri Jaya', metode: 'Kredit 30 Hari', items: [{ sku: 'RAW-0001', nama: 'Tepung Terigu Pro Tinggi', qty: 100, satuan: 'Kg', harga: 12500, subtotal: 1250000 }], subtotal: 1250000, pajak: 150000, grandTotal: 1400000, statusLogistik: 'Diterima', statusBayar: 'Belum Dibayar', catatan: 'PO Tepung Terigu Terjadwal' },
  { id: 'PO-20260622-002', tanggal: '2026-06-22', supplier: 'PT. Terigu Sukses', metode: 'Tunai', items: [{ sku: 'RAW-0002', nama: 'Gula Pasir Rafinasi', qty: 50, satuan: 'Kg', harga: 14000, subtotal: 700000 }], subtotal: 700000, pajak: 84000, grandTotal: 784000, statusLogistik: 'Menunggu', statusBayar: 'Lunas', catatan: 'Pembelian Gula Mendesak' }
];

const INITIAL_SALES_ORDERS = [
  { id: 'SO-20260118-001', tanggal: '2026-01-18', pelanggan: 'PT. Sentosa Makmur', metode: 'Tempo 30 Hari', items: [{ sku: 'FG-0001', nama: 'Croissant Mentega Klasik', qty: 35, satuan: 'Pcs', harga: 25000, subtotal: 875000 }], subtotal: 875000, pajak: 105000, grandTotal: 980000, statusLogistik: 'Terkirim', statusBayar: 'Lunas', catatan: 'Pengiriman roti croissant pagi' },
  { id: 'SO-20260220-001', tanggal: '2026-02-20', pelanggan: 'Cafe Serambi Hijau', metode: 'Tunai', items: [{ sku: 'FG-0002', nama: 'Sourdough Rye Bread', qty: 15, satuan: 'Pcs', harga: 45000, subtotal: 675000 }], subtotal: 675000, pajak: 81000, grandTotal: 756000, statusLogistik: 'Terkirim', statusBayar: 'Lunas', catatan: 'Restock kafe roti tawar' },
  { id: 'SO-20260318-001', tanggal: '2026-03-18', pelanggan: 'PT. Sentosa Makmur', metode: 'Tempo 30 Hari', items: [{ sku: 'FG-0001', nama: 'Croissant Mentega Klasik', qty: 45, satuan: 'Pcs', harga: 25000, subtotal: 1125000 }], subtotal: 1125000, pajak: 135000, grandTotal: 1260000, statusLogistik: 'Terkirim', statusBayar: 'Lunas', catatan: 'Grosir bulanan' },
  { id: 'SO-20260424-001', tanggal: '2026-04-24', pelanggan: 'Cafe Serambi Hijau', metode: 'Tunai', items: [{ sku: 'FG-0002', nama: 'Sourdough Rye Bread', qty: 10, satuan: 'Pcs', harga: 45000, subtotal: 450000 }], subtotal: 450000, pajak: 54000, grandTotal: 504000, statusLogistik: 'Terkirim', statusBayar: 'Lunas', catatan: 'Pelunasan tunai toko' },
  { id: 'SO-20260515-099', tanggal: '2026-05-15', pelanggan: 'PT. Sentosa Makmur', metode: 'Tempo 30 Hari', items: [{ sku: 'FG-0001', nama: 'Croissant Mentega Klasik', qty: 40, satuan: 'Pcs', harga: 25000, subtotal: 1000000 }], subtotal: 1000000, pajak: 120000, grandTotal: 1120000, statusLogistik: 'Terkirim', statusBayar: 'Belum Lunas', catatan: 'Penjualan Grosir Tempo' },
  { id: 'SO-20260623-002', tanggal: '2026-06-23', pelanggan: 'Cafe Serambi Hijau', metode: 'Tunai', items: [{ sku: 'FG-0002', nama: 'Sourdough Rye Bread', qty: 20, satuan: 'Pcs', harga: 45000, subtotal: 900000 }], subtotal: 900000, pajak: 108000, grandTotal: 1008000, statusLogistik: 'Terkirim', statusBayar: 'Lunas', catatan: 'Pesanan Rutin Kafe' },
  { id: 'SO-20260624-001', tanggal: '2026-06-24', pelanggan: 'PT. Sentosa Makmur', metode: 'Tempo 30 Hari', items: [{ sku: 'FG-0001', nama: 'Croissant Mentega Klasik', qty: 50, satuan: 'Pcs', harga: 25000, subtotal: 1250000 }], subtotal: 1250000, pajak: 150000, grandTotal: 1400000, statusLogistik: 'Menunggu Pengiriman', statusBayar: 'Belum Lunas', catatan: 'Pengiriman via Kurir Internal' }
];

const INITIAL_OPNAME_LOG = [
  { tanggal: '2026-01-25', sku: 'RAW-0001', nama: 'Tepung Terigu Pro Tinggi', tipe: 'OPNAME_MINUS', qtySistem: 60, qtyFisik: 58, selisih: -2, satuan: 'Kg', HPP: 12500, subtotal: -25000, catatan: 'Tumpah di rak', operator: 'Gudang Utama' },
  { tanggal: '2026-02-28', sku: 'RAW-0002', nama: 'Gula Pasir Rafinasi', tipe: 'OPNAME_PLUS', qtySistem: 90, qtyFisik: 92, selisih: 2, satuan: 'Kg', HPP: 14000, subtotal: 28000, catatan: 'Kelebihan serahan', operator: 'Administrator' },
  { tanggal: '2026-06-21', sku: 'RAW-0003', nama: 'Margarin Filma Premium', tipe: 'OPNAME_MINUS', qtySistem: 10, qtyFisik: 8, selisih: -2, satuan: 'Kg', HPP: 32000, subtotal: -64000, catatan: 'Menyusut di kulkas', operator: 'Administrator' },
  { tanggal: '2026-06-23', sku: 'RAW-0001', nama: 'Tepung Terigu Pro Tinggi', tipe: 'OPNAME_PLUS', qtySistem: 75, qtyFisik: 80, selisih: 5, satuan: 'Kg', HPP: 12500, subtotal: 62500, catatan: 'Kelebihan kiriman dari CV Mandiri', operator: 'Gudang Utama' }
];

const INITIAL_CASH_LEDGER = [
  { id: 'CSH-20260601-001', tanggal: '2026-06-01', ref: 'MODAL-001', keterangan: 'Setoran Modal Awal', kategori: 'Modal', debit: 25000000, kredit: 0, saldo: 25000000 },
  { id: 'CSH-20260605-002', tanggal: '2026-06-05', ref: 'OPEX-001', keterangan: 'Pembayaran Sewa Outlet Bulan Juni', kategori: 'Sewa', debit: 0, kredit: 3000000, saldo: 22000000 },
  { id: 'CSH-20260610-003', tanggal: '2026-06-10', ref: 'OPEX-002', keterangan: 'Biaya Tagihan Listrik & Air', kategori: 'Utilitas', debit: 0, kredit: 1200000, saldo: 20800000 },
  { id: 'CSH-20260615-004', tanggal: '2026-06-15', ref: 'OPEX-003', keterangan: 'Pembayaran Gaji Karyawan Toko', kategori: 'Gaji', debit: 0, kredit: 5000000, saldo: 15800000 },
  { id: 'CSH-20260620-005', tanggal: '2026-06-20', ref: 'PO-20260622-002', keterangan: 'Pembayaran PO Gula [PO-20260622-002]', kategori: 'Pembelian', debit: 0, kredit: 784000, saldo: 15016000 },
  { id: 'CSH-20260623-006', tanggal: '2026-06-23', ref: 'SO-20260623-002', keterangan: 'Pelunasan Tunai [SO-20260623-002]', kategori: 'Penjualan', debit: 1008000, kredit: 0, saldo: 16024000 },
  { id: 'CSH-20260624-007', tanggal: '2026-06-24', ref: 'OPEX-004', keterangan: 'Biaya Kebersihan & Keamanan', kategori: 'Operasional Lain', debit: 0, kredit: 250000, saldo: 15774000 }
];

const INITIAL_CONSIGNMENT = [
  { id: 'CSG-20260601-001', consignor: 'CV. Bakery Supplier', tanggal: '2026-06-01', sku: 'CON-0001', nama: 'Roti Tawar Gandum Spesial', qtyReceived: 50, qtySold: 35, qtyReturned: 0, harga: 15000, komisiPct: 20, status: 'Aktif', catatan: 'Barang titipan roti gandum premium' },
  { id: 'CSG-20260610-002', consignor: 'PT. Roti Consign', tanggal: '2026-06-10', sku: 'CON-0002', nama: 'Donut Glaze Premium', qtyReceived: 100, qtySold: 80, qtyReturned: 5, harga: 10000, komisiPct: 15, status: 'Selesai', catatan: 'Donat rasa madu coklat' }
];

// ==========================================
// INTERACTIVE SPREADSHEET COMPONENT (GOOGLE SHEETS STYLE)
// ==========================================
interface SpreadsheetComponentProps {
  headers: string[];
  rows: string[][];
  onChangeCell: (r: number, c: number, value: string) => void;
}

function SpreadsheetComponent({ headers, rows, onChangeCell }: SpreadsheetComponentProps) {
  const [activeCell, setActiveCell] = useState<{ r: number, c: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  useEffect(() => {
    if (activeCell) {
      setEditValue(rows[activeCell.r][activeCell.c] || '');
    } else {
      setEditValue('');
    }
  }, [activeCell, rows]);

  const handleCellClick = (r: number, c: number) => {
    setActiveCell({ r, c });
  };

  const handleInputChange = (val: string) => {
    setEditValue(val);
    if (activeCell) {
      onChangeCell(activeCell.r, activeCell.c, val);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setActiveCell(null);
    }
  };

  const colLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K'];

  return (
    <div className="flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white text-xs font-sans shadow-md">
      {/* Formula Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-gray-200">
        <div className="font-mono text-[10px] text-teal-700 bg-teal-50 border border-teal-200 font-black px-2 py-0.5 rounded shadow-xs">
          {activeCell ? `${colLetters[activeCell.c]}${activeCell.r + 1}` : 'SEL'}
        </div>
        <div className="text-gray-400 font-serif italic text-sm font-black select-none">fx</div>
        <input 
          type="text" 
          value={editValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={activeCell ? "Ketik teks atau nominal..." : "Klik dua kali atau pilih sel untuk mengedit langsung..."}
          className="flex-1 px-3 py-1.5 border border-[#E2E8F0] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#0EA5A4] bg-white transition-all shadow-inner font-mono text-gray-700"
          disabled={!activeCell}
        />
        {activeCell && (
          <button 
            onClick={() => setActiveCell(null)}
            className="text-[10px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded font-bold text-slate-600 transition-colors"
          >
            Selesai
          </button>
        )}
      </div>

      {/* Grid Canvas */}
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full border-collapse table-fixed min-w-[850px]">
          <thead>
            <tr className="bg-slate-100 text-slate-500 text-center select-none divide-x divide-gray-200">
              <th className="w-10 border-r border-b border-gray-200 font-normal bg-slate-200 text-slate-500 text-[10px]"></th>
              {headers.map((h, cIdx) => (
                <th key={cIdx} className="border-r border-b border-gray-200 py-1.5 px-2 font-bold text-slate-700 bg-slate-150 text-left">
                  <div className="text-[9px] text-[#94A3B8] font-mono mb-0.5">{colLetters[cIdx]}</div>
                  <div className="truncate text-[10.5px] uppercase tracking-wide">{h}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-150">
            {rows.map((rowCells, rIdx) => {
              // Row 0 is often headers, let's treat row 0 as non-header in 2D grid but styled beautifully
              const isHeaderRow = rIdx === 0;
              return (
                <tr key={rIdx} className={`hover:bg-teal-50/10 divide-x divide-gray-200 ${isHeaderRow ? 'bg-slate-50/80 font-bold' : ''}`}>
                  {/* Row Number Column */}
                  <td className="bg-slate-100 text-center text-[#94A3B8] font-mono text-[9px] select-none border-r border-b border-gray-200 font-black">
                    {rIdx + 1}
                  </td>
                  {headers.map((_, cIdx) => {
                    const val = rowCells[cIdx] || '';
                    const isActive = activeCell?.r === rIdx && activeCell?.c === cIdx;
                    return (
                      <td 
                        key={cIdx} 
                        onClick={() => handleCellClick(rIdx, cIdx)}
                        className={`border-r border-b border-gray-200 p-2 relative truncate cursor-text text-slate-800 font-mono text-xs ${isActive ? 'ring-2 ring-inset ring-[#0EA5A4] z-10 bg-teal-50/15' : ''}`}
                      >
                        {isActive ? (
                          <input 
                            type="text"
                            value={editValue}
                            onChange={(e) => handleInputChange(e.target.value)}
                            onKeyDown={handleKeyDown}
                            onBlur={() => {
                              // delay slightly to allow clicking finish button
                              setTimeout(() => setActiveCell(null), 150);
                            }}
                            className="absolute inset-0 w-full h-full border-none px-2 py-2 focus:outline-none focus:ring-0 text-xs bg-white text-[#1E293B] font-mono"
                            autoFocus
                          />
                        ) : (
                          <span className={`block w-full min-h-[16px] truncate ${isHeaderRow ? 'font-extrabold text-[#1E293B] border-b border-slate-300 pb-0.5' : ''}`}>
                            {val}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {/* Excel/Sheets Grid Footer helper */}
      <div className="bg-slate-50 border-t border-gray-200 px-4 py-2 text-[10px] text-gray-500 flex justify-between items-center">
        <span>Gunakan baris formula di atas untuk input data cepat, atau klik ganda sel apa pun.</span>
        <span className="font-mono font-bold text-teal-600">INO ERP SPREADSHEET ENGINE v1.2</span>
      </div>
    </div>
  );
}

// ==========================================
// INITIAL PRODUCTION & BOM DATA
// ==========================================
const INITIAL_BOMS = [
  {
    id: 'BOM-FG-0001',
    skuFinishedGood: 'FG-0001',
    namaFinishedGood: 'Croissant Mentega Klasik',
    ingredients: [
      { sku: 'RAW-0001', nama: 'Tepung Terigu Pro Tinggi', qty: 0.2, satuan: 'Kg' },
      { sku: 'RAW-0002', nama: 'Gula Pasir Rafinasi', qty: 0.05, satuan: 'Kg' },
      { sku: 'RAW-0003', nama: 'Margarin Filma Premium', qty: 0.08, satuan: 'Kg' },
      { sku: 'PKG-0001', nama: 'Box Croissant Kraft Tebal', qty: 1, satuan: 'Pcs' }
    ]
  },
  {
    id: 'BOM-FG-0002',
    skuFinishedGood: 'FG-0002',
    namaFinishedGood: 'Sourdough Rye Bread',
    ingredients: [
      { sku: 'RAW-0001', nama: 'Tepung Terigu Pro Tinggi', qty: 0.35, satuan: 'Kg' },
      { sku: 'RAW-0002', nama: 'Gula Pasir Rafinasi', qty: 0.02, satuan: 'Kg' }
    ]
  }
];

const INITIAL_RIWAYAT_PRODUKSI = [
  { id: 'PROD-20260620-001', tanggal: '2026-06-20', skuFinishedGood: 'FG-0001', namaFinishedGood: 'Croissant Mentega Klasik', qtyProduced: 50, costTotal: 250000, status: 'Selesai', operator: 'Administrator' },
  { id: 'PROD-20260622-002', tanggal: '2026-06-22', skuFinishedGood: 'FG-0002', namaFinishedGood: 'Sourdough Rye Bread', qtyProduced: 10, costTotal: 90000, status: 'Selesai', operator: 'Gudang Utama' }
];

const AVAILABLE_MONTHS = [
  { id: 'Jan', code: '01', label: 'Januari' },
  { id: 'Feb', code: '02', label: 'Februari' },
  { id: 'Mar', code: '03', label: 'Maret' },
  { id: 'Apr', code: '04', label: 'April' },
  { id: 'May', code: '05', label: 'Mei' },
  { id: 'Jun', code: '06', label: 'Juni' },
  { id: 'Jul', code: '07', label: 'Juli' },
  { id: 'Aug', code: '08', label: 'Agustus' },
  { id: 'Sep', code: '09', label: 'September' },
  { id: 'Oct', code: '10', label: 'Oktober' },
  { id: 'Nov', code: '11', label: 'November' },
  { id: 'Dec', code: '12', label: 'Desember' }
];

const QUARTERS_DEF = [
  { id: 'Q1', label: 'Kuartal I (Q1)', months: ['Jan', 'Feb', 'Mar'] },
  { id: 'Q2', label: 'Kuartal II (Q2)', months: ['Apr', 'May', 'Jun'] },
  { id: 'Q3', label: 'Kuartal III (Q3)', months: ['Jul', 'Aug', 'Sep'] },
  { id: 'Q4', label: 'Kuartal IV (Q4)', months: ['Oct', 'Nov', 'Dec'] }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // Core Persisted States
  const [products, setProducts] = useState<any[]>(() => getLocalStorage('ino_products', INITIAL_PRODUCTS));
  const [customers, setCustomers] = useState<any[]>(() => getLocalStorage('ino_customers', INITIAL_CUSTOMERS));
  const [suppliers, setSuppliers] = useState<any[]>(() => getLocalStorage('ino_suppliers', INITIAL_SUPPLIERS));
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>(() => getLocalStorage('ino_purchase_orders', INITIAL_PURCHASE_ORDERS));
  const [salesOrders, setSalesOrders] = useState<any[]>(() => getLocalStorage('ino_sales_orders', INITIAL_SALES_ORDERS));
  const [opnameLog, setOpnameLog] = useState<any[]>(() => getLocalStorage('ino_opname_log', INITIAL_OPNAME_LOG));
  const [cashLedger, setCashLedger] = useState<any[]>(() => getLocalStorage('ino_cash_ledger', INITIAL_CASH_LEDGER));
  const [consignments, setConsignments] = useState<any[]>(() => getLocalStorage('ino_consignments', INITIAL_CONSIGNMENT));

  // Settings & Production States
  const [tipeBisnis, setTipeBisnis] = useState<string>(() => getLocalStorage('ino_tipe_bisnis', 'Manufaktur'));
  const [isLoginActive, setIsLoginActive] = useState<boolean>(() => getLocalStorage('ino_is_login_active', true)); // ponytail: set default true agar gerbang ditutup untuk pengunjung baru
  const [loginUsername, setLoginUsername] = useState<string>(() => getLocalStorage('ino_login_username', 'Ngurah'));
  const [loginPassword, setLoginPassword] = useState<string>(() => getLocalStorage('ino_login_password', 'Ngr123'));

  // Profil Toko States
  const [namaToko, setNamaToko] = useState<string>(() => getLocalStorage('ino_nama_toko', 'INO ERP'));
  const [alamatToko, setAlamatToko] = useState<string>(() => getLocalStorage('ino_alamat_toko', 'Jl. Contoh No. 1, Kota'));
  const [telpToko, setTelpToko] = useState<string>(() => getLocalStorage('ino_telp_toko', '081234567890'));
  const [kotaToko, setKotaToko] = useState<string>(() => getLocalStorage('ino_kota_toko', 'Bali'));
  const [ppnRate, setPpnRate] = useState<number>(() => getLocalStorage('ino_ppn_rate', 0.11));
  const [metodeHppDefault, setMetodeHppDefault] = useState<string>(() => getLocalStorage('ino_metode_hpp_default', 'Moving Average'));
  const [mataUang, setMataUang] = useState<string>(() => getLocalStorage('ino_mata_uang', 'IDR'));
  const [driveFolderStruk, setDriveFolderStruk] = useState<string>(() => getLocalStorage('ino_drive_folder_struk', ''));
  const [formatTanggal, setFormatTanggal] = useState<string>(() => getLocalStorage('ino_format_tanggal', 'dd/MM/yyyy'));

  // Master References List States
  const [settingCategories, setSettingCategories] = useState<string[]>(() => getLocalStorage('ino_setting_categories', ['Retail', 'Set / Bundle', 'Barang Jadi', 'Bahan Baku', 'Kemasan', 'Jasa']));
  const [settingSubCategories, setSettingSubCategories] = useState<string[]>(() => getLocalStorage('ino_setting_subcategories', ['Makanan', 'Minuman', 'Snack', 'Roti & Kue', 'Bahan Kering', 'Bahan Basah', 'Alat & Perlengkapan', 'Packaging', 'Lainnya']));
  const [settingUnits, setSettingUnits] = useState<string[]>(() => getLocalStorage('ino_setting_units', ['Gram', 'Kg', 'Pcs', 'Lusin', 'Set', 'Liter', 'Ml', 'Botol', 'Sachet', 'Loyang', 'Lembar', 'Meter', 'Karton', 'Dus']));
  const [settingStorageLocations, setSettingStorageLocations] = useState<string[]>(() => getLocalStorage('ino_setting_storages', ['Rak A', 'Rak B', 'Rak C', 'Gudang Utama', 'Gudang Dingin', 'Etalase Depan', 'Laci Kasir', 'Rak Gantung', 'Area Produksi']));
  const [settingPlatforms, setSettingPlatforms] = useState<string[]>(() => getLocalStorage('ino_setting_platforms', ['Toko Langsung', 'Tokopedia', 'Shopee', 'TikTok Shop', 'Grab', 'Gojek', 'WhatsApp', 'Instagram', 'Website', 'Lainnya']));
  
  const [settingPrefixes, setSettingPrefixes] = useState<any[]>(() => getLocalStorage('ino_setting_prefixes', [
    { prefix: 'RTL', label: 'Retail / Produk Jadi Dijual' },
    { prefix: 'SET', label: 'Set / Bundle Produk' },
    { prefix: 'FG',  label: 'Finished Good / Barang Jadi Produksi' },
    { prefix: 'RAW', label: 'Raw Material / Bahan Baku' },
    { prefix: 'PKG', label: 'Packaging / Kemasan' },
    { prefix: 'SVC', label: 'Service / Jasa' }
  ]));

  const [settingUsersList, setSettingUsersList] = useState<any[]>(() => getLocalStorage('ino_setting_users', [
    { email: 'admin@toko.com', nama: 'Administrator', role: 'Admin', pin: '1234' },
    { email: 'kasir@toko.com', nama: 'Kasir 1', role: 'Kasir', pin: '5678' }
  ]));

  const [settingSubTab, setSettingSubTab] = useState<string>('profil');
  
  // Login runtime state
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const active = getLocalStorage('ino_is_login_active', true);
    return !active;
  });

  const [boms, setBoms] = useState<any[]>(() => getLocalStorage('ino_boms', INITIAL_BOMS));
  const [riwayatProduksi, setRiwayatProduksi] = useState<any[]>(() => getLocalStorage('ino_riwayat_produksi', INITIAL_RIWAYAT_PRODUKSI));
  const [stokPrices, setStokPrices] = useState<Record<string, number>>(() => getLocalStorage('ino_stok_prices', {}));
  const [stokShowFinancial, setStokShowFinancial] = useState<boolean>(() => getLocalStorage('ino_stok_show_financial', true));

  // Sync to Local Storage on Change
  useEffect(() => { setLocalOnly('ino_products', products); }, [products]);
  useEffect(() => { setLocalStorage('ino_customers', customers); }, [customers]);
  useEffect(() => { setLocalStorage('ino_suppliers', suppliers); }, [suppliers]);
  useEffect(() => { setLocalOnly('ino_purchase_orders', purchaseOrders); }, [purchaseOrders]);
  useEffect(() => { setLocalOnly('ino_sales_orders', salesOrders); }, [salesOrders]);
  useEffect(() => { setLocalOnly('ino_opname_log', opnameLog); }, [opnameLog]);
  useEffect(() => { setLocalStorage('ino_cash_ledger', cashLedger); }, [cashLedger]);
  useEffect(() => { setLocalStorage('ino_consignments', consignments); }, [consignments]);

  // ponytail: Produk, PO, Sales Order, Stock Opname sekarang nulis langsung ke sheet relasional
  // asli (DB_MASTER, LOG_PO_*, LOG_SALES_*, TRANS_SO&WASTE_LOG) — bukan AppState generik lagi.
  // Debounce per modul (600ms) biar tidak nembak network tiap 1 baris item berubah.
  useEffect(() => {
    if (!SHEETS_API_URL) return;
    const t = setTimeout(() => {
      fetch(SHEETS_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveProducts', payload: products }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [products]);

  useEffect(() => {
    if (!SHEETS_API_URL) return;
    const t = setTimeout(() => {
      fetch(SHEETS_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'savePurchaseOrders', payload: purchaseOrders }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [purchaseOrders]);

  useEffect(() => {
    if (!SHEETS_API_URL) return;
    const t = setTimeout(() => {
      fetch(SHEETS_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveSalesOrders', payload: salesOrders }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [salesOrders]);

  useEffect(() => {
    if (!SHEETS_API_URL) return;
    const t = setTimeout(() => {
      fetch(SHEETS_API_URL, {
        method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'saveOpnameLog', payload: opnameLog }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(t);
  }, [opnameLog]);

  // Sync Settings to Local Storage (cache saja — ponytail: pakai setLocalOnly, bukan setLocalStorage,
  // karena field-field setting ini dipush ke Sheets lewat 1 endpoint khusus di bawah, bukan lewat AppState generik)
  useEffect(() => { setLocalOnly('ino_tipe_bisnis', tipeBisnis); }, [tipeBisnis]);
  useEffect(() => { setLocalOnly('ino_is_login_active', isLoginActive); }, [isLoginActive]);
  useEffect(() => { setLocalOnly('ino_login_username', loginUsername); }, [loginUsername]);
  useEffect(() => { setLocalOnly('ino_login_password', loginPassword); }, [loginPassword]);

  useEffect(() => { setLocalOnly('ino_nama_toko', namaToko); }, [namaToko]);
  useEffect(() => { setLocalOnly('ino_alamat_toko', alamatToko); }, [alamatToko]);
  useEffect(() => { setLocalOnly('ino_telp_toko', telpToko); }, [telpToko]);
  useEffect(() => { setLocalOnly('ino_kota_toko', kotaToko); }, [kotaToko]);
  useEffect(() => { setLocalOnly('ino_ppn_rate', ppnRate); }, [ppnRate]);
  useEffect(() => { setLocalOnly('ino_metode_hpp_default', metodeHppDefault); }, [metodeHppDefault]);
  useEffect(() => { setLocalOnly('ino_mata_uang', mataUang); }, [mataUang]);
  useEffect(() => { setLocalOnly('ino_drive_folder_struk', driveFolderStruk); }, [driveFolderStruk]);
  useEffect(() => { setLocalOnly('ino_format_tanggal', formatTanggal); }, [formatTanggal]);

  useEffect(() => { setLocalOnly('ino_setting_categories', settingCategories); }, [settingCategories]);
  useEffect(() => { setLocalOnly('ino_setting_subcategories', settingSubCategories); }, [settingSubCategories]);
  useEffect(() => { setLocalOnly('ino_setting_units', settingUnits); }, [settingUnits]);
  useEffect(() => { setLocalOnly('ino_setting_storages', settingStorageLocations); }, [settingStorageLocations]);
  useEffect(() => { setLocalOnly('ino_setting_platforms', settingPlatforms); }, [settingPlatforms]);
  useEffect(() => { setLocalOnly('ino_setting_prefixes', settingPrefixes); }, [settingPrefixes]);
  useEffect(() => { setLocalOnly('ino_setting_users', settingUsersList); }, [settingUsersList]);

  // ponytail: 1 debounced push ke SHEET_SETTING asli tiap ada perubahan setting apapun,
  // biar tidak nembak network tiap ketikan huruf (debounce 800ms) dan tidak numpuk banyak POST terpisah.
  useEffect(() => {
    if (!SHEETS_API_URL) return;
    const t = setTimeout(() => {
      fetch(SHEETS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'saveSettings',
          payload: {
            profil: {
              NAMA_TOKO: namaToko, ALAMAT_TOKO: alamatToko, TELP_TOKO: telpToko, KOTA_TOKO: kotaToko,
              PPN_RATE: ppnRate, DRIVE_FOLDER_STRUK: driveFolderStruk,
              METODE_HPP_DEFAULT: metodeHppDefault, MATA_UANG: mataUang, FORMAT_TANGGAL: formatTanggal,
            },
            categories: settingCategories,
            subcategories: settingSubCategories,
            units: settingUnits,
            platforms: settingPlatforms,
            storages: settingStorageLocations,
            prefixes: settingPrefixes,
          },
        }),
      }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
  }, [namaToko, alamatToko, telpToko, kotaToko, ppnRate, driveFolderStruk, metodeHppDefault, mataUang, formatTanggal, settingCategories, settingSubCategories, settingUnits, settingPlatforms, settingStorageLocations, settingPrefixes]);
  useEffect(() => { setLocalStorage('ino_boms', boms); }, [boms]);
  useEffect(() => { setLocalStorage('ino_riwayat_produksi', riwayatProduksi); }, [riwayatProduksi]);
  useEffect(() => { setLocalStorage('ino_stok_prices', stokPrices); }, [stokPrices]);
  useEffect(() => { setLocalStorage('ino_stok_show_financial', stokShowFinancial); }, [stokShowFinancial]);

  // Stock Report Control States
  const [stokHideZeroQty, setStokHideZeroQty] = useState<boolean>(() => getLocalStorage('ino_stok_hide_zero', false));
  const [stokShowUnitPrice, setStokShowUnitPrice] = useState<boolean>(() => getLocalStorage('ino_stok_show_unit_price', true));
  const [stokShowAmount, setStokShowAmount] = useState<boolean>(() => getLocalStorage('ino_stok_show_amount', true));
  const [stokSelectedSkus, setStokSelectedSkus] = useState<string[]>([]);

  useEffect(() => { setLocalStorage('ino_stok_hide_zero', stokHideZeroQty); }, [stokHideZeroQty]);
  useEffect(() => { setLocalStorage('ino_stok_show_unit_price', stokShowUnitPrice); }, [stokShowUnitPrice]);
  useEffect(() => { setLocalStorage('ino_stok_show_amount', stokShowAmount); }, [stokShowAmount]);

  // Report Hub States
  const [reportSubTab, setReportSubTab] = useState('laba_rugi');
  const [selectedStokMonths, setSelectedStokMonths] = useState<string[]>(['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']);
  const [stokViewMode, setStokViewMode] = useState<'daily' | 'three_days' | 'weekly' | 'monthly' | 'quarterly' | 'annual'>('monthly');
  const [stokSearchTerm, setStokSearchTerm] = useState('');
  const [dailySalesReportMonth, setDailySalesReportMonth] = useState('2026-06');
  const [showAddConsignmentModal, setShowAddConsignmentModal] = useState(false);
  const [showSellConsignmentModal, setShowSellConsignmentModal] = useState(false);
  const [consignmentForm, setConsignmentForm] = useState({
    consignor: '',
    sku: '',
    nama: '',
    qtyReceived: 10,
    harga: 10000,
    komisiPct: 20,
    catatan: ''
  });
  const [consignmentSellForm, setConsignmentSellForm] = useState({
    id: '',
    qtySold: 5
  });

  // Sub-tabs for spreadsheet toggling
  const [productTab, setProductTab] = useState('daftar'); // 'daftar' | 'spreadsheet'
  const [relasiTab, setRelasiTab] = useState('daftar'); // 'daftar' | 'spreadsheet_customer' | 'spreadsheet_supplier'

  // Modul Produksi form states
  const [produksiActiveSubTab, setProduksiActiveSubTab] = useState<string>('form_produksi');
  const [selectedBomId, setSelectedBomId] = useState<string>('BOM-FG-0001');
  const [qtyToProduce, setQtyToProduce] = useState<number>(10);
  const [laborCostInput, setLaborCostInput] = useState<number>(0);
  
  const [showAddBomModal, setShowAddBomModal] = useState<boolean>(false);
  const [isEditingBom, setIsEditingBom] = useState<boolean>(false);
  const [editingBomId, setEditingBomId] = useState<string>('');
  const [bomFormSkuFinishedGood, setBomFormSkuFinishedGood] = useState<string>('');
  const [bomFormIngredients, setBomFormIngredients] = useState<any[]>([]);
  const [newIngredientSku, setNewIngredientSku] = useState<string>('');
  const [newIngredientQty, setNewIngredientQty] = useState<number>(1);

  // Dashboard Sub-Tabs & Filters
  const [dashboardSubTab, setDashboardSubTab] = useState<'operasional' | 'analitik'>('operasional');
  const [analitikStartDate, setAnalitikStartDate] = useState('2026-06-01');
  const [analitikEndDate, setAnalitikEndDate] = useState('2026-06-30');
  const [selectedSkuAnalysis, setSelectedSkuAnalysis] = useState('FG-0001');
  const [selectedCustomerAnalysis, setSelectedCustomerAnalysis] = useState('PT. Sentosa Makmur');

  // States for Company Onboarding / Creation Wizard
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [newCompanyForm, setNewCompanyForm] = useState({
    nama: '',
    alamat: '',
    telp: '',
    kota: '',
    tipeTemplate: 'empty' // 'empty' | 'bakery' | 'retail' | 'consignment'
  });

  // ponytail: Memoize getActivePeriods and computeStockLedgerData to prevent severe lag during typing/rendering on other tabs
  const activePeriods = React.useMemo(() => {
    if (stokViewMode === 'monthly') {
      return selectedStokMonths.map(m => {
        const mConf = AVAILABLE_MONTHS.find(x => x.id === m)!;
        return {
          id: m,
          label: mConf.label,
          startDate: `2026-${mConf.code}-01`,
          endDate: `2026-${mConf.code}-31`
        };
      });
    } else if (stokViewMode === 'quarterly') {
      return QUARTERS_DEF.map(q => {
        const startM = AVAILABLE_MONTHS.find(x => x.id === q.months[0])!;
        const endM = AVAILABLE_MONTHS.find(x => x.id === q.months[q.months.length - 1])!;
        return {
          id: q.id,
          label: q.label,
          startDate: `2026-${startM.code}-01`,
          endDate: `2026-${endM.code}-31`
        };
      });
    } else if (stokViewMode === 'annual') {
      return [{
        id: 'annual',
        label: 'Konsolidasi Tahunan 2026',
        startDate: '2026-01-01',
        endDate: '2026-12-31'
      }];
    }

    // Daily, weekly, 3-day view: dynamic slice between analitikStartDate and analitikEndDate
    const start = new Date(analitikStartDate);
    const end = new Date(analitikEndDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    if (stokViewMode === 'daily') {
      const limit = Math.min(diffDays, 31); // Guard to prevent rendering too many columns
      const list = [];
      for (let i = 0; i < limit; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const dateStr = `${yyyy}-${mm}-${dd}`;
        list.push({
          id: dateStr,
          label: `${dd}/${mm}`,
          startDate: dateStr,
          endDate: dateStr
        });
      }
      return list;
    } else if (stokViewMode === 'three_days') {
      const list = [];
      const bucketSize = 3;
      const limitBuckets = Math.min(Math.ceil(diffDays / bucketSize), 15);
      for (let i = 0; i < limitBuckets; i++) {
        const dStart = new Date(start);
        dStart.setDate(start.getDate() + (i * bucketSize));
        const dEnd = new Date(dStart);
        dEnd.setDate(dStart.getDate() + (bucketSize - 1));
        if (dEnd > end) dEnd.setTime(end.getTime());

        const mmStart = String(dStart.getMonth() + 1).padStart(2, '0');
        const ddStart = String(dStart.getDate()).padStart(2, '0');
        const mmEnd = String(dEnd.getMonth() + 1).padStart(2, '0');
        const ddEnd = String(dEnd.getDate()).padStart(2, '0');

        const yStart = dStart.getFullYear();
        const yEnd = dEnd.getFullYear();

        list.push({
          id: `3D_${i}`,
          label: `${ddStart}/${mmStart}-${ddEnd}/${mmEnd}`,
          startDate: `${yStart}-${mmStart}-${ddStart}`,
          endDate: `${yEnd}-${mmEnd}-${ddEnd}`
        });
      }
      return list;
    } else {
      // weekly
      const list = [];
      const bucketSize = 7;
      const limitBuckets = Math.min(Math.ceil(diffDays / bucketSize), 12);
      for (let i = 0; i < limitBuckets; i++) {
        const dStart = new Date(start);
        dStart.setDate(start.getDate() + (i * bucketSize));
        const dEnd = new Date(dStart);
        dEnd.setDate(dStart.getDate() + (bucketSize - 1));
        if (dEnd > end) dEnd.setTime(end.getTime());

        const mmStart = String(dStart.getMonth() + 1).padStart(2, '0');
        const ddStart = String(dStart.getDate()).padStart(2, '0');
        const mmEnd = String(dEnd.getMonth() + 1).padStart(2, '0');
        const ddEnd = String(dEnd.getDate()).padStart(2, '0');

        const yStart = dStart.getFullYear();
        const yEnd = dEnd.getFullYear();

        list.push({
          id: `W_${i}`,
          label: `Mgg ${i + 1} (${ddStart}/${mmStart})`,
          startDate: `${yStart}-${mmStart}-${ddStart}`,
          endDate: `${yEnd}-${mmEnd}-${ddEnd}`
        });
      }
      return list;
    }
  }, [stokViewMode, selectedStokMonths, analitikStartDate, analitikEndDate]);

  const ledgerData = React.useMemo(() => {
    if (activePeriods.length === 0) return [];

    return products.map((p: any) => {
      let totalInFromEarliest = 0;
      let totalOutFromEarliest = 0;

      const periodMovements = activePeriods.map(period => {
        const isMonthlyMatching = stokViewMode === 'monthly';
        const isQuarterlyMatching = stokViewMode === 'quarterly';
        
        const dateMatches = (tgl: string) => {
          if (isMonthlyMatching) {
            const mCode = AVAILABLE_MONTHS.find(x => x.id === period.id)?.code;
            return tgl.startsWith(`2026-${mCode}`);
          }
          if (isQuarterlyMatching) {
            const mCodes = QUARTERS_DEF.find(x => x.id === period.id)?.months.map(m => AVAILABLE_MONTHS.find(x => x.id === m)?.code) || [];
            return mCodes.some(mc => tgl.startsWith(`2026-${mc}`));
          }
          return tgl >= period.startDate && tgl <= period.endDate;
        };

        // PO Qty
        const poQty = purchaseOrders
          .filter(po => dateMatches(po.tanggal) && po.statusLogistik === 'Diterima')
          .reduce((sum, po) => {
            const item = po.items.find((i: any) => i.sku === p.sku);
            return sum + (item ? item.qty : 0);
          }, 0);

        // Opname Plus
        const opnamePlusQty = opnameLog
          .filter(log => dateMatches(log.tanggal) && log.sku === p.sku && log.tipe === 'OPNAME_PLUS')
          .reduce((sum, log) => sum + Math.abs(log.selisih), 0);

        const stockInQty = poQty + opnamePlusQty;

        // Stock In price weighted average
        let stockInPrice = stokPrices[p.sku] ?? (p.hpp || 12000);
        const matchingPos = purchaseOrders.filter(po => dateMatches(po.tanggal) && po.statusLogistik === 'Diterima');
        let poTotalSpent = 0;
        let poTotalQty = 0;
        matchingPos.forEach(po => {
          const item = po.items.find((i: any) => i.sku === p.sku);
          if (item) {
            poTotalSpent += item.qty * item.harga;
            poTotalQty += item.qty;
          }
        });
        if (poTotalQty > 0) {
          stockInPrice = poTotalSpent / poTotalQty;
        } else {
          const opnamePlusEntry = opnameLog.find(log => dateMatches(log.tanggal) && log.sku === p.sku && log.tipe === 'OPNAME_PLUS');
          if (opnamePlusEntry && opnamePlusEntry.HPP) {
            stockInPrice = opnamePlusEntry.HPP;
          }
        }

        // SO Qty
        const soQty = salesOrders
          .filter(so => dateMatches(so.tanggal) && so.statusLogistik !== 'Void')
          .reduce((sum, so) => {
            const item = so.items.find((i: any) => i.sku === p.sku);
            return sum + (item ? item.qty : 0);
          }, 0);

        // Opname Minus
        const opnameMinusQty = opnameLog
          .filter(log => dateMatches(log.tanggal) && log.sku === p.sku && (log.tipe === 'OPNAME_MINUS' || log.tipe === 'WASTAGE'))
          .reduce((sum, log) => sum + Math.abs(log.selisih), 0);

        const stockOutQty = soQty + opnameMinusQty;

        totalInFromEarliest += stockInQty;
        totalOutFromEarliest += stockOutQty;

        return {
          periodId: period.id,
          periodLabel: period.label,
          stockInQty,
          stockInPrice,
          stockInAmount: stockInQty * stockInPrice,
          stockOutQty,
          stockOutPrice: 0,
          stockOutAmount: 0,
          endingQty: 0,
          endingPrice: 0,
          endingAmount: 0,
          beginningQty: 0,
          beginningPrice: 0,
          beginningAmount: 0
        };
      });

      // Reconstruct backward starting balance of earliestStart to ensure mathematical consistency with current live stock
      const initialQty = Math.max(0, p.stok - totalInFromEarliest + totalOutFromEarliest);
      const initialPrice = stokPrices[p.sku] ?? (p.hpp || 12000);
      const initialAmount = initialQty * initialPrice;

      // Queue of batches for FIFO tracking
      // Each batch: { qty: number, price: number }
      let fifoQueue: { qty: number; price: number }[] = [];
      if (initialQty > 0) {
        fifoQueue.push({ qty: initialQty, price: initialPrice });
      }

      // Forward pass for period cascade balance sheet
      let runningQty = initialQty;
      let runningAmount = initialAmount;

      const periodCascade = periodMovements.map(mov => {
        const beginningQty = runningQty;
        const beginningAmount = runningAmount;
        const beginningPrice = (beginningQty > 0) ? (beginningAmount / beginningQty) : (stokPrices[p.sku] ?? (p.hpp || 12000));

        const inQty = mov.stockInQty;
        const inPrice = mov.stockInPrice;
        const inAmount = mov.stockInAmount;

        // Add incoming stock to FIFO queue if positive
        if (inQty > 0) {
          fifoQueue.push({ qty: inQty, price: inPrice });
        }

        const outQty = mov.stockOutQty;
        let outAmount = 0;
        let remainingToDeduct = outQty;

        if (metodeHppDefault === 'FIFO') {
          // FIFO consumption logic
          const tempQueue = fifoQueue.map(b => ({ ...b })); // clone
          let consumedAmount = 0;
          
          while (remainingToDeduct > 0 && tempQueue.length > 0) {
            const oldestBatch = tempQueue[0];
            if (oldestBatch.qty <= remainingToDeduct) {
              consumedAmount += oldestBatch.qty * oldestBatch.price;
              remainingToDeduct -= oldestBatch.qty;
              tempQueue.shift();
            } else {
              consumedAmount += remainingToDeduct * oldestBatch.price;
              oldestBatch.qty -= remainingToDeduct;
              remainingToDeduct = 0;
            }
          }
          
          // If there is still excess to deduct (system sold items beyond stock)
          if (remainingToDeduct > 0) {
            const fallbackPrice = inQty > 0 ? inPrice : beginningPrice;
            consumedAmount += remainingToDeduct * fallbackPrice;
          }
          
          outAmount = consumedAmount;
          fifoQueue = tempQueue; // commit queue state after sale
          
          runningQty = Math.max(0, (beginningQty + inQty) - outQty);
          runningAmount = fifoQueue.reduce((sum, b) => sum + (b.qty * b.price), 0);
          
        } else {
          // Moving Average (HPP) logic
          const totalQtyBeforeSales = beginningQty + inQty;
          const totalAmountBeforeSales = beginningAmount + inAmount;
          const runningHpp = (totalQtyBeforeSales > 0) ? (totalAmountBeforeSales / totalQtyBeforeSales) : beginningPrice;

          outAmount = outQty * runningHpp;
          runningQty = Math.max(0, totalQtyBeforeSales - outQty);
          runningAmount = Math.max(0, totalAmountBeforeSales - outAmount);
        }

        const outPrice = outQty > 0 ? (outAmount / outQty) : (metodeHppDefault === 'FIFO' ? (fifoQueue[0]?.price ?? inPrice) : beginningPrice);
        const endingPrice = (runningQty > 0) ? (runningAmount / runningQty) : (metodeHppDefault === 'FIFO' ? (fifoQueue[0]?.price ?? inPrice) : beginningPrice);

        return {
          ...mov,
          beginningQty,
          beginningPrice,
          beginningAmount,
          stockOutPrice: outPrice,
          stockOutAmount: outAmount,
          endingQty: runningQty,
          endingPrice,
          endingAmount: runningAmount
        };
      });

      return {
        sku: p.sku,
        nama: p.nama,
        satuan: p.satuan,
        initialQty,
        initialPrice,
        initialAmount,
        periods: periodCascade,
        endingQty: runningQty
      };
    });
  }, [activePeriods, products, purchaseOrders, salesOrders, opnameLog, stokPrices, stokViewMode]);

  // Manual Cash Transaction Form Modal
  const [showManualCashModal, setShowManualCashModal] = useState(false);
  const [manualCashForm, setManualCashForm] = useState({
    tanggal: new Date().toISOString().split('T')[0],
    keterangan: '',
    kategori: 'Operasional Lain',
    tipe: 'KELUAR', // 'MASUK' | 'KELUAR'
    nominal: 0
  });

  // Selected entities inside ledger spreadsheets
  const [selectedProductSku, setSelectedProductSku] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // Cell state for each ledger spreadsheet (persisted)
  const [productLedgerCells, setProductLedgerCells] = useState<Record<string, string[][]>>(() => getLocalStorage('ino_product_ledgers', {}));
  const [customerLedgerCells, setCustomerLedgerCells] = useState<Record<string, string[][]>>(() => getLocalStorage('ino_customer_ledgers', {}));
  const [supplierLedgerCells, setSupplierLedgerCells] = useState<Record<string, string[][]>>(() => getLocalStorage('ino_supplier_ledgers', {}));

  // ponytail: satu kali tarik seluruh data dari Google Sheets saat app dibuka, lalu timpa state lokal.
  // Kalau fetch gagal (offline / URL belum diisi) app tetap jalan pakai data localStorage yang sudah dimuat duluan.
  useEffect(() => {
    if (!SHEETS_API_URL) return;
    const setters: Record<string, (v: any) => void> = {
      ino_products: setProducts,
      ino_customers: setCustomers,
      ino_suppliers: setSuppliers,
      ino_purchase_orders: setPurchaseOrders,
      ino_sales_orders: setSalesOrders,
      ino_opname_log: setOpnameLog,
      ino_cash_ledger: setCashLedger,
      ino_consignments: setConsignments,
      ino_tipe_bisnis: setTipeBisnis,
      ino_is_login_active: setIsLoginActive,
      ino_login_username: setLoginUsername,
      ino_login_password: setLoginPassword,
      ino_nama_toko: setNamaToko,
      ino_alamat_toko: setAlamatToko,
      ino_telp_toko: setTelpToko,
      ino_kota_toko: setKotaToko,
      ino_ppn_rate: setPpnRate,
      ino_metode_hpp_default: setMetodeHppDefault,
      ino_mata_uang: setMataUang,
      ino_drive_folder_struk: setDriveFolderStruk,
      ino_format_tanggal: setFormatTanggal,
      ino_setting_categories: setSettingCategories,
      ino_setting_subcategories: setSettingSubCategories,
      ino_setting_units: setSettingUnits,
      ino_setting_storages: setSettingStorageLocations,
      ino_setting_platforms: setSettingPlatforms,
      ino_setting_prefixes: setSettingPrefixes,
      ino_setting_users: setSettingUsersList,
      ino_boms: setBoms,
      ino_riwayat_produksi: setRiwayatProduksi,
      ino_stok_prices: setStokPrices,
      ino_stok_show_financial: setStokShowFinancial,
      ino_stok_hide_zero: setStokHideZeroQty,
      ino_stok_show_unit_price: setStokShowUnitPrice,
      ino_stok_show_amount: setStokShowAmount,
      ino_product_ledgers: setProductLedgerCells,
      ino_customer_ledgers: setCustomerLedgerCells,
      ino_supplier_ledgers: setSupplierLedgerCells,
    };
    fetch(SHEETS_API_URL)
      .then(res => res.json())
      .then((data: Record<string, any>) => {
        Object.entries(setters).forEach(([key, setter]) => {
          if (data[key] !== undefined) setter(data[key]);
        });
      })
      .catch(() => {});

    // ponytail: setting & user list sekarang datang dari SHEET_SETTING asli (endpoint terpisah),
    // ditarik & di-apply belakangan supaya menimpa nilai dari fetch generik di atas (kalau ada).
    fetch(SHEETS_API_URL + '?action=settings')
      .then(res => res.json())
      .then((data: Record<string, any>) => {
        Object.entries(setters).forEach(([key, setter]) => {
          if (data[key] === undefined) return;
          if (key === 'ino_setting_users') {
            // ponytail: backend sengaja TIDAK pernah kirim balik password/hash (alasan keamanan).
            // Field pin dikosongkan di sini — kalau admin nggak ngetik ulang PIN-nya, ya berarti tidak diubah.
            setter((data[key] as any[]).map(u => ({ email: u.username, nama: u.nama, role: u.role, pin: '' })));
            return;
          }
          setter(data[key]);
        });
      })
      .catch(() => {});

    // ponytail: Produk/PO/SO/Opname sekarang sumber aslinya sheet relasional (DB_MASTER, LOG_*),
    // bukan AppState — ditarik lewat endpoint terpisah, sama pola dengan settings di atas.
    fetch(SHEETS_API_URL + '?action=data')
      .then(res => res.json())
      .then((data: Record<string, any>) => {
        Object.entries(setters).forEach(([key, setter]) => {
          if (data[key] !== undefined) setter(data[key]);
        });
      })
      .catch(() => {});
  }, []);

  // Viewing detail states for Rincian Transaksi modals
  const [viewingProductTx, setViewingProductTx] = useState<any | null>(null);
  const [viewingCustomerTx, setViewingCustomerTx] = useState<any | null>(null);
  const [viewingSupplierTx, setViewingSupplierTx] = useState<any | null>(null);

  useEffect(() => { setLocalStorage('ino_product_ledgers', productLedgerCells); }, [productLedgerCells]);
  useEffect(() => { setLocalStorage('ino_customer_ledgers', customerLedgerCells); }, [customerLedgerCells]);
  useEffect(() => { setLocalStorage('ino_supplier_ledgers', supplierLedgerCells); }, [supplierLedgerCells]);

  // Login Screen Controlled Input States
  const [loginInputUser, setLoginInputUser] = useState('');
  const [loginInputPass, setLoginInputPass] = useState('');

  // Google Sheets / Excel Hub States
  const [sheetsHubSubTab, setSheetsHubSubTab] = useState<'ekspor' | 'impor' | 'gas'>('ekspor');
  const [importTargetType, setImportTargetType] = useState<'produk' | 'pelanggan' | 'supplier'>('produk');
  const [importMethod, setImportMethod] = useState<'merge' | 'overwrite'>('merge');
  const [pasteText, setPasteText] = useState('');
  const [parsedImportRows, setParsedImportRows] = useState<any[]>([]);
  const [parsedImportHeaders, setParsedImportHeaders] = useState<string[]>([]);

  // Auto-initialize active spreadsheet tabs
  useEffect(() => {
    if (!selectedProductSku && products.length > 0) {
      setSelectedProductSku(products[0].sku);
    }
  }, [products, selectedProductSku]);

  useEffect(() => {
    if (!selectedCustomerId && customers.length > 0) {
      setSelectedCustomerId(customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  useEffect(() => {
    if (!selectedSupplierId && suppliers.length > 0) {
      setSelectedSupplierId(suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  const triggerToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // ==========================================
  // ERP TRANSACTION EDIT & MODAL STATES
  // ==========================================
  const [selectedPo, setSelectedPo] = useState<any | null>(null);
  const [selectedSo, setSelectedSo] = useState<any | null>(null);

  const [poActionForm, setPoActionForm] = useState<'receipt' | 'payment' | 'retur' | 'print' | null>(null);
  const [soActionForm, setSoActionForm] = useState<'shipment' | 'payment' | 'retur' | 'print' | null>(null);

  // Form states for Penerimaan / Pengiriman
  const [poReceiptQtys, setPoReceiptQtys] = useState<Record<string, number>>({});
  const [soShipmentQtys, setSoShipmentQtys] = useState<Record<string, number>>({});

  // Form states for Pembayaran PO / Pelunasan SO
  const [poPaymentVal, setPoPaymentVal] = useState<number>(0);
  const [poPaymentMetode, setPoPaymentMetode] = useState<string>('Transfer Bank');
  const [poPaymentRef, setPoPaymentRef] = useState<string>('');
  const [poPaymentMemo, setPoPaymentMemo] = useState<string>('');

  const [soPaymentVal, setSoPaymentVal] = useState<number>(0);
  const [soPaymentMetode, setSoPaymentMetode] = useState<string>('Transfer Bank');
  const [soPaymentRef, setSoPaymentRef] = useState<string>('');
  const [soPaymentMemo, setSoPaymentMemo] = useState<string>('');

  // Form states for Retur
  const [poReturQtys, setPoReturQtys] = useState<Record<string, number>>({});
  const [poReturAlasan, setPoReturAlasan] = useState<string>('');

  const [soReturQtys, setSoReturQtys] = useState<Record<string, number>>({});
  const [soReturAlasan, setSoReturAlasan] = useState<string>('');

  // Dropdown states
  const [poShowKebab, setPoShowKebab] = useState<boolean>(false);
  const [soShowKebab, setSoShowKebab] = useState<boolean>(false);

  // Custom ERP Operations & Sub-Modal Handlers
  const handleOpenPoReceipt = (po: any) => {
    const qtys: Record<string, number> = {};
    po.items.forEach((item: any) => {
      const received = item.qtyReceived ?? (po.statusLogistik === 'Diterima' ? item.qty : 0);
      qtys[item.sku] = Math.max(0, item.qty - received);
    });
    setPoReceiptQtys(qtys);
    setPoActionForm('receipt');
  };

  const handleOpenSoShipment = (so: any) => {
    const qtys: Record<string, number> = {};
    so.items.forEach((item: any) => {
      const shipped = item.qtyShipped ?? (so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai' ? item.qty : 0);
      qtys[item.sku] = Math.max(0, item.qty - shipped);
    });
    setSoShipmentQtys(qtys);
    setSoActionForm('shipment');
  };

  const handleOpenPoPayment = (po: any) => {
    const paid = po.totalPaid ?? (po.statusBayar === 'Lunas' ? po.grandTotal : 0);
    const sisa = Math.max(0, po.grandTotal - paid);
    setPoPaymentVal(sisa);
    setPoPaymentMetode('Transfer Bank');
    setPoPaymentRef('');
    setPoPaymentMemo('');
    setPoActionForm('payment');
  };

  const handleOpenSoPayment = (so: any) => {
    const paid = so.totalPaid ?? (so.statusBayar === 'Lunas' ? so.grandTotal : 0);
    const sisa = Math.max(0, so.grandTotal - paid);
    setSoPaymentVal(sisa);
    setSoPaymentMetode('Transfer Bank');
    setSoPaymentRef('');
    setSoPaymentMemo('');
    setSoActionForm('payment');
  };

  const handleOpenPoRetur = (po: any) => {
    const qtys: Record<string, number> = {};
    po.items.forEach((item: any) => {
      qtys[item.sku] = 0;
    });
    setPoReturQtys(qtys);
    setPoReturAlasan('');
    setPoActionForm('retur');
  };

  const handleOpenSoRetur = (so: any) => {
    const qtys: Record<string, number> = {};
    so.items.forEach((item: any) => {
      qtys[item.sku] = 0;
    });
    setSoReturQtys(qtys);
    setSoReturAlasan('');
    setSoActionForm('retur');
  };

  // 1. Submit Receipt (Penerimaan PO)
  const submitPoReceipt = (poId: string) => {
    let hasValidInput = false;
    let anyError = false;

    setPurchaseOrders(prevOrders => prevOrders.map(po => {
      if (po.id !== poId) return po;

      const updatedItems = po.items.map((item: any) => {
        const received = item.qtyReceived ?? (po.statusLogistik === 'Diterima' ? item.qty : 0);
        const inputVal = poReceiptQtys[item.sku] ?? 0;

        if (inputVal < 0) {
          triggerToast('Kuantitas terima tidak boleh negatif!', 'error');
          anyError = true;
          return item;
        }

        const sisa = item.qty - received;
        if (inputVal > sisa) {
          triggerToast(`Kuantitas terima untuk ${item.nama || item.sku} melebihi sisa pesanan (${sisa})!`, 'error');
          anyError = true;
          return item;
        }

        if (inputVal > 0) {
          hasValidInput = true;
        }

        return {
          ...item,
          qtyReceived: received + inputVal
        };
      });

      if (anyError) return po;
      if (!hasValidInput) {
        triggerToast('Isi kuantitas terima minimal pada satu produk!', 'warning');
        return po;
      }

      // Add to product stocks physically
      const updatedProducts = products.map(p => {
        const inputVal = poReceiptQtys[p.sku] ?? 0;
        return inputVal > 0 ? { ...p, stok: p.stok + inputVal } : p;
      });
      setProducts(updatedProducts);

      // Check new logistik status
      const allFullyReceived = updatedItems.every((item: any) => (item.qtyReceived || 0) >= item.qty);
      const someReceived = updatedItems.some((item: any) => (item.qtyReceived || 0) > 0);
      const newStatus = allFullyReceived ? 'Diterima' : someReceived ? 'Diterima Sebagian' : 'Menunggu';

      const updatedPo = {
        ...po,
        items: updatedItems,
        statusLogistik: newStatus
      };

      setSelectedPo(updatedPo);
      setPoActionForm(null);
      triggerToast(`Berhasil menerima barang untuk ${po.id}. Stok gudang ditambahkan.`);
      return updatedPo;
    }));
  };

  // 2. Submit Shipment (Pengiriman SO)
  const submitSoShipment = (soId: string) => {
    let hasValidInput = false;
    let anyError = false;

    setSalesOrders(prevOrders => prevOrders.map(so => {
      if (so.id !== soId) return so;

      const updatedItems = so.items.map((item: any) => {
        const shipped = item.qtyShipped ?? (so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai' ? item.qty : 0);
        const inputVal = soShipmentQtys[item.sku] ?? 0;

        if (inputVal < 0) {
          triggerToast('Kuantitas kirim tidak boleh negatif!', 'error');
          anyError = true;
          return item;
        }

        const sisa = item.qty - shipped;
        if (inputVal > sisa) {
          triggerToast(`Kuantitas kirim untuk ${item.nama || item.sku} melebihi sisa pesanan (${sisa})!`, 'error');
          anyError = true;
          return item;
        }

        // Check current product stock
        const prod = products.find(p => p.sku === item.sku);
        if (prod && prod.stok < inputVal) {
          triggerToast(`Gagal kirim! Stok ${prod.nama} di gudang (${prod.stok}) kurang dari jumlah dikirim (${inputVal}).`, 'error');
          anyError = true;
          return item;
        }

        if (inputVal > 0) {
          hasValidInput = true;
        }

        return {
          ...item,
          qtyShipped: shipped + inputVal
        };
      });

      if (anyError) return so;
      if (!hasValidInput) {
        triggerToast('Isi kuantitas kirim minimal pada satu produk!', 'warning');
        return so;
      }

      // Deduct from product stocks physically
      const updatedProducts = products.map(p => {
        const inputVal = soShipmentQtys[p.sku] ?? 0;
        return inputVal > 0 ? { ...p, stok: Math.max(0, p.stok - inputVal) } : p;
      });
      setProducts(updatedProducts);

      // Check new status
      const allDone = updatedItems.every((item: any) => (item.qtyShipped || 0) >= item.qty);
      const someDone = updatedItems.some((item: any) => (item.qtyShipped || 0) > 0);
      const newStatus = allDone ? 'Terkirim' : someDone ? 'Terkirim Sebagian' : 'Menunggu Pengiriman';

      const updatedSo = {
        ...so,
        items: updatedItems,
        statusLogistik: newStatus
      };

      setSelectedSo(updatedSo);
      setSoActionForm(null);
      triggerToast(`Berhasil mengirimkan barang untuk ${so.id}. Stok gudang dikurangi.`);
      return updatedSo;
    }));
  };

  // 3. Submit PO Payment
  const submitPoPayment = (poId: string) => {
    if (poPaymentVal <= 0) return triggerToast('Nominal pembayaran tidak valid!', 'error');

    let anyError = false;
    setPurchaseOrders(prevOrders => prevOrders.map(po => {
      if (po.id !== poId) return po;

      const paid = po.totalPaid ?? (po.statusBayar === 'Lunas' ? po.grandTotal : 0);
      const sisa = po.grandTotal - paid;

      if (poPaymentVal > sisa) {
        triggerToast(`Nominal pembayaran (Rp ${poPaymentVal.toLocaleString('id-ID')}) melebihi sisa hutang (Rp ${sisa.toLocaleString('id-ID')})!`, 'error');
        anyError = true;
        return po;
      }

      const updatedPaid = paid + poPaymentVal;
      const isLunas = updatedPaid >= po.grandTotal - 0.01;

      // Adjust supplier's hutang
      setSuppliers(prev => prev.map(s => s.nama === po.supplier ? { ...s, hutang: Math.max(0, s.hutang - poPaymentVal) } : s));

      // Log cash transaction
      setCashLedger(prev => {
        const lastBal = prev.length > 0 ? prev[prev.length - 1].saldo : 25000000;
        return [...prev, {
          id: `CSH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
          tanggal: new Date().toISOString().slice(0, 10),
          ref: po.id,
          keterangan: `Pembayaran Hutang ke Supplier ${po.supplier} [${po.id}]`,
          kategori: 'Pembelian',
          debit: 0,
          kredit: poPaymentVal,
          saldo: lastBal - poPaymentVal
        }];
      });

      const updatedPo = {
        ...po,
        totalPaid: updatedPaid,
        statusBayar: isLunas ? 'Lunas' : 'Cicilan'
      };

      setSelectedPo(updatedPo);
      setPoActionForm(null);
      triggerToast(`Pembayaran PO sebesar Rp ${poPaymentVal.toLocaleString('id-ID')} berhasil dicatat.`);
      return updatedPo;
    }));
  };

  // 4. Submit SO Payment (Pelunasan Piutang)
  const submitSoPayment = (soId: string) => {
    if (soPaymentVal <= 0) return triggerToast('Nominal pembayaran tidak valid!', 'error');

    let anyError = false;
    setSalesOrders(prevOrders => prevOrders.map(so => {
      if (so.id !== soId) return so;

      const paid = so.totalPaid ?? (so.statusBayar === 'Lunas' ? so.grandTotal : 0);
      const sisa = so.grandTotal - paid;

      if (soPaymentVal > sisa) {
        triggerToast(`Nominal setoran (Rp ${soPaymentVal.toLocaleString('id-ID')}) melebihi sisa piutang (Rp ${sisa.toLocaleString('id-ID')})!`, 'error');
        anyError = true;
        return so;
      }

      const updatedPaid = paid + soPaymentVal;
      const isLunas = updatedPaid >= so.grandTotal - 0.01;

      // Adjust customer's piutang
      setCustomers(prev => prev.map(c => c.nama === so.pelanggan ? { ...c, piutang: Math.max(0, c.piutang - soPaymentVal) } : c));

      // Log cash transaction
      setCashLedger(prev => {
        const lastBal = prev.length > 0 ? prev[prev.length - 1].saldo : 25000000;
        return [...prev, {
          id: `CSH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
          tanggal: new Date().toISOString().slice(0, 10),
          ref: so.id,
          keterangan: `Penerimaan Pelunasan dari Pelanggan ${so.pelanggan} [${so.id}]`,
          kategori: 'Penjualan',
          debit: soPaymentVal,
          kredit: 0,
          saldo: lastBal + soPaymentVal
        }];
      });

      const updatedSo = {
        ...so,
        totalPaid: updatedPaid,
        statusBayar: isLunas ? 'Lunas' : 'Cicilan'
      };

      setSelectedSo(updatedSo);
      setSoActionForm(null);
      triggerToast(`Pelunasan piutang sebesar Rp ${soPaymentVal.toLocaleString('id-ID')} berhasil dicatat.`);
      return updatedSo;
    }));
  };

  // 5. Submit PO Retur
  const submitPoRetur = (poId: string) => {
    let hasValidInput = false;
    let anyError = false;

    if (!poReturAlasan.trim()) {
      triggerToast('Alasan retur wajib diisi!', 'warning');
      return;
    }

    setPurchaseOrders(prevOrders => prevOrders.map(po => {
      if (po.id !== poId) return po;

      const updatedItems = po.items.map((item: any) => {
        const received = item.qtyReceived ?? (po.statusLogistik === 'Diterima' ? item.qty : 0);
        const returned = item.qtyReturned ?? 0;
        const inputVal = poReturQtys[item.sku] ?? 0;

        if (inputVal < 0) {
          triggerToast('Kuantitas retur tidak boleh negatif!', 'error');
          anyError = true;
          return item;
        }

        const maxRetur = received - returned;
        if (inputVal > maxRetur) {
          triggerToast(`Jumlah retur untuk ${item.nama || item.sku} melebihi batas yang diterima (${maxRetur})!`, 'error');
          anyError = true;
          return item;
        }

        // Check if we have enough stock at hand in our products database to return
        const prod = products.find(p => p.sku === item.sku);
        if (prod && prod.stok < inputVal) {
          triggerToast(`Gagal retur! Sisa stok ${prod.nama} di gudang (${prod.stok}) kurang dari jumlah retur (${inputVal}).`, 'error');
          anyError = true;
          return item;
        }

        if (inputVal > 0) {
          hasValidInput = true;
        }

        return {
          ...item,
          qtyReturned: returned + inputVal
        };
      });

      if (anyError) return po;
      if (!hasValidInput) {
        triggerToast('Isi angka retur minimal pada satu barang.', 'warning');
        return po;
      }

      // Deduct returned goods from stocks physically
      const updatedProducts = products.map(p => {
        const inputVal = poReturQtys[p.sku] ?? 0;
        return inputVal > 0 ? { ...p, stok: Math.max(0, p.stok - inputVal) } : p;
      });
      setProducts(updatedProducts);

      // Reduce Supplier's Hutang by returValue
      let totalReturValue = 0;
      updatedItems.forEach((item: any) => {
        const inputVal = poReturQtys[item.sku] ?? 0;
        totalReturValue += inputVal * item.harga;
      });

      if (po.statusBayar === 'Belum Dibayar' || po.statusBayar === 'Cicilan') {
        setSuppliers(prev => prev.map(s => s.nama === po.supplier ? { ...s, hutang: Math.max(0, s.hutang - totalReturValue) } : s));
      }

      // Add to returItems array
      const currentReturns = po.returItems || [];
      const newReturns = [...currentReturns];
      updatedItems.forEach((item: any) => {
        const inputVal = poReturQtys[item.sku] ?? 0;
        if (inputVal > 0) {
          newReturns.push({
            sku: item.sku,
            nama: item.nama,
            qty: inputVal,
            tanggal: new Date().toISOString().split('T')[0],
            alasan: poReturAlasan
          });
        }
      });

      const updatedPo = {
        ...po,
        items: updatedItems,
        returItems: newReturns
      };

      setSelectedPo(updatedPo);
      setPoActionForm(null);
      triggerToast('Retur Pembelian berhasil diproses. Stok gudang dikurangi & hutang supplier disesuaikan.');
      return updatedPo;
    }));
  };

  // 6. Submit SO Retur (Customer)
  const submitSoRetur = (soId: string) => {
    let hasValidInput = false;
    let anyError = false;

    if (!soReturAlasan.trim()) {
      triggerToast('Alasan retur wajib diisi!', 'warning');
      return;
    }

    setSalesOrders(prevOrders => prevOrders.map(so => {
      if (so.id !== soId) return so;

      const updatedItems = so.items.map((item: any) => {
        const shipped = item.qtyShipped ?? (so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai' ? item.qty : 0);
        const returned = item.qtyReturned ?? 0;
        const inputVal = soReturQtys[item.sku] ?? 0;

        if (inputVal < 0) {
          triggerToast('Kuantitas retur tidak boleh negatif!', 'error');
          anyError = true;
          return item;
        }

        const maxRetur = shipped - returned;
        if (inputVal > maxRetur) {
          triggerToast(`Jumlah retur untuk ${item.nama || item.sku} melebihi batas yang dikirim (${maxRetur})!`, 'error');
          anyError = true;
          return item;
        }

        if (inputVal > 0) {
          hasValidInput = true;
        }

        return {
          ...item,
          qtyReturned: returned + inputVal
        };
      });

      if (anyError) return so;
      if (!hasValidInput) {
        triggerToast('Isi angka retur minimal pada satu barang.', 'warning');
        return so;
      }

      // Add returned goods back to stocks physically
      const updatedProducts = products.map(p => {
        const inputVal = soReturQtys[p.sku] ?? 0;
        return inputVal > 0 ? { ...p, stok: p.stok + inputVal } : p;
      });
      setProducts(updatedProducts);

      // Reduce Customer's Piutang by returValue
      let totalReturValue = 0;
      updatedItems.forEach((item: any) => {
        const inputVal = soReturQtys[item.sku] ?? 0;
        totalReturValue += inputVal * item.harga;
      });

      if (so.statusBayar === 'Belum Lunas' || so.statusBayar === 'Cicilan') {
        setCustomers(prev => prev.map(c => c.nama === so.pelanggan ? { ...c, piutang: Math.max(0, c.piutang - totalReturValue) } : c));
      }

      // Add to returItems array
      const currentReturns = so.returItems || [];
      const newReturns = [...currentReturns];
      updatedItems.forEach((item: any) => {
        const inputVal = soReturQtys[item.sku] ?? 0;
        if (inputVal > 0) {
          newReturns.push({
            sku: item.sku,
            nama: item.nama,
            qty: inputVal,
            tanggal: new Date().toISOString().split('T')[0],
            alasan: soReturAlasan
          });
        }
      });

      const updatedSo = {
        ...so,
        items: updatedItems,
        returItems: newReturns
      };

      setSelectedSo(updatedSo);
      setSoActionForm(null);
      triggerToast('Retur Penjualan berhasil diproses. Stok gudang ditambahkan & piutang customer disesuaikan.');
      return updatedSo;
    }));
  };

  // 7. Approve PO (Draft -> Official)
  const handleApprovePO = (poId: string) => {
    setPurchaseOrders(prevOrders => prevOrders.map(po => {
      if (po.id !== poId) return po;

      // Add grand total to supplier's hutang
      setSuppliers(prev => prev.map(s => s.nama === po.supplier ? { ...s, hutang: s.hutang + po.grandTotal } : s));

      const updatedPo = {
        ...po,
        statusLogistik: 'Menunggu',
        statusBayar: 'Belum Dibayar'
      };

      setSelectedPo(updatedPo);
      triggerToast(`PO ${poId} berhasil disetujui & dirilis ke Supplier.`);
      return updatedPo;
    }));
  };

  // ==========================================
  // FORM & MODAL STATES
  // ==========================================
  
  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productForm, setProductForm] = useState({
    sku: '', kategori: 'Barang Jadi', subKat: '', nama: '', satuan: 'Pcs', 
    hj: 0, hpp: 0, safety: 10, stok: 0, status: 'Aktif', supplier: '', 
    tempatSimpan: 'Gudang Utama', masaSmp: 'Selamanya', catatan: ''
  });

  // Client/Supplier Modals
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [customerForm, setCustomerForm] = useState({ id: '', nama: '', kontak: '', email: '', telp: '', alamat: '', piutang: 0 });

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [isEditingSupplier, setIsEditingSupplier] = useState(false);
  const [supplierForm, setSupplierForm] = useState({ id: '', nama: '', kontak: '', email: '', telp: '', alamat: '', hutang: 0 });

  // PO & SO Batch creation Form States
  const [poForm, setPoForm] = useState({
    id: '', supplier: '', tanggal: new Date().toISOString().split('T')[0],
    metode: 'Kredit 30 Hari', items: [{ sku: '', qty: 1, harga: 0, subtotal: 0 }],
    pajak: false, catatan: ''
  });
  const [showPoForm, setShowPoForm] = useState(false);
  const [isEditingPo, setIsEditingPo] = useState(false);

  const [soForm, setSoForm] = useState({
    id: '', pelanggan: '', tanggal: new Date().toISOString().split('T')[0],
    metode: 'Tempo 30 Hari', items: [{ sku: '', qty: 1, harga: 0, subtotal: 0 }],
    pajak: false, catatan: ''
  });
  const [showSoForm, setShowSoForm] = useState(false);
  const [isEditingSo, setIsEditingSo] = useState(false);

  // Opname / Wastage State
  const [opnameForm, setOpnameForm] = useState({
    sku: '', tipe: 'OPNAME_PLUS', qtyFisik: 0, catatan: ''
  });

  // ==========================================
  // CALCULATIONS (KPI MONITOR)
  // ==========================================
  const monitorPiutang = customers.reduce((sum, c) => sum + c.piutang, 0);
  const monitorHutang = suppliers.reduce((sum, s) => sum + s.hutang, 0);
  const criticalStockList = products.filter(p => p.stok < p.safety && p.status === 'Aktif');
  const monitorStokKritis = criticalStockList.length;
  const monitorAsetStok = products.reduce((sum, p) => sum + (p.stok * p.hpp), 0);

  const triggerGeneratePo = (p: any) => {
    setPoForm({
      id: '',
      supplier: p.supplier || suppliers[0]?.nama || '',
      tanggal: new Date().toISOString().split('T')[0],
      metode: 'Kredit 30 Hari',
      items: [{ sku: p.sku, qty: Math.max(10, p.safety * 2 - p.stok), harga: p.hpp, subtotal: Math.max(10, p.safety * 2 - p.stok) * p.hpp }],
      pajak: false,
      catatan: `Reorder stok kritis otomatis untuk SKU: ${p.sku}`
    });
    setIsEditingPo(false);
    setShowPoForm(true);
    setActiveTab('purchase_order');
    triggerToast(`Form PO Baru diisi otomatis untuk SKU ${p.sku}! Silakan periksa dan rilis PO.`, 'success');
  };

  const handleAddManualCash = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCashForm.nominal <= 0) {
      triggerToast('Nominal harus lebih besar dari 0!', 'error');
      return;
    }
    if (!manualCashForm.keterangan.trim()) {
      triggerToast('Keterangan tidak boleh kosong!', 'error');
      return;
    }

    const isKredit = manualCashForm.tipe === 'KELUAR';
    const deb = isKredit ? 0 : manualCashForm.nominal;
    const kre = isKredit ? manualCashForm.nominal : 0;

    setCashLedger(prev => {
      const lastBal = prev.length > 0 ? prev[prev.length - 1].saldo : 25000000;
      const newBal = isKredit ? lastBal - manualCashForm.nominal : lastBal + manualCashForm.nominal;
      return [...prev, {
        id: `CSH-${manualCashForm.tanggal.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        tanggal: manualCashForm.tanggal,
        ref: `MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
        keterangan: manualCashForm.keterangan,
        kategori: manualCashForm.kategori,
        debit: deb,
        kredit: kre,
        saldo: newBal
      }];
    });

    setShowManualCashModal(false);
    setManualCashForm({
      tanggal: new Date().toISOString().split('T')[0],
      keterangan: '',
      kategori: 'Operasional Lain',
      tipe: 'KELUAR',
      nominal: 0
    });
    triggerToast('Mutasi kas manual berhasil dicatat!', 'success');
  };

  const isSoOverdue = (so: any) => {
    if (so.statusBayar === 'Lunas') return false;
    if (so.metode === 'Tunai') return false;
    const txDate = new Date(so.tanggal);
    const dueDate = new Date(txDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date('2026-06-24');
    return today > dueDate;
  };

  const isPoOverdue = (po: any) => {
    if (po.statusBayar === 'Lunas') return false;
    if (po.metode === 'Tunai') return false;
    const txDate = new Date(po.tanggal);
    const dueDate = new Date(txDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date('2026-06-24');
    return today > dueDate;
  };

  const getMonthlyPandL = () => {
    const months = ['2026-05', '2026-06'];
    return months.map(m => {
      const monthlySales = salesOrders.filter(so => so.tanggal.startsWith(m) && so.statusLogistik !== 'Void');
      const omzet = monthlySales.reduce((sum, so) => sum + so.subtotal, 0);
      
      const hpp = monthlySales.reduce((sum, so) => {
        return sum + so.items.reduce((itemSum: number, item: any) => {
          const prod = products.find(p => p.sku === item.sku);
          const itemHpp = prod ? prod.hpp : 12000;
          return itemSum + (item.qty * itemHpp);
        }, 0);
      }, 0);

      const monthlyOpex = cashLedger.filter(c => c.tanggal.startsWith(m) && c.kategori !== 'Pembelian' && c.kategori !== 'Modal' && c.kredit > 0);
      const opex = monthlyOpex.reduce((sum, c) => sum + c.kredit, 0);

      const monthNames: Record<string, string> = { '2026-05': 'Mei 2026', '2026-06': 'Juni 2026' };
      const label = monthNames[m] || m;

      return {
        label,
        'Omzet (Revenue)': omzet,
        'HPP (COGS)': hpp,
        'Opex (Operasional)': opex,
        'Laba Kotor': omzet - hpp,
        'Laba Bersih': omzet - hpp - opex
      };
    });
  };

  const getOpexBreakdown = () => {
    const filtered = cashLedger.filter(c => 
      c.tanggal >= analitikStartDate && 
      c.tanggal <= analitikEndDate && 
      c.kategori !== 'Pembelian' && 
      c.kategori !== 'Modal' && 
      c.kredit > 0
    );
    const grouped: Record<string, number> = {};
    filtered.forEach(c => {
      grouped[c.kategori] = (grouped[c.kategori] || 0) + c.kredit;
    });
    return Object.entries(grouped).map(([kategori, total]) => ({
      name: kategori,
      value: total
    }));
  };

  const getTop10VolumeSKUs = () => {
    const inRangeSo = salesOrders.filter(so => 
      so.tanggal >= analitikStartDate && 
      so.tanggal <= analitikEndDate && 
      so.statusLogistik !== 'Void'
    );
    const counts: Record<string, { sku: string; nama: string; qty: number }> = {};
    inRangeSo.forEach(so => {
      so.items.forEach((item: any) => {
        if (!counts[item.sku]) {
          counts[item.sku] = { sku: item.sku, nama: item.nama || '', qty: 0 };
        }
        counts[item.sku].qty += item.qty;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);
  };

  const getTop10ProfitSKUs = () => {
    const inRangeSo = salesOrders.filter(so => 
      so.tanggal >= analitikStartDate && 
      so.tanggal <= analitikEndDate && 
      so.statusLogistik !== 'Void'
    );
    const profits: Record<string, { sku: string; nama: string; profit: number }> = {};
    inRangeSo.forEach(so => {
      so.items.forEach((item: any) => {
        const p = products.find(prod => prod.sku === item.sku);
        const hpp = p ? p.hpp : 0;
        const profitVal = item.qty * (item.harga - hpp);
        if (!profits[item.sku]) {
          profits[item.sku] = { sku: item.sku, nama: item.nama || '', profit: 0 };
        }
        profits[item.sku].profit += profitVal;
      });
    });
    return Object.values(profits)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);
  };

  const getTopCustomersByProfit = () => {
    const inRangeSo = salesOrders.filter(so => 
      so.tanggal >= analitikStartDate && 
      so.tanggal <= analitikEndDate && 
      so.statusLogistik !== 'Void'
    );
    const customerProfits: Record<string, { id: string; nama: string; profit: number; revenue: number }> = {};
    inRangeSo.forEach(so => {
      const custName = so.pelanggan;
      let profitVal = 0;
      so.items.forEach((item: any) => {
        const p = products.find(prod => prod.sku === item.sku);
        const hpp = p ? p.hpp : 0;
        profitVal += item.qty * (item.harga - hpp);
      });
      if (!customerProfits[custName]) {
        customerProfits[custName] = { id: custName, nama: custName, profit: 0, revenue: 0 };
      }
      customerProfits[custName].profit += profitVal;
      customerProfits[custName].revenue += so.grandTotal;
    });
    return Object.values(customerProfits)
      .sort((a, b) => b.profit - a.profit);
  };

  const getSalesVsPurchaseTrend = () => {
    const datesSet = new Set<string>();
    
    const validSos = salesOrders.filter(so => 
      so.tanggal >= analitikStartDate && 
      so.tanggal <= analitikEndDate && 
      so.statusLogistik !== 'Void'
    );
    const validPos = purchaseOrders.filter(po => 
      po.tanggal >= analitikStartDate && 
      po.tanggal <= analitikEndDate && 
      po.statusLogistik !== 'Void'
    );
    
    validSos.forEach(so => datesSet.add(so.tanggal));
    validPos.forEach(po => datesSet.add(po.tanggal));
    
    const sortedDates = Array.from(datesSet).sort();
    
    return sortedDates.map(tanggal => {
      const soToday = validSos.filter(so => so.tanggal === tanggal);
      const poToday = validPos.filter(po => po.tanggal === tanggal);
      
      const sales = soToday.reduce((sum, so) => sum + so.grandTotal, 0);
      const purchases = poToday.reduce((sum, po) => sum + po.grandTotal, 0);
      
      return {
        tanggal,
        'Penjualan (SO)': sales,
        'Pembelian (PO)': purchases
      };
    });
  };

  const getCustomerSalesTimeline = (customerName: string) => {
    if (!customerName) return [];
    const custSos = salesOrders.filter(so => 
      so.pelanggan === customerName && 
      so.tanggal >= analitikStartDate && 
      so.tanggal <= analitikEndDate && 
      so.statusLogistik !== 'Void'
    );
    
    const daily: Record<string, { tanggal: string; revenue: number; profit: number; qty: number }> = {};
    custSos.forEach(so => {
      if (!daily[so.tanggal]) {
        daily[so.tanggal] = { tanggal: so.tanggal, revenue: 0, profit: 0, qty: 0 };
      }
      daily[so.tanggal].revenue += so.grandTotal;
      
      let pVal = 0;
      so.items.forEach((item: any) => {
        const prod = products.find(p => p.sku === item.sku);
        const hpp = prod ? prod.hpp : 0;
        pVal += item.qty * (item.harga - hpp);
        daily[so.tanggal].qty += item.qty;
      });
      daily[so.tanggal].profit += pVal;
    });
    
    return Object.values(daily).sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  };

  const getDeadStockList = () => {
    const logs = deriveAllInventoryLogs();
    const limitDate = new Date('2026-05-25');
    return products.filter(p => {
      const hasRecentOut = logs.some(log => 
        log.sku === p.sku && 
        log.tipe === 'OUT' && 
        new Date(log.tanggal) >= limitDate
      );
      return !hasRecentOut;
    });
  };

  const getWastageRate = () => {
    const rangeOpnameMinus = opnameLog
      .filter(log => 
        log.tanggal >= analitikStartDate && 
        log.tanggal <= analitikEndDate && 
        (log.tipe === 'OPNAME_MINUS' || log.selisih < 0)
      )
      .reduce((sum, log) => sum + Math.abs(log.subtotal), 0);

    const rangeSalesHpp = salesOrders
      .filter(so => 
        so.tanggal >= analitikStartDate && 
        so.tanggal <= analitikEndDate && 
        so.statusLogistik !== 'Void'
      )
      .reduce((sum, so) => {
        return sum + so.items.reduce((itemSum: number, item: any) => {
          const p = products.find(prod => prod.sku === item.sku);
          const hpp = p ? p.hpp : 12000;
          return itemSum + (item.qty * hpp);
        }, 0);
      }, 0);

    if (rangeSalesHpp === 0) return 0;
    return (rangeOpnameMinus / rangeSalesHpp) * 100;
  };

  const getSkuSalesTimeline = (sku: string) => {
    if (!sku) return [];
    const inRangeSo = salesOrders.filter(so => 
      so.tanggal >= analitikStartDate && 
      so.tanggal <= analitikEndDate && 
      so.statusLogistik !== 'Void'
    );
    const grouped: Record<string, { tanggal: string; qty: number; revenue: number }> = {};
    inRangeSo.forEach(so => {
      const matchItem = so.items.find((item: any) => item.sku === sku);
      if (matchItem) {
        if (!grouped[so.tanggal]) {
          grouped[so.tanggal] = { tanggal: so.tanggal, qty: 0, revenue: 0 };
        }
        grouped[so.tanggal].qty += matchItem.qty;
        grouped[so.tanggal].revenue += matchItem.qty * matchItem.harga;
      }
    });
    return Object.values(grouped).sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());
  };

  // ==========================================
  // PRODUCT LOGIC
  // ==========================================
  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productForm.nama) return triggerToast('Nama produk wajib diisi!', 'error');

    // ponytail: Tambahkan kategori, sub-kategori, satuan, & tempat simpan baru ke master setting otomatis jika belum ada
    const cat = productForm.kategori?.trim();
    if (cat && !settingCategories.some(c => c.toLowerCase() === cat.toLowerCase())) {
      setSettingCategories(prev => [...prev, cat]);
    }
    const sub = productForm.subKat?.trim();
    if (sub && !settingSubCategories.some(s => s.toLowerCase() === sub.toLowerCase())) {
      setSettingSubCategories(prev => [...prev, sub]);
    }
    const unit = productForm.satuan?.trim();
    if (unit && !settingUnits.some(u => u.toLowerCase() === unit.toLowerCase())) {
      setSettingUnits(prev => [...prev, unit]);
    }
    const loc = productForm.tempatSimpan?.trim();
    if (loc && !settingStorageLocations.some(l => l.toLowerCase() === loc.toLowerCase())) {
      setSettingStorageLocations(prev => [...prev, loc]);
    }

    if (isEditingProduct) {
      setProducts(products.map(p => p.sku === productForm.sku ? productForm : p));
      triggerToast(`Produk [${productForm.sku}] berhasil diupdate.`);
    } else {
      // Find matching prefix label, or fallback to first 3 letters uppercase of category
      const matchedPrefixObj = settingPrefixes.find(pfx => 
        pfx.label.toLowerCase().includes(productForm.kategori.toLowerCase()) || 
        productForm.kategori.toLowerCase().includes(pfx.prefix.toLowerCase())
      );
      const prefix = matchedPrefixObj ? matchedPrefixObj.prefix : (productForm.kategori?.substring(0, 3).toUpperCase() || 'PROD');
      
      const count = products.filter(p => p.kategori === productForm.kategori).length + 1;
      const sku = `${prefix}-${String(count).padStart(4, '0')}`;
      const newProduct = { ...productForm, sku };
      setProducts([...products, newProduct]);
      triggerToast(`Produk [${sku}] berhasil didaftarkan.`);
    }
    setShowProductModal(false);
    setIsEditingProduct(false);
  };

  const handleCreateCompany = (options: { nama: string; alamat: string; telp: string; kota: string; tipeTemplate: string }) => {
    const namaCompany = options.nama.trim() || 'Perusahaan Baru';
    const alamatCompany = options.alamat.trim() || 'Jl. Operasional No. 1';
    const telpCompany = options.telp.trim() || '081234567890';
    const kotaCompany = options.kota.trim() || 'Jakarta';

    setNamaToko(namaCompany);
    setAlamatToko(alamatCompany);
    setTelpToko(telpCompany);
    setKotaToko(kotaCompany);

    if (options.tipeTemplate === 'empty') {
      setProducts([]);
      setCustomers([
        { id: 'CUST-001', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
      ]);
      setSuppliers([]);
      setPurchaseOrders([]);
      setSalesOrders([]);
      setOpnameLog([]);
      setCashLedger([
        { id: 'CSH-20260601-001', tanggal: '2026-06-01', ref: 'MODAL-001', keterangan: 'Setoran Modal Kerja Awal', kategori: 'Modal', debit: 10000000, kredit: 0, saldo: 10000000 }
      ]);
      setConsignments([]);
      setBoms([]);
      setRiwayatProduksi([]);
      setStokPrices({});
      setTipeBisnis('Retail');
    } else if (options.tipeTemplate === 'bakery') {
      setProducts(INITIAL_PRODUCTS);
      setCustomers(INITIAL_CUSTOMERS);
      setSuppliers(INITIAL_SUPPLIERS);
      setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
      setSalesOrders(INITIAL_SALES_ORDERS);
      setOpnameLog(INITIAL_OPNAME_LOG);
      setCashLedger(INITIAL_CASH_LEDGER);
      setConsignments(INITIAL_CONSIGNMENT);
      setBoms(INITIAL_BOMS);
      setRiwayatProduksi(INITIAL_RIWAYAT_PRODUKSI);
      setStokPrices({});
      setTipeBisnis('Manufaktur');
    } else if (options.tipeTemplate === 'retail') {
      const RETAIL_PRODUCTS = [
        { sku: 'RTL-0001', kategori: 'Barang Jadi', subKat: 'Makanan', nama: 'Kopi Arabika Gayo 250g', satuan: 'Pack', hj: 45000, hpp: 28000, safety: 10, stok: 35, status: 'Aktif', supplier: 'PT. Kopi Gayo', tempatSimpan: 'Etalase Depan', masaSmp: '1 Tahun', catatan: 'Kopi single origin' },
        { sku: 'RTL-0002', kategori: 'Barang Jadi', subKat: 'Minuman', nama: 'Susu UHT Full Cream 1L', satuan: 'Pcs', hj: 19500, hpp: 14000, safety: 24, stok: 120, status: 'Aktif', supplier: 'Distributor Sembako', tempatSimpan: 'Gudang Dingin', masaSmp: '9 Bulan', catatan: 'Simpan di chiller setelah dibuka' },
        { sku: 'RTL-0003', kategori: 'Barang Jadi', subKat: 'Snack', nama: 'Keripik Singkong Balado', satuan: 'Pcs', hj: 12000, hpp: 6500, safety: 50, stok: 200, status: 'Aktif', supplier: 'Distributor Sembako', tempatSimpan: 'Etalase Depan', masaSmp: '6 Bulan', catatan: 'Garing & gurih' }
      ];
      const RETAIL_CUSTOMERS = [
        { id: 'CUST-001', nama: 'Kedai Kopi Kawan', kontak: 'Andi', email: 'kawankopi@gmail.com', telp: '08122334455', alamat: 'Jl. Merdeka No. 5', piutang: 500000 },
        { id: 'CUST-002', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
      ];
      const RETAIL_SUPPLIERS = [
        { id: 'SUP-001', nama: 'PT. Kopi Gayo', kontak: 'Gayo Sales', email: 'sales@gayo.com', telp: '08133445566', alamat: 'Takengon, Aceh', hutang: 1000000 },
        { id: 'SUP-002', nama: 'Distributor Sembako', kontak: 'Hendra', email: 'hendra@sembako.com', telp: '08122233344', alamat: 'Jl. Pasar Baru No. 10', hutang: 1500000 }
      ];
      setProducts(RETAIL_PRODUCTS);
      setCustomers(RETAIL_CUSTOMERS);
      setSuppliers(RETAIL_SUPPLIERS);
      setPurchaseOrders([]);
      setSalesOrders([]);
      setOpnameLog([]);
      setCashLedger([{ id: 'CSH-20260601-001', tanggal: '2026-06-01', ref: 'MODAL-001', keterangan: 'Setoran Modal Kerja Retail', kategori: 'Modal', debit: 15000000, kredit: 0, saldo: 15000000 }]);
      setConsignments([]);
      setBoms([]);
      setRiwayatProduksi([]);
      setStokPrices({});
      setTipeBisnis('Retail');
    } else if (options.tipeTemplate === 'consignment') {
      const CSG_PRODUCTS = [
        { sku: 'CON-0001', kategori: 'Barang Jadi', subKat: 'Roti & Kue', nama: 'Donut Glaze Premium (Konsinyasi)', satuan: 'Pcs', hj: 12000, hpp: 9000, safety: 50, stok: 45, status: 'Aktif', supplier: 'PT. Donut Indonesia', tempatSimpan: 'Etalase Depan', masaSmp: '2 Hari', catatan: 'Titipan donat segar' },
        { sku: 'RTL-0001', kategori: 'Barang Jadi', subKat: 'Lainnya', nama: 'Tas Kraft Paper Bag Premium', satuan: 'Pcs', hj: 3000, hpp: 1500, safety: 100, stok: 500, status: 'Aktif', supplier: 'Distributor Paper', tempatSimpan: 'Gudang Utama', masaSmp: 'Selamanya', catatan: 'Kantong belanja ramah lingkungan' }
      ];
      const CSG_CONSIGNMENTS = [
        { id: 'CSG-20260601-001', consignor: 'PT. Donut Indonesia', tanggal: '2026-06-01', sku: 'CON-0001', nama: 'Donut Glaze Premium (Konsinyasi)', qtyReceived: 100, qtySold: 55, qtyReturned: 0, harga: 12000, komisiPct: 25, status: 'Aktif', catatan: 'Barang titipan donat premium' }
      ];
      setProducts(CSG_PRODUCTS);
      setCustomers([
        { id: 'CUST-001', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
      ]);
      setSuppliers([
        { id: 'SUP-001', nama: 'PT. Donut Indonesia', kontak: 'Rian', email: 'rian@donut.co.id', telp: '0812998877', alamat: 'Kawasan Industri', hutang: 0 }
      ]);
      setPurchaseOrders([]);
      setSalesOrders([]);
      setOpnameLog([]);
      setCashLedger([{ id: 'CSH-20260601-001', tanggal: '2026-06-01', ref: 'MODAL-001', keterangan: 'Setoran Modal Awal Toko Konsinyasi', kategori: 'Modal', debit: 20000000, kredit: 0, saldo: 20000000 }]);
      setConsignments(CSG_CONSIGNMENTS);
      setBoms([]);
      setRiwayatProduksi([]);
      setStokPrices({});
      setTipeBisnis('Konsinyasi');
    }

    triggerToast(`Perusahaan "${namaCompany}" berhasil dibuat dengan template ${options.tipeTemplate}!`, 'success');
    setShowCreateCompanyModal(false);
  };

  const handleDeleteProduct = (sku: string) => {
    const product = products.find(p => p.sku === sku);
    if (!product) return;
    if (product.stok > 0) {
      return triggerToast(`Hapus ditolak! Produk masih memiliki sisa stok sebanyak ${product.stok} ${product.satuan}.`, 'error');
    }
    if (window.confirm(`Hapus produk [${sku}] - ${product.nama} secara permanen?`)) {
      setProducts(products.filter(p => p.sku !== sku));
      triggerToast(`Produk [${sku}] terhapus.`);
    }
  };

  // ==========================================
  // CUSTOMER / SUPPLIER LOGIC
  // ==========================================
  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.nama) return triggerToast('Nama wajib diisi!', 'error');
    if (isEditingCustomer) {
      setCustomers(customers.map(c => c.id === customerForm.id ? customerForm : c));
      triggerToast('Customer terupdate.');
    } else {
      const id = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
      setCustomers([...customers, { ...customerForm, id }]);
      triggerToast('Customer terdaftar.');
    }
    setShowCustomerModal(false);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.nama) return triggerToast('Nama wajib diisi!', 'error');
    if (isEditingSupplier) {
      setSuppliers(suppliers.map(s => s.id === supplierForm.id ? supplierForm : s));
      triggerToast('Supplier terupdate.');
    } else {
      const id = `SUP-${String(suppliers.length + 1).padStart(3, '0')}`;
      setSuppliers([...suppliers, { ...supplierForm, id }]);
      triggerToast('Supplier terdaftar.');
    }
    setShowSupplierModal(false);
  };

  // ==========================================
  // LEDGER SPREADSHEET & TRANSACTION DETAILS HELPERS
  // ==========================================
  const deriveProductLedgerRows = (sku: string) => {
    const entries: any[] = [];
    const p = products.find(prod => prod.sku === sku);
    if (!p) return [];

    // 1. PO Receipts
    purchaseOrders.forEach(po => {
      if (po.statusLogistik === 'Diterima' || po.statusLogistik === 'Diterima Sebagian') {
        const matchItem = po.items.find((item: any) => item.sku === sku);
        if (matchItem) {
          const qtyRec = matchItem.qtyReceived ?? (po.statusLogistik === 'Diterima' ? matchItem.qty : 0);
          if (qtyRec > 0) {
            entries.push({
              tanggal: po.tanggal,
              keterangan: `Penerimaan PO [${po.id}]`,
              masuk: qtyRec,
              keluar: 0,
              harga: matchItem.harga,
              subtotal: qtyRec * matchItem.harga,
              status: po.statusLogistik
            });
          }
        }
      }
      // PO Returns
      if (po.returItems) {
        po.returItems.forEach((ret: any) => {
          if (ret.sku === sku) {
            entries.push({
              tanggal: ret.tanggal,
              keterangan: `Retur Supplier [${po.id}]`,
              masuk: 0,
              keluar: ret.qty,
              harga: p.hpp,
              subtotal: ret.qty * p.hpp,
              status: 'Retur PO'
            });
          }
        });
      }
    });

    // 2. SO Shipments
    salesOrders.forEach(so => {
      if (so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai') {
        const matchItem = so.items.find((item: any) => item.sku === sku);
        if (matchItem) {
          const qtyShip = matchItem.qtyShipped ?? (so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai' ? matchItem.qty : 0);
          if (qtyShip > 0) {
            entries.push({
              tanggal: so.tanggal,
              keterangan: `Pengiriman SO [${so.id}]`,
              masuk: 0,
              keluar: qtyShip,
              harga: matchItem.harga,
              subtotal: qtyShip * matchItem.harga,
              status: so.statusLogistik
            });
          }
        }
      }
      // SO Returns
      if (so.returItems) {
        so.returItems.forEach((ret: any) => {
          if (ret.sku === sku) {
            entries.push({
              tanggal: ret.tanggal,
              keterangan: `Retur Pelanggan [${so.id}]`,
              masuk: ret.qty,
              keluar: 0,
              harga: p.hj || p.hpp,
              subtotal: ret.qty * (p.hj || p.hpp),
              status: 'Retur SO'
            });
          }
        });
      }
    });

    // 3. Opname Logs
    opnameLog.forEach(log => {
      if (log.sku === sku) {
        entries.push({
          tanggal: log.tanggal,
          keterangan: `Opname: ${log.catatan}`,
          masuk: log.selisih > 0 ? log.selisih : 0,
          keluar: log.selisih < 0 ? Math.abs(log.selisih) : 0,
          harga: log.HPP,
          subtotal: Math.abs(log.subtotal),
          status: 'Opname'
        });
      }
    });

    // Sort by date ascending
    entries.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    // Build grid rows
    const gridRows: string[][] = [];
    let runningBalance = 0;

    entries.forEach(entry => {
      runningBalance += (entry.masuk - entry.keluar);
      gridRows.push([
        entry.tanggal,
        entry.keterangan,
        entry.masuk > 0 ? entry.masuk.toString() : '-',
        entry.keluar > 0 ? entry.keluar.toString() : '-',
        runningBalance.toString(),
        `Rp ${entry.harga.toLocaleString('id-ID')}`,
        `Rp ${entry.subtotal.toLocaleString('id-ID')}`,
        entry.status
      ]);
    });

    return gridRows;
  };

  const deriveCustomerLedgerRows = (custId: string) => {
    const entries: any[] = [];
    const cust = customers.find(c => c.id === custId);
    if (!cust) return [];

    // Match SOs
    salesOrders.forEach(so => {
      if (so.pelanggan === cust.nama) {
        // 1. SO Creation (Invoice / Piutang Masuk)
        if (so.statusLogistik !== 'Void' && so.statusLogistik !== 'Draft') {
          entries.push({
            tanggal: so.tanggal,
            ref: so.id,
            debit: so.grandTotal, // customer is invoiced (receivables increases)
            kredit: 0,
            status: so.statusBayar,
            keterangan: `Sales Order Baru [${so.id}]`
          });
        }

        // 2. Payments (Cash Received)
        if (so.totalPaid && so.totalPaid > 0) {
          entries.push({
            tanggal: so.tanggal,
            ref: so.id,
            debit: 0,
            kredit: so.totalPaid, // customer paid (receivables decreases)
            status: so.statusBayar,
            keterangan: `Setoran Pelunasan [${so.id}]`
          });
        }
      }
    });

    // Sort by date ascending
    entries.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const gridRows: string[][] = [];
    let runningReceivables = 0;

    entries.forEach(entry => {
      runningReceivables += (entry.debit - entry.kredit);
      gridRows.push([
        entry.tanggal,
        entry.ref,
        entry.debit > 0 ? `Rp ${entry.debit.toLocaleString('id-ID')}` : '-',
        entry.kredit > 0 ? `Rp ${entry.kredit.toLocaleString('id-ID')}` : '-',
        `Rp ${runningReceivables.toLocaleString('id-ID')}`,
        entry.status,
        entry.debit > 0 ? 'Tempo/Piutang' : 'Penerimaan Kas',
        entry.keterangan
      ]);
    });

    return gridRows;
  };

  const deriveSupplierLedgerRows = (supId: string) => {
    const entries: any[] = [];
    const sup = suppliers.find(s => s.id === supId);
    if (!sup) return [];

    // Match POs
    purchaseOrders.forEach(po => {
      if (po.supplier === sup.nama) {
        // 1. PO Creation (Bill / Hutang Masuk)
        if (po.statusLogistik !== 'Void' && po.statusLogistik !== 'Draft') {
          entries.push({
            tanggal: po.tanggal,
            ref: po.id,
            debit: 0,
            kredit: po.grandTotal, // supplier bills us (payables increases)
            status: po.statusBayar,
            keterangan: `Purchase Order Baru [${po.id}]`
          });
        }

        // 2. Payments (Cash Paid)
        if (po.totalPaid && po.totalPaid > 0) {
          entries.push({
            tanggal: po.tanggal,
            ref: po.id,
            debit: po.totalPaid, // we pay supplier (payables decreases)
            kredit: 0,
            status: po.statusBayar,
            keterangan: `Pembayaran Kasir [${po.id}]`
          });
        }
      }
    });

    // Sort by date ascending
    entries.sort((a, b) => new Date(a.tanggal).getTime() - new Date(b.tanggal).getTime());

    const gridRows: string[][] = [];
    let runningPayables = 0;

    entries.forEach(entry => {
      runningPayables += (entry.kredit - entry.debit); // payables increase on credit, decrease on debit
      gridRows.push([
        entry.tanggal,
        entry.ref,
        entry.debit > 0 ? `Rp ${entry.debit.toLocaleString('id-ID')}` : '-',
        entry.kredit > 0 ? `Rp ${entry.kredit.toLocaleString('id-ID')}` : '-',
        `Rp ${runningPayables.toLocaleString('id-ID')}`,
        entry.status,
        entry.debit > 0 ? 'Pengeluaran Kas' : 'Hutang Dagang',
        entry.keterangan
      ]);
    });

    return gridRows;
  };

  const deriveAllInventoryLogs = () => {
    const logs: any[] = [];
    
    products.forEach(p => {
      // PO Receipts
      purchaseOrders.forEach(po => {
        if (po.statusLogistik === 'Diterima' || po.statusLogistik === 'Diterima Sebagian') {
          const matchItem = po.items.find((item: any) => item.sku === p.sku);
          if (matchItem) {
            const qtyRec = matchItem.qtyReceived ?? (po.statusLogistik === 'Diterima' ? matchItem.qty : 0);
            if (qtyRec > 0) {
              logs.push({
                tanggal: po.tanggal,
                sku: p.sku,
                nama: p.nama,
                keterangan: `Penerimaan PO [${po.id}]`,
                tipe: 'IN',
                qty: qtyRec,
                harga: matchItem.harga,
                subtotal: qtyRec * matchItem.harga,
                operator: 'Gudang'
              });
            }
          }
        }
        if (po.returItems) {
          po.returItems.forEach((ret: any) => {
            if (ret.sku === p.sku) {
              logs.push({
                tanggal: ret.tanggal,
                sku: p.sku,
                nama: p.nama,
                keterangan: `Retur Supplier [${po.id}]`,
                tipe: 'OUT',
                qty: ret.qty,
                harga: p.hpp,
                subtotal: ret.qty * p.hpp,
                operator: 'Gudang'
              });
            }
          });
        }
      });

      // SO Shipments
      salesOrders.forEach(so => {
        if (so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai') {
          const matchItem = so.items.find((item: any) => item.sku === p.sku);
          if (matchItem) {
            const qtyShip = matchItem.qtyShipped ?? (so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai' ? matchItem.qty : 0);
            if (qtyShip > 0) {
              logs.push({
                tanggal: so.tanggal,
                sku: p.sku,
                nama: p.nama,
                keterangan: `Pengiriman SO [${so.id}]`,
                tipe: 'OUT',
                qty: qtyShip,
                harga: matchItem.harga,
                subtotal: qtyShip * matchItem.harga,
                operator: 'Ekspedisi'
              });
            }
          }
        }
        if (so.returItems) {
          so.returItems.forEach((ret: any) => {
            if (ret.sku === p.sku) {
              logs.push({
                tanggal: ret.tanggal,
                sku: p.sku,
                nama: p.nama,
                keterangan: `Retur Pelanggan [${so.id}]`,
                tipe: 'IN',
                qty: ret.qty,
                harga: p.hj || p.hpp,
                subtotal: ret.qty * (p.hj || p.hpp),
                operator: 'CS'
              });
            }
          });
        }
      });

      // Opname Logs
      opnameLog.forEach(log => {
        if (log.sku === p.sku) {
          logs.push({
            tanggal: log.tanggal,
            sku: p.sku,
            nama: p.nama,
            keterangan: `Opname: ${log.catatan}`,
            tipe: log.selisih > 0 ? 'IN' : 'OUT',
            qty: Math.abs(log.selisih),
            harga: log.HPP,
            subtotal: Math.abs(log.subtotal),
            operator: log.operator || 'Sistem'
          });
        }
      });
    });

    return logs.sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
  };

  const getOrInitProductLedger = (sku: string, forceReset = false) => {
    if (productLedgerCells[sku] && !forceReset) {
      return productLedgerCells[sku];
    }
    const headers = ['Tanggal', 'Deskripsi / No. Ref', 'Masuk (Qty)', 'Keluar (Qty)', 'Saldo Akhir', 'HPP/Harga', 'Subtotal', 'Status / Catatan'];
    const derived = deriveProductLedgerRows(sku);
    const rows: string[][] = [headers];
    derived.forEach(r => rows.push(r));
    while (rows.length < 25) {
      rows.push(['', '', '', '', '', '', '', '']);
    }
    productLedgerCells[sku] = rows;
    return rows;
  };

  const getOrInitCustomerLedger = (custId: string, forceReset = false) => {
    if (customerLedgerCells[custId] && !forceReset) {
      return customerLedgerCells[custId];
    }
    const headers = ['Tanggal', 'No. Invoice / Transaksi', 'Nilai Penjualan (Debit)', 'Jumlah Pembayaran (Kredit)', 'Saldo Piutang', 'Status Pelunasan', 'Metode & Ref', 'Catatan'];
    const derived = deriveCustomerLedgerRows(custId);
    const rows: string[][] = [headers];
    derived.forEach(r => rows.push(r));
    while (rows.length < 25) {
      rows.push(['', '', '', '', '', '', '', '']);
    }
    customerLedgerCells[custId] = rows;
    return rows;
  };

  const getOrInitSupplierLedger = (supId: string, forceReset = false) => {
    if (supplierLedgerCells[supId] && !forceReset) {
      return supplierLedgerCells[supId];
    }
    const headers = ['Tanggal', 'No. Tagihan / Transaksi', 'Nilai Pembelian (Kredit)', 'Jumlah Pembayaran (Debit)', 'Saldo Hutang', 'Status Pelunasan', 'Metode & Ref', 'Catatan'];
    const derived = deriveSupplierLedgerRows(supId);
    const rows: string[][] = [headers];
    derived.forEach(r => rows.push(r));
    while (rows.length < 25) {
      rows.push(['', '', '', '', '', '', '', '']);
    }
    supplierLedgerCells[supId] = rows;
    return rows;
  };

  const handleProductCellChange = (sku: string, r: number, c: number, value: string) => {
    const currentGrid = [...getOrInitProductLedger(sku)];
    currentGrid[r] = [...currentGrid[r]];
    currentGrid[r][c] = value;
    setProductLedgerCells(prev => ({
      ...prev,
      [sku]: currentGrid
    }));
  };

  const handleCustomerCellChange = (custId: string, r: number, c: number, value: string) => {
    const currentGrid = [...getOrInitCustomerLedger(custId)];
    currentGrid[r] = [...currentGrid[r]];
    currentGrid[r][c] = value;
    setCustomerLedgerCells(prev => ({
      ...prev,
      [custId]: currentGrid
    }));
  };

  const handleSupplierCellChange = (supId: string, r: number, c: number, value: string) => {
    const currentGrid = [...getOrInitSupplierLedger(supId)];
    currentGrid[r] = [...currentGrid[r]];
    currentGrid[r][c] = value;
    setSupplierLedgerCells(prev => ({
      ...prev,
      [supId]: currentGrid
    }));
  };

  // ==========================================
  // PURCHASE ORDER (PO) LOGIC
  // ==========================================
  const handleAddPoItem = () => {
    setPoForm({
      ...poForm,
      items: [...poForm.items, { sku: '', qty: 1, harga: 0, subtotal: 0 }]
    });
  };

  const handleRemovePoItem = (index: number) => {
    if (poForm.items.length === 1) return;
    setPoForm({
      ...poForm,
      items: poForm.items.filter((_, i) => i !== index)
    });
  };

  const handlePoItemChange = (index: number, sku: string, qty: number, harga: number) => {
    const updatedItems = [...poForm.items];
    const targetProduct = products.find(p => p.sku === sku);
    
    updatedItems[index] = {
      sku,
      nama: targetProduct ? targetProduct.nama : '',
      qty,
      satuan: targetProduct ? targetProduct.satuan : 'Pcs',
      harga: harga || (targetProduct ? targetProduct.hpp : 0),
      subtotal: qty * (harga || (targetProduct ? targetProduct.hpp : 0))
    };

    setPoForm({ ...poForm, items: updatedItems });
  };

  const handleSavePO = (isDraft: boolean) => {
    if (!poForm.supplier) return triggerToast('Pilih Supplier!', 'error');
    
    // Auto-create new supplier if it does not exist
    const rawSupplier = poForm.supplier.trim();
    let currentSuppliers = [...suppliers];
    const existingSupplier = currentSuppliers.find(s => s.nama.toLowerCase() === rawSupplier.toLowerCase());
    if (!existingSupplier) {
      const newSupId = `SUP-${String(suppliers.length + 1).padStart(3, '0')}`;
      const newSup = {
        id: newSupId,
        nama: rawSupplier,
        kontak: 'Auto-Created',
        email: 'auto@inoerp.com',
        telp: '-',
        alamat: 'Auto-Created via PO',
        hutang: 0
      };
      setSuppliers([...suppliers, newSup]);
      currentSuppliers.push(newSup);
      triggerToast(`Supplier baru [${rawSupplier}] otomatis ditambahkan ke database!`, 'success');
    }

    const validItems = poForm.items.filter(item => item.sku && item.qty > 0);
    if (validItems.length === 0) return triggerToast('Tambahkan minimal 1 item!', 'error');

    const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = poForm.pajak ? Math.round(subtotal * 0.12) : 0;
    const grandTotal = subtotal + tax;

    const finalId = isEditingPo ? poForm.id : `PO-20260624-${String(purchaseOrders.length + 1).padStart(3, '0')}`;

    const newPO = {
      id: finalId,
      tanggal: poForm.tanggal,
      supplier: poForm.supplier,
      metode: poForm.metode,
      items: validItems,
      subtotal,
      pajak: tax,
      grandTotal,
      statusLogistik: isDraft ? 'Draft' : 'Diterima',
      statusBayar: poForm.metode === 'Tunai' ? 'Lunas' : 'Belum Dibayar',
      catatan: poForm.catatan
    };

    // If Save and Release -> Update Stocks & Supplier Payables
    if (!isDraft && poForm.metode !== 'Tunai') {
      setSuppliers(suppliers.map(s => s.nama === poForm.supplier ? { ...s, hutang: s.hutang + grandTotal } : s));
    }

    if (!isDraft) {
      // Increase Stock
      setProducts(products.map(p => {
        const item = validItems.find(vi => vi.sku === p.sku);
        return item ? { ...p, stok: p.stok + item.qty } : p;
      }));
    }

    if (isEditingPo) {
      setPurchaseOrders(purchaseOrders.map(p => p.id === poForm.id ? newPO : p));
    } else {
      setPurchaseOrders([newPO, ...purchaseOrders]);
    }

    triggerToast(isDraft ? 'Draft PO berhasil disimpan.' : 'PO resmi berhasil dirilis!');
    setShowPoForm(false);
    setIsEditingPo(false);
  };

  const handleVoidPO = (id: string) => {
    if (window.confirm(`Yakin ingin membatalkan (Void) PO [${id}]?`)) {
      const po = purchaseOrders.find(p => p.id === id);
      if (po) {
        // Adjust stock back down if it was already received
        if (po.statusLogistik === 'Diterima') {
          setProducts(products.map(p => {
            const item = po.items.find((it: any) => it.sku === p.sku);
            return item ? { ...p, stok: Math.max(0, p.stok - item.qty) } : p;
          }));
        }
        // Adjust payables
        if (po.statusBayar === 'Belum Dibayar') {
          setSuppliers(suppliers.map(s => s.nama === po.supplier ? { ...s, hutang: Math.max(0, s.hutang - po.grandTotal) } : s));
        }

        setPurchaseOrders(purchaseOrders.map(p => p.id === id ? { ...p, statusLogistik: 'Void', statusBayar: 'Void' } : p));
        triggerToast(`PO [${id}] berhasil dibatalkan.`);
      }
    }
  };

  // ==========================================
  // SALES ORDER LOGIC
  // ==========================================
  const handleAddSoItem = () => {
    setSoForm({ ...soForm, items: [...soForm.items, { sku: '', qty: 1, harga: 0, subtotal: 0 }] });
  };

  const handleRemoveSoItem = (index: number) => {
    if (soForm.items.length === 1) return;
    setSoForm({ ...soForm, items: soForm.items.filter((_, i) => i !== index) });
  };

  const handleSoItemChange = (index: number, field: string, value: any) => {
    const updatedItems = [...soForm.items];
    const item = { ...updatedItems[index] };

    if (field === 'sku') {
      const prod = products.find(p => p.sku === value);
      item.sku = value;
      item.harga = prod ? prod.hj : 0;
      item.subtotal = item.qty * item.harga;
    } else if (field === 'qty') {
      item.qty = parseInt(value) || 0;
      item.subtotal = item.qty * item.harga;
    } else if (field === 'harga') {
      item.harga = parseFloat(value) || 0;
      item.subtotal = item.qty * item.harga;
    }

    updatedItems[index] = item;
    setSoForm({ ...soForm, items: updatedItems });
  };

  const handleSaveSalesOrder = (isDraftMode: boolean) => {
    if (!soForm.pelanggan) return triggerToast('Pilih pelanggan terlebih dahulu!', 'error');
    
    // Auto-create new customer if it does not exist
    const rawCustomer = soForm.pelanggan.trim();
    let currentCustomers = [...customers];
    const existingCustomer = currentCustomers.find(c => c.nama.toLowerCase() === rawCustomer.toLowerCase());
    if (!existingCustomer) {
      const newCustId = `CUST-${String(customers.length + 1).padStart(3, '0')}`;
      const newCust = {
        id: newCustId,
        nama: rawCustomer,
        kontak: 'Auto-Created',
        email: 'auto@inoerp.com',
        telp: '-',
        alamat: 'Auto-Created via SO',
        piutang: 0
      };
      setCustomers([...customers, newCust]);
      currentCustomers.push(newCust);
      triggerToast(`Pelanggan baru [${rawCustomer}] otomatis ditambahkan ke database!`, 'success');
    }

    const validItems = soForm.items.filter(item => item.sku && item.qty > 0);
    if (validItems.length === 0) return triggerToast('Isi minimal 1 baris barang belanja!', 'error');

    // Check stocks before processing SO
    let stockError = false;
    if (!isDraftMode) {
      validItems.forEach(item => {
        const prod = products.find(p => p.sku === item.sku);
        if (!prod || prod.stok < item.qty) {
          triggerToast(`Stok ${prod ? prod.nama : item.sku} kurang! Sisa stok: ${prod ? prod.stok : 0}`, 'error');
          stockError = true;
        }
      });
    }

    if (stockError) return;

    const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = soForm.pajak ? Math.round(subtotal * 0.12) : 0;
    const grandTotal = subtotal + tax;

    // Deduct Stock
    if (!isDraftMode) {
      setProducts(products.map(p => {
        const cartItem = validItems.find(item => item.sku === p.sku);
        return cartItem ? { ...p, stok: p.stok - cartItem.qty } : p;
      }));
    }

    const nextId = isEditingSo ? soForm.id : `SO-20260624-${String(salesOrders.length + 1).padStart(3, '0')}`;
    const newSO = {
      id: nextId,
      tanggal: soForm.tanggal,
      pelanggan: soForm.pelanggan,
      metode: soForm.metode,
      items: validItems,
      subtotal,
      pajak: tax,
      grandTotal,
      statusLogistik: isDraftMode ? 'Draft' : 'Selesai',
      statusBayar: soForm.metode === 'Tunai' ? 'Lunas' : 'Belum Lunas',
      kasir: 'Administrator',
      catatan: soForm.catatan || 'Sales Order'
    };

    if (isEditingSo) {
      setSalesOrders(salesOrders.map(so => so.id === soForm.id ? newSO : so));
      triggerToast(`Sales Order [${soForm.id}] berhasil diupdate.`);
    } else {
      setSalesOrders([newSO, ...salesOrders]);
      triggerToast(`Sales Order [${nextId}] berhasil dibuat & rilis!`);
    }

    // Update customer piutang
    if (soForm.metode !== 'Tunai' && !isDraftMode) {
      setCustomers(customers.map(c => c.nama === soForm.pelanggan ? { ...c, piutang: c.piutang + grandTotal } : c));
    }

    setShowSoForm(false);
    setIsEditingSo(false);
  };

  const handleVoidSO = (id: string) => {
    const so = salesOrders.find(s => s.id === id);
    if (!so) return;

    if (window.confirm(`Void Sales Order ${id}? Tindakan ini akan mengembalikan stok barang ke gudang.`)) {
      // Revert Stock
      const updatedProducts = products.map(p => {
        const orderItem = so.items.find((item: any) => item.sku === p.sku);
        if (orderItem && so.statusLogistik !== 'Void') {
          return { ...p, stok: p.stok + orderItem.qty };
        }
        return p;
      });
      setProducts(updatedProducts);

      // Decrement piutang if applicable
      if (so.statusBayar === 'Belum Lunas') {
        setCustomers(customers.map(c => c.nama === so.pelanggan ? { ...c, piutang: Math.max(0, c.piutang - so.grandTotal) } : c));
      }

      setSalesOrders(salesOrders.map(item => item.id === id ? { ...item, statusBayar: 'Void', statusLogistik: 'Void' } : item));
      triggerToast(`Struk ${id} berhasil di-Void! Stok dikembalikan.`);
    }
  };

  // ==========================================
  // STOCK OPNAME LOGIC
  // ==========================================
  const handleStockOpname = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameForm.sku) return triggerToast('Pilih SKU target terlebih dahulu', 'error');

    const prod = products.find(p => p.sku === opnameForm.sku);
    if (!prod) return;

    const inputQty = opnameForm.qtyFisik;
    let selisih = 0;
    let valueAdjustment = 0;

    if (opnameForm.tipe === 'WASTAGE') {
      if (inputQty > prod.stok) {
        triggerToast('Jumlah wastage dibuang melebihi stok gudang!', 'error');
        return;
      }
      selisih = -inputQty;
      valueAdjustment = -inputQty * prod.hpp;
    } else if (opnameForm.tipe === 'OPNAME_PLUS') {
      selisih = inputQty - prod.stok;
      valueAdjustment = selisih * prod.hpp;
    } else {
      // OPNAME_MINUS
      selisih = inputQty - prod.stok;
      valueAdjustment = selisih * prod.hpp;
    }

    const newLog = {
      tanggal: new Date().toISOString().split('T')[0],
      sku: prod.sku,
      nama: prod.nama,
      tipe: opnameForm.tipe,
      qtySistem: prod.stok,
      qtyFisik: opnameForm.tipe === 'WASTAGE' ? prod.stok - inputQty : inputQty,
      selisih,
      satuan: prod.satuan,
      HPP: prod.hpp,
      subtotal: valueAdjustment,
      catatan: opnameForm.catatan || 'Manual adjustment',
      operator: 'Administrator'
    };

    // Update physical stocks
    const finalStok = opnameForm.tipe === 'WASTAGE' ? prod.stok - inputQty : inputQty;
    setProducts(products.map(p => p.sku === prod.sku ? { ...p, stok: finalStok } : p));
    setOpnameLog([newLog, ...opnameLog]);

    triggerToast(`Opname SKU [${prod.sku}] berhasil dicatat & disesuaikan.`);
    setOpnameForm({ sku: '', tipe: 'OPNAME_PLUS', qtyFisik: 0, catatan: '' });
  };

  // Render login screen if login is active and user is not logged in
  if (isLoginActive && !isLoggedIn) {
    // ponytail: kalau SHEETS_API_URL diset, verifikasi password dilakukan di SERVER (backend cocokkan hash),
    // password mentah dikirim sekali lewat HTTPS lalu tidak pernah disimpan di frontend. Kalau tidak diset
    // (mode offline/lokal), fallback ke pengecekan lama di browser.
    const handleLoginSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      const inputUser = loginInputUser.trim();
      const inputPass = loginInputPass.trim();

      if (SHEETS_API_URL) {
        fetch(SHEETS_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action: 'login', username: inputUser, password: inputPass }),
        })
          .then(res => res.json())
          .then((res: { ok: boolean; nama?: string; error?: string }) => {
            if (res.ok) {
              setIsLoggedIn(true);
              triggerToast(`Login Berhasil! Selamat datang ${res.nama || inputUser}.`, 'success');
            } else {
              triggerToast(res.error || 'Username atau password salah.', 'error');
            }
          })
          .catch(() => triggerToast('Gagal menghubungi server. Cek koneksi internet.', 'error'));
        return;
      }

      // Fallback offline (tanpa SHEETS_API_URL): cocokkan ke state lokal seperti sebelumnya.
      const inputUserLower = inputUser.toLowerCase();
      const isSuperadmin = inputUserLower === loginUsername.trim().toLowerCase() && inputPass === loginPassword.trim();
      const matchedUser = settingUsersList.find(u =>
        (u.email && u.email.trim().toLowerCase() === inputUserLower) &&
        (u.pin && u.pin.trim() === inputPass)
      );
      if (isSuperadmin || matchedUser) {
        setIsLoggedIn(true);
        triggerToast(`Login Berhasil! Selamat datang ${isSuperadmin ? 'Superadmin' : matchedUser.nama}.`, 'success');
      } else {
        triggerToast('Gagal! Username atau Password/PIN salah. Silakan coba lagi atau gunakan tombol Bypass.', 'error');
      }
    };

    const handleBypass = () => {
      setIsLoggedIn(true);
      triggerToast('Bypass Sukses! Selamat datang kembali.', 'success');
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12 relative overflow-hidden" id="login-container">
        {/* Background ambient glowing balls */}
        <div className="absolute top-10 left-10 w-72 h-72 bg-[#0EA5A4]/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        
        <div className="max-w-md w-full space-y-8 bg-white border border-slate-200 p-8 rounded-2xl shadow-xl relative z-10" id="login-card">
          <div className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-xl bg-[#0EA5A4] flex items-center justify-center font-extrabold text-white text-2xl shadow-md">
              IN
            </div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">INO ERP SECURE LOGIN</h2>
            <p className="text-xs text-slate-500">Silakan masukkan kredensial hak akses untuk mengelola operasional perusahaan.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Username</label>
              <input 
                name="username"
                type="text" 
                required
                value={loginInputUser}
                onChange={(e) => setLoginInputUser(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] focus:border-[#0EA5A4] outline-none placeholder:text-slate-400"
                placeholder="Masukkan username admin..."
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">Password</label>
              <input 
                name="password"
                type="password" 
                required
                value={loginInputPass}
                onChange={(e) => setLoginInputPass(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] focus:border-[#0EA5A4] outline-none placeholder:text-slate-400"
                placeholder="••••••••"
              />
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="submit"
                className="w-full py-3 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white font-extrabold text-xs rounded-lg shadow-md transition-all text-center uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Lock size={14} />
                <span>Masuk ke Dashboard ERP</span>
              </button>

              <button
                type="button"
                onClick={handleBypass}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-[10px] rounded-lg border border-slate-200 transition-all text-center uppercase tracking-widest flex items-center justify-center gap-1.5 cursor-pointer"
              >
                🔓 Bypass Login (Akses Langsung / Demo)
              </button>
            </div>
          </form>

          <div className="border-t border-slate-200 pt-4 text-center space-y-3">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center space-y-2">
              <span className="block text-[11px] text-slate-600 font-extrabold uppercase tracking-wide">Tidak punya akun / Mau buat instansi baru?</span>
              <button
                type="button"
                onClick={() => {
                  setNewCompanyForm({ nama: '', alamat: '', telp: '', kota: '', tipeTemplate: 'empty' });
                  setShowCreateCompanyModal(true);
                }}
                className="w-full py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-extrabold text-[10px] rounded-lg tracking-widest uppercase transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
              >
                🏢 Buat Perusahaan Baru (Pilih Template)
              </button>
            </div>

            <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
              *Akses login dikonfigurasi melalui tab <b>Pengaturan</b>.<br />
              Default U/P: <span className="text-[#0EA5A4] font-mono font-bold">Ngurah</span> / <span className="text-[#0EA5A4] font-mono font-bold">Ngr123</span>
            </p>
            <div className="flex justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setLoginInputUser('Ngurah');
                  setLoginInputPass('Ngr123');
                  triggerToast('Berhasil menempelkan akun default!', 'success');
                }}
                className="text-[10px] text-[#0EA5A4] hover:text-[#0C8F8E] font-black uppercase tracking-wider underline cursor-pointer"
              >
                📋 Tempel Akun Default
              </button>
              <span className="text-slate-300">|</span>
              <button
                type="button"
                onClick={() => {
                  setLoginUsername('Ngurah');
                  setLoginPassword('Ngr123');
                  setLocalStorage('ino_login_username', 'Ngurah');
                  setLocalStorage('ino_login_password', 'Ngr123');
                  triggerToast('Kredensial disetel ulang ke Ngurah / Ngr123!', 'success');
                }}
                className="text-[10px] text-amber-600 hover:text-amber-700 font-black uppercase tracking-wider underline cursor-pointer"
              >
                🔄 Reset Kredensial Database
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const NAV_GROUPS = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: <LayoutDashboard size={15} />,
      direct: true
    },
    {
      id: 'transaksi',
      label: 'Transaksi',
      icon: <FileText size={15} />,
      children: [
        { id: 'purchase_order', label: 'Pembelian PO', icon: <Truck size={14} /> },
        { id: 'sales_order', label: 'Penjualan SO', icon: <CreditCard size={14} /> },
        { id: 'relasi', label: 'Pelanggan & Supplier', icon: <Users size={14} /> },
      ]
    },
    {
      id: 'gudang',
      label: 'Gudang',
      icon: <Package size={15} />,
      children: [
        { id: 'master_produk', label: 'Master Produk', icon: <Database size={14} /> },
        { id: 'stock_opname', label: 'Stock Opname', icon: <AlertTriangle size={14} /> },
        { id: 'produksi', label: 'Produksi & BOM', icon: <Layers size={14} /> },
      ]
    },
    {
      id: 'laporan',
      label: 'Laporan',
      icon: <TrendingUp size={15} />,
      children: [
        { id: 'laporan_psak', label: 'Laporan Hub', icon: <FileText size={14} /> },
        { id: 'statistik', label: 'Statistik', icon: <Activity size={14} /> },
      ]
    },
    {
      id: 'sistem',
      label: 'Sistem',
      icon: <Settings size={15} />,
      children: [
        { id: 'setting', label: 'Pengaturan', icon: <Settings size={14} /> },
        { id: 'export_code', label: 'Google Sheets Hub', icon: <Code size={14} /> },
      ]
    },
  ];

  const isGroupActive = (group: any) => {
    if (group.direct) return activeTab === group.id;
    return group.children && group.children.some((child: any) => child.id === activeTab);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F9FAFB] font-sans">
      {/* Premium Warm Minimal Topbar Header */}
      <header className="bg-white text-slate-800 px-6 py-4 flex flex-col md:flex-row justify-between items-center border-b border-slate-100 gap-4 no-print shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#0EA5A4] flex items-center justify-center font-bold text-white text-base shadow-sm">
            IN
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-[#18212F] flex items-center gap-2">
                INO ERP
                <span className="text-[10px] text-[#0ea5a4] bg-[#0ea5a4]/5 px-2 py-0.5 rounded-md border border-[#0ea5a4]/15 font-medium">{namaToko}</span>
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium">Integrated Business Operations &middot; {tipeBisnis} &amp; UMKM Hub</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <span className="bg-[#0ea5a4]/5 text-[#0EA5A4] border border-[#0ea5a4]/15 px-3 py-1.5 rounded-lg font-mono text-xs flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0EA5A4] animate-pulse"></span>
            Simulasi Aktif
          </span>
          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-600 border-l border-slate-100 pl-3">
            <span>Administrator</span>
            <div className="w-7 h-7 rounded-full bg-slate-100 text-[#18212F] border border-slate-200 flex items-center justify-center text-xs font-bold">
              AD
            </div>
          </div>
          {isLoggedIn && isLoginActive && (
            <button
              onClick={() => {
                setIsLoggedIn(false);
                setLoginInputUser('');
                setLoginInputPass('');
                triggerToast('Logout berhasil! Sistem terkunci kembali.', 'success');
              }}
              className="flex items-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          )}
          <button
            onClick={() => {
              setNewCompanyForm({ nama: '', alamat: '', telp: '', kota: '', tipeTemplate: 'empty' });
              setShowCreateCompanyModal(true);
            }}
            className="flex items-center gap-1.5 bg-[#0ea5a4]/10 hover:bg-[#0ea5a4]/15 text-[#0EA5A4] border border-[#0ea5a4]/20 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer"
          >
            🏢 Buat Instansi Baru
          </button>
        </div>
      </header>

      {/* Level 2: Horizontal Navigation Bar - Premium Style */}
      <nav className="bg-white text-slate-600 border-b border-slate-100 px-6 py-1.5 hidden md:flex items-center justify-between shadow-xs no-print">
        <div className="flex items-center space-x-1">
          {NAV_GROUPS.map(group => {
            const active = isGroupActive(group);
            if (group.direct) {
              return (
                <button 
                  key={group.id}
                  onClick={() => setActiveTab(group.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer border ${
                    active 
                      ? 'bg-[#0EA5A4]/10 text-[#0EA5A4] border-[#0ea5a4]/25 shadow-xs font-semibold' 
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  {group.icon}
                  <span>{group.label}</span>
                </button>
              );
            }

            return (
              <div key={group.id} className="relative group">
                <button 
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-all cursor-pointer border ${
                    active 
                      ? 'bg-[#0EA5A4]/10 text-[#0EA5A4] border-[#0ea5a4]/25 shadow-xs font-semibold' 
                      : 'hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-transparent'
                  }`}
                >
                  {group.icon}
                  <span>{group.label}</span>
                  <span className="text-[10px] text-slate-400">▾</span>
                </button>
                <div className="absolute left-0 top-full pt-1 hidden group-hover:block z-50 min-w-[200px]">
                  <div className="bg-white border border-slate-200 shadow-md rounded-xl p-1.5">
                    {/* ponytail: pt-1 menggantikan mt-1 sebagai jembatan hover */}
                    {group.children.map(child => {
                    const childActive = activeTab === child.id;
                    return (
                      <button
                        key={child.id}
                        onClick={() => setActiveTab(child.id)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg text-xs transition-all cursor-pointer ${
                          childActive 
                            ? 'bg-[#0EA5A4]/10 text-[#0EA5A4] font-medium' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        {child.icon}
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="text-[11px] text-slate-400 font-medium font-mono">
          v1.2.0 &middot; SAK-EMKM Compliant
        </div>
      </nav>

      {/* Main Container */}
      <div className="flex flex-1 flex-col">
        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full overflow-y-auto">
          {toast && (
            <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg shadow-lg text-white font-medium flex items-center gap-3 transition-all transform animate-bounce z-50 ${toast.type === 'success' ? 'bg-[#22C55E]' : toast.type === 'error' ? 'bg-[#EF4444]' : 'bg-[#F59E0B]'}`}>
              <CheckCircle size={18} />
              <span>{toast.message}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (() => {
            const currentCashBalance = cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].saldo : 25000000;
            
            const totalPiutangAR = salesOrders
              .filter(so => so.statusBayar === 'Belum Lunas' || so.statusBayar === 'Cicilan')
              .reduce((sum, so) => sum + (so.grandTotal - (so.totalPaid ?? 0)), 0);

            const totalHutangAP = purchaseOrders
              .filter(po => po.statusBayar === 'Belum Dibayar' || po.statusBayar === 'Cicilan')
              .reduce((sum, po) => sum + (po.grandTotal - (po.totalPaid ?? 0)), 0);

            const totalMarginPenjualan = salesOrders
              .filter(so => so.statusLogistik !== 'Void')
              .reduce((sum, so) => {
                return sum + so.items.reduce((itemSum: number, item: any) => {
                  const prod = products.find(p => p.sku === item.sku);
                  const hpp = prod ? prod.hpp : 12000;
                  return itemSum + (item.qty * (item.harga - hpp));
                }, 0);
              }, 0);

            const totalOpnameMinus = opnameLog
              .filter(log => log.tipe === 'OPNAME_MINUS' || log.selisih < 0)
              .reduce((sum, log) => sum + Math.abs(log.subtotal), 0);

            const estimasiLabaKotor = totalMarginPenjualan - totalOpnameMinus;

            const arOverdueList = salesOrders.filter(so => isSoOverdue(so));
            const apOverdueList = purchaseOrders.filter(po => isPoOverdue(po));
            const criticalStockList = products.filter(p => p.stok <= p.safety && p.status === 'Aktif');

            const liveAuditFeed = deriveAllInventoryLogs().slice(0, 10);

            // Filter out void orders to get clean counts and ratios for donut charts
            const validSos = salesOrders.filter(so => so.statusLogistik !== 'Void');
            const totalSoLunasCount = validSos.filter(so => so.statusBayar === 'Lunas').length;
            const totalSoUnpaidCount = validSos.filter(so => so.statusBayar === 'Belum Lunas' || so.statusBayar === 'Cicilan').length;
            const totalSoLunasAmount = validSos.filter(so => so.statusBayar === 'Lunas').reduce((sum, so) => sum + so.grandTotal, 0);
            const totalSoUnpaidAmount = validSos.filter(so => so.statusBayar === 'Belum Lunas' || so.statusBayar === 'Cicilan').reduce((sum, so) => sum + (so.grandTotal - (so.totalPaid ?? 0)), 0);

            const soPieData = [
              { name: 'Lunas', value: totalSoLunasCount, amount: totalSoLunasAmount },
              { name: 'Belum Lunas / Cicilan', value: totalSoUnpaidCount, amount: totalSoUnpaidAmount }
            ];

            const validPos = purchaseOrders.filter(po => po.statusLogistik !== 'Void');
            const totalPoLunasCount = validPos.filter(po => po.statusBayar === 'Lunas').length;
            const totalPoUnpaidCount = validPos.filter(po => po.statusBayar === 'Belum Dibayar' || po.statusBayar === 'Cicilan').length;
            const totalPoLunasAmount = validPos.filter(po => po.statusBayar === 'Lunas').reduce((sum, po) => sum + po.grandTotal, 0);
            const totalPoUnpaidAmount = validPos.filter(po => po.statusBayar === 'Belum Dibayar' || po.statusBayar === 'Cicilan').reduce((sum, po) => sum + (po.grandTotal - (po.totalPaid ?? 0)), 0);

            const poPieData = [
              { name: 'Lunas', value: totalPoLunasCount, amount: totalPoLunasAmount },
              { name: 'Belum Dibayar / Cicilan', value: totalPoUnpaidCount, amount: totalPoUnpaidAmount }
            ];

            return (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1E293B]">🏠 Dashboard Monitor (Live Control Center)</h2>
                    <p className="text-sm text-[#475569]">Monitor keuangan operasional harian dan tindakan eksekusi penting secara langsung</p>
                  </div>
                </div>

                <div className="space-y-6">
                    {/* Top Cards (Metrik Flash) */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      {/* Kas Aktual */}
                      <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm flex flex-col justify-between relative overflow-hidden group hover:border-[#0EA5A4] transition-all">
                        <div className="flex justify-between items-center text-xs font-bold text-[#94A3B8] tracking-wider uppercase">
                          <span>Kas Aktual (Log)</span>
                          <span className="p-1.5 rounded-lg bg-teal-50 text-[#0EA5A4] font-mono text-[9px]">Live Balance</span>
                        </div>
                        <div className="mt-3">
                          <span className="text-2xl font-extrabold text-[#1E293B]">
                            Rp {currentCashBalance.toLocaleString('id-ID')}
                          </span>
                          <p className="text-[10px] text-[#64748B] mt-1.5">Saldo baris akhir dari log kas</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                          <button
                            onClick={() => {
                              setManualCashForm({
                                tanggal: new Date().toISOString().split('T')[0],
                                keterangan: '',
                                kategori: 'Operasional Lain',
                                tipe: 'KELUAR',
                                nominal: 0
                              });
                              setShowManualCashModal(true);
                            }}
                            className="text-[10px] font-bold text-[#0EA5A4] hover:text-[#0D8584] hover:underline flex items-center gap-1"
                          >
                            ➕ Catat Mutasi Kas Manual
                          </button>
                        </div>
                      </div>

                      {/* Total Piutang (AR) */}
                      <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-sky-500 transition-all">
                        <div className="flex justify-between items-center text-xs font-bold text-[#94A3B8] tracking-wider uppercase">
                          <span>Total Piutang (AR)</span>
                          <span className="p-1.5 rounded-lg bg-sky-50 text-[#3B82F6] font-mono text-[9px]">Sisa Tagihan</span>
                        </div>
                        <div className="mt-3">
                          <span className="text-2xl font-extrabold text-[#1E293B]">
                            Rp {totalPiutangAR.toLocaleString('id-ID')}
                          </span>
                          <p className="text-[10px] text-[#64748B] mt-1.5">SO Belum Lunas / Cicilan aktif</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[10px] text-gray-500">
                          <span>Detail & Pelunasan ada di tab <strong>Sales Order</strong></span>
                        </div>
                      </div>

                      {/* Total Hutang (AP) */}
                      <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-red-500 transition-all">
                        <div className="flex justify-between items-center text-xs font-bold text-[#94A3B8] tracking-wider uppercase">
                          <span>Total Hutang (AP)</span>
                          <span className="p-1.5 rounded-lg bg-red-50 text-red-500 font-mono text-[9px]">Sisa Hutang</span>
                        </div>
                        <div className="mt-3">
                          <span className="text-2xl font-extrabold text-[#1E293B]">
                            Rp {totalHutangAP.toLocaleString('id-ID')}
                          </span>
                          <p className="text-[10px] text-[#64748B] mt-1.5">PO Belum Dibayar / Cicilan aktif</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[10px] text-gray-500">
                          <span>Kelola pembayaran di tab <strong>Purchase Order</strong></span>
                        </div>
                      </div>

                      {/* Estimasi Laba Kotor */}
                      <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm flex flex-col justify-between hover:border-violet-500 transition-all">
                        <div className="flex justify-between items-center text-xs font-bold text-[#94A3B8] tracking-wider uppercase">
                          <span>Est. Laba Kotor</span>
                          <span className="p-1.5 rounded-lg bg-violet-50 text-violet-600 font-mono text-[9px]">Hj - HPP - Opname-</span>
                        </div>
                        <div className="mt-3">
                          <span className="text-2xl font-extrabold text-[#1E293B]">
                            Rp {estimasiLabaKotor.toLocaleString('id-ID')}
                          </span>
                          <p className="text-[10px] text-[#64748B] mt-1.5">Setelah dikurangi wastage & opname minus</p>
                        </div>
                        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[10px] text-gray-500 font-mono">
                          <span>Margin: {totalMarginPenjualan > 0 ? ((estimasiLabaKotor / totalMarginPenjualan) * 100).toFixed(1) : 0}%</span>
                          <span className="text-red-500">Waste: Rp {totalOpnameMinus.toLocaleString('id-ID')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Tables Group */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* AR Overdue */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <h3 className="text-xs font-extrabold text-red-600 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
                            ⚠️ AR Overdue (Piutang Jatuh Tempo)
                          </h3>
                          <span className="bg-red-100 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">{arOverdueList.length} Faktur</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-[#64748B] font-bold border-b border-slate-100 uppercase text-[9px]">
                                <th className="py-2 px-2.5">No. SO</th>
                                <th className="py-2 px-2.5">Customer</th>
                                <th className="py-2 px-2.5 text-right">Sisa Tagihan</th>
                                <th className="py-2 px-2.5 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {arOverdueList.map(so => {
                                const sisa = so.grandTotal - (so.totalPaid ?? 0);
                                return (
                                  <tr key={so.id} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-2.5 font-mono font-bold text-[#1E293B]">{so.id}</td>
                                    <td className="py-2.5 px-2.5 font-medium max-w-[100px] truncate">{so.pelanggan}</td>
                                    <td className="py-2.5 px-2.5 text-right font-bold text-red-600">Rp {sisa.toLocaleString('id-ID')}</td>
                                    <td className="py-2.5 px-2.5 text-center">
                                      <button
                                        onClick={() => {
                                          setSelectedSo(so);
                                          setSoActionForm('payment');
                                          setActiveTab('sales_order');
                                        }}
                                        className="text-[10px] font-bold bg-[#0EA5A4] text-white px-2 py-1 rounded hover:bg-[#0D8584]"
                                      >
                                        Bayar
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {arOverdueList.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center text-gray-400 italic">Tidak ada piutang jatuh tempo. Luar biasa!</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* AP Overdue */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <h3 className="text-xs font-extrabold text-amber-600 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse"></span>
                            ⚠️ AP Overdue (Hutang Jatuh Tempo)
                          </h3>
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">{apOverdueList.length} Tagihan</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-[#64748B] font-bold border-b border-slate-100 uppercase text-[9px]">
                                <th className="py-2 px-2.5">No. PO</th>
                                <th className="py-2 px-2.5">Supplier</th>
                                <th className="py-2 px-2.5 text-right">Sisa Hutang</th>
                                <th className="py-2 px-2.5 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {apOverdueList.map(po => {
                                const sisa = po.grandTotal - (po.totalPaid ?? 0);
                                return (
                                  <tr key={po.id} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-2.5 font-mono font-bold text-[#1E293B]">{po.id}</td>
                                    <td className="py-2.5 px-2.5 font-medium max-w-[100px] truncate">{po.supplier}</td>
                                    <td className="py-2.5 px-2.5 text-right font-bold text-amber-600">Rp {sisa.toLocaleString('id-ID')}</td>
                                    <td className="py-2.5 px-2.5 text-center">
                                      <button
                                        onClick={() => {
                                          setSelectedPo(po);
                                          setPoActionForm('payment');
                                          setActiveTab('purchase_order');
                                        }}
                                        className="text-[10px] font-bold bg-[#0EA5A4] text-white px-2 py-1 rounded hover:bg-[#0D8584]"
                                      >
                                        Bayar
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                              {apOverdueList.length === 0 && (
                                <tr>
                                  <td colSpan={4} className="py-6 text-center text-gray-400 italic">Tidak ada hutang jatuh tempo. Aman terkendali!</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Stok Kritis (Low Stock) */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <h3 className="text-xs font-extrabold text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-red-500"></span>
                            🚨 Stok Kritis (&le; Safety Level)
                          </h3>
                          <span className="bg-red-50 text-red-600 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">{criticalStockList.length} SKU</span>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="bg-slate-50 text-[#64748B] font-bold border-b border-slate-100 uppercase text-[9px]">
                                <th className="py-2 px-2.5">Produk</th>
                                <th className="py-2 px-2.5 text-center">Stok / Safety</th>
                                <th className="py-2 px-2.5 text-center">Reorder PO</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {criticalStockList.map(p => (
                                  <tr key={p.sku} className="hover:bg-slate-50">
                                    <td className="py-2.5 px-2.5">
                                      <div className="font-bold text-[#1E293B]">{p.nama}</div>
                                      <div className="font-mono text-[9px] text-[#0EA5A4]">{p.sku}</div>
                                    </td>
                                    <td className="py-2.5 px-2.5 text-center">
                                      <span className="font-bold text-red-600">{p.stok}</span>
                                      <span className="text-slate-400 text-[10px]"> / {p.safety}</span>
                                      <span className="text-slate-400 text-[10px] ml-1">{p.satuan}</span>
                                    </td>
                                    <td className="py-2.5 px-2.5 text-center">
                                      <button
                                        onClick={() => triggerGeneratePo(p)}
                                        className="text-[9px] font-bold bg-[#0EA5A4] text-white px-2 py-1 rounded-md hover:bg-[#0D8584] transition-all"
                                      >
                                        ⚡ Generate PO
                                      </button>
                                    </td>
                                  </tr>
                              ))}
                              {criticalStockList.length === 0 && (
                                <tr>
                                  <td colSpan={3} className="py-6 text-center text-gray-400 italic">Semua stok berada di atas level aman!</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Live Audit Feed */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5A4]"></span>
                          📋 Live Audit Feed & Mutasi Inventori (10 Terakhir)
                        </h3>
                        <span className="text-[10px] font-mono text-gray-400">Total LOG: {deriveAllInventoryLogs().length}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 text-[#64748B] font-bold border-b border-[#E2E8F0] uppercase text-[9px]">
                              <th className="py-3 px-3">Tanggal</th>
                              <th className="py-3 px-3">Produk</th>
                              <th className="py-3 px-3">Tipe</th>
                              <th className="py-3 px-3 text-center">Mutasi</th>
                              <th className="py-3 px-3 text-right">Nilai Mutasi</th>
                              <th className="py-3 px-3">Operator</th>
                              <th className="py-3 px-3">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                            {liveAuditFeed.map((log, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="py-3 px-3 text-gray-500 whitespace-nowrap">{log.tanggal}</td>
                                <td className="py-3 px-3 text-slate-700 whitespace-nowrap font-sans font-bold">
                                  {log.nama} <span className="font-mono text-[9px] text-[#0EA5A4] font-normal">[{log.sku}]</span>
                                </td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${log.tipe === 'IN' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                                    {log.tipe}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-center font-bold">{log.qty}</td>
                                <td className="py-3 px-3 text-right font-bold text-[#1E293B]">Rp {log.subtotal.toLocaleString('id-ID')}</td>
                                <td className="py-3 px-3 font-sans text-gray-500">{log.operator}</td>
                                <td className="py-3 px-3 font-sans text-gray-600">{log.keterangan}</td>
                              </tr>
                            ))}
                            {liveAuditFeed.length === 0 && (
                              <tr>
                                <td colSpan={7} className="py-8 text-center text-gray-400 italic">Belum ada mutasi log inventori tercatat.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Donut Charts Section (Rasio Pelunasan) */}
                    <div className="bg-white border border-[#E2E8F0] p-5 rounded-xl shadow-sm space-y-4">
                      <div>
                        <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#0EA5A4]"></span>
                          🍩 Rasio Pelunasan Transaksi & Status Keuangan (Donut Chart)
                        </h3>
                        <p className="text-[11px] text-[#64748B] mt-0.5">Persentase dokumen transaksi yang sudah lunas vs yang masih berjalan (Belum Dibayar / Cicilan)</p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Sales Orders Donut */}
                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="text-center md:text-left space-y-1">
                            <h4 className="text-xs font-bold text-slate-700">Sales Orders (AR)</h4>
                            <p className="text-[10px] text-gray-400">Rasio Piutang Pelanggan</p>
                            <div className="mt-2 text-xs font-mono space-y-1">
                              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                                <span className="text-slate-600">Lunas:</span>
                                <span className="font-bold text-slate-800">{totalSoLunasCount} Dokumen</span>
                              </div>
                              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span>
                                <span className="text-slate-600">Sisa Tagihan:</span>
                                <span className="font-bold text-red-600">{totalSoUnpaidCount} Dokumen</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-sans mt-2 pt-1.5 border-t border-slate-200">
                                Sisa Piutang: <span className="font-bold text-red-600 font-mono">Rp {totalSoUnpaidAmount.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="w-[180px] h-[150px] flex items-center justify-center relative">
                            {validSos.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={soPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={55}
                                    paddingAngle={3}
                                  >
                                    <Cell fill="#10B981" />
                                    <Cell fill="#EF4444" />
                                  </Pie>
                                  <Tooltip formatter={(v, n) => [`${v} Dokumen`, n]} />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No Sales Data</span>
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-[14px] font-bold text-slate-700">
                                {validSos.length > 0 ? ((totalSoLunasCount / validSos.length) * 100).toFixed(0) : 0}%
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase">Lunas</span>
                            </div>
                          </div>
                        </div>

                        {/* Purchase Orders Donut */}
                        <div className="border border-slate-100 rounded-xl p-4 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                          <div className="text-center md:text-left space-y-1">
                            <h4 className="text-xs font-bold text-slate-700">Purchase Orders (AP)</h4>
                            <p className="text-[10px] text-gray-400">Rasio Hutang Supplier</p>
                            <div className="mt-2 text-xs font-mono space-y-1">
                              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]"></span>
                                <span className="text-slate-600">Lunas:</span>
                                <span className="font-bold text-slate-800">{totalPoLunasCount} Dokumen</span>
                              </div>
                              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                                <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span>
                                <span className="text-slate-600">Sisa Hutang:</span>
                                <span className="font-bold text-amber-600">{totalPoUnpaidCount} Dokumen</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-sans mt-2 pt-1.5 border-t border-slate-200">
                                Sisa Hutang: <span className="font-bold text-amber-600 font-mono">Rp {totalPoUnpaidAmount.toLocaleString('id-ID')}</span>
                              </div>
                            </div>
                          </div>
                          <div className="w-[180px] h-[150px] flex items-center justify-center relative">
                            {validPos.length > 0 ? (
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={poPieData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={40}
                                    outerRadius={55}
                                    paddingAngle={3}
                                  >
                                    <Cell fill="#10B981" />
                                    <Cell fill="#F59E0B" />
                                  </Pie>
                                  <Tooltip formatter={(v, n) => [`${v} Dokumen`, n]} />
                                </PieChart>
                              </ResponsiveContainer>
                            ) : (
                              <span className="text-xs text-gray-400 italic">No Purchase Data</span>
                            )}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                              <span className="text-[14px] font-bold text-slate-700">
                                {validPos.length > 0 ? ((totalPoLunasCount / validPos.length) * 100).toFixed(0) : 0}%
                              </span>
                              <span className="text-[8px] text-slate-400 font-bold uppercase">Lunas</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                {/* Modal Mutasi Kas Manual */}
                {showManualCashModal && (
                  <div className="fixed inset-0 bg-[#0F172A] bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E2E8F0] overflow-hidden transform transition-all duration-300 scale-100">
                      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider flex items-center gap-2">
                          💵 Catat Mutasi Kas Manual Baru
                        </h3>
                        <button
                          onClick={() => setShowManualCashModal(false)}
                          className="text-slate-400 hover:text-slate-600 font-bold text-lg"
                        >
                          &times;
                        </button>
                      </div>
                      <form onSubmit={handleAddManualCash} className="p-6 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-[#475569] uppercase mb-1">Tanggal</label>
                            <input
                              type="date"
                              required
                              value={manualCashForm.tanggal}
                              onChange={(e) => setManualCashForm({ ...manualCashForm, tanggal: e.target.value })}
                              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-[#475569] uppercase mb-1">Tipe Mutasi</label>
                            <select
                              value={manualCashForm.tipe}
                              onChange={(e) => {
                                const t = e.target.value;
                                setManualCashForm({
                                  ...manualCashForm,
                                  tipe: t,
                                  kategori: t === 'KELUAR' ? 'Operasional Lain' : 'Modal'
                                });
                              }}
                              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-white"
                            >
                              <option value="MASUK">📈 MASUK (DEBIT)</option>
                              <option value="KELUAR">📉 KELUAR (KREDIT)</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#475569] uppercase mb-1">Kategori Keuangan</label>
                          <select
                            value={manualCashForm.kategori}
                            onChange={(e) => setManualCashForm({ ...manualCashForm, kategori: e.target.value })}
                            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-bold focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-white"
                          >
                            {manualCashForm.tipe === 'KELUAR' ? (
                              <>
                                <option value="Operasional Lain">Operasional Lain</option>
                                <option value="Sewa Tempat">Sewa Tempat</option>
                                <option value="Gaji Karyawan">Gaji Karyawan</option>
                                <option value="Utilitas & Listrik">Utilitas & Listrik</option>
                                <option value="Pajak">Pajak</option>
                                <option value="Pembelian">Pembelian Alat/Bahan</option>
                              </>
                            ) : (
                              <>
                                <option value="Modal">Modal Tambahan</option>
                                <option value="Penjualan Lain">Penjualan Non-Sistem</option>
                                <option value="Pendapatan Jasa">Pendapatan Jasa / Bunga</option>
                              </>
                            )}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#475569] uppercase mb-1">Nominal (Rupiah)</label>
                          <input
                            type="number"
                            min="1"
                            required
                            placeholder="Rp 0"
                            value={manualCashForm.nominal || ''}
                            onChange={(e) => setManualCashForm({ ...manualCashForm, nominal: parseInt(e.target.value) || 0 })}
                            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs font-mono font-bold focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-[#475569] uppercase mb-1">Keterangan Mutasi</label>
                          <textarea
                            required
                            rows={2}
                            placeholder="Contoh: Bayar internet kantor bulan Juni"
                            value={manualCashForm.keterangan}
                            onChange={(e) => setManualCashForm({ ...manualCashForm, keterangan: e.target.value })}
                            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-white"
                          />
                        </div>

                        <div className="pt-2 flex justify-end gap-3">
                          <button
                            type="button"
                            onClick={() => setShowManualCashModal(false)}
                            className="px-4 py-2 border border-[#E2E8F0] text-xs font-bold text-[#64748B] rounded-lg hover:bg-slate-50 transition-all"
                          >
                            Batal
                          </button>
                          <button
                            type="submit"
                            className="px-4 py-2 bg-[#0EA5A4] text-white text-xs font-bold rounded-lg hover:bg-[#0D8584] transition-all"
                          >
                            Simpan Mutasi
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 1.5: DASHBOARD STATISTIK */}
          {activeTab === 'statistik' && (() => {
            const trendData = getSalesVsPurchaseTrend();
            const topCustomers = getTopCustomersByProfit().slice(0, 5);
            const topProducts = getTop10ProfitSKUs().slice(0, 5);
            
            // Unique customers
            const uniqueCustomers = Array.from(new Set(salesOrders.filter(so => so.statusLogistik !== 'Void').map(so => so.pelanggan))).sort();
            
            const customerTimeline = getCustomerSalesTimeline(selectedCustomerAnalysis || uniqueCustomers[0] || '');
            const productTimeline = getSkuSalesTimeline(selectedSkuAnalysis);
            const currentProduct = products.find(p => p.sku === selectedSkuAnalysis);

            return (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-[#1E293B]">📈 Dashboard Statistik & Analitik Bisnis</h2>
                    <p className="text-sm text-[#475569]">Analisis performa pertumbuhan, kontribusi laba per pelanggan, dan perputaran SKU produk</p>
                  </div>

                  {/* Period Date Filters */}
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-xl shadow-sm flex flex-wrap items-center gap-4">
                    <div className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase">
                      📅 Periode:
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-400">Dari</label>
                      <input
                        type="date"
                        value={analitikStartDate}
                        onChange={(e) => setAnalitikStartDate(e.target.value)}
                        className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[10px] font-bold text-slate-400">Sampai</label>
                      <input
                        type="date"
                        value={analitikEndDate}
                        onChange={(e) => setAnalitikEndDate(e.target.value)}
                        className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Sales & Purchases Trend Line Chart */}
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                      📊 Tren Pertumbuhan & Gerak Transaksi (Penjualan SO vs Pembelian PO)
                    </h3>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Memantau naik turun pergerakan total nominal transaksi penjualan pelanggan vs pembelian supplier</p>
                  </div>
                  <div className="h-[280px]">
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="tanggal" fontSize={10} tickLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp ${(v/1000000).toFixed(1)}Jt`} />
                          <Tooltip formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`} />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                          <Line type="monotone" dataKey="Penjualan (SO)" stroke="#0EA5A4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Pembelian (PO)" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">Tidak ada transaksi dalam periode terpilih.</div>
                    )}
                  </div>
                </div>

                {/* Profit Contribution Rankings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer Profit Rankings */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                        💎 Customer Penyumbang Laba Terbesar
                      </h3>
                      <p className="text-[11px] text-[#64748B] mt-0.5">Penyumbang laba bersih tertinggi (Klik baris untuk memantau grafik tren di bawah)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[#64748B] font-bold border-b border-slate-100 uppercase text-[9px]">
                            <th className="py-2 px-3">No</th>
                            <th className="py-2 px-3">Nama Customer</th>
                            <th className="py-2 px-3 text-right">Revenue (SO)</th>
                            <th className="py-2 px-3 text-right text-emerald-600 font-bold">Laba Bersih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {topCustomers.map((cust, idx) => (
                            <tr 
                              key={cust.nama} 
                              onClick={() => setSelectedCustomerAnalysis(cust.nama)}
                              className={`hover:bg-slate-50 cursor-pointer transition-all ${selectedCustomerAnalysis === cust.nama ? 'bg-teal-50 bg-opacity-40 font-bold' : ''}`}
                            >
                              <td className="py-2.5 px-3 text-slate-400 font-mono">#{idx + 1}</td>
                              <td className="py-2.5 px-3 text-[#1E293B] font-sans flex items-center gap-1.5">
                                {cust.nama}
                                {selectedCustomerAnalysis === cust.nama && (
                                  <span className="text-[9px] bg-[#0EA5A4] text-white px-1.5 py-0.2 rounded font-normal uppercase">Selected</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-600">Rp {cust.revenue.toLocaleString('id-ID')}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-600">Rp {cust.profit.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                          {topCustomers.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-gray-400 italic">Belum ada transaksi penjualan terekam.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Product Profit Rankings */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                        🏆 Barang (SKU) Penyumbang Laba Terbesar
                      </h3>
                      <p className="text-[11px] text-[#64748B] mt-0.5">Barang dengan akumulasi margin laba tertinggi (Klik baris untuk memantau grafik tren di bawah)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 text-[#64748B] font-bold border-b border-slate-100 uppercase text-[9px]">
                            <th className="py-2 px-3">No</th>
                            <th className="py-2 px-3">Nama Produk</th>
                            <th className="py-2 px-3 text-right">SKU</th>
                            <th className="py-2 px-3 text-right text-[#0EA5A4] font-bold">Laba Tercipta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {topProducts.map((prod, idx) => (
                            <tr 
                              key={prod.sku} 
                              onClick={() => setSelectedSkuAnalysis(prod.sku)}
                              className={`hover:bg-slate-50 cursor-pointer transition-all ${selectedSkuAnalysis === prod.sku ? 'bg-teal-50 bg-opacity-40 font-bold' : ''}`}
                            >
                              <td className="py-2.5 px-3 text-slate-400 font-mono">#{idx + 1}</td>
                              <td className="py-2.5 px-3 text-[#1E293B] font-sans flex items-center gap-1.5">
                                {prod.nama}
                                {selectedSkuAnalysis === prod.sku && (
                                  <span className="text-[9px] bg-[#0EA5A4] text-white px-1.5 py-0.2 rounded font-normal uppercase">Selected</span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-slate-500">{prod.sku}</td>
                              <td className="py-2.5 px-3 text-right font-mono font-bold text-[#0EA5A4]">Rp {prod.profit.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                          {topProducts.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-gray-400 italic">Belum ada laba terhitung dalam periode ini.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Drill-downs Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer drilldown trend */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                          🔍 Drill-down Tren Pembelian & Laba per Customer
                        </h3>
                        <p className="text-[11px] text-[#64748B] mt-0.5">Melihat fluktuasi grafik naik turun transaksi customer pilihan</p>
                      </div>
                      <div>
                        <select
                          value={selectedCustomerAnalysis}
                          onChange={(e) => setSelectedCustomerAnalysis(e.target.value)}
                          className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-slate-50 text-[#1E293B]"
                        >
                          <option value="">-- Pilih Customer --</option>
                          {uniqueCustomers.map(cust => (
                            <option key={cust} value={cust}>{cust}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="h-[200px]">
                      {selectedCustomerAnalysis && customerTimeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={customerTimeline} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="tanggal" fontSize={9} tickLine={false} />
                            <YAxis fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp ${(v/1000).toFixed(0)}K`} />
                            <Tooltip formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Line type="monotone" dataKey="revenue" name="Total Belanja" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="profit" name="Margin Profit" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                          {selectedCustomerAnalysis ? 'Tidak ada riwayat belanja untuk customer ini dalam periode ini.' : 'Silakan pilih customer di atas atau klik baris tabel peringkat.'}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product drilldown trend */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-xs font-extrabold text-[#1E293B] uppercase tracking-wider">
                          🔍 Drill-down Tren Penjualan per Produk (SKU)
                        </h3>
                        <p className="text-[11px] text-[#64748B] mt-0.5">Melihat fluktuasi grafik naik turun volume produk terjual</p>
                      </div>
                      <div>
                        <select
                          value={selectedSkuAnalysis}
                          onChange={(e) => setSelectedSkuAnalysis(e.target.value)}
                          className="border border-[#E2E8F0] rounded-lg px-2 py-1 text-xs font-bold focus:ring-1 focus:ring-[#0EA5A4] focus:outline-none bg-slate-50 text-[#1E293B]"
                        >
                          {products.map(p => (
                            <option key={p.sku} value={p.sku}>{p.nama} [{p.sku}]</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3 mb-1 text-center">
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Stok Sekarang</span>
                        <span className="font-extrabold text-slate-800 text-xs">{currentProduct?.stok || 0} {currentProduct?.satuan}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Modal HPP</span>
                        <span className="font-extrabold text-slate-800 text-[10px] font-mono">Rp {currentProduct?.hpp.toLocaleString('id-ID') || 0}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <span className="text-[9px] text-gray-400 block uppercase font-bold">Harga Jual</span>
                        <span className="font-extrabold text-slate-800 text-[10px] font-mono">Rp {currentProduct?.hj.toLocaleString('id-ID') || 0}</span>
                      </div>
                    </div>

                    <div className="h-[135px]">
                      {selectedSkuAnalysis && productTimeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={productTimeline} margin={{ top: 5, right: 15, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="tanggal" fontSize={9} tickLine={false} />
                            <YAxis fontSize={9} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Line type="monotone" dataKey="qty" name="Qty Terjual (Pcs)" stroke="#0EA5A4" strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-xs text-slate-400 italic">
                          Tidak ada transaksi penjualan produk ini dalam periode terpilih.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 2: MASTER PRODUK */}
          {activeTab === 'master_produk' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-[#1E293B]">Master Database Produk & Bahan Baku</h2>
                  <p className="text-sm text-[#475569]">Kelola database inventori, harga jual, HPP, safety stock, dan lokasi penyimpanan</p>
                </div>
                {productTab === 'daftar' && (
                  <button 
                    onClick={() => {
                      setProductForm({ sku: '', kategori: 'Barang Jadi', subKat: 'Roti & Kue', nama: '', satuan: 'Pcs', hj: 0, hpp: 0, safety: 10, stok: 0, status: 'Aktif', supplier: '', tempatSimpan: 'Gudang Utama', masaSmp: 'Selamanya', catatan: '' });
                      setIsEditingProduct(false);
                      setShowProductModal(true);
                    }}
                    className="bg-[#0EA5A4] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm shadow transition-all"
                  >
                    <Plus size={16} />
                    <span>Daftarkan Produk Baru</span>
                  </button>
                )}
              </div>

              {/* Sub-Tabs Selector */}
              <div className="flex gap-4 border-b border-[#E2E8F0] pb-px">
                <button 
                  onClick={() => setProductTab('daftar')} 
                  className={`pb-3 font-semibold text-sm transition-all relative ${productTab === 'daftar' ? 'text-[#0EA5A4] border-b-2 border-[#0EA5A4] font-extrabold' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  📋 Daftar Produk & Bahan Baku
                </button>
                <button 
                  onClick={() => setProductTab('spreadsheet')} 
                  className={`pb-3 font-semibold text-sm flex items-center gap-1.5 transition-all relative ${productTab === 'spreadsheet' ? 'text-[#0EA5A4] border-b-2 border-[#0EA5A4] font-extrabold' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  <FileSpreadsheet size={16} />
                  <span>📊 Spreadsheet Buku Besar Produk</span>
                </button>
              </div>

              {productTab === 'daftar' && (
                /* Product List Table */
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead>
                        <tr className="bg-[#0EA5A4] text-white text-xs font-black uppercase tracking-wider border-b border-teal-600">
                          <th className="py-3.5 px-4">SKU</th>
                          <th className="py-3.5 px-4">Kategori / Sub</th>
                          <th className="py-3.5 px-4">Nama Produk</th>
                          <th className="py-3.5 px-4 text-center">Satuan</th>
                          <th className="py-3.5 px-4 text-right">Harga Jual</th>
                          <th className="py-3.5 px-4 text-right">HPP</th>
                          <th className="py-3.5 px-4 text-center">Stok</th>
                          <th className="py-3.5 px-4">Lokasi Simpan</th>
                          <th className="py-3.5 px-4 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {products.map(p => (
                          <tr key={p.sku} className={`hover:bg-gray-50 transition-colors ${p.status === 'Nonaktif' ? 'bg-gray-100 opacity-60' : ''}`}>
                            <td className="py-3 px-4">
                              <button 
                                onClick={() => setViewingProductTx(p)}
                                className="hover:underline font-mono font-bold text-[#0EA5A4] text-xs hover:text-[#0F766E] transition-all text-left"
                                title="Klik untuk rincian transaksi"
                              >
                                {p.sku}
                              </button>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${p.kategori === 'Barang Jadi' ? 'bg-emerald-100 text-emerald-800' : p.kategori === 'Bahan Baku' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'}`}>
                                {p.kategori}
                              </span>
                              <div className="text-[11px] text-[#64748B] mt-0.5">{p.subKat}</div>
                            </td>
                            <td className="py-3 px-4">
                              <button 
                                onClick={() => setViewingProductTx(p)}
                                className="hover:underline font-semibold text-[#1E293B] hover:text-[#0EA5A4] transition-all text-left font-sans text-xs"
                                title="Klik untuk rincian transaksi"
                              >
                                {p.nama}
                              </button>
                            </td>
                            <td className="py-3 px-4 text-center text-xs">{p.satuan}</td>
                            <td className="py-3 px-4 text-right font-mono text-xs font-bold text-[#0EA5A4]">
                              {p.hj > 0 ? `Rp ${p.hj.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-xs">Rp {p.hpp.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`font-bold font-mono text-sm ${p.stok < p.safety ? 'text-[#EF4444]' : 'text-[#1E293B]'}`}>
                                {p.stok}
                              </span>
                              <div className="text-[9px] text-[#94A3B8] font-semibold">Min: {p.safety}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-1 text-xs text-[#475569]">
                                <MapPin size={12} className="text-[#0EA5A4]" />
                                <span>{p.tempatSimpan}</span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="flex justify-center items-center gap-2">
                                <button 
                                  onClick={() => setViewingProductTx(p)}
                                  title="Rincian Transaksi"
                                  className="p-1.5 text-gray-500 hover:text-[#0EA5A4] transition-colors"
                                >
                                  <Eye size={15} />
                                </button>
                                <button 
                                  onClick={() => {
                                    setProductForm({ ...p });
                                    setIsEditingProduct(true);
                                    setShowProductModal(true);
                                  }}
                                  title="Edit Produk"
                                  className="p-1.5 text-gray-500 hover:text-[#0EA5A4] transition-colors"
                                >
                                  <Edit3 size={15} />
                                </button>
                                <button 
                                  onClick={() => handleDeleteProduct(p.sku)}
                                  title="Hapus"
                                  className="p-1.5 text-gray-500 hover:text-[#EF4444] transition-colors"
                                >
                                  <Trash2 size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {productTab === 'spreadsheet' && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-xs">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Buku Besar Pembantu Stok (Ledger Spreadsheet)</h3>
                      <p className="text-xs text-slate-500">Mencatat mutasi penambahan dan pengurangan kuantitas stok produk secara terpisah dari inventori utama</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (selectedProductSku) {
                          getOrInitProductLedger(selectedProductSku, true);
                          triggerToast(`Buku besar ${selectedProductSku} berhasil disinkronisasi ulang!`, 'success');
                        }
                      }}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
                    >
                      <span>🔄 Sinkronisasi Ulang dari Database</span>
                    </button>
                  </div>

                  {/* Spreadsheet Tabs */}
                  <div className="flex gap-1 overflow-x-auto border-b border-gray-200 scrollbar-thin">
                    {products.map(p => (
                      <button 
                        key={p.sku} 
                        onClick={() => setSelectedProductSku(p.sku)} 
                        className={`px-4 py-2 rounded-t-xl font-mono text-xs border-r border-t border-l transition-all duration-150 whitespace-nowrap ${selectedProductSku === p.sku ? 'bg-white border-gray-300 font-bold text-[#0EA5A4] shadow-xs' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                      >
                        📄 {p.sku} ({p.nama})
                      </button>
                    ))}
                  </div>

                  {/* Spreadsheet Grid container */}
                  {selectedProductSku && products.find(p => p.sku === selectedProductSku) ? (
                    <div className="space-y-4">
                      <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-200 flex flex-wrap justify-between items-center text-xs gap-2">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-slate-400">Nama Produk:</span>{' '}
                            <span className="font-bold text-slate-700">{products.find(p => p.sku === selectedProductSku)?.nama}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Kategori:</span>{' '}
                            <span className="font-bold text-slate-700">{products.find(p => p.sku === selectedProductSku)?.kategori}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Stok Saat Ini:</span>{' '}
                            <span className="font-mono font-bold text-[#0EA5A4] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">{products.find(p => p.sku === selectedProductSku)?.stok} {products.find(p => p.sku === selectedProductSku)?.satuan}</span>
                          </div>
                        </div>
                      </div>
                      <SpreadsheetComponent 
                        headers={['Tanggal', 'Deskripsi / No. Ref', 'Masuk (Qty)', 'Keluar (Qty)', 'Saldo Akhir', 'HPP/Harga', 'Subtotal', 'Status / Catatan']}
                        rows={getOrInitProductLedger(selectedProductSku)}
                        onChangeCell={(r, c, val) => handleProductCellChange(selectedProductSku, r, c, val)}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">
                      Pilih tab produk di atas untuk memuat lembar buku besar pembantu.
                    </div>
                  )}
                </div>
              )}

              {/* Product Form Modal */}
              {showProductModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl shadow-xl max-w-lg w-full overflow-hidden">
                    <div className="bg-[#1E293B] text-white py-4 px-6 flex justify-between items-center">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <Package size={18} className="text-[#0EA5A4]" />
                        <span>{isEditingProduct ? `Edit SKU [${productForm.sku}]` : 'Daftarkan Master Produk Baru'}</span>
                      </h3>
                      <button onClick={() => setShowProductModal(false)} className="text-white hover:text-gray-300">&times;</button>
                    </div>
                    <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#475569] uppercase">Kategori Utama</label>
                          <input 
                            type="text"
                            list="categories-list"
                            value={productForm.kategori} 
                            onChange={(e) => setProductForm({ ...productForm, kategori: e.target.value })}
                            className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm bg-white"
                            placeholder="Pilih/Ketik Kategori"
                          />
                          <datalist id="categories-list">
                            <option value="Barang Jadi" />
                            <option value="Bahan Baku" />
                            <option value="Kemasan" />
                            {settingCategories.filter(cat => !['Barang Jadi', 'Bahan Baku', 'Kemasan'].includes(cat)).map(cat => (
                              <option key={cat} value={cat} />
                            ))}
                          </datalist>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#475569] uppercase">Sub-Kategori</label>
                          <input 
                            type="text" 
                            list="subcategories-list"
                            value={productForm.subKat} 
                            onChange={(e) => setProductForm({ ...productForm, subKat: e.target.value })}
                            placeholder="Cth: Roti & Kue, Bahan Kering"
                            className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm bg-white"
                          />
                          <datalist id="subcategories-list">
                            {settingSubCategories.map(sub => (
                              <option key={sub} value={sub} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-[#475569] uppercase">Nama Lengkap Produk</label>
                        <input 
                          type="text" 
                          value={productForm.nama} 
                          onChange={(e) => setProductForm({ ...productForm, nama: e.target.value })}
                          placeholder="Cth: Croissant Mentega Klasik"
                          className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#475569] uppercase">Satuan</label>
                          <input 
                            type="text" 
                            list="units-list"
                            value={productForm.satuan} 
                            onChange={(e) => setProductForm({ ...productForm, satuan: e.target.value })}
                            placeholder="Cth: Pcs, Kg"
                            className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm bg-white"
                          />
                          <datalist id="units-list">
                            {settingUnits.map(u => (
                              <option key={u} value={u} />
                            ))}
                          </datalist>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#475569] uppercase">Harga Jual (Rp)</label>
                          <input 
                            type="number" 
                            value={productForm.hj} 
                            onChange={(e) => setProductForm({ ...productForm, hj: parseInt(e.target.value) || 0 })}
                            className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#475569] uppercase">HPP Awal (Rp)</label>
                          <input 
                            type="number" 
                            value={productForm.hpp} 
                            onChange={(e) => setProductForm({ ...productForm, hpp: parseInt(e.target.value) || 0 })}
                            className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#475569] uppercase">Batas Safety Stock</label>
                          <input 
                            type="number" 
                            value={productForm.safety} 
                            onChange={(e) => setProductForm({ ...productForm, safety: parseInt(e.target.value) || 10 })}
                            className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold text-[#475569] uppercase">Tempat Penyimpanan</label>
                          <input 
                            type="text" 
                            list="storage-list"
                            value={productForm.tempatSimpan} 
                            onChange={(e) => setProductForm({ ...productForm, tempatSimpan: e.target.value })}
                            placeholder="Cth: Etalase Depan, Gudang A"
                            className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm bg-white"
                          />
                          <datalist id="storage-list">
                            {settingStorageLocations.map(loc => (
                              <option key={loc} value={loc} />
                            ))}
                          </datalist>
                        </div>
                      </div>

                      {!isEditingProduct && (
                        <div className="flex flex-col gap-1.5 bg-[#F0FDF4] border border-[#22C55E] p-4 rounded-lg">
                          <span className="text-xs font-bold text-[#166534] uppercase">Qty Saldo Awal (Opsional)</span>
                          <div className="grid grid-cols-2 gap-3 mt-1">
                            <input 
                              type="number" 
                              value={productForm.stok} 
                              onChange={(e) => setProductForm({ ...productForm, stok: parseInt(e.target.value) || 0 })}
                              placeholder="Kuantitas Awal"
                              className="border border-[#BBF7D0] p-2.5 rounded-lg text-sm bg-white"
                            />
                            <p className="text-[10px] text-[#166534] leading-relaxed">
                              *Jika diisi, sistem otomatis menyuntik mutasi MASUK sebagai saldo awal di log gudang.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-4 border-t border-[#E2E8F0]">
                        <button 
                          type="button" 
                          onClick={() => setShowProductModal(false)}
                          className="px-4 py-2.5 text-sm font-semibold border border-[#E2E8F0] hover:bg-gray-100 rounded-lg"
                        >
                          Batal
                        </button>
                        <button 
                          type="submit"
                          className="px-5 py-2.5 text-sm font-semibold bg-[#0EA5A4] hover:bg-[#0F766E] text-white rounded-lg shadow"
                        >
                          {isEditingProduct ? 'Simpan Perubahan' : 'Daftarkan Master'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PURCHASE ORDER (PO) TRACKER */}
          {activeTab === 'purchase_order' && (
            <div className="space-y-6">
              {!showPoForm ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1E293B]">Purchase Order Tracker</h2>
                      <p className="text-sm text-[#475569]">Monitor pemesanan barang dari supplier, logistik gudang, dan status tagihan</p>
                    </div>
                    <button 
                      onClick={() => {
                        setPoForm({
                          id: '', supplier: '', tanggal: new Date().toISOString().split('T')[0],
                          metode: 'Kredit 30 Hari', items: [{ sku: '', qty: 1, harga: 0, subtotal: 0 }],
                          pajak: false, catatan: ''
                        });
                        setIsEditingPo(false);
                        setShowPoForm(true);
                      }}
                      className="bg-[#0EA5A4] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm shadow transition-all"
                    >
                      <Plus size={16} />
                      <span>Buat Purchase Order Baru</span>
                    </button>
                  </div>

                  {/* Informative Tip Banner */}
                  <div className="bg-sky-50 border border-sky-200 text-sky-800 p-3.5 rounded-lg text-xs flex items-center gap-2.5 shadow-sm">
                    <span className="text-base">💡</span>
                    <span><strong>Tips Operasional:</strong> Klik pada baris transaksi manapun untuk membuka panel <strong>Detail Transaksi</strong>. Dari sana Anda bisa mengelola penerimaan barang logistik, melunasi pembayaran, mencatat retur produk ke supplier, serta melakukan pembatalan (void).</span>
                  </div>

                  {/* PO List Table */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="bg-[#0EA5A4] text-white text-xs font-black uppercase tracking-wider border-b border-teal-600">
                            <th className="py-3.5 px-4">No. PO</th>
                            <th className="py-3.5 px-4">Tanggal PO</th>
                            <th className="py-3.5 px-4">Supplier</th>
                            <th className="py-3.5 px-4">Tipe Tagihan</th>
                            <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                            <th className="py-3.5 px-4 text-center">Status Logistik</th>
                            <th className="py-3.5 px-4 text-center">Status Keuangan</th>
                            <th className="py-3.5 px-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {purchaseOrders.map(po => (
                            <tr key={po.id} onClick={() => { setSelectedPo(po); setPoActionForm(null); }} className="hover:bg-teal-50 hover:bg-opacity-30 cursor-pointer transition-colors">
                              <td className="py-4 px-4 font-mono font-bold text-xs text-[#1E293B]">{po.id}</td>
                              <td className="py-4 px-4 text-xs">{po.tanggal}</td>
                              <td className="py-4 px-4 font-semibold">{po.supplier}</td>
                              <td className="py-4 px-4 text-xs">{po.metode}</td>
                              <td className="py-4 px-4 text-right font-bold text-xs">Rp {po.grandTotal.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  po.statusLogistik === 'Diterima' ? 'bg-[#22C55E] bg-opacity-10 text-[#22C55E]' :
                                  po.statusLogistik === 'Menunggu' ? 'bg-[#F59E0B] bg-opacity-10 text-[#F59E0B]' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {po.statusLogistik}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  po.statusBayar === 'Lunas' ? 'bg-[#22C55E] bg-opacity-10 text-[#22C55E]' :
                                  po.statusBayar === 'Belum Dibayar' ? 'bg-[#EF4444] bg-opacity-10 text-[#EF4444]' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {po.statusBayar}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleVoidPO(po.id); }}
                                    className="px-2 py-1 text-xs font-semibold bg-[#EF4444] bg-opacity-10 text-[#EF4444] hover:bg-opacity-20 rounded"
                                    disabled={po.statusLogistik === 'Void'}
                                  >
                                    Void
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // PO Creation Panel
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
                  <div className="border-b border-[#E2E8F0] pb-4 flex justify-between items-center">
                    <h3 className="font-bold text-[#1E293B] text-lg">Buat Purchase Order Baru (Batch Mode)</h3>
                    <button onClick={() => setShowPoForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Supplier (Kepada)</label>
                      <input 
                        type="text"
                        list="po-suppliers-list"
                        value={poForm.supplier}
                        onChange={(e) => setPoForm({ ...poForm, supplier: e.target.value })}
                        className="p-2 border border-[#E2E8F0] rounded-lg bg-white text-sm"
                        placeholder="Ketik/Pilih Supplier"
                      />
                      <datalist id="po-suppliers-list">
                        {suppliers.map(s => <option key={s.id} value={s.nama} />)}
                      </datalist>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Tanggal PO</label>
                      <input 
                        type="date"
                        value={poForm.tanggal}
                        onChange={(e) => setPoForm({ ...poForm, tanggal: e.target.value })}
                        className="p-2 border border-[#E2E8F0] rounded-lg text-sm bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Termin / Metode</label>
                      <select 
                        value={poForm.metode}
                        onChange={(e) => setPoForm({ ...poForm, metode: e.target.value })}
                        className="p-2 border border-[#E2E8F0] rounded-lg bg-white text-sm"
                      >
                        <option value="Tunai">Tunai Lunas</option>
                        <option value="Kredit 14 Hari">Kredit 14 Hari</option>
                        <option value="Kredit 30 Hari">Kredit 30 Hari</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Pajak (PPN 12%)</label>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={poForm.pajak}
                          onChange={(e) => setPoForm({ ...poForm, pajak: e.target.checked })}
                          className="w-4 h-4 accent-[#0EA5A4]"
                        />
                        <span className="text-xs font-semibold text-[#475569]">Aktifkan PPN 12%</span>
                      </label>
                    </div>
                  </div>

                  {/* PO Items Table */}
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-100 text-[#475569] text-xs font-semibold uppercase">
                        <th className="py-2.5 px-4 w-[45%]">Pilih Barang [SKU]</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Harga Unit (HPP)</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                        <th className="py-2.5 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poForm.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-[#E2E8F0]">
                          <td className="py-2 px-4">
                            <select 
                              value={item.sku}
                              onChange={(e) => handlePoItemChange(idx, e.target.value, item.qty, item.harga)}
                              className="w-full p-2 border border-[#E2E8F0] rounded bg-white"
                            >
                              <option value="">-- Pilih Barang --</option>
                              {products.map(p => <option key={p.sku} value={p.sku}>[{p.sku}] {p.nama}</option>)}
                            </select>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <input 
                              type="number" 
                              value={item.qty}
                              onChange={(e) => handlePoItemChange(idx, item.sku, parseInt(e.target.value) || 0, item.harga)}
                              className="w-16 p-2 border border-[#E2E8F0] rounded text-center font-mono"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={item.harga}
                              onChange={(e) => handlePoItemChange(idx, item.sku, item.qty, parseFloat(e.target.value) || 0)}
                              className="w-full p-2 border border-[#E2E8F0] rounded text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-bold">
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button 
                              onClick={() => handleRemovePoItem(idx)}
                              className="text-[#EF4444] hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button 
                    onClick={handleAddPoItem}
                    className="w-full py-2 border border-dashed border-[#0EA5A4] text-[#0EA5A4] hover:bg-[#F0FDF4] rounded-lg font-bold text-xs"
                  >
                    + Tambah Baris Baru
                  </button>

                  <div className="flex justify-between items-start border-t border-[#E2E8F0] pt-6">
                    <div className="w-1/2 flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Memo / Catatan PO</label>
                      <textarea 
                        value={poForm.catatan}
                        onChange={(e) => setPoForm({ ...poForm, catatan: e.target.value })}
                        placeholder="Memo logs..."
                        className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm h-16 resize-none"
                      />
                    </div>
                    <div className="w-80 bg-gray-50 p-4 rounded-xl space-y-2 text-sm font-semibold">
                      <div className="flex justify-between text-[#64748B]">
                        <span>Subtotal</span>
                        <span>Rp {poForm.items.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString('id-ID')}</span>
                      </div>
                      {poForm.pajak && (
                        <div className="flex justify-between text-[#64748B]">
                          <span>PPN (12%)</span>
                          <span>Rp {Math.round(poForm.items.reduce((sum, item) => sum + item.subtotal, 0) * 0.12).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-[#1E293B] border-t border-[#E2E8F0] pt-2">
                        <span>TOTAL AKHIR</span>
                        <span className="text-[#0EA5A4]">
                          Rp {(
                            poForm.items.reduce((sum, item) => sum + item.subtotal, 0) + 
                            (poForm.pajak ? Math.round(poForm.items.reduce((sum, item) => sum + item.subtotal, 0) * 0.12) : 0)
                          ).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
                    <button onClick={() => setShowPoForm(false)} className="px-4 py-2.5 text-sm font-semibold border border-[#E2E8F0] hover:bg-gray-100 rounded-lg">Batal</button>
                    <button onClick={() => handleSavePO(true)} className="px-4 py-2.5 text-sm font-semibold bg-[#1E293B] text-[#CBD5E1] rounded-lg">Simpan Draft</button>
                    <button onClick={() => handleSavePO(false)} className="px-5 py-2.5 text-sm font-semibold bg-[#0EA5A4] text-white rounded-lg">Rilis & Kirim PO</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: SALES ORDER (SO) TRACKER */}
          {activeTab === 'sales_order' && (
            <div className="space-y-6">
              {!showSoForm ? (
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="text-2xl font-bold text-[#1E293B]">Sales Order Tracker</h2>
                      <p className="text-sm text-[#475569]">Monitor pemesanan barang dari customer B2B, logistik gudang, dan piutang</p>
                    </div>
                    <button 
                      onClick={() => {
                        setSoForm({
                          id: '', pelanggan: '', tanggal: new Date().toISOString().split('T')[0],
                          metode: 'Tempo 30 Hari', items: [{ sku: '', qty: 1, harga: 0, subtotal: 0 }],
                          pajak: false, catatan: ''
                        });
                        setIsEditingSo(false);
                        setShowSoForm(true);
                      }}
                      className="bg-[#0EA5A4] hover:bg-[#0F766E] text-white px-4 py-2.5 rounded-lg flex items-center gap-2 font-bold text-sm shadow transition-all"
                    >
                      <Plus size={16} />
                      <span>Buat Sales Order Baru</span>
                    </button>
                  </div>

                  {/* Informative Tip Banner */}
                  <div className="bg-sky-50 border border-sky-200 text-sky-800 p-3.5 rounded-lg text-xs flex items-center gap-2.5 shadow-sm">
                    <span className="text-base">💡</span>
                    <span><strong>Tips Operasional:</strong> Klik pada baris transaksi manapun untuk membuka panel <strong>Detail Transaksi</strong>. Dari sana Anda bisa mengelola pengiriman barang, melunasi pembayaran, mencatat retur barang dari customer, serta melakukan pembatalan (void).</span>
                  </div>

                  {/* SO List Table */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="bg-[#0EA5A4] text-white text-xs font-black uppercase tracking-wider border-b border-teal-600">
                            <th className="py-3.5 px-4">No. SO</th>
                            <th className="py-3.5 px-4">Tanggal SO</th>
                            <th className="py-3.5 px-4">Customer</th>
                            <th className="py-3.5 px-4">Metode Bayar</th>
                            <th className="py-3.5 px-4 text-right">Total Tagihan</th>
                            <th className="py-3.5 px-4 text-center">Status Logistik</th>
                            <th className="py-3.5 px-4 text-center">Status Keuangan</th>
                            <th className="py-3.5 px-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {salesOrders.map(so => (
                            <tr key={so.id} onClick={() => { setSelectedSo(so); setSoActionForm(null); }} className="hover:bg-teal-50 hover:bg-opacity-30 cursor-pointer transition-colors">
                              <td className="py-4 px-4 font-mono font-bold text-xs text-[#1E293B]">{so.id}</td>
                              <td className="py-4 px-4 text-xs">{so.tanggal}</td>
                              <td className="py-4 px-4 font-semibold">{so.pelanggan}</td>
                              <td className="py-4 px-4 text-xs">{so.metode}</td>
                              <td className="py-4 px-4 text-right font-bold text-xs">Rp {so.grandTotal.toLocaleString('id-ID')}</td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai' ? 'bg-[#22C55E] bg-opacity-10 text-[#22C55E]' :
                                  so.statusLogistik === 'Void' ? 'bg-gray-100 text-gray-500' :
                                  'bg-[#F59E0B] bg-opacity-10 text-[#F59E0B]'
                                }`}>
                                  {so.statusLogistik}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  so.statusBayar === 'Lunas' ? 'bg-[#22C55E] bg-opacity-10 text-[#22C55E]' :
                                  so.statusBayar === 'Belum Lunas' ? 'bg-[#EF4444] bg-opacity-10 text-[#EF4444]' :
                                  'bg-gray-100 text-gray-500'
                                }`}>
                                  {so.statusBayar}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-center">
                                <div className="flex justify-center items-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleVoidSO(so.id); }}
                                    className="px-2 py-1 text-xs font-semibold bg-[#EF4444] bg-opacity-10 text-[#EF4444] hover:bg-opacity-20 rounded"
                                    disabled={so.statusLogistik === 'Void'}
                                  >
                                    Void
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                // SO Creation Panel (Batch mode)
                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
                  <div className="border-b border-[#E2E8F0] pb-4 flex justify-between items-center">
                    <h3 className="font-bold text-[#1E293B] text-lg">Buat Sales Order Baru (Batch Mode)</h3>
                    <button onClick={() => setShowSoForm(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-xl">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Pelanggan (Customer)</label>
                      <input 
                        type="text"
                        list="so-customers-list"
                        value={soForm.pelanggan}
                        onChange={(e) => setSoForm({ ...soForm, pelanggan: e.target.value })}
                        className="p-2 border border-[#E2E8F0] rounded-lg bg-white text-sm"
                        placeholder="Ketik/Pilih Customer"
                      />
                      <datalist id="so-customers-list">
                        {customers.map(c => <option key={c.id} value={c.nama} />)}
                      </datalist>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Tanggal SO</label>
                      <input 
                        type="date"
                        value={soForm.tanggal}
                        onChange={(e) => setSoForm({ ...soForm, tanggal: e.target.value })}
                        className="p-2 border border-[#E2E8F0] rounded-lg text-sm bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Termin / Metode</label>
                      <select 
                        value={soForm.metode}
                        onChange={(e) => setSoForm({ ...soForm, metode: e.target.value })}
                        className="p-2 border border-[#E2E8F0] rounded-lg bg-white text-sm"
                      >
                        <option value="Tunai">Tunai Lunas</option>
                        <option value="Tempo 14 Hari">Tempo 14 Hari</option>
                        <option value="Tempo 30 Hari">Tempo 30 Hari</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Pajak (PPN 12%)</label>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={soForm.pajak}
                          onChange={(e) => setSoForm({ ...soForm, pajak: e.target.checked })}
                          className="w-4 h-4 accent-[#0EA5A4]"
                        />
                        <span className="text-xs font-semibold text-[#475569]">Aktifkan PPN 12%</span>
                      </label>
                    </div>
                  </div>

                  {/* SO Items Table */}
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-100 text-[#475569] text-xs font-semibold uppercase">
                        <th className="py-2.5 px-4 w-[45%]">Pilih Roti / Barang Jadi [SKU]</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Harga Jual</th>
                        <th className="py-2.5 px-4 text-right">Subtotal</th>
                        <th className="py-2.5 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {soForm.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-[#E2E8F0]">
                          <td className="py-2 px-4">
                            <select 
                              value={item.sku}
                              onChange={(e) => handleSoItemChange(idx, 'sku', e.target.value)}
                              className="w-full p-2 border border-[#E2E8F0] rounded bg-white"
                            >
                              <option value="">-- Pilih Barang Jadi --</option>
                              {products.filter(p => p.kategori === 'Barang Jadi').map(p => (
                                <option key={p.sku} value={p.sku}>[{p.sku}] {p.nama} (Stok: {p.stok})</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 px-4 text-center">
                            <input 
                              type="number" 
                              value={item.qty}
                              onChange={(e) => handleSoItemChange(idx, 'qty', e.target.value)}
                              className="w-16 p-2 border border-[#E2E8F0] rounded text-center font-mono"
                            />
                          </td>
                          <td className="py-2 px-4">
                            <input 
                              type="number" 
                              value={item.harga}
                              onChange={(e) => handleSoItemChange(idx, 'harga', e.target.value)}
                              className="w-full p-2 border border-[#E2E8F0] rounded text-right font-mono"
                            />
                          </td>
                          <td className="py-2 px-4 text-right font-mono font-bold">
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-2 px-4 text-center">
                            <button 
                              onClick={() => handleRemoveSoItem(idx)}
                              className="text-[#EF4444] hover:text-red-700"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <button 
                    onClick={handleAddSoItem}
                    className="w-full py-2 border border-dashed border-[#0EA5A4] text-[#0EA5A4] hover:bg-[#F0FDF4] rounded-lg font-bold text-xs"
                  >
                    + Tambah Baris Baru
                  </button>

                  <div className="flex justify-between items-start border-t border-[#E2E8F0] pt-6">
                    <div className="w-1/2 flex flex-col gap-1.5">
                      <label className="text-xs font-bold text-[#475569] uppercase">Catatan Pengiriman / Memo</label>
                      <textarea 
                        value={soForm.catatan}
                        onChange={(e) => setSoForm({ ...soForm, catatan: e.target.value })}
                        placeholder="Memo logs..."
                        className="border border-[#E2E8F0] p-2.5 rounded-lg text-sm h-16 resize-none"
                      />
                    </div>
                    <div className="w-80 bg-gray-50 p-4 rounded-xl space-y-2 text-sm font-semibold">
                      <div className="flex justify-between text-[#64748B]">
                        <span>Subtotal</span>
                        <span>Rp {soForm.items.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString('id-ID')}</span>
                      </div>
                      {soForm.pajak && (
                        <div className="flex justify-between text-[#64748B]">
                          <span>PPN (12%)</span>
                          <span>Rp {Math.round(soForm.items.reduce((sum, item) => sum + item.subtotal, 0) * 0.12).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-[#1E293B] border-t border-[#E2E8F0] pt-2">
                        <span>TOTAL AKHIR</span>
                        <span className="text-[#0EA5A4]">
                          Rp {(
                            soForm.items.reduce((sum, item) => sum + item.subtotal, 0) + 
                            (soForm.pajak ? Math.round(soForm.items.reduce((sum, item) => sum + item.subtotal, 0) * 0.12) : 0)
                          ).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-[#E2E8F0] pt-4">
                    <button onClick={() => setShowSoForm(false)} className="px-4 py-2.5 text-sm font-semibold border border-[#E2E8F0] hover:bg-gray-100 rounded-lg">Batal</button>
                    <button onClick={() => handleSaveSalesOrder(true)} className="px-4 py-2.5 text-sm font-semibold bg-[#1E293B] text-[#CBD5E1] rounded-lg">Simpan Draft</button>
                    <button onClick={() => handleSaveSalesOrder(false)} className="px-5 py-2.5 text-sm font-semibold bg-[#0EA5A4] text-white rounded-lg">Rilis & Kirim SO</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: CUSTOMER & SUPPLIER */}
          {activeTab === 'relasi' && (
            <div className="space-y-8">
              {/* Sub-Tabs Selector for Customer & Supplier */}
              <div className="flex gap-4 border-b border-[#E2E8F0] pb-px mb-2">
                <button 
                  onClick={() => setRelasiTab('daftar')} 
                  className={`pb-3 font-semibold text-sm transition-all relative ${relasiTab === 'daftar' ? 'text-[#0EA5A4] border-b-2 border-[#0EA5A4] font-extrabold' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  👥 Database Relasi (Daftar)
                </button>
                <button 
                  onClick={() => setRelasiTab('spreadsheet_customer')} 
                  className={`pb-3 font-semibold text-sm flex items-center gap-1.5 transition-all relative ${relasiTab === 'spreadsheet_customer' ? 'text-[#0EA5A4] border-b-2 border-[#0EA5A4] font-extrabold' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  <FileSpreadsheet size={16} />
                  <span>📊 Buku Besar Pelanggan</span>
                </button>
                <button 
                  onClick={() => setRelasiTab('spreadsheet_supplier')} 
                  className={`pb-3 font-semibold text-sm flex items-center gap-1.5 transition-all relative ${relasiTab === 'spreadsheet_supplier' ? 'text-[#0EA5A4] border-b-2 border-[#0EA5A4] font-extrabold' : 'text-gray-500 hover:text-gray-800'}`}
                >
                  <FileSpreadsheet size={16} />
                  <span>📊 Buku Besar Supplier</span>
                </button>
              </div>

              {relasiTab === 'daftar' && (
                <>
                  {/* Customer Section */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-bold text-[#1E293B]">Database Pelanggan (Customer B2B)</h2>
                        <p className="text-xs text-[#64748B]">Kelola alamat kirim, data kontak, dan monitoring saldo piutang aktif</p>
                      </div>
                      <button 
                        onClick={() => {
                          setCustomerForm({ id: '', nama: '', kontak: '', email: '', telp: '', alamat: '', piutang: 0 });
                          setIsEditingCustomer(false);
                          setShowCustomerModal(true);
                        }}
                        className="bg-[#0EA5A4] text-white px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
                      >
                        <Plus size={14} />
                        <span>Daftar Pelanggan Baru</span>
                      </button>
                    </div>

                    <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-[#0EA5A4] text-white text-xs font-black uppercase tracking-wider">
                          <tr>
                            <th className="py-3 px-4">ID Customer</th>
                            <th className="py-3 px-4">Nama Instansi</th>
                            <th className="py-3 px-4">Kontak PIC</th>
                            <th className="py-3 px-4">Email</th>
                            <th className="py-3 px-4">Telepon</th>
                            <th className="py-3 px-4">Alamat Kirim</th>
                            <th className="py-3 px-4 text-right">Saldo Piutang</th>
                            <th className="py-3 px-4 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0]">
                          {customers.map(c => (
                            <tr key={c.id} className="hover:bg-gray-50 text-xs">
                              <td className="py-3 px-4 font-mono font-bold">
                                <button 
                                  onClick={() => setViewingCustomerTx(c)}
                                  className="hover:underline font-mono font-bold text-[#0EA5A4] hover:text-[#0F766E] transition-all text-left"
                                  title="Klik untuk rincian transaksi"
                                >
                                  {c.id}
                                </button>
                              </td>
                              <td className="py-3 px-4 font-bold text-[#1E293B]">
                                <button 
                                  onClick={() => setViewingCustomerTx(c)}
                                  className="hover:underline font-bold text-[#1E293B] hover:text-[#0EA5A4] transition-all text-left"
                                  title="Klik untuk rincian transaksi"
                                >
                                  {c.nama}
                                </button>
                              </td>
                              <td className="py-3 px-4 font-medium">{c.kontak}</td>
                              <td className="py-3 px-4">{c.email}</td>
                              <td className="py-3 px-4">{c.telp}</td>
                              <td className="py-3 px-4 max-w-[200px] truncate">{c.alamat}</td>
                              <td className="py-3 px-4 text-right font-bold font-mono text-[#0EA5A4]">Rp {c.piutang.toLocaleString('id-ID')}</td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex justify-center items-center gap-1.5">
                                  <button 
                                    onClick={() => setViewingCustomerTx(c)}
                                    title="Rincian Transaksi"
                                    className="text-gray-500 hover:text-[#0EA5A4] p-1"
                                  >
                                    <Eye size={14} />
                                  </button>
                                  <button 
                                    onClick={() => {
                                      setCustomerForm(c);
                                      setIsEditingCustomer(true);
                                      setShowCustomerModal(true);
                                    }}
                                    title="Edit Data"
                                    className="text-gray-500 hover:text-[#0EA5A4] p-1"
                                  >
                                    <Edit3 size={14} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

              {/* Supplier Section */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-[#1E293B]">Database Supplier & Vendor</h2>
                    <p className="text-xs text-[#64748B]">Kelola data vendor tepung, gula, mentega, kemasan, beserta tagihan/hutang aktif</p>
                  </div>
                  <button 
                    onClick={() => {
                      setSupplierForm({ id: '', nama: '', kontak: '', email: '', telp: '', alamat: '', hutang: 0 });
                      setIsEditingSupplier(false);
                      setShowSupplierModal(true);
                    }}
                    className="bg-[#0EA5A4] text-white px-3 py-2 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
                  >
                    <Plus size={14} />
                    <span>Daftar Supplier Baru</span>
                  </button>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-[#0EA5A4] text-white text-xs font-black uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">ID Supplier</th>
                        <th className="py-3 px-4">Nama Perusahaan</th>
                        <th className="py-3 px-4">Kontak PIC</th>
                        <th className="py-3 px-4">Email</th>
                        <th className="py-3 px-4">Telepon</th>
                        <th className="py-3 px-4">Alamat Gudang</th>
                        <th className="py-3 px-4 text-right">Saldo Hutang</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {suppliers.map(s => (
                        <tr key={s.id} className="hover:bg-gray-50 text-xs">
                          <td className="py-3 px-4">
                            <button 
                              onClick={() => setViewingSupplierTx(s)}
                              className="hover:underline font-mono font-bold text-[#0EA5A4] hover:text-[#0F766E] transition-all text-left"
                              title="Klik untuk rincian transaksi"
                            >
                              {s.id}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <button 
                              onClick={() => setViewingSupplierTx(s)}
                              className="hover:underline font-bold text-[#1E293B] hover:text-[#0EA5A4] transition-all text-left font-sans"
                              title="Klik untuk rincian transaksi"
                            >
                              {s.nama}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-medium">{s.kontak}</td>
                          <td className="py-3 px-4">{s.email}</td>
                          <td className="py-3 px-4">{s.telp}</td>
                          <td className="py-3 px-4 max-w-[200px] truncate">{s.alamat}</td>
                          <td className="py-3 px-4 text-right font-bold font-mono text-[#EF4444]">Rp {s.hutang.toLocaleString('id-ID')}</td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <button 
                                onClick={() => setViewingSupplierTx(s)}
                                title="Rincian Transaksi"
                                className="text-gray-500 hover:text-[#0EA5A4] p-1"
                              >
                                <Eye size={14} />
                              </button>
                              <button 
                                onClick={() => {
                                  setSupplierForm(s);
                                  setIsEditingSupplier(true);
                                  setShowSupplierModal(true);
                                }}
                                title="Edit Data"
                                className="text-gray-500 hover:text-[#0EA5A4] p-1"
                              >
                                <Edit3 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
                </>
              )}

              {relasiTab === 'spreadsheet_customer' && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-xs">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Buku Besar Pembantu Piutang Pelanggan (Ledger Spreadsheet)</h3>
                      <p className="text-xs text-slate-500">Mencatat mutasi debit piutang dagang dan kredit setoran pelunasan pelanggan secara realtime</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (selectedCustomerId) {
                          getOrInitCustomerLedger(selectedCustomerId, true);
                          triggerToast(`Buku besar customer ${selectedCustomerId} berhasil disinkronisasi ulang!`, 'success');
                        }
                      }}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
                    >
                      <span>🔄 Sinkronisasi Ulang dari Database</span>
                    </button>
                  </div>

                  {/* Customer Spreadsheet Tabs */}
                  <div className="flex gap-1 overflow-x-auto border-b border-gray-200 scrollbar-thin">
                    {customers.map(c => (
                      <button 
                        key={c.id} 
                        onClick={() => setSelectedCustomerId(c.id)} 
                        className={`px-4 py-2 rounded-t-xl font-mono text-xs border-r border-t border-l transition-all duration-150 whitespace-nowrap ${selectedCustomerId === c.id ? 'bg-white border-gray-300 font-bold text-[#0EA5A4] shadow-xs' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                      >
                        👥 {c.id} ({c.nama})
                      </button>
                    ))}
                  </div>

                  {selectedCustomerId && customers.find(c => c.id === selectedCustomerId) ? (
                    <div className="space-y-4">
                      <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-200 flex flex-wrap justify-between items-center text-xs gap-2">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-slate-400">Instansi:</span>{' '}
                            <span className="font-bold text-slate-700">{customers.find(c => c.id === selectedCustomerId)?.nama}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">PIC Kontak:</span>{' '}
                            <span className="font-bold text-slate-700">{customers.find(c => c.id === selectedCustomerId)?.kontak}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Saldo Piutang Aktif:</span>{' '}
                            <span className="font-mono font-bold text-[#0EA5A4] bg-teal-50 px-1.5 py-0.5 rounded border border-teal-100">Rp {customers.find(c => c.id === selectedCustomerId)?.piutang.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>
                      <SpreadsheetComponent 
                        headers={['Tanggal', 'No. Invoice / Transaksi', 'Nilai Penjualan (Debit)', 'Jumlah Pembayaran (Kredit)', 'Saldo Piutang', 'Status Pelunasan', 'Metode & Ref', 'Catatan']}
                        rows={getOrInitCustomerLedger(selectedCustomerId)}
                        onChangeCell={(r, c, val) => handleCustomerCellChange(selectedCustomerId, r, c, val)}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">
                      Pilih tab customer di atas untuk memuat lembar buku besar pembantu piutang.
                    </div>
                  )}
                </div>
              )}

              {relasiTab === 'spreadsheet_supplier' && (
                <div className="space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 border border-slate-200 rounded-xl shadow-xs">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">Buku Besar Pembantu Hutang Supplier (Ledger Spreadsheet)</h3>
                      <p className="text-xs text-slate-500">Mencatat mutasi kredit tagihan pembelian bahan baku dan debit pembayaran kas ke supplier</p>
                    </div>
                    <button 
                      onClick={() => {
                        if (selectedSupplierId) {
                          getOrInitSupplierLedger(selectedSupplierId, true);
                          triggerToast(`Buku besar supplier ${selectedSupplierId} berhasil disinkronisasi ulang!`, 'success');
                        }
                      }}
                      className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-bold transition-all shadow-xs"
                    >
                      <span>🔄 Sinkronisasi Ulang dari Database</span>
                    </button>
                  </div>

                  {/* Supplier Spreadsheet Tabs */}
                  <div className="flex gap-1 overflow-x-auto border-b border-gray-200 scrollbar-thin">
                    {suppliers.map(s => (
                      <button 
                        key={s.id} 
                        onClick={() => setSelectedSupplierId(s.id)} 
                        className={`px-4 py-2 rounded-t-xl font-mono text-xs border-r border-t border-l transition-all duration-150 whitespace-nowrap ${selectedSupplierId === s.id ? 'bg-white border-gray-300 font-bold text-[#0EA5A4] shadow-xs' : 'bg-slate-50 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                      >
                        🏢 {s.id} ({s.nama})
                      </button>
                    ))}
                  </div>

                  {selectedSupplierId && suppliers.find(s => s.id === selectedSupplierId) ? (
                    <div className="space-y-4">
                      <div className="bg-slate-100/50 p-3 rounded-lg border border-slate-200 flex flex-wrap justify-between items-center text-xs gap-2">
                        <div className="flex items-center gap-4">
                          <div>
                            <span className="text-slate-400">Supplier:</span>{' '}
                            <span className="font-bold text-slate-700">{suppliers.find(s => s.id === selectedSupplierId)?.nama}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">PIC Kontak:</span>{' '}
                            <span className="font-bold text-slate-700">{suppliers.find(s => s.id === selectedSupplierId)?.kontak}</span>
                          </div>
                          <div>
                            <span className="text-slate-400">Saldo Hutang Aktif:</span>{' '}
                            <span className="font-mono font-bold text-[#EF4444] bg-red-50 px-1.5 py-0.5 rounded border border-red-100">Rp {suppliers.find(s => s.id === selectedSupplierId)?.hutang.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>
                      <SpreadsheetComponent 
                        headers={['Tanggal', 'No. Tagihan / Transaksi', 'Nilai Pembelian (Kredit)', 'Jumlah Pembayaran (Debit)', 'Saldo Hutang', 'Status Pelunasan', 'Metode & Ref', 'Catatan']}
                        rows={getOrInitSupplierLedger(selectedSupplierId)}
                        onChangeCell={(r, c, val) => handleSupplierCellChange(selectedSupplierId, r, c, val)}
                      />
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-500 text-sm">
                      Pilih tab supplier di atas untuk memuat lembar buku besar pembantu hutang.
                    </div>
                  )}
                </div>
              )}

              {/* Customer Modal Form */}
              {showCustomerModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                    <div className="bg-[#1E293B] text-white py-4 px-6 flex justify-between items-center">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <Users size={16} className="text-[#0EA5A4]" />
                        <span>{isEditingCustomer ? `Edit Customer [${customerForm.id}]` : 'Daftarkan Customer B2B Baru'}</span>
                      </h3>
                      <button onClick={() => setShowCustomerModal(false)} className="text-white hover:text-gray-300">&times;</button>
                    </div>
                    <form onSubmit={handleSaveCustomer} className="p-6 space-y-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[#64748B]">NAMA INSTANSI / USAHA</label>
                        <input type="text" value={customerForm.nama} onChange={(e) => setCustomerForm({ ...customerForm, nama: e.target.value })} className="border p-2.5 rounded-lg font-semibold" placeholder="Cth: PT. Serambi Bakery" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[#64748B]">NAMA PIC KONTAK</label>
                        <input type="text" value={customerForm.kontak} onChange={(e) => setCustomerForm({ ...customerForm, kontak: e.target.value })} className="border p-2.5 rounded-lg font-semibold" placeholder="Cth: Ahmad Sobari" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#64748B]">EMAIL</label>
                          <input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} className="border p-2.5 rounded-lg font-semibold" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#64748B]">TELEPON</label>
                          <input type="text" value={customerForm.telp} onChange={(e) => setCustomerForm({ ...customerForm, telp: e.target.value })} className="border p-2.5 rounded-lg font-semibold" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[#64748B]">ALAMAT KIRIM LENGKAP</label>
                        <textarea value={customerForm.alamat} onChange={(e) => setCustomerForm({ ...customerForm, alamat: e.target.value })} className="border p-2.5 rounded-lg h-16 resize-none font-semibold" />
                      </div>
                      <div className="flex justify-end gap-2 border-t pt-4">
                        <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
                        <button type="submit" className="px-5 py-2 bg-[#0EA5A4] text-white rounded-lg font-bold">Simpan</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Supplier Modal Form */}
              {showSupplierModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                  <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
                    <div className="bg-[#1E293B] text-white py-4 px-6 flex justify-between items-center">
                      <h3 className="font-bold text-sm flex items-center gap-2">
                        <Users size={16} className="text-[#0EA5A4]" />
                        <span>{isEditingSupplier ? `Edit Supplier [${supplierForm.id}]` : 'Daftarkan Supplier Baru'}</span>
                      </h3>
                      <button onClick={() => setShowSupplierModal(false)} className="text-white hover:text-gray-300">&times;</button>
                    </div>
                    <form onSubmit={handleSaveSupplier} className="p-6 space-y-4 text-sm">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[#64748B]">NAMA PERUSAHAAN</label>
                        <input type="text" value={supplierForm.nama} onChange={(e) => setSupplierForm({ ...supplierForm, nama: e.target.value })} className="border p-2.5 rounded-lg font-semibold" placeholder="Cth: CV. Tepung Wangi" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[#64748B]">NAMA PIC SALES</label>
                        <input type="text" value={supplierForm.kontak} onChange={(e) => setSupplierForm({ ...supplierForm, kontak: e.target.value })} className="border p-2.5 rounded-lg font-semibold" placeholder="Cth: Shinta Dewi" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#64748B]">EMAIL</label>
                          <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className="border p-2.5 rounded-lg font-semibold" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-bold text-[#64748B]">TELEPON</label>
                          <input type="text" value={supplierForm.telp} onChange={(e) => setSupplierForm({ ...supplierForm, telp: e.target.value })} className="border p-2.5 rounded-lg font-semibold" />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-bold text-[#64748B]">ALAMAT KANTOR / GUDANG</label>
                        <textarea value={supplierForm.alamat} onChange={(e) => setSupplierForm({ ...supplierForm, alamat: e.target.value })} className="border p-2.5 rounded-lg h-16 resize-none font-semibold" />
                      </div>
                      <div className="flex justify-end gap-2 border-t pt-4">
                        <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 border rounded-lg">Batal</button>
                        <button type="submit" className="px-5 py-2 bg-[#0EA5A4] text-white rounded-lg font-bold">Simpan</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: STOCK OPNAME & WASTE */}
          {activeTab === 'stock_opname' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Form Input Opname */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-6">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Input Penyesuaian Stok (SO)</h3>
                  <p className="text-xs text-[#64748B]">Sesuaikan selisih kuantitas fisik di gudang dengan data sistem</p>
                </div>

                <form onSubmit={handleStockOpname} className="space-y-4 text-sm font-semibold">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase">Tipe Penyesuaian</label>
                    <select 
                      value={opnameForm.tipe}
                      onChange={(e) => setOpnameForm({ ...opnameForm, tipe: e.target.value })}
                      className="p-2.5 border border-[#E2E8F0] rounded-lg bg-white"
                    >
                      <option value="OPNAME_PLUS">OPNAME PLUS (Stok Fisik Lebih Banyak)</option>
                      <option value="OPNAME_MINUS">OPNAME MINUS (Stok Fisik Lebih Sedikit)</option>
                      <option value="WASTAGE">WASTAGE (Barang Rusak / Dibuang)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase">Pilih SKU / Produk Target</label>
                    <select 
                      value={opnameForm.sku}
                      onChange={(e) => {
                        const target = products.find(p => p.sku === e.target.value);
                        setOpnameForm({ 
                          ...opnameForm, 
                          sku: e.target.value,
                          qtyFisik: target ? target.stok : 0
                        });
                      }}
                      className="p-2.5 border border-[#E2E8F0] rounded-lg bg-white"
                    >
                      <option value="">-- Pilih SKU Produk --</option>
                      {products.map(p => <option key={p.sku} value={p.sku}>[{p.sku}] {p.nama} (Stok: {p.stok})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5 bg-gray-50 p-3 rounded-lg">
                      <span className="text-[9px] font-bold text-[#64748B] uppercase">Stok Sistem Saat Ini</span>
                      <span className="text-xl font-bold font-mono text-[#1E293B]">
                        {products.find(p => p.sku === opnameForm.sku)?.stok || 0}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5 bg-[#F0FDF4] p-3 rounded-lg border border-[#22C55E] border-opacity-30">
                      <span className="text-[9px] font-bold text-[#166534] uppercase">
                        {opnameForm.tipe === 'WASTAGE' ? 'Qty Dibuang' : 'Kuantitas Fisik Aktual'}
                      </span>
                      <input 
                        type="number" 
                        value={opnameForm.qtyFisik}
                        onChange={(e) => setOpnameForm({ ...opnameForm, qtyFisik: parseFloat(e.target.value) || 0 })}
                        className="text-xl font-bold font-mono text-[#0EA5A4] bg-transparent outline-none border-b border-[#0EA5A4] border-opacity-50"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase">Catatan / Alasan Audit</label>
                    <textarea 
                      value={opnameForm.catatan}
                      onChange={(e) => setOpnameForm({ ...opnameForm, catatan: e.target.value })}
                      placeholder="Cth: Roti kempes, salah hitung..."
                      className="border p-2.5 rounded-lg h-20 resize-none text-xs font-normal"
                    />
                  </div>

                  <button 
                    type="submit"
                    className="w-full py-3 bg-[#0EA5A4] hover:bg-[#0F766E] text-white rounded-lg font-bold shadow text-sm transition-all"
                  >
                    💾 Rekon & Simpan Log Stok
                  </button>
                </form>
              </div>

              {/* Log Penyesuaian Audit Trail */}
              <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm p-6 space-y-4">
                <div>
                  <h3 className="text-base font-bold text-[#1E293B]">Audit Trail Log Stock Opname</h3>
                  <p className="text-xs text-[#64748B]">Riwayat penyesuaian inventori kronologis untuk validasi akuntan</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="bg-gray-100 text-[#475569] font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Tanggal</th>
                        <th className="py-2.5 px-3">SKU</th>
                        <th className="py-2.5 px-3">Nama Produk</th>
                        <th className="py-2.5 px-3 text-center">Tipe</th>
                        <th className="py-2.5 px-3 text-center">Selisih</th>
                        <th className="py-2.5 px-3 text-right">Kerugian HPP</th>
                        <th className="py-2.5 px-3">Operator</th>
                        <th className="py-2.5 px-3">Alasan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0]">
                      {opnameLog.map((log, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="py-3 px-3 font-mono">{log.tanggal}</td>
                          <td className="py-3 px-3 font-mono text-[#0EA5A4] font-bold">{log.sku}</td>
                          <td className="py-3 px-3 font-medium text-slate-800">{log.nama}</td>
                          <td className="py-3 px-3 text-center">
                            <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-bold ${
                              log.tipe === 'OPNAME_PLUS' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {log.tipe}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center font-bold font-mono">{log.selisih} {log.satuan}</td>
                          <td className={`py-3 px-3 text-right font-mono font-bold ${log.subtotal < 0 ? 'text-[#EF4444]' : 'text-[#22C55E]'}`}>
                            {log.subtotal < 0 ? '-' : '+'}Rp {Math.abs(log.subtotal).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-3 text-slate-500 font-semibold">{log.operator}</td>
                          <td className="py-3 px-3 text-xs italic text-slate-400 max-w-[150px] truncate">{log.catatan}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: LAPORAN KEUANGAN & STOK (REPORTS HUB) */}
          {activeTab === 'laporan_psak' && (
            <div className="space-y-6">
              {/* Dynamic Print CSS Injector for Flawless Printing */}
              <style dangerouslySetInnerHTML={{__html: `
                @media print {
                  body {
                    background: white !important;
                    color: black !important;
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    font-family: sans-serif !important;
                  }
                  header, footer, nav, aside, .no-print, button, input[type="checkbox"], select, .modal, [role="dialog"], #stok-control-panel {
                    display: none !important;
                  }
                  main {
                    padding: 0 !important;
                    margin: 0 !important;
                    max-width: 100% !important;
                    width: 100% !important;
                  }
                  .print-report-card {
                    border: none !important;
                    box-shadow: none !important;
                    padding: 0 !important;
                    margin: 0 auto !important;
                    max-width: 100% !important;
                    width: 100% !important;
                    display: block !important;
                  }
                  /* Tables pristine alignment on paper */
                  table {
                    width: 100% !important;
                    border-collapse: collapse !important;
                  }
                  th, td {
                    border: 1px solid #cbd5e1 !important;
                    color: black !important;
                    background: transparent !important;
                    padding: 4px 6px !important;
                    font-size: 8px !important;
                  }
                  th {
                    background-color: #f1f5f9 !important;
                    font-weight: bold !important;
                  }
                  @page {
                    size: ${reportSubTab === 'stok_bulanan' || reportSubTab === 'penjualan_harian' ? 'A3 landscape' : 'A4 portrait'};
                    margin: 1.2cm 1cm 1.2cm 1cm;
                  }
                }
              `}} />

              {/* Report Hub Header */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[#E2E8F0] pb-4 gap-4 no-print">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                    <span>📊 Pusat Laporan Bisnis</span>
                    <span className="text-xs font-normal text-[#0EA5A4] bg-teal-50 px-2 py-0.5 rounded border border-teal-200">Xero Premium Edition</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Laba rugi, arus kas, pemantauan stok 12 bulan, penjualan harian detail, dan konsinyasi retail.</p>
                </div>
                
                <div className="flex flex-col items-end gap-1">
                  <button 
                    onClick={() => {
                      window.focus();
                      window.print();
                    }}
                    className="bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white px-4 py-2.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Printer size={13} />
                    <span>Cetak / Simpan PDF</span>
                  </button>
                  <span className="text-[10px] text-slate-400 max-w-[240px] text-right leading-tight">
                    *Jika cetak tidak merespon di AI Studio, klik ikon <strong>Buka di Tab Baru</strong> di kanan atas preview.
                  </span>
                </div>
              </div>

              {/* Sub Navigation Tabs for Reports */}
              <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-1 no-print">
                <button
                  onClick={() => setReportSubTab('laba_rugi')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${reportSubTab === 'laba_rugi' ? 'bg-[#0EA5A4] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <TrendingUp size={14} />
                  <span>Laba Rugi (P&amp;L)</span>
                </button>
                
                <button
                  onClick={() => setReportSubTab('arus_kas')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${reportSubTab === 'arus_kas' ? 'bg-[#0EA5A4] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <DollarSign size={14} />
                  <span>Arus Kas (Cash Flow)</span>
                </button>
                
                <button
                  onClick={() => setReportSubTab('konsinyasi')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${reportSubTab === 'konsinyasi' ? 'bg-[#0EA5A4] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Users size={14} />
                  <span>Konsinyasi Retail</span>
                </button>
                
                <button
                  onClick={() => setReportSubTab('stok_bulanan')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${reportSubTab === 'stok_bulanan' ? 'bg-[#0EA5A4] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <Package size={14} />
                  <span>Summary Stok Bulanan</span>
                </button>
                
                <button
                  onClick={() => setReportSubTab('penjualan_harian')}
                  className={`px-4 py-2.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${reportSubTab === 'penjualan_harian' ? 'bg-[#0EA5A4] text-white shadow-sm font-extrabold' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <FileSpreadsheet size={14} />
                  <span>Penjualan Harian</span>
                </button>
              </div>

              {/* REPORT CONTENTS */}
              
              {/* 1. LABA RUGI */}
              {reportSubTab === 'laba_rugi' && (() => {
                const filteredSos = salesOrders.filter(so => so.tanggal >= analitikStartDate && so.tanggal <= analitikEndDate && so.statusLogistik !== 'Void');
                
                const totalRevenue = filteredSos.reduce((sum, so) => sum + so.subtotal, 0);
                
                const totalHpp = filteredSos.reduce((sum, so) => {
                  return sum + so.items.reduce((itemSum: number, item: any) => {
                    const target = products.find(p => p.sku === item.sku);
                    const itemHpp = target ? target.hpp : 12000;
                    return itemSum + (item.qty * itemHpp);
                  }, 0);
                }, 0);

                const labaKotor = totalRevenue - totalHpp;

                // Dynamic Opex based on cash ledger
                const filteredOpex = cashLedger.filter(c => 
                  c.tanggal >= analitikStartDate && 
                  c.tanggal <= analitikEndDate && 
                  c.kategori !== 'Pembelian' && 
                  c.kategori !== 'Modal' && 
                  c.kredit > 0
                );
                
                const opexBreakdown = filteredOpex.reduce((acc: any, item: any) => {
                  const cat = item.kategori || 'Operasional Lain';
                  acc[cat] = (acc[cat] || 0) + item.kredit;
                  return acc;
                }, {});

                const totalOpex = filteredOpex.reduce((sum, c) => sum + c.kredit, 0);
                const labaBersih = labaKotor - totalOpex;

                return (
                  <div className="space-y-6">
                    {/* Date Filters */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#0EA5A4] rounded-full"></span>
                        <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Filter Periode Laporan</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="date" 
                          value={analitikStartDate}
                          onChange={(e) => setAnalitikStartDate(e.target.value)}
                          className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" 
                        />
                        <span className="text-slate-400 font-bold text-xs">&rarr;</span>
                        <input 
                          type="date" 
                          value={analitikEndDate}
                          onChange={(e) => setAnalitikEndDate(e.target.value)}
                          className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" 
                        />
                      </div>
                    </div>

                    {/* Profit and Loss Statement */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-8 max-w-3xl mx-auto space-y-6 print-report-card">
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-black text-slate-800 tracking-wide uppercase">LAPORAN LABA RUGI</h3>
                        <p className="text-xs text-[#0EA5A4] font-black tracking-widest">CV. SOURDOUGH ABADI &bull; SAK-EMKM</p>
                        <p className="text-[11px] text-slate-500 font-mono">Periode: {analitikStartDate} s/d {analitikEndDate} (IDR)</p>
                      </div>

                      <div className="space-y-4 text-xs font-semibold">
                        {/* Revenue */}
                        <div className="flex justify-between text-sm font-extrabold border-b pb-1.5 text-slate-800">
                          <span>1. PENDAPATAN OPERASIONAL</span>
                          <span className="font-mono">Rp {totalRevenue.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="space-y-1 pl-4 text-slate-500 text-[11px]">
                          <div className="flex justify-between">
                            <span>Penjualan Barang Jadi Retail &amp; Grosir</span>
                            <span className="font-mono">Rp {totalRevenue.toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        {/* HPP */}
                        <div className="flex justify-between text-sm font-extrabold border-b pb-1.5 text-slate-800">
                          <span>2. BEBAN POKOK PENJUALAN (HPP)</span>
                          <span className="font-mono text-rose-600">-Rp {totalHpp.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="space-y-1 pl-4 text-slate-500 text-[11px]">
                          <div className="flex justify-between">
                            <span>Beban Pokok Penjualan (HPP Standard Average)</span>
                            <span className="font-mono">-Rp {totalHpp.toLocaleString('id-ID')}</span>
                          </div>
                        </div>

                        {/* Gross Profit */}
                        <div className="flex justify-between text-xs font-extrabold text-teal-700 bg-teal-50 p-2.5 rounded border border-teal-200 border-opacity-35">
                          <span>LABA KOTOR OPERASIONAL</span>
                          <span className="font-mono">Rp {labaKotor.toLocaleString('id-ID')}</span>
                        </div>

                        {/* OPEX */}
                        <div className="flex justify-between text-sm font-extrabold border-b pb-1.5 text-slate-800">
                          <span>3. BEBAN OPERASIONAL (OPEX)</span>
                          <span className="font-mono text-rose-600">-Rp {totalOpex.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="space-y-1.5 pl-4 text-slate-500 text-[11px]">
                          {Object.keys(opexBreakdown).length === 0 ? (
                            <div className="text-slate-400 italic">Tidak ada pengeluaran operasional tercatat pada periode ini.</div>
                          ) : (
                            Object.entries(opexBreakdown).map(([cat, val]: any) => (
                              <div key={cat} className="flex justify-between capitalize">
                                <span>Beban {cat}</span>
                                <span className="font-mono">-Rp {val.toLocaleString('id-ID')}</span>
                              </div>
                            ))
                          )}
                        </div>

                        {/* Net Profit */}
                        <div className={`flex justify-between text-base font-black p-4 rounded-xl border ${labaBersih >= 0 ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                          <span>LABA BERSIH (NET INCOME)</span>
                          <span className="font-mono">
                            {labaBersih < 0 ? '-' : ''}Rp {Math.abs(labaBersih).toLocaleString('id-ID')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 2. ARUS KAS */}
              {reportSubTab === 'arus_kas' && (() => {
                // Cash Ledger filters
                const periodCashTransactions = cashLedger.filter(c => c.tanggal >= analitikStartDate && c.tanggal <= analitikEndDate);
                
                // Operating Inflows (Penjualan / Client settlement)
                const cashInSales = periodCashTransactions
                  .filter(c => c.kategori === 'Penjualan')
                  .reduce((sum, c) => sum + c.debit, 0);

                // Operating Outflows (PO Pembelian / Suppliers)
                const cashOutSupplier = periodCashTransactions
                  .filter(c => c.kategori === 'Pembelian')
                  .reduce((sum, c) => sum + c.kredit, 0);

                // Operating Outflows (Opex - rent, util, salary)
                const cashOutOpex = periodCashTransactions
                  .filter(c => ['Sewa', 'Utilitas', 'Gaji', 'Operasional Lain'].includes(c.kategori))
                  .reduce((sum, c) => sum + c.kredit, 0);

                // Financing Inflows (Setoran modal)
                const cashInModal = periodCashTransactions
                  .filter(c => c.kategori === 'Modal')
                  .reduce((sum, c) => sum + c.debit, 0);

                // Net Cash Change
                const cashInFlow = cashInSales + cashInModal;
                const cashOutFlow = cashOutSupplier + cashOutOpex;
                const netCashChange = cashInFlow - cashOutFlow;

                // Find beginning cash balance (last record before start date)
                const beforeTxList = cashLedger.filter(c => c.tanggal < analitikStartDate);
                const beginningCash = beforeTxList.length > 0 ? beforeTxList[beforeTxList.length - 1].saldo : 25000000;
                const endingCash = beginningCash + netCashChange;

                return (
                  <div className="space-y-6">
                    {/* Date Filters duplicated for usability */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#0EA5A4] rounded-full"></span>
                        <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Filter Periode Arus Kas</h4>
                      </div>
                      <div className="flex items-center gap-3">
                        <input 
                          type="date" 
                          value={analitikStartDate}
                          onChange={(e) => setAnalitikStartDate(e.target.value)}
                          className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" 
                        />
                        <span className="text-slate-400 font-bold text-xs">&rarr;</span>
                        <input 
                          type="date" 
                          value={analitikEndDate}
                          onChange={(e) => setAnalitikEndDate(e.target.value)}
                          className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700" 
                        />
                      </div>
                    </div>

                    {/* Cash Flow direct report */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs p-8 max-w-3xl mx-auto space-y-6 print-report-card">
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-black text-slate-800 tracking-wide uppercase">LAPORAN ARUS KAS (CASH FLOW)</h3>
                        <p className="text-xs text-[#0EA5A4] font-black tracking-widest">METODE LANGSUNG (DIRECT METHOD)</p>
                        <p className="text-[11px] text-slate-500 font-mono">Periode: {analitikStartDate} s/d {analitikEndDate} (IDR)</p>
                      </div>

                      <div className="space-y-5 text-xs font-semibold">
                        {/* OPERATIONAL FLOWS */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-extrabold text-[#1E293B] border-b pb-1 uppercase tracking-wider text-[#0EA5A4]">1. Arus Kas dari Aktivitas Operasional</h4>
                          
                          <div className="pl-4 space-y-2 text-[11px]">
                            <div className="flex justify-between text-slate-600">
                              <span>Penerimaan Kas dari Pelanggan (SO Lunas)</span>
                              <span className="font-mono text-emerald-600">+Rp {cashInSales.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Pembayaran Kas kepada Pemasok (PO Bahan Baku)</span>
                              <span className="font-mono text-rose-600">-Rp {cashOutSupplier.toLocaleString('id-ID')}</span>
                            </div>
                            <div className="flex justify-between text-slate-600">
                              <span>Pembayaran Kas untuk Beban Operasional &amp; Gaji</span>
                              <span className="font-mono text-rose-600">-Rp {cashOutOpex.toLocaleString('id-ID')}</span>
                            </div>
                            
                            <div className="flex justify-between text-xs font-extrabold pt-2 border-t text-slate-700">
                              <span>Arus Kas Bersih dari Aktivitas Operasional</span>
                              <span className="font-mono">Rp {(cashInSales - cashOutSupplier - cashOutOpex).toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>

                        {/* FINANCING FLOWS */}
                        <div className="space-y-2">
                          <h4 className="text-sm font-extrabold text-[#1E293B] border-b pb-1 uppercase tracking-wider text-[#0EA5A4]">2. Arus Kas dari Aktivitas Pendanaan</h4>
                          
                          <div className="pl-4 space-y-2 text-[11px]">
                            <div className="flex justify-between text-slate-600">
                              <span>Setoran Modal Pemilik / Investor</span>
                              <span className="font-mono text-emerald-600">+Rp {cashInModal.toLocaleString('id-ID')}</span>
                            </div>
                            
                            <div className="flex justify-between text-xs font-extrabold pt-2 border-t text-slate-700">
                              <span>Arus Kas Bersih dari Aktivitas Pendanaan</span>
                              <span className="font-mono">Rp {cashInModal.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        </div>

                        {/* NET CALCULATION */}
                        <div className="pt-4 border-t-2 border-slate-200 space-y-2 text-xs">
                          <div className="flex justify-between font-bold text-slate-700">
                            <span>Kenaikan / (Penurunan) Kas Bersih Periode Ini</span>
                            <span className={`font-mono ${netCashChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {netCashChange >= 0 ? '+' : ''}Rp {netCashChange.toLocaleString('id-ID')}
                            </span>
                          </div>
                          <div className="flex justify-between text-slate-500">
                            <span>Saldo Awal Kas (Per {analitikStartDate})</span>
                            <span className="font-mono">Rp {beginningCash.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex justify-between text-sm font-black text-[#1E293B] bg-slate-100 p-3 rounded-lg border border-slate-200 mt-2">
                            <span>SALDO AKHIR KAS (Per {analitikEndDate})</span>
                            <span className="font-mono">Rp {endingCash.toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 3. LAPORAN KONSINYASI RETAIL */}
              {reportSubTab === 'konsinyasi' && (() => {
                // Calculate metrics
                const totalBatches = consignments.length;
                const totalSoldQty = consignments.reduce((sum, c) => sum + c.qtySold, 0);
                const totalGrossSales = consignments.reduce((sum, c) => sum + (c.qtySold * c.harga), 0);
                const totalCommissionEarned = consignments.reduce((sum, c) => sum + (c.qtySold * c.harga * (c.komisiPct / 100)), 0);
                const totalPayableToConsignor = totalGrossSales - totalCommissionEarned;

                // Handle submit for adding consignment
                const handleAddConsignment = (e: React.FormEvent) => {
                  e.preventDefault();
                  if (!consignmentForm.consignor || !consignmentForm.sku || !consignmentForm.nama) {
                    triggerToast('Semua kolom wajib diisi!', 'error');
                    return;
                  }
                  
                  const newConsignment = {
                    id: `CSG-202606${String(Math.floor(Math.random() * 90) + 10)}-00${consignments.length + 1}`,
                    tanggal: new Date().toISOString().split('T')[0],
                    consignor: consignmentForm.consignor,
                    sku: consignmentForm.sku,
                    nama: consignmentForm.nama,
                    qtyReceived: consignmentForm.qtyReceived,
                    qtySold: 0,
                    qtyReturned: 0,
                    harga: consignmentForm.harga,
                    komisiPct: consignmentForm.komisiPct,
                    status: 'Aktif',
                    catatan: consignmentForm.catatan || 'Konsinyasi baru'
                  };

                  setConsignments([newConsignment, ...consignments]);
                  setShowAddConsignmentModal(false);
                  setConsignmentForm({ consignor: '', sku: '', nama: '', qtyReceived: 10, harga: 10000, komisiPct: 20, catatan: '' });
                  triggerToast('Berhasil menambahkan penerimaan titipan konsinyasi!');
                };

                // Handle record consignment sales
                const handleSellConsignment = (e: React.FormEvent) => {
                  e.preventDefault();
                  const batch = consignments.find(c => c.id === consignmentSellForm.id);
                  if (!batch) {
                    triggerToast('Pilih batch konsinyasi terlebih dahulu!', 'error');
                    return;
                  }

                  const maxAvailable = batch.qtyReceived - batch.qtySold - batch.qtyReturned;
                  if (consignmentSellForm.qtySold > maxAvailable) {
                    triggerToast(`Kuantitas melebihi stok yang tersedia (${maxAvailable} pcs)!`, 'error');
                    return;
                  }

                  const updatedConsignments = consignments.map(c => {
                    if (c.id === batch.id) {
                      const newSold = c.qtySold + consignmentSellForm.qtySold;
                      const newStatus = (newSold + c.qtyReturned) >= c.qtyReceived ? 'Selesai' : 'Aktif';
                      return { ...c, qtySold: newSold, status: newStatus };
                    }
                    return c;
                  });

                  setConsignments(updatedConsignments);
                  setShowSellConsignmentModal(false);
                  triggerToast(`Berhasil mencatat penjualan ${consignmentSellForm.qtySold} pcs barang konsinyasi!`);
                };

                // Handle settle pay consignor
                const handleSettlePayout = (id: string) => {
                  const batch = consignments.find(c => c.id === id);
                  if (!batch) return;

                  const outstandingSold = batch.qtySold;
                  const grossVal = outstandingSold * batch.harga;
                  const comm = grossVal * (batch.komisiPct / 100);
                  const payoutAmount = grossVal - comm;

                  if (payoutAmount <= 0) {
                    triggerToast('Tidak ada dana yang perlu diselesaikan!', 'warning');
                    return;
                  }

                  // Add opex payment transaction to cash ledger
                  const newCashLog = {
                    id: `CSH-202606${String(Math.floor(Math.random() * 90) + 10)}-00${cashLedger.length + 1}`,
                    tanggal: new Date().toISOString().split('T')[0],
                    ref: batch.id,
                    keterangan: `Pelunasan Konsinyasi [${batch.id}] kepada ${batch.consignor}`,
                    kategori: 'Operasional Lain',
                    debit: 0,
                    kredit: payoutAmount,
                    saldo: (cashLedger[cashLedger.length - 1]?.saldo || 25000000) - payoutAmount
                  };

                  // Update batch to Selesai
                  const updatedConsignments = consignments.map(c => {
                    if (c.id === id) {
                      return { ...c, status: 'Selesai', catatan: `${c.catatan || ''} (Paid & Settled)` };
                    }
                    return c;
                  });

                  setCashLedger([...cashLedger, newCashLog]);
                  setConsignments(updatedConsignments);
                  triggerToast(`Berhasil mencatat payout Rp ${payoutAmount.toLocaleString('id-ID')} ke kas!`);
                };

                return (
                  <div className="space-y-6">
                    {/* Consignment Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-[#1E293B] text-white p-4 rounded-xl border border-slate-800 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Kontrak Titipan</div>
                        <div className="text-xl font-extrabold mt-1 font-mono">{totalBatches} Batch</div>
                      </div>
                      
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Kuantitas Terjual</div>
                        <div className="text-xl font-extrabold mt-1 text-slate-800 font-mono">{totalSoldQty} Pcs</div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-[#0EA5A4] border-opacity-35 shadow-sm">
                        <div className="text-[10px] font-black text-[#0EA5A4] uppercase tracking-wider">Komisi Toko Kita ({consignments[0]?.komisiPct || 20}%)</div>
                        <div className="text-xl font-extrabold mt-1 text-emerald-600 font-mono">Rp {totalCommissionEarned.toLocaleString('id-ID')}</div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm">
                        <div className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Hutang ke Consignor (Owner)</div>
                        <div className="text-xl font-extrabold mt-1 text-rose-600 font-mono">Rp {totalPayableToConsignor.toLocaleString('id-ID')}</div>
                      </div>
                    </div>

                    {/* Consignment Action Row */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                      <div className="text-xs text-slate-500 font-semibold">Gunakan modul ini untuk melacak titipan barang retail (Consign-In).</div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowSellConsignmentModal(true)}
                          className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <TrendingUp size={13} />
                          <span>Catat Penjualan Titipan</span>
                        </button>
                        <button 
                          onClick={() => setShowAddConsignmentModal(true)}
                          className="bg-[#0EA5A4] hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <Plus size={13} />
                          <span>Terima Barang Baru</span>
                        </button>
                      </div>
                    </div>

                    {/* Consignment Table */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Daftar Barang Titipan Konsinyasi (Consignment-In)</h4>
                        <span className="text-[10px] font-mono text-slate-400">Total {consignments.length} records</span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-100 text-slate-600 border-b border-slate-200 font-extrabold uppercase tracking-widest text-[9px]">
                            <tr>
                              <th className="p-3">Ref ID / Tanggal</th>
                              <th className="p-3">Consignor</th>
                              <th className="p-3">Barang (SKU)</th>
                              <th className="p-3 text-center">Stok (Titip/Jual/Sisa)</th>
                              <th className="p-3 text-right">Harga Unit</th>
                              <th className="p-3 text-center">Komisi (%)</th>
                              <th className="p-3 text-right">Penjualan Kotor</th>
                              <th className="p-3 text-right">Hutang Consignor</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-center w-28">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                            {consignments.map((c: any) => {
                              const remaining = c.qtyReceived - c.qtySold - c.qtyReturned;
                              const grossSales = c.qtySold * c.harga;
                              const ourCommission = grossSales * (c.komisiPct / 100);
                              const payable = grossSales - ourCommission;
                              
                              return (
                                <tr key={c.id} className="hover:bg-slate-50">
                                  <td className="p-3">
                                    <div className="font-mono text-[10px] font-black text-slate-800">{c.id}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">{c.tanggal}</div>
                                  </td>
                                  <td className="p-3 text-slate-800 font-bold">{c.consignor}</td>
                                  <td className="p-3">
                                    <div className="font-bold text-[#0EA5A4]">{c.nama}</div>
                                    <div className="font-mono text-[10px] text-slate-400">{c.sku}</div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="font-mono">
                                      <span className="text-slate-700 font-bold">{c.qtyReceived}</span>
                                      <span className="text-slate-400"> / </span>
                                      <span className="text-emerald-600 font-bold">{c.qtySold}</span>
                                      <span className="text-slate-400"> / </span>
                                      <span className="text-amber-600 font-bold">{remaining}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right font-mono">Rp {c.harga.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-center text-[#0EA5A4] font-black">{c.komisiPct}%</td>
                                  <td className="p-3 text-right font-mono">Rp {grossSales.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-right font-mono text-rose-600">Rp {payable.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase tracking-wider ${c.status === 'Aktif' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500 border border-slate-200'}`}>
                                      {c.status}
                                    </span>
                                  </td>
                                  <td className="p-3 text-center">
                                    {c.status === 'Aktif' && payable > 0 ? (
                                      <button 
                                        onClick={() => handleSettlePayout(c.id)}
                                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2 py-1 rounded text-[10px] font-extrabold transition-all"
                                      >
                                        Settle &amp; Bayar
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-[10px] italic">No Action / Settled</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* MODAL 1: ADD CONSIGNMENT */}
                    {showAddConsignmentModal && (
                      <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                        <form onSubmit={handleAddConsignment} className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden animate-fade-in">
                          <div className="bg-slate-50 border-b border-slate-200 text-slate-800 p-4 flex justify-between items-center">
                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Terima Barang Titipan Baru</h4>
                            <button type="button" onClick={() => setShowAddConsignmentModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={16} /></button>
                          </div>
                          <div className="p-5 space-y-3 text-xs">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-600 uppercase text-[10px]">Nama Consignor (Supplier Titipan)</label>
                              <input 
                                type="text"
                                value={consignmentForm.consignor}
                                onChange={(e) => setConsignmentForm({ ...consignmentForm, consignor: e.target.value })}
                                placeholder="Contoh: CV. Bakery Supplier"
                                className="w-full p-2 border rounded border-slate-200 font-semibold"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="font-bold text-slate-600 uppercase text-[10px]">SKU Barang Titipan</label>
                                <input 
                                  type="text"
                                  value={consignmentForm.sku}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, sku: e.target.value })}
                                  placeholder="CON-0003"
                                  className="w-full p-2 border rounded border-slate-200 font-mono font-bold uppercase"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-600 uppercase text-[10px]">Nama Barang</label>
                                <input 
                                  type="text"
                                  value={consignmentForm.nama}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, nama: e.target.value })}
                                  placeholder="Roti Sobek Coklat"
                                  className="w-full p-2 border rounded border-slate-200 font-semibold"
                                  required
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="font-bold text-slate-600 uppercase text-[10px]">Qty Dititipkan</label>
                                <input 
                                  type="number"
                                  value={consignmentForm.qtyReceived}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, qtyReceived: parseInt(e.target.value) || 0 })}
                                  className="w-full p-2 border rounded border-slate-200 font-bold text-right"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-600 uppercase text-[10px]">Harga Jual Unit</label>
                                <input 
                                  type="number"
                                  value={consignmentForm.harga}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, harga: parseInt(e.target.value) || 0 })}
                                  className="w-full p-2 border rounded border-slate-200 font-bold text-right"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-slate-600 uppercase text-[10px]">Komisi Toko %</label>
                                <input 
                                  type="number"
                                  value={consignmentForm.komisiPct}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, komisiPct: parseInt(e.target.value) || 0 })}
                                  className="w-full p-2 border rounded border-slate-200 font-bold text-right text-[#0EA5A4]"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-slate-600 uppercase text-[10px]">Catatan / Syarat</label>
                              <textarea 
                                value={consignmentForm.catatan}
                                onChange={(e) => setConsignmentForm({ ...consignmentForm, catatan: e.target.value })}
                                placeholder="Syarat titipan..."
                                className="w-full p-2 border rounded border-slate-200"
                              />
                            </div>
                          </div>
                          <div className="bg-slate-50 p-4 flex justify-end gap-2 border-t">
                            <button type="button" onClick={() => setShowAddConsignmentModal(false)} className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded">Batal</button>
                            <button type="submit" className="px-4 py-2 bg-[#0EA5A4] text-white font-bold rounded">Simpan Penerimaan</button>
                          </div>
                        </form>
                      </div>
                    )}

                    {/* MODAL 2: SELL CONSIGNMENT */}
                    {showSellConsignmentModal && (
                      <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
                        <form onSubmit={handleSellConsignment} className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm overflow-hidden animate-fade-in">
                          <div className="bg-slate-50 border-b border-slate-200 text-slate-800 p-4 flex justify-between items-center">
                            <h4 className="font-extrabold text-xs uppercase tracking-wider text-slate-800">Catat Penjualan Barang Konsinyasi</h4>
                            <button type="button" onClick={() => setShowSellConsignmentModal(false)} className="text-slate-400 hover:text-slate-700 cursor-pointer"><X size={16} /></button>
                          </div>
                          <div className="p-5 space-y-3 text-xs">
                            <div className="space-y-1">
                              <label className="font-bold text-slate-600 uppercase text-[10px]">Pilih Batch Barang Titipan</label>
                              <select 
                                value={consignmentSellForm.id}
                                onChange={(e) => setConsignmentSellForm({ ...consignmentSellForm, id: e.target.value })}
                                className="w-full p-2 border rounded border-slate-200 font-semibold text-slate-800"
                                required
                              >
                                <option value="">-- Pilih Batch Titipan --</option>
                                {consignments.filter(c => c.status === 'Aktif').map(c => {
                                  const available = c.qtyReceived - c.qtySold - c.qtyReturned;
                                  return (
                                    <option key={c.id} value={c.id}>{c.nama} ({c.consignor}) &bull; Sisa: {available} pcs</option>
                                  );
                                })}
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-slate-600 uppercase text-[10px]">Kuantitas Terjual Baru</label>
                              <input 
                                type="number"
                                min="1"
                                value={consignmentSellForm.qtySold}
                                onChange={(e) => setConsignmentSellForm({ ...consignmentSellForm, qtySold: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded border-slate-200 font-extrabold text-right"
                                required
                              />
                            </div>
                          </div>
                          <div className="bg-slate-50 p-4 flex justify-end gap-2 border-t">
                            <button type="button" onClick={() => setShowSellConsignmentModal(false)} className="px-3 py-2 bg-slate-200 text-slate-700 font-bold rounded">Batal</button>
                            <button type="submit" className="px-4 py-2 bg-[#0EA5A4] text-white font-bold rounded">Catat Terjual</button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* 4. SUMMARY STOK BULANAN */}
              {/* 4. SUMMARY STOK BULANAN */}
              {reportSubTab === 'stok_bulanan' && (() => {
                const availableMonths = AVAILABLE_MONTHS;
                const quartersDef = QUARTERS_DEF;

                // Filter products based on search term, SKU selection, and Qty = 0 filter
                const filteredLedger = ledgerData.filter(item => {
                  const matchesSearch = item.sku.toLowerCase().includes(stokSearchTerm.toLowerCase()) ||
                    item.nama.toLowerCase().includes(stokSearchTerm.toLowerCase());
                  
                  const matchesSelectedSku = stokSelectedSkus.length === 0 || stokSelectedSkus.includes(item.sku);
                  
                  const matchesHideZero = !stokHideZeroQty || item.endingQty > 0;
                  
                  return matchesSearch && matchesSelectedSku && matchesHideZero;
                });

                const toggleMonth = (m: string) => {
                  if (selectedStokMonths.includes(m)) {
                    if (selectedStokMonths.length === 1) {
                      triggerToast('Minimal harus memunculkan satu bulan!', 'warning');
                      return;
                    }
                    setSelectedStokMonths(selectedStokMonths.filter(x => x !== m));
                  } else {
                    setSelectedStokMonths([...selectedStokMonths, m].sort((a,b) => {
                      const idxA = availableMonths.findIndex(x => x.id === a);
                      const idxB = availableMonths.findIndex(x => x.id === b);
                      return idxA - idxB;
                    }));
                  }
                };

                // Excel exporter function supporting dynamic active periods and config options
                // ponytail: Ekspor ke excel menggunakan library xlsx yang sudah terpasang, menyusun array-of-arrays baris per baris secara linear.
                const handleExportToExcel = () => {
                  const aoa: any[][] = [];
                  aoa.push(["LAPORAN MUTASI PERSERDIAAN BARANG (STOCK MOVEMENT LEDGER)"]);
                  aoa.push([`Nama Entitas: ${namaToko}`]);
                  aoa.push([`Periode Laporan: ${stokViewMode.toUpperCase()} (${analitikStartDate} s/d ${analitikEndDate})`]);
                  aoa.push([`Metode Penilaian: Weighted Average Costing`]);
                  aoa.push([]); // blank spacing

                  const hasUnitPrice = stokShowUnitPrice;
                  const hasAmount = stokShowAmount;
                  const subColCount = 1 + (hasUnitPrice ? 1 : 0) + (hasAmount ? 1 : 0);

                  const headerRow1: string[] = ["Detail Produk", "", "", "Saldo Awal"];
                  if (hasAmount) {
                    headerRow1.push("");
                  }
                  
                  const headerRow2: string[] = ["SKU", "Nama Produk", "Satuan", "Qty Awal"];
                  if (hasAmount) {
                    headerRow2.push("Nilai Awal (Rp)");
                  }

                  const merges: any[] = [
                    { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
                    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
                    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
                    { s: { r: 3, c: 0 }, e: { r: 3, c: 3 } },
                    { s: { r: 5, c: 0 }, e: { r: 5, c: 2 } },
                  ];
                  
                  if (hasAmount) {
                    merges.push({ s: { r: 5, c: 3 }, e: { r: 5, c: 4 } });
                  }

                  let currentCol = hasAmount ? 5 : 4;

                  activePeriods.forEach(p => {
                    headerRow1.push(p.label, ...Array(subColCount * 3 - 1).fill(""));
                    merges.push({ s: { r: 5, c: currentCol }, e: { r: 5, c: currentCol + (subColCount * 3 - 1) } });

                    // Sub-columns for Masuk
                    headerRow2.push("Masuk Qty");
                    if (hasUnitPrice) headerRow2.push("Masuk Harga (Rp)");
                    if (hasAmount) headerRow2.push("Masuk Nilai (Rp)");

                    // Sub-columns for Keluar
                    headerRow2.push("Keluar Qty");
                    if (hasUnitPrice) headerRow2.push("Keluar Harga (Rp)");
                    if (hasAmount) headerRow2.push("Keluar Nilai (Rp)");

                    // Sub-columns for Sisa
                    headerRow2.push("Sisa Qty");
                    if (hasUnitPrice) headerRow2.push("Sisa Harga (Rp)");
                    if (hasAmount) headerRow2.push("Sisa Nilai (Rp)");

                    currentCol += subColCount * 3;
                  });

                  aoa.push(headerRow1);
                  aoa.push(headerRow2);

                  filteredLedger.forEach(item => {
                    const row: any[] = [
                      item.sku,
                      item.nama,
                      item.satuan,
                      item.initialQty
                    ];
                    if (hasAmount) {
                      row.push(item.initialAmount);
                    }

                    item.periods.forEach((pData: any) => {
                      // Masuk
                      row.push(pData.stockInQty);
                      if (hasUnitPrice) row.push(pData.stockInPrice);
                      if (hasAmount) row.push(pData.stockInAmount);

                      // Keluar
                      row.push(pData.stockOutQty);
                      if (hasUnitPrice) row.push(pData.stockOutPrice);
                      if (hasAmount) row.push(pData.stockOutAmount);

                      // Sisa
                      row.push(pData.endingQty);
                      if (hasUnitPrice) row.push(pData.endingPrice);
                      if (hasAmount) row.push(pData.endingAmount);
                    });

                    aoa.push(row);
                  });

                  const ws = XLSX.utils.aoa_to_sheet(aoa);
                  ws['!merges'] = merges;
                  const wb = XLSX.utils.book_new();
                  XLSX.utils.book_append_sheet(wb, ws, "Mutasi Stok");
                  XLSX.writeFile(wb, `Laporan_Mutasi_Stok_${stokViewMode}_${namaToko}.xlsx`);
                  triggerToast("Laporan berhasil diunduh dalam file Excel (.xlsx)!", "success");
                };

                return (
                  <div className="space-y-6 print-container" id="mutasi-stok-section">
                    {/* CSS Injector for pristine paper-printing layout */}
                    <style dangerouslySetInnerHTML={{__html: `
                      @media print {
                        body {
                          background: white !important;
                          color: black !important;
                        }
                        /* Hide everything that is not the report */
                        header, footer, nav, aside, .no-print, button, input[type="checkbox"], select {
                          display: none !important;
                        }
                        #mutasi-stok-section {
                          display: block !important;
                          width: 100% !important;
                          margin: 0 !important;
                          padding: 0 !important;
                          box-shadow: none !important;
                          border: none !important;
                        }
                        .print-table-wrapper {
                          overflow: visible !important;
                          max-height: none !important;
                        }
                        .print-table {
                          width: 100% !important;
                          border-collapse: collapse !important;
                        }
                        .print-table th, .print-table td {
                          border: 1px solid #1e293b !important;
                          padding: 3px 4px !important;
                          font-size: 8px !important;
                          font-family: monospace !important;
                        }
                        @page {
                          size: A3 landscape;
                          margin: 0.8cm;
                        }
                      }
                    `}} />

                    {/* PRINT ONLY CORPORATE HEADER (MEETS PSAK / IFRS STANDARDS) */}
                    <div className="hidden print:block text-center space-y-1 pb-4 border-b-2 border-slate-300 mb-6">
                      <h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">{namaToko || 'INO ERP'}</h2>
                      <h3 className="text-sm font-extrabold text-slate-800 tracking-wide uppercase">LAPORAN MUTASI PERSEDIAAN BARANG</h3>
                      <p className="text-xs text-slate-500 font-bold tracking-widest">METODE BIAYA RATA-RATA TERTIMBANG (WEIGHTED AVERAGE METHOD)</p>
                      <p className="text-[10px] font-mono text-slate-600 font-bold">
                        {stokViewMode === 'daily' && `Periode Laporan Harian: ${analitikStartDate} s/d ${analitikEndDate}`}
                        {stokViewMode === 'three_days' && `Periode Laporan 3 Harian: ${analitikStartDate} s/d ${analitikEndDate}`}
                        {stokViewMode === 'weekly' && `Periode Laporan Mingguan: ${analitikStartDate} s/d ${analitikEndDate}`}
                        {stokViewMode === 'monthly' && `Tahun Buku 2026 - Periode Bulanan SAK-EMKM`}
                        {stokViewMode === 'quarterly' && `Tahun Buku 2026 - Periode Kuartalan`}
                        {stokViewMode === 'annual' && `Tahun Buku 2026 - Konsolidasi Akhir Tahun`}
                      </p>
                      <p className="text-[9px] text-slate-400 font-bold italic">Sesuai Standar Akuntansi Keuangan SAK-EMKM / PSAK 14 / IAS 2 (Inventories)</p>
                    </div>

                    {/* CONTROL DASHBOARD (HIDDEN ON PRINT) */}
                    <div className="bg-white border border-slate-200 p-5 rounded-2xl shadow-xs space-y-4 no-print" id="stok-control-panel">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-[#0EA5A4] rounded-full animate-pulse"></span>
                            <h4 className="text-sm font-black uppercase text-slate-800 tracking-wider">Kustomisasi Laporan Mutasi Stok</h4>
                          </div>
                          <p className="text-xs text-slate-400 mt-1">Saring produk, pilih rentang waktu dari harian sampai tahunan, dan atur visibilitas biaya.</p>
                        </div>

                        {/* EXPORT BUTTONS */}
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex flex-wrap gap-2">
                            <button
                              onClick={() => window.print()}
                              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <Printer size={14} />
                              <span>Cetak / Simpan PDF</span>
                            </button>
                            <button
                              onClick={handleExportToExcel}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                              <FileSpreadsheet size={14} />
                              <span>Unduh Excel (.xlsx)</span>
                            </button>
                          </div>
                          <span className="text-[10px] text-slate-400 max-w-[240px] text-right leading-tight">
                            *Jika cetak tidak merespon di AI Studio, klik ikon <strong>Buka di Tab Baru</strong> di kanan atas preview.
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
                        {/* 1. Comparison Mode Filter */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Jangka Waktu Laporan</label>
                          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                            {(['daily', 'three_days', 'weekly', 'monthly', 'quarterly', 'annual'] as const).map(mode => {
                              const labels: Record<string, string> = {
                                daily: 'Harian',
                                three_days: '3 Hari',
                                weekly: 'Mingguan',
                                monthly: 'Bulanan',
                                quarterly: 'Kuartal',
                                annual: 'Tahunan'
                              };
                              return (
                                <button
                                  key={mode}
                                  onClick={() => setStokViewMode(mode)}
                                  className={`py-1 text-center text-[10px] font-bold rounded transition-all cursor-pointer ${stokViewMode === mode ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                                >
                                  {labels[mode]}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Live Search */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Cari Berdasarkan SKU / Nama</label>
                          <input 
                            type="text"
                            value={stokSearchTerm}
                            onChange={(e) => setStokSearchTerm(e.target.value)}
                            placeholder="Cari SKU atau nama produk di gudang..."
                            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold focus:ring-1 focus:ring-[#0EA5A4] outline-none placeholder:text-slate-400"
                          />
                        </div>

                        {/* 3. Filter Options */}
                        <div className="space-y-2 flex flex-col justify-center">
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox"
                                id="stok_hide_zero_toggle"
                                checked={stokHideZeroQty}
                                onChange={(e) => setStokHideZeroQty(e.target.checked)}
                                className="w-4 h-4 text-[#0EA5A4] border-slate-300 rounded focus:ring-[#0EA5A4] cursor-pointer"
                              />
                              <label htmlFor="stok_hide_zero_toggle" className="text-xs font-black text-slate-700 cursor-pointer select-none">
                                🚫 Sembunyikan Stok Akhir = 0 (Filter Kayak 0)
                              </label>
                            </div>

                            <div className="flex items-center gap-2">
                              <input 
                                type="checkbox"
                                id="stok_financial_toggle"
                                checked={stokShowFinancial}
                                onChange={(e) => setStokShowFinancial(e.target.checked)}
                                className="w-4 h-4 text-[#0EA5A4] border-slate-300 rounded focus:ring-[#0EA5A4] cursor-pointer"
                              />
                              <label htmlFor="stok_financial_toggle" className="text-xs font-black text-slate-700 cursor-pointer select-none">
                                💲 Tampilkan Nilai Finansial (Biaya &amp; Nilai)
                              </label>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Financial details sub-toggles */}
                      {stokShowFinancial && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100 animate-fadeIn bg-slate-50 p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              id="stok_show_unit_price"
                              checked={stokShowUnitPrice}
                              onChange={(e) => setStokShowUnitPrice(e.target.checked)}
                              className="w-4 h-4 text-[#0EA5A4] border-slate-300 rounded focus:ring-[#0EA5A4] cursor-pointer"
                            />
                            <label htmlFor="stok_show_unit_price" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                              💵 Tampilkan Harga Per Unit (Unit Price)
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <input 
                              type="checkbox"
                              id="stok_show_amount"
                              checked={stokShowAmount}
                              onChange={(e) => setStokShowAmount(e.target.checked)}
                              className="w-4 h-4 text-[#0EA5A4] border-slate-300 rounded focus:ring-[#0EA5A4] cursor-pointer"
                            />
                            <label htmlFor="stok_show_amount" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                              💰 Tampilkan Total Nilai Persediaan (Amount)
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Product checklist */}
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                          <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                            Saring Barang-barang yang Mau Ditampilkan ({stokSelectedSkus.length === 0 ? 'Semua Produk' : `${stokSelectedSkus.length} Produk Terpilih`})
                          </label>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => setStokSelectedSkus([])}
                              className="text-[10px] text-[#0EA5A4] hover:underline font-bold cursor-pointer"
                            >
                              Tampilkan Semua
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 border border-slate-200 rounded-lg bg-slate-50">
                          {products.map(p => {
                            const isSelected = stokSelectedSkus.includes(p.sku);
                            return (
                              <button
                                key={p.sku}
                                type="button"
                                onClick={() => {
                                  if (isSelected) {
                                    setStokSelectedSkus(stokSelectedSkus.filter(s => s !== p.sku));
                                  } else {
                                    setStokSelectedSkus([...stokSelectedSkus, p.sku]);
                                  }
                                }}
                                className={`px-2 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${isSelected ? 'bg-[#0EA5A4] text-white border-[#0EA5A4]' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                              >
                                <span>{isSelected ? '✓' : '+'}</span>
                                <span>{p.nama} ({p.sku})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Month checklist (only shown in monthly mode) */}
                      {stokViewMode === 'monthly' && (
                        <div className="space-y-2 pt-2 border-t border-slate-100 animate-fadeIn">
                          <div className="flex justify-between items-center">
                            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Saring Bulan yang Muncul (12 Bulan Sekaligus)</label>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelectedStokMonths(availableMonths.map(m => m.id))}
                                className="text-[10px] text-[#0EA5A4] hover:underline font-bold cursor-pointer"
                              >
                                Pilih Semua 12 Bulan
                              </button>
                              <span className="text-slate-300">|</span>
                              <button
                                onClick={() => setSelectedStokMonths(['Jun'])}
                                className="text-[10px] text-[#0EA5A4] hover:underline font-bold cursor-pointer"
                              >
                                Reset ke Bulan Juni
                              </button>
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {availableMonths.map(m => {
                              const isSelected = selectedStokMonths.includes(m.id);
                              return (
                                <button
                                  key={m.id}
                                  onClick={() => toggleMonth(m.id)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${isSelected ? 'bg-[#0EA5A4] text-white border-[#0EA5A4] shadow-xs' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                                >
                                  {m.label} ({m.id})
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* COMPLIANCE FOOTER BANNER (SHOWN EVERYWHERE) */}
                    <div className="bg-slate-50 border border-slate-200 px-4 py-3 rounded-xl flex items-center gap-3" id="stok-compliance-banner">
                      <div className="w-8 h-8 rounded-lg bg-[#0EA5A4]/10 text-[#0EA5A4] flex items-center justify-center font-bold text-xs shrink-0 font-mono">
                        SAK
                      </div>
                      <div>
                        <h5 className="text-xs font-extrabold text-slate-800 uppercase tracking-tight">Kepatuhan Standar Akuntansi Persediaan (PSAK 14 / IAS 2 / SAK-EMKM)</h5>
                        <p className="text-[10px] text-slate-500 leading-normal">
                          Laporan mutasi persediaan ini melacak mutasi masuk, keluar, dan saldo akhir secara dinamis menggunakan formula <b>Weighted Average Costing (Biaya Rata-Rata Tertimbang)</b>. Nilai mutasi dihitung berdasarkan perolehan harga riil persediaan secara berkala sesuai ketentuan perpajakan &amp; standar akuntansi.
                        </p>
                      </div>
                    </div>

                    {/* MASSIVE SPREADSHEET LEDGER GRID */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden" id="stok-matrix-grid">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center no-print">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="text-[#0EA5A4]" size={16} />
                          <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                            Buku Pembantu Mutasi Persediaan Barang (Buku Besar Stok - Mode: {stokViewMode.toUpperCase()})
                          </h4>
                        </div>
                        <span className="text-[9px] font-mono font-black bg-teal-50 text-[#0EA5A4] px-2.5 py-0.5 rounded border border-teal-200 uppercase tracking-wider">
                          PSAK &amp; IFRS VERIFIED
                        </span>
                      </div>

                      {/* Wide table with Sticky horizontal positioning */}
                      <div className="overflow-x-auto max-w-full print-table-wrapper max-h-[600px]">
                        <table className="w-full text-left text-xs border-collapse print-table divide-y divide-slate-200">
                          <thead>
                            {/* LEVEL 1 HEADER: MAJOR CATEGORIES */}
                            <tr className="bg-slate-100 text-slate-800 uppercase tracking-widest text-[9px] font-black border-b border-slate-200 divide-x divide-slate-200">
                              <th colSpan={3} className="p-3 text-center bg-slate-100 text-slate-800 sticky left-0 z-30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]">
                                Spesifikasi Produk
                              </th>
                              <th colSpan={stokShowFinancial && stokShowAmount ? 2 : 1} className="p-3 text-center bg-slate-50 text-slate-700">
                                Saldo Awal Periode
                              </th>
                              
                              {activePeriods.map(p => {
                                const showPrice = stokShowFinancial && stokShowUnitPrice;
                                const showAmount = stokShowFinancial && stokShowAmount;
                                const singlePeriodColsCount = 1 + (showPrice ? 1 : 0) + (showAmount ? 1 : 0);
                                return (
                                  <th key={p.id} colSpan={singlePeriodColsCount * 3} className="p-3 text-center bg-[#0EA5A4] text-white border-b-2 border-teal-600">
                                    {p.label}
                                  </th>
                                );
                              })}
                            </tr>

                            {/* LEVEL 2 HEADER: COLUMN DESCRIPTIONS */}
                            <tr className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[8px] font-black border-b border-slate-200 divide-x divide-slate-200">
                              <th className="p-2.5 sticky left-0 bg-slate-100 z-20">SKU</th>
                              <th className="p-2.5 sticky left-[65px] bg-slate-100 z-20 min-w-[150px]">Nama Produk</th>
                              <th className="p-2.5 text-center sticky left-[215px] bg-slate-100 z-20 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.15)]">Satuan</th>
                              
                              {/* Saldo Awal */}
                              <th className="p-2.5 text-right text-slate-600 bg-slate-50/50">Qty Awal</th>
                              {stokShowFinancial && stokShowAmount && <th className="p-2.5 text-right text-slate-600 bg-slate-100">Nilai Awal (Rp)</th>}

                              {/* Repeating Columns Per Period Block */}
                              {activePeriods.map(p => {
                                const showPrice = stokShowFinancial && stokShowUnitPrice;
                                const showAmount = stokShowFinancial && stokShowAmount;
                                return (
                                  <React.Fragment key={p.id}>
                                    {/* Masuk */}
                                    <th className="p-2.5 text-right text-emerald-700 bg-emerald-50/40 font-black">Masuk Qty</th>
                                    {showPrice && <th className="p-2.5 text-right text-emerald-700 bg-emerald-50/20">Harga Unit</th>}
                                    {showAmount && <th className="p-2.5 text-right text-emerald-700 bg-emerald-100/30">Total Nilai</th>}
                                    {/* Keluar */}
                                    <th className="p-2.5 text-right text-rose-700 bg-rose-50/40 font-black">Keluar Qty</th>
                                    {showPrice && <th className="p-2.5 text-right text-rose-700 bg-rose-50/20">Harga Unit</th>}
                                    {showAmount && <th className="p-2.5 text-right text-rose-700 bg-rose-100/30">Total Nilai</th>}
                                    {/* Sisa */}
                                    <th className="p-2.5 text-right text-teal-800 bg-teal-50/40 font-black">Sisa Qty</th>
                                    {showPrice && <th className="p-2.5 text-right text-teal-800 bg-teal-50/20">Harga Unit</th>}
                                    {showAmount && <th className="p-2.5 text-right text-teal-800 bg-teal-100/30">Total Nilai</th>}
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          </thead>

                          {/* BODY ROWS */}
                          <tbody className="divide-y divide-slate-200 text-slate-800 font-semibold">
                            {filteredLedger.map((item: any) => {
                              return (
                                <tr key={item.sku} className="hover:bg-slate-50 group divide-x divide-slate-100">
                                  {/* STICKY LEFT COLUMNS */}
                                  <td className="p-2.5 font-mono text-[10px] font-bold text-[#0EA5A4] sticky left-0 bg-white group-hover:bg-slate-50 z-10">{item.sku}</td>
                                  <td className="p-2.5 font-bold text-slate-800 sticky left-[65px] bg-white group-hover:bg-slate-50 z-10 min-w-[150px]">{item.nama}</td>
                                  <td className="p-2.5 text-center text-[10px] text-slate-400 font-extrabold sticky left-[215px] bg-white group-hover:bg-slate-50 z-10 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.15)]">{item.satuan}</td>

                                  {/* Saldo Awal */}
                                  <td className="p-2.5 text-right font-mono text-slate-500 bg-slate-50/50">{item.initialQty}</td>
                                  {stokShowFinancial && stokShowAmount && (
                                    <td className="p-2.5 text-right font-mono text-slate-700 bg-slate-50">
                                      Rp {Math.round(item.initialAmount).toLocaleString('id-ID')}
                                    </td>
                                  )}

                                  {/* PERIODS DISPLAY */}
                                  {item.periods.map((pData: any, idx: number) => {
                                    const showPrice = stokShowFinancial && stokShowUnitPrice;
                                    const showAmount = stokShowFinancial && stokShowAmount;

                                    return (
                                      <React.Fragment key={`${item.sku}_p_${idx}`}>
                                        {/* Stock In */}
                                        <td className={`p-2.5 text-right font-mono text-[11px] ${pData.stockInQty > 0 ? 'text-emerald-600 bg-emerald-50/20 font-black' : 'text-slate-300'}`}>
                                          {pData.stockInQty > 0 ? `+${pData.stockInQty}` : '0'}
                                        </td>
                                        {showPrice && (
                                          <td className="p-1.5 bg-slate-50/20 text-right">
                                            {pData.stockInQty > 0 ? (
                                              <span className="text-slate-600 font-mono text-[10px]">
                                                Rp {Math.round(pData.stockInPrice).toLocaleString('id-ID')}
                                              </span>
                                            ) : (
                                              <span className="text-slate-300 font-mono text-[10px]">-</span>
                                            )}
                                          </td>
                                        )}
                                        {showAmount && (
                                          <td className={`p-2.5 text-right font-mono text-[10px] ${pData.stockInAmount > 0 ? 'text-emerald-800 font-bold' : 'text-slate-300'}`}>
                                            {pData.stockInAmount > 0 ? `Rp ${Math.round(pData.stockInAmount).toLocaleString('id-ID')}` : 'Rp 0'}
                                          </td>
                                        )}

                                        {/* Stock Out */}
                                        <td className={`p-2.5 text-right font-mono text-[11px] ${pData.stockOutQty > 0 ? 'text-rose-500 bg-rose-50/10 font-black' : 'text-slate-300'}`}>
                                          {pData.stockOutQty > 0 ? `-${pData.stockOutQty}` : '0'}
                                        </td>
                                        {showPrice && (
                                          <td className="p-1.5 bg-slate-50/20 text-right">
                                            {pData.stockOutQty > 0 ? (
                                              <span className="text-slate-600 font-mono text-[10px]">
                                                Rp {Math.round(pData.stockOutPrice).toLocaleString('id-ID')}
                                              </span>
                                            ) : (
                                              <span className="text-slate-300 font-mono text-[10px]">-</span>
                                            )}
                                          </td>
                                        )}
                                        {showAmount && (
                                          <td className={`p-2.5 text-right font-mono text-[10px] ${pData.stockOutAmount > 0 ? 'text-rose-800 font-bold' : 'text-slate-300'}`}>
                                            {pData.stockOutAmount > 0 ? `Rp ${Math.round(pData.stockOutAmount).toLocaleString('id-ID')}` : 'Rp 0'}
                                          </td>
                                        )}

                                        {/* Stock On Hand (Ending) */}
                                        <td className="p-2.5 text-right font-mono text-[11px] font-black text-slate-800 bg-slate-100/50">
                                          {pData.endingQty}
                                        </td>
                                        {showPrice && (
                                          <td className="p-2.5 text-right font-mono text-[10px] text-slate-700 bg-slate-50/30">
                                            Rp {Math.round(pData.endingPrice).toLocaleString('id-ID')}
                                          </td>
                                        )}
                                        {showAmount && (
                                          <td className="p-2.5 text-right font-mono text-[11px] font-black text-teal-800 bg-teal-50/20">
                                            Rp {Math.round(pData.endingAmount).toLocaleString('id-ID')}
                                          </td>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 5. LAPORAN PENJUALAN HARIAN */}
              {reportSubTab === 'penjualan_harian' && (() => {
                // Determine number of days in selected month (assuming 2026)
                const [year, monthStr] = dailySalesReportMonth.split('-');
                const monthInt = parseInt(monthStr) || 6;
                const daysInMonth = new Date(parseInt(year), monthInt, 0).getDate();
                const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

                const getMonthNameIndo = (num: number) => {
                  const names = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                  return names[num - 1] || 'Juni';
                };

                return (
                  <div className="space-y-6">
                    {/* Month selector filter */}
                    <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#0EA5A4] rounded-full"></span>
                        <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Pilih Bulan Penjualan Harian</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={dailySalesReportMonth}
                          onChange={(e) => setDailySalesReportMonth(e.target.value)}
                          className="p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white shadow-xs"
                        >
                          <option value="2026-05">Mei 2026</option>
                          <option value="2026-06">Juni 2026</option>
                          <option value="2026-07">Juli 2026</option>
                        </select>
                      </div>
                    </div>

                    {/* Huge Daily Sales Matrix */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                        <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <span>📅 Laporan Penjualan Harian per Barang</span>
                          <span className="text-[10px] text-[#0EA5A4] bg-teal-50 px-2 py-0.5 rounded font-bold border border-teal-200">{getMonthNameIndo(monthInt)} {year}</span>
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">Geser tabel ke kanan untuk melihat s/d akhir tanggal</span>
                      </div>
                      
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-[#0EA5A4] text-white uppercase tracking-widest text-[8px] font-black divide-x divide-teal-600">
                              <th className="p-3 bg-[#0EA5A4] text-white sticky left-0 z-10 w-44 border-r border-teal-600">Nama Barang (SKU)</th>
                              {daysArray.map(day => (
                                <th key={day} className="p-2 text-center w-10 min-w-[36px] bg-[#0EA5A4] text-white">
                                  {day}
                                </th>
                              ))}
                              <th className="p-3 text-right bg-[#0EA5A4] text-white w-24">Total Qty</th>
                              <th className="p-3 text-right bg-[#0EA5A4] text-white w-32">Total Nilai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                            {products.filter(p => p.kategori === 'Barang Jadi').map((p: any) => {
                              let totalQtySold = 0;
                              let totalRevenue = 0;

                              return (
                                <tr key={p.sku} className="hover:bg-slate-50 divide-x divide-slate-200">
                                  {/* Fixed First Column */}
                                  <td className="p-3 bg-white sticky left-0 z-10 border-r border-slate-200 shadow-[2px_0_5px_rgba(0,0,0,0.03)] font-bold text-slate-800 w-44">
                                    <div className="truncate text-[11px]">{p.nama}</div>
                                    <div className="font-mono text-[9px] text-[#0EA5A4]">{p.sku}</div>
                                  </td>

                                  {/* Day Cells */}
                                  {daysArray.map(day => {
                                    const dayStr = String(day).padStart(2, '0');
                                    const fullDateStr = `${dailySalesReportMonth}-${dayStr}`;

                                    // Scan sales orders for this specific date and SKU
                                    const dailyQty = salesOrders
                                      .filter(so => so.tanggal === fullDateStr && so.statusLogistik !== 'Void')
                                      .reduce((sum, so) => {
                                        const item = so.items.find((i: any) => i.sku === p.sku);
                                        return sum + (item ? item.qty : 0);
                                      }, 0);

                                    totalQtySold += dailyQty;
                                    totalRevenue += dailyQty * (p.hj || 25000);

                                    return (
                                      <td key={day} className={`p-2 text-center font-mono text-[11px] ${dailyQty > 0 ? 'bg-teal-50 text-teal-800 font-bold border border-teal-100' : 'text-slate-300'}`}>
                                        {dailyQty > 0 ? dailyQty : '-'}
                                      </td>
                                    );
                                  })}

                                  {/* Aggregates Columns */}
                                  <td className="p-3 text-right font-mono font-black text-[#0EA5A4] w-24">
                                    {totalQtySold.toLocaleString('id-ID')}
                                  </td>
                                  <td className="p-3 text-right font-mono font-black text-slate-800 w-32">
                                    Rp {totalRevenue.toLocaleString('id-ID')}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB 8: PENGATURAN / SETTING */}
          {activeTab === 'setting' && (
            <div className="space-y-6">
              {/* Header Panel */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-md text-white">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
                    <Settings className="text-[#0EA5A4]" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">⚙️ Pusat Pengaturan &amp; Konfigurasi Sistem</h2>
                    <p className="text-xs text-slate-400">Pusat Konfigurasi INO ERP | Atur profil usaha, referensi dropdown, prefix SKU, saluran platform, tipe bisnis, dan hak akses staf.</p>
                  </div>
                </div>
              </div>

              {/* Sub Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-slate-200 overflow-x-auto pb-px scrollbar-none">
                {[
                  { id: 'profil', label: '🏪 Profil Toko' },
                  { id: 'kategori', label: '📦 Kategori &amp; Satuan' },
                  { id: 'platform', label: '🛒 Platform &amp; Prefix' },
                  { id: 'user', label: '👤 Pengguna &amp; Sandi' },
                  { id: 'modul', label: '⚙️ Tipe Bisnis' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingSubTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-xs font-bold transition-all border-b-2 whitespace-nowrap ${
                      settingSubTab === tab.id 
                        ? 'border-[#0EA5A4] text-[#0EA5A4] bg-teal-50/20' 
                        : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-55'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* TAB CONTENT: PROFIL TOKO */}
              {settingSubTab === 'profil' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  {/* Identitas Toko */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                      <Settings className="text-[#0EA5A4]" size={16} />
                      <span>🏪 Identitas Toko</span>
                    </h3>
                    
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Nama Toko *</label>
                        <input
                          type="text"
                          value={namaToko}
                          onChange={(e) => setNamaToko(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white"
                          placeholder="Masukkan nama toko..."
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Alamat Lengkap</label>
                        <input
                          type="text"
                          value={alamatToko}
                          onChange={(e) => setAlamatToko(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white"
                          placeholder="Jl. Contoh No. 1, Kota"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">No. Telepon / WhatsApp</label>
                          <input
                            type="text"
                            value={telpToko}
                            onChange={(e) => setTelpToko(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white"
                            placeholder="081234567890"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Kota</label>
                          <input
                            type="text"
                            value={kotaToko}
                            onChange={(e) => setKotaToko(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white"
                            placeholder="Bali"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Finansial & File System */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                      <DollarSign className="text-[#0EA5A4]" size={16} />
                      <span>💰 Keuangan &amp; File</span>
                    </h3>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">PPN Rate (%)</label>
                          <input
                            type="number"
                            value={Math.round(ppnRate * 100)}
                            onChange={(e) => setPpnRate((parseFloat(e.target.value) || 0) / 100)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white font-mono"
                            min="0"
                            max="30"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Metode HPP</label>
                          <select
                            value={metodeHppDefault}
                            onChange={(e) => setMetodeHppDefault(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white"
                          >
                            <option value="Moving Average">Moving Average</option>
                            <option value="FIFO">FIFO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase text-slate-500 mb-1">Mata Uang</label>
                          <input
                            type="text"
                            value={mataUang}
                            onChange={(e) => setMataUang(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white font-mono"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Google Drive Folder ID (Struk PDF)</label>
                        <input
                          type="text"
                          value={driveFolderStruk}
                          onChange={(e) => setDriveFolderStruk(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white font-mono"
                          placeholder="ID Folder..."
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Format Tanggal</label>
                        <input
                          type="text"
                          value={formatTanggal}
                          onChange={(e) => setFormatTanggal(e.target.value)}
                          className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white font-mono"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: KATEGORI & SATUAN */}
              {settingSubTab === 'kategori' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                  {/* Kategori Utama */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">📦 Kategori Utama</h3>
                      <button
                        type="button"
                        onClick={() => setSettingCategories([...settingCategories, ''])}
                        className="text-[10px] font-extrabold text-[#0EA5A4] hover:underline"
                      >
                        + Tambah Opsi
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {settingCategories.map((cat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={cat}
                            onChange={(e) => {
                              const arr = [...settingCategories];
                              arr[idx] = e.target.value;
                              setSettingCategories(arr);
                            }}
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                            placeholder="Isi kategori..."
                          />
                          <button
                            type="button"
                            onClick={() => setSettingCategories(settingCategories.filter((_, i) => i !== idx))}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Sub-Kategori */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">🗂️ Sub-Kategori</h3>
                      <button
                        type="button"
                        onClick={() => setSettingSubCategories([...settingSubCategories, ''])}
                        className="text-[10px] font-extrabold text-[#0EA5A4] hover:underline"
                      >
                        + Tambah Opsi
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {settingSubCategories.map((sub, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={sub}
                            onChange={(e) => {
                              const arr = [...settingSubCategories];
                              arr[idx] = e.target.value;
                              setSettingSubCategories(arr);
                            }}
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                            placeholder="Isi sub-kategori..."
                          />
                          <button
                            type="button"
                            onClick={() => setSettingSubCategories(settingSubCategories.filter((_, i) => i !== idx))}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Satuan Dasar */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">📐 Satuan Dasar</h3>
                      <button
                        type="button"
                        onClick={() => setSettingUnits([...settingUnits, ''])}
                        className="text-[10px] font-extrabold text-[#0EA5A4] hover:underline"
                      >
                        + Tambah Opsi
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {settingUnits.map((ut, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={ut}
                            onChange={(e) => {
                              const arr = [...settingUnits];
                              arr[idx] = e.target.value;
                              setSettingUnits(arr);
                            }}
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                            placeholder="Isi satuan..."
                          />
                          <button
                            type="button"
                            onClick={() => setSettingUnits(settingUnits.filter((_, i) => i !== idx))}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tempat Penyimpanan */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">📍 Tempat Penyimpanan</h3>
                      <button
                        type="button"
                        onClick={() => setSettingStorageLocations([...settingStorageLocations, ''])}
                        className="text-[10px] font-extrabold text-[#0EA5A4] hover:underline"
                      >
                        + Tambah Opsi
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                      {settingStorageLocations.map((st, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={st}
                            onChange={(e) => {
                              const arr = [...settingStorageLocations];
                              arr[idx] = e.target.value;
                              setSettingStorageLocations(arr);
                            }}
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                            placeholder="Isi tempat simpan..."
                          />
                          <button
                            type="button"
                            onClick={() => setSettingStorageLocations(settingStorageLocations.filter((_, i) => i !== idx))}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PLATFORM & PREFIX */}
              {settingSubTab === 'platform' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
                  {/* Saluran Penjualan (Platform) */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 md:col-span-1">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">🛒 Saluran Platform</h3>
                      <button
                        type="button"
                        onClick={() => setSettingPlatforms([...settingPlatforms, ''])}
                        className="text-[10px] font-extrabold text-[#0EA5A4] hover:underline"
                      >
                        + Tambah
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                      {settingPlatforms.map((plat, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={plat}
                            onChange={(e) => {
                              const arr = [...settingPlatforms];
                              arr[idx] = e.target.value;
                              setSettingPlatforms(arr);
                            }}
                            className="flex-1 p-2 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white"
                            placeholder="Nama platform..."
                          />
                          <button
                            type="button"
                            onClick={() => setSettingPlatforms(settingPlatforms.filter((_, i) => i !== idx))}
                            className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Prefix SKU */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3 md:col-span-2">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">🏷️ Aturan Prefix SKU</h3>
                        <p className="text-[10px] text-slate-400">Tentukan penamaan kode otomatis berdasarkan kategori produk.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingPrefixes([...settingPrefixes, { prefix: '', label: '' }])}
                        className="px-3 py-1 bg-[#0EA5A4] text-white text-[10px] font-bold rounded-lg hover:bg-[#0C8F8E]"
                      >
                        + Tambah Prefix
                      </button>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b">
                            <th className="p-3">Prefix</th>
                            <th className="p-3">Label / Keterangan</th>
                            <th className="p-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {settingPrefixes.map((p, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={p.prefix}
                                  onChange={(e) => {
                                    const arr = [...settingPrefixes];
                                    arr[idx] = { ...p, prefix: e.target.value };
                                    setSettingPrefixes(arr);
                                  }}
                                  className="w-24 p-1.5 border border-slate-200 rounded-md text-xs font-bold text-[#0EA5A4] font-mono text-center uppercase"
                                  placeholder="Prefix..."
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={p.label}
                                  onChange={(e) => {
                                    const arr = [...settingPrefixes];
                                    arr[idx] = { ...p, label: e.target.value };
                                    setSettingPrefixes(arr);
                                  }}
                                  className="w-full p-1.5 border border-slate-200 rounded-md text-xs font-semibold text-slate-700"
                                  placeholder="Contoh: Barang Jadi Dijual..."
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSettingPrefixes(settingPrefixes.filter((_, i) => i !== idx))}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PENGGUNA */}
              {settingSubTab === 'user' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Login Switch */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider block">🔒 Gerbang Autentikasi Login</h3>
                          <span className="text-[10px] text-slate-400">Aktifkan form autentikasi di layar utama</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isLoginActive} 
                            onChange={(e) => {
                              const val = e.target.checked;
                              setIsLoginActive(val);
                              if (val) {
                                setIsLoggedIn(false); 
                                triggerToast('Keamanan login aktif! Silakan masuk dengan kredensial Anda.', 'success');
                              } else {
                                setIsLoggedIn(true);
                                triggerToast('Keamanan dinonaktifkan.', 'warning');
                              }
                            }}
                            className="sr-only peer" 
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0EA5A4]"></div>
                        </label>
                      </div>
                      
                      <div className="p-3.5 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-150 text-[11px] font-semibold leading-relaxed">
                        {isLoginActive 
                          ? '🔒 Proteksi Aktif: Sistem terkunci otomatis saat pertama kali dibuka, memerlukan kredensial masuk.' 
                          : '✅ Akses Bebas Aktif: Siapa pun dapat mengoperasikan sistem ERP tanpa meminta kata sandi.'
                        }
                      </div>
                    </div>

                    {/* Superadmin Credentials */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                        <Lock className="text-[#0EA5A4]" size={14} />
                        <span>👑 Akun Superadmin Utama</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Username Admin</label>
                          <input 
                            type="text" 
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Password Sistem</label>
                          <input 
                            type="text" 
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold font-mono text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white shadow-inner"
                          />
                        </div>
                      </div>
                      <p className="text-[10px] text-slate-400 italic mt-1">Superadmin memiliki hak akses tak terbatas ke seluruh data keuangan dan konfigurasi.</p>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">👤 Daftar Pengguna &amp; Otoritas Tim</h3>
                        <p className="text-[10px] text-slate-400">Atur PIN masuk untuk tim operasional gudang dan kasir.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingUsersList([...settingUsersList, { email: '', nama: '', role: 'Kasir', pin: '' }])}
                        className="px-3.5 py-1.5 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white text-[11px] font-bold rounded-lg shadow-xs"
                      >
                        + Tambah Staf
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead>
                          <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b">
                            <th className="p-3">Email / Username</th>
                            <th className="p-3">Nama Lengkap</th>
                            <th className="p-3">Role</th>
                            <th className="p-3 text-center">PIN (4-6 Digit)</th>
                            <th className="p-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {settingUsersList.map((usr, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="p-2">
                                <input
                                  type="email"
                                  value={usr.email}
                                  onChange={(e) => {
                                    const arr = [...settingUsersList];
                                    arr[idx] = { ...usr, email: e.target.value };
                                    setSettingUsersList(arr);
                                  }}
                                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                                  placeholder="kasir@toko.com"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={usr.nama}
                                  onChange={(e) => {
                                    const arr = [...settingUsersList];
                                    arr[idx] = { ...usr, nama: e.target.value };
                                    setSettingUsersList(arr);
                                  }}
                                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                                  placeholder="Nama lengkap..."
                                />
                              </td>
                              <td className="p-2">
                                <select
                                  value={usr.role}
                                  onChange={(e) => {
                                    const arr = [...settingUsersList];
                                    arr[idx] = { ...usr, role: e.target.value };
                                    setSettingUsersList(arr);
                                  }}
                                  className="p-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Manager">Manager</option>
                                  <option value="Kasir">Kasir</option>
                                  <option value="Gudang">Gudang</option>
                                </select>
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={usr.pin}
                                  onChange={(e) => {
                                    const arr = [...settingUsersList];
                                    arr[idx] = { ...usr, pin: e.target.value };
                                    setSettingUsersList(arr);
                                  }}
                                  onBlur={() => {
                                    // ponytail: baru dikirim ke backend saat selesai ngetik (blur), bukan tiap huruf —
                                    // dan cuma kalau email+pin sudah keisi. Backend yang hash password-nya, bukan di sini.
                                    if (SHEETS_API_URL && usr.email && usr.pin) {
                                      fetch(SHEETS_API_URL, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                                        body: JSON.stringify({
                                          action: 'saveUser',
                                          payload: { username: usr.email, password: usr.pin, nama: usr.nama, role: usr.role },
                                        }),
                                      }).catch(() => {});
                                    }
                                  }}
                                  maxLength={6}
                                  className="w-24 mx-auto block text-center p-2 border border-slate-200 rounded-lg text-xs font-mono font-bold"
                                  placeholder="PIN..."
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => setSettingUsersList(settingUsersList.filter((_, i) => i !== idx))}
                                  className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: TIPE BISNIS */}
              {settingSubTab === 'modul' && (
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 animate-fade-in">
                  <div className="border-b pb-2">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="text-[#0EA5A4]" size={16} />
                      <span>Tipe Bisnis &amp; Modul Aktif</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      Pilih tipe model operasional bisnis Anda. Beberapa menu, modul perhitungan, dan form (seperti Formula BOM &amp; Perintah Produksi) akan menyesuaikan secara dinamis.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                    {[
                      {
                        id: 'Manufaktur',
                        title: '🏭 Industri Manufaktur / Pabrik',
                        desc: 'Fitur penuh pelacakan bahan baku, formulasi resep (BOM), dan otomatisasi konversi bahan baku menjadi barang jadi.',
                        badge: 'Modul Produksi Aktif'
                      },
                      {
                        id: 'FnB',
                        title: '🍔 Food &amp; Beverage (FnB)',
                        desc: 'Pengelolaan bahan baku dapur, konversi resep saji, dan pembatasan stok bahan basah/kering.',
                        badge: 'Modul Produksi Aktif'
                      },
                      {
                        id: 'Retail',
                        title: '🛒 Retail / Jasa Dagang',
                        desc: 'Fokus murni pembelian barang jadi langsung jual kembali. Menyembunyikan fungsionalitas produksi pabrikasi.',
                        badge: 'Sederhana &amp; Ringan'
                      }
                    ].map(item => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setTipeBisnis(item.id);
                          triggerToast(`Tipe bisnis berhasil diubah ke: ${item.id}`, 'success');
                        }}
                        className={`text-left p-4 rounded-xl border-2 transition-all flex flex-col gap-1.5 h-full ${
                          tipeBisnis === item.id 
                            ? 'bg-teal-50/40 border-[#0EA5A4] shadow-xs' 
                            : 'bg-white border-slate-150 hover:bg-slate-50/50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-start w-full">
                          <span className="font-extrabold text-xs text-slate-800 leading-tight">{item.title}</span>
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${
                            tipeBisnis === item.id ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-normal mt-1">{item.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Reset Database Button */}
              <div className="bg-slate-100 rounded-xl p-5 border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div>
                  <h4 className="text-xs font-extrabold text-slate-800">⚠️ Sinkronisasi Berhasil</h4>
                  <p className="text-[10px] text-slate-500">Semua pengaturan disimpan otomatis ke penyimpanan lokal browser Anda.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const confirmReset = window.confirm('Apakah Anda yakin ingin menyetel ulang seluruh database simulasi ke kondisi awal pabrik? Tindakan ini tidak dapat dibatalkan.');
                    if (confirmReset) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-[10px] rounded-lg transition-all uppercase tracking-wider whitespace-nowrap"
                >
                  Reset Seluruh Data Simulasi
                </button>
              </div>
            </div>
          )}

          {/* TAB 9: MODUL PRODUKSI & BOM */}
          {activeTab === 'produksi' && tipeBisnis === 'Retail' && (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs max-w-2xl mx-auto text-center space-y-6 my-12">
              <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto text-amber-500 border border-amber-100">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-2">
                <h2 className="text-base font-extrabold text-slate-800 uppercase tracking-tight">Modul Produksi Tidak Aktif</h2>
                <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
                  Sistem INO ERP Anda saat ini dikonfigurasi dalam mode <b>Retail / Jasa Dagang</b>. Modul Formulir Produksi, Formula Resep, dan Bill of Materials (BOM) hanya tersedia dalam mode <b>Manufaktur</b> atau <b>Food &amp; Beverage (FnB)</b>.
                </p>
              </div>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('setting')}
                  className="px-5 py-3 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white font-extrabold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
                >
                  ⚙️ Pergi ke Pengaturan untuk Mengaktifkan
                </button>
              </div>
            </div>
          )}

          {activeTab === 'produksi' && tipeBisnis !== 'Retail' && (() => {
            const currentSelectedBom = boms.find((b: any) => b.id === selectedBomId) || boms[0];

            // Handle start production run
            const handleExecuteProduction = () => {
              if (!currentSelectedBom) {
                triggerToast('Silakan pilih salah satu resep BOM terlebih dahulu!', 'error');
                return;
              }

              // Check stock availability
              let isSufficient = true;
              const missingIngredients: string[] = [];

              currentSelectedBom.ingredients.forEach((ing: any) => {
                const prodItem = products.find(p => p.sku === ing.sku);
                const requiredQty = ing.qty * qtyToProduce;
                if (!prodItem || prodItem.stok < requiredQty) {
                  isSufficient = false;
                  missingIngredients.push(`${ing.nama} (Butuh ${requiredQty} ${ing.satuan}, Stok ${prodItem ? prodItem.stok : 0})`);
                }
              });

              if (!isSufficient) {
                triggerToast(`Gagal! Stok bahan tidak mencukupi:\n${missingIngredients.join(', ')}`, 'error');
                return;
              }

              // Deduct ingredients and Add finished good
              const updatedProducts = products.map(p => {
                // Check if it's the finished good
                if (p.sku === currentSelectedBom.skuFinishedGood) {
                  return { ...p, stok: p.stok + qtyToProduce };
                }
                // Check if it's an ingredient
                const ing = currentSelectedBom.ingredients.find((i: any) => i.sku === p.sku);
                if (ing) {
                  return { ...p, stok: Math.max(0, p.stok - (ing.qty * qtyToProduce)) };
                }
                return p;
              });

              // Calculate total ingredient costs
              let ingredientCost = 0;
              currentSelectedBom.ingredients.forEach((ing: any) => {
                const prodItem = products.find(p => p.sku === ing.sku);
                const itemCost = prodItem ? prodItem.hpp : 1000;
                ingredientCost += (ing.qty * qtyToProduce) * itemCost;
              });

              const costTotal = ingredientCost + laborCostInput;

              // Generate new production ID
              const prodId = `PROD-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100+Math.random()*900)}`;

              // Create direct labor cost cash transaction in ledger if specified
              if (laborCostInput > 0) {
                const newCashTx = {
                  id: `CSH-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${Math.floor(100+Math.random()*900)}`,
                  tanggal: new Date().toISOString().split('T')[0],
                  ref: prodId,
                  keterangan: `Labor Cost Produksi [${currentSelectedBom.namaFinishedGood} x${qtyToProduce}]`,
                  kategori: 'Gaji',
                  debit: 0,
                  kredit: laborCostInput,
                  saldo: cashLedger.length > 0 ? cashLedger[cashLedger.length - 1].saldo - laborCostInput : 25000000 - laborCostInput
                };
                setCashLedger([...cashLedger, newCashTx]);
              }

              // Log to riwayatProduksi
              const newRiwayat = {
                id: prodId,
                tanggal: new Date().toISOString().split('T')[0],
                skuFinishedGood: currentSelectedBom.skuFinishedGood,
                namaFinishedGood: currentSelectedBom.namaFinishedGood,
                qtyProduced: qtyToProduce,
                costTotal: costTotal,
                status: 'Selesai',
                operator: 'Administrator'
              };

              // Also create Opname entries for auditing the conversion
              // 1. Finished Good PLUS
              const opnameFg = {
                tanggal: new Date().toISOString().split('T')[0],
                sku: currentSelectedBom.skuFinishedGood,
                nama: currentSelectedBom.namaFinishedGood,
                tipe: 'OPNAME_PLUS',
                qtySistem: products.find(p => p.sku === currentSelectedBom.skuFinishedGood)?.stok || 0,
                qtyFisik: (products.find(p => p.sku === currentSelectedBom.skuFinishedGood)?.stok || 0) + qtyToProduce,
                selisih: qtyToProduce,
                satuan: products.find(p => p.sku === currentSelectedBom.skuFinishedGood)?.satuan || 'Pcs',
                HPP: products.find(p => p.sku === currentSelectedBom.skuFinishedGood)?.hpp || 10000,
                subtotal: qtyToProduce * (products.find(p => p.sku === currentSelectedBom.skuFinishedGood)?.hpp || 10000),
                catatan: `Konversi Produksi Pabrikasi ${prodId}`,
                operator: 'Administrator'
              };

              // 2. Ingredients MINUS logs
              const opnameIngs = currentSelectedBom.ingredients.map((ing: any) => {
                const prodItem = products.find(p => p.sku === ing.sku);
                const usedQty = ing.qty * qtyToProduce;
                return {
                  tanggal: new Date().toISOString().split('T')[0],
                  sku: ing.sku,
                  nama: ing.nama,
                  tipe: 'OPNAME_MINUS',
                  qtySistem: prodItem?.stok || 0,
                  qtyFisik: Math.max(0, (prodItem?.stok || 0) - usedQty),
                  selisih: -usedQty,
                  satuan: ing.satuan,
                  HPP: prodItem?.hpp || 1000,
                  subtotal: -usedQty * (prodItem?.hpp || 1000),
                  catatan: `Konsumsi Bahan Baku Produksi ${prodId}`,
                  operator: 'Administrator'
                };
              });

              setProducts(updatedProducts);
              setRiwayatProduksi([newRiwayat, ...riwayatProduksi]);
              setOpnameLog([opnameFg, ...opnameIngs, ...opnameLog]);

              triggerToast(`Produksi ${qtyToProduce} ${products.find(p => p.sku === currentSelectedBom.skuFinishedGood)?.satuan} ${currentSelectedBom.namaFinishedGood} sukses! Bahan baku terpotong otomatis.`, 'success');
              setQtyToProduce(10);
              setLaborCostInput(0);
            };

            // Handle delete BOM
            const handleDeleteBom = (id: string) => {
              if (confirm('Apakah Anda yakin ingin menghapus Formula BOM ini?')) {
                setBoms(boms.filter(b => b.id !== id));
                triggerToast('Formula BOM berhasil dihapus.', 'success');
              }
            };

            // Handle add BOM
            const handleOpenAddBom = () => {
              setBomFormSkuFinishedGood(products.filter(p => p.kategori === 'Barang Jadi')[0]?.sku || '');
              setBomFormIngredients([]);
              setNewIngredientSku(products.filter(p => p.kategori === 'Bahan Baku' || p.kategori === 'Kemasan')[0]?.sku || '');
              setNewIngredientQty(1);
              setIsEditingBom(false);
              setShowAddBomModal(true);
            };

            const handleOpenEditBom = (bom: any) => {
              setEditingBomId(bom.id);
              setBomFormSkuFinishedGood(bom.skuFinishedGood);
              setBomFormIngredients(bom.ingredients.map((i: any) => ({ sku: i.sku, qty: i.qty })));
              setNewIngredientSku(products.filter(p => p.kategori === 'Bahan Baku' || p.kategori === 'Kemasan')[0]?.sku || '');
              setNewIngredientQty(1);
              setIsEditingBom(true);
              setShowAddBomModal(true);
            };

            const handleAddIngredientToForm = () => {
              if (!newIngredientSku) return;
              const prodItem = products.find(p => p.sku === newIngredientSku);
              if (!prodItem) return;

              // Check if already in form
              if (bomFormIngredients.some(i => i.sku === newIngredientSku)) {
                triggerToast('Bahan baku ini sudah dimasukkan ke resep!', 'warning');
                return;
              }

              setBomFormIngredients([...bomFormIngredients, { sku: newIngredientSku, qty: newIngredientQty }]);
              triggerToast(`Ditambahkan: ${prodItem.nama}`, 'success');
            };

            const handleRemoveIngredientFromForm = (sku: string) => {
              setBomFormIngredients(bomFormIngredients.filter(i => i.sku !== sku));
            };

            const handleSaveBom = () => {
              if (!bomFormSkuFinishedGood) {
                triggerToast('Pilih Produk Jadi terlebih dahulu!', 'error');
                return;
              }
              if (bomFormIngredients.length === 0) {
                triggerToast('Formula minimal harus memiliki 1 bahan baku!', 'error');
                return;
              }

              const fgProd = products.find(p => p.sku === bomFormSkuFinishedGood);
              const compiledIngredients = bomFormIngredients.map(ing => {
                const prodItem = products.find(p => p.sku === ing.sku);
                return {
                  sku: ing.sku,
                  nama: prodItem?.nama || 'Unknown Item',
                  qty: ing.qty,
                  satuan: prodItem?.satuan || 'Pcs'
                };
              });

              if (isEditingBom) {
                // Update
                setBoms(boms.map(b => b.id === editingBomId ? {
                  ...b,
                  skuFinishedGood: bomFormSkuFinishedGood,
                  namaFinishedGood: fgProd?.nama || 'Unknown',
                  ingredients: compiledIngredients
                } : b));
                triggerToast('BOM Recipe berhasil diperbarui.', 'success');
              } else {
                // Create
                const newBom = {
                  id: `BOM-FG-${bomFormSkuFinishedGood}`,
                  skuFinishedGood: bomFormSkuFinishedGood,
                  namaFinishedGood: fgProd?.nama || 'Unknown',
                  ingredients: compiledIngredients
                };
                setBoms([...boms, newBom]);
                triggerToast('Formula BOM Baru berhasil disimpan!', 'success');
              }

              setShowAddBomModal(false);
            };

            return (
              <div className="space-y-6">
                {/* Heading Panel */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-50 rounded-xl border border-teal-200">
                      <Layers className="text-[#0EA5A4]" size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight">Modul Produksi &amp; Formulasi BOM</h2>
                      <p className="text-xs text-slate-500 font-semibold">Konversi bahan baku mentah menjadi produk jadi siap saji secara otomatis &amp; akurat.</p>
                    </div>
                  </div>
                  <div className="flex bg-slate-50 p-1.5 rounded-lg border border-slate-200 w-full md:w-auto">
                    {[
                      { id: 'form_produksi', label: '📋 Form' },
                      { id: 'resep_bom', label: '🛠️ Formula BOM' },
                      { id: 'riwayat_produksi', label: '⌛ Riwayat' }
                    ].map(st => (
                      <button
                        key={st.id}
                        type="button"
                        onClick={() => setProduksiActiveSubTab(st.id)}
                        className={`flex-1 md:flex-initial px-4 py-2 text-[11px] font-black uppercase tracking-wider rounded-md transition-all cursor-pointer ${
                          produksiActiveSubTab === st.id 
                            ? 'bg-[#0EA5A4] text-white shadow' 
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub-tab 1: Form Produksi */}
                {produksiActiveSubTab === 'form_produksi' && (() => {
                  if (boms.length === 0) {
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl p-8 text-center space-y-4">
                        <p className="text-xs text-slate-500 italic">Belum ada Resep Formula BOM yang terdaftar. Buat resep terlebih dahulu untuk melakukan produksi.</p>
                        <button
                          type="button"
                          onClick={() => setProduksiActiveSubTab('resep_bom')}
                          className="px-4 py-2 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white text-xs font-bold rounded-lg transition-all"
                        >
                          + Buat Formula BOM Baru
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left: Form Input */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 lg:col-span-1">
                        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                          <span className="w-2.5 h-2.5 bg-[#0EA5A4] rounded-full"></span>
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Mulai Perintah Produksi</h4>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Pilih Resep / Formula</label>
                            <select
                              value={selectedBomId}
                              onChange={(e) => {
                                setSelectedBomId(e.target.value);
                                setQtyToProduce(10);
                              }}
                              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white shadow-xs focus:ring-1 focus:ring-[#0EA5A4]"
                            >
                              {boms.map((b: any) => (
                                <option key={b.id} value={b.id}>
                                  {b.namaFinishedGood} ({b.skuFinishedGood})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Kuantitas Diproduksi (Pcs)</label>
                            <input
                              type="number"
                              min={1}
                              value={qtyToProduce}
                              onChange={(e) => setQtyToProduce(Math.max(1, parseInt(e.target.value) || 1))}
                              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-[#0EA5A4]"
                            />
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Upah Tenaga Kerja Langsung (Labor Cost) - Opsional</label>
                            <div className="relative">
                              <span className="absolute left-3.5 top-3 text-xs font-bold text-slate-400">Rp</span>
                              <input
                                type="number"
                                min={0}
                                value={laborCostInput}
                                onChange={(e) => setLaborCostInput(Math.max(0, parseInt(e.target.value) || 0))}
                                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-[#0EA5A4]"
                                placeholder="Biaya upah buruh pembuat..."
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1 block">Biaya akan ditarik dari Buku Kas operasional.</span>
                          </div>

                          <div className="pt-2">
                            <button
                              type="button"
                              onClick={handleExecuteProduction}
                              className="w-full py-3 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white text-xs font-black uppercase tracking-wider rounded-lg shadow transition-all text-center flex items-center justify-center gap-1.5"
                            >
                              <Activity size={14} />
                              <span>Proses &amp; Selesaikan Produksi</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Right: Bill of Materials Analysis */}
                      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4 lg:col-span-2">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping"></span>
                            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Analisis Kebutuhan &amp; Ketersediaan Bahan</h4>
                          </div>
                          <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono font-bold text-slate-500">
                            Target: {qtyToProduce} Unit Saji
                          </span>
                        </div>

                        {currentSelectedBom && (
                          <div className="space-y-4">
                            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
                              <div>
                                <span className="text-[10px] text-slate-400 block font-black uppercase">Produk Hasil Akhir (Finished Good)</span>
                                <span className="font-extrabold text-sm text-slate-800">{currentSelectedBom.namaFinishedGood}</span>
                                <span className="text-xs text-[#0EA5A4] font-mono font-bold block">{currentSelectedBom.skuFinishedGood}</span>
                              </div>
                              <div className="text-left md:text-right">
                                <span className="text-[10px] text-slate-400 block font-black uppercase">Stok Saat Ini</span>
                                <span className="font-extrabold text-lg text-slate-700">
                                  {products.find(p => p.sku === currentSelectedBom.skuFinishedGood)?.stok || 0} Pcs
                                </span>
                              </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-150 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                                  <tr>
                                    <th className="p-3">SKU Bahan</th>
                                    <th className="p-3">Bahan Baku / Kemasan</th>
                                    <th className="p-3 text-right">Rasio per Unit</th>
                                    <th className="p-3 text-right">Kebutuhan Produksi</th>
                                    <th className="p-3 text-right">Stok Fisik Tersedia</th>
                                    <th className="p-3 text-center">Status</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                                  {currentSelectedBom.ingredients.map((ing: any) => {
                                    const prodItem = products.find(p => p.sku === ing.sku);
                                    const currentStock = prodItem ? prodItem.stok : 0;
                                    const totalRequired = ing.qty * qtyToProduce;
                                    const isOk = currentStock >= totalRequired;

                                    return (
                                      <tr key={ing.sku} className="hover:bg-slate-50/50">
                                        <td className="p-3 font-mono text-[10px] text-slate-500 font-bold">{ing.sku}</td>
                                        <td className="p-3 text-slate-800 font-bold">{ing.nama}</td>
                                        <td className="p-3 text-right font-mono text-slate-600">{ing.qty} {ing.satuan}</td>
                                        <td className="p-3 text-right font-mono text-indigo-600 font-extrabold">{totalRequired} {ing.satuan}</td>
                                        <td className="p-3 text-right font-mono font-bold text-slate-700">{currentStock} {ing.satuan}</td>
                                        <td className="p-3 text-center">
                                          {isOk ? (
                                            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[9px] font-black uppercase">
                                              Cukup
                                            </span>
                                          ) : (
                                            <span className="px-2.5 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[9px] font-black uppercase animate-pulse">
                                              Kurang
                                            </span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Sub-tab 2: Resep BOM Formula */}
                {produksiActiveSubTab === 'resep_bom' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#0EA5A4] rounded-full"></span>
                        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Master Formula Bill of Materials (BOM)</h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenAddBom}
                        className="px-4 py-2 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white text-xs font-bold rounded-lg transition-all"
                      >
                        + Tambah Resep Formula Baru
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {boms.map((bom: any) => (
                        <div key={bom.id} className="border border-slate-200 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between">
                          <div className="p-4 bg-slate-50/50 border-b border-slate-200 flex justify-between items-center">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase">Formula ID: {bom.id}</span>
                              <span className="font-extrabold text-sm text-slate-800">{bom.namaFinishedGood}</span>
                              <span className="text-xs text-[#0EA5A4] font-mono font-bold block">{bom.skuFinishedGood}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditBom(bom)}
                                className="p-2 hover:bg-slate-200 text-slate-600 hover:text-slate-900 rounded-lg transition-colors"
                                title="Edit resep"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteBom(bom.id)}
                                className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                                title="Hapus resep"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          <div className="p-4 flex-1">
                            <span className="text-[10px] text-slate-400 block font-black uppercase mb-2">Bahan Baku yang Digunakan:</span>
                            <div className="divide-y divide-slate-100 text-xs font-semibold">
                              {bom.ingredients.map((ing: any) => (
                                <div key={ing.sku} className="py-2 flex justify-between items-center">
                                  <span className="text-slate-800">{ing.nama}</span>
                                  <span className="font-mono text-[#0EA5A4]">{ing.qty} {ing.satuan}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sub-tab 3: Riwayat Produksi */}
                {produksiActiveSubTab === 'riwayat_produksi' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                      <span className="w-2.5 h-2.5 bg-[#0EA5A4] rounded-full"></span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">Riwayat Catatan Produksi Selesai</h4>
                    </div>

                    <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">ID Log Produksi</th>
                            <th className="p-3">Produk Hasil Jadi</th>
                            <th className="p-3 text-right">Jumlah Selesai</th>
                            <th className="p-3 text-right">Estimasi Cost (Total)</th>
                            <th className="p-3 text-center">Status</th>
                            <th className="p-3">Operator</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                          {riwayatProduksi.map((log: any) => (
                            <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="p-3 font-mono text-slate-500">{log.tanggal}</td>
                              <td className="p-3 font-mono text-[#0EA5A4] font-bold">{log.id}</td>
                              <td className="p-3 text-slate-800 font-bold">{log.namaFinishedGood} <span className="text-[10px] text-slate-400 font-mono">({log.skuFinishedGood})</span></td>
                              <td className="p-3 text-right font-mono font-bold text-slate-800">{log.qtyProduced} Pcs</td>
                              <td className="p-3 text-right font-mono font-black text-teal-800">Rp {log.costTotal.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-center">
                                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-black uppercase">
                                  {log.status}
                                </span>
                              </td>
                              <td className="p-3 text-slate-500">{log.operator}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* MODAL: ADD / EDIT BOM RECIPE (Nesting inside IIFE to access parent handlers) */}
                {showAddBomModal && (
                  <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden border border-slate-200">
                      <div className="bg-slate-50 text-slate-800 p-5 flex justify-between items-center border-b border-slate-200">
                        <h3 className="font-bold text-sm text-slate-800">
                          {isEditingBom ? '🛠️ Edit Formula Resep BOM' : '➕ Tambah Formula Resep BOM Baru'}
                        </h3>
                        <button 
                          type="button"
                          onClick={() => setShowAddBomModal(false)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>

                      <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
                        {/* Select Finished Good */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Produk Hasil Jadi (Finished Good)</label>
                          <select
                            value={bomFormSkuFinishedGood}
                            onChange={(e) => setBomFormSkuFinishedGood(e.target.value)}
                            disabled={isEditingBom}
                            className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white shadow-xs focus:ring-1 focus:ring-[#0EA5A4] disabled:bg-slate-50 disabled:text-slate-400"
                          >
                            <option value="">-- Pilih Produk Jadi --</option>
                            {products.filter((p: any) => p.kategori === 'Barang Jadi').map((p: any) => (
                              <option key={p.sku} value={p.sku}>
                                {p.nama} ({p.sku})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Add Ingredient Section */}
                        <div className="border border-slate-150 rounded-xl p-4 space-y-3 bg-slate-50/50">
                          <span className="text-[10px] font-black uppercase text-slate-600 block">➕ Tambahkan Bahan Baku / Kemasan</span>
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-7">
                              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Nama Bahan Baku / Kemasan</label>
                              <select
                                value={newIngredientSku}
                                onChange={(e) => setNewIngredientSku(e.target.value)}
                                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 bg-white focus:ring-1 focus:ring-[#0EA5A4]"
                              >
                                <option value="">-- Pilih Bahan --</option>
                                {products.filter((p: any) => p.kategori === 'Bahan Baku' || p.kategori === 'Kemasan').map((p: any) => (
                                  <option key={p.sku} value={p.sku}>
                                    [{p.sku}] {p.nama} ({p.satuan})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="md:col-span-3">
                              <label className="block text-[9px] font-bold uppercase text-slate-400 mb-1">Rasio Kebutuhan</label>
                              <input
                                type="number"
                                step="any"
                                min="0.0001"
                                value={newIngredientQty}
                                onChange={(e) => setNewIngredientQty(parseFloat(e.target.value) || 0)}
                                className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 focus:ring-1 focus:ring-[#0EA5A4]"
                              />
                            </div>
                            <div className="md:col-span-2">
                              <button
                                type="button"
                                onClick={handleAddIngredientToForm}
                                className="w-full py-2.5 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white font-extrabold text-xs rounded-lg transition-all text-center"
                              >
                                Tambah
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Current Formula Ingredients List */}
                        <div className="space-y-2">
                          <span className="text-[10px] font-black uppercase text-slate-500 block">📋 Struktur Formula BOM Saat Ini</span>
                          <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs bg-white">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-100 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider">
                                <tr>
                                  <th className="p-3">Bahan Baku</th>
                                  <th className="p-3 text-right">Rasio per Unit Saji</th>
                                  <th className="p-3 text-center">Aksi</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200 font-semibold text-slate-700">
                                {bomFormIngredients.length > 0 ? (
                                  bomFormIngredients.map((ing: any) => {
                                    const prodItem = products.find(p => p.sku === ing.sku);
                                    return (
                                      <tr key={ing.sku} className="hover:bg-slate-50/50">
                                        <td className="p-3 text-slate-800 font-bold">{prodItem?.nama || ing.sku} <span className="text-[10px] text-slate-400 font-mono">({ing.sku})</span></td>
                                        <td className="p-3 text-right font-mono text-slate-700">{ing.qty} {prodItem?.satuan}</td>
                                        <td className="p-3 text-center">
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveIngredientFromForm(ing.sku)}
                                            className="text-rose-600 hover:text-rose-800 p-1 rounded-lg hover:bg-rose-50 transition-colors"
                                            title="Hapus bahan"
                                          >
                                            <Trash2 size={14} />
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })
                                ) : (
                                  <tr>
                                    <td colSpan={3} className="p-6 text-center text-slate-400 italic">
                                      Belum ada bahan baku yang dimasukkan ke resep ini.
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end gap-2">
                        <button 
                          type="button"
                          onClick={() => setShowAddBomModal(false)}
                          className="bg-slate-200 hover:bg-slate-300 text-slate-600 px-5 py-2.5 rounded-lg text-xs font-bold transition-all"
                        >
                          Batal
                        </button>
                        <button 
                          type="button"
                          onClick={handleSaveBom}
                          className="bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-md"
                        >
                          Simpan Resep Formula
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* TAB 10: DEVELOPER CODE EXPORTER & GOOGLE SHEETS HUB */}
          {activeTab === 'export_code' && (() => {
            // Inner tab helper functions
            const downloadBlankTemplate = (type: 'produk' | 'pelanggan' | 'supplier') => {
              const wb = XLSX.utils.book_new();
              let headers: any[] = [];
              let sampleData: any[] = [];
              let filename = '';

              if (type === 'produk') {
                headers = [
                  ['SKU', 'Kategori', 'Sub Kategori', 'Nama Produk', 'Satuan', 'Harga Jual', 'HPP (Harga Pokok)', 'Safety Stock', 'Stok Awal', 'Status', 'Supplier', 'Lokasi Penyimpanan', 'Masa Simpan', 'Catatan']
                ];
                sampleData = [
                  ['FG-TEST-001', 'Barang Jadi', 'Roti & Kue', 'Croissant Keju Spesial', 'Pcs', 28000, 13000, 20, 100, 'Aktif', 'PT. Terigu Sukses', 'Etalase Depan', '3 Hari', 'Contoh isian produk baru']
                ];
                filename = 'Template_Import_Produk_INO_Sheets.xlsx';
              } else if (type === 'pelanggan') {
                headers = [
                  ['ID Pelanggan', 'Nama Instansi', 'Kontak Person', 'Email', 'No Telp', 'Alamat', 'Piutang Awal']
                ];
                sampleData = [
                  ['CUST-999', 'Horeka Cafe Bali', 'Ketut Suantara', 'horeka@cafe.com', '081122334455', 'Jl. Monkey Forest No. 10, Ubud', 0]
                ];
                filename = 'Template_Import_Pelanggan_INO_Sheets.xlsx';
              } else {
                headers = [
                  ['ID Supplier', 'Nama Perusahaan', 'Kontak Person', 'Email', 'No Telp', 'Alamat', 'Hutang Awal']
                ];
                sampleData = [
                  ['SUPP-999', 'CV. Bahan Premium', 'Made Adi', 'premium@bahan.com', '087766554433', 'Gatsu Barat No. 99, Denpasar', 0]
                ];
                filename = 'Template_Import_Supplier_INO_Sheets.xlsx';
              }

              const ws = XLSX.utils.aoa_to_sheet([...headers, ...sampleData]);
              XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
              XLSX.writeFile(wb, filename);
              triggerToast(`Template ${type.toUpperCase()} berhasil diunduh!`, "success");
            };

            const exportDatabaseToExcel = () => {
              const wb = XLSX.utils.book_new();

              // Tab 1: Produk
              const wsProducts = XLSX.utils.json_to_sheet(products.map(p => ({
                'SKU': p.sku,
                'Kategori': p.kategori,
                'Sub Kategori': p.subKat,
                'Nama Produk': p.nama,
                'Satuan': p.satuan,
                'Harga Jual': p.hj,
                'HPP (Harga Pokok)': p.hpp,
                'Safety Stock': p.safety,
                'Stok Saat Ini': p.stok,
                'Status': p.status,
                'Supplier': p.supplier,
                'Lokasi Penyimpanan': p.tempatSimpan,
                'Masa Simpan': p.masaSmp,
                'Catatan': p.catatan
              })));
              XLSX.utils.book_append_sheet(wb, wsProducts, "Produk");

              // Tab 2: Pelanggan
              const wsCustomers = XLSX.utils.json_to_sheet(customers.map(c => ({
                'ID Pelanggan': c.id,
                'Nama Instansi': c.nama,
                'Kontak Person': c.kontak,
                'Email': c.email,
                'No Telp': c.telp,
                'Alamat': c.alamat,
                'Saldo Piutang': c.piutang
              })));
              XLSX.utils.book_append_sheet(wb, wsCustomers, "Pelanggan");

              // Tab 3: Supplier
              const wsSuppliers = XLSX.utils.json_to_sheet(suppliers.map(s => ({
                'ID Supplier': s.id,
                'Nama Perusahaan': s.nama,
                'Kontak Person': s.kontak,
                'Email': s.email,
                'No Telp': s.telp,
                'Alamat': s.alamat,
                'Saldo Hutang': s.hutang
              })));
              XLSX.utils.book_append_sheet(wb, wsSuppliers, "Supplier");

              // Tab 4: Formula BOM
              const wsBoms = XLSX.utils.json_to_sheet(boms.map(b => ({
                'ID BOM': b.id,
                'Nama Finished Good': b.namaFg,
                'SKU Finished Good': b.skuFg,
                'Total Bahan Baku': b.bahanBaku?.length || 0,
                'Total Estimasi Biaya Pokok': b.totalHppRaw || 0
              })));
              XLSX.utils.book_append_sheet(wb, wsBoms, "Formula BOM");

              XLSX.writeFile(wb, `Database_Lengkap_INO_ERP_${namaToko}.xlsx`);
              triggerToast("Seluruh database berhasil diekspor ke file Excel (.xlsx)!", "success");
            };

            const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
              const file = e.target.files?.[0];
              if (!file) return;

              const reader = new FileReader();
              reader.onload = (evt) => {
                try {
                  const data = evt.target?.result;
                  const workbook = XLSX.read(data, { type: 'binary' });
                  const firstSheetName = workbook.SheetNames[0];
                  const worksheet = workbook.Sheets[firstSheetName];
                  const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
                  
                  if (json.length > 0) {
                    const headers = json[0].map(h => String(h || '').trim());
                    const rows = json.slice(1).map(row => row.map(v => String(v ?? '').trim()));
                    setParsedImportHeaders(headers);
                    setParsedImportRows(rows);
                    triggerToast("File Excel berhasil dibaca! Silakan periksa kolom sebelum mengonfirmasi.", "success");
                  } else {
                    triggerToast("File Excel kosong!", "error");
                  }
                } catch (err) {
                  triggerToast("Gagal membaca file Excel. Pastikan formatnya benar.", "error");
                }
              };
              reader.readAsBinaryString(file);
            };

            const handlePasteTextChange = (text: string) => {
              setPasteText(text);
              if (!text.trim()) {
                setParsedImportHeaders([]);
                setParsedImportRows([]);
                return;
              }

              const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
              if (lines.length > 0) {
                let separator = '\t';
                if (!lines[0].includes('\t')) {
                  separator = lines[0].includes(';') ? ';' : ',';
                }
                const headers = lines[0].split(separator).map(h => h.trim().replace(/^["']|["']$/g, ''));
                const rows = lines.slice(1).map(line => line.split(separator).map(v => v.trim().replace(/^["']|["']$/g, '')));
                setParsedImportHeaders(headers);
                setParsedImportRows(rows);
              }
            };

            const mapProductRow = (row: string[], headers: string[]) => {
              const getVal = (headerName: string) => {
                const idx = headers.findIndex(h => h.toLowerCase().replace(/[\s_()]/g, '') === headerName.toLowerCase().replace(/[\s_()]/g, ''));
                return idx !== -1 ? row[idx] : '';
              };

              return {
                sku: getVal('sku') || `PROD-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                kategori: getVal('kategori') || 'Barang Jadi',
                subKat: getVal('subkategori') || getVal('subkat') || 'Makanan',
                nama: getVal('namaproduk') || getVal('nama') || 'Produk Tanpa Nama',
                satuan: getVal('satuan') || 'Pcs',
                hj: Number(getVal('hargajual') || getVal('hj') || 0),
                hpp: Number(getVal('hpphargapokok') || getVal('hpp') || 0),
                safety: Number(getVal('safetystock') || getVal('safety') || 0),
                stok: Number(getVal('stokawal') || getVal('stok') || 0),
                status: getVal('status') || 'Aktif',
                supplier: getVal('supplier') || '',
                tempatSimpan: getVal('lokasipenyimpanan') || getVal('tempatSimpan') || 'Gudang Utama',
                masaSmp: getVal('masasimpan') || getVal('masaSmp') || 'Selamanya',
                catatan: getVal('catatan') || ''
              };
            };

            const mapCustomerRow = (row: string[], headers: string[]) => {
              const getVal = (headerName: string) => {
                const idx = headers.findIndex(h => h.toLowerCase().replace(/[\s_()]/g, '') === headerName.toLowerCase().replace(/[\s_()]/g, ''));
                return idx !== -1 ? row[idx] : '';
              };

              return {
                id: getVal('idpelanggan') || getVal('id') || `CUST-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                nama: getVal('namainstansi') || getVal('nama') || 'Pelanggan Baru',
                kontak: getVal('kontakperson') || getVal('kontak') || '',
                email: getVal('email') || '',
                telp: getVal('notelp') || getVal('telp') || '',
                alamat: getVal('alamat') || '',
                piutang: Number(getVal('piutangawal') || getVal('piutang') || 0)
              };
            };

            const mapSupplierRow = (row: string[], headers: string[]) => {
              const getVal = (headerName: string) => {
                const idx = headers.findIndex(h => h.toLowerCase().replace(/[\s_()]/g, '') === headerName.toLowerCase().replace(/[\s_()]/g, ''));
                return idx !== -1 ? row[idx] : '';
              };

              return {
                id: getVal('idsupplier') || getVal('id') || `SUPP-${Math.random().toString(36).substr(2, 5).toUpperCase()}`,
                nama: getVal('namaperusahaan') || getVal('nama') || 'Supplier Baru',
                kontak: getVal('kontakperson') || getVal('kontak') || '',
                email: getVal('email') || '',
                telp: getVal('notelp') || getVal('telp') || '',
                alamat: getVal('alamat') || '',
                hutang: Number(getVal('hutangawal') || getVal('hutang') || 0)
              };
            };

            const executeImport = () => {
              if (parsedImportRows.length === 0) {
                triggerToast("Tidak ada data untuk diimpor. Silakan tempel teks atau upload file terlebih dahulu.", "error");
                return;
              }

              let successCount = 0;
              let updateCount = 0;

              if (importTargetType === 'produk') {
                const mapped = parsedImportRows.map(row => mapProductRow(row, parsedImportHeaders));
                
                if (importMethod === 'overwrite') {
                  setProducts(mapped);
                  successCount = mapped.length;
                } else {
                  setProducts(prev => {
                    const next = [...prev];
                    mapped.forEach(item => {
                      const idx = next.findIndex(p => p.sku === item.sku);
                      if (idx !== -1) {
                        next[idx] = { ...next[idx], ...item };
                        updateCount++;
                      } else {
                        next.push(item);
                        successCount++;
                      }
                    });
                    return next;
                  });
                }
              } else if (importTargetType === 'pelanggan') {
                const mapped = parsedImportRows.map(row => mapCustomerRow(row, parsedImportHeaders));
                
                if (importMethod === 'overwrite') {
                  setCustomers(mapped);
                  successCount = mapped.length;
                } else {
                  setCustomers(prev => {
                    const next = [...prev];
                    mapped.forEach(item => {
                      const idx = next.findIndex(c => c.id === item.id);
                      if (idx !== -1) {
                        next[idx] = { ...next[idx], ...item };
                        updateCount++;
                      } else {
                        next.push(item);
                        successCount++;
                      }
                    });
                    return next;
                  });
                }
              } else if (importTargetType === 'supplier') {
                const mapped = parsedImportRows.map(row => mapSupplierRow(row, parsedImportHeaders));
                
                if (importMethod === 'overwrite') {
                  setSuppliers(mapped);
                  successCount = mapped.length;
                } else {
                  setSuppliers(prev => {
                    const next = [...prev];
                    mapped.forEach(item => {
                      const idx = next.findIndex(s => s.id === item.id);
                      if (idx !== -1) {
                        next[idx] = { ...next[idx], ...item };
                        updateCount++;
                      } else {
                        next.push(item);
                        successCount++;
                      }
                    });
                    return next;
                  });
                }
              }

              setPasteText('');
              setParsedImportRows([]);
              setParsedImportHeaders([]);
              triggerToast(`Impor Berhasil! Tambah: ${successCount}, Perbarui: ${updateCount}`, "success");
            };

            return (
              <div className="space-y-6">
                {/* Header panel */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-md text-white">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-teal-500/10 rounded-xl border border-teal-500/20">
                      <FileSpreadsheet className="text-[#0EA5A4]" size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight">📊 Pusat Sinkronisasi &amp; Integrasi Google Sheets / Excel</h2>
                      <p className="text-xs text-slate-400">Unduh template pengisian kosong, ekspor seluruh database ke file Excel siap cetak, atau impor data masal dari Google Sheets.</p>
                    </div>
                  </div>
                </div>

                {/* Sub Tab Navigation */}
                <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 w-full max-w-lg">
                  {[
                    { id: 'ekspor', label: '📥 Ekspor &amp; Template' },
                    { id: 'impor', label: '📤 Impor Data' },
                    { id: 'gas', label: '💻 Google Apps Script (GAS)' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSheetsHubSubTab(st.id as any)}
                      className={`flex-1 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                        sheetsHubSubTab === st.id 
                          ? 'bg-[#0EA5A4] text-white shadow' 
                          : 'text-slate-500 hover:text-slate-900'
                      }`}
                    >
                      {st.label === '📥 Ekspor &amp; Template' ? '📥 Ekspor & Template' : st.label}
                    </button>
                  ))}
                </div>

                {/* SUB TAB 1: DOWNLOAD TEMPLATE & EXPORT DATA */}
                {sheetsHubSubTab === 'ekspor' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                    {/* Panel Kiri: Unduh Template Pengisian */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
                      <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                        <Download size={16} className="text-[#0EA5A4]" />
                        <span>Unduh Template Tempat Pengisian Data (Google Sheet)</span>
                      </h3>
                      <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                        Gunakan file Excel/CSV di bawah ini sebagai template pengisian di Google Sheets Anda. Setelah diisi, data dapat Anda copy-paste atau upload langsung pada tab <strong>Impor Data</strong>.
                      </p>
                      
                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => downloadBlankTemplate('produk')}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-teal-50/30 border border-slate-200 hover:border-[#0EA5A4] rounded-lg transition-all group text-left cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-[#0EA5A4]">📝 Template Impor Master Produk</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Berisi kolom SKU, Kategori, Harga Jual, HPP, Safety Stock, dll.</p>
                          </div>
                          <Download size={14} className="text-slate-400 group-hover:text-[#0EA5A4]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadBlankTemplate('pelanggan')}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-teal-50/30 border border-slate-200 hover:border-[#0EA5A4] rounded-lg transition-all group text-left cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-[#0EA5A4]">👥 Template Impor Master Pelanggan</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Berisi kolom ID Pelanggan, Nama Instansi, Kontak, Alamat, dll.</p>
                          </div>
                          <Download size={14} className="text-slate-400 group-hover:text-[#0EA5A4]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadBlankTemplate('supplier')}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-teal-50/30 border border-slate-200 hover:border-[#0EA5A4] rounded-lg transition-all group text-left cursor-pointer"
                        >
                          <div>
                            <p className="text-xs font-bold text-slate-800 group-hover:text-[#0EA5A4]">🏭 Template Impor Master Supplier</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">Berisi kolom ID Supplier, Nama Perusahaan, Kontak, dll.</p>
                          </div>
                          <Download size={14} className="text-slate-400 group-hover:text-[#0EA5A4]" />
                        </button>
                      </div>
                    </div>

                    {/* Panel Kanan: Ekspor Database Aktif */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                          <Database size={16} className="text-amber-500" />
                          <span>Ekspor Seluruh Database ERP Aktif</span>
                        </h3>
                        <p className="text-xs text-slate-600 leading-relaxed mt-2 font-semibold">
                          Unduh seluruh data ERP saat ini (Produk, Pelanggan, Supplier, dan Formula Resep BOM) ke dalam satu workbook Excel (.xlsx) dengan tab terpisah yang rapi dan siap dicetak/diunggah ke Google Drive.
                        </p>

                        <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2.5">
                          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold">Informasi Backup Otomatis:</span>
                            <p className="text-[11px] text-amber-700/90 mt-0.5">Disarankan untuk mengekspor database secara berkala sebagai backup lokal yang aman sebelum melakukan penimpaan data masal.</p>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={exportDatabaseToExcel}
                        className="w-full py-3 bg-gradient-to-r from-teal-500 to-[#0EA5A4] hover:from-[#0EA5A4] hover:to-teal-600 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet size={16} />
                        <span>Unduh File Excel Database Lengkap (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB TAB 2: IMPORT DATA FROM SHEETS */}
                {sheetsHubSubTab === 'impor' && (
                  <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 animate-fade-in">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Form Impor */}
                      <div className="flex-1 space-y-4">
                        <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider border-b pb-2">⚙️ Konfigurasi Impor</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Pilih Target Tabel Database *</label>
                            <select
                              value={importTargetType}
                              onChange={(e) => {
                                setImportTargetType(e.target.value as any);
                                setParsedImportHeaders([]);
                                setParsedImportRows([]);
                                setPasteText('');
                              }}
                              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white"
                            >
                              <option value="produk">📦 Produk / Stock Inventory</option>
                              <option value="pelanggan">👥 Pelanggan / Customers</option>
                              <option value="supplier">🏭 Supplier / Vendor</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Metode Integrasi Data *</label>
                            <select
                              value={importMethod}
                              onChange={(e) => setImportMethod(e.target.value as any)}
                              className="w-full p-2.5 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-white"
                            >
                              <option value="merge">⚡ Merge (Tambahkan data baru &amp; Perbarui data lama)</option>
                              <option value="overwrite">⚠️ Overwrite (Hapus database lama &amp; Ganti dengan data baru)</option>
                            </select>
                          </div>
                        </div>

                        {/* File Upload Selector */}
                        <div className="space-y-1">
                          <label className="block text-[10px] font-black uppercase text-slate-500">Pilih / Seret File Excel (.xlsx / .csv)</label>
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleExcelFileUpload}
                            className="w-full text-xs text-slate-500 border border-dashed border-slate-200 rounded-lg p-3 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                          />
                        </div>

                        <div className="relative">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-slate-200"></div>
                          </div>
                          <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-3 font-bold text-[9px] text-slate-400">Atau Paste Langsung dari Google Sheets</span>
                          </div>
                        </div>

                        {/* Paste Text Area */}
                        <div>
                          <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Salin Baris Tabel Google Sheets Lalu Tempel di Sini</label>
                          <textarea
                            value={pasteText}
                            onChange={(e) => handlePasteTextChange(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-slate-200 rounded-lg text-xs font-mono text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] bg-slate-50"
                            placeholder="Salin/Copy baris dari Google Sheets (termasuk baris header paling atas) lalu paste di sini..."
                          />
                        </div>
                      </div>

                      {/* Panduan Kolom */}
                      <div className="w-full lg:w-80 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-3">
                        <h4 className="font-extrabold uppercase text-[10px] text-slate-700 tracking-wider flex items-center gap-1.5 border-b pb-1">
                          <HelpCircle size={14} className="text-[#0EA5A4]" />
                          <span>Petunjuk Header Google Sheets</span>
                        </h4>
                        <p className="text-[11px] text-slate-600 font-medium">Sistem kami pintar! Header kolom Anda di Google Sheets tidak harus 100% sama, asalkan mengandung kata kunci berikut:</p>
                        
                        <div className="space-y-2 text-[10px]">
                          {importTargetType === 'produk' && (
                            <>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">SKU</span>: SKU / Kode Produk</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Nama Produk</span>: Nama Produk / Nama / Item</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Harga Jual</span>: Harga Jual / Harga / HJ</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">HPP</span>: HPP / Harga Pokok / Modal / Harga Beli</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Stok Awal</span>: Stok Awal / Stok / Qty</div>
                            </>
                          )}
                          {importTargetType === 'pelanggan' && (
                            <>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">ID Pelanggan</span>: ID Pelanggan / ID / Code</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Nama Instansi</span>: Nama Instansi / Nama / Customer</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Kontak Person</span>: Kontak Person / Kontak / PIC</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Piutang Awal</span>: Piutang / Piutang Awal / Saldo</div>
                            </>
                          )}
                          {importTargetType === 'supplier' && (
                            <>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">ID Supplier</span>: ID Supplier / ID / Code</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Nama Perusahaan</span>: Nama Perusahaan / Nama / Vendor</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Kontak Person</span>: Kontak Person / Kontak / PIC</div>
                              <div className="p-2 bg-white rounded border border-slate-200"><span className="font-black text-teal-600">Hutang Awal</span>: Hutang / Hutang Awal / Saldo</div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Preview Area */}
                    {parsedImportRows.length > 0 && (
                      <div className="border border-teal-200 rounded-xl overflow-hidden bg-teal-50/10 space-y-3 p-4 animate-fade-in">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <h4 className="text-xs font-black text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle size={15} className="text-[#22C55E]" />
                              <span>Pratinjau Data Terbaca ({parsedImportRows.length} baris ditemukan)</span>
                            </h4>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">Sistem berhasil memetakan file Anda. Silakan verifikasi 5 baris pertama di bawah ini:</p>
                          </div>
                          
                          <button
                            type="button"
                            onClick={executeImport}
                            className="px-5 py-2.5 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg shadow-md transition-all cursor-pointer"
                          >
                            🚀 Mulai Impor Sekarang
                          </button>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                          <table className="w-full text-[10px] text-left bg-white">
                            <thead className="bg-slate-50 text-slate-700 font-bold uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                {parsedImportHeaders.map((header, idx) => (
                                  <th key={idx} className="p-2.5 border-r border-slate-100 last:border-0">{header}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {parsedImportRows.slice(0, 5).map((row, rowIdx) => (
                                <tr key={rowIdx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                                  {parsedImportHeaders.map((_, colIdx) => (
                                    <td key={colIdx} className="p-2.5 border-r border-slate-100 last:border-0 font-medium text-slate-700 max-w-xs truncate">
                                      {row[colIdx] !== undefined ? row[colIdx] : ''}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {parsedImportRows.length > 5 && (
                          <p className="text-[10px] text-slate-400 font-mono text-right italic">&bull; Menampilkan 5 dari {parsedImportRows.length} baris total</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB TAB 3: ORIGINAL GAS TEMPLATE */}
                {sheetsHubSubTab === 'gas' && (
                  <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-slate-50 border-b border-slate-200 text-slate-800 flex items-center justify-between p-4">
                      <span className="font-bold flex items-center gap-2 text-xs">
                        <Code className="text-[#0EA5A4]" />
                        <span>Ekspor Kode GAS (Index.html)</span>
                      </span>
                      <span className="text-[10px] text-slate-500 font-black uppercase">Salin &amp; Tempel di Google Apps Script</span>
                    </div>
                    <div className="p-6">
                      <p className="text-xs text-slate-600 mb-4 font-semibold">
                        Gunakan template murni HTML di bawah untuk Google Apps Script (GAS) dengan INO Design System:
                      </p>
                      <pre className="text-[10px] text-slate-700 font-mono overflow-x-auto whitespace-pre p-4 bg-slate-50 border border-slate-200 rounded-lg max-h-96">
{`<!DOCTYPE html>
<html>
<head>
  <base target="_top">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --ino-primary: #0EA5A4;
      --ino-primary-dark: #1E293B;
      --ino-accent: #F59E0B;
      --ino-success: #22C55E;
      --ino-warning: #F59E0B;
      --ino-danger: #EF4444;
      --ino-info: #3B82F6;
      --ino-bg: #F8FAFC;
      --ino-card: #FFFFFF;
      --ino-border: #E2E8F0;
      --ino-text: #1E293B;
      --ino-text-secondary: #475569;
      --ino-text-muted: #94A3B8;
    }
    body {
      font-family: 'Inter', sans-serif;
      background-color: var(--ino-bg);
      color: var(--ino-text);
      margin: 0; padding: 20px;
    }
  </style>
</head>
<body>
  <div class="ino-logo-hexagon">
    <div class="ino-logo-cube"></div>
  </div>
  <h2>INO ERP - Sistem Berhasil Tersambung</h2>
</body>
</html>`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ==========================================
              MODAL: DETAIL & AKSI PURCHASE ORDER (PO)
              ========================================== */}
          {selectedPo && (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="bg-slate-50 text-slate-800 p-5 flex justify-between items-center border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] bg-[#0EA5A4] text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">Doc Viewer</span>
                      <h3 className="font-mono text-lg font-bold tracking-tight text-[#0EA5A4]">{selectedPo.id}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Dokumen Purchase Order &bull; Supplier: <span className="font-bold text-slate-800">{selectedPo.supplier}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setPoActionForm('print')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-300 transition-all flex items-center gap-1.5 text-xs font-bold"
                      title="Cetak Bukti PO"
                    >
                      <Printer size={15} />
                      <span className="hidden sm:inline">Cetak</span>
                    </button>
                    <button 
                      onClick={() => { setSelectedPo(null); setPoActionForm(null); }}
                      className="bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg p-2 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Sub-form Panels Overlay */}
                {poActionForm === 'receipt' ? (
                  /* 1. PENERIMAAN BARANG PO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-[#F8FAFC] border-l-4 border-[#0EA5A4] p-4 rounded-r-lg">
                      <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Penerimaan Barang Gudang (Logistik PO)</h4>
                      <p className="text-xs text-gray-600 mt-1">Masukkan jumlah fisik barang yang baru saja diterima di gudang utama. Status logistik akan disesuaikan otomatis.</p>
                    </div>

                    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
                          <tr>
                            <th className="p-3">Produk</th>
                            <th className="p-3 text-center">Dipesan</th>
                            <th className="p-3 text-center">Telah Terima</th>
                            <th className="p-3 text-center">Sisa Pesanan</th>
                            <th className="p-3 text-right w-36">Terima Sekarang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedPo.items.map((item: any) => {
                            const received = item.qtyReceived ?? (selectedPo.statusLogistik === 'Diterima' ? item.qty : 0);
                            const sisa = Math.max(0, item.qty - received);
                            return (
                              <tr key={item.sku} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <div className="font-bold text-gray-800">{item.nama || 'Produk'}</div>
                                  <div className="font-mono text-[10px] text-gray-500">{item.sku}</div>
                                </td>
                                <td className="p-3 text-center font-semibold text-gray-700">{item.qty} Pcs</td>
                                <td className="p-3 text-center text-teal-600 font-bold">{received} Pcs</td>
                                <td className="p-3 text-center text-amber-600 font-bold">{sisa} Pcs</td>
                                <td className="p-3 text-right">
                                  <input 
                                    type="number"
                                    min="0"
                                    max={sisa}
                                    value={poReceiptQtys[item.sku] ?? 0}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setPoReceiptQtys(prev => ({ ...prev, [item.sku]: val }));
                                    }}
                                    disabled={sisa === 0}
                                    className="w-full p-2 border border-[#E2E8F0] rounded-lg text-right text-xs font-bold disabled:bg-gray-100 disabled:text-gray-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4">
                      <button 
                        onClick={() => setPoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => submitPoReceipt(selectedPo.id)}
                        className="px-4 py-2 bg-[#0EA5A4] hover:bg-[#0CA09F] text-white text-xs font-bold rounded-lg shadow-md transition-all"
                      >
                        Simpan Penerimaan
                      </button>
                    </div>
                  </div>
                ) : poActionForm === 'payment' ? (
                  /* 2. PEMBAYARAN PO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-[#F8FAFC] border-l-4 border-emerald-500 p-4 rounded-r-lg">
                      <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Formulir Pembayaran Hutang Supplier</h4>
                      <p className="text-xs text-gray-600 mt-1">Catat pengeluaran kas atau transfer bank untuk melunasi tagihan PO ini. Hutang supplier otomatis disesuaikan.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Nilai Tagihan PO</span>
                        <span className="text-xl font-black text-gray-800">Rp {selectedPo.grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 font-bold uppercase block">Sisa Hutang Belum Dibayar</span>
                        <span className="text-xl font-black text-amber-600">
                          Rp {(selectedPo.grandTotal - (selectedPo.totalPaid ?? (selectedPo.statusBayar === 'Lunas' ? selectedPo.grandTotal : 0))).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500">Nominal Bayar (Rupiah)</label>
                        <input 
                          type="number"
                          value={poPaymentVal}
                          onChange={(e) => setPoPaymentVal(Math.max(0, parseInt(e.target.value) || 0))}
                          className="p-2.5 border border-[#E2E8F0] rounded-lg text-sm font-bold bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500">Metode Pembayaran</label>
                        <select 
                          value={poPaymentMetode}
                          onChange={(e) => setPoPaymentMetode(e.target.value)}
                          className="p-2.5 border border-[#E2E8F0] rounded-lg text-xs font-bold bg-white"
                        >
                          <option value="Transfer Bank">Transfer Bank / M-Banking</option>
                          <option value="Kas Tunai">Kas Tunai (Petty Cash)</option>
                          <option value="Giro / Cek">Giro atau Cek</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500">Nomor Referensi / Kode Transaksi</label>
                        <input 
                          type="text"
                          placeholder="Contoh: TRX-100238"
                          value={poPaymentRef}
                          onChange={(e) => setPoPaymentRef(e.target.value)}
                          className="p-2.5 border border-[#E2E8F0] rounded-lg text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500">Catatan Keuangan (Memo)</label>
                        <input 
                          type="text"
                          placeholder="Tulis rincian tambahan..."
                          value={poPaymentMemo}
                          onChange={(e) => setPoPaymentMemo(e.target.value)}
                          className="p-2.5 border border-[#E2E8F0] rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E2E8F0]">
                      <button 
                        onClick={() => setPoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => submitPoPayment(selectedPo.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                      >
                        Catat Pembayaran
                      </button>
                    </div>
                  </div>
                ) : poActionForm === 'retur' ? (
                  /* 3. RETUR BARANG PO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-[#FFF5F5] border-l-4 border-[#EF4444] p-4 rounded-r-lg">
                      <h4 className="text-xs font-black text-[#EF4444] uppercase tracking-wider">Formulir Retur Barang ke Supplier</h4>
                      <p className="text-xs text-gray-600 mt-1">Mengembalikan stok produk yang rusak/cacat ke supplier. Stok gudang akan berkurang &amp; sisa hutang akan dikoreksi.</p>
                    </div>

                    <div className="border border-red-100 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-red-50 text-red-900 font-bold uppercase border-b border-red-100">
                          <tr>
                            <th className="p-3">Produk</th>
                            <th className="p-3 text-center">Telah Diterima</th>
                            <th className="p-3 text-center">Telah Diretur</th>
                            <th className="p-3 text-center">Batas Maks Retur</th>
                            <th className="p-3 text-right w-36">Retur Sekarang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedPo.items.map((item: any) => {
                            const received = item.qtyReceived ?? (selectedPo.statusLogistik === 'Diterima' ? item.qty : 0);
                            const returned = item.qtyReturned ?? 0;
                            const maxRetur = Math.max(0, received - returned);
                            return (
                              <tr key={item.sku} className="hover:bg-red-50/30">
                                <td className="p-3">
                                  <div className="font-bold text-gray-800">{item.nama || 'Produk'}</div>
                                  <div className="font-mono text-[10px] text-gray-500">{item.sku}</div>
                                </td>
                                <td className="p-3 text-center text-teal-600 font-bold">{received} Pcs</td>
                                <td className="p-3 text-center text-red-500 font-bold">{returned} Pcs</td>
                                <td className="p-3 text-center text-slate-600 font-semibold">{maxRetur} Pcs</td>
                                <td className="p-3 text-right">
                                  <input 
                                    type="number"
                                    min="0"
                                    max={maxRetur}
                                    value={poReturQtys[item.sku] ?? 0}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setPoReturQtys(prev => ({ ...prev, [item.sku]: val }));
                                    }}
                                    disabled={maxRetur === 0}
                                    className="w-full p-2 border border-red-200 rounded-lg text-right text-xs font-bold disabled:bg-gray-100 disabled:text-gray-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <label className="text-[10px] font-black uppercase text-slate-500">Alasan Retur (Wajib diisi)</label>
                      <textarea 
                        rows={2}
                        placeholder="Contoh: Barang cacat produksi / pecah saat pengiriman..."
                        value={poReturAlasan}
                        onChange={(e) => setPoReturAlasan(e.target.value)}
                        className="p-2 border border-[#E2E8F0] rounded-lg text-xs bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4">
                      <button 
                        onClick={() => setPoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => submitPoRetur(selectedPo.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                      >
                        Proses Retur Pembelian
                      </button>
                    </div>
                  </div>
                ) : poActionForm === 'print' ? (
                  /* 4. PRINT TEMPLATE COPIABLE */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                      <div>
                        <p className="text-xs text-slate-700 font-semibold">Tampilan Dokumen Resmi.</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">*Jika tombol tidak merespon di AI Studio, klik tombol <strong>Buka di Tab Baru</strong> di kanan atas preview.</p>
                      </div>
                      <button 
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Printer size={13} />
                        Cetak / Simpan PDF
                      </button>
                    </div>

                    <div id="print-area" className="border border-gray-300 p-8 rounded-xl bg-white space-y-6 text-slate-800 font-sans shadow-inner max-w-3xl mx-auto">
                      <div className="flex justify-between border-b-2 border-[#1E293B] pb-4">
                        <div>
                          <h1 className="text-xl font-black text-[#1E293B] tracking-tight">PT. BALI JAYA SUKSES</h1>
                          <p className="text-xs text-gray-500 mt-1">Jl. Sunset Road No. 88X, Kuta, Bali</p>
                          <p className="text-xs text-gray-500">Telp: (0361) 882-9382 &bull; Email: info@balijayasukses.co.id</p>
                        </div>
                        <div className="text-right">
                          <h2 className="text-base font-black text-[#0EA5A4] tracking-wide">SURAT PESANAN (PO)</h2>
                          <p className="text-xs font-mono font-bold text-slate-600 mt-1">NO: {selectedPo.id}</p>
                          <p className="text-xs text-gray-500">Tanggal: {selectedPo.tanggal}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <p className="font-bold uppercase text-[#1E293B] border-b pb-1 mb-2">Ditujukan Kepada Supplier:</p>
                          <p className="font-black text-[#0EA5A4]">{selectedPo.supplier}</p>
                          <p className="text-gray-500 mt-1">Sistem Pembayaran: {selectedPo.metode}</p>
                          <p className="text-gray-500">Keuangan: {selectedPo.statusBayar}</p>
                        </div>
                        <div>
                          <p className="font-bold uppercase text-[#1E293B] border-b pb-1 mb-2">Alamat Pengiriman Gudang:</p>
                          <p className="font-semibold text-gray-700">PT. Bali Jaya Sukses - Gudang Logistik Utama</p>
                          <p className="text-gray-500 mt-1">Status Logistik: {selectedPo.statusLogistik}</p>
                        </div>
                      </div>

                      <table className="w-full text-xs text-left border-collapse mt-4">
                        <thead>
                          <tr className="bg-slate-100 border-t border-b border-slate-300">
                            <th className="p-2 font-bold uppercase text-slate-700">SKU</th>
                            <th className="p-2 font-bold uppercase text-slate-700">Deskripsi Barang</th>
                            <th className="p-2 text-center font-bold uppercase text-slate-700">Kuantitas</th>
                            <th className="p-2 text-right font-bold uppercase text-slate-700">Harga Satuan</th>
                            <th className="p-2 text-right font-bold uppercase text-slate-700">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedPo.items.map((item: any) => (
                            <tr key={item.sku}>
                              <td className="p-2 font-mono text-slate-500">{item.sku}</td>
                              <td className="p-2 font-semibold text-slate-800">{item.nama || 'Produk'}</td>
                              <td className="p-2 text-center">{item.qty} Pcs</td>
                              <td className="p-2 text-right">Rp {item.harga.toLocaleString('id-ID')}</td>
                              <td className="p-2 text-right font-bold">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-[#1E293B] font-bold">
                            <td colSpan={4} className="p-2 text-right uppercase">Grand Total:</td>
                            <td className="p-2 text-right text-[#0EA5A4] text-sm">Rp {selectedPo.grandTotal.toLocaleString('id-ID')}</td>
                          </tr>
                        </tfoot>
                      </table>

                      <div className="grid grid-cols-2 gap-4 text-xs pt-12 text-center">
                        <div>
                          <p className="text-gray-500 mb-12">Disetujui Oleh,</p>
                          <p className="font-black border-b border-gray-400 w-48 mx-auto pb-1">Direktur Operasional</p>
                        </div>
                        <div>
                          <p className="text-gray-500 mb-12">Diterima Oleh Supplier,</p>
                          <p className="font-black border-b border-gray-400 w-48 mx-auto pb-1">{selectedPo.supplier}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={() => setPoActionForm(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Kembali Ke Detail
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 5. DOKUMEN GENERAL VIEW (Kebab dropdown, detail info, item lists, history) */
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    
                    {/* Top Status Banner & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                      <div className="flex flex-wrap gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-gray-400">Logistik</span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase text-center mt-0.5 ${
                            selectedPo.statusLogistik === 'Diterima' ? 'bg-[#22C55E] bg-opacity-15 text-[#22C55E]' :
                            selectedPo.statusLogistik === 'Diterima Sebagian' ? 'bg-[#3B82F6] bg-opacity-15 text-[#3B82F6]' :
                            selectedPo.statusLogistik === 'Menunggu' ? 'bg-[#F59E0B] bg-opacity-15 text-[#F59E0B]' :
                            selectedPo.statusLogistik === 'Void' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {selectedPo.statusLogistik}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-gray-400">Pembayaran</span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase text-center mt-0.5 ${
                            selectedPo.statusBayar === 'Lunas' ? 'bg-[#22C55E] bg-opacity-15 text-[#22C55E]' :
                            selectedPo.statusBayar === 'Cicilan' ? 'bg-indigo-100 text-indigo-700' :
                            selectedPo.statusBayar === 'Belum Dibayar' ? 'bg-[#EF4444] bg-opacity-15 text-[#EF4444]' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {selectedPo.statusBayar}
                          </span>
                        </div>
                        {selectedPo.totalPaid !== undefined && (
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-gray-400">Terbayar</span>
                            <span className="text-xs font-bold text-emerald-600 mt-0.5">
                              Rp {selectedPo.totalPaid.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 relative">
                        {/* Interactive Main Action */}
                        {selectedPo.statusLogistik === 'Draft' ? (
                          <button 
                            onClick={() => handleApprovePO(selectedPo.id)}
                            className="px-4 py-2 bg-[#0EA5A4] hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow-md transition-all flex items-center gap-1.5"
                          >
                            Setujui &amp; Rilis PO
                          </button>
                        ) : (
                          <>
                            {selectedPo.statusLogistik !== 'Diterima' && selectedPo.statusLogistik !== 'Void' && (
                              <button 
                                onClick={() => handleOpenPoReceipt(selectedPo)}
                                className="px-3.5 py-2 bg-[#0EA5A4] hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow transition-all"
                              >
                                Penerimaan Gudang
                              </button>
                            )}
                            {selectedPo.statusBayar !== 'Lunas' && selectedPo.statusLogistik !== 'Void' && (
                              <button 
                                onClick={() => handleOpenPoPayment(selectedPo)}
                                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition-all"
                              >
                                Catat Pembayaran
                              </button>
                            )}
                          </>
                        )}

                        {/* Kebab Extra Actions */}
                        <div className="relative">
                          <button 
                            onClick={() => setPoShowKebab(!poShowKebab)}
                            className="p-2 bg-gray-200 hover:bg-gray-300 text-slate-700 rounded-lg transition-all"
                          >
                            &bull;&bull;&bull;
                          </button>
                          {poShowKebab && (
                            <div className="absolute right-0 bottom-full mb-2 bg-white rounded-lg shadow-xl border border-slate-200 w-48 z-50 overflow-hidden divide-y divide-slate-100">
                              <button 
                                onClick={() => { setPoShowKebab(false); handleOpenPoRetur(selectedPo); }}
                                disabled={selectedPo.statusLogistik === 'Void' || selectedPo.statusLogistik === 'Draft'}
                                className="w-full text-left p-2.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50 disabled:pointer-events-none"
                              >
                                Retur Barang Pembelian
                              </button>
                              <button 
                                onClick={() => { 
                                  setPoShowKebab(false); 
                                  if (window.confirm("Apakah Anda yakin melakukan VOID pada PO ini? Tindakan ini akan mengembalikan stok & tagihan supplier.")) {
                                    handleVoidPO(selectedPo.id);
                                    setSelectedPo(null);
                                  }
                                }}
                                disabled={selectedPo.statusLogistik === 'Void'}
                                className="w-full text-left p-2.5 text-xs font-black text-red-600 hover:bg-red-100 transition-all disabled:opacity-50 disabled:pointer-events-none"
                              >
                                Void (Batalkan) PO
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* General Metadata Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Metode Pembayaran</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedPo.metode || 'Transfer Bank'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Tanggal Pembuatan PO</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedPo.tanggal}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-600 font-bold uppercase block">Total Nilai Pembelian</span>
                        <span className="text-sm font-bold text-[#0EA5A4]">Rp {selectedPo.grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      {selectedPo.catatan && (
                        <div className="col-span-1 sm:col-span-3">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Catatan Tambahan / Memo</span>
                          <p className="text-xs text-gray-600 italic mt-0.5">{selectedPo.catatan}</p>
                        </div>
                      )}
                    </div>

                    {/* Order Items Table */}
                    <div>
                      <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider mb-2">Daftar Barang Pesanan</h4>
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#1E293B] text-white font-bold uppercase tracking-wider">
                            <tr>
                              <th className="p-3">SKU / Nama Barang</th>
                              <th className="p-3 text-center">Dipesan</th>
                              <th className="p-3 text-center">Diterima</th>
                              <th className="p-3 text-right">Harga Satuan</th>
                              <th className="p-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedPo.items.map((item: any) => {
                              const rec = item.qtyReceived ?? (selectedPo.statusLogistik === 'Diterima' ? item.qty : 0);
                              return (
                                <tr key={item.sku} className="hover:bg-slate-50">
                                  <td className="p-3">
                                    <div className="font-bold text-[#1E293B]">{item.nama || 'Produk'}</div>
                                    <div className="font-mono text-[10px] text-gray-500">{item.sku}</div>
                                  </td>
                                  <td className="p-3 text-center font-semibold text-slate-700">{item.qty} Pcs</td>
                                  <td className="p-3 text-center font-bold text-teal-600">{rec} Pcs</td>
                                  <td className="p-3 text-right text-gray-600">Rp {item.harga.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-right font-black text-slate-800">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Retur History Panel */}
                    {selectedPo.returItems && selectedPo.returItems.length > 0 && (
                      <div className="bg-red-50/50 border border-red-200 rounded-xl p-4">
                        <h4 className="text-xs font-black text-[#EF4444] uppercase tracking-wider mb-2 flex items-center gap-1">
                          <CornerUpLeft size={13} />
                          <span>Riwayat Retur Pembelian</span>
                        </h4>
                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-red-200 text-red-900 font-bold uppercase text-[10px]">
                                <th className="pb-1.5">Tanggal</th>
                                <th className="pb-1.5">Barang</th>
                                <th className="pb-1.5 text-center">Kuantitas</th>
                                <th className="pb-1.5">Alasan Retur</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-red-100">
                              {selectedPo.returItems.map((r: any, idx: number) => (
                                <tr key={idx} className="text-red-950 font-semibold">
                                  <td className="py-2">{r.tanggal}</td>
                                  <td className="py-2">{r.nama} ({r.sku})</td>
                                  <td className="py-2 text-center text-red-600 font-black">{r.qty} Pcs</td>
                                  <td className="py-2 italic text-gray-600">{r.alasan}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Footer Controls */}
                <div className="bg-gray-50 px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-2">
                  <button 
                    onClick={() => { setSelectedPo(null); setPoActionForm(null); }}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    Tutup Viewer
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* ==========================================
              MODAL: DETAIL & AKSI SALES ORDER (SO)
              ========================================== */}
          {selectedSo && (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-2xl border border-[#E2E8F0] w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Modal Header */}
                <div className="bg-slate-50 text-slate-800 p-5 flex justify-between items-center border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[10px] bg-[#0EA5A4] text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">Doc Viewer</span>
                      <h3 className="font-mono text-lg font-bold tracking-tight text-[#0EA5A4]">{selectedSo.id}</h3>
                    </div>
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      Dokumen Sales Order &bull; Customer: <span className="font-bold text-slate-800">{selectedSo.pelanggan}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setSoActionForm('print')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-gray-300 transition-all flex items-center gap-1.5 text-xs font-bold"
                      title="Cetak Struk SO"
                    >
                      <Printer size={15} />
                      <span className="hidden sm:inline">Cetak Struk</span>
                    </button>
                    <button 
                      onClick={() => { setSelectedSo(null); setSoActionForm(null); }}
                      className="bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg p-2 transition-all"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                {/* Sub-form Panels Overlay */}
                {soActionForm === 'shipment' ? (
                  /* 1. PENGIRIMAN BARANG SO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-[#F8FAFC] border-l-4 border-[#0EA5A4] p-4 rounded-r-lg">
                      <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Surat Jalan / Pengiriman Barang (Logistik SO)</h4>
                      <p className="text-xs text-gray-600 mt-1">Keluarkan barang fisik dari gudang utama dan kurangi stok gudang secara otomatis untuk dikirim ke customer.</p>
                    </div>

                    <div className="border border-[#E2E8F0] rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-gray-50 text-gray-700 font-bold uppercase tracking-wider border-b border-[#E2E8F0]">
                          <tr>
                            <th className="p-3">Produk</th>
                            <th className="p-3 text-center">Pesanan</th>
                            <th className="p-3 text-center">Telah Kirim</th>
                            <th className="p-3 text-center">Sisa Kirim</th>
                            <th className="p-3 text-center">Stok Gudang</th>
                            <th className="p-3 text-right w-32">Kirim Sekarang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedSo.items.map((item: any) => {
                            const shipped = item.qtyShipped ?? (selectedSo.statusLogistik === 'Terkirim' || selectedSo.statusLogistik === 'Selesai' ? item.qty : 0);
                            const sisa = Math.max(0, item.qty - shipped);
                            const prod = products.find(p => p.sku === item.sku);
                            const stockCount = prod ? prod.stok : 0;
                            return (
                              <tr key={item.sku} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <div className="font-bold text-gray-800">{item.nama || 'Produk'}</div>
                                  <div className="font-mono text-[10px] text-gray-500">{item.sku}</div>
                                </td>
                                <td className="p-3 text-center font-semibold text-gray-700">{item.qty} Pcs</td>
                                <td className="p-3 text-center text-teal-600 font-bold">{shipped} Pcs</td>
                                <td className="p-3 text-center text-amber-600 font-bold">{sisa} Pcs</td>
                                <td className={`p-3 text-center font-black ${stockCount < sisa ? 'text-red-500' : 'text-slate-700'}`}>
                                  {stockCount} Pcs
                                </td>
                                <td className="p-3 text-right">
                                  <input 
                                    type="number"
                                    min="0"
                                    max={sisa}
                                    value={soShipmentQtys[item.sku] ?? 0}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setSoShipmentQtys(prev => ({ ...prev, [item.sku]: val }));
                                    }}
                                    disabled={sisa === 0}
                                    className="w-full p-2 border border-[#E2E8F0] rounded-lg text-right text-xs font-bold disabled:bg-gray-100 disabled:text-gray-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4">
                      <button 
                        onClick={() => setSoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => submitSoShipment(selectedSo.id)}
                        className="px-4 py-2 bg-[#0EA5A4] hover:bg-[#0CA09F] text-white text-xs font-bold rounded-lg shadow-md transition-all"
                      >
                        Kirim Barang
                      </button>
                    </div>
                  </div>
                ) : soActionForm === 'payment' ? (
                  /* 2. PELUNASAN PIUTANG SO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-[#F8FAFC] border-l-4 border-emerald-500 p-4 rounded-r-lg">
                      <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider">Pencatatan Terima Piutang Customer</h4>
                      <p className="text-xs text-gray-600 mt-1">Catat pembayaran masuk (setoran kas/transfer bank) dari pelanggan untuk mengurangi piutang dagang pelanggan tersebut.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#F8FAFC] p-5 rounded-xl border border-[#E2E8F0]">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Nilai Penjualan</span>
                        <span className="text-xl font-black text-gray-800">Rp {selectedSo.grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-amber-600 font-bold uppercase block">Sisa Piutang Belum Lunas</span>
                        <span className="text-xl font-black text-amber-600">
                          Rp {(selectedSo.grandTotal - (selectedSo.totalPaid ?? (selectedSo.statusBayar === 'Lunas' ? selectedSo.grandTotal : 0))).toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500">Nominal Pembayaran Diterima (Rp)</label>
                        <input 
                          type="number"
                          value={soPaymentVal}
                          onChange={(e) => setSoPaymentVal(Math.max(0, parseInt(e.target.value) || 0))}
                          className="p-2.5 border border-[#E2E8F0] rounded-lg text-sm font-bold bg-white"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500">Metode Pembayaran</label>
                        <select 
                          value={soPaymentMetode}
                          onChange={(e) => setSoPaymentMetode(e.target.value)}
                          className="p-2.5 border border-[#E2E8F0] rounded-lg text-xs font-bold bg-white"
                        >
                          <option value="Transfer Bank">Transfer Bank / M-Banking</option>
                          <option value="Kas Tunai">Setoran Tunai Kasir</option>
                          <option value="EDC Mesin">Mesin EDC Kartu</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500">Nomor Bukti Transfer / No Ref</label>
                        <input 
                          type="text"
                          placeholder="Contoh: REF-9283729"
                          value={soPaymentRef}
                          onChange={(e) => setSoPaymentRef(e.target.value)}
                          className="p-2.5 border border-[#E2E8F0] rounded-lg text-xs"
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-gray-500">Catatan Keuangan (Memo)</label>
                        <input 
                          type="text"
                          placeholder="Tulis rincian setoran..."
                          value={soPaymentMemo}
                          onChange={(e) => setSoPaymentMemo(e.target.value)}
                          className="p-2.5 border border-[#E2E8F0] rounded-lg text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4 border-t border-[#E2E8F0]">
                      <button 
                        onClick={() => setSoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => submitSoPayment(selectedSo.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                      >
                        Simpan Pembayaran
                      </button>
                    </div>
                  </div>
                ) : soActionForm === 'retur' ? (
                  /* 3. RETUR BARANG SO (Customer return) */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-[#FFF5F5] border-l-4 border-[#EF4444] p-4 rounded-r-lg">
                      <h4 className="text-xs font-black text-[#EF4444] uppercase tracking-wider">Formulir Retur Barang dari Pelanggan</h4>
                      <p className="text-xs text-gray-600 mt-1">Mencatat barang yang dikembalikan oleh pelanggan karena rusak/tidak sesuai. Stok gudang akan ditambahkan kembali &amp; piutang customer dikoreksi.</p>
                    </div>

                    <div className="border border-red-100 rounded-lg overflow-hidden bg-white">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-red-50 text-red-900 font-bold uppercase border-b border-red-100">
                          <tr>
                            <th className="p-3">Produk</th>
                            <th className="p-3 text-center">Telah Dikirim</th>
                            <th className="p-3 text-center">Telah Diretur</th>
                            <th className="p-3 text-center">Batas Maks Retur</th>
                            <th className="p-3 text-right w-36">Retur Sekarang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedSo.items.map((item: any) => {
                            const shipped = item.qtyShipped ?? (selectedSo.statusLogistik === 'Terkirim' || selectedSo.statusLogistik === 'Selesai' ? item.qty : 0);
                            const returned = item.qtyReturned ?? 0;
                            const maxRetur = Math.max(0, shipped - returned);
                            return (
                              <tr key={item.sku} className="hover:bg-red-50/30">
                                <td className="p-3">
                                  <div className="font-bold text-gray-800">{item.nama || 'Produk'}</div>
                                  <div className="font-mono text-[10px] text-gray-500">{item.sku}</div>
                                </td>
                                <td className="p-3 text-center text-teal-600 font-bold">{shipped} Pcs</td>
                                <td className="p-3 text-center text-red-500 font-bold">{returned} Pcs</td>
                                <td className="p-3 text-center text-slate-600 font-semibold">{maxRetur} Pcs</td>
                                <td className="p-3 text-right">
                                  <input 
                                    type="number"
                                    min="0"
                                    max={maxRetur}
                                    value={soReturQtys[item.sku] ?? 0}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      setSoReturQtys(prev => ({ ...prev, [item.sku]: val }));
                                    }}
                                    disabled={maxRetur === 0}
                                    className="w-full p-2 border border-red-200 rounded-lg text-right text-xs font-bold disabled:bg-gray-100 disabled:text-gray-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <label className="text-[10px] font-black uppercase text-slate-500">Alasan Retur Pelanggan (Wajib)</label>
                      <textarea 
                        rows={2}
                        placeholder="Contoh: Ukuran salah / cacat pengemasan dari pabrik..."
                        value={soReturAlasan}
                        onChange={(e) => setSoReturAlasan(e.target.value)}
                        className="p-2 border border-[#E2E8F0] rounded-lg text-xs bg-white"
                      />
                    </div>

                    <div className="flex justify-end gap-2.5 pt-4">
                      <button 
                        onClick={() => setSoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 text-xs font-bold rounded-lg transition-all"
                      >
                        Batal
                      </button>
                      <button 
                        onClick={() => submitSoRetur(selectedSo.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-md transition-all"
                      >
                        Proses Retur Pelanggan
                      </button>
                    </div>
                  </div>
                ) : soActionForm === 'print' ? (
                  /* 4. STRUK CETAK SALES ORDER */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-xl border border-slate-200 gap-4">
                      <div>
                        <p className="text-xs text-slate-700 font-semibold">Struk Belanja Pelanggan.</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">*Jika tombol tidak merespon di AI Studio, klik tombol <strong>Buka di Tab Baru</strong> di kanan atas preview.</p>
                      </div>
                      <button 
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-[#0EA5A4] hover:bg-[#0C8F8E] text-white text-xs font-semibold rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Printer size={13} />
                        Cetak Struk / PDF
                      </button>
                    </div>

                    <div id="print-area" className="border border-gray-300 p-6 rounded-xl bg-[#FAFAFA] space-y-4 text-slate-900 font-mono text-xs max-w-sm mx-auto shadow-inner">
                      <div className="text-center space-y-1">
                        <h2 className="text-sm font-bold uppercase">PT. INO JAYA MANDIRI</h2>
                        <p className="text-[10px] text-gray-500">ITC Mangga Dua, Lt. 2 Blok A, Jakarta</p>
                        <p className="text-[10px] text-gray-500">Telp: 0812-9482-9382</p>
                        <p className="border-b border-dashed border-gray-400 py-1"></p>
                      </div>

                      <div className="space-y-1 text-[11px]">
                        <p>No Transaksi: <span className="font-bold">{selectedSo.id}</span></p>
                        <p>Tanggal: {selectedSo.tanggal}</p>
                        <p>Pelanggan: <span className="font-bold">{selectedSo.pelanggan}</span></p>
                        <p>Pembayaran: {selectedSo.metode} ({selectedSo.statusBayar})</p>
                        <p className="border-b border-dashed border-gray-400 py-1"></p>
                      </div>

                      <div className="space-y-2">
                        {selectedSo.items.map((item: any) => (
                          <div key={item.sku} className="text-[11px]">
                            <div className="font-bold">{item.nama}</div>
                            <div className="flex justify-between text-[10px] text-gray-600 pl-2">
                              <span>{item.qty} Pcs x Rp {item.harga.toLocaleString('id-ID')}</span>
                              <span>Rp {item.subtotal.toLocaleString('id-ID')}</span>
                            </div>
                          </div>
                        ))}
                        <p className="border-b border-dashed border-gray-400 py-1"></p>
                      </div>

                      <div className="space-y-1 text-[11px] text-right">
                        <p className="flex justify-between font-bold">
                          <span>Total Tagihan:</span>
                          <span>Rp {selectedSo.grandTotal.toLocaleString('id-ID')}</span>
                        </p>
                        {selectedSo.totalPaid !== undefined && (
                          <p className="flex justify-between">
                            <span>Bayar Setor:</span>
                            <span>Rp {selectedSo.totalPaid.toLocaleString('id-ID')}</span>
                          </p>
                        )}
                      </div>

                      <div className="text-center pt-6 space-y-1 text-[10px] text-gray-500">
                        <p>Terima Kasih Telah Berbelanja</p>
                        <p>Barang yang sudah dibeli tidak dapat ditukar</p>
                        <p className="font-bold text-gray-700">Powered by INO ERP v1.0</p>
                      </div>
                    </div>

                    <div className="flex justify-end pt-4">
                      <button 
                        onClick={() => setSoActionForm(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-all"
                      >
                        Kembali Ke Detail
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 5. DOKUMEN GENERAL VIEW */
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    
                    {/* Top Status Banner & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0]">
                      <div className="flex flex-wrap gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-gray-400">Pengiriman</span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase text-center mt-0.5 ${
                            selectedSo.statusLogistik === 'Terkirim' || selectedSo.statusLogistik === 'Selesai' ? 'bg-[#22C55E] bg-opacity-15 text-[#22C55E]' :
                            selectedSo.statusLogistik === 'Terkirim Sebagian' ? 'bg-indigo-100 text-indigo-700' :
                            selectedSo.statusLogistik === 'Menunggu' || selectedSo.statusLogistik === 'Menunggu Pengiriman' ? 'bg-[#F59E0B] bg-opacity-15 text-[#F59E0B]' :
                            selectedSo.statusLogistik === 'Void' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {selectedSo.statusLogistik}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] uppercase font-bold text-gray-400">Keuangan</span>
                          <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase text-center mt-0.5 ${
                            selectedSo.statusBayar === 'Lunas' ? 'bg-[#22C55E] bg-opacity-15 text-[#22C55E]' :
                            selectedSo.statusBayar === 'Cicilan' ? 'bg-indigo-100 text-indigo-700' :
                            selectedSo.statusBayar === 'Belum Lunas' ? 'bg-[#EF4444] bg-opacity-15 text-[#EF4444]' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {selectedSo.statusBayar}
                          </span>
                        </div>
                        {selectedSo.totalPaid !== undefined && (
                          <div className="flex flex-col">
                            <span className="text-[9px] uppercase font-bold text-gray-400">Telah Disetor</span>
                            <span className="text-xs font-bold text-emerald-600 mt-0.5">
                              Rp {selectedSo.totalPaid.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2 relative">
                        {selectedSo.statusLogistik !== 'Terkirim' && selectedSo.statusLogistik !== 'Void' && (
                          <button 
                            onClick={() => handleOpenSoShipment(selectedSo)}
                            className="px-3.5 py-2 bg-[#0EA5A4] hover:bg-teal-700 text-white text-xs font-bold rounded-lg shadow transition-all"
                          >
                            Proses Kirim (SJ)
                          </button>
                        )}
                        {selectedSo.statusBayar !== 'Lunas' && selectedSo.statusLogistik !== 'Void' && (
                          <button 
                            onClick={() => handleOpenSoPayment(selectedSo)}
                            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow transition-all"
                          >
                            Terima Pembayaran
                          </button>
                        )}

                        {/* Kebab dropdown */}
                        <div className="relative">
                          <button 
                            onClick={() => setSoShowKebab(!soShowKebab)}
                            className="p-2 bg-gray-200 hover:bg-gray-300 text-slate-700 rounded-lg transition-all"
                          >
                            &bull;&bull;&bull;
                          </button>
                          {soShowKebab && (
                            <div className="absolute right-0 bottom-full mb-2 bg-white rounded-lg shadow-xl border border-slate-200 w-48 z-50 overflow-hidden divide-y divide-slate-100">
                              <button 
                                onClick={() => { setSoShowKebab(false); handleOpenSoRetur(selectedSo); }}
                                disabled={selectedSo.statusLogistik === 'Void'}
                                className="w-full text-left p-2.5 text-xs font-semibold text-slate-700 hover:bg-red-50 hover:text-red-600 transition-all disabled:opacity-50 disabled:pointer-events-none"
                              >
                                Retur Barang Penjualan
                              </button>
                              <button 
                                onClick={() => { 
                                  setSoShowKebab(false); 
                                  if (window.confirm("Apakah Anda yakin melakukan VOID pada SO ini? Tindakan ini akan mengembalikan stok & membatalkan piutang.")) {
                                    handleVoidSO(selectedSo.id);
                                    setSelectedSo(null);
                                  }
                                }}
                                disabled={selectedSo.statusLogistik === 'Void'}
                                className="w-full text-left p-2.5 text-xs font-black text-red-600 hover:bg-red-100 transition-all disabled:opacity-50 disabled:pointer-events-none"
                              >
                                Void (Batalkan) SO
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Metadata Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-[#E2E8F0]">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Metode Pembayaran</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedSo.metode}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase block">Tanggal Penjualan</span>
                        <span className="text-sm font-semibold text-slate-800">{selectedSo.tanggal}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-600 font-bold uppercase block">Total Nilai Penjualan</span>
                        <span className="text-sm font-bold text-[#0EA5A4]">Rp {selectedSo.grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      {selectedSo.catatan && (
                        <div className="col-span-1 sm:col-span-3">
                          <span className="text-[10px] text-gray-400 font-bold uppercase block">Catatan Tambahan / Memo</span>
                          <p className="text-xs text-gray-600 italic mt-0.5">{selectedSo.catatan}</p>
                        </div>
                      )}
                    </div>

                    {/* Order Items Table */}
                    <div>
                      <h4 className="text-xs font-black text-[#1E293B] uppercase tracking-wider mb-2">Rincian Produk Dipesan</h4>
                      <div className="border border-[#E2E8F0] rounded-xl overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#1E293B] text-white font-bold uppercase tracking-wider">
                            <tr>
                              <th className="p-3">SKU / Nama Barang</th>
                              <th className="p-3 text-center">Pesanan</th>
                              <th className="p-3 text-center">Telah Kirim</th>
                              <th className="p-3 text-right">Harga Satuan</th>
                              <th className="p-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedSo.items.map((item: any) => {
                              const sended = item.qtyShipped ?? (selectedSo.statusLogistik === 'Terkirim' || selectedSo.statusLogistik === 'Selesai' ? item.qty : 0);
                              return (
                                <tr key={item.sku} className="hover:bg-slate-50">
                                  <td className="p-3">
                                    <div className="font-bold text-[#1E293B]">{item.nama || 'Produk'}</div>
                                    <div className="font-mono text-[10px] text-gray-500">{item.sku}</div>
                                  </td>
                                  <td className="p-3 text-center font-semibold text-slate-700">{item.qty} Pcs</td>
                                  <td className="p-3 text-center font-bold text-teal-600">{sended} Pcs</td>
                                  <td className="p-3 text-right text-gray-600">Rp {item.harga.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-right font-black text-slate-800">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Retur History Panel */}
                    {selectedSo.returItems && selectedSo.returItems.length > 0 && (
                      <div className="bg-red-50/50 border border-red-200 rounded-xl p-4">
                        <h4 className="text-xs font-black text-[#EF4444] uppercase tracking-wider mb-2 flex items-center gap-1">
                          <CornerUpLeft size={13} />
                          <span>Riwayat Retur Penjualan</span>
                        </h4>
                        <div className="overflow-x-auto text-xs">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-red-200 text-red-900 font-bold uppercase text-[10px]">
                                <th className="pb-1.5">Tanggal</th>
                                <th className="pb-1.5">Barang</th>
                                <th className="pb-1.5 text-center">Kuantitas</th>
                                <th className="pb-1.5">Alasan Retur</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-red-100">
                              {selectedSo.returItems.map((r: any, idx: number) => (
                                <tr key={idx} className="text-red-950 font-semibold">
                                  <td className="py-2">{r.tanggal}</td>
                                  <td className="py-2">{r.nama} ({r.sku})</td>
                                  <td className="py-2 text-center text-red-600 font-black">{r.qty} Pcs</td>
                                  <td className="py-2 italic text-gray-600">{r.alasan}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                )}

                {/* Footer Controls */}
                <div className="bg-gray-50 px-6 py-4 border-t border-[#E2E8F0] flex justify-end gap-2">
                  <button 
                    onClick={() => { setSelectedSo(null); setSoActionForm(null); }}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow-md"
                  >
                    Tutup Viewer
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* OVERLAY: PRODUCT TRANSACTION HISTORY */}
          {viewingProductTx && (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden border border-slate-200 max-h-[90vh]">
                <div className="bg-slate-50 text-slate-800 p-5 flex justify-between items-center border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#0EA5A4]/15 p-2 rounded-lg">
                      <Package className="text-[#0EA5A4]" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Rincian & Kartu Kendali Stok</h3>
                      <p className="text-[11px] text-slate-500 font-semibold">SKU: <span className="font-mono font-bold text-slate-800">{viewingProductTx.sku}</span></p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewingProductTx(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Nama Barang</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewingProductTx.nama}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Kategori</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{viewingProductTx.kategori || '-'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Stok Saat Ini</span>
                      <span className="font-mono font-bold text-teal-600 text-sm mt-0.5 block">{viewingProductTx.stok} {viewingProductTx.satuan}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Estimasi HPP</span>
                      <span className="font-mono font-bold text-slate-700 mt-0.5 block">Rp {viewingProductTx.hpp.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Transaction History Section */}
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <History size={13} className="text-slate-500" />
                      <span>Riwayat Mutasi & Buku Kendali Stok (Realtime)</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Jenis Transaksi</th>
                            <th className="p-3 text-center">Masuk (+)</th>
                            <th className="p-3 text-center">Keluar (-)</th>
                            <th className="p-3 text-center">Saldo Akhir</th>
                            <th className="p-3 text-right">Nilai Satuan</th>
                            <th className="p-3 text-right">Total Nilai</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deriveProductLedgerRows(viewingProductTx.sku).length > 0 ? (
                            deriveProductLedgerRows(viewingProductTx.sku).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-600">{row[0]}</td>
                                <td className="p-3 font-semibold text-slate-800">{row[1]}</td>
                                <td className="p-3 text-center font-bold text-emerald-600">{row[2]}</td>
                                <td className="p-3 text-center font-bold text-rose-600">{row[3]}</td>
                                <td className="p-3 text-center font-mono font-black text-slate-800 bg-slate-50/50">{row[4]} {viewingProductTx.satuan}</td>
                                <td className="p-3 text-right text-slate-500 font-mono">{row[5]}</td>
                                <td className="p-3 text-right font-bold text-slate-800 font-mono">{row[6]}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-[4px] text-[9px] font-black uppercase ${
                                    row[7] === 'Diterima' || row[7] === 'Terkirim' || row[7] === 'Selesai' ? 'bg-emerald-100 text-emerald-800' :
                                    row[7] === 'Opname' || row[7] === 'Retur SO' || row[7] === 'Retur PO' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {row[7]}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={8} className="p-8 text-center text-slate-400 italic">
                                Belum ada riwayat transaksi tercatat untuk produk ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                  <button 
                    onClick={() => setViewingProductTx(null)}
                    className="bg-slate-800 hover:bg-[#1E293B] text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow"
                  >
                    Tutup Rincian
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OVERLAY: CUSTOMER TRANSACTION HISTORY */}
          {viewingCustomerTx && (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden border border-slate-200 max-h-[90vh]">
                <div className="bg-slate-50 text-slate-800 p-5 flex justify-between items-center border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#0EA5A4]/15 p-2 rounded-lg">
                      <Users className="text-[#0EA5A4]" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Kartu Piutang & Transaksi Pelanggan</h3>
                      <p className="text-[11px] text-slate-500 font-semibold">ID Customer: <span className="font-mono font-bold text-slate-800">{viewingCustomerTx.id}</span></p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewingCustomerTx(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Instansi / Nama</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewingCustomerTx.nama}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">PIC Kontak & Telp</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{viewingCustomerTx.kontak} ({viewingCustomerTx.telp})</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Email</span>
                      <span className="font-medium text-slate-600 mt-0.5 block truncate">{viewingCustomerTx.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Saldo Piutang Dagang</span>
                      <span className="font-mono font-bold text-[#0EA5A4] text-sm mt-0.5 block">Rp {viewingCustomerTx.piutang.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Transaction History Section */}
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <History size={13} className="text-slate-500" />
                      <span>Buku Besar Pembantu Piutang (Debit & Kredit)</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">No. Transaksi (Ref)</th>
                            <th className="p-3">Keterangan</th>
                            <th className="p-3 text-right">Debit (Penjualan)</th>
                            <th className="p-3 text-right">Kredit (Pelunasan)</th>
                            <th className="p-3 text-right">Saldo Piutang</th>
                            <th className="p-3 text-center font-bold">Status Bayar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deriveCustomerLedgerRows(viewingCustomerTx.id).length > 0 ? (
                            deriveCustomerLedgerRows(viewingCustomerTx.id).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-600">{row[0]}</td>
                                <td className="p-3">
                                  <button 
                                    onClick={() => {
                                      const so = salesOrders.find(s => s.id === row[1]);
                                      if (so) {
                                        setSelectedSo(so);
                                        setViewingCustomerTx(null);
                                      }
                                    }}
                                    className="font-mono font-bold text-[#0EA5A4] hover:underline hover:text-[#0F766E] transition-all"
                                    title="Klik untuk buka dokumen Sales Order"
                                  >
                                    {row[1]}
                                  </button>
                                </td>
                                <td className="p-3 text-slate-600 font-medium">{row[7]}</td>
                                <td className="p-3 text-right text-slate-800 font-mono font-semibold">{row[2]}</td>
                                <td className="p-3 text-right text-emerald-600 font-mono font-bold">{row[3]}</td>
                                <td className="p-3 text-right font-black text-[#0EA5A4] font-mono bg-teal-50/20">{row[4]}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                                    row[5] === 'Lunas' ? 'bg-[#22C55E] bg-opacity-15 text-[#22C55E]' :
                                    row[5] === 'Cicilan' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-600'
                                  }`}>
                                    {row[5]}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                Belum ada transaksi penjualan atau pembayaran untuk pelanggan ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex justify-end">
                  <button 
                    onClick={() => setViewingCustomerTx(null)}
                    className="bg-slate-800 hover:bg-[#1E293B] text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow"
                  >
                    Tutup Rincian
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OVERLAY: SUPPLIER TRANSACTION HISTORY */}
          {viewingSupplierTx && (
            <div className="fixed inset-0 bg-slate-900 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden border border-slate-200 max-h-[90vh]">
                <div className="bg-slate-50 text-slate-800 p-5 flex justify-between items-center border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="bg-[#0EA5A4]/15 p-2 rounded-lg">
                      <Users className="text-[#0EA5A4]" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-800">Kartu Hutang & Riwayat Supplier</h3>
                      <p className="text-[11px] text-slate-500 font-semibold">ID Supplier: <span className="font-mono font-bold text-slate-800">{viewingSupplierTx.id}</span></p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setViewingSupplierTx(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Perusahaan / Vendor</span>
                      <span className="font-bold text-slate-800 text-sm mt-0.5 block">{viewingSupplierTx.nama}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">PIC Kontak & Telp</span>
                      <span className="font-bold text-slate-700 mt-0.5 block">{viewingSupplierTx.kontak} ({viewingSupplierTx.telp})</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Email</span>
                      <span className="font-medium text-slate-600 mt-0.5 block truncate">{viewingSupplierTx.email}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 font-semibold block uppercase text-[10px]">Saldo Hutang Dagang</span>
                      <span className="font-mono font-bold text-rose-600 text-sm mt-0.5 block">Rp {viewingSupplierTx.hutang.toLocaleString('id-ID')}</span>
                    </div>
                  </div>

                  {/* Transaction History Section */}
                  <div>
                    <h4 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <History size={13} className="text-slate-500" />
                      <span>Buku Besar Pembantu Hutang (Debit & Kredit)</span>
                    </h4>
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm overflow-x-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">No. Transaksi (Ref)</th>
                            <th className="p-3">Keterangan</th>
                            <th className="p-3 text-right">Debit (Pembayaran Kas)</th>
                            <th className="p-3 text-right">Kredit (Pembelian)</th>
                            <th className="p-3 text-right">Saldo Hutang</th>
                            <th className="p-3 text-center font-bold">Status Bayar</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deriveSupplierLedgerRows(viewingSupplierTx.id).length > 0 ? (
                            deriveSupplierLedgerRows(viewingSupplierTx.id).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-slate-600">{row[0]}</td>
                                <td className="p-3">
                                  <button 
                                    onClick={() => {
                                      const po = purchaseOrders.find(p => p.id === row[1]);
                                      if (po) {
                                        setSelectedPo(po);
                                        setViewingSupplierTx(null);
                                      }
                                    }}
                                    className="font-mono font-bold text-[#0EA5A4] hover:underline hover:text-[#0F766E] transition-all"
                                    title="Klik untuk buka dokumen Purchase Order"
                                  >
                                    {row[1]}
                                  </button>
                                </td>
                                <td className="p-3 text-slate-600 font-medium">{row[7]}</td>
                                <td className="p-3 text-right text-slate-800 font-mono font-semibold">{row[2]}</td>
                                <td className="p-3 text-right text-rose-600 font-mono font-bold">{row[3]}</td>
                                <td className="p-3 text-right font-black text-rose-600 font-mono bg-red-50/20">{row[4]}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase inline-block ${
                                    row[5] === 'Lunas' ? 'bg-[#22C55E] bg-opacity-15 text-[#22C55E]' :
                                    row[5] === 'Cicilan' ? 'bg-indigo-100 text-indigo-700' : 'bg-red-100 text-red-600'
                                  }`}>
                                    {row[5]}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                Belum ada transaksi pembelian atau pembayaran untuk supplier ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 px-6 py-4 border-t border-[#E2E8F0] flex justify-end">
                  <button 
                    onClick={() => setViewingSupplierTx(null)}
                    className="bg-slate-800 hover:bg-[#1E293B] text-white px-5 py-2 rounded-lg text-xs font-bold transition-all shadow"
                  >
                    Tutup Rincian
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCreateCompanyModal && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fadeIn font-sans">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100">
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white py-4 px-6 flex justify-between items-center">
                  <h3 className="font-extrabold text-base flex items-center gap-2">
                    <span className="text-xl">🏢</span>
                    <span>Inisialisasi Instansi &amp; Perusahaan Baru</span>
                  </h3>
                  <button 
                    onClick={() => setShowCreateCompanyModal(false)} 
                    className="text-slate-400 hover:text-white transition-colors text-2xl font-bold"
                  >
                    &times;
                  </button>
                </div>
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!newCompanyForm.nama.trim()) {
                      alert("Nama perusahaan wajib diisi!");
                      return;
                    }
                    if (window.confirm(`PERINGATAN: Membuat instansi baru "${newCompanyForm.nama}" akan menghapus/mengganti data perusahaan yang aktif saat ini. Apakah Anda yakin ingin melanjutkan?`)) {
                      handleCreateCompany(newCompanyForm);
                    }
                  }} 
                  className="p-6 space-y-4 text-left"
                >
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3.5 rounded-xl text-xs space-y-1">
                    <p className="font-extrabold flex items-center gap-1">
                      ⚠️ PERINGATAN RE-INISIALISASI DATA
                    </p>
                    <p className="leading-relaxed opacity-90 text-[11px]">
                      Sistem akan membuat database baru dan memuat template yang dipilih. Data transaksi dan master aktif saat ini akan digantikan seluruhnya.
                    </p>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nama Perusahaan / Toko</label>
                      <input 
                        type="text" 
                        required
                        value={newCompanyForm.nama} 
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, nama: e.target.value })}
                        placeholder="Cth: PT. Bakeri Sentosa, Toko Kelontong Jaya"
                        className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] focus:border-[#0EA5A4] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Telepon / HP</label>
                        <input 
                          type="text" 
                          value={newCompanyForm.telp} 
                          onChange={(e) => setNewCompanyForm({ ...newCompanyForm, telp: e.target.value })}
                          placeholder="Cth: 08123456789"
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] focus:border-[#0EA5A4] outline-none font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Kota Operasional</label>
                        <input 
                          type="text" 
                          value={newCompanyForm.kota} 
                          onChange={(e) => setNewCompanyForm({ ...newCompanyForm, kota: e.target.value })}
                          placeholder="Cth: Denpasar, Jakarta"
                          className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] focus:border-[#0EA5A4] outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Alamat Lengkap</label>
                      <textarea 
                        rows={2}
                        value={newCompanyForm.alamat} 
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, alamat: e.target.value })}
                        placeholder="Cth: Jl. Gatot Subroto No. 123, Kel. Dangin Puri"
                        className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-bold text-slate-800 focus:ring-1 focus:ring-[#0EA5A4] focus:border-[#0EA5A4] outline-none resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                      <label className="text-[10px] font-black uppercase text-teal-700 tracking-wider mb-1">Pilih Template Basis Bisnis</label>
                      <select 
                        value={newCompanyForm.tipeTemplate} 
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, tipeTemplate: e.target.value })}
                        className="w-full border border-slate-200 p-2.5 rounded-lg text-xs font-extrabold text-slate-800 bg-white focus:ring-1 focus:ring-[#0EA5A4]"
                      >
                        <option value="empty">Mulai dari Nol (Bersih / Kosong Tanpa Transaksi &amp; Master)</option>
                        <option value="bakery">Sourdough Bakery &amp; Manufaktur (Bahan Baku, Produk Jadi, BOM &amp; Resep)</option>
                        <option value="retail">Retail &amp; Toko Kelontong (Kopi Gayo, Susu UHT, Snack, Pelanggan)</option>
                        <option value="consignment">Konsinyasi &amp; Multi-Platform (Mitra Donat, Komisi, Suplier)</option>
                      </select>
                      <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed text-left">
                        *Sistem otomatis menyuntikkan saldo kas awal awal Rp 10jt - Rp 20jt sebagai modal kerja sesuai template yang dipilih.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button 
                      type="button" 
                      onClick={() => setShowCreateCompanyModal(false)}
                      className="px-4 py-2.5 text-xs font-bold border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button 
                      type="submit"
                      className="px-5 py-2.5 text-xs font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-lg shadow-md transition-all cursor-pointer uppercase tracking-wider"
                    >
                      🚀 Inisialisasi Sekarang
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 grid grid-cols-5 md:hidden z-50 pb-safe shadow-lg">
        {NAV_GROUPS.map(group => {
          const active = isGroupActive(group);
          return (
            <button 
              key={group.id}
              onClick={() => {
                if (group.direct) setActiveTab(group.id);
                else setActiveTab(group.children[0].id); // default to first child
              }}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 text-[10px] font-medium transition-colors cursor-pointer ${
                active ? 'text-[#0EA5A4]' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {group.icon}
              <span className="scale-90 origin-center">{group.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}