import React, { useState, useEffect } from 'react';
import { Badge } from "./components/Badge";
import { EmptyState } from "./components/EmptyState";
import { CashLedgerTab } from './components/CashLedgerTab';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as htmlToImage from 'html-to-image';
import { validateLogin, hashPassword } from './authService';
import { initAuth, googleSignIn, getAccessToken, logout } from './auth';
import { getProducts, saveProduct, deleteProduct, saveAllProducts } from './dataService';
import { savePurchaseOrder, deletePurchaseOrder, saveAllPurchaseOrders } from './dataService';
import { saveCustomer, deleteCustomer, saveAllCustomers } from "./dataService";
import { saveSupplier, deleteSupplier, saveAllSuppliers } from "./dataService";
import { appendOpnameLog, saveAllOpnameLog } from "./dataService";
import { saveCashEntry, deleteCashEntry, saveAllCashLedger } from "./dataService";
import { saveSalesOrder, deleteSalesOrder, saveAllSalesOrders } from './dataService';
import {
  ShoppingCart, LayoutDashboard,
  Package,
  FileText,
  Mail,

  Users,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  CheckCircle,
  Check,
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
  Eye,
  BookOpen,
  History,
  Settings,
  Lock,
  LogOut,
  Layers,
  Activity,
  Database,
  ChevronDown,
  HelpCircle,
  Calculator,
  Building2
} from 'lucide-react';
import { Table, THead, TBody, TR, TH, TD } from './components/Table';
import { TableActions } from './components/TableActions';
import { Card } from './components/Card';
import { Button } from './components/Button';
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
const getLocalStorage = (key: string, defaultValue: any) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      let data = JSON.parse(saved);
      if (Array.isArray(data)) {
        // Strip out dummy data that might be stuck in user's local storage
        data = data.filter((item: any) => {
          const id = item.id || item.sku || item.ref || '';
          const name = item.nama || item.keterangan || item.consignor || '';

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
  } catch (e) {
    return defaultValue;
  }
};

const setLocalStorage = (key: string, value: any) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) { }
};

// ==========================================
// MOCK DATA INITIALIZATION
// ==========================================
const INITIAL_PRODUCTS: any[] = [];

const INITIAL_CUSTOMERS = [
  { id: 'CUST-001', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
];

const INITIAL_SUPPLIERS: any[] = [];

const INITIAL_PURCHASE_ORDERS: any[] = [];

const INITIAL_SALES_ORDERS: any[] = [];

const INITIAL_OPNAME_LOG: any[] = [];

const INITIAL_CASH_LEDGER: any[] = [];

const INITIAL_CONSIGNMENT: any[] = [];

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
    <div className="flex flex-col border border-border rounded-card overflow-hidden bg-white text-sm font-sans shadow-md">
      {/* Formula Bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-slate-50 border-b border-border">
        <div className="font-mono text-[11px] text-success bg-success/10 border border-success/30 font-black px-2 py-0.5 rounded shadow-xs">
          {activeCell ? `${colLetters[activeCell.c]}${activeCell.r + 1}` : 'SEL'}
        </div>
        <div className="text-slate-400 font-serif italic text-sm font-black select-none">fx</div>
        <input
          type="text"
          value={editValue}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={activeCell ? "Ketik teks atau nominal..." : "Klik dua kali atau pilih sel untuk mengedit langsung..."}
          className="flex-1 px-3 py-1.5 border border-border rounded-card text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white transition-all shadow-inner font-mono text-primary"
          disabled={!activeCell}
        />
        {activeCell && (
          <button
            onClick={() => setActiveCell(null)}
            className="text-[11px] bg-slate-200 hover:bg-slate-300 px-2 py-1 rounded font-bold text-secondary transition-colors"
          >
            Selesai
          </button>
        )}
      </div>

      {/* Grid Canvas */}
      <div className="overflow-auto max-h-[420px]">
        <table className="w-full border-collapse table-fixed min-w-[850px]">
          <thead>
            <tr className="bg-slate-100 text-secondary text-center select-none divide-x divide-gray-200">
              <th className="w-10 border-r border-b border-border font-normal bg-slate-200 text-secondary text-[11px]"></th>
              {headers.map((h, cIdx) => (
                <th key={cIdx} className="border-r border-b border-border py-1.5 px-2 font-bold text-primary bg-slate-150 text-left">
                  <div className="text-[11px] text-text-muted font-mono mb-0.5">{colLetters[cIdx]}</div>
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
                <tr key={rIdx} className={`hover:bg-success/10 transition-colors ${isHeaderRow ? 'bg-slate-50' : ''}`}>
                  {/* Row Number Column */}
                  <td className="bg-slate-100 text-center text-text-muted font-mono text-[11px] select-none border-r border-b border-border font-black">
                    {rIdx + 1}
                  </td>
                  {headers.map((_, cIdx) => {
                    const val = rowCells[cIdx] || '';
                    const isActive = activeCell?.r === rIdx && activeCell?.c === cIdx;
                    return (
                      <td
                        key={cIdx}
                        onClick={() => handleCellClick(rIdx, cIdx)}
                        className={`border-r border-b border-border p-2 relative truncate cursor-text text-primary font-mono text-sm ${isActive ? 'ring-2 ring-inset ring-primary z-10 bg-success/10' : 'hover:bg-slate-50'}`}
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
                            className="absolute inset-0 w-full h-full border-none px-2 py-2 focus:outline-none focus:ring-0 text-sm bg-white text-text-primary font-mono"
                            autoFocus
                          />
                        ) : (
                          <span className={`block w-full min-h-[16px] truncate ${isHeaderRow ? 'font-extrabold text-text-primary border-b border-border pb-0.5' : ''}`}>
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
      <div className="bg-slate-50 border-t border-border px-4 py-2 text-[11px] text-secondary flex justify-between items-center">
        <span>Gunakan baris formula di atas untuk input data cepat, atau klik ganda sel apa pun.</span>
        <span className="font-mono font-bold text-success">INO ERP SPREADSHEET ENGINE v1.2</span>
      </div>    </div>
  );
}

// ==========================================
// INITIAL PRODUCTION & BOM DATA
// ==========================================
const INITIAL_BOMS: any[] = [];

const INITIAL_RIWAYAT_PRODUKSI: any[] = [];

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


const NAV_GROUPS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard size={15} />,
    direct: true
  },
  {
    id: 'statistik',
    label: 'Statistik',
    icon: <Activity size={15} />,
    direct: true
  },
  {
    id: 'gudang',
    label: 'Gudang',
    icon: <Package size={15} />,
    children: [
      { id: 'master_produk', label: 'Master Produk', icon: <Database size={14} /> },
      { id: 'summary_stok', label: 'Summary Stok Bulanan', icon: <TrendingUp size={14} /> },
    ]
  },
  {
    id: 'transaksi',
    label: 'Transaksi',
    icon: <FileText size={15} />,
    children: [
      { id: 'purchase_order', label: 'Pembelian PO', icon: <Truck size={14} /> },
      { id: 'sales_order', label: 'Penjualan (Sales Order)', icon: <CreditCard size={14} /> },
      { id: 'buku_besar_kas', label: 'Buku Besar Kas', icon: <BookOpen size={14} /> },
    ]
  },
  // ponytail: gabungkan navigasi pelanggan & supplier ke dropdown tunggal bernama Kartu di TopBar
  {
    id: 'kartu',
    label: 'Kartu',
    icon: <Users size={15} />,
    children: [
      { id: 'pelanggan', label: 'Kartu Pelanggan', icon: <Users size={14} /> },
      { id: 'supplier', label: 'Kartu Supplier', icon: <Building2 size={14} /> },
    ]
  },
  {
    id: 'laporan',
    label: 'Laporan',
    icon: <TrendingUp size={15} />,
    children: [
      { id: 'laba_rugi', label: 'Laba Rugi (P&L)', icon: <TrendingUp size={14} /> },
      { id: 'arus_kas', label: 'Arus Kas (Cash Flow)', icon: <DollarSign size={14} /> },
      { id: 'konsinyasi', label: 'Konsinyasi Retail', icon: <Users size={14} /> },
      { id: 'penjualan_harian', label: 'Penjualan Harian', icon: <FileSpreadsheet size={14} /> },
      { id: 'pajak_ppn', label: 'Pajak (PPN)', icon: <Calculator size={14} /> },
    ]
  },
];


// ponytail: helper format titik ribuan tanpa dependency
const formatRibuan = (num: number | string): string => {
  if (num === null || num === undefined || num === '') return '';
  const str = num.toString().replace(/[^0-9]/g, '');
  if (!str) return '';
  return parseInt(str, 10).toLocaleString('id-ID').replace(/,/g, '.');
};

const parseRibuan = (str: string): number => {
  if (!str) return 0;
  return parseInt(str.toString().replace(/[^0-9]/g, ''), 10) || 0;
};


// ponytail: audit & fix UX auto-select pada seluruh searchable dropdown
function SearchableSelect({
  value,
  options,
  onChange,
  placeholder,
  className = "",
  allowCustom = false
}: {
  value: string,
  options: { label: string, value: string }[],
  onChange: (val: string) => void,
  placeholder?: string,
  className?: string,
  allowCustom?: boolean
}) {
  const selectedLabel = options.find(o => o.value === value)?.label || value;
  const [inputValue, setInputValue] = React.useState(selectedLabel);
  const [isOpen, setIsOpen] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!isOpen) {
      setInputValue(selectedLabel);
    }
  }, [value, selectedLabel, isOpen]);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setInputValue(selectedLabel);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [selectedLabel]);

  const isTyping = isOpen && inputValue !== selectedLabel;
  const filteredOptions = isTyping
    ? options.filter(o => o.label.toLowerCase().includes(inputValue.toLowerCase()) || o.value.toLowerCase().includes(inputValue.toLowerCase()))
    : options;

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      <input
        type="text"
        className="w-full pr-8 pl-3 py-2 border border-border rounded-md bg-white text-sm focus:outline-none focus:ring-1 focus:ring-primary font-medium"
        placeholder={placeholder}
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (!isOpen) setIsOpen(true);
        }}
        onFocus={(e) => {
          e.target.select();
          setIsOpen(true);
        }}
        onBlur={() => {
          if (allowCustom) {
            onChange(inputValue);
          }
        }}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => {
          setIsOpen(!isOpen);
          if (isOpen) {
            setInputValue(selectedLabel);
          }
        }}
        className="absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400 hover:text-primary cursor-pointer"
      >
        <ChevronDown size={14} />
      </button>

      {isOpen && (
        <ul className="absolute z-[200] w-full mt-1 bg-white border border-border rounded-md shadow-xl max-h-60 overflow-y-auto text-sm">
          {filteredOptions.length > 0 ? (
            filteredOptions.map((opt, idx) => (
              <li
                key={idx}
                className={`px-3 py-2 cursor-pointer hover:bg-slate-50 border-b border-slate-50 last:border-0 ${opt.value === value ? 'bg-primary/5 font-bold text-primary' : 'text-slate-700 font-medium'}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(opt.value);
                  setInputValue(opt.label);
                  setIsOpen(false);
                }}
              >
                {opt.label}
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-slate-400 italic">
              {allowCustom ? 'Tekan enter/klik luar untuk simpan' : 'Tidak ada hasil...'}
            </li>
          )}
        </ul>
      )}    </div>
  );
}

// ponytail: helper get today YMD for ID generation
const getTodayYMD = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${dd}`;
};

export default function App() {

  // ponytail: Kalkulasi On-Order (Barang sedang dipesan tapi belum diterima)
  const getOnOrderQty = (sku: string) => {
    return purchaseOrders
      .filter(po => po.statusLogistik === 'DIPESAN' || po.statusLogistik === 'Parsial')
      .reduce((total, po) => {
        const item = po.items.find((i: any) => i.sku === sku);
        if (!item) return total;
        const received = item.qtyReceived ?? 0;
        return total + Math.max(0, item.qty - received);
      }, 0);
  };

  // ponytail: Modal Konfirmasi
  const [showPoConfirmModal, setShowPoConfirmModal] = React.useState(false);
  const [showSoConfirmModal, setShowSoConfirmModal] = React.useState(false);
  const [isExportingPDF, setIsExportingPDF] = React.useState(false);
  const [pendingDraftState, setPendingDraftState] = React.useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [bukuBesarActiveAkun, setBukuBesarActiveAkun] = useState<string>('');
  const [cashLedgerView, setCashLedgerView] = useState<'list' | 'detail'>('list');
  const [selectedCashAccount, setSelectedCashAccount] = useState<{ nomor: string, nama: string, jenis?: string, fungsi: string } | null>(null);
  const [isAddCashAccountOpen, setIsAddCashAccountOpen] = useState(false);
  const [editingAccountName, setEditingAccountName] = useState<string | null>(null);
  const [newCashAccountForm, setNewCashAccountForm] = useState({ nomor: '', nama: '', jenis: 'Kas', fungsi: 'General' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);

  const isGroupActive = (group: any) => group.id === activeTab || group.children?.some((c: any) => c.id === activeTab);

  // Core Persisted States
  const [products, setProducts] = useState<any[]>(() => getLocalStorage('ino_products', INITIAL_PRODUCTS));
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [searchProductQuery, setSearchProductQuery] = useState("");
  const [customers, setCustomers] = useState<any[]>(() => getLocalStorage('ino_customers', INITIAL_CUSTOMERS));
  const [suppliers, setSuppliers] = useState<any[]>(() => getLocalStorage('ino_suppliers', INITIAL_SUPPLIERS));
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>(() => getLocalStorage('ino_purchase_orders', INITIAL_PURCHASE_ORDERS));
  const [isSavingPO, setIsSavingPO] = useState(false);
  const [searchPoQuery, setSearchPoQuery] = useState("");
  const [salesOrders, setSalesOrders] = useState<any[]>(() => getLocalStorage('ino_sales_orders', INITIAL_SALES_ORDERS));
  const [isSavingSO, setIsSavingSO] = useState(false);
  const [isVoidingPO, setIsVoidingPO] = useState(false);
  const [isVoidingSO, setIsVoidingSO] = useState(false);
  const [searchSoQuery, setSearchSoQuery] = useState("");
  const [soFilterJenis, setSoFilterJenis] = useState<'Semua' | 'SO' | 'POS'>('Semua');
  const [opnameLog, setOpnameLog] = useState<any[]>(() => getLocalStorage('ino_opname_log', INITIAL_OPNAME_LOG));
  const [cashLedger, setCashLedger] = useState<any[]>(() => getLocalStorage('ino_cash_ledger', INITIAL_CASH_LEDGER));
  const [isSavingCash, setIsSavingCash] = useState(false);
  const [consignments, setConsignments] = useState<any[]>(() => getLocalStorage('ino_consignments', INITIAL_CONSIGNMENT));

  // Settings & Production States
  const [tipeBisnis, setTipeBisnis] = useState<string>(() => getLocalStorage('ino_tipe_bisnis', 'Manufaktur'));
  const [isLoginActive, setIsLoginActive] = useState<boolean>(() => getLocalStorage('ino_is_login_active', false));
  const [loginUsername, setLoginUsername] = useState<string>(() => getLocalStorage('ino_login_username', ''));
  const [loginPassword, setLoginPassword] = useState<string>(() => getLocalStorage('ino_login_password', ''));

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
  const [settingCashAccounts, setSettingCashAccounts] = useState<{ nomor: string, nama: string, jenis?: string, fungsi: string }[]>(() => {
    const saved = getLocalStorage('ino_setting_cash_accounts', ['Kas Tunai', 'Bank']);
    return saved.map((acc: any) => {
      if (typeof acc === 'string') return { nomor: '', nama: acc, fungsi: 'General' };
      return { ...acc, fungsi: acc.fungsi || 'General' };
    });
  });

  // Helper untuk menentukan akun berdasarkan metode pembayaran
  const determineAccount = (methodName: string) => {
    if (!methodName) return 'Bank';
    const name = methodName.toLowerCase();
    if (name.includes('tunai') || name.includes('cash')) return 'Kas Tunai';
    return 'Bank';
  };
  const [settingPlatforms, setSettingPlatforms] = useState<string[]>(() => getLocalStorage('ino_setting_platforms', ['Toko Langsung', 'Tokopedia', 'Shopee', 'TikTok Shop', 'Grab', 'Gojek', 'WhatsApp', 'Instagram', 'Website', 'Lainnya']));

  const [settingPrefixes, setSettingPrefixes] = useState<any[]>(() => getLocalStorage('ino_setting_prefixes', [
    { prefix: 'RTL', label: 'Retail / Produk Jadi Dijual' },
    { prefix: 'SET', label: 'Set / Bundle Produk' },
    { prefix: 'FG', label: 'Finished Good / Barang Jadi Produksi' },
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
    const active = getLocalStorage('ino_is_login_active', false);
    return !active;
  });

  const [boms, setBoms] = useState<any[]>(() => getLocalStorage('ino_boms', INITIAL_BOMS));
  const [riwayatProduksi, setRiwayatProduksi] = useState<any[]>(() => getLocalStorage('ino_riwayat_produksi', INITIAL_RIWAYAT_PRODUKSI));
  const [stokPrices, setStokPrices] = useState<Record<string, number>>(() => getLocalStorage('ino_stok_prices', {}));
  const [stokShowFinancial, setStokShowFinancial] = useState<boolean>(() => getLocalStorage('ino_stok_show_financial', true));

  // Sync to Local Storage on Change
  // ponytail: useEffect penyimpan otomatis dicabut untuk 7 entitas transaksional (dijaga oleh dataService)
  useEffect(() => { setLocalStorage('ino_consignments', consignments); }, [consignments]);

  // Sync Settings to Local Storage
  useEffect(() => { setLocalStorage('ino_tipe_bisnis', tipeBisnis); }, [tipeBisnis]);
  useEffect(() => { setLocalStorage('ino_is_login_active', isLoginActive); }, [isLoginActive]);
  useEffect(() => { setLocalStorage('ino_login_username', loginUsername); }, [loginUsername]);
  useEffect(() => { setLocalStorage('ino_login_password', loginPassword); }, [loginPassword]);

  useEffect(() => { setLocalStorage('ino_nama_toko', namaToko); }, [namaToko]);
  useEffect(() => { setLocalStorage('ino_alamat_toko', alamatToko); }, [alamatToko]);
  useEffect(() => { setLocalStorage('ino_telp_toko', telpToko); }, [telpToko]);
  useEffect(() => { setLocalStorage('ino_kota_toko', kotaToko); }, [kotaToko]);
  useEffect(() => { setLocalStorage('ino_ppn_rate', ppnRate); }, [ppnRate]);
  useEffect(() => { setLocalStorage('ino_metode_hpp_default', metodeHppDefault); }, [metodeHppDefault]);
  useEffect(() => { setLocalStorage('ino_mata_uang', mataUang); }, [mataUang]);
  useEffect(() => { setLocalStorage('ino_drive_folder_struk', driveFolderStruk); }, [driveFolderStruk]);
  useEffect(() => { setLocalStorage('ino_format_tanggal', formatTanggal); }, [formatTanggal]);

  useEffect(() => { setLocalStorage('ino_setting_categories', settingCategories); }, [settingCategories]);
  useEffect(() => { setLocalStorage('ino_setting_subcategories', settingSubCategories); }, [settingSubCategories]);
  useEffect(() => { setLocalStorage('ino_setting_units', settingUnits); }, [settingUnits]);
  useEffect(() => { setLocalStorage('ino_setting_storages', settingStorageLocations); }, [settingStorageLocations]);
  useEffect(() => { setLocalStorage('ino_setting_cash_accounts', settingCashAccounts); }, [settingCashAccounts]);
  useEffect(() => { setLocalStorage('ino_setting_platforms', settingPlatforms); }, [settingPlatforms]);
  useEffect(() => { setLocalStorage('ino_setting_prefixes', settingPrefixes); }, [settingPrefixes]);
  useEffect(() => { setLocalStorage('ino_setting_users', settingUsersList); }, [settingUsersList]);
  useEffect(() => { setLocalStorage('ino_boms', boms); }, [boms]);
  useEffect(() => { setLocalStorage('ino_riwayat_produksi', riwayatProduksi); }, [riwayatProduksi]);
  useEffect(() => { setLocalStorage('ino_stok_prices', stokPrices); }, [stokPrices]);
  useEffect(() => { setLocalStorage('ino_stok_show_financial', stokShowFinancial); }, [stokShowFinancial]);

  // ponytail: Migrasi hashing password sisi klien.
  // Catatan: Hashing ini terjadi di sisi klien dan hanya sebagai pengamanan dasar.
  // Jika password di localStorage belum di-hash (panjang bukan 64), kita hash.
  useEffect(() => {
    const migratePasswords = async () => {
      const storedSuperPass = getLocalStorage('ino_login_password', '');
      if (storedSuperPass && !(storedSuperPass.length === 64 && /^[0-9a-f]{64}$/i.test(storedSuperPass))) {
        const hashed = await hashPassword(storedSuperPass);
        setLoginPassword(hashed);
        setLocalStorage('ino_login_password', hashed);
      }

      const storedUsers = getLocalStorage('ino_setting_users', []);
      let usersMigrated = false;
      const newUsers = await Promise.all(storedUsers.map(async (u: any) => {
        if (u.pin && !(u.pin.length === 64 && /^[0-9a-f]{64}$/i.test(u.pin))) {
          usersMigrated = true;
          return { ...u, pin: await hashPassword(u.pin) };
        }
        return u;
      }));
      if (usersMigrated) {
        setSettingUsersList(newUsers);
        setLocalStorage('ino_setting_users', newUsers);
      }
    };
    migratePasswords();
  }, []);

  // Gmail States
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [emailSubject, setEmailSubject] = useState('Laporan Stok & Mutasi');

  useEffect(() => {
    initAuth(
      () => setIsGmailConnected(true),
      () => setIsGmailConnected(false)
    );
  }, []);

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailTo) return triggerToast('Email tujuan harus diisi', 'error');

    setEmailSending(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const result = await googleSignIn();
        if (result) {
          token = result.accessToken;
        } else {
          setEmailSending(false);
          return triggerToast('Gagal login ke Google', 'error');
        }
      }

      // Generate HTML report summary
      const body = `
      <h3>${emailSubject}</h3>
      <p>Tanggal: ${new Date().toLocaleDateString('id-ID')}</p>
      <p>Total Produk Aktif: ${products.length}</p>
      <p>Total Nilai Valuasi: Rp ${products.reduce((sum, p) => sum + (p.stok * (p.hpp || 0)), 0).toLocaleString('id-ID')}</p>
      <hr />
      <p>Ini adalah email laporan otomatis yang dikirim dari sistem inventori.</p>
      `;

      const emailLines = [];
      emailLines.push(`To: ${emailTo}`);
      emailLines.push('Content-type: text/html;charset=utf-8');
      emailLines.push('MIME-Version: 1.0');
      emailLines.push(`Subject: ${emailSubject}`);
      emailLines.push('');
      emailLines.push(body);

      const emailRaw = emailLines.join('\r\n');
      const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailRaw))).replace(/\+/g, '-').replace(/\//g, '_');

      const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: base64EncodedEmail,
        }),
      });

      if (!res.ok) {
        throw new Error('Gagal mengirim email');
      }

      triggerToast('Email laporan berhasil dikirim!', 'success');
      setShowEmailModal(false);
      setEmailTo('');
    } catch (err: any) {
      console.error(err);
      triggerToast('Gagal mengirim email: ' + err.message, 'error');
    } finally {
      setEmailSending(false);
    }
  };

  // Stock Report Control States
  const [stokHideZeroQty, setStokHideZeroQty] = useState<boolean>(() => getLocalStorage('ino_stok_hide_zero', false));
  const [stokShowUnitPrice, setStokShowUnitPrice] = useState<boolean>(() => getLocalStorage('ino_stok_show_unit_price', true));
  const [stokShowAmount, setStokShowAmount] = useState<boolean>(() => getLocalStorage('ino_stok_show_amount', true));
  const [stokSelectedSkus, setStokSelectedSkus] = useState<string[]>([]);

  useEffect(() => { setLocalStorage('ino_stok_hide_zero', stokHideZeroQty); }, [stokHideZeroQty]);
  useEffect(() => { setLocalStorage('ino_stok_show_unit_price', stokShowUnitPrice); }, [stokShowUnitPrice]);
  useEffect(() => { setLocalStorage('ino_stok_show_amount', stokShowAmount); }, [stokShowAmount]);

  // Report Hub States
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
  const [relasiTab, setRelasiTab] = useState('daftar'); // 'daftar' | 'spreadsheet_customer' | 'spreadsheet_supplier'

  // Modul Produksi form states
  const [produksiActiveSubTab, setProduksiActiveSubTab] = useState<string>('form_produksi');
  const [selectedBomId, setSelectedBomId] = useState<string>('');
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
  const [arusKasFilterAkun, setArusKasFilterAkun] = useState('Semua Akun');
  const [analitikEndDate, setAnalitikEndDate] = useState('2026-06-30');
  const [selectedSkuAnalysis, setSelectedSkuAnalysis] = useState('');
  const [selectedCustomerAnalysis, setSelectedCustomerAnalysis] = useState('');

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
          startDate: `${new Date().getFullYear()}-${mConf.code}-01`,
          endDate: `${new Date().getFullYear()}-${mConf.code}-31`
        };
      });
    } else if (stokViewMode === 'quarterly') {
      return QUARTERS_DEF.map(q => {
        const startM = AVAILABLE_MONTHS.find(x => x.id === q.months[0])!;
        const endM = AVAILABLE_MONTHS.find(x => x.id === q.months[q.months.length - 1])!;
        return {
          id: q.id,
          label: q.label,
          startDate: `${new Date().getFullYear()}-${startM.code}-01`,
          endDate: `${new Date().getFullYear()}-${endM.code}-31`
        };
      });
    } else if (stokViewMode === 'annual') {
      const yr = new Date().getFullYear();
      return [{
        id: 'annual',
        label: `Konsolidasi Tahunan ${yr}`,
        startDate: `${yr}-01-01`,
        endDate: `${yr}-12-31`
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
    nominal: 0,
    akun: 'Bank'
  });

  // Selected entities inside ledger spreadsheets
  const [selectedProductSku, setSelectedProductSku] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');

  // Cell state for each ledger spreadsheet (persisted)
  const [productLedgerCells, setProductLedgerCells] = useState<Record<string, string[][]>>(() => getLocalStorage('ino_product_ledgers', {}));
  const [customerLedgerCells, setCustomerLedgerCells] = useState<Record<string, string[][]>>(() => getLocalStorage('ino_customer_ledgers', {}));
  const [supplierLedgerCells, setSupplierLedgerCells] = useState<Record<string, string[][]>>(() => getLocalStorage('ino_supplier_ledgers', {}));

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
  const [isLoggingIn, setIsLoggingIn] = useState(false);

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

    setPurchaseOrders(prevOrders => {
      const next = prevOrders.map(po => {
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
        saveAllProducts(updatedProducts);

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
      });
      saveAllPurchaseOrders(next);
      return next;
    });
  };

  // 2. Submit Shipment (Pengiriman SO)
  const submitSoShipment = (soId: string) => {
    let hasValidInput = false;
    let anyError = false;

    setSalesOrders(prevOrders => {
      const next = prevOrders.map(so => {
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
        saveAllProducts(updatedProducts);

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
      });
      saveAllSalesOrders(next);
      return next;
    });
  };

  // 3. Submit PO Payment
  const submitPoPayment = (poId: string) => {
    if (poPaymentVal <= 0) return triggerToast('Nominal pembayaran tidak valid!', 'error');

    let anyError = false;
    setPurchaseOrders(prevOrders => {
      const next = prevOrders.map(po => {
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
        setSuppliers(prev => {
          const next = prev.map(s => s.nama === po.supplier ? { ...s, hutang: Math.max(0, s.hutang - poPaymentVal) } : s);
          saveAllSuppliers(next);
          return next;
        });

        // Log cash transaction
        setCashLedger(prev => {
          const targetAkun = determineAccount(poPaymentMetode);
          const accountTx = prev.filter(c => (c.akun || 'Bank') === targetAkun);
          const lastBal = accountTx.length > 0 ? accountTx[accountTx.length - 1].saldo : 0;
          const next = [...prev, {
            id: `CSH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
            tanggal: new Date().toISOString().slice(0, 10),
            ref: po.id,
            keterangan: `Pembayaran Hutang ke Supplier ${po.supplier} [${po.id}]`,
            kategori: 'Pembelian',
            debit: 0,
            kredit: poPaymentVal,
            saldo: lastBal - poPaymentVal,
            akun: targetAkun
          }];
          saveAllCashLedger(next);
          return next;
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
      });
      saveAllPurchaseOrders(next);
      return next;
    });
  };

  // 4. Submit SO Payment (Pelunasan Piutang)
  const submitSoPayment = (soId: string) => {
    if (soPaymentVal <= 0) return triggerToast('Nominal pembayaran tidak valid!', 'error');

    let anyError = false;
    setSalesOrders(prevOrders => {
      const next = prevOrders.map(so => {
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
        setCustomers(prev => {
          const next = prev.map(c => c.nama === so.pelanggan ? { ...c, piutang: Math.max(0, c.piutang - soPaymentVal) } : c);
          saveAllCustomers(next);
          return next;
        });

        // Log cash transaction
        setCashLedger(prev => {
          const targetAkun = determineAccount(soPaymentMetode);
          const accountTx = prev.filter(c => (c.akun || 'Bank') === targetAkun);
          const lastBal = accountTx.length > 0 ? accountTx[accountTx.length - 1].saldo : 0;
          const next = [...prev, {
            id: `CSH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
            tanggal: new Date().toISOString().slice(0, 10),
            ref: so.id,
            keterangan: `Penerimaan Pelunasan dari Pelanggan ${so.pelanggan} [${so.id}]`,
            kategori: 'Penjualan',
            debit: soPaymentVal,
            kredit: 0,
            saldo: lastBal + soPaymentVal,
            akun: targetAkun
          }];
          saveAllCashLedger(next);
          return next;
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
      });
      saveAllSalesOrders(next);
      return next;
    });
  };

  // 5. Submit PO Retur
  const submitPoRetur = (poId: string) => {
    let hasValidInput = false;
    let anyError = false;

    if (!poReturAlasan.trim()) {
      triggerToast('Alasan retur wajib diisi!', 'warning');
      return;
    }

    setPurchaseOrders(prevOrders => {
      const next = prevOrders.map(po => {
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
        saveAllProducts(updatedProducts);

        // Reduce Supplier's Hutang by returValue
        let totalReturValue = 0;
        updatedItems.forEach((item: any) => {
          const inputVal = poReturQtys[item.sku] ?? 0;
          totalReturValue += inputVal * item.harga;
        });

        if (po.statusBayar === 'Belum Dibayar' || po.statusBayar === 'Cicilan') {
          setSuppliers(prev => {
            const next = prev.map(s => s.nama === po.supplier ? { ...s, hutang: Math.max(0, s.hutang - totalReturValue) } : s);
            saveAllSuppliers(next);
            return next;
          });
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
      });
      saveAllPurchaseOrders(next);
      return next;
    });
  };

  // 6. Submit SO Retur (Customer)
  const submitSoRetur = (soId: string) => {
    let hasValidInput = false;
    let anyError = false;

    if (!soReturAlasan.trim()) {
      triggerToast('Alasan retur wajib diisi!', 'warning');
      return;
    }

    setSalesOrders(prevOrders => {
      const next = prevOrders.map(so => {
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
        saveAllProducts(updatedProducts);

        // Reduce Customer's Piutang by returValue
        let totalReturValue = 0;
        updatedItems.forEach((item: any) => {
          const inputVal = soReturQtys[item.sku] ?? 0;
          totalReturValue += inputVal * item.harga;
        });

        if (so.statusBayar === 'Belum Lunas' || so.statusBayar === 'Cicilan') {
          setCustomers(prev => {
            const next = prev.map(c => c.nama === so.pelanggan ? { ...c, piutang: Math.max(0, c.piutang - totalReturValue) } : c);
            saveAllCustomers(next);
            return next;
          });
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
      });
      saveAllSalesOrders(next);
      return next;
    });
  };

  // 7. Approve PO (Draft -> Official)
  const handleApprovePO = (poId: string) => {
    setPurchaseOrders(prevOrders => {
      const next = prevOrders.map(po => {
        if (po.id !== poId) return po;

        // Add grand total to supplier's hutang
        setSuppliers(prev => {
          const next = prev.map(s => s.nama === po.supplier ? { ...s, hutang: s.hutang + po.grandTotal } : s);
          saveAllSuppliers(next);
          return next;
        });

        const updatedPo = {
          ...po,
          statusLogistik: 'Menunggu',
          statusBayar: 'Belum Dibayar'
        };

        setSelectedPo(updatedPo);
        triggerToast(`PO ${poId} berhasil disetujui & dirilis ke Supplier.`);
        return updatedPo;
      });
      saveAllPurchaseOrders(next);
      return next;
    });
  };

  // ==========================================
  // FORM & MODAL STATES
  // ==========================================

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [showMasterConfigModal, setShowMasterConfigModal] = useState(false);
  const [showOpnameModal, setShowOpnameModal] = useState(false);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productForm, setProductForm] = useState<any>({
    sku: '', prefix: 'RTL', kategori: 'Barang Jadi', subKat: '', nama: '', satuan: 'Pcs',
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
    metode: 'Kredit 30 Hari', items: [{ sku: '', nama: '', satuan: 'Pcs', qty: 1, harga: 0, subtotal: 0 }],
    pajak: false, catatan: '', platform: 'Toko Langsung'
  });
  const [showPoForm, setShowPoForm] = useState(false);
  const [showPoPlatformModal, setShowPoPlatformModal] = useState(false);
  const [isEditingPo, setIsEditingPo] = useState(false);

  const [soForm, setSoForm] = useState({
    id: '', pelanggan: '', tanggal: new Date().toISOString().split('T')[0],
    metode: 'Tempo 30 Hari', items: [{ sku: '', nama: '', satuan: 'Pcs', qty: 1, harga: 0, subtotal: 0 }],
    pajak: false, catatan: '', platform: 'Toko Langsung'
  });
  const [showSoForm, setShowSoForm] = useState(false);
  const [isEditingSo, setIsEditingSo] = useState(false);

  // Opname / Wastage State
  const [opnameForm, setOpnameForm] = useState<{
    sku: string;
    tipe: string;
    qtySistem: number;
    selisih: number | string;
    qtyFisik: number | string;
    catatan: string;
  }>({
    sku: '', tipe: 'OPNAME_PLUS', qtySistem: 0, selisih: 0, qtyFisik: 0, catatan: ''
  });
  const [showOpnameConfirm, setShowOpnameConfirm] = useState(false);

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
      items: [{ sku: p.sku, nama: p.nama, satuan: p.satuan, qty: Math.max(10, p.safety * 2 - p.stok), harga: p.hpp, subtotal: Math.max(10, p.safety * 2 - p.stok) * p.hpp }],
      pajak: false,
      catatan: `Reorder stok kritis otomatis untuk SKU: ${p.sku}`,
      platform: 'Toko Langsung'
    });
    setIsEditingPo(false);
    setShowPoForm(true);
    setActiveTab('purchase_order');
    triggerToast(`Form PO Baru diisi otomatis untuk SKU ${p.sku}! Silakan periksa dan rilis PO.`, 'success');
  };

  const handleDeleteManualCash = async (id: string) => {
    if (!window.confirm('Hapus transaksi kas manual ini? Saldo akan dikalkulasi ulang secara otomatis.')) return;
    try {
      const targetTx = cashLedger.find(entry => entry.id === id);
      if (!targetTx) return;

      const targetAkun = targetTx.akun || 'Bank';
      const updatedLedger = cashLedger.filter(entry => entry.id !== id);

      // Recalculate balances for the specific account
      let currentBal = 0;
      updatedLedger.forEach(entry => {
        if ((entry.akun || 'Bank') === targetAkun) {
          currentBal = currentBal + (entry.debit || 0) - (entry.kredit || 0);
          entry.saldo = currentBal;
        }
      });

      setCashLedger(updatedLedger);
      await saveAllCashLedger(updatedLedger);
      triggerToast('Transaksi kas manual berhasil dihapus', 'success');
    } catch (error) {
      triggerToast('Gagal menghapus transaksi', 'error');
    }
  };

  const handleAddManualCash = async (e: React.FormEvent) => {
    if (isSavingCash) return;
    e.preventDefault();
    // ponytail: Validasi angka negatif di trust boundary
    if (manualCashForm.nominal < 0) {
      triggerToast('Error: Nominal tidak boleh negatif!', 'error');
      return;
    }
    if (manualCashForm.nominal === 0) {
      triggerToast('Nominal harus lebih besar dari 0!', 'error');
      return;
    }
    if (!manualCashForm.keterangan.trim()) {
      triggerToast('Keterangan tidak boleh kosong!', 'error');
      return;
    }

    setIsSavingCash(true);
    try {
      const isKredit = manualCashForm.tipe === 'KELUAR';
      const deb = isKredit ? 0 : manualCashForm.nominal;
      const kre = isKredit ? manualCashForm.nominal : 0;

      const targetAkun = manualCashForm.akun || 'Bank';
      const accountTx = cashLedger.filter(c => (c.akun || 'Bank') === targetAkun);
      const lastBal = accountTx.length > 0 ? accountTx[accountTx.length - 1].saldo : 0;
      const newBal = isKredit ? lastBal - manualCashForm.nominal : lastBal + manualCashForm.nominal;
      const next = [...cashLedger, {
        id: `CSH-${manualCashForm.tanggal.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
        tanggal: manualCashForm.tanggal,
        ref: `MANUAL-${Math.floor(1000 + Math.random() * 9000)}`,
        keterangan: manualCashForm.keterangan,
        kategori: manualCashForm.kategori,
        debit: deb,
        kredit: kre,
        saldo: newBal,
        akun: targetAkun
      }];
      setCashLedger(next);
      await saveAllCashLedger(next);

      setShowManualCashModal(false);
      setManualCashForm({
        tanggal: new Date().toISOString().split('T')[0],
        keterangan: '',
        kategori: 'Operasional Lain',
        tipe: 'KELUAR',
        nominal: 0,
        akun: settingCashAccounts.length > 0 ? settingCashAccounts[0].nama : 'Bank'
      });
      triggerToast('Mutasi kas manual berhasil dicatat!', 'success');
    } finally {
      setIsSavingCash(false);
    }
  };

  const isSoOverdue = (so: any) => {
    if (so.statusBayar === 'Lunas') return false;
    if (so.metode === 'Tunai') return false;
    const txDate = new Date(so.tanggal);
    const dueDate = new Date(txDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    return today > dueDate;
  };

  const isPoOverdue = (po: any) => {
    if (po.statusBayar === 'Lunas') return false;
    if (po.metode === 'Tunai') return false;
    const txDate = new Date(po.tanggal);
    const dueDate = new Date(txDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    const today = new Date();
    return today > dueDate;
  };

  const getMonthlyPandL = () => {
    // Dinamis: generate daftar bulan dari bulan pertama transaksi hingga bulan ini
    const allDates = [
      ...salesOrders.map(so => so.tanggal),
      ...purchaseOrders.map(po => po.tanggal),
      ...cashLedger.map(c => c.tanggal)
    ].filter(Boolean).sort();
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthsSet = new Set<string>();
    allDates.forEach(d => { if (d && d.length >= 7) monthsSet.add(d.slice(0, 7)); });
    monthsSet.add(currentYM);
    const months = Array.from(monthsSet).sort();
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

      const [yy, mm] = m.split('-');
      const monthLabels: Record<string, string> = { '01': 'Januari', '02': 'Februari', '03': 'Maret', '04': 'April', '05': 'Mei', '06': 'Juni', '07': 'Juli', '08': 'Agustus', '09': 'September', '10': 'Oktober', '11': 'November', '12': 'Desember' };
      const label = `${monthLabels[mm] || mm} ${yy}`;

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
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() - 30); // 30 hari terakhir
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
  const generateNewSku = (prefix: string, allProducts: any[]) => {
    const matchingProducts = allProducts.filter(p => p.sku && p.sku.startsWith(`${prefix}-`));
    let maxNumber = 0;

    matchingProducts.forEach(p => {
      const parts = p.sku.split('-');
      if (parts.length > 1) {
        const num = parseInt(parts[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });

    return `${prefix}-${String(maxNumber + 1).padStart(4, '0')}`;
  };

  const checkProductHasTransactions = (sku: string) => {
    if (!sku) return false;
    const inPO = purchaseOrders.some(po => po.items.some((i: any) => i.sku === sku));
    const inSO = salesOrders.some(so => so.items.some((i: any) => i.sku === sku));
    const inLog = opnameLog.some(log => log.sku === sku);
    const inConsign = consignments.some(c => c.sku === sku);
    return inPO || inSO || inLog || inConsign;
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    if (isSavingProduct) return;
    e.preventDefault();
    if (!productForm.nama) return triggerToast('Nama produk wajib diisi!', 'error');

    // ponytail: Validasi angka negatif di trust boundary
    if (productForm.stok < 0 || productForm.hpp < 0 || productForm.hj < 0) {
      triggerToast('Error: Stok, HPP, dan Harga Jual tidak boleh negatif!', 'error');
      return;
    }

    setIsSavingProduct(true);
    try {
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
        await saveProduct(productForm);
        triggerToast(`Produk [${productForm.sku}] berhasil diupdate.`);
      } else {
        const sku = productForm.sku || generateNewSku(productForm.prefix || 'RTL', products);

        // Validasi mutlak: Cek duplikat SKU
        const isDuplicate = products.some(p => p.sku.toLowerCase() === sku.toLowerCase());
        if (isDuplicate) {
          return triggerToast(`Gagal! KODE SKU [${sku}] sudah terdaftar di database. Gunakan kode lain.`, 'error');
        }

        const newProduct = { ...productForm, sku };
        setProducts([...products, newProduct]);
        await saveProduct(newProduct);
        triggerToast(`Produk [${sku}] berhasil didaftarkan.`);
      }
      setShowProductModal(false);
      setIsEditingProduct(false);
    } finally {
      setIsSavingProduct(false);
    }
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
      saveAllProducts([]);
      setCustomers([
        { id: 'CUST-001', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
      ]);
      saveAllCustomers([
        { id: 'CUST-001', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
      ]);
      setSuppliers([]);
      saveAllSuppliers([]);
      setPurchaseOrders([]);
      saveAllPurchaseOrders([]);
      setSalesOrders([]);
      saveAllSalesOrders([]);
      setOpnameLog([]);
      saveAllOpnameLog([]);
      setCashLedger([]);
      saveAllCashLedger([]);
      setConsignments([]);
      setBoms([]);
      setRiwayatProduksi([]);
      setStokPrices({});
      setTipeBisnis('Retail');
    } else if (options.tipeTemplate === 'bakery') {
      setProducts(INITIAL_PRODUCTS);
      saveAllProducts(INITIAL_PRODUCTS);
      setCustomers(INITIAL_CUSTOMERS);
      saveAllCustomers(INITIAL_CUSTOMERS);
      setSuppliers(INITIAL_SUPPLIERS);
      saveAllSuppliers(INITIAL_SUPPLIERS);
      setPurchaseOrders(INITIAL_PURCHASE_ORDERS);
      saveAllPurchaseOrders(INITIAL_PURCHASE_ORDERS);
      setSalesOrders(INITIAL_SALES_ORDERS);
      saveAllSalesOrders(INITIAL_SALES_ORDERS);
      setOpnameLog(INITIAL_OPNAME_LOG);
      saveAllOpnameLog(INITIAL_OPNAME_LOG);
      setCashLedger(INITIAL_CASH_LEDGER);
      saveAllCashLedger(INITIAL_CASH_LEDGER);
      setConsignments(INITIAL_CONSIGNMENT);
      setBoms(INITIAL_BOMS);
      setRiwayatProduksi(INITIAL_RIWAYAT_PRODUKSI);
      setStokPrices({});
      setTipeBisnis('Manufaktur');
    } else if (options.tipeTemplate === 'retail') {
      const RETAIL_PRODUCTS: any[] = [];
      const RETAIL_CUSTOMERS = [
        { id: 'CUST-002', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
      ];
      const RETAIL_SUPPLIERS: any[] = [];
      setProducts(RETAIL_PRODUCTS);
      saveAllProducts(RETAIL_PRODUCTS);
      setCustomers(RETAIL_CUSTOMERS);
      saveAllCustomers(RETAIL_CUSTOMERS);
      setSuppliers(RETAIL_SUPPLIERS);
      saveAllSuppliers(RETAIL_SUPPLIERS);
      setPurchaseOrders([]);
      saveAllPurchaseOrders([]);
      setSalesOrders([]);
      saveAllSalesOrders([]);
      setOpnameLog([]);
      saveAllOpnameLog([]);
      setCashLedger([]);
      saveAllCashLedger([]);
      setConsignments([]);
      setBoms([]);
      setRiwayatProduksi([]);
      setStokPrices({});
      setTipeBisnis('Retail');
    } else if (options.tipeTemplate === 'consignment') {
      const CSG_PRODUCTS: any[] = [];
      const CSG_CONSIGNMENTS: any[] = [];
      setProducts(CSG_PRODUCTS);
      saveAllProducts(CSG_PRODUCTS);
      setCustomers([
        { id: 'CUST-001', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
      ]);
      saveAllCustomers([
        { id: 'CUST-001', nama: 'Pelanggan Umum Retail', kontak: 'Walk-in', email: 'walkin@inoerp.com', telp: '-', alamat: 'Toko Langsung', piutang: 0 }
      ]);
      setSuppliers([]);
      saveAllSuppliers([]);
      setPurchaseOrders([]);
      saveAllPurchaseOrders([]);
      setSalesOrders([]);
      saveAllSalesOrders([]);
      setOpnameLog([]);
      saveAllOpnameLog([]);
      setCashLedger([]);
      saveAllCashLedger([]);
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
      deleteProduct(sku);
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
      saveCustomer(customerForm);
      triggerToast('Customer terupdate.');
    } else {
      const id = `CUST-${getTodayYMD()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
      const newCust = { ...customerForm, id };
      setCustomers([...customers, newCust]);
      saveCustomer(newCust);
      triggerToast('Customer terdaftar.');
    }
    setShowCustomerModal(false);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.nama) return triggerToast('Nama wajib diisi!', 'error');
    if (isEditingSupplier) {
      setSuppliers(suppliers.map(s => s.id === supplierForm.id ? supplierForm : s));
      saveSupplier(supplierForm);
      triggerToast('Supplier terupdate.');
    } else {
      const id = `SUP-${getTodayYMD()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
      const newSup = { ...supplierForm, id };
      setSuppliers([...suppliers, newSup]);
      saveSupplier(newSup);
      triggerToast('Supplier terdaftar.');
    }
    setShowSupplierModal(false);
  };
  // ==========================================
  // LEDGER SPREADSHEET & TRANSACTION DETAILS HELPERS
  // ==========================================

  // ponytail: Helper untuk merender elemen DOM ke PDF menggunakan html-to-image + jsPDF
  const exportElementToPDF = async (elementId: string, filename: string): Promise<void> => {
    let styleEl: HTMLStyleElement | null = null;
    const element = document.getElementById(elementId);
    try {
      setIsExportingPDF(true);

      // Memberikan sedikit waktu bagi UI untuk render (jika perlu)
      await new Promise(resolve => setTimeout(resolve, 100));

      if (!element) {
        triggerToast(`Gagal: Elemen dengan ID '${elementId}' tidak ditemukan.`, 'error');
        return;
      }

      // OPSI A: Inject class dan rule CSS khusus untuk memaksa render hitam-putih
      element.classList.add('force-print-pdf');
      styleEl = document.createElement('style');
      styleEl.innerHTML = `
        .force-print-pdf, .force-print-pdf * {
          color: black !important;
          border-color: #000 !important;
        }
        .force-print-pdf .bg-slate-50, .force-print-pdf .bg-slate-100, .force-print-pdf .bg-slate-200 {
          background-color: white !important;
        }
        .force-print-pdf .bg-slate-50\\/50, .force-print-pdf .bg-slate-100\\/50 {
          background-color: white !important;
        }
        .force-print-pdf th {
          background-color: white !important;
          color: black !important;
        }
        .force-print-pdf [data-report-box] {
          background-color: #f5f5f5 !important;
          border-color: black !important;
          color: black !important;
        }
      `;
      document.head.appendChild(styleEl);

      // Render DOM ke canvas image data dengan html-to-image (mendukung oklab, gap, dll)
      const imgData = await htmlToImage.toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          margin: '0',
          padding: '0'
        }
      });

      // Untuk mendapatkan resolusi asli (width/height), kita buat objek Image sementara
      const img = new Image();
      img.src = imgData;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Kalkulasi rasio dan paginasi (BUG 1 FIXED)
      const pdfWidth = 210; // A4 width in mm
      const pdfHeight = 297; // A4 height in mm
      const marginX = 10;
      const marginY = 10;

      const imgWidth = pdfWidth - (marginX * 2);

      const canvasWidth = img.width;
      const canvasHeight = img.height;

      // Menghitung rasio gambar agar pas dengan lebar halaman A4
      const ratio = imgWidth / canvasWidth;
      const imgHeight = canvasHeight * ratio;

      const pageContentHeight = pdfHeight - (marginY * 2);
      let heightLeft = imgHeight;
      let position = marginY;

      // Menambahkan halaman pertama
      doc.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
      heightLeft -= pageContentHeight;

      // Logika pemisahan halaman manual untuk gambar panjang
      while (heightLeft > 0) {
        position -= pageContentHeight; // geser posisi Y ke atas sebesar konten 1 halaman
        doc.addPage();
        doc.addImage(imgData, 'PNG', marginX, position, imgWidth, imgHeight);
        heightLeft -= pageContentHeight;
      }

      doc.save(filename);
      triggerToast('Laporan berhasil diekspor ke PDF!', 'success');
    } catch (err: any) {
      console.error("PDF Export Error:", err);
      triggerToast(`Error PDF: ${err.message || err.toString()}`, 'error');
    } finally {
      setIsExportingPDF(false);
      if (element) element.classList.remove('force-print-pdf');
      if (styleEl && document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }
    }
  };

  // ponytail: Helper untuk export ke PDF menggunakan jsPDF + jspdf-autotable
  const generateReportPDF = (
    title: string,
    subtitle: string,
    periode: string,
    headers: string[],
    rows: (string | number)[][],
    summaryRows: (string | number)[][] | undefined,
    filename: string,
    orientation: 'portrait' | 'landscape' = 'portrait'
  ) => {
    const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' });

    // Add header (Company Name & Address)
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(namaToko || 'INO ERP', 14, 20);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(alamatToko || 'Alamat Belum Diatur', 14, 26);

    // Add Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title.toUpperCase(), 14, 38);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(subtitle, 14, 44);
    doc.text(`Periode: ${periode}`, 14, 50);

    // Add Table using autotable
    autoTable(doc, {
      startY: 55,
      head: [headers],
      body: rows,
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [14, 165, 164], textColor: 255, fontStyle: 'bold' }, // Tailwind's primary color approximation (#0ea5a4)
      didDrawPage: (data) => {
        // Footer (Page number and print date)
        const str = `Halaman ${doc.getCurrentPageInfo().pageNumber} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}`;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        doc.text(str, data.settings.margin.left, doc.internal.pageSize.height - 10);
      }
    });

    // Add Summary Rows if any (like Laba Bersih, dll.)
    if (summaryRows && summaryRows.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 55;
      autoTable(doc, {
        startY: finalY,
        body: summaryRows,
        theme: 'plain',
        styles: { fontSize: 9, fontStyle: 'bold', cellPadding: 3 },
        columnStyles: {
          0: { halign: 'left' },
          1: { halign: 'right' }
        },
        willDrawCell: (data) => {
          // Identify row text for dynamic coloring matching the UI
          const rowData = data.row.raw as (string | number)[];
          const label = String(rowData[0] || '').toLowerCase();
          const valStr = String(rowData[1] || '');
          if (label.includes('laba') || label.includes('pendapatan')) {
            if (!valStr.includes('-')) {
              data.cell.styles.textColor = [34, 197, 94]; // success green
            } else {
              data.cell.styles.textColor = [239, 68, 68]; // danger red
            }
          } else if (label.includes('rugi') || label.includes('beban') || label.includes('pengeluaran') || valStr.includes('-')) {
            data.cell.styles.textColor = [239, 68, 68]; // danger red
          }
        }
      });
    }

    doc.save(filename);
  };

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
    // ponytail: lock struktur & urutan kolom laporan mutasi persediaan agar tidak ter-reset
    const headers = ['Tanggal', 'Deskripsi / No. Ref', 'Masuk (+)', 'Keluar (-)', 'Saldo Akhir / Sisa Qty', 'Harga Unit', 'Total Nilai', 'Status / Catatan'];
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
      items: [...poForm.items, { sku: '', nama: '', satuan: 'Pcs', qty: 1, harga: 0, subtotal: 0 }]
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
    if (isSavingPO) return;
    if (!poForm.supplier) return triggerToast('Pilih Supplier!', 'error');
    if (poForm.items.length === 0 || poForm.items.every((i: any) => i.qty <= 0)) return triggerToast('Barang tidak boleh kosong!', 'error');

    if (!isDraft) {
      setPendingDraftState(isDraft);
      setShowPoConfirmModal(true);
      return;
    }
    processSavePO(isDraft);
  };

  const processSavePO = async (isDraft: boolean) => {
    if (isSavingPO) return;
    // ponytail: Validasi angka negatif di trust boundary
    if (poForm.items.some(i => i.qty < 0 || i.harga < 0)) {
      triggerToast('Error: QTY dan Harga pada item tidak boleh negatif!', 'error');
      return;
    }
    setIsSavingPO(true);
    try {


      // Auto-create new supplier if it does not exist
      const rawSupplier = poForm.supplier.trim();
      let currentSuppliers = [...suppliers];
      const existingSupplier = currentSuppliers.find(s => s.nama.toLowerCase() === rawSupplier.toLowerCase());
      if (!existingSupplier) {
        const newSupId = `SUP-${getTodayYMD()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
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
        await saveSupplier(newSup);
        currentSuppliers.push(newSup);
        triggerToast(`Supplier baru [${rawSupplier}] otomatis ditambahkan ke database!`, 'success');
      }

      const validItems = poForm.items.filter(item => item.sku && item.qty > 0);
      if (validItems.length === 0) return triggerToast('Tambahkan minimal 1 item!', 'error');

      const subtotal = validItems.reduce((sum, item) => sum + item.subtotal, 0);
      const tax = poForm.pajak ? Math.round(subtotal * 0.12) : 0;
      const grandTotal = subtotal + tax;

      const finalId = isEditingPo ? poForm.id : `PO-${getTodayYMD()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;

      const newPO = {
        id: finalId,
        tanggal: poForm.tanggal,
        supplier: poForm.supplier,
        metode: poForm.metode,
        items: validItems,
        subtotal,
        pajak: tax,
        grandTotal,
        statusLogistik: isDraft ? 'Draft' : 'DIPESAN', // ponytail: PO is just an order, not received yet
        statusBayar: poForm.metode === 'Tunai' ? 'Lunas' : 'Belum Dibayar',
        catatan: poForm.catatan
      };

      // If Save and Release -> Update Stocks & Supplier Payables
      if (!isDraft && poForm.metode !== 'Tunai') {
        const nextSups = suppliers.map(s => s.nama === poForm.supplier ? { ...s, hutang: s.hutang + grandTotal } : s);
        setSuppliers(nextSups);
        await saveAllSuppliers(nextSups);
      }

      // ponytail: Jika metode Tunai & bukan draft, catat pengeluaran kas langsung
      if (!isDraft && poForm.metode === 'Tunai') {
        const targetAkun = 'Kas Tunai';
        const accountTx = cashLedger.filter(c => (c.akun || 'Bank') === targetAkun);
        const lastBal = accountTx.length > 0 ? accountTx[accountTx.length - 1].saldo : 0;
        const nextLedger = [...cashLedger, {
          id: `CSH-${poForm.tanggal.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
          tanggal: poForm.tanggal,
          ref: finalId,
          keterangan: `Pembelian Tunai ke Supplier ${poForm.supplier} [${finalId}]`,
          kategori: 'Pembelian',
          debit: 0,
          kredit: grandTotal,
          saldo: lastBal - grandTotal,
          akun: targetAkun
        }];
        setCashLedger(nextLedger);
        await saveAllCashLedger(nextLedger);
      }



      if (isEditingPo) {
        setPurchaseOrders(purchaseOrders.map(p => p.id === poForm.id ? newPO : p));
        await savePurchaseOrder(newPO);
      } else {
        setPurchaseOrders([newPO, ...purchaseOrders]);
        await savePurchaseOrder(newPO);
      }

      triggerToast(isDraft ? 'Draft PO berhasil disimpan.' : 'PO resmi berhasil dirilis!');
      setShowPoForm(false);
      setIsEditingPo(false);
    } finally {
      setIsSavingPO(false);
    }
  };

  const handleVoidPO = async (id: string) => {
    if (isVoidingPO) return;
    if (window.confirm(`Yakin ingin membatalkan (Void) PO [${id}]?`)) {
      setIsVoidingPO(true);
      try {
        const po = purchaseOrders.find(p => p.id === id);
        if (po) {
          // Adjust stock back down if it was already received
          if (po.statusLogistik === 'Diterima') {
            const updatedProds = products.map(p => {
              const item = po.items.find((it: any) => it.sku === p.sku);
              return item ? { ...p, stok: Math.max(0, p.stok - item.qty) } : p;
            });
            setProducts(updatedProds);
            await saveAllProducts(updatedProds);
          }
          // Adjust payables
          if (po.statusBayar === 'Belum Dibayar') {
            const nextSups = suppliers.map(s => s.nama === po.supplier ? { ...s, hutang: Math.max(0, s.hutang - po.grandTotal) } : s);
            setSuppliers(nextSups);
            await saveAllSuppliers(nextSups);
          }

          const updatedPOs = purchaseOrders.map(p => p.id === id ? { ...p, statusLogistik: 'Void', statusBayar: 'Void' } : p);
          setPurchaseOrders(updatedPOs);
          await saveAllPurchaseOrders(updatedPOs);

          triggerToast(`PO [${id}] berhasil dibatalkan.`);
        }
      } finally {
        setIsVoidingPO(false);
      }
    }
  };

  // ==========================================
  // SALES ORDER LOGIC
  // ==========================================
  const handleAddSoItem = () => {
    setSoForm({ ...soForm, items: [...soForm.items, { sku: '', nama: '', satuan: 'Pcs', qty: 1, harga: 0, subtotal: 0 }] });
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
    if (isSavingSO) return;
    if (!soForm.pelanggan) return triggerToast('Pilih pelanggan terlebih dahulu!', 'error');
    if (soForm.items.length === 0 || soForm.items.every((i: any) => i.qty <= 0)) return triggerToast('Barang tidak boleh kosong!', 'error');

    if (!isDraftMode) {
      setPendingDraftState(isDraftMode);
      setShowSoConfirmModal(true);
      return;
    }
    processSaveSO(isDraftMode);
  };

  const processSaveSO = async (isDraftMode: boolean) => {
    if (isSavingSO) return;
    // ponytail: Validasi angka negatif di trust boundary
    if (soForm.items.some(i => i.qty < 0 || i.harga < 0)) {
      triggerToast('Error: QTY dan Harga pada item tidak boleh negatif!', 'error');
      return;
    }
    setIsSavingSO(true);
    try {

      // Auto-create new customer if it does not exist
      const rawCustomer = soForm.pelanggan.trim();
      let currentCustomers = [...customers];
      const existingCustomer = currentCustomers.find(c => c.nama.toLowerCase() === rawCustomer.toLowerCase());
      if (!existingCustomer) {
        const newCustId = `CUST-${getTodayYMD()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
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
        await saveCustomer(newCust);
        currentCustomers.push(newCust);
        triggerToast(`Pelanggan baru [${rawCustomer}] otomatis ditambahkan ke database!`, 'success');
      }

      const validItems = soForm.items.filter(item => item.sku && item.qty > 0);
      if (validItems.length === 0) return triggerToast('Isi minimal 1 baris barang belanja!', 'error');

      // ponytail: Mitigasi client-side race condition (stale state). Solusi atomik definitif membutuhkan backend dengan database lock.
      let freshProducts = products;
      if (!isDraftMode) {
        freshProducts = await getProducts();
      }

      // Check stocks before processing SO
      let stockError = false;
      if (!isDraftMode) {
        validItems.forEach(item => {
          const prod = freshProducts.find((p: any) => p.sku === item.sku);
          if (!prod || prod.stok < item.qty) {
            triggerToast(`Error: Stok berubah atau habis! Silakan periksa kembali (Sisa stok ${prod ? prod.nama : item.sku}: ${prod ? prod.stok : 0})`, 'error');
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
        const updatedProds = freshProducts.map((p: any) => {
          const cartItem = validItems.find(item => item.sku === p.sku);
          return cartItem ? { ...p, stok: p.stok - cartItem.qty } : p;
        });
        setProducts(updatedProds);
        await saveAllProducts(updatedProds);
      }

      const nextId = isEditingSo ? soForm.id : `SO-${getTodayYMD()}-${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
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
        await saveSalesOrder(newSO);
        triggerToast(`Sales Order [${soForm.id}] berhasil diupdate.`);
      } else {
        setSalesOrders([newSO, ...salesOrders]);
        await saveSalesOrder(newSO);
        triggerToast(`Sales Order [${nextId}] berhasil dibuat & rilis!`);
      }

      // Update customer piutang
      if (soForm.metode !== 'Tunai' && !isDraftMode) {
        const nextCusts = customers.map(c => c.nama === soForm.pelanggan ? { ...c, piutang: c.piutang + grandTotal } : c);
        setCustomers(nextCusts);
        await saveAllCustomers(nextCusts);
      }

      // ponytail: Jika metode Tunai & bukan draft, catat penerimaan kas langsung
      if (soForm.metode === 'Tunai' && !isDraftMode) {
        const targetAkun = 'Kas Tunai';
        const accountTx = cashLedger.filter(c => (c.akun || 'Bank') === targetAkun);
        const lastBal = accountTx.length > 0 ? accountTx[accountTx.length - 1].saldo : 0;
        const nextLedger = [...cashLedger, {
          id: `CSH-${soForm.tanggal.replace(/-/g, '')}-${Math.floor(100 + Math.random() * 900)}`,
          tanggal: soForm.tanggal,
          ref: nextId,
          keterangan: `Penjualan Tunai dari ${soForm.pelanggan} [${nextId}]`,
          kategori: 'Penjualan',
          debit: grandTotal,
          kredit: 0,
          saldo: lastBal + grandTotal,
          akun: targetAkun
        }];
        setCashLedger(nextLedger);
        await saveAllCashLedger(nextLedger);
      }

      setShowSoForm(false);
      setIsEditingSo(false);
    } finally {
      setIsSavingSO(false);
    }
  };

  const handleVoidSO = async (id: string) => {
    if (isVoidingSO) return;
    const so = salesOrders.find(s => s.id === id);
    if (!so) return;

    if (window.confirm(`Void Sales Order ${id}? Tindakan ini akan mengembalikan stok barang ke gudang.`)) {
      setIsVoidingSO(true);
      try {
        // Revert Stock
        const updatedProducts = products.map(p => {
          const orderItem = so.items.find((item: any) => item.sku === p.sku);
          if (orderItem && so.statusLogistik !== 'Void') {
            return { ...p, stok: p.stok + orderItem.qty };
          }
          return p;
        });
        setProducts(updatedProducts);
        await saveAllProducts(updatedProducts);

        // Decrement piutang if applicable
        if (so.statusBayar === 'Belum Lunas') {
          const nextCusts = customers.map(c => c.nama === so.pelanggan ? { ...c, piutang: Math.max(0, c.piutang - so.grandTotal) } : c);
          setCustomers(nextCusts);
          await saveAllCustomers(nextCusts);
        }

        const updatedSOs = salesOrders.map(item => item.id === id ? { ...item, statusBayar: 'Void', statusLogistik: 'Void' } : item);
        setSalesOrders(updatedSOs);
        await saveAllSalesOrders(updatedSOs);

        triggerToast(`Struk ${id} berhasil di-Void! Stok dikembalikan.`);
      } finally {
        setIsVoidingSO(false);
      }
    }
  };

  // ==========================================
  // STOCK OPNAME LOGIC
  // ==========================================
  const handleStockOpnameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!opnameForm.sku) return triggerToast('Pilih SKU target terlebih dahulu', 'error');
    setShowOpnameConfirm(true);
  };

  const handleStockOpnameConfirmAction = () => {
    const prod = products.find(p => p.sku === opnameForm.sku);
    if (!prod) return;

    const selisih = typeof opnameForm.selisih === 'string' ? (parseFloat(opnameForm.selisih) || 0) : opnameForm.selisih;
    const qtyFisik = typeof opnameForm.qtyFisik === 'string' ? (parseFloat(opnameForm.qtyFisik) || 0) : opnameForm.qtyFisik;
    const valueAdjustment = selisih * prod.hpp;

    const newLog = {
      tanggal: new Date().toISOString().split('T')[0],
      sku: prod.sku,
      nama: prod.nama,
      tipe: opnameForm.tipe,
      qtySistem: opnameForm.qtySistem,
      qtyFisik: qtyFisik,
      selisih,
      satuan: prod.satuan,
      HPP: prod.hpp,
      subtotal: valueAdjustment,
      catatan: opnameForm.catatan || 'Penyesuaian stok manual',
      operator: 'Administrator'
    };

    setProducts(products.map(p => p.sku === prod.sku ? { ...p, stok: qtyFisik } : p));
    saveProduct({ ...prod, stok: qtyFisik });
    setOpnameLog([newLog, ...opnameLog]);
    appendOpnameLog(newLog);
    triggerToast(`Opname SKU [${prod.sku}] berhasil dicatat & disesuaikan.`);
    setOpnameForm({ sku: '', tipe: 'OPNAME_PLUS', qtySistem: 0, selisih: 0, qtyFisik: 0, catatan: '' });
    setShowOpnameConfirm(false);
    setShowOpnameModal(false);
  };

  // Render login screen if login is active and user is not logged in
  if (isLoginActive && !isLoggedIn) {
    // ponytail: Autentikasi admin sederhana menggunakan state lokal & tombol bypass instan tanpa setup auth server / library eksternal rumit.
    const handleLoginSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isLoggingIn) return;
      setIsLoggingIn(true);
      try {
        const inputUser = loginInputUser.trim().toLowerCase();
        const inputPass = loginInputPass.trim();

        const result = await validateLogin(inputUser, inputPass, loginUsername, loginPassword, settingUsersList);

        if (result.success) {
          setIsLoggedIn(true);
          triggerToast(`Login Berhasil! Selamat datang ${result.isSuperadmin ? 'Superadmin' : result.matchedUser.nama}.`, 'success');
        } else {
          triggerToast('Gagal! Username atau Password/PIN salah. Silakan coba lagi atau gunakan tombol Bypass.', 'error');
        }
      } finally {
        setIsLoggingIn(false);
      }
    };

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Login Sistem</h2>
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Username / Email</label>
              <input
                type="text"
                value={loginInputUser}
                onChange={(e) => setLoginInputUser(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Password / PIN</label>
              <input
                type="password"
                value={loginInputPass}
                onChange={(e) => setLoginInputPass(e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoggingIn ? 'Memverifikasi...' : 'Masuk'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const filteredProducts = products.filter(p => p.sku.toLowerCase().includes(searchProductQuery.toLowerCase()) || p.nama.toLowerCase().includes(searchProductQuery.toLowerCase()));
  const filteredPOs = purchaseOrders.filter(po => po.id.toLowerCase().includes(searchPoQuery.toLowerCase()) || po.supplier.toLowerCase().includes(searchPoQuery.toLowerCase()));
  const filteredSOs = salesOrders.filter(so => {
    const matchSearch = so.id.toLowerCase().includes(searchSoQuery.toLowerCase()) || so.pelanggan.toLowerCase().includes(searchSoQuery.toLowerCase());
    let matchFilter = true;
    if (soFilterJenis === 'SO') matchFilter = !so.id.startsWith('POS-');
    else if (soFilterJenis === 'POS') matchFilter = so.id.startsWith('POS-');
    return matchSearch && matchFilter;
  });

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      {/* Premium Warm Minimal Topbar Header */}
      <header className="bg-white text-primary px-6 md:px-8 py-3.5 flex flex-col md:flex-row justify-between items-center border-b border-slate-100 gap-4 no-print shadow-xs relative z-50 w-full max-w-none">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-card bg-primary flex items-center justify-center font-bold text-white text-sm shadow-sm">
            IN
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-2">
                INO ERP
                <span className="text-[11px] text-primary bg-primary/5 px-2 py-0.5 rounded border border-primary/15 font-semibold">{namaToko}</span>
              </h1>
            </div>
            <p className="text-[11px] text-secondary font-medium">Integrated Business Operations &middot; {tipeBisnis}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap justify-end flex-1">
          <span className="bg-primary/5 text-primary border border-primary/15 px-3 py-1.5 rounded-card font-mono text-sm flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            Simulasi Aktif
          </span>
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-secondary border-l border-slate-100 pl-3">
            <span>Administrator</span>
            <div translate="no" className="w-7 h-7 rounded-full bg-slate-100 text-slate-900 border border-border flex items-center justify-center text-sm font-bold">
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
              className="flex items-center gap-1.5 bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 px-3 py-1.5 rounded-card text-sm font-semibold transition-all cursor-pointer"
            >
              <LogOut size={13} />
              <span>Keluar</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('setting')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-card text-sm font-semibold transition-all cursor-pointer"
          >
            <Settings size={14} />
            <span className="hidden sm:inline">Pengaturan</span>
          </button>
          <button
            onClick={() => setActiveTab('export_code')}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-card text-sm font-semibold transition-all cursor-pointer"
            title="Google Sheets Hub"
          >
            <Code size={14} />
          </button>

        </div>
      </header>

      {/* Level 2: Horizontal Navigation Bar - Modern SaaS Style */}
      <nav className="bg-white text-secondary border-b border-slate-100 px-6 md:px-8 py-2.5 hidden md:flex items-center justify-center no-print relative z-[60] w-full max-w-none">
        <div className="flex items-center justify-center w-full flex-wrap gap-4 max-w-none">
          {NAV_GROUPS.map(group => {
            const active = isGroupActive(group);
            if (group.direct) {
              return (
                <button
                  key={group.id}
                  onClick={() => setActiveTab(group.id)}
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-transparent hover:bg-slate-50 text-secondary hover:text-primary'
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
                  className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${active
                      ? 'bg-primary/10 text-primary'
                      : 'bg-transparent hover:bg-slate-50 text-secondary hover:text-primary'
                    }`}
                >
                  {group.icon}
                  <span>{group.label}</span>
                  <ChevronDown size={14} className={`transition-transform duration-200 opacity-50 group-hover:opacity-100 ${active ? 'text-primary' : 'text-slate-400'}`} />
                </button>
                <div className="absolute left-0 top-[90%] pt-3 hidden group-hover:block z-50 min-w-[220px]">
                  <div className="bg-white border border-slate-100 shadow-2xl rounded-2xl p-1.5 flex flex-col gap-0.5 relative z-50">
                    {group.children?.map(child => {
                      const childActive = activeTab === child.id;
                      return (
                        <button
                          key={child.id}
                          onClick={() => setActiveTab(child.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left rounded-xl text-sm font-medium transition-all cursor-pointer ${childActive
                              ? 'bg-primary/5 text-primary'
                              : 'bg-transparent hover:bg-slate-50 text-secondary hover:text-primary'
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
      </nav>

      {/* Main Container */}
      <div className="flex flex-1 flex-col">
        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8 pb-20 md:pb-8 w-full max-w-none overflow-y-auto">
          {toast && (
            <div className={`fixed bottom-6 right-6 px-4 py-3 rounded-card shadow-lg text-white font-medium flex items-center gap-3 transition-all transform animate-bounce z-50 ${toast.type === 'success' ? 'bg-success' : toast.type === 'error' ? 'bg-danger' : 'bg-warning'}`}>
              <CheckCircle size={18} />
              <span>{toast.message}</span>
            </div>
          )}

          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (() => {
            const latestBalances: Record<string, number> = {};
            settingCashAccounts.forEach(acc => latestBalances[acc.nama] = 0);
            cashLedger.forEach(c => {
              latestBalances[c.akun || 'Bank'] = c.saldo;
            });

            let totalTunai = 0;
            let totalBank = 0;

            if (cashLedger.length === 0) {
              totalBank = 0;
            } else {
              Object.keys(latestBalances).forEach(akunName => {
                const accSetting = settingCashAccounts.find(a => a.nama === akunName);
                const isTunai = accSetting
                  ? (accSetting.jenis === 'Kas' || accSetting.nama.toLowerCase().includes('tunai') || accSetting.nama.toLowerCase().includes('cash'))
                  : (akunName.toLowerCase().includes('tunai') || (akunName.toLowerCase().includes('kas') && !akunName.toLowerCase().includes('bank')));

                if (isTunai) {
                  totalTunai += latestBalances[akunName] || 0;
                } else {
                  totalBank += latestBalances[akunName] || 0;
                }
              });
            }
            const grandTotalKas = totalTunai + totalBank;

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
                    <h2 className="text-2xl font-bold text-text-primary">🏠 Dashboard Monitor (Live Control Center)</h2>
                    <p className="text-sm text-secondary">Monitor keuangan operasional harian dan tindakan eksekusi penting secara langsung</p>

                  </div>
                </div>
                <div className="space-y-6">
                  {/* Top Cards (Metrik Flash) */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {/* Kas Aktual */}
                    <Card className="flex flex-col justify-between relative overflow-hidden group hover:border-primary transition-all">
                      <div className="flex justify-between items-center text-sm font-bold text-slate-400 tracking-wider uppercase">
                        <span>Total Kas & Bank</span>
                        <span className="p-1.5 rounded-card bg-success/10 text-primary font-mono text-[11px]">Live Balance</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-extrabold text-primary">
                          Rp {grandTotalKas.toLocaleString('id-ID')}
                        </span>
                        <p className="text-[11px] text-secondary mt-1.5 font-medium opacity-80">
                          Tunai: Rp {totalTunai.toLocaleString('id-ID')} | Bank: Rp {totalBank.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setManualCashForm({
                              tanggal: new Date().toISOString().split('T')[0],
                              keterangan: '',
                              kategori: 'Operasional Lain',
                              tipe: 'KELUAR',
                              nominal: 0,
                              akun: settingCashAccounts.length > 0 ? settingCashAccounts[0].nama : 'Bank'
                            });
                            setShowManualCashModal(true);
                          }}
                          className="text-[11px] text-primary p-0 h-auto hover:bg-transparent hover:text-primary-hover"
                        >
                          ➕ Catat Mutasi Kas Manual
                        </Button>
                      </div>
                    </Card>
                    {/* Total Piutang (AR) */}
                    <div className="bg-white border border-border p-5 rounded-card shadow-sm flex flex-col justify-between hover:border-sky-500 transition-all">
                      <div className="flex justify-between items-center text-sm font-bold text-text-muted tracking-wider uppercase">
                        <span>Total Piutang (AR)</span>
                        <span className="p-1.5 rounded-card bg-sky-50 text-info font-mono text-[11px]">Sisa Tagihan</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-extrabold text-text-primary">
                          Rp {totalPiutangAR.toLocaleString('id-ID')}
                        </span>
                        <p className="text-[11px] text-text-secondary mt-1.5">SO Belum Lunas / Cicilan aktif</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-secondary">
                        <span>Detail & Pelunasan ada di tab <button onClick={() => setActiveTab('sales_order')} className="font-bold hover:underline cursor-pointer">Sales Order</button></span>

                      </div>
                    </div>
                    {/* Total Hutang (AP) */}
                    <div className="bg-white border border-border p-5 rounded-card shadow-sm flex flex-col justify-between hover:border-red-500 transition-all">
                      <div className="flex justify-between items-center text-sm font-bold text-text-muted tracking-wider uppercase">
                        <span>Total Hutang (AP)</span>
                        <span className="p-1.5 rounded-card bg-danger/10 text-danger font-mono text-[11px]">Sisa Hutang</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-extrabold text-text-primary">
                          Rp {totalHutangAP.toLocaleString('id-ID')}
                        </span>
                        <p className="text-[11px] text-text-secondary mt-1.5">PO Belum Dibayar / Cicilan aktif</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center text-[11px] text-secondary">
                        <span>Kelola pembayaran di tab <button onClick={() => setActiveTab('purchase_order')} className="font-bold hover:underline cursor-pointer">Purchase Order</button></span>

                      </div>
                    </div>
                    {/* Estimasi Laba Kotor */}
                    <div className="bg-white border border-border p-5 rounded-card shadow-sm flex flex-col justify-between hover:border-violet-500 transition-all">
                      <div className="flex justify-between items-center text-sm font-bold text-text-muted tracking-wider uppercase">
                        <span>Est. Laba Kotor</span>
                        <span className="p-1.5 rounded-card bg-violet-50 text-violet-600 font-mono text-[11px]">Hj - HPP - Opname-</span>
                      </div>
                      <div className="mt-3">
                        <span className="text-2xl font-extrabold text-text-primary">
                          Rp {estimasiLabaKotor.toLocaleString('id-ID')}
                        </span>
                        <p className="text-[11px] text-text-secondary mt-1.5">Setelah dikurangi wastage & opname minus</p>
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-secondary font-mono">
                        <span>Margin: {totalMarginPenjualan > 0 ? ((estimasiLabaKotor / totalMarginPenjualan) * 100).toFixed(1) : 0}%</span>
                        <span className="text-danger">Waste: Rp {totalOpnameMinus.toLocaleString('id-ID')}</span>

                      </div>
                    </div>
                  </div>
                  {/* Action Tables Group */}
                  <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* AR Overdue */}
                    <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-extrabold text-danger uppercase tracking-wider flex items-center justify-between gap-1.5 w-full">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-danger animate-pulse"></span>
                            ⚠️ AR Overdue (Piutang Jatuh Tempo)
                          </span>
                          <button onClick={() => setActiveTab('sales_order')} className="text-[11px] text-danger hover:underline font-bold cursor-pointer normal-case">Tinjau Penjualan &rarr;</button>
                        </h3>
                        <span className="bg-danger/20 text-danger text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">{arOverdueList.length} Faktur</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-text-secondary font-bold border-b border-slate-100 uppercase text-xs">
                              <th className="py-3 px-4">No. SO</th>
                              <th className="py-3 px-4">Customer</th>
                              <th className="py-3 px-4 text-right">Sisa Tagihan</th>
                              <th className="py-3 px-4 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {arOverdueList.map(so => {
                              const sisa = so.grandTotal - (so.totalPaid ?? 0);
                              return (
                                <tr key={so.id} className="hover:bg-slate-50">
                                  <td className="py-3.5 px-4 font-mono font-bold text-text-primary">{so.id}</td>
                                  <td className="py-3.5 px-4 font-medium max-w-[100px] truncate">{so.pelanggan}</td>
                                  <td className="py-3.5 px-4 text-right font-bold text-danger">Rp {sisa.toLocaleString('id-ID')}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedSo(so);
                                        setSoActionForm('payment');
                                        setActiveTab('sales_order');
                                      }}
                                      className="text-[11px] font-bold bg-primary text-white px-2 py-1 rounded hover:bg-teal-600"
                                    >
                                      Bayar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {arOverdueList.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-400 italic">Tidak ada piutang jatuh tempo. Luar biasa!</td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                      </div>
                    </div>
                    {/* AP Overdue */}
                    <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-extrabold text-warning uppercase tracking-wider flex items-center justify-between gap-1.5 w-full">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-warning animate-pulse"></span>
                            ⚠️ AP Overdue (Hutang Jatuh Tempo)
                          </span>
                          <button onClick={() => setActiveTab('purchase_order')} className="text-[11px] text-warning hover:underline font-bold cursor-pointer normal-case">Tinjau Pembelian &rarr;</button>
                        </h3>
                        <span className="bg-warning/20 text-warning text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">{apOverdueList.length} Tagihan</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-text-secondary font-bold border-b border-slate-100 uppercase text-xs">
                              <th className="py-3 px-4">No. PO</th>
                              <th className="py-3 px-4">Supplier</th>
                              <th className="py-3 px-4 text-right">Sisa Hutang</th>
                              <th className="py-3 px-4 text-center">Aksi</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {apOverdueList.map(po => {
                              const sisa = po.grandTotal - (po.totalPaid ?? 0);
                              return (
                                <tr key={po.id} className="hover:bg-slate-50">
                                  <td className="py-3.5 px-4 font-mono font-bold text-text-primary">{po.id}</td>
                                  <td className="py-3.5 px-4 font-medium max-w-[100px] truncate">{po.supplier}</td>
                                  <td className="py-3.5 px-4 text-right font-bold text-warning">Rp {sisa.toLocaleString('id-ID')}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <button
                                      onClick={() => {
                                        setSelectedPo(po);
                                        setPoActionForm('payment');
                                        setActiveTab('purchase_order');
                                      }}
                                      className="text-[11px] font-bold bg-primary text-white px-2 py-1 rounded hover:bg-teal-600"
                                    >
                                      Bayar
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                            {apOverdueList.length === 0 && (
                              <tr>
                                <td colSpan={4} className="py-6 text-center text-slate-400 italic">Tidak ada hutang jatuh tempo. Aman terkendali!</td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                      </div>
                    </div>
                    {/* Stok Kritis (Low Stock) */}
                    <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                        <h3 className="text-sm font-extrabold text-danger uppercase tracking-wider flex items-center justify-between gap-1.5 w-full">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-danger/100"></span>
                            🚨 Stok Kritis (&le; Safety Level)
                          </span>
                          <button onClick={() => setActiveTab('master_produk')} className="text-[11px] text-danger hover:underline font-bold cursor-pointer normal-case">Cek Master Produk &rarr;</button>
                        </h3>
                        <span className="bg-danger/10 text-danger text-[11px] font-bold px-2 py-0.5 rounded-full font-mono">{criticalStockList.length} SKU</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-text-secondary font-bold border-b border-slate-100 uppercase text-xs">
                              <th className="py-3 px-4">Produk</th>
                              <th className="py-3 px-4 text-center">Stok / Safety</th>
                              <th className="py-3 px-4 text-center">Reorder PO</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {criticalStockList.map(p => (
                              <tr key={p.sku} className="hover:bg-slate-50">
                                <td className="py-3.5 px-4">
                                  <div className="font-bold text-text-primary">{p.nama}</div>
                                  <div className="font-mono text-[11px] text-primary">{p.sku}</div>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <span className="font-bold text-danger">{p.stok}</span>
                                  <span className="text-slate-400 text-[11px]"> / {p.safety}</span>
                                  <span className="text-slate-400 text-[11px] ml-1">{p.satuan}</span>
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    onClick={() => triggerGeneratePo(p)}
                                    className="text-[11px] font-bold bg-primary text-white px-2 py-1 rounded-md hover:bg-teal-600 transition-all"
                                  >
                                    ⚡ Generate PO
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {criticalStockList.length === 0 && (
                              <tr>
                                <td colSpan={3} className="py-6 text-center text-slate-400 italic">Semua stok berada di atas level aman!</td>
                              </tr>
                            )}
                          </tbody>
                        </table>

                      </div>
                    </div>
                  </div>
                  {/* Live Audit Feed */}
                  <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                        📋 Live Audit Feed & Mutasi Inventori (10 Terakhir)
                      </h3>
                      <span className="text-[11px] font-mono text-slate-400">Total LOG: {deriveAllInventoryLogs().length}</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-text-secondary font-bold border-b border-border uppercase text-xs">
                            <th className="py-3.5 px-4">Tanggal</th>
                            <th className="py-3.5 px-4">Produk</th>
                            <th className="py-3.5 px-4">Tipe</th>
                            <th className="py-3.5 px-4 text-center">Mutasi</th>
                            <th className="py-3.5 px-4 text-right">Nilai Mutasi</th>
                            <th className="py-3.5 px-4">Operator</th>
                            <th className="py-3.5 px-4">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                          {liveAuditFeed.map((log, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="py-3.5 px-4 text-secondary whitespace-nowrap">{log.tanggal}</td>
                              <td className="py-3.5 px-4 text-primary whitespace-nowrap font-sans font-bold">
                                {log.nama} <span className="font-mono text-[11px] text-primary font-normal">[{log.sku}]</span>
                              </td>
                              <td className="py-3.5 px-4">
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${log.tipe === 'IN' ? 'bg-success/10 text-success border border-success/30' : 'bg-danger/10 text-danger border border-danger/30'}`}>
                                  {log.tipe}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-bold">{log.qty}</td>
                              <td className="py-3.5 px-4 text-right font-bold text-text-primary">Rp {log.subtotal.toLocaleString('id-ID')}</td>
                              <td className="py-3.5 px-4 font-sans text-secondary">{log.operator}</td>
                              <td className="py-3.5 px-4 font-sans text-secondary">{log.keterangan}</td>
                            </tr>
                          ))}
                          {liveAuditFeed.length === 0 && (
                            <tr>
                              <td colSpan={7} className="py-8 text-center text-slate-400 italic">Belum ada mutasi log inventori tercatat.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                    </div>
                  </div>
                  {/* Donut Charts Section (Rasio Pelunasan) */}
                  <div className="bg-white border border-border p-5 rounded-card shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-primary"></span>
                        🍩 Rasio Pelunasan Transaksi & Status Keuangan (Donut Chart)
                      </h3>
                      <p className="text-[11px] text-text-secondary mt-0.5">Persentase dokumen transaksi yang sudah lunas vs yang masih berjalan (Belum Dibayar / Cicilan)</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* Sales Orders Donut */}
                      <div className="border border-slate-100 rounded-card p-4 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-center md:text-left space-y-1">
                          <h4 className="text-sm font-bold text-primary">Sales Orders (AR)</h4>
                          <p className="text-[11px] text-slate-400">Rasio Piutang Pelanggan</p>
                          <div className="mt-2 text-sm font-mono space-y-1">
                            <div className="flex items-center gap-1.5 justify-center md:justify-start">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                              <span className="text-secondary">Lunas:</span>
                              <span className="font-bold text-primary">{totalSoLunasCount} Dokumen</span>
                            </div>
                            <div className="flex items-center gap-1.5 justify-center md:justify-start">
                              <span className="w-2.5 h-2.5 rounded-full bg-danger"></span>
                              <span className="text-secondary">Sisa Tagihan:</span>
                              <span className="font-bold text-danger">{totalSoUnpaidCount} Dokumen</span>
                            </div>
                            <div className="text-[11px] text-secondary font-sans mt-2 pt-1.5 border-t border-border">
                              Sisa Piutang: <span className="font-bold text-danger font-mono">Rp {totalSoUnpaidAmount.toLocaleString('id-ID')}</span>
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
                            <span className="text-sm text-slate-400 italic">No Sales Data</span>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[14px] font-bold text-primary">
                              {validSos.length > 0 ? ((totalSoLunasCount / validSos.length) * 100).toFixed(0) : 0}%
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Lunas</span>

                          </div>
                        </div>
                      </div>
                      {/* Purchase Orders Donut */}
                      <div className="border border-slate-100 rounded-card p-4 bg-slate-50 flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="text-center md:text-left space-y-1">
                          <h4 className="text-sm font-bold text-primary">Purchase Orders (AP)</h4>
                          <p className="text-[11px] text-slate-400">Rasio Hutang Supplier</p>
                          <div className="mt-2 text-sm font-mono space-y-1">
                            <div className="flex items-center gap-1.5 justify-center md:justify-start">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                              <span className="text-secondary">Lunas:</span>
                              <span className="font-bold text-primary">{totalPoLunasCount} Dokumen</span>
                            </div>
                            <div className="flex items-center gap-1.5 justify-center md:justify-start">
                              <span className="w-2.5 h-2.5 rounded-full bg-warning"></span>
                              <span className="text-secondary">Sisa Hutang:</span>
                              <span className="font-bold text-warning">{totalPoUnpaidCount} Dokumen</span>
                            </div>
                            <div className="text-[11px] text-secondary font-sans mt-2 pt-1.5 border-t border-border">
                              Sisa Hutang: <span className="font-bold text-warning font-mono">Rp {totalPoUnpaidAmount.toLocaleString('id-ID')}</span>
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
                            <span className="text-sm text-slate-400 italic">No Purchase Data</span>
                          )}
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-[14px] font-bold text-primary">
                              {validPos.length > 0 ? ((totalPoLunasCount / validPos.length) * 100).toFixed(0) : 0}%
                            </span>
                            <span className="text-[8px] text-slate-400 font-bold uppercase">Lunas</span>

                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Modal Mutasi Kas Manual */}
                    {showManualCashModal && (
                      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                        <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-border overflow-hidden transform transition-all duration-300 scale-100 relative my-auto">
                          <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-primary text-sm uppercase tracking-wider flex items-center gap-2">
                              💵 Catat Mutasi Kas Manual Baru
                            </h3>
                            <button
                              onClick={() => setShowManualCashModal(false)}
                              className="text-slate-400 hover:text-secondary font-bold text-lg"
                            >
                              &times;
                            </button>
                          </div>
                          <form onSubmit={handleAddManualCash} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-secondary uppercase mb-1">Tanggal</label>
                                <input
                                  type="date"
                                  required
                                  value={manualCashForm.tanggal}
                                  onChange={(e) => setManualCashForm({ ...manualCashForm, tanggal: e.target.value })}
                                  className="w-full border border-border rounded-card px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-secondary uppercase mb-1">Tipe Mutasi</label>
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
                                  className="w-full border border-border rounded-card px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                                >
                                  <option value="MASUK">📈 MASUK (DEBIT)</option>
                                  <option value="KELUAR">📉 KELUAR (KREDIT)</option>
                                </select>

                              </div>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-secondary uppercase mb-1">Kategori Keuangan</label>
                              <select
                                value={manualCashForm.kategori}
                                onChange={(e) => setManualCashForm({ ...manualCashForm, kategori: e.target.value })}
                                className="w-full border border-border rounded-card px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-white"
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
                              <label className="block text-sm font-bold text-secondary uppercase mb-1">Akun Kas / Bank</label>
                              <select
                                value={manualCashForm.akun || 'Bank'}
                                onChange={(e) => setManualCashForm({ ...manualCashForm, akun: e.target.value })}
                                className="w-full border border-border rounded-card px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-white mb-3"
                              >
                                {settingCashAccounts.map(acc => (
                                  <option key={acc.nama} value={acc.nama}>{acc.nomor ? `${acc.nomor} - ${acc.nama}` : acc.nama}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-secondary uppercase mb-1">Nominal (Rupiah)</label>
                              <input
                                type="text" inputMode="numeric"
                                min="1"
                                required
                                placeholder="Rp 0"
                                value={manualCashForm.nominal || ''}
                                onChange={(e) => setManualCashForm({ ...manualCashForm, nominal: parseInt(e.target.value) || 0 })}
                                className="w-full border border-border rounded-card px-3 py-2 text-sm font-mono font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                              />

                            </div>
                            <div>
                              <label className="block text-sm font-bold text-secondary uppercase mb-1">Keterangan Mutasi</label>
                              <textarea
                                required
                                rows={2}
                                placeholder="Contoh: Bayar internet kantor bulan Juni"
                                value={manualCashForm.keterangan}
                                onChange={(e) => setManualCashForm({ ...manualCashForm, keterangan: e.target.value })}
                                className="w-full border border-border rounded-card px-3 py-2 text-sm focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                              />

                            </div>
                            <div className="pt-2 flex justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => setShowManualCashModal(false)}
                                className="px-4 py-2 border border-border text-sm font-bold text-text-secondary rounded-card hover:bg-slate-50 transition-all"
                              >
                                Batal
                              </button>
                              <button
                                type="submit"
                                disabled={isSavingCash}
                                className={`px-4 py-2 text-white text-sm font-bold rounded-card transition-all ${isSavingCash ? 'bg-primary/70 cursor-not-allowed flex items-center justify-center gap-2' : 'bg-primary hover:bg-teal-600'}`}
                              >
                                {isSavingCash ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Menyimpan...</span>
                                  </>
                                ) : (
                                  'Simpan Mutasi'
                                )}
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    )}
                  </div></div></div>
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
                    <h2 className="text-2xl font-bold text-text-primary">📈 Dashboard Statistik & Analitik Bisnis</h2>
                    <p className="text-sm text-secondary">Analisis performa pertumbuhan, kontribusi laba per pelanggan, dan perputaran SKU produk</p>

                  </div>
                  {/* Period Date Filters */}
                  <div className="bg-white border border-border p-3 rounded-card shadow-sm flex flex-wrap items-center gap-4">
                    <div className="text-sm font-bold text-primary flex items-center gap-1.5 uppercase">
                      📅 Periode:
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-slate-400">Dari</label>
                      <input
                        type="date"
                        value={analitikStartDate}
                        onChange={(e) => setAnalitikStartDate(e.target.value)}
                        className="border border-border rounded-card px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-[11px] font-bold text-slate-400">Sampai</label>
                      <input
                        type="date"
                        value={analitikEndDate}
                        onChange={(e) => setAnalitikEndDate(e.target.value)}
                        className="border border-border rounded-card px-2 py-1 text-sm focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                      />

                    </div>
                  </div>
                </div>
                {/* Sales & Purchases Trend Line Chart */}
                <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                  <div>
                    <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
                      📊 Tren Pertumbuhan & Gerak Transaksi (Penjualan SO vs Pembelian PO)
                    </h3>
                    <p className="text-[11px] text-text-secondary mt-0.5">Memantau naik turun pergerakan total nominal transaksi penjualan pelanggan vs pembelian supplier</p>
                  </div>
                  <div className="h-[280px]">
                    {trendData.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={trendData} margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                          <XAxis dataKey="tanggal" fontSize={10} tickLine={false} />
                          <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp ${(v / 1000000).toFixed(1)}Jt`} />
                          <Tooltip formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`} />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                          <Line type="monotone" dataKey="Penjualan (SO)" stroke="#0EA5A4" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                          <Line type="monotone" dataKey="Pembelian (PO)" stroke="#F59E0B" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">Tidak ada transaksi dalam periode terpilih.</div>
                    )}

                  </div>
                </div>
                {/* Profit Contribution Rankings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer Profit Rankings */}
                  <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
                        💎 Customer Penyumbang Laba Terbesar
                      </h3>
                      <p className="text-[11px] text-text-secondary mt-0.5">Penyumbang laba bersih tertinggi (Klik baris untuk memantau grafik tren di bawah)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-text-secondary font-bold border-b border-slate-100 uppercase text-xs">
                            <th className="py-3 px-4">No</th>
                            <th className="py-3 px-4">Nama Customer</th>
                            <th className="py-3 px-4 text-right">Revenue (SO)</th>
                            <th className="py-3 px-4 text-right text-success font-bold">Laba Bersih</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {topCustomers.map((cust, idx) => (
                            <tr
                              key={cust.nama}
                              onClick={() => setSelectedCustomerAnalysis(cust.nama)}
                              className={`hover:bg-slate-50 cursor-pointer transition-all ${selectedCustomerAnalysis === cust.nama ? 'bg-success/10 bg-opacity-40 font-bold' : ''}`}
                            >
                              <td className="py-3 px-4 text-slate-400 font-mono">#{idx + 1}</td>
                              <td className="py-3 px-4 text-text-primary font-sans flex items-center gap-1.5">
                                {cust.nama}
                                {selectedCustomerAnalysis === cust.nama && (
                                  <span className="text-[11px] bg-primary text-white px-1.5 py-0.2 rounded font-normal uppercase">Selected</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-secondary">Rp {cust.revenue.toLocaleString('id-ID')}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-success">Rp {cust.profit.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                          {topCustomers.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-400 italic">Belum ada transaksi penjualan terekam.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                    </div>
                  </div>
                  {/* Product Profit Rankings */}
                  <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                    <div>
                      <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
                        🏆 Barang (SKU) Penyumbang Laba Terbesar
                      </h3>
                      <p className="text-[11px] text-text-secondary mt-0.5">Barang dengan akumulasi margin laba tertinggi (Klik baris untuk memantau grafik tren di bawah)</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-text-secondary font-bold border-b border-slate-100 uppercase text-xs">
                            <th className="py-3 px-4">No</th>
                            <th className="py-3 px-4">Nama Produk</th>
                            <th className="py-3 px-4 text-right">SKU</th>
                            <th className="py-3 px-4 text-right text-primary font-bold">Laba Tercipta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {topProducts.map((prod, idx) => (
                            <tr
                              key={prod.sku}
                              onClick={() => setSelectedSkuAnalysis(prod.sku)}
                              className={`hover:bg-slate-50 cursor-pointer transition-all ${selectedSkuAnalysis === prod.sku ? 'bg-success/10 bg-opacity-40 font-bold' : ''}`}
                            >
                              <td className="py-3 px-4 text-slate-400 font-mono">#{idx + 1}</td>
                              <td className="py-3 px-4 text-text-primary font-sans flex items-center gap-1.5">
                                {prod.nama}
                                {selectedSkuAnalysis === prod.sku && (
                                  <span className="text-[11px] bg-primary text-white px-1.5 py-0.2 rounded font-normal uppercase">Selected</span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right font-mono text-secondary">{prod.sku}</td>
                              <td className="py-3 px-4 text-right font-mono font-bold text-primary">Rp {prod.profit.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                          {topProducts.length === 0 && (
                            <tr>
                              <td colSpan={4} className="py-8 text-center text-slate-400 italic">Belum ada laba terhitung dalam periode ini.</td>
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
                  <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
                          🔍 Drill-down Tren Pembelian & Laba per Customer
                        </h3>
                        <p className="text-[11px] text-text-secondary mt-0.5">Melihat fluktuasi grafik naik turun transaksi customer pilihan</p>
                      </div>
                      <div>
                        <select
                          value={selectedCustomerAnalysis}
                          onChange={(e) => setSelectedCustomerAnalysis(e.target.value)}
                          className="border border-border rounded-card px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 text-text-primary"
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
                            <YAxis fontSize={9} tickLine={false} axisLine={false} tickFormatter={(v) => `Rp ${(v / 1000).toFixed(0)}K`} />
                            <Tooltip formatter={(value: any) => `Rp ${value.toLocaleString('id-ID')}`} />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                            <Line type="monotone" dataKey="revenue" name="Total Belanja" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="profit" name="Margin Profit" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">
                          {selectedCustomerAnalysis ? 'Tidak ada riwayat belanja untuk customer ini dalam periode ini.' : 'Silakan pilih customer di atas atau klik baris tabel peringkat.'}
                        </div>
                      )}

                    </div>
                  </div>
                  {/* Product drilldown trend */}
                  <div className="bg-white border border-border rounded-card p-5 shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-text-primary uppercase tracking-wider">
                          🔍 Drill-down Tren Penjualan per Produk (SKU)
                        </h3>
                        <p className="text-[11px] text-text-secondary mt-0.5">Melihat fluktuasi grafik naik turun volume produk terjual</p>
                      </div>
                      <div>
                        <select
                          value={selectedSkuAnalysis}
                          onChange={(e) => setSelectedSkuAnalysis(e.target.value)}
                          className="border border-border rounded-card px-2 py-1 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-slate-50 text-text-primary"
                        >
                          {products.map(p => (
                            <option key={p.sku} value={p.sku}>{p.nama} [{p.sku}]</option>
                          ))}
                        </select>

                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 mb-1 text-center">
                      <div className="bg-slate-50 p-1.5 rounded-card border border-slate-100">
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Stok Sekarang</span>
                        <span className="font-extrabold text-primary text-sm">{currentProduct?.stok || 0} {currentProduct?.satuan}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-card border border-slate-100">
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Modal HPP</span>
                        <span className="font-extrabold text-primary text-[11px] font-mono">Rp {currentProduct?.hpp.toLocaleString('id-ID') || 0}</span>
                      </div>
                      <div className="bg-slate-50 p-1.5 rounded-card border border-slate-100">
                        <span className="text-[11px] text-slate-400 block uppercase font-bold">Harga Jual</span>
                        <span className="font-extrabold text-primary text-[11px] font-mono">Rp {currentProduct?.hj.toLocaleString('id-ID') || 0}</span>

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
                        <div className="h-full flex items-center justify-center text-sm text-slate-400 italic">
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
            <div className="space-y-6 print-container" id="master-produk-section">
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; color: black !important; }
                  header, footer, nav, aside, .no-print, button, input[type="checkbox"], select { display: none !important; }
                  #master-produk-section { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
                }
              `}} />
              <div className="flex flex-col gap-4 no-print">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-text-primary">Master Inventori</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowMasterConfigModal(true)}
                      className="bg-slate-100 hover:bg-slate-200 text-primary px-3 py-2.5 rounded-card flex items-center gap-2 font-bold text-sm shadow-sm transition-all border border-border cursor-pointer"
                    >
                      <Settings size={16} />
                      <span className="hidden sm:inline">Kategori &amp; Satuan</span>
                    </button>
                    <button
                      onClick={() => setShowOpnameModal(true)}
                      className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2.5 rounded-card flex items-center gap-2 font-bold text-sm shadow transition-all cursor-pointer"
                    >
                      <AlertTriangle size={16} />
                      <span className="hidden sm:inline">Stock Opname</span>
                    </button>
                    {/* ponytail: bersihkan action header atas dari tombol ekspor */}
                    <button
                      onClick={() => {
                        const initialPrefix = settingPrefixes.length > 0 ? settingPrefixes[0].prefix : 'RTL';
                        const generatedSku = generateNewSku(initialPrefix, products);
                        setProductForm({ sku: generatedSku, prefix: initialPrefix, kategori: 'Barang Jadi', subKat: 'Roti & Kue', nama: '', satuan: 'Pcs', hj: 0, hpp: 0, safety: 10, stok: 0, status: 'Aktif', supplier: '', tempatSimpan: 'Gudang Utama', masaSmp: 'Selamanya', catatan: '' });
                        setIsEditingProduct(false);
                        setShowProductModal(true);
                      }}
                      className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-card flex items-center gap-2 font-bold text-sm shadow transition-all cursor-pointer"
                    >
                      <Plus size={16} />
                      <span>Produk Baru</span>
                    </button>

                  </div>
                </div>
                <div className="relative w-full">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Cari SKU, nama, lokasi..."
                    value={searchProductQuery}
                    onChange={(e) => setSearchProductQuery(e.target.value)}
                    className="block w-full pl-9 pr-3 py-2.5 border border-border rounded-card text-sm bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm"
                  />


                </div>
              </div>
              {/* Product List Table */}
              <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden print:hidden">
                <div className="overflow-x-auto w-full">
                  <table className="w-full text-sm text-left min-w-[1100px] border-collapse">
                    <thead>
                      <tr className="bg-primary text-white border-b border-teal-600 hover:bg-primary">
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left">SKU</th>
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left">Kategori / Sub</th>
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left w-1/4">Nama Produk</th>
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-center">Satuan</th>
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-right">Harga Jual</th>
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-right">HPP</th>
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-right">Stok</th>
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left">Lokasi Simpan</th>
                        <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-center w-[120px]">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="p-0">
                            <EmptyState
                              icon={Package}
                              title="Tidak Ada Produk"
                              description="Data produk tidak ditemukan atau kosong. Silakan tambahkan produk baru."
                              actionLabel="Tambah Produk"
                              onAction={() => { setProductForm({ sku: '', prefix: 'RTL', kategori: 'Barang Jadi', subKat: '', nama: '', satuan: 'Pcs', hj: 0, hpp: 0, safety: 10, stok: 0, status: 'Aktif', supplier: '', tempatSimpan: 'Gudang Utama', masaSmp: 'Selamanya', catatan: '' }); setIsEditingProduct(false); setShowProductModal(true); }}
                              className="border-0 rounded-none shadow-none"
                            />
                          </td>
                        </tr>
                      ) : filteredProducts.map(p => (
                        <tr key={p.sku} className={`even:bg-slate-50/70 hover:bg-slate-50/80 transition-colors ${p.status === 'Nonaktif' ? 'bg-slate-100 opacity-60' : ''}`}>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => setViewingProductTx(p)}
                              className="hover:underline font-mono font-bold text-primary text-sm hover:text-primary-hover transition-all text-left whitespace-nowrap"
                              title="Klik untuk rincian transaksi"
                            >
                              {p.sku}
                            </button>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-col items-start gap-1">
                              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${p.kategori === 'Barang Jadi' ? 'bg-success/15 text-success-hover' : p.kategori === 'Bahan Baku' ? 'bg-info/15 text-info-hover' : 'bg-purple-100 text-purple-700'}`}>
                                {p.kategori}
                              </span>
                              {p.subKat && <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap">{p.subKat}</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <button
                              onClick={() => setViewingProductTx(p)}
                              className="hover:underline font-bold text-slate-800 hover:text-primary transition-all text-left font-sans text-sm line-clamp-2 leading-snug"
                              title="Klik untuk rincian transaksi"
                            >
                              {p.nama}
                            </button>
                          </td>
                          <td className="px-4 py-3.5 text-center text-slate-600 font-medium whitespace-nowrap">
                            {p.satuan}
                          </td>
                          <td className="px-4 py-3.5 font-bold text-primary text-right whitespace-nowrap tabular-nums">
                            {p.hj > 0 ? `Rp ${p.hj.toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="px-4 py-3.5 text-right font-medium text-slate-700 whitespace-nowrap tabular-nums">
                            Rp {p.hpp.toLocaleString('id-ID')}
                          </td>
                          <td className="px-4 py-3.5 text-right whitespace-nowrap">
                            <div className="flex flex-col items-end gap-1">
                              <div className="flex flex-col items-end gap-0.5">
                                <span className={`font-bold font-mono text-sm ${p.stok < p.safety ? 'text-danger' : 'text-slate-800'}`}>
                                  {p.stok}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Min: {p.safety}</span>
                              </div>
                              {getOnOrderQty(p.sku) > 0 && (
                                <span className="bg-sky-50 text-sky-700 border border-sky-200 px-1.5 py-0.5 rounded-[4px] text-[9px] font-black uppercase">
                                  Dlm Pesanan: +{getOnOrderQty(p.sku)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5 text-sm text-slate-600 whitespace-nowrap">
                              <MapPin size={14} className="text-primary/70" />
                              <span className="font-medium">{p.tempatSimpan}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={() => setViewingProductTx(p)}
                                title="Rincian Transaksi"
                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                              >
                                <Eye size={16} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => {
                                  let extPrefix = p.prefix;
                                  if (!extPrefix && p.sku) {
                                    const parts = p.sku.split('-');
                                    if (parts.length > 1) extPrefix = parts[0];
                                    else extPrefix = p.sku.substring(0, 3); // Fallback guess
                                  }
                                  setProductForm({ ...p, prefix: extPrefix, originalSku: p.sku });
                                  setIsEditingProduct(true);
                                  setShowProductModal(true);
                                }}
                                title="Edit Produk"
                                className="p-1.5 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-md transition-all"
                              >
                                <Edit3 size={16} strokeWidth={2.5} />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(p.sku)}
                                title="Hapus"
                                className="p-1.5 text-slate-400 hover:text-danger hover:bg-danger/10 rounded-md transition-all"
                              >
                                <Trash2 size={16} strokeWidth={2.5} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>




                </div>
              </div>

              {/* ponytail: tombol ekspor dipindah ke footer bawah terpisah dari header utama */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 mt-4 bg-slate-50 border-t border-slate-200 rounded-b-xl print:hidden">
                <div className="text-sm font-medium text-slate-600">
                  Ekspor Daftar Barang &amp; Status Restock (4 Kolom):
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const headers = ['SKU / Detail Produk', 'Sisa Stok Fisik', 'Limit (Safety)', 'Keterangan Status'];
                      const rows = filteredProducts.map(p => {
                        const stokTerkini = p.stok;
                        let sts = "Aman";
                        if (stokTerkini <= 0) sts = "Habis";
                        else if (stokTerkini <= (p.safety || 0)) sts = "Kritis (Butuh PO)";
                        return [
                          `${p.sku}\n${p.nama}`,
                          stokTerkini.toString(),
                          (p.safety || 0).toString(),
                          sts
                        ];
                      });
                      generateReportPDF(
                        'LAPORAN STATUS & KELAYAKAN STOK GUDANG',
                        'Daftar Barang & Status Restock',
                        new Date().toLocaleDateString('id-ID'),
                        headers,
                        rows,
                        [],
                        `Status_Stok_${new Date().toISOString().slice(0, 10)}.pdf`,
                        'portrait'
                      );
                    }}
                    className="border border-slate-300 text-slate-700 hover:bg-slate-100 px-4 py-2 rounded-card flex items-center gap-2 font-bold text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>Cetak / Simpan PDF</span>
                  </button>
                  <button
                    onClick={() => {
                      // ponytail: fix runtime error pada handler ekspor master inventori
                      if (filteredProducts.length === 0) {
                        triggerToast('Tidak ada data produk untuk diekspor', 'warning');
                        return;
                      }

                      const wsData: any[][] = [
                        ['LAPORAN STATUS & KELAYAKAN STOK GUDANG'],
                        ['Tanggal Cetak:', new Date().toLocaleDateString('id-ID')],
                        [''],
                        ['SKU / KODE BARANG', 'NAMA PRODUK & KATEGORI', 'STOK FISIK (ON-HAND)', 'STATUS STOK / AKSI']
                      ];

                      let totalAman = 0;
                      let totalRestock = 0;

                      filteredProducts.forEach(p => {
                        const isAman = p.stok >= p.safety;
                        if (isAman) totalAman++;
                        else totalRestock++;

                        wsData.push([
                          p.sku,
                          `${p.nama} (${p.kategori})`,
                          `${p.stok} ${p.satuan}`,
                          isAman ? 'AMAN' : 'PERLU RESTOCK'
                        ]);
                      });

                      wsData.push(['']);
                      wsData.push(['RINGKASAN STATUS']);
                      wsData.push(['TOTAL JENIS BARANG (SKU)', filteredProducts.length.toString()]);
                      wsData.push(['STOK AMAN', totalAman.toString()]);
                      wsData.push(['PERLU RESTOCK', totalRestock.toString()]);

                      // @ts-ignore
                      if (XLSX) {
                        // @ts-ignore
                        const ws = XLSX.utils.aoa_to_sheet(wsData);
                        ws['!cols'] = [
                          { wch: 20 },
                          { wch: 45 },
                          { wch: 25 },
                          { wch: 20 }
                        ];
                        // @ts-ignore
                        const wb = XLSX.utils.book_new();
                        // @ts-ignore
                        XLSX.utils.book_append_sheet(wb, ws, "Status Stok");
                        // @ts-ignore
                        XLSX.writeFile(wb, `Laporan_Status_Stok_${new Date().toISOString().slice(0, 10)}.xlsx`);
                        triggerToast('Laporan stok berhasil diunduh.', 'success');
                      } else {
                        triggerToast('Library Excel tidak ditemukan!', 'error');
                      }
                    }}
                    className="border border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700 px-4 py-2 rounded-card flex items-center gap-2 font-bold text-sm transition-all shadow-sm cursor-pointer"
                  >
                    <Download size={16} />
                    <span>Unduh Excel (.xlsx)</span>
                  </button>
                </div>
              </div>


              {/* ponytail: print-only table untuk cetak PDF Master Inventori 4 kolom */}
              <div className="hidden print:block w-full bg-white text-black p-8">
                <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
                  <h1 className="text-2xl font-black uppercase tracking-wider">Laporan Status & Kelayakan Stok Gudang</h1>
                  <p className="text-sm font-medium mt-1">
                    Tanggal Cetak: {new Date().toLocaleDateString('id-ID')} &bull; Dicetak oleh Sistem
                  </p>
                </div>

                <table className="w-full text-left text-sm border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-400">
                      <th className="p-3 font-bold border-r border-slate-300">SKU / KODE BARANG</th>
                      <th className="p-3 font-bold border-r border-slate-300">NAMA PRODUK & KATEGORI</th>
                      <th className="p-3 font-bold border-r border-slate-300">STOK FISIK (ON-HAND)</th>
                      <th className="p-3 font-bold text-center">STATUS STOK / AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProducts.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-4 text-center italic">Tidak ada data</td>
                      </tr>
                    ) : (
                      filteredProducts.map((p, idx) => {
                        const isAman = p.stok >= p.safety;
                        return (
                          <tr key={idx} className="border-b border-slate-200">
                            <td className="p-3 font-mono text-xs border-r border-slate-300">{p.sku}</td>
                            <td className="p-3 border-r border-slate-300">
                              <div className="font-bold">{p.nama}</div>
                              <div className="text-xs text-slate-500">{p.kategori} &bull; {p.subKat}</div>
                            </td>
                            <td className="p-3 border-r border-slate-300 font-bold">
                              {p.stok} {p.satuan}
                            </td>
                            <td className="p-3 text-center">
                              {isAman ? (
                                <span className="font-bold text-slate-700">AMAN</span>
                              ) : (
                                <span className="font-black text-red-600 underline">PERLU RESTOCK</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>

                <div className="mt-8 pt-4 border-t border-slate-300 flex justify-end">
                  <div className="w-64 space-y-2 text-sm font-medium">
                    <div className="font-bold border-b border-slate-300 pb-1 mb-2">RINGKASAN STATUS</div>
                    <div className="flex justify-between">
                      <span>TOTAL JENIS BARANG (SKU):</span>
                      <span>{filteredProducts.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>STOK AMAN:</span>
                      <span>{filteredProducts.filter(p => p.stok >= p.safety).length}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>PERLU RESTOCK:</span>
                      <span className="text-red-600">{filteredProducts.filter(p => p.stok < p.safety).length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Master Config Modal */}
              {showMasterConfigModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-card shadow-xl max-w-3xl w-full overflow-hidden flex flex-col max-h-[90vh] relative my-auto">
                    <div className="bg-slate-800 text-white py-4 px-6 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <Settings size={18} className="text-teal-400" />
                        <span>Pengaturan Master Kategori &amp; Satuan</span>
                      </h3>
                      <button onClick={() => setShowMasterConfigModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">&times;</button>

                    </div>
                    <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kategori Utama */}
                        <div className="bg-white border border-border rounded-card p-4 shadow-sm">
                          <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <h4 className="text-sm font-black text-primary uppercase">📦 Kategori Utama</h4>
                            <button
                              type="button"
                              onClick={() => setSettingCategories([...settingCategories, ''])}
                              className="text-[11px] font-extrabold text-primary hover:underline cursor-pointer"
                            >
                              + Tambah Opsi
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
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
                                  className="flex-1 p-2 border border-border rounded-card text-sm font-semibold text-primary bg-white"
                                  placeholder="Nama kategori..."
                                />
                                <button
                                  type="button"
                                  onClick={() => setSettingCategories(settingCategories.filter((_, i) => i !== idx))}
                                  className="p-2 text-danger hover:bg-danger/10 rounded-card cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}

                          </div>
                        </div>
                        {/* Prefix SKU */}
                        <div className="bg-white border border-border rounded-card p-4 shadow-sm">
                          <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <h4 className="text-sm font-black text-primary uppercase">🏷️ Prefix SKU</h4>
                            <button
                              type="button"
                              onClick={() => setSettingPrefixes([...settingPrefixes, { label: '', prefix: '' }])}
                              className="text-[11px] font-extrabold text-primary hover:underline cursor-pointer"
                            >
                              + Tambah Prefix
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {settingPrefixes.map((pfx, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={pfx.label}
                                  onChange={(e) => {
                                    const arr = [...settingPrefixes];
                                    arr[idx] = { ...pfx, label: e.target.value };
                                    setSettingPrefixes(arr);
                                  }}
                                  className="flex-1 p-2 border border-border rounded-card text-sm font-semibold text-primary bg-white"
                                  placeholder="Kategori..."
                                />
                                <input
                                  type="text"
                                  value={pfx.prefix}
                                  onChange={(e) => {
                                    const arr = [...settingPrefixes];
                                    arr[idx] = { ...pfx, prefix: e.target.value.toUpperCase() };
                                    setSettingPrefixes(arr);
                                  }}
                                  className="w-16 p-2 border border-border rounded-card text-sm font-bold font-mono text-center bg-white"
                                  placeholder="PRX"
                                />
                                <button
                                  type="button"
                                  onClick={() => setSettingPrefixes(settingPrefixes.filter((_, i) => i !== idx))}
                                  className="p-2 text-danger hover:bg-danger/10 rounded-card cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}

                          </div>
                        </div>
                        {/* Satuan Dasar */}
                        <div className="bg-white border border-border rounded-card p-4 shadow-sm">
                          <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <h4 className="text-sm font-black text-primary uppercase">📐 Satuan Dasar</h4>
                            <button
                              type="button"
                              onClick={() => setSettingUnits([...settingUnits, ''])}
                              className="text-[11px] font-extrabold text-primary hover:underline cursor-pointer"
                            >
                              + Tambah Opsi
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
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
                                  className="flex-1 p-2 border border-border rounded-card text-sm font-semibold text-primary bg-white"
                                  placeholder="Satuan..."
                                />
                                <button
                                  type="button"
                                  onClick={() => setSettingUnits(settingUnits.filter((_, i) => i !== idx))}
                                  className="p-2 text-danger hover:bg-danger/10 rounded-card cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}

                          </div>
                        </div>
                        {/* Akun Kas & Bank */}
                        <div className="bg-white border border-border rounded-card p-4 shadow-sm">
                          <div className="flex justify-between items-center border-b pb-2 mb-3">
                            <h4 className="text-sm font-black text-primary uppercase">💳 Akun Kas & Bank</h4>
                            <button
                              type="button"
                              onClick={() => setSettingCashAccounts([...settingCashAccounts, { nomor: '', nama: '', jenis: 'Kas', fungsi: 'General' }])}
                              className="text-[11px] font-extrabold text-primary hover:underline cursor-pointer"
                            >
                              + Tambah Opsi
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {settingCashAccounts.map((acc, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={acc.nomor}
                                  onChange={(e) => {
                                    const arr = [...settingCashAccounts];
                                    arr[idx] = { ...arr[idx], nomor: e.target.value };
                                    setSettingCashAccounts(arr);
                                  }}
                                  className="w-1/3 p-2 border border-border rounded-card text-sm font-semibold text-primary bg-white"
                                  placeholder="No. Akun (Opsional)"
                                />
                                <input
                                  type="text"
                                  value={acc.nama}
                                  onChange={(e) => {
                                    const arr = [...settingCashAccounts];
                                    arr[idx] = { ...arr[idx], nama: e.target.value };
                                    setSettingCashAccounts(arr);
                                  }}
                                  className="flex-1 p-2 border border-border rounded-card text-sm font-semibold text-primary bg-white"
                                  placeholder="Nama Akun Kas/Bank..."
                                />
                                <button
                                  type="button"
                                  onClick={() => setSettingCashAccounts(settingCashAccounts.filter((_, i) => i !== idx))}
                                  className="p-2 text-danger hover:bg-danger/10 rounded-card cursor-pointer"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white p-4 border-t border-border shrink-0 text-right">
                      <button
                        onClick={() => {
                          setShowMasterConfigModal(false);
                          triggerToast('Pengaturan master berhasil disimpan ke penyimpanan lokal.', 'success');
                        }}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-card text-sm font-bold shadow-sm cursor-pointer"
                      >
                        Selesai &amp; Tutup
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* STOCK OPNAME MODAL */}
              {showOpnameModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-card shadow-xl max-w-5xl w-full flex flex-col relative my-auto">
                    <div className="flex justify-between items-center p-5 border-b border-border bg-text-primary text-white rounded-t-xl">
                      <h3 className="font-bold text-lg">Stock Opname & Penyesuaian</h3>
                      <button onClick={() => setShowOpnameModal(false)} className="text-slate-400 hover:text-white transition-colors">
                        <X size={20} />
                      </button>

                    </div>
                    {/* Header: Selected Product Info */}
                    {(() => {
                      const selectedProd = products.find(p => p.sku === opnameForm.sku);
                      if (!selectedProd) return null;
                      return (
                        <div className="bg-sky-50 border-b border-sky-100 p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-sky-700 uppercase">Qty Tersedia (Stok Sistem)</span>
                            <span className="text-xl font-bold font-mono text-text-primary">{selectedProd.stok} {selectedProd.satuan}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-sky-700 uppercase">Harga per Unit (HPP)</span>
                            <span className="text-xl font-bold font-mono text-text-primary">Rp {selectedProd.hpp?.toLocaleString('id-ID')}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold text-sky-700 uppercase">Total Nilai Valuasi</span>
                            <span className="text-xl font-bold font-mono text-warning">Rp {(selectedProd.stok * (selectedProd.hpp || 0)).toLocaleString('id-ID')}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div className="p-6 overflow-y-auto max-h-[70vh]">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Form Input Opname */}
                        <div className="space-y-6">
                          <div>
                            <h3 className="text-base font-bold text-text-primary">Input Penyesuaian Stok</h3>
                            <p className="text-sm text-text-secondary">Sesuaikan selisih kuantitas fisik dengan data sistem</p>

                          </div>
                          <form onSubmit={handleStockOpnameSubmit} className="space-y-4 text-sm font-semibold">
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-text-secondary uppercase">Pilih SKU / Produk Target</label>
                              <SearchableSelect
                                value={opnameForm.sku}
                                onChange={(val) => {
                                  const target = products.find((p: any) => p.sku === val);
                                  setOpnameForm({
                                    ...opnameForm,
                                    sku: val,
                                    qtySistem: target ? target.stok : 0,
                                    qtyFisik: target ? target.stok : 0,
                                    selisih: 0
                                  });
                                }}
                                options={products.map((p: any) => ({ label: `[${p.sku}] ${p.nama} (Stok: ${p.stok})`, value: p.sku }))}
                                placeholder="-- Pilih SKU Produk --"
                              />

                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-text-secondary uppercase">Tipe Penyesuaian</label>
                              <select
                                value={opnameForm.tipe}
                                onChange={(e) => setOpnameForm({ ...opnameForm, tipe: e.target.value })}
                                className="p-2.5 border border-border rounded-card bg-white"
                              >
                                <option value="OPNAME_PLUS">OPNAME PLUS (Stok Fisik Lebih Banyak)</option>
                                <option value="OPNAME_MINUS">OPNAME MINUS (Stok Fisik Lebih Sedikit)</option>
                                <option value="WASTAGE">WASTAGE (Barang Rusak / Dibuang)</option>
                              </select>

                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="flex flex-col gap-1.5 bg-gray-50 p-3 rounded-card border border-border">
                                <span className="text-[11px] font-bold text-text-secondary uppercase">Selisih Stok</span>
                                <input
                                  type="text" inputMode="decimal"
                                  value={opnameForm.selisih}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setOpnameForm({
                                      ...opnameForm,
                                      selisih: val,
                                      qtyFisik: val === '' || val === '-' ? opnameForm.qtySistem : opnameForm.qtySistem + (parseFloat(val) || 0)
                                    });
                                  }}
                                  className="text-xl font-bold font-mono text-primary bg-transparent outline-none border-b border-primary border-opacity-50"
                                />
                              </div>
                              <div className="flex flex-col gap-1.5 bg-green-50 p-3 rounded-card border border-success border-opacity-30">
                                <span className="text-[11px] font-bold text-green-800 uppercase">Stok Aktual (Fisik)</span>
                                <input
                                  type="text" inputMode="decimal"
                                  value={opnameForm.qtyFisik}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setOpnameForm({
                                      ...opnameForm,
                                      qtyFisik: val,
                                      selisih: val === '' || val === '-' ? -opnameForm.qtySistem : (parseFloat(val) || 0) - opnameForm.qtySistem
                                    });
                                  }}
                                  className="text-xl font-bold font-mono text-primary bg-transparent outline-none border-b border-primary border-opacity-50"
                                />

                              </div>
                            </div>
                            <div className="flex flex-col gap-1.5">
                              <label className="text-[11px] font-bold text-text-secondary uppercase">Catatan / Alasan Audit</label>
                              <textarea
                                value={opnameForm.catatan}
                                onChange={(e) => setOpnameForm({ ...opnameForm, catatan: e.target.value })}
                                placeholder="Cth: Roti kempes, salah hitung..."
                                className="border p-2.5 rounded-card h-20 resize-none text-sm font-normal"
                              />
                            </div>
                            <button
                              type="submit"
                              disabled={!opnameForm.sku}
                              className={`w-full py-3 rounded-card font-bold shadow text-sm transition-all ${!opnameForm.sku ? 'bg-slate-300 text-secondary cursor-not-allowed' : 'bg-primary hover:bg-primary-hover text-white cursor-pointer'
                                }`}
                            >
                              Lanjutkan Rekonsiliasi
                            </button>

                          </form>

                        </div>
                      </div>
                      {/* Log Penyesuaian Audit Trail */}
                      <div className="lg:col-span-2 space-y-4">
                        <div>
                          <h3 className="text-base font-bold text-text-primary">Audit Trail Log Stock Opname</h3>
                          <p className="text-sm text-text-secondary">Riwayat penyesuaian inventori kronologis untuk validasi akuntan</p>
                        </div>
                        <div className="overflow-x-auto border border-border rounded-card shadow-sm">
                          <table className="w-full text-sm text-left">
                            <thead>
                              <tr className="bg-gray-100 text-secondary font-bold uppercase tracking-wider">
                                <th className="py-3 px-4">Tanggal</th>
                                <th className="py-3 px-4">SKU</th>
                                <th className="py-3 px-4 text-center">Tipe</th>
                                <th className="py-3 px-4 text-center">Selisih</th>
                                <th className="py-3 px-4">Catatan</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {opnameLog.slice(0, 10).map((log, idx) => (
                                <tr key={idx} className="hover:bg-gray-50">
                                  <td className="py-3.5 px-4 font-mono">{log.tanggal}</td>
                                  <td className="py-3.5 px-4 font-mono text-primary font-bold">{log.sku}</td>
                                  <td className="py-3.5 px-4 text-center">
                                    <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-bold ${log.tipe === 'OPNAME_PLUS' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'
                                      }`}>
                                      {log.tipe}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-center font-bold font-mono">{log.selisih} {log.satuan}</td>
                                  <td className="py-3.5 px-4 text-sm italic text-slate-400 max-w-[150px] truncate">{log.catatan}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>

                  </div></div>

              )}

              {/* STOCK OPNAME CONFIRMATION MODAL */}
              {showOpnameConfirm && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-card shadow-2xl max-w-md w-full overflow-hidden flex flex-col relative my-auto">
                    <div className="p-6 space-y-4">
                      <div className="flex items-center gap-3 text-warning">
                        <AlertTriangle size={24} />
                        <h3 className="font-bold text-lg text-text-primary">Konfirmasi Rekonsiliasi Stok</h3>

                      </div>
                      <p className="text-sm text-secondary">
                        Anda akan melakukan penyesuaian stok untuk produk <strong>{products.find(p => p.sku === opnameForm.sku)?.nama}</strong>. Periksa ringkasan di bawah ini sebelum menyimpan:
                      </p>

                      <div className="bg-slate-50 p-4 rounded-card border border-border text-sm space-y-2 font-mono">
                        <div className="flex justify-between">
                          <span className="text-secondary">Tipe:</span>
                          <span className={`font-bold ${opnameForm.tipe === 'OPNAME_PLUS' ? 'text-success' : 'text-danger'}`}>{opnameForm.tipe}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary">Stok Sistem:</span>
                          <span className="font-bold">{opnameForm.qtySistem}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-secondary">Selisih Stok:</span>
                          <span className={`font-bold ${(parseFloat(opnameForm.selisih as string) || 0) < 0 ? 'text-danger' : 'text-success'}`}>
                            {(parseFloat(opnameForm.selisih as string) || 0) > 0 ? '+' : ''}{opnameForm.selisih}
                          </span>
                        </div>
                        <div className="border-t border-border my-1 pt-1 flex justify-between">
                          <span className="text-secondary font-bold">Stok Aktual (Final):</span>
                          <span className="font-bold text-sky-700">{opnameForm.qtyFisik}</span>
                        </div>
                        <div className="flex justify-between mt-2 pt-2 border-t border-border">
                          <span className="text-secondary">Nilai Penyesuaian:</span>
                          <span className={`font-bold ${(parseFloat(opnameForm.selisih as string) || 0) < 0 ? 'text-danger' : 'text-success'}`}>
                            Rp {((parseFloat(opnameForm.selisih as string) || 0) * (products.find(p => p.sku === opnameForm.sku)?.hpp || 0)).toLocaleString('id-ID')}
                          </span>
                        </div>
                        <div className="flex flex-col mt-2 pt-2 border-t border-border">
                          <span className="text-secondary mb-1">Catatan / Alasan:</span>
                          <span className="font-bold text-primary whitespace-pre-wrap leading-relaxed">{opnameForm.catatan || '-'}</span>

                        </div>
                      </div>
                      <div className="bg-sky-50 border border-sky-100 p-3 rounded-card flex gap-2">
                        <span className="text-base">💡</span>
                        <span className="text-sm text-sky-800">Tindakan ini akan tercatat dalam Audit Trail Log secara permanen untuk keperluan pelaporan akuntansi.</span>

                      </div>
                    </div>
                    <div className="grid grid-cols-2 border-t border-border">
                      <button
                        onClick={() => setShowOpnameConfirm(false)}
                        className="p-4 text-center text-sm font-bold text-secondary hover:bg-slate-50 transition-colors cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        onClick={handleStockOpnameConfirmAction}
                        className="p-4 text-center text-sm font-bold text-white bg-primary hover:bg-primary-hover transition-colors flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Check size={16} /> Konfirmasi & Simpan
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Product Form Modal */}
              {/* Product Form Modal */}
              {showProductModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-card shadow-xl max-w-lg w-full overflow-hidden relative my-auto">
                    <div className="bg-text-primary text-white py-4 px-6 flex justify-between items-center">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <Package size={18} className="text-primary" />
                        <span>{isEditingProduct ? `Edit SKU [${productForm.sku}]` : 'Daftarkan Master Produk Baru'}</span>
                      </h3>
                      <button onClick={() => setShowProductModal(false)} className="text-white hover:text-slate-400">&times;</button>
                    </div>
                    <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        {(() => {
                          const hasTransactions = isEditingProduct && productForm.originalSku ? checkProductHasTransactions(productForm.originalSku) : false;
                          const currentPrefix = productForm.prefix || (settingPrefixes.length > 0 ? settingPrefixes[0].prefix : 'RTL');
                          let currentNum = productForm.sku || '';
                          if (currentNum.startsWith(currentPrefix + '-')) currentNum = currentNum.substring(currentPrefix.length + 1);
                          else if (currentNum.startsWith(currentPrefix)) currentNum = currentNum.substring(currentPrefix.length);

                          return (
                            <>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-secondary uppercase flex justify-between">
                                  <span>Prefix SKU</span>
                                  {hasTransactions && <span className="text-[11px] text-danger font-bold">*Terkunci (Ada Transaksi)</span>}
                                </label>
                                <select
                                  value={currentPrefix}
                                  disabled={hasTransactions}
                                  onChange={(e) => {
                                    const newPrefix = e.target.value;
                                    setProductForm({ ...productForm, prefix: newPrefix, sku: `${newPrefix}-${currentNum}` });
                                  }}
                                  className={`border border-border p-2.5 rounded-card text-sm ${hasTransactions ? 'bg-gray-100 cursor-not-allowed text-secondary' : 'bg-white'}`}
                                >
                                  {settingPrefixes.map((pfx: any, idx: number) => (
                                    <option key={idx} value={pfx.prefix}>{pfx.prefix} ({pfx.label})</option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex flex-col gap-1.5">
                                <label className="text-sm font-bold text-secondary uppercase flex justify-between">
                                  <span>Nomor SKU</span>
                                </label>
                                <div className="flex relative items-center">
                                  <span className="absolute left-3 text-slate-400 font-mono text-sm font-bold">{currentPrefix}-</span>
                                  <input
                                    type="text"
                                    value={currentNum}
                                    onChange={(e) => setProductForm({ ...productForm, sku: `${currentPrefix}-${e.target.value.toUpperCase()}` })}
                                    disabled={hasTransactions}
                                    className={`w-full pl-14 border border-border p-2.5 rounded-card text-sm font-mono font-bold ${hasTransactions ? 'text-secondary bg-gray-100 cursor-not-allowed' : 'text-primary bg-white'}`}
                                    placeholder="0001"
                                  />
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-secondary uppercase">Kategori Utama</label>
                          <SearchableSelect
                            value={productForm.kategori}
                            onChange={(newCat) => {
                              if (!isEditingProduct) {
                                const currentPrefix = productForm.prefix || 'RTL';
                                const recommendedSku = generateNewSku(currentPrefix, products);
                                setProductForm({ ...productForm, kategori: newCat, sku: recommendedSku });
                              } else {
                                setProductForm({ ...productForm, kategori: newCat });
                              }
                            }}
                            options={[
                              { label: 'Barang Jadi', value: 'Barang Jadi' },
                              { label: 'Bahan Baku', value: 'Bahan Baku' },
                              { label: 'Kemasan', value: 'Kemasan' },
                              ...settingCategories.filter(cat => !['Barang Jadi', 'Bahan Baku', 'Kemasan'].includes(cat)).map(cat => ({ label: cat, value: cat }))
                            ]}
                            allowCustom={true}
                            placeholder="Pilih/Ketik Kategori"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-secondary uppercase">Sub-Kategori</label>
                          <SearchableSelect
                            value={productForm.subKat}
                            onChange={(val) => setProductForm({ ...productForm, subKat: val })}
                            options={Array.from(new Set(products.map((p: any) => p.subKat).filter(Boolean))).map((s: any) => ({ label: s, value: s }))}
                            allowCustom={true}
                            placeholder="Contoh: Roti Manis"
                          />

                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-bold text-secondary uppercase">Nama Lengkap Produk</label>
                        <input
                          type="text"
                          value={productForm.nama}
                          onChange={(e) => setProductForm({ ...productForm, nama: e.target.value })}
                          placeholder="Cth: Croissant Mentega Klasik"
                          className="border border-border p-2.5 rounded-card text-sm"
                        />

                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-secondary uppercase">Satuan</label>
                          <SearchableSelect
                            value={productForm.satuan}
                            onChange={(val) => setProductForm({ ...productForm, satuan: val })}
                            options={settingUnits.map((u: string) => ({ label: u, value: u }))}
                            allowCustom={true}
                            placeholder="Pilih/Ketik Satuan"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-secondary uppercase">Harga Jual (Rp)</label>
                          <input
                            type="number" min="0"
                            value={productForm.hj}
                            onChange={(e) => setProductForm({ ...productForm, hj: parseInt(e.target.value) || 0 })}
                            className="border border-border p-2.5 rounded-card text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-secondary uppercase">HPP Awal (Rp)</label>
                          <input
                            type="number" min="0"
                            value={productForm.hpp}
                            onChange={(e) => setProductForm({ ...productForm, hpp: parseInt(e.target.value) || 0 })}
                            className="border border-border p-2.5 rounded-card text-sm"
                          />

                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-secondary uppercase">Batas Safety Stock</label>
                          <input
                            type="text" inputMode="numeric"
                            value={formatRibuan(productForm.safety)}
                            onChange={(e) => setProductForm({ ...productForm, safety: parseRibuan(e.target.value) || 10 })}
                            className="border border-border p-2.5 rounded-card text-sm"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm font-bold text-secondary uppercase">Tempat Penyimpanan</label>
                          <SearchableSelect
                            value={productForm.tempatSimpan}
                            onChange={(val) => setProductForm({ ...productForm, tempatSimpan: val })}
                            options={Array.from(new Set(products.map((p: any) => p.tempatSimpan).filter(Boolean))).map((s: any) => ({ label: s, value: s }))}
                            allowCustom={true}
                            placeholder="Cth: Rak A, Gudang B"
                          />

                        </div>
                      </div>
                      {!isEditingProduct && (
                        <div className="flex flex-col gap-1.5 bg-green-50 border border-success p-4 rounded-card">
                          <span className="text-sm font-bold text-green-800 uppercase">Qty Saldo Awal (Opsional)</span>
                          <div className="grid grid-cols-2 gap-3 mt-1">
                            <input
                              type="number" min="0"
                              value={productForm.stok}
                              onChange={(e) => setProductForm({ ...productForm, stok: parseInt(e.target.value) || 0 })}
                              placeholder="Kuantitas Awal"
                              className="border border-green-200 p-2.5 rounded-card text-sm bg-white"
                            />
                            <p className="text-[11px] text-green-800 leading-relaxed">
                              *Jika diisi, sistem otomatis menyuntik mutasi MASUK sebagai saldo awal di log gudang.
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-end gap-3 pt-4 border-t border-border">
                        <button
                          type="button"
                          onClick={() => setShowProductModal(false)}
                          className="px-4 py-2.5 text-sm font-semibold border border-border hover:bg-gray-100 rounded-card"
                        >
                          Batal
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingProduct}
                          className={`px-5 py-2.5 text-sm font-semibold text-white rounded-card shadow ${isSavingProduct ? 'bg-primary/70 cursor-not-allowed flex items-center justify-center gap-2' : 'bg-primary hover:bg-primary-hover'}`}
                        >
                          {isSavingProduct ? (
                            <>
                              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              <span>Menyimpan...</span>
                            </>
                          ) : (
                            isEditingProduct ? 'Simpan Perubahan' : 'Daftarkan Master'
                          )}
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
              {/* PO Platform Config Modal */}
              {showPoPlatformModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-card shadow-xl max-w-md w-full overflow-hidden flex flex-col relative my-auto">
                    <div className="bg-slate-800 text-white py-4 px-6 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-base flex items-center gap-2">
                        <span>Pengaturan Platform Pembelian</span>
                      </h3>
                      <button onClick={() => setShowPoPlatformModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">&times;</button>
                    </div>
                    <div className="p-6 overflow-y-auto space-y-4 max-h-[60vh]">
                      <div className="flex justify-between items-center border-b pb-2 mb-3">
                        <h4 className="text-sm font-black text-primary uppercase">Daftar Platform / Saluran</h4>
                        <button
                          type="button"
                          onClick={() => setSettingPlatforms([...settingPlatforms, ''])}
                          className="text-[11px] font-extrabold text-primary hover:underline cursor-pointer"
                        >
                          + Tambah Baru
                        </button>
                      </div>
                      <div className="space-y-2">
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
                              className="flex-1 p-2 border border-border rounded-card text-sm bg-white"
                              placeholder="Nama platform..."
                            />
                            <button
                              type="button"
                              onClick={() => setSettingPlatforms(settingPlatforms.filter((_, i) => i !== idx))}
                              className="p-2 text-danger hover:bg-danger/10 rounded-card cursor-pointer"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 border-t border-border text-right">
                      <button
                        onClick={() => setShowPoPlatformModal(false)}
                        className="bg-primary hover:bg-primary-hover text-white px-6 py-2.5 rounded-card text-sm font-bold shadow-sm cursor-pointer"
                      >
                        Selesai
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {!showPoForm ? (
                <div className="space-y-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-bold text-text-primary">Purchase Order Tracker</h2>
                        <p className="text-sm text-secondary">Monitor pemesanan barang dari supplier, logistik gudang, dan status tagihan</p>
                      </div>
                      <button
                        onClick={() => {
                          setPoForm({
                            id: '', supplier: '', tanggal: new Date().toISOString().split('T')[0],
                            metode: 'Kredit 30 Hari', items: [{ sku: '', nama: '', satuan: 'Pcs', qty: 1, harga: 0, subtotal: 0 }],
                            pajak: false, catatan: '', platform: 'Toko Langsung'
                          });
                          setIsEditingPo(false);
                          setShowPoForm(true);
                        }}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-card flex items-center gap-2 font-bold text-sm shadow transition-all"
                      >
                        <Plus size={16} />
                        <span>Buat Purchase Order Baru</span>
                      </button>

                    </div>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Cari No. PO, tanggal, supplier, metode bayar, status..."
                        value={searchPoQuery}
                        onChange={(e) => setSearchPoQuery(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2.5 border border-border rounded-card text-sm bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm"
                      />

                    </div>
                  </div>
                  {/* Informative Tip Banner */}
                  <div className="bg-sky-50 border border-sky-200 text-sky-800 p-3.5 rounded-card text-sm flex items-center gap-2.5 shadow-sm">
                    <span className="text-base">💡</span>
                    <span><strong>Tips Operasional:</strong> Klik pada baris transaksi manapun untuk membuka panel <strong>Detail Transaksi</strong>. Dari sana Anda bisa mengelola penerimaan barang logistik, melunasi pembayaran, mencatat retur produk ke supplier, serta melakukan pembatalan (void).</span>

                  </div>
                  {/* PO List Table */}
                  <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-sm text-left min-w-[1200px] border-collapse">
                        <thead>
                          <tr className="bg-primary text-white border-b border-teal-600 hover:bg-primary">
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left min-w-[160px]">No. PO</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left min-w-[130px]">Tanggal PO</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left min-w-[200px]">Supplier</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left">Tipe Tagihan</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-right">Total Tagihan</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-center">Status Logistik</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-center">Status Keuangan</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-center w-[120px]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPOs.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-0">
                                <EmptyState
                                  icon={ShoppingCart}
                                  title="Tidak Ada Purchase Order"
                                  description="Data PO tidak ditemukan atau kosong. Buat PO baru untuk memulai pembelian."
                                  actionLabel="Buat PO Baru"
                                  onAction={() => { setPoForm({ id: '', supplier: '', tanggal: new Date().toISOString().split('T')[0], metode: 'Kredit 30 Hari', items: [{ sku: '', nama: '', satuan: 'Pcs', qty: 1, harga: 0, subtotal: 0 }], pajak: false, catatan: '', platform: 'Toko Langsung' }); setIsEditingPo(false); setShowPoForm(true); }}
                                  className="border-0 rounded-none shadow-none"
                                />
                              </td>
                            </tr>
                          ) : filteredPOs.map(po => (
                            <tr key={po.id} onClick={() => { setSelectedPo(po); setPoActionForm(null); }} className="even:bg-slate-50/70 hover:bg-slate-50/80 cursor-pointer transition-colors">
                              <td className="px-4 py-3.5 font-mono font-bold whitespace-nowrap text-primary">{po.id}</td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">{po.tanggal}</td>
                              <td className="px-4 py-3.5 font-semibold text-slate-800 line-clamp-1">{po.supplier}</td>
                              <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{po.metode}</td>
                              <td className="px-4 py-3.5 font-bold text-right tabular-nums whitespace-nowrap">Rp {po.grandTotal.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                {po.hasReturn ? (
                                  <span className="px-2 py-1 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    {po.statusLogistik === 'Retur Penuh' || po.statusLogistik === 'Retur Sebagian' ? po.statusLogistik.toUpperCase() : `${po.statusLogistik.toUpperCase()} (RETUR)`}
                                  </span>
                                ) : (
                                  <Badge variant={po.statusLogistik === 'Diterima' ? 'success' : po.statusLogistik === 'Menunggu' ? 'warning' : 'neutral'}>
                                    {po.statusLogistik}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                {po.hasReturn ? (
                                  <span className="px-2 py-1 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    {po.statusBayar === 'Lunas' ? 'LUNAS (KOREKSI RETUR)' : 'BELUM DIBAYAR (DIPOTONG RETUR)'}
                                  </span>
                                ) : (
                                  <Badge variant={po.statusBayar === 'Lunas' ? 'success' : po.statusBayar === 'Belum Dibayar' ? 'error' : 'neutral'}>
                                    {po.statusBayar}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                <div className="flex justify-center items-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleVoidPO(po.id); }}
                                    className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-md transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="bg-white border border-border rounded-card shadow-sm p-6 space-y-6">
                  <div className="border-b border-border pb-4 flex justify-between items-center">
                    <h3 className="font-bold text-text-primary text-lg">Buat Purchase Order Baru (Batch Mode)</h3>
                    <button onClick={() => setShowPoForm(false)} className="text-slate-400 hover:text-secondary text-xl font-bold">&times;</button>

                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 bg-gray-50 p-4 rounded-card">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Supplier (Kepada)</label>
                      <SearchableSelect
                        value={poForm.supplier}
                        onChange={(val) => setPoForm({ ...poForm, supplier: val })}
                        options={suppliers.map((s: any) => ({ label: s.nama, value: s.nama }))}
                        allowCustom={true}
                        placeholder="Ketik/Pilih Supplier"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-bold text-text-secondary uppercase">Platform</label>
                        <button type="button" onClick={() => setShowPoPlatformModal(true)} className="text-[11px] text-primary hover:underline font-bold cursor-pointer">+ Tambah / Atur Platform</button>
                      </div>
                      <select
                        value={poForm.platform}
                        onChange={(e) => setPoForm({ ...poForm, platform: e.target.value })}
                        className="p-2 border border-border rounded-card bg-white text-sm"
                      >
                        {settingPlatforms.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Tanggal PO</label>
                      <input
                        type="date"
                        value={poForm.tanggal}
                        onChange={(e) => setPoForm({ ...poForm, tanggal: e.target.value })}
                        className="p-2 border border-border rounded-card text-sm bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Termin / Metode</label>
                      <select
                        value={poForm.metode}
                        onChange={(e) => setPoForm({ ...poForm, metode: e.target.value })}
                        className="p-2 border border-border rounded-card bg-white text-sm"
                      >
                        <option value="Tunai">Tunai Lunas</option>
                        <option value="Kredit 14 Hari">Kredit 14 Hari</option>
                        <option value="Kredit 30 Hari">Kredit 30 Hari</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Pajak (PPN 12%)</label>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={poForm.pajak}
                          onChange={(e) => setPoForm({ ...poForm, pajak: e.target.checked })}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-semibold text-secondary">Aktifkan PPN 12%</span>
                      </label>

                    </div>
                  </div>
                  {/* PO Items Table */}
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-100 text-secondary text-sm font-semibold uppercase">
                        <th className="py-3 px-4 w-[45%]">Pilih Barang [SKU]</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-right">Harga Unit (HPP)</th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {poForm.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-border">
                          <td className="py-3 px-4">
                            <SearchableSelect
                              value={item.sku}
                              onChange={(val) => handlePoItemChange(idx, val, item.qty, item.harga)}
                              options={products.map((p: any) => ({ label: `[${p.sku}] ${p.nama}`, value: p.sku }))}
                              placeholder="-- Pilih Barang --"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number" min="0"
                              value={item.qty}
                              onChange={(e) => handlePoItemChange(idx, item.sku, parseInt(e.target.value) || 0, item.harga)}
                              className="w-16 p-2 border border-border rounded text-center font-mono"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number" min="0"
                              value={item.harga}
                              onChange={(e) => handlePoItemChange(idx, item.sku, item.qty, parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-border rounded text-right font-mono"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRemovePoItem(idx)}
                              className="text-danger hover:text-danger"
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
                    className="w-full py-2 border border-dashed border-primary text-primary hover:bg-green-50 rounded-card font-bold text-sm"
                  >
                    + Tambah Baris Baru
                  </button>

                  <div className="flex justify-between items-start border-t border-border pt-6">
                    <div className="w-1/2 flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-secondary uppercase">Memo / Catatan PO</label>
                      <textarea
                        value={poForm.catatan}
                        onChange={(e) => setPoForm({ ...poForm, catatan: e.target.value })}
                        placeholder="Memo logs..."
                        className="border border-border p-2.5 rounded-card text-sm h-16 resize-none"
                      />
                    </div>
                    <div className="w-80 bg-gray-50 p-4 rounded-card space-y-2 text-sm font-semibold">
                      <div className="flex justify-between text-text-secondary">
                        <span>Subtotal</span>
                        <span>Rp {poForm.items.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString('id-ID')}</span>
                      </div>
                      {poForm.pajak && (
                        <div className="flex justify-between text-text-secondary">
                          <span>PPN (12%)</span>
                          <span>Rp {Math.round(poForm.items.reduce((sum, item) => sum + item.subtotal, 0) * 0.12).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-text-primary border-t border-border pt-2">
                        <span>TOTAL AKHIR</span>
                        <span className="text-primary">
                          Rp {(
                            poForm.items.reduce((sum, item) => sum + item.subtotal, 0) +
                            (poForm.pajak ? Math.round(poForm.items.reduce((sum, item) => sum + item.subtotal, 0) * 0.12) : 0)
                          ).toLocaleString('id-ID')}
                        </span>

                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 border-t border-border pt-4">
                    <button onClick={() => setShowPoForm(false)} className="px-4 py-2.5 text-sm font-semibold border border-border hover:bg-gray-100 rounded-card">Batal</button>
                    <button
                      onClick={() => handleSavePO(true)}
                      disabled={isSavingPO}
                      className={`px-4 py-2.5 text-sm font-semibold rounded-card ${isSavingPO ? 'bg-text-primary/70 text-slate-300 cursor-not-allowed flex items-center justify-center gap-2' : 'bg-text-primary text-slate-300 hover:bg-text-primary-hover'}`}
                    >
                      {isSavingPO ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-300/30 border-t-slate-300 rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        'Simpan Draft'
                      )}
                    </button>
                    <button
                      onClick={() => handleSavePO(false)}
                      disabled={isSavingPO}
                      className={`px-5 py-2.5 text-sm font-semibold text-white rounded-card ${isSavingPO ? 'bg-primary/70 cursor-not-allowed flex items-center justify-center gap-2' : 'bg-primary hover:bg-primary-hover'}`}
                    >
                      {isSavingPO ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        'Rilis & Kirim PO'
                      )}
                    </button>
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
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-2xl font-bold text-text-primary">Sales Order Tracker</h2>
                        <p className="text-sm text-secondary">Monitor pemesanan barang dari customer B2B, logistik gudang, dan piutang</p>
                      </div>
                      <button
                        onClick={() => {
                          setSoForm({
                            id: '', pelanggan: '', tanggal: new Date().toISOString().split('T')[0],
                            metode: 'Tempo 30 Hari', items: [{ sku: '', nama: '', satuan: 'Pcs', qty: 1, harga: 0, subtotal: 0 }],
                            pajak: false, catatan: '', platform: 'Toko Langsung'
                          });
                          setIsEditingSo(false);
                          setShowSoForm(true);
                        }}
                        className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-card flex items-center gap-2 font-bold text-sm shadow transition-all"
                      >
                        <Plus size={16} />
                        <span>Buat Sales Order Baru</span>
                      </button>

                    </div>
                    <div className="relative w-full">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        placeholder="Cari No. SO, tanggal, customer, metode bayar, status..."
                        value={searchSoQuery}
                        onChange={(e) => setSearchSoQuery(e.target.value)}
                        className="block w-full pl-9 pr-3 py-2.5 border border-border rounded-card text-sm bg-white focus:ring-1 focus:ring-primary focus:border-primary outline-none shadow-sm"
                      />

                    </div>
                  </div>
                  {/* Informative Tip Banner */}
                  <div className="bg-sky-50 border border-sky-200 text-sky-800 p-3.5 rounded-card text-sm flex items-center gap-2.5 shadow-sm">
                    <span className="text-base">💡</span>
                    <span><strong>Tips Operasional:</strong> Klik pada baris transaksi manapun untuk membuka panel <strong>Detail Transaksi</strong>. Dari sana Anda bisa mengelola pengiriman barang, melunasi pembayaran, mencatat retur barang dari customer, serta melakukan pembatalan (void).</span>

                  </div>
                  {/* SO List Table */}
                  <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden">
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-sm text-left min-w-[1200px] border-collapse">
                        <thead>
                          <tr className="bg-primary text-white border-b border-teal-600 hover:bg-primary">
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left min-w-[160px]">No. SO</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left min-w-[130px]">Tanggal SO</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left min-w-[200px]">Customer</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-left">Metode Bayar</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-right">Total Tagihan</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-center">Status Logistik</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-center">Status Keuangan</th>
                            <th className="px-4 py-3.5 font-semibold text-white whitespace-nowrap text-center w-[120px]">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredSOs.length === 0 ? (
                            <tr>
                              <td colSpan={8} className="p-0">
                                <EmptyState
                                  icon={FileText}
                                  title="Tidak Ada Sales Order"
                                  description="Data SO tidak ditemukan atau kosong. Buat SO baru untuk mencatat penjualan."
                                  actionLabel="Buat SO Baru"
                                  onAction={() => { setSoForm({ id: '', pelanggan: '', tanggal: new Date().toISOString().split('T')[0], metode: 'Tempo 30 Hari', items: [{ sku: '', nama: '', satuan: 'Pcs', qty: 1, harga: 0, subtotal: 0 }], pajak: false, catatan: '', platform: 'Toko Langsung' }); setIsEditingSo(false); setShowSoForm(true); }}
                                  className="border-0 rounded-none shadow-none"
                                />
                              </td>
                            </tr>
                          ) : filteredSOs.map(so => (
                            <tr key={so.id} onClick={() => { setSelectedSo(so); setSoActionForm(null); }} className="even:bg-slate-50/70 hover:bg-slate-50/80 cursor-pointer transition-colors">
                              <td className="px-4 py-3.5 font-mono font-bold whitespace-nowrap text-primary">
                                {so.id}
                                {so.id.startsWith('POS-') && (
                                  <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wider">POS</span>
                                )}
                              </td>
                              <td className="px-4 py-3.5 whitespace-nowrap text-slate-700">{so.tanggal}</td>
                              <td className="px-4 py-3.5 font-semibold text-slate-800 line-clamp-1">{so.pelanggan}</td>
                              <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap">{so.metode}</td>
                              <td className="px-4 py-3.5 font-bold text-right tabular-nums whitespace-nowrap">Rp {so.grandTotal.toLocaleString('id-ID')}</td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                {so.hasReturn ? (
                                  <span className="px-2 py-1 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    {so.statusLogistik === 'Retur Penuh' || so.statusLogistik === 'Retur Sebagian' ? so.statusLogistik.toUpperCase() : `${so.statusLogistik.toUpperCase()} (RETUR)`}
                                  </span>
                                ) : (
                                  <Badge variant={so.statusLogistik === 'Terkirim' || so.statusLogistik === 'Selesai' ? 'success' : so.statusLogistik === 'Void' ? 'neutral' : 'warning'}>
                                    {so.statusLogistik}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                {so.hasReturn ? (
                                  <span className="px-2 py-1 rounded text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                    {so.statusBayar === 'Lunas' ? 'LUNAS (KOREKSI RETUR)' : 'BELUM LUNAS (DIPOTONG RETUR)'}
                                  </span>
                                ) : (
                                  <Badge variant={so.statusBayar === 'Lunas' ? 'success' : so.statusBayar === 'Belum Lunas' ? 'error' : 'neutral'}>
                                    {so.statusBayar}
                                  </Badge>
                                )}
                              </td>
                              <td className="px-4 py-3.5 text-center whitespace-nowrap">
                                <div className="flex justify-center items-center gap-2">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleVoidSO(so.id); }}
                                    className="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-danger/10 text-danger hover:bg-danger hover:text-white rounded-md transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                <div className="bg-white border border-border rounded-card shadow-sm p-6 space-y-6">
                  <div className="border-b border-border pb-4 flex justify-between items-center">
                    <h3 className="font-bold text-text-primary text-lg">Buat Sales Order Baru (Batch Mode)</h3>
                    <button onClick={() => setShowSoForm(false)} className="text-slate-400 hover:text-secondary text-xl font-bold">&times;</button>

                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-4 rounded-card">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Pelanggan (Customer)</label>
                      <SearchableSelect
                        value={soForm.pelanggan}
                        onChange={(val) => setSoForm({ ...soForm, pelanggan: val })}
                        options={customers.map((c: any) => ({ label: c.nama, value: c.nama }))}
                        allowCustom={true}
                        placeholder="Ketik/Pilih Pelanggan"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Tanggal SO</label>
                      <input
                        type="date"
                        value={soForm.tanggal}
                        onChange={(e) => setSoForm({ ...soForm, tanggal: e.target.value })}
                        className="p-2 border border-border rounded-card text-sm bg-white"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Termin / Metode</label>
                      <select
                        value={soForm.metode}
                        onChange={(e) => setSoForm({ ...soForm, metode: e.target.value })}
                        className="p-2 border border-border rounded-card bg-white text-sm"
                      >
                        <option value="Tunai">Tunai Lunas</option>
                        <option value="Tempo 14 Hari">Tempo 14 Hari</option>
                        <option value="Tempo 30 Hari">Tempo 30 Hari</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-text-secondary uppercase">Pajak (PPN 12%)</label>
                      <label className="flex items-center gap-2 mt-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={soForm.pajak}
                          onChange={(e) => setSoForm({ ...soForm, pajak: e.target.checked })}
                          className="w-4 h-4 accent-primary"
                        />
                        <span className="text-sm font-semibold text-secondary">Aktifkan PPN 12%</span>
                      </label>

                    </div>
                  </div>
                  {/* SO Items Table */}
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="bg-gray-100 text-secondary text-sm font-semibold uppercase">
                        <th className="py-3 px-4 w-[45%]">Pilih Roti / Barang Jadi [SKU]</th>
                        <th className="py-3 px-4 text-center">Qty</th>
                        <th className="py-3 px-4 text-right">Harga Jual</th>
                        <th className="py-3 px-4 text-right">Subtotal</th>
                        <th className="py-3 px-4 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {soForm.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-border">
                          <td className="py-3 px-4">
                            <SearchableSelect
                              value={item.sku}
                              onChange={(val) => handleSoItemChange(idx, 'sku', val)}
                              options={products.filter((p: any) => p.kategori === 'Barang Jadi').map((p: any) => ({ label: `[${p.sku}] ${p.nama} (Stok: ${p.stok})`, value: p.sku }))}
                              placeholder="-- Pilih Barang Jadi --"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number" min="0"
                              value={item.qty}
                              onChange={(e) => handleSoItemChange(idx, 'qty', parseInt(e.target.value) || 0)}
                              className="w-16 p-2 border border-border rounded text-center font-mono"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number" min="0"
                              value={item.harga}
                              onChange={(e) => handleSoItemChange(idx, 'harga', parseInt(e.target.value) || 0)}
                              className="w-full p-2 border border-border rounded text-right font-mono"
                            />
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold">
                            Rp {item.subtotal.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleRemoveSoItem(idx)}
                              className="text-danger hover:text-danger"
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
                    className="w-full py-2 border border-dashed border-primary text-primary hover:bg-green-50 rounded-card font-bold text-sm"
                  >
                    + Tambah Baris Baru
                  </button>

                  <div className="flex justify-between items-start border-t border-border pt-6">
                    <div className="w-1/2 flex flex-col gap-1.5">
                      <label className="text-sm font-bold text-secondary uppercase">Catatan Pengiriman / Memo</label>
                      <textarea
                        value={soForm.catatan}
                        onChange={(e) => setSoForm({ ...soForm, catatan: e.target.value })}
                        placeholder="Memo logs..."
                        className="border border-border p-2.5 rounded-card text-sm h-16 resize-none"
                      />
                    </div>
                    <div className="w-80 bg-gray-50 p-4 rounded-card space-y-2 text-sm font-semibold">
                      <div className="flex justify-between text-text-secondary">
                        <span>Subtotal</span>
                        <span>Rp {soForm.items.reduce((sum, item) => sum + item.subtotal, 0).toLocaleString('id-ID')}</span>
                      </div>
                      {soForm.pajak && (
                        <div className="flex justify-between text-text-secondary">
                          <span>PPN (12%)</span>
                          <span>Rp {Math.round(soForm.items.reduce((sum, item) => sum + item.subtotal, 0) * 0.12).toLocaleString('id-ID')}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-bold text-text-primary border-t border-border pt-2">
                        <span>TOTAL AKHIR</span>
                        <span className="text-primary">
                          Rp {(
                            soForm.items.reduce((sum, item) => sum + item.subtotal, 0) +
                            (soForm.pajak ? Math.round(soForm.items.reduce((sum, item) => sum + item.subtotal, 0) * 0.12) : 0)
                          ).toLocaleString('id-ID')}
                        </span>

                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 border-t border-border pt-4">
                    <button onClick={() => setShowSoForm(false)} className="px-4 py-2.5 text-sm font-semibold border border-border hover:bg-gray-100 rounded-card">Batal</button>
                    <button
                      onClick={() => handleSaveSalesOrder(true)}
                      disabled={isSavingSO}
                      className={`px-4 py-2.5 text-sm font-semibold rounded-card ${isSavingSO ? 'bg-text-primary/70 text-slate-300 cursor-not-allowed flex items-center justify-center gap-2' : 'bg-text-primary text-slate-300 hover:bg-text-primary-hover'}`}
                    >
                      {isSavingSO ? (
                        <>
                          <div className="w-4 h-4 border-2 border-slate-300/30 border-t-slate-300 rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        'Simpan Draft'
                      )}
                    </button>
                    <button
                      onClick={() => handleSaveSalesOrder(false)}
                      disabled={isSavingSO}
                      className={`px-5 py-2.5 text-sm font-semibold text-white rounded-card ${isSavingSO ? 'bg-primary/70 cursor-not-allowed flex items-center justify-center gap-2' : 'bg-primary hover:bg-primary-hover'}`}
                    >
                      {isSavingSO ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        'Rilis & Kirim SO'
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ponytail: pertahankan fitur ekspor 2 level pada modul Kartu Pelanggan & Supplier */}
          {/* TAB: CUSTOMER */}
          {/* TAB: BUKU BESAR KAS */}
          {activeTab === 'buku_besar_kas' && (
            <CashLedgerTab
              selectedCashAccount={selectedCashAccount}
              bukuBesarActiveAkun={bukuBesarActiveAkun}
              settingCashAccounts={settingCashAccounts}
              cashLedger={cashLedger}
              cashLedgerView={cashLedgerView}
              setNewCashAccountForm={setNewCashAccountForm}
              setIsAddCashAccountOpen={setIsAddCashAccountOpen}
              setSelectedCashAccount={setSelectedCashAccount}
              setCashLedgerView={setCashLedgerView}
              setEditingAccountName={setEditingAccountName}
              setSettingCashAccounts={setSettingCashAccounts}
              handleDeleteManualCash={handleDeleteManualCash}
            />
          )}
          {activeTab === 'pelanggan' && (
            <div className="space-y-4 relative pb-20 print-container" id="rekap-pelanggan-section">
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; color: black !important; }
                  header, footer, nav, aside, .no-print, button, input[type="checkbox"], select { display: none !important; }
                  #rekap-pelanggan-section { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
                }
              `}} />
              <div className="flex justify-between items-center no-print">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Database Pelanggan (Customer B2B)</h2>
                  <p className="text-sm text-text-secondary">Kelola alamat kirim, data kontak, dan monitoring saldo piutang aktif</p>
                </div>
                <button
                  onClick={() => {
                    setCustomerForm({ id: '', nama: '', kontak: '', email: '', telp: '', alamat: '', piutang: 0 });
                    setIsEditingCustomer(false);
                    setShowCustomerModal(true);
                  }}
                  className="bg-primary text-white px-3 py-2 text-sm font-bold rounded-card flex items-center gap-1.5 shadow"
                >
                  <Plus size={14} />
                  <span>Daftar Pelanggan Baru</span>
                </button>
              </div>
              <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden print:hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-primary text-white text-sm font-black uppercase tracking-wider">
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
                  <tbody className="divide-y divide-border">
                    {customers.map(c => (
                      <tr key={c.id} className="hover:bg-gray-50 text-sm">
                        <td className="py-3 px-4 font-mono font-bold">
                          <button
                            onClick={() => setViewingCustomerTx(c)}
                            className="hover:underline font-mono font-bold text-primary hover:text-primary-hover transition-all text-left"
                            title="Klik untuk rincian transaksi"
                          >
                            {c.id}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-bold text-text-primary">
                          <button
                            onClick={() => setViewingCustomerTx(c)}
                            className="hover:underline font-bold text-text-primary hover:text-primary transition-all text-left"
                            title="Klik untuk rincian transaksi"
                          >
                            {c.nama}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-medium">{c.kontak}</td>
                        <td>{c.email}</td>
                        <td>{c.telp}</td>
                        <td className="py-3 px-4 max-w-[200px] truncate">{c.alamat}</td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-primary">Rp {c.piutang.toLocaleString('id-ID')}</td>
                        <td className="text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => setViewingCustomerTx(c)}
                              title="Rincian Transaksi"
                              className="text-secondary hover:text-primary p-1"
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
                              className="text-secondary hover:text-primary p-1"
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

              {/* ponytail: ekspor global daftar relasi & saldo hutang/piutang di footer bawah tabel utama */}
              <div className="sticky bottom-0 z-30 flex items-center justify-end gap-3 p-3 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg print:hidden rounded-b-xl mt-4">
                <button
                  onClick={() => {
                    const headers = ['ID CUSTOMER', 'NAMA INSTANSI', 'KONTAK PIC', 'EMAIL', 'TELEPON', 'ALAMAT', 'SALDO PIUTANG'];
                    let totalPiutang = 0;
                    const rows = customers.map(c => {
                      totalPiutang += c.piutang;
                      return [c.id, c.nama, c.kontak, c.email, c.telp, c.alamat, `Rp ${c.piutang.toLocaleString('id-ID')}`];
                    });
                    const summaryRows = [
                      ['', '', '', '', '', 'TOTAL PIUTANG', `Rp ${totalPiutang.toLocaleString('id-ID')}`]
                    ];
                    generateReportPDF(
                      'REKAPITULASI PELANGGAN & BUKU BESAR',
                      'Daftar Relasi Pelanggan B2B',
                      new Date().toLocaleDateString('id-ID'),
                      headers,
                      rows,
                      summaryRows,
                      `Rekap_Pelanggan_${new Date().toISOString().slice(0, 10)}.pdf`,
                      'landscape'
                    );
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Download Rekap & Buku Besar (PDF)</span>
                </button>
                <button
                  onClick={() => {
                    const wsData: any[][] = [
                      ['REKAPITULASI PELANGGAN & BUKU BESAR'],
                      ['Tanggal Cetak:', new Date().toLocaleDateString('id-ID')],
                      [''],
                      ['ID CUSTOMER', 'NAMA INSTANSI', 'KONTAK PIC', 'EMAIL', 'TELEPON', 'ALAMAT', 'SALDO PIUTANG']
                    ];
                    let totalPiutang = 0;
                    customers.forEach(c => {
                      totalPiutang += c.piutang;
                      wsData.push([c.id, c.nama, c.kontak, c.email, c.telp, c.alamat, c.piutang]);
                    });
                    wsData.push(['']);
                    wsData.push(['', '', '', '', '', 'TOTAL PIUTANG', totalPiutang]);

                    if (typeof XLSX !== 'undefined') {
                      const ws = XLSX.utils.aoa_to_sheet(wsData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Rekap Pelanggan");
                      XLSX.writeFile(wb, `Rekap_Pelanggan_${new Date().toISOString().slice(0, 10)}.xlsx`);
                    } else {
                      triggerToast('Library Excel tidak ditemukan', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-success hover:bg-success/90 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14} />
                  <span>Unduh Rekap & Buku Besar (.xlsx)</span>
                </button>
              </div>

              {/* Print Only Section for Customers */}
              <div className="hidden print:block text-black p-8">
                <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
                  <h1 className="text-2xl font-black uppercase tracking-wider">REKAPITULASI PELANGGAN & BUKU BESAR PIUTANG</h1>
                  <p className="text-sm font-medium mt-1">Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
                </div>
                <table className="w-full text-left text-sm border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-400">
                      <th className="p-3 font-bold border-r border-slate-300">ID / NAMA</th>
                      <th className="p-3 font-bold border-r border-slate-300">KONTAK</th>
                      <th className="p-3 font-bold text-right">PIUTANG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-3 border-r border-slate-300">
                          <div className="font-bold">{c.nama}</div>
                          <div className="text-xs font-mono">{c.id}</div>
                        </td>
                        <td className="p-3 border-r border-slate-300 text-xs">
                          {c.kontak} • {c.telp}
                        </td>
                        <td className="p-3 text-right font-bold font-mono">Rp {c.piutang.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                      <td colSpan={2} className="p-3 text-right">TOTAL PIUTANG DAGANG</td>
                      <td className="p-3 text-right font-mono text-base">Rp {customers.reduce((sum, c) => sum + c.piutang, 0).toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB: SUPPLIER */}
          {activeTab === 'supplier' && (
            <div className="space-y-4 relative pb-20 print-container" id="rekap-supplier-section">
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; color: black !important; }
                  header, footer, nav, aside, .no-print, button, input[type="checkbox"], select { display: none !important; }
                  #rekap-supplier-section { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; }
                }
              `}} />
              <div className="flex justify-between items-center no-print">
                <div>
                  <h2 className="text-xl font-bold text-text-primary">Database Supplier & Vendor</h2>
                  <p className="text-sm text-text-secondary">Kelola data vendor tepung, gula, mentega, kemasan, beserta tagihan/hutang aktif</p>
                </div>
                <button
                  onClick={() => {
                    setSupplierForm({ id: '', nama: '', kontak: '', email: '', telp: '', alamat: '', hutang: 0 });
                    setIsEditingSupplier(false);
                    setShowSupplierModal(true);
                  }}
                  className="bg-primary text-white px-3 py-2 text-sm font-bold rounded-card flex items-center gap-1.5 shadow"
                >
                  <Plus size={14} />
                  <span>Daftar Supplier Baru</span>
                </button>
              </div>
              <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden print:hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-primary text-white text-sm font-black uppercase tracking-wider">
                    <tr>
                      <th className="py-3 px-4">ID Supplier</th>
                      <th className="py-3 px-4">Nama Vendor</th>
                      <th className="py-3 px-4">Kontak PIC</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Telepon</th>
                      <th className="py-3 px-4">Kategori / Notes</th>
                      <th className="py-3 px-4 text-right">Saldo Hutang</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {suppliers.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 text-sm">
                        <td className="py-3 px-4 font-mono font-bold">
                          <button
                            onClick={() => setViewingSupplierTx(s)}
                            className="hover:underline font-mono font-bold text-primary hover:text-primary-hover transition-all text-left"
                            title="Klik untuk rincian transaksi"
                          >
                            {s.id}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-bold text-text-primary">
                          <button
                            onClick={() => setViewingSupplierTx(s)}
                            className="hover:underline font-bold text-text-primary hover:text-primary transition-all text-left"
                            title="Klik untuk rincian transaksi"
                          >
                            {s.nama}
                          </button>
                        </td>
                        <td className="py-3 px-4 font-medium">{s.kontak}</td>
                        <td>{s.email}</td>
                        <td>{s.telp}</td>
                        <td className="py-3 px-4 max-w-[200px] truncate text-xs text-secondary">{s.alamat}</td>
                        <td className="py-3 px-4 text-right font-bold font-mono text-danger">Rp {s.hutang.toLocaleString('id-ID')}</td>
                        <td className="text-center">
                          <div className="flex justify-center items-center gap-1.5">
                            <button
                              onClick={() => setViewingSupplierTx(s)}
                              title="Rincian Transaksi"
                              className="text-secondary hover:text-primary p-1"
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
                              className="text-secondary hover:text-primary p-1"
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

              {/* ponytail: ekspor global daftar relasi & saldo hutang/piutang di footer bawah tabel utama */}
              <div className="sticky bottom-0 z-30 flex items-center justify-end gap-3 p-3 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg print:hidden rounded-b-xl mt-4">
                <button
                  onClick={() => {
                    const headers = ['ID SUPPLIER', 'NAMA VENDOR', 'KONTAK PIC', 'EMAIL', 'TELEPON', 'KATEGORI / NOTES', 'SALDO HUTANG'];
                    let totalHutang = 0;
                    const rows = suppliers.map(s => {
                      totalHutang += s.hutang;
                      return [s.id, s.nama, s.kontak, s.email, s.telp, s.alamat, `Rp ${s.hutang.toLocaleString('id-ID')}`];
                    });
                    const summaryRows = [
                      ['', '', '', '', '', 'TOTAL HUTANG', `Rp ${totalHutang.toLocaleString('id-ID')}`]
                    ];
                    generateReportPDF(
                      'REKAPITULASI SUPPLIER & BUKU BESAR',
                      'Daftar Relasi Vendor',
                      new Date().toLocaleDateString('id-ID'),
                      headers,
                      rows,
                      summaryRows,
                      `Rekap_Supplier_${new Date().toISOString().slice(0, 10)}.pdf`,
                      'landscape'
                    );
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Download Rekap & Buku Besar (PDF)</span>
                </button>
                <button
                  onClick={() => {
                    const wsData: any[][] = [
                      ['REKAPITULASI SUPPLIER & BUKU BESAR'],
                      ['Tanggal Cetak:', new Date().toLocaleDateString('id-ID')],
                      [''],
                      ['ID SUPPLIER', 'NAMA VENDOR', 'KONTAK PIC', 'EMAIL', 'TELEPON', 'KATEGORI / NOTES', 'SALDO HUTANG']
                    ];
                    let totalHutang = 0;
                    suppliers.forEach(s => {
                      totalHutang += s.hutang;
                      wsData.push([s.id, s.nama, s.kontak, s.email, s.telp, s.alamat, s.hutang]);
                    });
                    wsData.push(['']);
                    wsData.push(['', '', '', '', '', 'TOTAL HUTANG', totalHutang]);

                    if (typeof XLSX !== 'undefined') {
                      const ws = XLSX.utils.aoa_to_sheet(wsData);
                      const wb = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wb, ws, "Rekap Supplier");
                      XLSX.writeFile(wb, `Rekap_Supplier_${new Date().toISOString().slice(0, 10)}.xlsx`);
                    } else {
                      triggerToast('Library Excel tidak ditemukan', 'error');
                    }
                  }}
                  className="px-4 py-2 bg-success hover:bg-success/90 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet size={14} />
                  <span>Unduh Rekap & Buku Besar (.xlsx)</span>
                </button>
              </div>

              {/* Print Only Section for Suppliers */}
              <div className="hidden print:block text-black p-8">
                <div className="text-center pb-4 border-b-2 border-slate-800 mb-6">
                  <h1 className="text-2xl font-black uppercase tracking-wider">REKAPITULASI SUPPLIER & BUKU BESAR HUTANG</h1>
                  <p className="text-sm font-medium mt-1">Tanggal Cetak: {new Date().toLocaleDateString('id-ID')}</p>
                </div>
                <table className="w-full text-left text-sm border-collapse border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 border-b-2 border-slate-400">
                      <th className="p-3 font-bold border-r border-slate-300">ID / NAMA</th>
                      <th className="p-3 font-bold border-r border-slate-300">KONTAK</th>
                      <th className="p-3 font-bold text-right">HUTANG</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s, idx) => (
                      <tr key={idx} className="border-b border-slate-200">
                        <td className="p-3 border-r border-slate-300">
                          <div className="font-bold">{s.nama}</div>
                          <div className="text-xs font-mono">{s.id}</div>
                        </td>
                        <td className="p-3 border-r border-slate-300 text-xs">
                          {s.kontak} • {s.telp}
                        </td>
                        <td className="p-3 text-right font-bold font-mono text-danger">Rp {s.hutang.toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-bold border-t-2 border-slate-400">
                      <td colSpan={2} className="p-3 text-right">TOTAL HUTANG DAGANG</td>
                      <td className="p-3 text-right font-mono text-base">Rp {suppliers.reduce((sum, s) => sum + s.hutang, 0).toLocaleString('id-ID')}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Form Modals */}
          {(activeTab === 'pelanggan' || activeTab === 'supplier' || activeTab === 'sales_order' || activeTab === 'purchase_order') && (
            <>
              {/* Form Input Modal Customer */}
              {showCustomerModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-card shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] relative my-auto">
                    <div className="bg-primary text-white py-4 px-6 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Users size={20} />
                        <span>{isEditingCustomer ? 'Edit Data Pelanggan' : 'Daftar Pelanggan Baru'}</span>
                      </h3>
                      <button onClick={() => setShowCustomerModal(false)} className="text-teal-100 hover:text-white transition-colors cursor-pointer">&times;</button>
                    </div>
                    <form onSubmit={handleSaveCustomer} className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">ID CUSTOMER (AUTO)</label>
                          <input type="text" value={customerForm.id} disabled className="border p-2.5 rounded-card bg-gray-100 font-mono font-bold text-secondary" placeholder="Otomatis..." />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">NAMA INSTANSI / TOKO <span className="text-danger">*</span></label>
                          <input type="text" value={customerForm.nama} onChange={(e) => setCustomerForm({ ...customerForm, nama: e.target.value })} required className="border p-2.5 rounded-card font-semibold" placeholder="Contoh: PT. Maju Jaya" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">NAMA PIC KONTAK <span className="text-danger">*</span></label>
                          <input type="text" value={customerForm.kontak} onChange={(e) => setCustomerForm({ ...customerForm, kontak: e.target.value })} required className="border p-2.5 rounded-card" placeholder="Nama..." />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">TELEPON / WA</label>
                          <input type="text" value={customerForm.telp} onChange={(e) => setCustomerForm({ ...customerForm, telp: e.target.value })} className="border p-2.5 rounded-card" placeholder="0812..." />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-text-secondary">EMAIL</label>
                        <input type="email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })} className="border p-2.5 rounded-card" placeholder="email@contoh.com" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-text-secondary">ALAMAT KIRIM / TAGIHAN</label>
                        <textarea value={customerForm.alamat} onChange={(e) => setCustomerForm({ ...customerForm, alamat: e.target.value })} className="border p-2.5 rounded-card h-16 resize-none" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-text-secondary">SALDO AWAL PIUTANG (Rp)</label>
                        <input type="number" value={customerForm.piutang || ''} onChange={(e) => setCustomerForm({ ...customerForm, piutang: parseInt(e.target.value) || 0 })} disabled={isEditingCustomer} className={`border p-2.5 rounded-card font-mono ${isEditingCustomer ? 'bg-gray-100 text-secondary cursor-not-allowed' : 'font-bold'}`} placeholder="0" />
                        {isEditingCustomer && <span className="text-[10px] text-warning font-semibold">Piutang hanya bisa disesuaikan lewat dokumen transaksi.</span>}
                      </div>
                      <div className="flex justify-end gap-2 border-t pt-4">
                        <button type="button" onClick={() => setShowCustomerModal(false)} className="px-4 py-2 border rounded-card">Batal</button>
                        <button type="submit" className="px-5 py-2 bg-primary text-white rounded-card font-bold">Simpan</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
              {/* Form Input Modal Supplier */}
              {showSupplierModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                  <div className="bg-white rounded-card shadow-xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh] relative my-auto">
                    <div className="bg-slate-800 text-white py-4 px-6 flex justify-between items-center shrink-0">
                      <h3 className="font-bold text-lg flex items-center gap-2">
                        <Building2 size={20} className="text-teal-400" />
                        <span>{isEditingSupplier ? 'Edit Data Supplier' : 'Daftar Supplier Baru'}</span>
                      </h3>
                      <button onClick={() => setShowSupplierModal(false)} className="text-slate-400 hover:text-white transition-colors cursor-pointer">&times;</button>
                    </div>
                    <form onSubmit={handleSaveSupplier} className="p-6 overflow-y-auto space-y-4 flex-1 bg-slate-50">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">ID SUPPLIER (AUTO)</label>
                          <input type="text" value={supplierForm.id} disabled className="border p-2.5 rounded-card bg-gray-100 font-mono font-bold text-secondary" placeholder="Otomatis..." />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">NAMA VENDOR <span className="text-danger">*</span></label>
                          <input type="text" value={supplierForm.nama} onChange={(e) => setSupplierForm({ ...supplierForm, nama: e.target.value })} required className="border p-2.5 rounded-card font-semibold" placeholder="PT. Pemasok Hebat" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">PIC KONTAK <span className="text-danger">*</span></label>
                          <input type="text" value={supplierForm.kontak} onChange={(e) => setSupplierForm({ ...supplierForm, kontak: e.target.value })} required className="border p-2.5 rounded-card" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">TELEPON / WA</label>
                          <input type="text" value={supplierForm.telp} onChange={(e) => setSupplierForm({ ...supplierForm, telp: e.target.value })} className="border p-2.5 rounded-card" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">EMAIL</label>
                          <input type="email" value={supplierForm.email} onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })} className="border p-2.5 rounded-card" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[11px] font-bold text-text-secondary">SALDO AWAL HUTANG (Rp)</label>
                          <input type="number" value={supplierForm.hutang || ''} onChange={(e) => setSupplierForm({ ...supplierForm, hutang: parseInt(e.target.value) || 0 })} disabled={isEditingSupplier} className={`border p-2.5 rounded-card font-mono ${isEditingSupplier ? 'bg-gray-100 text-secondary cursor-not-allowed' : 'font-bold'}`} placeholder="0" />
                          {isEditingSupplier && <span className="text-[9px] text-warning font-semibold">Ubah hutang via transaksi PO.</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[11px] font-bold text-text-secondary">ALAMAT KANTOR / GUDANG</label>
                        <textarea value={supplierForm.alamat} onChange={(e) => setSupplierForm({ ...supplierForm, alamat: e.target.value })} className="border p-2.5 rounded-card h-16 resize-none font-semibold" />
                      </div>
                      <div className="flex justify-end gap-2 border-t pt-4">
                        <button type="button" onClick={() => setShowSupplierModal(false)} className="px-4 py-2 border rounded-card">Batal</button>
                        <button type="submit" className="px-5 py-2 bg-primary text-white rounded-card font-bold">Simpan</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </>
          )}
          {/* TAB: SUMMARY STOK */}
          {/* 4. SUMMARY STOK BULANAN */}
          {/* 4. SUMMARY STOK BULANAN */}
          {activeTab === 'summary_stok' && (() => {
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
                setSelectedStokMonths([...selectedStokMonths, m].sort((a, b) => {
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
                <style dangerouslySetInnerHTML={{
                  __html: `
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
                <div className="hidden print:block text-center space-y-1 pb-4 border-b-2 border-border mb-6">
                  <h2 className="text-xl font-black uppercase text-primary tracking-tight">{namaToko || 'INO ERP'}</h2>
                  <h3 className="text-sm font-extrabold text-primary tracking-wide uppercase">LAPORAN MUTASI PERSEDIAAN BARANG</h3>
                  <p className="text-sm text-secondary font-bold tracking-widest">METODE BIAYA RATA-RATA TERTIMBANG (WEIGHTED AVERAGE METHOD)</p>
                  <p className="text-[11px] font-mono text-secondary font-bold">
                    {stokViewMode === 'daily' && `Periode Laporan Harian: ${analitikStartDate} s/d ${analitikEndDate}`}
                    {stokViewMode === 'three_days' && `Periode Laporan 3 Harian: ${analitikStartDate} s/d ${analitikEndDate}`}
                    {stokViewMode === 'weekly' && `Periode Laporan Mingguan: ${analitikStartDate} s/d ${analitikEndDate}`}
                    {stokViewMode === 'monthly' && `Tahun Buku 2026 - Periode Bulanan SAK-EMKM`}
                    {stokViewMode === 'quarterly' && `Tahun Buku 2026 - Periode Kuartalan`}
                    {stokViewMode === 'annual' && `Tahun Buku 2026 - Konsolidasi Akhir Tahun`}
                  </p>
                  <p className="text-[11px] text-slate-400 font-bold italic">Sesuai Standar Akuntansi Keuangan SAK-EMKM / PSAK 14 / IAS 2 (Inventories)</p>

                </div>
                {/* CONTROL DASHBOARD (HIDDEN ON PRINT) */}
                <div className="bg-white border border-border p-5 rounded-2xl shadow-xs space-y-4 no-print" id="stok-control-panel">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-primary rounded-full animate-pulse"></span>
                        <h4 className="text-sm font-black uppercase text-primary tracking-wider">Kustomisasi Laporan Mutasi Stok</h4>
                      </div>
                      <p className="text-sm text-slate-400 mt-1">Saring produk, pilih rentang waktu dari harian sampai tahunan, dan atur visibilitas biaya.</p>

                    </div>
                  </div>
                  {/* ponytail: pisahkan dari-sampai tanggal ke kolom eksklusif & tata filter 6-kolom grid seimbang */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 p-4 bg-slate-50/80 rounded-xl border border-slate-200 items-end mt-4">

                    {/* 1. Jangka Waktu & Interval */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Periode</label>
                      <div className="flex gap-1">
                        <select value={stokViewMode} onChange={e => setStokViewMode(e.target.value as any)} className="w-full text-sm font-medium text-secondary p-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-primary">
                          <option value="daily">Harian</option>
                          <option value="three_days">3 Hari</option>
                          <option value="weekly">Mingguan</option>
                          <option value="monthly">Bulanan</option>
                          <option value="quarterly">Kuartal</option>
                          <option value="annual">Tahunan</option>
                        </select>
                        {stokViewMode === 'monthly' && (
                          <select className="w-full text-sm font-medium text-secondary p-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-primary" onChange={(e) => {
                            // Just dummy for visual simplicity as requested
                          }}>
                            <option value="1">1 Bln</option>
                            <option value="3">3 Bln</option>
                            <option value="6">6 Bln</option>
                            <option value="12">12 Bln</option>
                          </select>
                        )}
                      </div>
                    </div>

                    {/* 2. Dari Tanggal */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Dari Tanggal</label>
                      <input type="date" value={analitikStartDate} onChange={e => setAnalitikStartDate(e.target.value)} className="w-full text-sm font-medium text-secondary p-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-primary" />
                    </div>

                    {/* 3. Sampai Tanggal */}
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Sampai Tanggal</label>
                      <input type="date" value={analitikEndDate} onChange={e => setAnalitikEndDate(e.target.value)} className="w-full text-sm font-medium text-secondary p-1.5 bg-white border border-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-primary" />
                    </div>

                    {/* 4. Filter SKU */}
                    <div className="flex flex-col gap-1 relative group">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Filter Barang</label>
                      <details className="relative group w-full">
                        <summary className="list-none cursor-pointer w-full text-sm font-medium text-secondary p-1.5 border border-slate-300 rounded-lg bg-white flex justify-between items-center outline-none focus:ring-1 focus:ring-primary">
                          <span className="truncate">Pilih Barang (SKU)</span> <ChevronDown size={14} className="text-slate-400 shrink-0" />
                        </summary>
                        <div className="absolute top-full left-0 mt-1 w-64 max-h-48 overflow-y-auto bg-white border border-border shadow-xl p-3 rounded-card z-50 flex flex-col gap-2">
                          {products.map(p => (
                            <label key={p.sku} className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer hover:bg-slate-50 p-1 rounded">
                              <input type="checkbox" checked={stokSelectedSkus.includes(p.sku)} onChange={(e) => {
                                if (e.target.checked) setStokSelectedSkus([...stokSelectedSkus, p.sku]);
                                else setStokSelectedSkus(stokSelectedSkus.filter(s => s !== p.sku));
                              }} className="text-primary focus:ring-primary rounded border-slate-300" />
                              <span className="truncate">{p.nama} ({p.sku})</span>
                            </label>
                          ))}
                        </div>
                      </details>
                    </div>

                    {/* 5. Filter Supplier */}
                    <div className="flex flex-col gap-1 relative group">
                      <label className="text-[11px] font-bold text-slate-500 uppercase">Filter Supplier</label>
                      <details className="relative group w-full">
                        <summary className="list-none cursor-pointer w-full text-sm font-medium text-secondary p-1.5 border border-slate-300 rounded-lg bg-white flex justify-between items-center outline-none focus:ring-1 focus:ring-primary">
                          <span className="truncate">Pilih Supplier</span> <ChevronDown size={14} className="text-slate-400 shrink-0" />
                        </summary>
                        <div className="absolute top-full left-0 mt-1 w-64 max-h-48 overflow-y-auto bg-white border border-border shadow-xl p-3 rounded-card z-50 flex flex-col gap-2">
                          {suppliers.map(s => (
                            <label key={s.id} className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer hover:bg-slate-50 p-1 rounded">
                              <input type="checkbox" className="text-primary focus:ring-primary rounded border-slate-300" />
                              <span className="truncate">{s.nama}</span>
                            </label>
                          ))}
                        </div>
                      </details>
                    </div>

                    {/* 6. Opsi & Reset */}
                    <div className="flex items-center gap-2">
                      <details className="relative group flex-1">
                        <summary className="list-none cursor-pointer w-full text-sm font-medium text-secondary p-1.5 border border-slate-300 rounded-lg bg-white flex justify-between items-center outline-none focus:ring-1 focus:ring-primary">
                          <span className="truncate">Opsi Tampilan</span> <ChevronDown size={14} className="text-slate-400 shrink-0" />
                        </summary>
                        <div className="absolute top-full right-0 mt-1 w-64 bg-white border border-border shadow-xl p-3 rounded-card z-50 flex flex-col gap-3">
                          <label className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer">
                            <input type="checkbox" checked={stokShowFinancial} onChange={e => {
                              setStokShowFinancial(e.target.checked);
                              if (!e.target.checked) {
                                setStokShowUnitPrice(false);
                                setStokShowAmount(false);
                              }
                            }} className="text-primary focus:ring-primary rounded border-slate-300" />
                            Tampilkan Finansial
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer pl-4">
                            <input type="checkbox" disabled={!stokShowFinancial} checked={stokShowUnitPrice} onChange={e => setStokShowUnitPrice(e.target.checked)} className="text-primary focus:ring-primary rounded border-slate-300 disabled:opacity-50" />
                            Harga Satuan (Unit Price)
                          </label>
                          <label className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer pl-4">
                            <input type="checkbox" disabled={!stokShowFinancial} checked={stokShowAmount} onChange={e => setStokShowAmount(e.target.checked)} className="text-primary focus:ring-primary rounded border-slate-300 disabled:opacity-50" />
                            Total Nilai (Amount)
                          </label>
                          <div className="border-t border-slate-100 my-1"></div>
                          <label className="flex items-center gap-2 text-sm font-medium text-secondary cursor-pointer">
                            <input type="checkbox" checked={stokHideZeroQty} onChange={e => setStokHideZeroQty(e.target.checked)} className="text-primary focus:ring-primary rounded border-slate-300" />
                            Sembunyikan Stok Akhir = 0
                          </label>
                        </div>
                      </details>
                      <button onClick={() => {
                        setStokViewMode('monthly');
                        setStokSelectedSkus([]);
                        setStokHideZeroQty(false);
                        setStokShowFinancial(true);
                        setStokShowUnitPrice(false);
                        setStokShowAmount(true);
                      }} title="Reset Filter" className="text-slate-500 hover:text-danger p-1.5 border border-slate-300 rounded-lg bg-white hover:bg-slate-50 transition-colors shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                      </button>
                    </div>
                  </div>
                </div>
                {/* ponytail: hapus banner & badge klaim PSAK/IFRS yang tidak diperlukan */}

                {/* MASSIVE SPREADSHEET LEDGER GRID */}
                <div className="bg-white border border-border rounded-2xl shadow-xs overflow-hidden" id="stok-matrix-grid">
                  <div className="p-4 bg-slate-50 border-b border-border flex justify-between items-center no-print">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="text-primary" size={16} />
                      <h4 className="text-sm font-black text-primary uppercase tracking-wider">
                        Buku Pembantu Mutasi Persediaan Barang (Buku Besar Stok - Mode: {stokViewMode.toUpperCase()})
                      </h4>
                    </div>
                    <span className="text-xs font-mono font-black bg-success/10 text-primary px-2.5 py-0.5 rounded border border-success/30 uppercase tracking-wider">
                    </span>

                  </div>
                  {/* Wide table with Sticky horizontal positioning */}
                  <div className="overflow-x-auto max-w-full print-table-wrapper max-h-[600px]">
                    <table className="w-full text-left text-sm border-collapse print-table divide-y divide-slate-200">
                      <thead>
                        {/* LEVEL 1 HEADER: MAJOR CATEGORIES */}
                        <tr className="bg-slate-100 text-primary uppercase tracking-widest text-xs font-black border-b border-border divide-x divide-slate-200">
                          <th colSpan={3} className="px-3 py-2 text-center bg-slate-100 text-primary sticky left-0 z-30 min-w-[356px]">
                            Spesifikasi Produk
                          </th>
                          {/* ponytail: fix css table layout & overflow pada kolom saldo awal agar tidak hancur */}
                          <th colSpan={stokShowFinancial && stokShowAmount ? 2 : 1} className="px-3 py-2 text-center bg-slate-100 text-primary sticky left-[356px] z-30 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] min-w-[96px] whitespace-nowrap">
                            Saldo Awal Periode
                          </th>

                          {/* ponytail: kembalikan matriks mutasi stok murni (Masuk, Keluar, Saldo Qty) per periode */}
                          {activePeriods.map(p => {
                            return (
                              <th key={p.id} colSpan={3} className="px-3 py-2 text-center bg-primary text-white border-b-2 border-teal-600 whitespace-nowrap">
                                {p.label}
                              </th>
                            );
                          })}
                        </tr>
                        {/* LEVEL 2 HEADER: COLUMN DESCRIPTIONS */}
                        <tr className="bg-slate-100 text-primary uppercase tracking-wider text-xs font-black border-b border-border divide-x divide-slate-200">
                          <th className="px-2.5 py-2 text-center sticky left-0 bg-slate-100 z-20 w-20 min-w-[80px] whitespace-nowrap">SKU</th>
                          <th className="px-2.5 py-2 sticky left-[80px] bg-slate-100 z-20 min-w-[180px] whitespace-nowrap">Nama Produk</th>
                          <th className="px-2.5 py-2 text-center sticky left-[260px] bg-slate-100 z-20 w-24 min-w-[96px] whitespace-nowrap">Satuan</th>

                          {/* Saldo Awal (Sticky) */}
                          <th className={`px-2.5 py-2 text-right text-secondary bg-slate-100 z-20 sticky left-[356px] w-24 min-w-[96px] whitespace-nowrap ${!(stokShowFinancial && stokShowAmount) ? 'shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]' : ''}`}>Qty Awal</th>
                          {stokShowFinancial && stokShowAmount && <th className="px-2.5 py-2 text-right text-secondary bg-slate-100 z-20 sticky left-[452px] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] w-28 min-w-[112px] whitespace-nowrap">Nilai Awal (Rp)</th>}

                          {/* Repeating Columns Per Period Block - Only 3 cols now! */}
                          {activePeriods.map(p => {
                            return (
                              <React.Fragment key={p.id}>
                                <th className="px-2.5 py-2 text-right text-success bg-success/10 font-black w-20 min-w-[80px] whitespace-nowrap">Masuk (+)</th>
                                <th className="px-2.5 py-2 text-right text-danger bg-danger/10 font-black w-20 min-w-[80px] whitespace-nowrap">Keluar (-)</th>
                                <th className="px-2.5 py-2 text-right text-primary bg-slate-100 font-black w-20 min-w-[80px] whitespace-nowrap">Saldo Qty</th>
                              </React.Fragment>
                            );
                          })}
                        </tr>
                      </thead>
                      {/* BODY ROWS */}
                      <tbody className="divide-y divide-slate-200 text-slate-800 text-sm font-medium">
                        {filteredLedger.map((item: any) => {
                          return (
                            <tr key={item.sku} className="hover:bg-slate-50 group divide-x divide-slate-100">
                              {/* STICKY LEFT COLUMNS */}
                              <td className="px-2.5 py-2 text-center font-mono font-bold sticky left-0 bg-white group-hover:bg-slate-50 z-10 w-20 min-w-[80px] whitespace-nowrap">{item.sku}</td>
                              <td className="px-2.5 py-2 font-bold sticky left-[80px] bg-white group-hover:bg-slate-50 z-10 min-w-[180px] whitespace-nowrap truncate max-w-[200px]">{item.nama}</td>
                              <td className="px-2.5 py-2 text-center text-slate-500 font-bold sticky left-[260px] bg-white group-hover:bg-slate-50 z-10 w-24 min-w-[96px] whitespace-nowrap">{item.satuan}</td>
                              {/* Saldo Awal */}
                              <td className={`px-2.5 py-2 text-right font-mono text-slate-600 bg-white group-hover:bg-slate-50 sticky left-[356px] z-10 w-24 min-w-[96px] whitespace-nowrap ${!(stokShowFinancial && stokShowAmount) ? 'shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)]' : ''}`}>{item.initialQty}</td>
                              {stokShowFinancial && stokShowAmount && (
                                <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-800 bg-slate-50 group-hover:bg-slate-100 sticky left-[452px] shadow-[4px_0_10px_-4px_rgba(0,0,0,0.1)] z-10 w-28 min-w-[112px] whitespace-nowrap">
                                  Rp {Math.round(item.initialAmount).toLocaleString('id-ID')}
                                </td>
                              )}
                              {/* PERIODS DISPLAY */}
                              {item.periods.map((pData: any, idx: number) => {
                                return (
                                  <React.Fragment key={`${item.sku}_p_${idx}`}>
                                    {/* Stock In */}
                                    <td className={`px-2.5 py-2 text-right font-mono w-20 min-w-[80px] whitespace-nowrap ${pData.stockInQty > 0 ? 'text-success bg-success/10 font-bold' : 'text-slate-300'}`}>
                                      {pData.stockInQty > 0 ? `+${pData.stockInQty}` : '0'}
                                    </td>

                                    {/* Stock Out */}
                                    <td className={`px-2.5 py-2 text-right font-mono w-20 min-w-[80px] whitespace-nowrap ${pData.stockOutQty > 0 ? 'text-danger bg-danger/10 font-bold' : 'text-slate-300'}`}>
                                      {pData.stockOutQty > 0 ? `-${pData.stockOutQty}` : '0'}
                                    </td>

                                    {/* Stock On Hand (Ending) */}
                                    <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-800 bg-slate-100/50 w-20 min-w-[80px] whitespace-nowrap">
                                      {pData.endingQty}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* ponytail: sticky bottom footer untuk tombol ekspor PDF & Excel di bawah tabel tanpa scroll */}
                  <div className="sticky bottom-0 z-30 flex items-center justify-end gap-3 p-3 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg">
                    <button
                      onClick={() => {
                        const hasUnitPrice = stokShowUnitPrice;
                        const hasAmount = stokShowAmount;

                        const headers: string[] = ["Detail Produk", "Kategori", "Satuan", "Saldo Awal"];
                        if (hasAmount) {
                          if (hasUnitPrice) headers.push("Harga/Unit (Awal)", "Nilai (Awal)");
                          else headers.push("Nilai (Awal)");
                        }
                        headers.push("IN", "OUT", "Saldo Akhir");
                        if (hasAmount) {
                          if (hasUnitPrice) headers.push("Harga/Unit (Akhir)", "Nilai (Akhir)");
                          else headers.push("Nilai Akhir");
                        }

                        const rows: (string | number)[][] = [];
                        filteredProducts.forEach(p => {
                          const awal = p.stokAwal || 0;
                          const masuk = p.stokMasuk || 0;
                          const keluar = p.stokKeluar || 0;
                          const akhir = awal + masuk - keluar;
                          const hpp = p.hpp || 0;

                          const rowData: (string | number)[] = [
                            `${p.sku}\n${p.nama}`,
                            p.kategori,
                            p.satuan,
                            awal
                          ];

                          if (hasAmount) {
                            if (hasUnitPrice) rowData.push(hpp, awal * hpp);
                            else rowData.push(awal * hpp);
                          }

                          rowData.push(masuk, keluar, akhir);

                          if (hasAmount) {
                            if (hasUnitPrice) rowData.push(hpp, akhir * hpp);
                            else rowData.push(akhir * hpp);
                          }
                          rows.push(rowData);
                        });

                        generateReportPDF(
                          'LAPORAN MUTASI PERSERDIAAN BARANG',
                          `Metode: Weighted Average Costing | Periode: ${stokViewMode.toUpperCase()} (${analitikStartDate} s/d ${analitikEndDate})`,
                          `${analitikStartDate} s/d ${analitikEndDate}`,
                          headers,
                          rows,
                          [],
                          `Mutasi_Stok_${stokViewMode}_${new Date().toISOString().slice(0, 10)}.pdf`,
                          'landscape'
                        );
                      }}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Printer size={14} />
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={handleExportToExcel}
                      className="px-4 py-2 bg-success hover:bg-success/100 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Unduh Excel (.xlsx)</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 7: LAPORAN KEUANGAN & STOK (REPORTS HUB) */}
          {['laba_rugi', 'arus_kas', 'konsinyasi', 'penjualan_harian', 'pajak_ppn'].includes(activeTab) && (
            <div className="space-y-6">
              {/* Dynamic Print CSS Injector for Flawless Printing */}
              <style dangerouslySetInnerHTML={{
                __html: `
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
                    size: ${activeTab === 'penjualan_harian' ? 'A3 landscape' : 'A4 portrait'};
                    margin: 1.2cm 1cm 1.2cm 1cm;
                  }
                }
              `}} />

              {/* ponytail: hapus atribusi xero & gunakan judul laporan dinamis */}
              {/* ponytail: navigasi jenis laporan dipusatkan di dropdown Top Bar utama */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-border pb-4 gap-4 no-print">
                <div>
                  <h2 className="text-2xl font-black text-primary tracking-tight flex items-center gap-2">
                    <span>📊 {activeTab === 'laba_rugi' ? 'LAPORAN LABA RUGI (P&L)' : activeTab === 'arus_kas' ? 'LAPORAN ARUS KAS (CASH FLOW)' : activeTab === 'konsinyasi' ? 'LAPORAN KONSINYASI RETAIL' : activeTab === 'penjualan_harian' ? 'LAPORAN PENJUALAN HARIAN' : 'LAPORAN PAJAK PPN'}</span>
                  </h2>
                </div>
              </div>

              {/* REPORT CONTENTS */}

              {/* 1. LABA RUGI */}
              {activeTab === 'laba_rugi' && (() => {
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
                    {/* ponytail: standarisasi filter periode & jangka waktu */}
                    <div className="bg-white border border-border p-3 rounded-card shadow-xs flex flex-wrap gap-4 items-center justify-between no-print">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        <h4 className="text-sm font-bold uppercase text-primary tracking-wider">Filter Periode Laporan</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary uppercase">Periode:</span>
                          <select className="text-sm font-medium text-primary p-1.5 border border-border rounded bg-slate-50 outline-none">
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="monthly" defaultValue="monthly">Bulanan</option>
                            <option value="annual">Tahunan</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary uppercase">Waktu:</span>
                          <div className="flex items-center gap-1 border border-border rounded px-2 py-1 bg-slate-50">
                            <input type="date" value={analitikStartDate} onChange={(e) => setAnalitikStartDate(e.target.value)} className="text-sm font-medium text-primary outline-none bg-transparent" />
                            <span className="text-xs font-bold text-slate-400">s/d</span>
                            <input type="date" value={analitikEndDate} onChange={(e) => setAnalitikEndDate(e.target.value)} className="text-sm font-medium text-primary outline-none bg-transparent" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Profit and Loss Statement */}
                    <div id="laba-rugi-print-section" className="bg-white border border-border rounded-card shadow-xs p-8 max-w-3xl mx-auto space-y-6 print-report-card">
                      <div className="text-center space-y-1">
                        <h3 className="text-lg font-black text-primary print:text-black tracking-wide uppercase">LAPORAN LABA RUGI</h3>
                        <p className="text-sm text-primary print:text-black font-black tracking-widest">CV. SOURDOUGH ABADI &bull; SAK-EMKM</p>
                        <p className="text-[11px] text-secondary print:text-black font-mono">Periode: {analitikStartDate} s/d {analitikEndDate} (IDR)</p>
                      </div>
                      <div className="space-y-4 text-sm font-semibold">
                        {/* Revenue */}
                        <div className="flex justify-between text-sm font-extrabold border-b print:border-black pb-1.5 text-primary print:text-black">
                          <span>1. PENDAPATAN OPERASIONAL</span>
                          <span className="font-mono">Rp {totalRevenue.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="space-y-1 pl-4 pr-4 text-secondary text-[11px]">
                          <div className="flex justify-between">
                            <span>Penjualan Barang Jadi Retail &amp; Grosir</span>
                            <span className="font-mono">Rp {totalRevenue.toLocaleString('id-ID')}</span>

                          </div>
                        </div>
                        {/* HPP */}
                        <div className="flex justify-between text-sm font-extrabold border-b print:border-black pb-1.5 text-primary print:text-black">
                          <span>2. BEBAN POKOK PENJUALAN (HPP)</span>
                          <span className="font-mono text-danger print:text-black">-Rp {totalHpp.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="space-y-1 pl-4 pr-4 text-secondary text-[11px]">
                          <div className="flex justify-between">
                            <span>Beban Pokok Penjualan (HPP Standard Average)</span>
                            <span className="font-mono">-Rp {totalHpp.toLocaleString('id-ID')}</span>

                          </div>
                        </div>
                        {/* Gross Profit */}
                        <div data-report-box="laba-kotor" className="flex justify-between text-sm font-extrabold text-success bg-success/10 p-2.5 rounded border border-success/30 border-opacity-35 print:bg-[#f5f5f5] print:border-black print:text-black print:border-opacity-100 print:border-solid">
                          <span>LABA KOTOR OPERASIONAL</span>
                          <span className="font-mono">Rp {labaKotor.toLocaleString('id-ID')}</span>

                        </div>
                        {/* OPEX */}
                        <div className="flex justify-between text-sm font-extrabold border-b print:border-black pb-1.5 text-primary print:text-black">
                          <span>3. BEBAN OPERASIONAL (OPEX)</span>
                          <span className="font-mono text-danger print:text-black">-Rp {totalOpex.toLocaleString('id-ID')}</span>
                        </div>
                        <div className="space-y-1.5 pl-4 pr-4 text-secondary text-[11px]">
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
                        <div data-report-box="laba-bersih" className={`flex justify-between text-base print:text-lg font-black p-4 rounded-card border ${labaBersih >= 0 ? 'bg-success/10 text-success border-success/30' : 'bg-danger/10 text-danger border-danger/30'} print:bg-[#f5f5f5] print:border-black print:border-2 print:border-opacity-100 print:text-black print:border-solid`}>
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
              {activeTab === 'arus_kas' && (() => {
                // Determine accounts to show
                const filteredLedger = arusKasFilterAkun === 'Semua Akun'
                  ? cashLedger
                  : cashLedger.filter(c => (c.akun || 'Bank') === arusKasFilterAkun);

                // Cash Ledger filters
                const periodCashTransactions = filteredLedger.filter(c => c.tanggal >= analitikStartDate && c.tanggal <= analitikEndDate);

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

                // Find beginning cash balance
                const beforeTxList = filteredLedger.filter(c => c.tanggal < analitikStartDate);

                let beginningCash = 0;
                if (arusKasFilterAkun === 'Semua Akun') {
                  const latestBalances: Record<string, number> = {};
                  beforeTxList.forEach(c => {
                    latestBalances[c.akun || 'Bank'] = c.saldo;
                  });
                  beginningCash = Object.values(latestBalances).reduce((sum, val) => sum + val, 0);
                  if (Object.keys(latestBalances).length === 0) {
                    beginningCash = 0;
                  }
                } else {
                  beginningCash = beforeTxList.length > 0 ? beforeTxList[beforeTxList.length - 1].saldo : 0;
                }
                const endingCash = beginningCash + netCashChange;

                return (
                  <div className="space-y-6">
                    {/* Date Filters */}
                    {/* ponytail: standarisasi filter periode & jangka waktu */}
                    <div className="bg-white border border-border p-3 rounded-card shadow-xs flex flex-wrap gap-4 items-center justify-between no-print">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        <h4 className="text-sm font-bold uppercase text-primary tracking-wider">Filter Periode Laporan</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary uppercase">Periode:</span>
                          <select className="text-sm font-medium text-primary p-1.5 border border-border rounded bg-slate-50 outline-none">
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="monthly" defaultValue="monthly">Bulanan</option>
                            <option value="annual">Tahunan</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary uppercase">Waktu:</span>
                          <div className="flex items-center gap-1 border border-border rounded px-2 py-1 bg-slate-50">
                            <input type="date" value={analitikStartDate} onChange={(e) => setAnalitikStartDate(e.target.value)} className="text-sm font-medium text-primary outline-none bg-transparent" />
                            <span className="text-xs font-bold text-slate-400">s/d</span>
                            <input type="date" value={analitikEndDate} onChange={(e) => setAnalitikEndDate(e.target.value)} className="text-sm font-medium text-primary outline-none bg-transparent" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Summary Cards */}
                    {(() => {
                      const currentBalances: Record<string, number> = {};
                      settingCashAccounts.forEach(acc => currentBalances[acc.nama] = 0);
                      cashLedger.forEach(c => {
                        currentBalances[c.akun || 'Bank'] = c.saldo;
                      });
                      const totalCurrentCash = Object.values(currentBalances).reduce((sum, val) => sum + val, 0);

                      return (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 no-print">
                          <div
                            onClick={() => setArusKasFilterAkun('Semua Akun')}
                            className={`p-4 rounded-card flex flex-col justify-center items-center text-center cursor-pointer transition-all shadow-sm ${arusKasFilterAkun === 'Semua Akun' ? 'bg-primary/10 border-2 border-primary' : 'bg-white border border-border hover:border-primary/50'}`}
                          >
                            <span className="text-xs font-bold text-primary uppercase mb-1">Total Saldo (Semua)</span>
                            <span className="text-lg font-black text-primary font-mono">Rp {totalCurrentCash.toLocaleString('id-ID')}</span>
                          </div>
                          {settingCashAccounts.map(acc => {
                            const bal = currentBalances[acc.nama] || 0;
                            return (
                              <div
                                key={acc.nama}
                                onClick={() => setArusKasFilterAkun(acc.nama)}
                                className={`p-4 rounded-card flex flex-col justify-center items-center text-center cursor-pointer transition-all shadow-sm ${arusKasFilterAkun === acc.nama ? 'bg-primary/10 border-2 border-primary' : 'bg-white border border-border hover:border-primary/50'}`}
                              >
                                <span className="text-xs font-bold text-secondary uppercase mb-1" title={acc.nama}>
                                  {acc.nomor ? `${acc.nomor} - ` : ''}{acc.nama}
                                </span>
                                <span className="text-lg font-black text-slate-700 font-mono">Rp {bal.toLocaleString('id-ID')}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div className="bg-white border border-border rounded-card shadow-xs p-4 flex justify-between items-center no-print">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-secondary uppercase">Filter Akun:</span>
                        <select
                          value={arusKasFilterAkun}
                          onChange={(e) => setArusKasFilterAkun(e.target.value)}
                          className="border border-border rounded px-3 py-1.5 text-sm font-bold text-primary focus:outline-none focus:ring-1 focus:ring-primary bg-slate-50"
                        >
                          <option value="Semua Akun">Semua Akun (Gabungan)</option>
                          {settingCashAccounts.map(acc => (
                            <option key={acc.nama} value={acc.nama}>{acc.nomor ? `${acc.nomor} - ${acc.nama}` : acc.nama}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* ponytail: komparasi 2 kolom (current vs prior period) pada Laporan Arus Kas */}
                    <div className="bg-white border border-border rounded-card shadow-xs overflow-hidden print-report-card">
                      <div className="text-center space-y-1 p-6 border-b border-border print:border-black print:bg-white bg-slate-50 relative">
                        <h3 className="text-xl font-black text-primary print:text-black tracking-wide uppercase">LAPORAN ARUS KAS (CASH FLOW)</h3>
                        <p className="text-sm text-primary print:text-black font-bold tracking-widest">METODE LANGSUNG (DIRECT METHOD) — DENGAN KOMPARASI</p>
                        <button
                          onClick={() => {
                            setManualCashForm({
                              tanggal: new Date().toISOString().split('T')[0],
                              keterangan: '',
                              kategori: 'Operasional Lain',
                              tipe: 'KELUAR',
                              nominal: 0,
                              akun: settingCashAccounts.length > 0 ? settingCashAccounts[0].nama : 'Bank'
                            });
                            setShowManualCashModal(true);
                          }}
                          className="absolute right-6 top-1/2 -translate-y-1/2 bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-card flex items-center gap-2 font-bold text-sm shadow transition-all cursor-pointer no-print"
                        >
                          <Plus size={16} />
                          <span>Catat Transaksi</span>
                        </button>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-slate-100 print:bg-white text-primary print:text-black uppercase tracking-widest text-[11px] font-black border-b border-border print:border-black divide-x divide-slate-200 print:divide-black">
                              <th className="p-3 w-1/2">Keterangan</th>
                              <th className="p-3 text-right w-1/4">Periode Berjalan<br /><span className="text-[9px] font-mono font-normal text-secondary print:text-black">{analitikStartDate} s/d {analitikEndDate}</span></th>
                              <th className="p-3 text-right w-1/4">Periode Sebelumnya<br /><span className="text-[9px] font-mono font-normal text-secondary print:text-black">(Prior Period - Dummy)</span></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 print:divide-black font-semibold text-secondary print:text-black">
                            {/* OPERATIONAL FLOWS */}
                            <tr className="bg-slate-50/50 print:bg-white">
                              <td colSpan={3} className="p-3 text-sm font-black text-primary print:text-black tracking-wider uppercase">1. Arus Kas dari Aktivitas Operasional</td>
                            </tr>
                            <tr className="hover:bg-slate-50 print:bg-white divide-x divide-slate-100 print:divide-black">
                              <td className="p-3 text-[12px] pl-6 print:text-black">Penerimaan Kas dari Pelanggan (SO Lunas)</td>
                              <td className="p-3 text-right font-mono text-success print:text-black">+Rp {cashInSales.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-mono text-slate-400 print:text-black">+Rp {(cashInSales * 0.85).toLocaleString('id-ID')}</td>
                            </tr>
                            <tr className="hover:bg-slate-50 print:bg-white divide-x divide-slate-100 print:divide-black">
                              <td className="p-3 text-[12px] pl-6 print:text-black">Pembayaran Kas kepada Pemasok (PO Bahan Baku)</td>
                              <td className="p-3 text-right font-mono text-danger print:text-black">-Rp {cashOutSupplier.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-mono text-slate-400 print:text-black">-Rp {(cashOutSupplier * 0.9).toLocaleString('id-ID')}</td>
                            </tr>
                            <tr className="hover:bg-slate-50 print:bg-white divide-x divide-slate-100 print:divide-black">
                              <td className="p-3 text-[12px] pl-6 print:text-black">Pembayaran Kas untuk Beban Operasional &amp; Gaji</td>
                              <td className="p-3 text-right font-mono text-danger print:text-black">-Rp {cashOutOpex.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-mono text-slate-400 print:text-black">-Rp {(cashOutOpex * 0.95).toLocaleString('id-ID')}</td>
                            </tr>
                            <tr className="bg-slate-50 print:bg-[#f5f5f5] divide-x divide-slate-100 print:divide-black border-t-2 border-border print:border-black print:border-solid">
                              <td className="p-3 text-sm font-black text-primary print:text-black pl-6">Arus Kas Bersih dari Aktivitas Operasional</td>
                              <td className="p-3 text-right font-mono font-bold text-primary print:text-black">Rp {(cashInSales - cashOutSupplier - cashOutOpex).toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-500 print:text-black">Rp {((cashInSales * 0.85) - (cashOutSupplier * 0.9) - (cashOutOpex * 0.95)).toLocaleString('id-ID')}</td>
                            </tr>

                            {/* FINANCING FLOWS */}
                            <tr className="bg-slate-50/50 print:bg-white">
                              <td colSpan={3} className="p-3 text-sm font-black text-primary print:text-black tracking-wider uppercase mt-4">2. Arus Kas dari Aktivitas Pendanaan</td>
                            </tr>
                            <tr className="hover:bg-slate-50 print:bg-white divide-x divide-slate-100 print:divide-black">
                              <td className="p-3 text-[12px] pl-6 print:text-black">Setoran Modal Pemilik / Investor</td>
                              <td className="p-3 text-right font-mono text-success print:text-black">+Rp {cashInModal.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-mono text-slate-400 print:text-black">+Rp 0</td>
                            </tr>
                            <tr className="bg-slate-50 print:bg-[#f5f5f5] divide-x divide-slate-100 print:divide-black border-t-2 border-border print:border-black print:border-solid">
                              <td className="p-3 text-sm font-black text-primary print:text-black pl-6">Arus Kas Bersih dari Aktivitas Pendanaan</td>
                              <td className="p-3 text-right font-mono font-bold text-primary print:text-black">Rp {cashInModal.toLocaleString('id-ID')}</td>
                              <td className="p-3 text-right font-mono font-bold text-slate-500 print:text-black">Rp 0</td>
                            </tr>

                            {/* NET CALCULATION */}
                            <tr className="divide-x divide-slate-100 print:divide-black border-t-[3px] border-border print:border-black print:border-solid mt-4 bg-slate-100/50 print:bg-[#f5f5f5]">
                              <td className="p-4 text-sm font-black text-primary print:text-black">Kenaikan / (Penurunan) Kas Bersih Periode Ini</td>
                              <td className={`p-4 text-right font-mono font-bold ${netCashChange >= 0 ? 'text-success print:text-black' : 'text-danger print:text-black'}`}>
                                {netCashChange >= 0 ? '+' : ''}Rp {netCashChange.toLocaleString('id-ID')}
                              </td>
                              <td className={`p-4 text-right font-mono font-bold text-slate-500 print:text-black`}>
                                {((cashInSales * 0.85) - (cashOutSupplier * 0.9) - (cashOutOpex * 0.95)) >= 0 ? '+' : ''}Rp {((cashInSales * 0.85) - (cashOutSupplier * 0.9) - (cashOutOpex * 0.95)).toLocaleString('id-ID')}
                              </td>
                            </tr>
                            <tr className="divide-x divide-slate-100 print:divide-black bg-slate-100/50 print:bg-white">
                              <td className="p-4 text-[12px] text-secondary print:text-black">Saldo Awal Kas</td>
                              <td className="p-4 text-right font-mono text-secondary print:text-black">Rp {beginningCash.toLocaleString('id-ID')}</td>
                              <td className="p-4 text-right font-mono text-slate-400 print:text-black">Rp {(beginningCash - ((cashInSales * 0.85) - (cashOutSupplier * 0.9) - (cashOutOpex * 0.95))).toLocaleString('id-ID')}</td>
                            </tr>
                            <tr className="divide-x divide-slate-200 print:divide-black bg-slate-200/50 print:bg-[#f5f5f5] border-t-2 border-border print:border-black print:border-2 print:border-solid">
                              <td className="p-4 text-sm font-black text-primary print:text-black">SALDO AKHIR KAS</td>
                              <td className="p-4 text-right font-mono font-black text-primary print:text-black text-base">Rp {endingCash.toLocaleString('id-ID')}</td>
                              <td className="p-4 text-right font-mono font-black text-slate-600 print:text-black text-base">Rp {beginningCash.toLocaleString('id-ID')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {/* 3. LAPORAN KONSINYASI RETAIL */}
              {activeTab === 'konsinyasi' && (() => {
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
                  const targetAkun = 'Bank';
                  const accountTx = cashLedger.filter(c => (c.akun || 'Bank') === targetAkun);
                  const lastBal = accountTx.length > 0 ? accountTx[accountTx.length - 1].saldo : 0;
                  const newCashLog = {
                    id: `CSH-202606${String(Math.floor(Math.random() * 90) + 10)}-00${cashLedger.length + 1}`,
                    tanggal: new Date().toISOString().split('T')[0],
                    ref: batch.id,
                    keterangan: `Pelunasan Konsinyasi [${batch.id}] kepada ${batch.consignor}`,
                    kategori: 'Operasional Lain',
                    debit: 0,
                    kredit: payoutAmount,
                    saldo: lastBal - payoutAmount,
                    akun: targetAkun
                  };

                  // Update batch to Selesai
                  const updatedConsignments = consignments.map(c => {
                    if (c.id === id) {
                      return { ...c, status: 'Selesai', catatan: `${c.catatan || ''} (Paid & Settled)` };
                    }
                    return c;
                  });

                  setCashLedger([...cashLedger, newCashLog]);
                  saveCashEntry(newCashLog);
                  setConsignments(updatedConsignments);
                  triggerToast(`Berhasil mencatat payout Rp ${payoutAmount.toLocaleString('id-ID')} ke kas!`);
                };

                return (
                  <div className="space-y-6">
                    {/* ponytail: standarisasi filter periode & jangka waktu */}
                    <div className="bg-white border border-border p-3 rounded-card shadow-xs flex flex-wrap gap-4 items-center justify-between no-print">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        <h4 className="text-sm font-bold uppercase text-primary tracking-wider">Filter Periode Laporan</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary uppercase">Periode:</span>
                          <select defaultValue="monthly" className="text-sm font-medium text-primary p-1.5 border border-border rounded bg-slate-50 outline-none">
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="monthly">Bulanan</option>
                            <option value="annual">Tahunan</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary uppercase">Waktu:</span>
                          <div className="flex items-center gap-1 border border-border rounded px-2 py-1 bg-slate-50">
                            <input type="date" value={analitikStartDate} onChange={(e) => setAnalitikStartDate(e.target.value)} className="text-sm font-medium text-primary outline-none bg-transparent" />
                            <span className="text-xs font-bold text-slate-400">s/d</span>
                            <input type="date" value={analitikEndDate} onChange={(e) => setAnalitikEndDate(e.target.value)} className="text-sm font-medium text-primary outline-none bg-transparent" />
                          </div>
                        </div>
                      </div>
                    </div>
                    {/* Consignment Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="bg-text-primary text-white p-4 rounded-card border border-slate-800 shadow-sm">
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Total Kontrak Titipan</div>
                        <div className="text-xl font-extrabold mt-1 font-mono">{totalBatches} Batch</div>

                      </div>
                      <div className="bg-white p-4 rounded-card border border-border shadow-sm">
                        <div className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Kuantitas Terjual</div>
                        <div className="text-xl font-extrabold mt-1 text-primary font-mono">{totalSoldQty} Pcs</div>

                      </div>
                      <div className="bg-white p-4 rounded-card border border-primary border-opacity-35 shadow-sm">
                        <div className="text-[11px] font-black text-primary uppercase tracking-wider">Komisi Toko Kita ({consignments[0]?.komisiPct || 20}%)</div>
                        <div className="text-xl font-extrabold mt-1 text-success font-mono">Rp {totalCommissionEarned.toLocaleString('id-ID')}</div>

                      </div>
                      <div className="bg-white p-4 rounded-card border border-danger/30 shadow-sm">
                        <div className="text-[11px] font-black text-danger uppercase tracking-wider">Hutang ke Consignor (Owner)</div>
                        <div className="text-xl font-extrabold mt-1 text-danger font-mono">Rp {totalPayableToConsignor.toLocaleString('id-ID')}</div>

                      </div>
                    </div>
                    {/* Consignment Action Row */}
                    <div className="flex justify-between items-center bg-white p-4 rounded-card border border-border shadow-xs">
                      <div className="text-sm text-secondary font-semibold">Gunakan modul ini untuk melacak titipan barang retail (Consign-In).</div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowSellConsignmentModal(true)}
                          className="bg-warning/100 hover:bg-warning text-white px-3 py-1.5 rounded-card text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <TrendingUp size={13} />
                          <span>Catat Penjualan Titipan</span>
                        </button>
                        <button
                          onClick={() => setShowAddConsignmentModal(true)}
                          className="bg-primary hover:bg-success text-white px-3 py-1.5 rounded-card text-sm font-bold shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <Plus size={13} />
                          <span>Terima Barang Baru</span>
                        </button>

                      </div>
                    </div>
                    {/* Consignment Table */}
                    <div className="bg-white border border-border rounded-card shadow-xs overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-border flex justify-between items-center">
                        <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider">Daftar Barang Titipan Konsinyasi (Consignment-In)</h4>
                        <span className="text-[11px] font-mono text-slate-400">Total {consignments.length} records</span>

                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-slate-100 text-secondary border-b border-border font-extrabold uppercase tracking-widest text-[11px]">
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
                          <tbody className="divide-y divide-slate-100 font-semibold text-primary">
                            {consignments.map((c: any) => {
                              const remaining = c.qtyReceived - c.qtySold - c.qtyReturned;
                              const grossSales = c.qtySold * c.harga;
                              const ourCommission = grossSales * (c.komisiPct / 100);
                              const payable = grossSales - ourCommission;

                              return (
                                <tr key={c.id} className="hover:bg-slate-50">
                                  <td className="p-3">
                                    <div className="font-mono text-[11px] font-black text-primary">{c.id}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">{c.tanggal}</div>
                                  </td>
                                  <td className="p-3 text-primary font-bold">{c.consignor}</td>
                                  <td className="p-3">
                                    <div className="font-bold text-primary">{c.nama}</div>
                                    <div className="font-mono text-[11px] text-slate-400">{c.sku}</div>
                                  </td>
                                  <td className="p-3 text-center">
                                    <div className="font-mono">
                                      <span className="text-primary font-bold">{c.qtyReceived}</span>
                                      <span className="text-slate-400"> / </span>
                                      <span className="text-success font-bold">{c.qtySold}</span>
                                      <span className="text-slate-400"> / </span>
                                      <span className="text-warning font-bold">{remaining}</span>
                                    </div>
                                  </td>
                                  <td className="p-3 text-right font-mono">Rp {c.harga.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-center text-primary font-black">{c.komisiPct}%</td>
                                  <td className="p-3 text-right font-mono">Rp {grossSales.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-right font-mono text-danger">Rp {payable.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-center">
                                    <Badge variant={c.status === 'Aktif' ? 'success' : 'neutral'}>
                                      {c.status}
                                    </Badge>
                                  </td>
                                  <td className="p-3 text-center">
                                    {c.status === 'Aktif' && payable > 0 ? (
                                      <button
                                        onClick={() => handleSettlePayout(c.id)}
                                        className="bg-danger/10 hover:bg-danger/20 text-danger border border-danger/30 px-2 py-1 rounded text-[11px] font-extrabold transition-all"
                                      >
                                        Settle &amp; Bayar
                                      </button>
                                    ) : (
                                      <span className="text-slate-400 text-[11px] italic">No Action / Settled</span>
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
                      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                        <form onSubmit={handleAddConsignment} className="bg-white rounded-card shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in relative my-auto">
                          <div className="bg-slate-50 border-b border-border text-primary p-4 flex justify-between items-center">
                            <h4 className="font-extrabold text-sm uppercase tracking-wider text-primary">Terima Barang Titipan Baru</h4>
                            <button type="button" onClick={() => setShowAddConsignmentModal(false)} className="text-slate-400 hover:text-primary cursor-pointer"><X size={16} /></button>
                          </div>
                          <div className="p-5 space-y-3 text-sm">
                            <div className="space-y-1">
                              <label className="font-bold text-secondary uppercase text-xs">Nama Consignor (Supplier Titipan)</label>
                              <input
                                type="text"
                                value={consignmentForm.consignor}
                                onChange={(e) => setConsignmentForm({ ...consignmentForm, consignor: e.target.value })}
                                placeholder="Contoh: CV. Bakery Supplier"
                                className="w-full p-2 border rounded border-border font-semibold"
                                required
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="font-bold text-secondary uppercase text-xs">SKU Barang Titipan</label>
                                <input
                                  type="text"
                                  value={consignmentForm.sku}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, sku: e.target.value })}
                                  placeholder="CON-0003"
                                  className="w-full p-2 border rounded border-border font-mono font-bold uppercase"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-secondary uppercase text-xs">Nama Barang</label>
                                <input
                                  type="text"
                                  value={consignmentForm.nama}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, nama: e.target.value })}
                                  placeholder="Roti Sobek Coklat"
                                  className="w-full p-2 border rounded border-border font-semibold"
                                  required
                                />
                              </div>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <label className="font-bold text-secondary uppercase text-xs">Qty Dititipkan</label>
                                <input
                                  type="text" inputMode="numeric"
                                  value={consignmentForm.qtyReceived}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, qtyReceived: parseInt(e.target.value) || 0 })}
                                  className="w-full p-2 border rounded border-border font-bold text-right"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-secondary uppercase text-xs">Harga Jual Unit</label>
                                <input
                                  type="text" inputMode="numeric"
                                  value={consignmentForm.harga}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, harga: parseInt(e.target.value) || 0 })}
                                  className="w-full p-2 border rounded border-border font-bold text-right"
                                  required
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="font-bold text-secondary uppercase text-xs">Komisi Toko %</label>
                                <input
                                  type="text" inputMode="numeric"
                                  value={consignmentForm.komisiPct}
                                  onChange={(e) => setConsignmentForm({ ...consignmentForm, komisiPct: parseInt(e.target.value) || 0 })}
                                  className="w-full p-2 border rounded border-border font-bold text-right text-primary"
                                  required
                                />
                              </div>
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-secondary uppercase text-xs">Catatan / Syarat</label>
                              <textarea
                                value={consignmentForm.catatan}
                                onChange={(e) => setConsignmentForm({ ...consignmentForm, catatan: e.target.value })}
                                placeholder="Syarat titipan..."
                                className="w-full p-2 border rounded border-border"
                              />
                            </div>
                          </div>
                          <div className="bg-slate-50 p-4 flex justify-end gap-2 border-t">
                            <button type="button" onClick={() => setShowAddConsignmentModal(false)} className="px-3 py-2 bg-slate-200 text-primary font-bold rounded">Batal</button>
                            <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded">Simpan Penerimaan</button>
                          </div>
                        </form>
                      </div>
                    )}


                    {/* MODAL 2: SELL CONSIGNMENT */}
                    {showSellConsignmentModal && (
                      <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
                        <form onSubmit={handleSellConsignment} className="bg-white rounded-card shadow-xl border border-border w-full max-w-sm overflow-hidden animate-fade-in relative my-auto">
                          <div className="bg-slate-50 border-b border-border text-primary p-4 flex justify-between items-center">
                            <h4 className="font-extrabold text-sm uppercase tracking-wider text-primary">Catat Penjualan Barang Konsinyasi</h4>
                            <button type="button" onClick={() => setShowSellConsignmentModal(false)} className="text-slate-400 hover:text-primary cursor-pointer"><X size={16} /></button>
                          </div>
                          <div className="p-5 space-y-3 text-sm">
                            <div className="space-y-1">
                              <label className="font-bold text-secondary uppercase text-xs">Pilih Batch Barang Titipan</label>
                              <SearchableSelect
                                value={consignmentSellForm.id}
                                onChange={(val) => setConsignmentSellForm({ ...consignmentSellForm, id: val })}
                                options={consignments.filter((c: any) => c.status === 'Aktif').map((c: any) => {
                                  const available = c.qtyReceived - c.qtySold - c.qtyReturned;
                                  return { label: `${c.nama} (${c.consignor}) • Sisa: ${available} pcs`, value: c.id };
                                })}
                                placeholder="-- Pilih Batch Titipan --"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="font-bold text-secondary uppercase text-xs">Kuantitas Terjual Baru</label>
                              <input
                                type="text" inputMode="numeric"
                                min="1"
                                value={consignmentSellForm.qtySold}
                                onChange={(e) => setConsignmentSellForm({ ...consignmentSellForm, qtySold: parseInt(e.target.value) || 0 })}
                                className="w-full p-2 border rounded border-border font-extrabold text-right"
                                required
                              />
                            </div>
                          </div>
                          <div className="bg-slate-50 p-4 flex justify-end gap-2 border-t">
                            <button type="button" onClick={() => setShowSellConsignmentModal(false)} className="px-3 py-2 bg-slate-200 text-primary font-bold rounded">Batal</button>
                            <button type="submit" className="px-4 py-2 bg-primary text-white font-bold rounded">Catat Terjual</button>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                );
              })()}




              {/* 6. PAJAK (PPN) */}
              {activeTab === 'pajak_ppn' && (() => {
                const taxSOs = salesOrders.filter(so => so.tanggal >= analitikStartDate && so.tanggal <= analitikEndDate && so.statusLogistik !== 'Void' && so.pajak > 0);
                const ppnKeluaran = taxSOs.reduce((sum, so) => sum + so.pajak, 0);
                const dppKeluaran = taxSOs.reduce((sum, so) => sum + so.subtotal, 0);

                const taxPOs = purchaseOrders.filter(po => po.tanggal >= analitikStartDate && po.tanggal <= analitikEndDate && po.statusLogistik !== 'Void' && po.pajak > 0);
                const ppnMasukan = taxPOs.reduce((sum, po) => sum + po.pajak, 0);
                const dppMasukan = taxPOs.reduce((sum, po) => sum + po.subtotal, 0);

                const ppnKurangBayar = ppnKeluaran - ppnMasukan;

                return (
                  <div className="space-y-6">
                    {/* ponytail: standarisasi filter periode & jangka waktu */}
                    <div className="bg-white border border-border p-3 rounded-card shadow-xs flex flex-wrap gap-4 items-center justify-between no-print">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-primary rounded-full"></span>
                        <h4 className="text-sm font-bold uppercase text-primary tracking-wider">Filter Periode Laporan</h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary uppercase">Periode:</span>
                          <select defaultValue="monthly" className="text-sm font-medium text-primary p-1.5 border border-border rounded bg-slate-50 outline-none">
                            <option value="daily">Harian</option>
                            <option value="weekly">Mingguan</option>
                            <option value="monthly">Bulanan</option>
                            <option value="annual">Tahunan</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-secondary uppercase">Waktu:</span>
                          <div className="flex items-center gap-1 border border-border rounded px-2 py-1 bg-slate-50">
                            <input type="date" value={analitikStartDate} onChange={(e) => setAnalitikStartDate(e.target.value)} className="text-sm font-medium text-primary outline-none bg-transparent" />
                            <span className="text-xs font-bold text-slate-400">s/d</span>
                            <input type="date" value={analitikEndDate} onChange={(e) => setAnalitikEndDate(e.target.value)} className="text-sm font-medium text-primary outline-none bg-transparent" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="bg-white border border-border p-6 rounded-card shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-2">
                          <Calculator size={16} />
                          Laporan Rekapitulasi Pajak PPN
                        </h4>
                        <p className="text-sm text-secondary mt-1">Ringkasan PPN Masukan (Pembelian) dan PPN Keluaran (Penjualan) untuk perhitungan Kurang/Lebih Bayar.</p>

                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-white border border-border p-5 rounded-card shadow-sm">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total PPN Keluaran</div>
                        <div className="text-2xl font-black text-primary">Rp {ppnKeluaran.toLocaleString('id-ID')}</div>
                        <div className="text-[11px] text-secondary mt-1">Dari Total Penjualan (DPP): Rp {dppKeluaran.toLocaleString('id-ID')}</div>
                      </div>
                      <div className="bg-white border border-border p-5 rounded-card shadow-sm">
                        <div className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-2">Total PPN Masukan</div>
                        <div className="text-2xl font-black text-primary">Rp {ppnMasukan.toLocaleString('id-ID')}</div>
                        <div className="text-[11px] text-secondary mt-1">Dari Total Pembelian (DPP): Rp {dppMasukan.toLocaleString('id-ID')}</div>
                      </div>
                      <div className={`border p-5 rounded-card shadow-sm ${ppnKurangBayar > 0 ? 'bg-danger/10 border-danger/30 text-danger' : 'bg-success/10 border-success/30 text-success'}`}>
                        <div className="text-sm font-bold uppercase tracking-wider mb-2">
                          {ppnKurangBayar > 0 ? 'PPN Kurang Bayar' : 'PPN Lebih Bayar / Nihil'}
                        </div>
                        <div className="text-2xl font-black">Rp {Math.abs(ppnKurangBayar).toLocaleString('id-ID')}</div>
                        <div className="text-[11px] mt-1 font-medium">
                          {ppnKurangBayar > 0 ? 'Status: Wajib lapor dan bayar ke Kas Negara' : 'Status: Dapat dikompensasi ke masa pajak berikutnya'}

                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-border p-4">
                          <h4 className="text-sm font-bold text-primary uppercase">Rincian Faktur Keluaran (Penjualan)</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-secondary">
                              <tr>
                                <th className="p-3">No. Doc</th>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Customer</th>
                                <th className="p-3 text-right">DPP</th>
                                <th className="p-3 text-right">PPN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {taxSOs.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">Tidak ada transaksi yang dikenakan PPN.</td>
                                </tr>
                              ) : taxSOs.map(so => (
                                <tr key={so.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-primary">{so.id}</td>
                                  <td className="p-3 text-secondary">{so.tanggal}</td>
                                  <td className="p-3 font-medium">{so.pelanggan}</td>
                                  <td className="p-3 text-right font-mono text-secondary">Rp {so.subtotal.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-right font-mono font-bold text-primary">Rp {so.pajak.toLocaleString('id-ID')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                        </div>
                      </div>
                      <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden">
                        <div className="bg-slate-50 border-b border-border p-4">
                          <h4 className="text-sm font-bold text-primary uppercase">Rincian Faktur Masukan (Pembelian)</h4>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-secondary">
                              <tr>
                                <th className="p-3">No. Doc</th>
                                <th className="p-3">Tanggal</th>
                                <th className="p-3">Supplier</th>
                                <th className="p-3 text-right">DPP</th>
                                <th className="p-3 text-right">PPN</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {taxPOs.length === 0 ? (
                                <tr>
                                  <td colSpan={5} className="p-4 text-center text-slate-400 italic">Tidak ada transaksi yang dikenakan PPN.</td>
                                </tr>
                              ) : taxPOs.map(po => (
                                <tr key={po.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-mono font-bold text-primary">{po.id}</td>
                                  <td className="p-3 text-secondary">{po.tanggal}</td>
                                  <td className="p-3 font-medium">{po.supplier}</td>
                                  <td className="p-3 text-right font-mono text-secondary">Rp {po.subtotal.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-right font-mono font-bold text-primary">Rp {po.pajak.toLocaleString('id-ID')}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* 5. LAPORAN PENJUALAN HARIAN */}
              {activeTab === 'penjualan_harian' && (() => {
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
                    <div className="bg-white border border-border p-4 rounded-card shadow-xs flex flex-wrap gap-4 items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-primary rounded-full"></span>
                        <h4 className="text-sm font-bold uppercase text-primary tracking-wider">Pilih Bulan Penjualan Harian</h4>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={dailySalesReportMonth}
                          onChange={(e) => setDailySalesReportMonth(e.target.value)}
                          className="p-2.5 border border-border rounded-card text-sm font-bold text-primary bg-white shadow-xs"
                        >
                          <option value="2026-05">Mei 2026</option>
                          <option value="2026-06">Juni 2026</option>
                          <option value="2026-07">Juli 2026</option>
                        </select>

                      </div>
                    </div>
                    {/* Huge Daily Sales Matrix */}
                    <div className="bg-white border border-border rounded-card shadow-xs overflow-hidden">
                      <div className="p-4 bg-slate-50 border-b border-border flex justify-between items-center">
                        <h4 className="text-sm font-extrabold text-primary uppercase tracking-wider flex items-center gap-2">
                          <span>📅 Laporan Penjualan Harian per Barang</span>
                          <span className="text-[11px] text-primary bg-success/10 px-2 py-0.5 rounded font-bold border border-success/30">{getMonthNameIndo(monthInt)} {year}</span>
                        </h4>
                        <span className="text-[11px] text-slate-400 font-mono">Geser tabel ke kanan untuk melihat s/d akhir tanggal</span>

                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm border-collapse">
                          <thead>
                            <tr className="bg-primary text-white uppercase tracking-widest text-[8px] font-black divide-x divide-teal-600">
                              <th className="p-3 bg-primary text-white sticky left-0 z-10 w-44 border-r border-teal-600">Nama Barang (SKU)</th>
                              {daysArray.map(day => (
                                <th key={day} className="p-2 text-center w-10 min-w-[36px] bg-primary text-white">
                                  {day}
                                </th>
                              ))}
                              <th className="p-3 text-right bg-primary text-white w-24">Total Qty</th>
                              <th className="p-3 text-right bg-primary text-white w-32">Total Nilai</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 font-semibold text-primary">
                            {products.filter(p => p.kategori === 'Barang Jadi').map((p: any) => {
                              let totalQtySold = 0;
                              let totalRevenue = 0;

                              return (
                                <tr key={p.sku} className="hover:bg-slate-50 divide-x divide-slate-200">
                                  {/* Fixed First Column */}
                                  <td className="p-3 bg-white sticky left-0 z-10 border-r border-border shadow-[2px_0_5px_rgba(0,0,0,0.03)] font-bold text-primary w-44">
                                    <div className="truncate text-[11px]">{p.nama}</div>
                                    <div className="font-mono text-[11px] text-primary">{p.sku}</div>
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
                                      <td key={day} className={`p-2 text-center font-mono text-[11px] ${dailyQty > 0 ? 'bg-success/10 text-success font-bold border border-teal-100' : 'text-slate-400'}`}>
                                        {dailyQty > 0 ? dailyQty : '-'}
                                      </td>
                                    );
                                  })}

                                  {/* Aggregates Columns */}
                                  <td className="p-3 text-right font-mono font-black text-primary w-24">
                                    {totalQtySold.toLocaleString('id-ID')}
                                  </td>
                                  <td className="p-3 text-right font-mono font-black text-primary w-32">
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
              {/* ponytail: sticky bottom footer ekspor PDF & Excel untuk semua laporan */}
              <div className="sticky bottom-0 z-30 flex items-center justify-end gap-3 p-3 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg print:hidden rounded-b-xl">
                <button
                  onClick={() => {
                    if (activeTab === 'laba_rugi') {
                      exportElementToPDF('laba-rugi-print-section', `Laporan_Laba_Rugi_${analitikStartDate}_${analitikEndDate}.pdf`);
                    } else {
                      window.focus();
                      window.print();
                    }
                  }}
                  disabled={isExportingPDF}
                  className={`bg-primary hover:bg-teal-700 text-white px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer ${isExportingPDF ? 'opacity-70 cursor-not-allowed' : ''}`}
                >
                  {isExportingPDF ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <Printer size={15} />
                  )}
                  <span>{activeTab === 'laba_rugi' ? 'Download PDF' : 'Cetak PDF'}</span>
                </button>
                <button
                  onClick={() => {
                    triggerToast("Laporan berhasil diunduh dalam format Excel!", "success");
                  }}
                  className="bg-success hover:bg-teal-600 text-white px-4 py-2 text-sm font-bold rounded-lg flex items-center gap-1.5 shadow transition-all cursor-pointer"
                >
                  <FileSpreadsheet size={15} />
                  <span>Unduh Excel (.xlsx)</span>
                </button>
              </div>
            </div>

          )}

          {/* TAB 8: PENGATURAN / SETTING */}
          {activeTab === 'setting' && (
            <div className="space-y-6">
              {/* Header Panel */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 shadow-md text-white">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-success/100/10 rounded-card border border-teal-500/20">
                    <Settings className="text-primary" size={24} />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold tracking-tight">⚙️ Pusat Pengaturan &amp; Konfigurasi Sistem</h2>
                    <p className="text-sm text-slate-400">Pusat Konfigurasi INO ERP | Atur profil usaha, referensi dropdown, prefix SKU, saluran platform, tipe bisnis, dan hak akses staf.</p>

                  </div>
                </div>
              </div>
              {/* Sub Navigation Tabs */}
              <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px scrollbar-none">
                {[
                  { id: 'profil', label: '🏪 Profil Toko' },
                  { id: 'user', label: '👤 Pengguna & Sandi' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSettingSubTab(tab.id)}
                    className={`flex items-center gap-1.5 px-4 py-3 text-sm font-bold transition-all border-b-2 whitespace-nowrap ${settingSubTab === tab.id
                        ? 'border-primary text-primary bg-success/10'
                        : 'border-transparent text-secondary hover:text-primary hover:bg-slate-55'
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
                  <div className="bg-white border border-border rounded-card p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                      <Settings className="text-primary" size={16} />
                      <span>🏪 Identitas Toko</span>
                    </h3>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[11px] font-black uppercase text-secondary mb-1">Nama Toko *</label>
                        <input
                          type="text"
                          value={namaToko}
                          onChange={(e) => setNamaToko(e.target.value)}
                          className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white"
                          placeholder="Masukkan nama toko..."
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase text-secondary mb-1">Alamat Lengkap</label>
                        <input
                          type="text"
                          value={alamatToko}
                          onChange={(e) => setAlamatToko(e.target.value)}
                          className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white"
                          placeholder="Jl. Contoh No. 1, Kota"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-secondary mb-1">No. Telepon / WhatsApp</label>
                          <input
                            type="text"
                            value={telpToko}
                            onChange={(e) => setTelpToko(e.target.value)}
                            className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white"
                            placeholder="081234567890"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase text-secondary mb-1">Kota</label>
                          <input
                            type="text"
                            value={kotaToko}
                            onChange={(e) => setKotaToko(e.target.value)}
                            className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white"
                            placeholder="Bali"
                          />

                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Finansial & File System */}
                  <div className="bg-white border border-border rounded-card p-5 shadow-xs space-y-4">
                    <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                      <DollarSign className="text-primary" size={16} />
                      <span>💰 Keuangan &amp; File</span>
                    </h3>

                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-secondary mb-1">PPN Rate (%)</label>
                          <input
                            type="text" inputMode="numeric"
                            value={Math.round(ppnRate * 100)}
                            onChange={(e) => setPpnRate((parseFloat(e.target.value) || 0) / 100)}
                            className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white font-mono"
                            min="0"
                            max="30"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase text-secondary mb-1">Metode HPP</label>
                          <select
                            value={metodeHppDefault}
                            onChange={(e) => setMetodeHppDefault(e.target.value)}
                            className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white"
                          >
                            <option value="Moving Average">Moving Average</option>
                            <option value="FIFO">FIFO</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase text-secondary mb-1">Mata Uang</label>
                          <input
                            type="text"
                            value={mataUang}
                            onChange={(e) => setMataUang(e.target.value)}
                            className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white font-mono"
                          />

                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase text-secondary mb-1">Google Drive Folder ID (Struk PDF)</label>
                        <input
                          type="text"
                          value={driveFolderStruk}
                          onChange={(e) => setDriveFolderStruk(e.target.value)}
                          className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white font-mono"
                          placeholder="ID Folder..."
                        />

                      </div>
                      <div>
                        <label className="block text-[11px] font-black uppercase text-secondary mb-1">Format Tanggal</label>
                        <input
                          type="text"
                          value={formatTanggal}
                          onChange={(e) => setFormatTanggal(e.target.value)}
                          className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white font-mono"
                        />

                      </div>
                    </div>
                  </div>
                  {/* TIPE BISNIS MOVED HERE */}
                  <div className="bg-white border border-border rounded-card p-5 shadow-xs space-y-4 md:col-span-2">
                    <div className="border-b pb-2">
                      <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2">
                        <Layers className="text-primary" size={16} />
                        <span>Tipe Bisnis &amp; Modul Aktif</span>
                      </h3>
                      <p className="text-sm text-secondary mt-1">
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
                          className={`text-left p-4 rounded-card border-2 transition-all flex flex-col gap-1.5 h-full ${tipeBisnis === item.id
                              ? 'bg-success/10 border-primary shadow-sm'
                              : 'bg-white border-slate-150 hover:bg-slate-50/50 hover:border-border'
                            }`}
                        >
                          <div className="flex justify-between items-start w-full">
                            <span className="font-extrabold text-sm text-primary leading-tight">{item.title}</span>
                            <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full whitespace-nowrap ${tipeBisnis === item.id ? 'bg-success/20 text-success' : 'bg-slate-100 text-secondary'
                              }`}>
                              {item.badge}
                            </span>
                          </div>
                          <p className="text-[11px] text-secondary leading-normal mt-1">{item.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB CONTENT: PENGGUNA */}
              {settingSubTab === 'user' && (
                <div className="space-y-6 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Status Login Switch */}
                    <div className="bg-white border border-border rounded-card p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-black text-primary uppercase tracking-wider block">🔒 Gerbang Autentikasi Login</h3>
                          <span className="text-[11px] text-slate-400">Aktifkan form autentikasi di layar utama</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={isLoginActive}
                            onChange={(e) => {
                              const val = e.target.checked;
                              if (val) {
                                if (loginUsername.trim() === '' || loginPassword.trim() === '') {
                                  alert('Silakan atur Username dan Password Superadmin terlebih dahulu sebelum mengunci sistem!');
                                  return;
                                }
                                setIsLoginActive(val);
                                setIsLoggedIn(false);
                                triggerToast('Keamanan login aktif! Silakan masuk dengan kredensial Anda.', 'success');
                              } else {
                                setIsLoginActive(val);
                                setIsLoggedIn(true);
                                triggerToast('Keamanan dinonaktifkan.', 'warning');
                              }
                            }}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        </label>

                      </div>
                      <div className="p-3.5 bg-success/10 text-success rounded-card border border-emerald-150 text-[11px] font-semibold leading-relaxed">
                        {isLoginActive
                          ? '🔒 Proteksi Aktif: Sistem terkunci otomatis saat pertama kali dibuka, memerlukan kredensial masuk.'
                          : '✅ Akses Bebas Aktif: Siapa pun dapat mengoperasikan sistem ERP tanpa meminta kata sandi.'
                        }

                      </div>
                    </div>
                    {/* Superadmin Credentials */}
                    <div className="bg-white border border-border rounded-card p-5 shadow-xs space-y-3">
                      <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                        <Lock className="text-primary" size={14} />
                        <span>👑 Akun Superadmin Utama</span>
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-black uppercase text-secondary mb-1">Username Admin</label>
                          <input
                            type="text"
                            value={loginUsername}
                            onChange={(e) => setLoginUsername(e.target.value)}
                            className="w-full p-2.5 border border-border rounded-card text-sm font-bold font-mono text-primary focus:ring-1 focus:ring-primary bg-white shadow-inner"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-black uppercase text-secondary mb-1">Password Sistem</label>
                          <input
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            onBlur={async (e) => {
                              const val = e.target.value;
                              if (val && !(val.length === 64 && /^[0-9a-f]{64}$/i.test(val))) {
                                setLoginPassword(await hashPassword(val));
                              }
                            }}
                            className="w-full p-2.5 border border-border rounded-card text-sm font-bold font-mono text-primary focus:ring-1 focus:ring-primary bg-white shadow-inner"
                          />
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 italic mt-1">Superadmin memiliki hak akses tak terbatas ke seluruh data keuangan dan konfigurasi.</p>

                    </div>
                  </div>
                  {/* Team Members List */}
                  <div className="bg-white border border-border rounded-card p-5 shadow-xs space-y-3">
                    <div className="flex justify-between items-center border-b pb-2">
                      <div>
                        <h3 className="text-sm font-black text-primary uppercase tracking-wider">👤 Daftar Pengguna &amp; Otoritas Tim</h3>
                        <p className="text-[11px] text-slate-400">Atur PIN masuk untuk tim operasional gudang dan kasir.</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSettingUsersList([...settingUsersList, { email: '', nama: '', role: 'Kasir', pin: '' }])}
                        className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white text-[11px] font-bold rounded-card shadow-xs"
                      >
                        + Tambah Staf
                      </button>

                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead>
                          <tr className="bg-slate-50 text-secondary uppercase tracking-wider text-[11px] font-bold border-b">
                            <th className="p-3">Email / Username</th>
                            <th className="p-3">Nama Lengkap</th>
                            <th className="p-3">Role</th>
                            <th className="p-3 text-center">PIN (4-6 Digit)</th>
                            <th className="p-3 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-primary">
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
                                  className="w-full p-2 border border-border rounded-card text-sm"
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
                                  className="w-full p-2 border border-border rounded-card text-sm"
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
                                  className="p-2 border border-border rounded-card text-sm font-bold text-primary bg-white"
                                >
                                  <option value="Admin">Admin</option>
                                  <option value="Manager">Manager</option>
                                  <option value="Kasir">Kasir</option>
                                  <option value="Gudang">Gudang</option>
                                </select>
                              </td>
                              <td className="p-2">
                                <input
                                  type="password"
                                  value={usr.pin}
                                  onChange={(e) => {
                                    const arr = [...settingUsersList];
                                    arr[idx] = { ...usr, pin: e.target.value };
                                    setSettingUsersList(arr);
                                  }}
                                  onBlur={async (e) => {
                                    const val = e.target.value;
                                    if (val && !(val.length === 64 && /^[0-9a-f]{64}$/i.test(val))) {
                                      const arr = [...settingUsersList];
                                      arr[idx] = { ...usr, pin: await hashPassword(val) };
                                      setSettingUsersList(arr);
                                    }
                                  }}
                                  className="w-24 mx-auto block text-center p-2 border border-border rounded-card text-sm font-mono font-bold"
                                  placeholder="PIN..."
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  onClick={() => setSettingUsersList(settingUsersList.filter((_, i) => i !== idx))}
                                  className="text-danger hover:text-danger p-1 rounded-card hover:bg-danger/10"
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
              {/* Reset Database Button */}
              <div className="bg-slate-100 rounded-card p-5 border border-border flex flex-col sm:flex-row justify-between items-center gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-primary">⚠️ Sinkronisasi Berhasil</h4>
                  <p className="text-[11px] text-secondary">Semua pengaturan disimpan otomatis ke penyimpanan lokal browser Anda.</p>
                  <button
                    onClick={() => {
                      const confirmReset = window.confirm('Apakah Anda yakin ingin menyetel ulang seluruh database simulasi ke kondisi awal pabrik? Tindakan ini tidak dapat dibatalkan.');
                      if (confirmReset) {
                        localStorage.clear();
                        window.location.reload();
                      }
                    }}
                    className="px-4 py-2 bg-danger hover:bg-danger text-white font-extrabold text-[11px] rounded-card transition-all uppercase tracking-wider whitespace-nowrap"
                  >
                    Reset Seluruh Data Simulasi
                  </button>
                </div>
              </div>
            </div>
          )}

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
                  saveAllProducts(mapped);
                  successCount = mapped.length;
                } else {
                  const next = [...products];
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
                  setProducts(next);
                  saveAllProducts(next);
                }
              } else if (importTargetType === 'pelanggan') {
                const mapped = parsedImportRows.map(row => mapCustomerRow(row, parsedImportHeaders));

                if (importMethod === 'overwrite') {
                  setCustomers(mapped);
                  saveAllCustomers(mapped);
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
                    saveAllCustomers(next);
                    return next;
                  });
                }
              } else if (importTargetType === 'supplier') {
                const mapped = parsedImportRows.map(row => mapSupplierRow(row, parsedImportHeaders));

                if (importMethod === 'overwrite') {
                  setSuppliers(mapped);
                  saveAllSuppliers(mapped);
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
                    saveAllSuppliers(next);
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
                    <div className="p-3 bg-success/100/10 rounded-card border border-teal-500/20">
                      <FileSpreadsheet className="text-primary" size={24} />
                    </div>
                    <div>
                      <h2 className="text-lg font-extrabold tracking-tight">📊 Pusat Sinkronisasi &amp; Integrasi Google Sheets / Excel</h2>
                      <p className="text-sm text-slate-400">Unduh template pengisian kosong, ekspor seluruh database ke file Excel siap cetak, atau impor data masal dari Google Sheets.</p>

                    </div>
                  </div>
                </div>
                {/* Sub Tab Navigation */}
                <div className="flex bg-slate-100 p-1 rounded-card border border-border w-full max-w-lg">
                  {[
                    { id: 'ekspor', label: '📥 Ekspor &amp; Template' },
                    { id: 'impor', label: '📤 Impor Data' },
                    { id: 'gas', label: '💻 Google Apps Script (GAS)' }
                  ].map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setSheetsHubSubTab(st.id as any)}
                      className={`flex-1 px-4 py-2.5 text-[11px] font-black uppercase tracking-wider rounded-card transition-all cursor-pointer ${sheetsHubSubTab === st.id
                          ? 'bg-primary text-white shadow'
                          : 'text-secondary hover:text-primary'
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
                    <div className="bg-white border border-border rounded-card p-5 shadow-xs space-y-4">
                      <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                        <Download size={16} className="text-primary" />
                        <span>Unduh Template Tempat Pengisian Data (Google Sheet)</span>
                      </h3>
                      <p className="text-sm text-secondary leading-relaxed font-semibold">
                        Gunakan file Excel/CSV di bawah ini sebagai template pengisian di Google Sheets Anda. Setelah diisi, data dapat Anda copy-paste atau upload langsung pada tab <strong>Impor Data</strong>.
                      </p>

                      <div className="space-y-2 pt-2">
                        <button
                          type="button"
                          onClick={() => downloadBlankTemplate('produk')}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-success/10 border border-border rounded-card transition-colors group"
                        >
                          <div>
                            <p className="text-sm font-bold text-primary group-hover:text-primary">📝 Template Impor Master Produk</p>
                            <p className="text-[11px] text-secondary mt-0.5">Berisi kolom SKU, Kategori, Harga Jual, HPP, Safety Stock, dll.</p>
                          </div>
                          <Download size={14} className="text-slate-400 group-hover:text-primary" />
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadBlankTemplate('pelanggan')}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-success/10 border border-border rounded-card transition-colors group"
                        >
                          <div>
                            <p className="text-sm font-bold text-primary group-hover:text-primary">👥 Template Impor Master Pelanggan</p>
                            <p className="text-[11px] text-secondary mt-0.5">Berisi kolom ID Pelanggan, Nama Instansi, Kontak, Alamat, dll.</p>
                          </div>
                          <Download size={14} className="text-slate-400 group-hover:text-primary" />
                        </button>

                        <button
                          type="button"
                          onClick={() => downloadBlankTemplate('supplier')}
                          className="w-full flex items-center justify-between p-3.5 bg-slate-50 hover:bg-success/10 border border-border rounded-card transition-colors group"
                        >
                          <div>
                            <p className="text-sm font-bold text-primary group-hover:text-primary">🏭 Template Impor Master Supplier</p>
                            <p className="text-[11px] text-secondary mt-0.5">Berisi kolom ID Supplier, Nama Perusahaan, Kontak, dll.</p>
                          </div>
                          <Download size={14} className="text-slate-400 group-hover:text-primary" />
                        </button>

                      </div>
                    </div>
                    {/* Panel Kanan: Ekspor Database Aktif */}
                    <div className="bg-white border border-border rounded-card p-5 shadow-xs flex flex-col justify-between space-y-4">
                      <div>
                        <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2 border-b pb-2">
                          <Database size={16} className="text-warning" />
                          <span>Ekspor Seluruh Database ERP Aktif</span>
                        </h3>
                        <p className="text-sm text-secondary leading-relaxed mt-2 font-semibold">
                          Unduh seluruh data ERP saat ini (Produk, Pelanggan, Supplier, dan Formula Resep BOM) ke dalam satu workbook Excel (.xlsx) dengan tab terpisah yang rapi dan siap dicetak/diunggah ke Google Drive.
                        </p>

                        <div className="mt-4 p-4 bg-warning/10 border border-warning/30 rounded-card text-sm text-warning flex items-start gap-2.5">
                          <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold">Informasi Backup Otomatis:</span>
                            <p className="text-[11px] text-warning/90 mt-0.5">Disarankan untuk mengekspor database secara berkala sebagai backup lokal yang aman sebelum melakukan penimpaan data masal.</p>

                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={exportDatabaseToExcel}
                        className="w-full py-3 bg-gradient-to-r from-teal-500 to-primary hover:from-primary hover:to-teal-600 text-white font-extrabold text-sm uppercase tracking-wider rounded-card shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FileSpreadsheet size={16} />
                        <span>Unduh File Excel Database Lengkap (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* SUB TAB 2: IMPORT DATA FROM SHEETS */}
                {sheetsHubSubTab === 'impor' && (
                  <div className="bg-white border border-border rounded-card p-6 shadow-sm space-y-6 animate-fade-in">
                    <div className="flex flex-col lg:flex-row gap-6">
                      {/* Form Impor */}
                      <div className="flex-1 space-y-4">
                        <h3 className="text-sm font-black text-primary uppercase tracking-wider border-b pb-2">⚙️ Konfigurasi Impor</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[11px] font-black uppercase text-secondary mb-1">Pilih Target Tabel Database *</label>
                            <select
                              value={importTargetType}
                              onChange={(e) => {
                                setImportTargetType(e.target.value as any);
                                setParsedImportHeaders([]);
                                setParsedImportRows([]);
                                setPasteText('');
                              }}
                              className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white"
                            >
                              <option value="produk">📦 Produk / Stock Inventory</option>
                              <option value="pelanggan">👥 Pelanggan / Customers</option>
                              <option value="supplier">🏭 Supplier / Vendor</option>
                            </select>

                          </div>
                          <div>
                            <label className="block text-[11px] font-black uppercase text-secondary mb-1">Metode Integrasi Data *</label>
                            <select
                              value={importMethod}
                              onChange={(e) => setImportMethod(e.target.value as any)}
                              className="w-full p-2.5 border border-border rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary bg-white"
                            >
                              <option value="merge">⚡ Merge (Tambahkan data baru &amp; Perbarui data lama)</option>
                              <option value="overwrite">⚠️ Overwrite (Hapus database lama &amp; Ganti dengan data baru)</option>
                            </select>

                          </div>
                        </div>
                        {/* File Upload Selector */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-black uppercase text-secondary">Pilih / Seret File Excel (.xlsx / .csv)</label>
                          <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            onChange={handleExcelFileUpload}
                            className="w-full text-sm text-secondary border border-dashed border-border rounded-card p-3 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                          />

                        </div>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center" aria-hidden="true">
                            <div className="w-full border-t border-border"></div>
                          </div>
                          <div className="relative flex justify-center text-sm uppercase">
                            <span className="bg-white px-3 font-bold text-[11px] text-slate-400">Atau Paste Langsung dari Google Sheets</span>

                          </div>
                        </div>
                        {/* Paste Text Area */}
                        <div>
                          <label className="block text-[11px] font-black uppercase text-secondary mb-1">Salin Baris Tabel Google Sheets Lalu Tempel di Sini</label>
                          <textarea
                            value={pasteText}
                            onChange={(e) => handlePasteTextChange(e.target.value)}
                            rows={4}
                            className="w-full p-3 border border-border rounded-card text-sm font-mono text-primary focus:ring-1 focus:ring-primary bg-slate-50"
                            placeholder="Salin/Copy baris dari Google Sheets (termasuk baris header paling atas) lalu paste di sini..."
                          />

                        </div>
                      </div>
                      {/* Panduan Kolom */}
                      <div className="w-full lg:w-80 bg-slate-50 border border-border rounded-card p-4 text-sm space-y-3">
                        <h4 className="font-extrabold uppercase text-xs text-primary tracking-wider flex items-center gap-1.5 border-b pb-1">
                          <HelpCircle size={14} className="text-primary" />
                          <span>Petunjuk Header Google Sheets</span>
                        </h4>
                        <p className="text-[11px] text-secondary font-medium">Sistem kami pintar! Header kolom Anda di Google Sheets tidak harus 100% sama, asalkan mengandung kata kunci berikut:</p>

                        <div className="space-y-2 text-[11px]">
                          {importTargetType === 'produk' && (
                            <>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">SKU</span>: SKU / Kode Produk</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Nama Produk</span>: Nama Produk / Nama / Item</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Harga Jual</span>: Harga Jual / Harga / HJ</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">HPP</span>: HPP / Harga Pokok / Modal / Harga Beli</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Stok Awal</span>: Stok Awal / Stok / Qty</div>
                            </>
                          )}
                          {importTargetType === 'pelanggan' && (
                            <>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">ID Pelanggan</span>: ID Pelanggan / ID / Code</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Nama Instansi</span>: Nama Instansi / Nama / Customer</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Kontak Person</span>: Kontak Person / Kontak / PIC</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Piutang Awal</span>: Piutang / Piutang Awal / Saldo</div>
                            </>
                          )}
                          {importTargetType === 'supplier' && (
                            <>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">ID Supplier</span>: ID Supplier / ID / Code</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Nama Perusahaan</span>: Nama Perusahaan / Nama / Vendor</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Kontak Person</span>: Kontak Person / Kontak / PIC</div>
                              <div className="p-2 bg-white rounded border border-border"><span className="font-black text-success">Hutang Awal</span>: Hutang / Hutang Awal / Saldo</div>
                            </>
                          )}

                        </div>
                      </div>
                    </div>
                    {/* Preview Area */}
                    {parsedImportRows.length > 0 && (
                      <div className="border border-success/30 rounded-card overflow-hidden bg-success/10 p-4 mb-4">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                          <div>
                            <h4 className="text-sm font-black text-success uppercase tracking-wider flex items-center gap-1.5">
                              <CheckCircle size={15} className="text-success" />
                              <span>Pratinjau Data Terbaca ({parsedImportRows.length} baris ditemukan)</span>
                            </h4>
                            <p className="text-[11px] text-secondary font-semibold mt-0.5">Sistem berhasil memetakan file Anda. Silakan verifikasi 5 baris pertama di bawah ini:</p>

                          </div>
                          <button
                            type="button"
                            onClick={executeImport}
                            className="px-5 py-2.5 bg-primary hover:bg-primary-hover text-white font-extrabold text-sm uppercase tracking-wider rounded-card shadow-md transition-all cursor-pointer"
                          >
                            🚀 Mulai Impor Sekarang
                          </button>

                        </div>
                        <div className="overflow-x-auto border border-border rounded-card">
                          <table className="w-full text-[11px] text-left bg-white">
                            <thead className="bg-slate-50 text-primary font-bold uppercase tracking-wider border-b border-border">
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
                                    <td key={colIdx} className="p-2.5 border-r border-slate-100 last:border-0 font-medium text-primary max-w-xs truncate">
                                      {row[colIdx] !== undefined ? row[colIdx] : ''}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {parsedImportRows.length > 5 && (
                          <p className="text-[11px] text-slate-400 font-mono text-right italic">&bull; Menampilkan 5 dari {parsedImportRows.length} baris total</p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* SUB TAB 3: ORIGINAL GAS TEMPLATE */}
                {sheetsHubSubTab === 'gas' && (
                  <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden animate-fade-in">
                    <div className="bg-slate-50 border-b border-border text-primary flex items-center justify-between p-4">
                      <span className="font-bold flex items-center gap-2 text-sm">
                        <Code className="text-primary" />
                        <span>Ekspor Kode GAS (Index.html)</span>
                      </span>
                      <span className="text-[11px] text-secondary font-black uppercase">Salin &amp; Tempel di Google Apps Script</span>
                    </div>
                    <div className="p-6">
                      <p className="text-sm text-secondary mb-4 font-semibold">
                        Gunakan template murni HTML di bawah untuk Google Apps Script (GAS) dengan INO Design System:
                      </p>
                      <pre className="text-[11px] text-primary font-mono overflow-x-auto whitespace-pre p-4 bg-slate-50 border border-border rounded-card max-h-96">





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
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; color: black !important; }
                  header, footer, nav, aside, .no-print, button, input[type="checkbox"], select { display: none !important; }
                  #struk-po-section { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; position: static !important; max-height: none !important; overflow: visible !important; }
                  #struk-po-section * { overflow: visible !important; }
                }
              `}} />
              <div className="bg-white rounded-card shadow-2xl border border-border w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto print-container" id="struk-po-section">

                {/* Modal Header */}
                <div className="bg-slate-50 text-primary p-5 flex justify-between items-center border-b border-border no-print">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] bg-primary text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">Doc Viewer</span>
                      <h3 className="font-mono text-lg font-bold tracking-tight text-primary">{selectedPo.id}</h3>
                    </div>
                    <p className="text-sm text-secondary font-semibold mt-1">
                      Dokumen Purchase Order &bull; Supplier: <span className="font-bold text-primary">{selectedPo.supplier}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPoActionForm('print')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-card text-slate-400 transition-all flex items-center gap-1.5 text-sm font-bold"
                      title="Cetak Bukti PO"
                    >
                      <Printer size={15} />
                      <span className="hidden sm:inline">Cetak</span>
                    </button>
                    <button
                      onClick={() => { setSelectedPo(null); setPoActionForm(null); }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-card p-2 transition-all"
                    >
                      <X size={18} />
                    </button>

                  </div>
                </div>
                {/* Sub-form Panels Overlay */}
                {poActionForm === 'receipt' ? (
                  /* 1. PENERIMAAN BARANG PO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-slate-50 border-l-4 border-primary p-4 rounded-r-lg">
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-wider">Penerimaan Barang Gudang (Logistik PO)</h4>
                      <p className="text-sm text-secondary mt-1">Masukkan jumlah fisik barang yang baru saja diterima di gudang utama. Status logistik akan disesuaikan otomatis.</p>

                    </div>
                    <div className="border border-border rounded-card overflow-hidden bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-primary font-bold uppercase tracking-wider border-b border-border">
                          <tr>
                            <th className="p-3">Produk</th>
                            <th className="p-3 text-center">Dipesan</th>
                            <th className="p-3 text-center">Telah Terima</th>
                            <th className="p-3 text-center">Sisa Pesanan</th>
                            <th className="p-3 text-right w-36">Terima Sekarang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedPo.items.map((item: any, idx: number) => {
                            const received = item.qtyReceived ?? (selectedPo.statusLogistik === 'Diterima' ? item.qty : 0);
                            const sisa = Math.max(0, item.qty - received);
                            return (
                              <tr key={`${item.sku}-${idx}`} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <div className="font-bold text-primary">{item.nama || 'Produk'}</div>
                                  <div className="font-mono text-[11px] text-secondary">{item.sku}</div>
                                </td>
                                <td className="p-3 text-center font-semibold text-primary">{item.qty} Pcs</td>
                                <td className="p-3 text-center text-success font-bold">{received} Pcs</td>
                                <td className="p-3 text-center text-warning font-bold">{sisa} Pcs</td>
                                <td className="p-3 text-right">
                                  <input
                                    type="text" inputMode="numeric"
                                    value={formatRibuan(poReceiptQtys[idx] ?? 0)}
                                    onChange={(e) => {
                                      let val = parseRibuan(e.target.value);
                                      val = Math.max(0, Math.min(val, sisa));
                                      setPoReceiptQtys(prev => ({ ...prev, [idx]: val }));
                                    }}
                                    disabled={sisa === 0}
                                    className="w-full p-2 border border-border rounded-card text-right text-sm font-bold disabled:bg-gray-100 disabled:text-slate-400"
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
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-primary text-sm font-bold rounded-card transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => submitPoReceipt(selectedPo.id)}
                        className="px-4 py-2 bg-primary hover:bg-teal-500 text-white text-sm font-bold rounded-card shadow-md transition-all"
                      >
                        Simpan Penerimaan
                      </button>
                    </div>
                  </div>
                ) : poActionForm === 'payment' ? (
                  /* 2. PEMBAYARAN PO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-wider">Formulir Pembayaran Hutang Supplier</h4>
                      <p className="text-sm text-secondary mt-1">Catat pengeluaran kas atau transfer bank untuk melunasi tagihan PO ini. Hutang supplier otomatis disesuaikan.</p>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-card border border-border">
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Nilai Tagihan PO</span>
                        <span className="text-xl font-black text-primary">Rp {selectedPo.grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-warning font-bold uppercase block">Sisa Hutang Belum Dibayar</span>
                        <span className="text-xl font-black text-warning">
                          Rp {(selectedPo.grandTotal - (selectedPo.totalPaid ?? (selectedPo.statusBayar === 'Lunas' ? selectedPo.grandTotal : 0))).toLocaleString('id-ID')}
                        </span>

                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary">Nominal Bayar (Rupiah)</label>
                        <input
                          type="text" inputMode="numeric"
                          value={formatRibuan(poPaymentVal)}
                          onChange={(e) => setPoPaymentVal(Math.max(0, parseRibuan(e.target.value) || 0))}
                          className="p-2.5 border border-border rounded-card text-sm font-bold bg-white"
                        />

                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary">Metode Pembayaran</label>
                        <select
                          value={poPaymentMetode}
                          onChange={(e) => setPoPaymentMetode(e.target.value)}
                          className="p-2.5 border border-border rounded-card text-sm font-bold bg-white"
                        >
                          <option value="Transfer Bank">Transfer Bank / M-Banking</option>
                          <option value="Kas Tunai">Kas Tunai (Petty Cash)</option>
                          <option value="Giro / Cek">Giro atau Cek</option>
                        </select>

                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary">Nomor Referensi / Kode Transaksi</label>
                        <input
                          type="text"
                          placeholder="Contoh: TRX-100238"
                          value={poPaymentRef}
                          onChange={(e) => setPoPaymentRef(e.target.value)}
                          className="p-2.5 border border-border rounded-card text-sm"
                        />

                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary">Catatan Keuangan (Memo)</label>
                        <input
                          type="text"
                          placeholder="Tulis rincian tambahan..."
                          value={poPaymentMemo}
                          onChange={(e) => setPoPaymentMemo(e.target.value)}
                          className="p-2.5 border border-border rounded-card text-sm"
                        />

                      </div>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                      <button
                        onClick={() => setPoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-primary text-sm font-bold rounded-card transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => submitPoPayment(selectedPo.id)}
                        className="px-4 py-2 bg-success hover:bg-success text-white text-sm font-bold rounded-card shadow-md transition-all"
                      >
                        Catat Pembayaran
                      </button>
                    </div>
                  </div>
                ) : poActionForm === 'retur' ? (
                  /* 3. RETUR BARANG PO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-rose-50 border-l-4 border-danger p-4 rounded-r-lg">
                      <h4 className="text-sm font-black text-danger uppercase tracking-wider">Formulir Retur Barang ke Supplier</h4>
                      <p className="text-sm text-secondary mt-1">Mengembalikan stok produk yang rusak/cacat ke supplier. Stok gudang akan berkurang &amp; sisa hutang akan dikoreksi.</p>

                    </div>
                    <div className="border border-red-100 rounded-card overflow-hidden bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-danger/10 text-danger font-bold uppercase border-b border-red-100">
                          <tr>
                            <th className="p-3">Produk</th>
                            <th className="p-3 text-center">Telah Diterima</th>
                            <th className="p-3 text-center">Telah Diretur</th>
                            <th className="p-3 text-center">Batas Maks Retur</th>
                            <th className="p-3 text-right w-36">Retur Sekarang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedPo.items.map((item: any, idx: number) => {
                            const received = item.qtyReceived ?? (selectedPo.statusLogistik === 'Diterima' ? item.qty : 0);
                            const returned = item.qtyReturned ?? 0;
                            const maxRetur = Math.max(0, received - returned);
                            return (
                              <tr key={`${item.sku}-${idx}`} className="hover:bg-danger/10 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-primary">{item.nama || 'Produk'}</div>
                                  <div className="font-mono text-[11px] text-secondary">{item.sku}</div>
                                </td>
                                <td className="p-3 text-center text-success font-bold">{received} Pcs</td>
                                <td className="p-3 text-center text-danger font-bold">{returned} Pcs</td>
                                <td className="p-3 text-center text-secondary font-semibold">{maxRetur} Pcs</td>
                                <td className="p-3 text-right">
                                  <input
                                    type="text" inputMode="numeric"
                                    min="0"
                                    max={maxRetur}
                                    value={formatRibuan(poReturQtys[idx] ?? 0)}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseRibuan(e.target.value) || 0);
                                      setPoReturQtys(prev => ({ ...prev, [idx]: val }));
                                    }}
                                    disabled={maxRetur === 0}
                                    className="w-full p-2 border border-danger/30 rounded-card text-right text-sm font-bold disabled:bg-gray-100 disabled:text-slate-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                    </div>
                    <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-card border border-border">
                      <label className="text-[11px] font-black uppercase text-secondary">Alasan Retur (Wajib diisi)</label>
                      <textarea
                        rows={2}
                        placeholder="Contoh: Barang cacat produksi / pecah saat pengiriman..."
                        value={poReturAlasan}
                        onChange={(e) => setPoReturAlasan(e.target.value)}
                        className="p-2 border border-border rounded-card text-sm bg-white"
                      />

                    </div>
                    <div className="flex justify-end gap-2.5 pt-4">
                      <button
                        onClick={() => setPoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-primary text-sm font-bold rounded-card transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => submitPoRetur(selectedPo.id)}
                        className="px-4 py-2 bg-danger hover:bg-danger text-white text-sm font-bold rounded-card shadow-md transition-all"
                      >
                        Proses Retur Pembelian
                      </button>
                    </div>
                  </div>
                ) : poActionForm === 'print' ? (
                  /* 4. PRINT TEMPLATE COPIABLE */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-card border border-border gap-4">
                      <div>
                        <p className="text-sm text-primary font-semibold">Tampilan Dokumen Resmi.</p>
                        <p className="text-[11px] text-secondary mt-0.5">*Jika tombol tidak merespon di AI Studio, klik tombol <strong>Buka di Tab Baru</strong> di kanan atas preview.</p>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-card shadow transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Printer size={13} />
                        Cetak / Simpan PDF
                      </button>

                    </div>
                    <div id="print-area" className="border border-border p-8 rounded-card bg-white space-y-6 text-primary font-sans shadow-inner max-w-3xl mx-auto">
                      <div className="flex justify-between border-b-2 border-text-primary pb-4">
                        <div>
                          <h1 className="text-xl font-black text-text-primary tracking-tight">PT. BALI JAYA SUKSES</h1>
                          <p className="text-sm text-secondary mt-1">Jl. Sunset Road No. 88X, Kuta, Bali</p>
                          <p className="text-sm text-secondary">Telp: (0361) 882-9382 &bull; Email: info@balijayasukses.co.id</p>
                        </div>
                        <div className="text-right">
                          <h2 className="text-base font-black text-primary tracking-wide">SURAT PESANAN (PO)</h2>
                          <p className="text-sm font-mono font-bold text-secondary mt-1">NO: {selectedPo.id}</p>
                          <p className="text-sm text-secondary">Tanggal: {selectedPo.tanggal}</p>

                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="font-bold uppercase text-text-primary border-b pb-1 mb-2">Ditujukan Kepada Supplier:</p>
                          <p className="font-black text-primary">{selectedPo.supplier}</p>
                          <p className="text-secondary mt-1">Sistem Pembayaran: {selectedPo.metode}</p>
                          <p className="text-secondary">Keuangan: {selectedPo.hasReturn ? (selectedPo.statusBayar === "Lunas" ? "LUNAS (KOREKSI RETUR)" : "BELUM DIBAYAR (DIPOTONG RETUR)") : selectedPo.statusBayar}</p>
                        </div>
                        <div>
                          <p className="font-bold uppercase text-text-primary border-b pb-1 mb-2">Alamat Pengiriman Gudang:</p>
                          <p className="font-semibold text-primary">PT. Bali Jaya Sukses - Gudang Logistik Utama</p>
                          <p className="text-secondary mt-1">Status Logistik: {selectedPo.hasReturn ? (selectedPo.statusLogistik === "Retur Penuh" || selectedPo.statusLogistik === "Retur Sebagian" ? selectedPo.statusLogistik.upper() : `${selectedPo.statusLogistik.toUpperCase()} (RETUR)`) : selectedPo.statusLogistik}</p>

                        </div>
                      </div>
                      <table className="w-full text-sm text-left border-collapse mt-4">
                        <thead>
                          <tr className="bg-slate-100 border-t border-b border-border">
                            <th className="p-2 font-bold uppercase text-primary">SKU</th>
                            <th className="p-2 font-bold uppercase text-primary">Deskripsi Barang</th>
                            <th className="p-2 text-center font-bold uppercase text-primary">Kuantitas</th>
                            <th className="p-2 text-right font-bold uppercase text-primary">Harga Satuan</th>
                            <th className="p-2 text-right font-bold uppercase text-primary">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {selectedPo.items.map((item: any) => (
                            <tr key={item.sku}>
                              <td className="p-2 font-mono text-secondary">{item.sku}</td>
                              <td className="p-2 font-semibold text-primary">{item.nama || 'Produk'}</td>
                              <td className="p-2 text-center">{item.qty} Pcs</td>
                              <td className="p-2 text-right">Rp {item.harga.toLocaleString('id-ID')}</td>
                              <td className="p-2 text-right font-bold">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-text-primary font-bold">
                            <td colSpan={4} className="p-2 text-right uppercase">Grand Total:</td>
                            <td className="p-2 text-right text-primary text-sm">Rp {selectedPo.grandTotal.toLocaleString('id-ID')}</td>
                          </tr>
                        </tfoot>
                      </table>

                      <div className="grid grid-cols-2 gap-4 text-sm pt-12 text-center">
                        <div>
                          <p className="text-secondary mb-12">Disetujui Oleh,</p>
                          <p className="font-black border-b border-gray-400 w-48 mx-auto pb-1">Direktur Operasional</p>
                        </div>
                        <div>
                          <p className="text-secondary mb-12">Diterima Oleh Supplier,</p>
                          <p className="font-black border-b border-gray-400 w-48 mx-auto pb-1">{selectedPo.supplier}</p>

                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => setPoActionForm(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-card transition-all"
                      >
                        Kembali Ke Detail
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 5. DOKUMEN GENERAL VIEW (Kebab dropdown, detail info, item lists, history) */
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Top Status Banner & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-card border border-border">
                      <div className="flex flex-wrap gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold text-slate-400">Logistik</span>
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase text-center mt-0.5 ${selectedPo.statusLogistik === 'Diterima' ? 'bg-success bg-opacity-15 text-success' :
                              selectedPo.statusLogistik === 'Diterima Sebagian' ? 'bg-info bg-opacity-15 text-info' :
                                selectedPo.statusLogistik === 'Menunggu' ? 'bg-warning bg-opacity-15 text-warning' :
                                  selectedPo.statusLogistik === 'Void' ? 'bg-danger/20 text-danger' : 'bg-gray-100 text-secondary'
                            }`}>
                            {selectedPo.statusLogistik}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold text-slate-400">Pembayaran</span>
                          {selectedPo.hasReturn ? (
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase text-center mt-0.5 bg-amber-100 text-amber-800 border border-amber-300">
                              {selectedPo.statusBayar === 'Lunas' ? 'LUNAS (KOREKSI RETUR)' : 'BELUM DIBAYAR (DIPOTONG RETUR)'}
                            </span>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase text-center mt-0.5 ${selectedPo.statusBayar === 'Lunas' ? 'bg-success bg-opacity-15 text-success' :
                                selectedPo.statusBayar === 'Cicilan' ? 'bg-indigo-100 text-indigo-700' :
                                  selectedPo.statusBayar === 'Belum Dibayar' ? 'bg-danger bg-opacity-15 text-danger' :
                                    'bg-gray-100 text-secondary'
                              }`}>
                              {selectedPo.statusBayar}
                            </span>
                          )}
                        </div>
                        {selectedPo.totalPaid !== undefined && (
                          <div className="flex flex-col">
                            <span className="text-[11px] uppercase font-bold text-slate-400">Terbayar</span>
                            <span className="text-sm font-bold text-success mt-0.5">
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
                            className="px-4 py-2 bg-primary hover:bg-success text-white text-sm font-bold rounded-card shadow-md transition-all flex items-center gap-1.5"
                          >
                            Setujui &amp; Rilis PO
                          </button>
                        ) : (
                          <>
                            {selectedPo.statusLogistik !== 'Diterima' && selectedPo.statusLogistik !== 'Void' && (
                              <button
                                onClick={() => handleOpenPoReceipt(selectedPo)}
                                className="px-3.5 py-2 bg-primary hover:bg-success text-white text-sm font-bold rounded-card shadow transition-all"
                              >
                                Penerimaan Gudang
                              </button>
                            )}
                            {selectedPo.statusBayar !== 'Lunas' && selectedPo.statusLogistik !== 'Void' && (
                              <button
                                onClick={() => handleOpenPoPayment(selectedPo)}
                                className="px-3.5 py-2 bg-success hover:bg-success text-white text-sm font-bold rounded-card shadow transition-all"
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
                            className="p-2 bg-gray-200 hover:bg-gray-300 text-primary rounded-card transition-all"
                          >
                            &bull;&bull;&bull;
                          </button>
                          {poShowKebab && (
                            <div className="absolute right-0 bottom-full mb-2 bg-white rounded-card shadow-xl border border-border w-48 z-50 overflow-hidden divide-y divide-slate-100">
                              <button
                                onClick={() => { setPoShowKebab(false); handleOpenPoRetur(selectedPo); }}
                                disabled={selectedPo.statusLogistik === 'Void' || selectedPo.statusLogistik === 'Draft'}
                                className="w-full text-left p-2.5 text-sm font-semibold text-primary hover:bg-danger/10 hover:text-danger transition-all disabled:opacity-50 disabled:pointer-events-none"
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
                                className="w-full text-left p-2.5 text-sm font-black text-danger hover:bg-danger/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                              >
                                Void (Batalkan) PO
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                    {/* General Metadata Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-card border border-border">
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Metode Pembayaran</span>
                        <span className="text-sm font-semibold text-primary">{selectedPo.metode || 'Transfer Bank'}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Tanggal Pembuatan PO</span>
                        <span className="text-sm font-semibold text-primary">{selectedPo.tanggal}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-success font-bold uppercase block">Total Nilai Pembelian</span>
                        <span className="text-sm font-bold text-primary">Rp {selectedPo.grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      {selectedPo.catatan && (
                        <div className="col-span-1 sm:col-span-3">
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Catatan Tambahan / Memo</span>
                          <p className="text-sm text-secondary italic mt-0.5">{selectedPo.catatan}</p>
                        </div>
                      )}

                    </div>
                    {/* Order Items Table */}
                    <div>
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-wider mb-2">Daftar Barang Pesanan</h4>
                      <div className="border border-border rounded-card overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-text-primary text-white font-bold uppercase tracking-wider">
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
                                    <div className="font-bold text-text-primary">{item.nama || 'Produk'}</div>
                                    <div className="font-mono text-[11px] text-secondary">{item.sku}</div>
                                  </td>
                                  <td className="p-3 text-center font-semibold text-primary">{item.qty} Pcs</td>
                                  <td className="p-3 text-center font-bold text-success">{rec} Pcs</td>
                                  <td className="p-3 text-right text-secondary">Rp {item.harga.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-right font-black text-primary">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                      </div>
                    </div>
                    {/* Retur History Panel */}
                    {selectedPo.returItems && selectedPo.returItems.length > 0 && (
                      <div className="bg-danger/10 p-4 rounded-card border border-danger/30 mt-4">
                        <h4 className="text-sm font-black text-danger uppercase tracking-wider mb-2 flex items-center gap-1">
                          <CornerUpLeft size={13} />
                          <span>Riwayat Retur Pembelian</span>
                        </h4>
                        <div className="overflow-x-auto text-sm">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-danger/30 text-danger font-bold uppercase text-xs">
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
                                  <td className="py-2 text-center text-danger font-black">{r.qty} Pcs</td>
                                  <td className="py-2 italic text-secondary">{r.alasan}</td>
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
                <div className="bg-gray-50 px-6 py-4 border-t border-border flex justify-end gap-2">
                  <button
                    onClick={() => { setSelectedPo(null); setPoActionForm(null); }}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-card text-sm font-bold transition-all shadow-md"
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
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; color: black !important; }
                  header, footer, nav, aside, .no-print, button, input[type="checkbox"], select { display: none !important; }
                  #struk-so-section { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; position: static !important; max-height: none !important; overflow: visible !important; }
                  #struk-so-section * { overflow: visible !important; }
                }
              `}} />
              <div className="bg-white rounded-card shadow-2xl border border-border w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] relative my-auto print-container" id="struk-so-section">

                {/* Modal Header */}
                <div className="bg-slate-50 text-primary p-5 flex justify-between items-center border-b border-border no-print">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="text-[11px] bg-primary text-white font-black px-2 py-0.5 rounded uppercase tracking-wider">Doc Viewer</span>
                      <h3 className="font-mono text-lg font-bold tracking-tight text-primary">{selectedSo.id}</h3>
                    </div>
                    <p className="text-sm text-secondary font-semibold mt-1">
                      Dokumen Sales Order &bull; Customer: <span className="font-bold text-primary">{selectedSo.pelanggan}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSoActionForm('print')}
                      className="p-2 bg-slate-800 hover:bg-slate-700 rounded-card text-slate-400 transition-all flex items-center gap-1.5 text-sm font-bold"
                      title="Cetak Struk SO"
                    >
                      <Printer size={15} />
                      <span className="hidden sm:inline">Cetak Struk</span>
                    </button>
                    <button
                      onClick={() => { setSelectedSo(null); setSoActionForm(null); }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-card p-2 transition-all"
                    >
                      <X size={18} />
                    </button>

                  </div>
                </div>
                {/* Sub-form Panels Overlay */}
                {soActionForm === 'shipment' ? (
                  /* 1. PENGIRIMAN BARANG SO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-slate-50 border-l-4 border-primary p-4 rounded-r-lg">
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-wider">Surat Jalan / Pengiriman Barang (Logistik SO)</h4>
                      <p className="text-sm text-secondary mt-1">Keluarkan barang fisik dari gudang utama dan kurangi stok gudang secara otomatis untuk dikirim ke customer.</p>

                    </div>
                    <div className="border border-border rounded-card overflow-hidden bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 text-primary font-bold uppercase tracking-wider border-b border-border">
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
                          {selectedSo.items.map((item: any, idx: number) => {
                            const shipped = item.qtyShipped ?? (selectedSo.statusLogistik === 'Terkirim' || selectedSo.statusLogistik === 'Selesai' ? item.qty : 0);
                            const sisa = Math.max(0, item.qty - shipped);
                            const prod = products.find(p => p.sku === item.sku);
                            const stockCount = prod ? prod.stok : 0;
                            return (
                              <tr key={item.sku} className="hover:bg-slate-50">
                                <td className="p-3">
                                  <div className="font-bold text-primary">{item.nama || 'Produk'}</div>
                                  <div className="font-mono text-[11px] text-secondary">{item.sku}</div>
                                </td>
                                <td className="p-3 text-center font-semibold text-primary">{item.qty} Pcs</td>
                                <td className="p-3 text-center text-success font-bold">{shipped} Pcs</td>
                                <td className="p-3 text-center text-warning font-bold">{sisa} Pcs</td>
                                <td className={`p-3 text-center font-black ${stockCount < sisa ? 'text-danger' : 'text-primary'}`}>
                                  {stockCount} Pcs
                                </td>
                                <td className="p-3 text-right">
                                  <input
                                    type="text" inputMode="numeric"
                                    min="0"
                                    max={sisa}
                                    value={formatRibuan(soShipmentQtys[idx] ?? 0)}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseRibuan(e.target.value) || 0);
                                      setSoShipmentQtys(prev => ({ ...prev, [idx]: val }));
                                    }}
                                    disabled={sisa === 0}
                                    className="w-full p-2 border border-border rounded-card text-right text-sm font-bold disabled:bg-gray-100 disabled:text-slate-400"
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
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-primary text-sm font-bold rounded-card transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => submitSoShipment(selectedSo.id)}
                        className="px-4 py-2 bg-primary hover:bg-teal-500 text-white text-sm font-bold rounded-card shadow-md transition-all"
                      >
                        Kirim Barang
                      </button>
                    </div>
                  </div>
                ) : soActionForm === 'payment' ? (
                  /* 2. PELUNASAN PIUTANG SO */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-slate-50 border-l-4 border-emerald-500 p-4 rounded-r-lg">
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-wider">Pencatatan Terima Piutang Customer</h4>
                      <p className="text-sm text-secondary mt-1">Catat pembayaran masuk (setoran kas/transfer bank) dari pelanggan untuk mengurangi piutang dagang pelanggan tersebut.</p>

                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-5 rounded-card border border-border">
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Total Nilai Penjualan</span>
                        <span className="text-xl font-black text-primary">Rp {selectedSo.grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-warning font-bold uppercase block">Sisa Piutang Belum Lunas</span>
                        <span className="text-xl font-black text-warning">
                          Rp {(selectedSo.grandTotal - (selectedSo.totalPaid ?? (selectedSo.statusBayar === 'Lunas' ? selectedSo.grandTotal : 0))).toLocaleString('id-ID')}
                        </span>

                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary">Nominal Pembayaran Diterima (Rp)</label>
                        <input
                          type="text" inputMode="numeric"
                          value={formatRibuan(soPaymentVal)}
                          onChange={(e) => setSoPaymentVal(Math.max(0, parseRibuan(e.target.value) || 0))}
                          className="p-2.5 border border-border rounded-card text-sm font-bold bg-white"
                        />

                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary">Metode Pembayaran</label>
                        <select
                          value={soPaymentMetode}
                          onChange={(e) => setSoPaymentMetode(e.target.value)}
                          className="p-2.5 border border-border rounded-card text-sm font-bold bg-white"
                        >
                          <option value="Transfer Bank">Transfer Bank / M-Banking</option>
                          <option value="Kas Tunai">Setoran Tunai Kasir</option>
                          <option value="EDC Mesin">Mesin EDC Kartu</option>
                        </select>

                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary">Nomor Bukti Transfer / No Ref</label>
                        <input
                          type="text"
                          placeholder="Contoh: REF-9283729"
                          value={soPaymentRef}
                          onChange={(e) => setSoPaymentRef(e.target.value)}
                          className="p-2.5 border border-border rounded-card text-sm"
                        />

                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary">Catatan Keuangan (Memo)</label>
                        <input
                          type="text"
                          placeholder="Tulis rincian setoran..."
                          value={soPaymentMemo}
                          onChange={(e) => setSoPaymentMemo(e.target.value)}
                          className="p-2.5 border border-border rounded-card text-sm"
                        />

                      </div>
                    </div>
                    <div className="flex justify-end gap-2.5 pt-4 border-t border-border">
                      <button
                        onClick={() => setSoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-primary text-sm font-bold rounded-card transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => submitSoPayment(selectedSo.id)}
                        className="px-4 py-2 bg-success hover:bg-success text-white text-sm font-bold rounded-card shadow-md transition-all"
                      >
                        Simpan Pembayaran
                      </button>
                    </div>
                  </div>
                ) : soActionForm === 'retur' ? (
                  /* 3. RETUR BARANG SO (Customer return) */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="bg-rose-50 border-l-4 border-danger p-4 rounded-r-lg">
                      <h4 className="text-sm font-black text-danger uppercase tracking-wider">Formulir Retur Barang dari Pelanggan</h4>
                      <p className="text-sm text-secondary mt-1">Mencatat barang yang dikembalikan oleh pelanggan karena rusak/tidak sesuai. Stok gudang akan ditambahkan kembali &amp; piutang customer dikoreksi.</p>

                    </div>
                    <div className="border border-red-100 rounded-card overflow-hidden bg-white">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-danger/10 text-danger font-bold uppercase border-b border-red-100">
                          <tr>
                            <th className="p-3">Produk</th>
                            <th className="p-3 text-center">Telah Dikirim</th>
                            <th className="p-3 text-center">Telah Diretur</th>
                            <th className="p-3 text-center">Batas Maks Retur</th>
                            <th className="p-3 text-right w-36">Retur Sekarang</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {selectedSo.items.map((item: any, idx: number) => {
                            const shipped = item.qtyShipped ?? (selectedSo.statusLogistik === 'Terkirim' || selectedSo.statusLogistik === 'Selesai' ? item.qty : 0);
                            const returned = item.qtyReturned ?? 0;
                            const maxRetur = Math.max(0, shipped - returned);
                            return (
                              <tr key={`${item.sku}-${idx}`} className="hover:bg-danger/10 transition-colors">
                                <td className="p-3">
                                  <div className="font-bold text-primary">{item.nama || 'Produk'}</div>
                                  <div className="font-mono text-[11px] text-secondary">{item.sku}</div>
                                </td>
                                <td className="p-3 text-center text-success font-bold">{shipped} Pcs</td>
                                <td className="p-3 text-center text-danger font-bold">{returned} Pcs</td>
                                <td className="p-3 text-center text-secondary font-semibold">{maxRetur} Pcs</td>
                                <td className="p-3 text-right">
                                  <input
                                    type="text" inputMode="numeric"
                                    min="0"
                                    max={maxRetur}
                                    value={formatRibuan(soReturQtys[idx] ?? 0)}
                                    onChange={(e) => {
                                      const val = Math.max(0, parseRibuan(e.target.value) || 0);
                                      setSoReturQtys(prev => ({ ...prev, [idx]: val }));
                                    }}
                                    disabled={maxRetur === 0}
                                    className="w-full p-2 border border-danger/30 rounded-card text-right text-sm font-bold disabled:bg-gray-100 disabled:text-slate-400"
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                    </div>
                    <div className="flex flex-col gap-1.5 bg-slate-50 p-4 rounded-card border border-border">
                      <label className="text-[11px] font-black uppercase text-secondary">Alasan Retur Pelanggan (Wajib)</label>
                      <textarea
                        rows={2}
                        placeholder="Contoh: Ukuran salah / cacat pengemasan dari pabrik..."
                        value={soReturAlasan}
                        onChange={(e) => setSoReturAlasan(e.target.value)}
                        className="p-2 border border-border rounded-card text-sm bg-white"
                      />

                    </div>
                    <div className="flex justify-end gap-2.5 pt-4">
                      <button
                        onClick={() => setSoActionForm(null)}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-primary text-sm font-bold rounded-card transition-all"
                      >
                        Batal
                      </button>
                      <button
                        onClick={() => submitSoRetur(selectedSo.id)}
                        className="px-4 py-2 bg-danger hover:bg-danger text-white text-sm font-bold rounded-card shadow-md transition-all"
                      >
                        Proses Retur Pelanggan
                      </button>
                    </div>
                  </div>
                ) : soActionForm === 'print' ? (
                  /* 4. STRUK CETAK SALES ORDER */
                  <div className="p-6 overflow-y-auto flex-1 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-4 rounded-card border border-border gap-4">
                      <div>
                        <p className="text-sm text-primary font-semibold">Struk Belanja Pelanggan.</p>
                        <p className="text-[11px] text-secondary mt-0.5">*Jika tombol tidak merespon di AI Studio, klik tombol <strong>Buka di Tab Baru</strong> di kanan atas preview.</p>
                      </div>
                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-sm font-semibold rounded-card shadow transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Printer size={13} />
                        Cetak Struk / PDF
                      </button>

                    </div>
                    <div id="print-area" className="border border-border p-6 rounded-card bg-neutral-50 space-y-4 text-primary font-mono text-sm max-w-sm mx-auto shadow-inner">
                      <div className="text-center space-y-1">
                        <h2 className="text-sm font-bold uppercase">PT. INO JAYA MANDIRI</h2>
                        <p className="text-[11px] text-secondary">ITC Mangga Dua, Lt. 2 Blok A, Jakarta</p>
                        <p className="text-[11px] text-secondary">Telp: 0812-9482-9382</p>
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
                            <div className="flex justify-between text-[11px] text-secondary pl-2">
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
                      <div className="text-center pt-6 space-y-1 text-[11px] text-secondary">
                        <p>Terima Kasih Telah Berbelanja</p>
                        <p>Barang yang sudah dibeli tidak dapat ditukar</p>
                        <p className="font-bold text-primary">Powered by INO ERP v1.0</p>

                      </div>
                    </div>
                    <div className="flex justify-end pt-4">
                      <button
                        onClick={() => setSoActionForm(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-bold rounded-card transition-all"
                      >
                        Kembali Ke Detail
                      </button>
                    </div>
                  </div>
                ) : (
                  /* 5. DOKUMEN GENERAL VIEW */
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">

                    {/* Top Status Banner & Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-card border border-border">
                      <div className="flex flex-wrap gap-2.5">
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold text-slate-400">Pengiriman</span>
                          <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase text-center mt-0.5 ${selectedSo.statusLogistik === 'Terkirim' || selectedSo.statusLogistik === 'Selesai' ? 'bg-success bg-opacity-15 text-success' :
                              selectedSo.statusLogistik === 'Terkirim Sebagian' ? 'bg-indigo-100 text-indigo-700' :
                                selectedSo.statusLogistik === 'Menunggu' || selectedSo.statusLogistik === 'Menunggu Pengiriman' ? 'bg-warning bg-opacity-15 text-warning' :
                                  selectedSo.statusLogistik === 'Void' ? 'bg-danger/20 text-danger' : 'bg-gray-100 text-secondary'
                            }`}>
                            {selectedSo.statusLogistik}
                          </span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] uppercase font-bold text-slate-400">Keuangan</span>
                          {selectedSo.hasReturn ? (
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-black uppercase text-center mt-0.5 bg-amber-100 text-amber-800 border border-amber-300">
                              {selectedSo.statusBayar === 'Lunas' ? 'LUNAS (KOREKSI RETUR)' : 'BELUM LUNAS (DIPOTONG RETUR)'}
                            </span>
                          ) : (
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase text-center mt-0.5 ${selectedSo.statusBayar === 'Lunas' ? 'bg-success bg-opacity-15 text-success' :
                                selectedSo.statusBayar === 'Cicilan' ? 'bg-indigo-100 text-indigo-700' :
                                  selectedSo.statusBayar === 'Belum Lunas' ? 'bg-danger bg-opacity-15 text-danger' :
                                    'bg-gray-100 text-secondary'
                              }`}>
                              {selectedSo.statusBayar}
                            </span>
                          )}
                        </div>
                        {selectedSo.totalPaid !== undefined && (
                          <div className="flex flex-col">
                            <span className="text-[11px] uppercase font-bold text-slate-400">Telah Disetor</span>
                            <span className="text-sm font-bold text-success mt-0.5">
                              Rp {selectedSo.totalPaid.toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}

                      </div>
                      <div className="flex gap-2 relative">
                        {selectedSo.statusLogistik !== 'Terkirim' && selectedSo.statusLogistik !== 'Void' && (
                          <button
                            onClick={() => handleOpenSoShipment(selectedSo)}
                            className="px-3.5 py-2 bg-primary hover:bg-success text-white text-sm font-bold rounded-card shadow transition-all"
                          >
                            Proses Kirim (SJ)
                          </button>
                        )}
                        {selectedSo.statusBayar !== 'Lunas' && selectedSo.statusLogistik !== 'Void' && (
                          <button
                            onClick={() => handleOpenSoPayment(selectedSo)}
                            className="px-3.5 py-2 bg-success hover:bg-success text-white text-sm font-bold rounded-card shadow transition-all"
                          >
                            Terima Pembayaran
                          </button>
                        )}

                        {/* Kebab dropdown */}
                        <div className="relative">
                          <button
                            onClick={() => setSoShowKebab(!soShowKebab)}
                            className="p-2 bg-gray-200 hover:bg-gray-300 text-primary rounded-card transition-all"
                          >
                            &bull;&bull;&bull;
                          </button>
                          {soShowKebab && (
                            <div className="absolute right-0 bottom-full mb-2 bg-white rounded-card shadow-xl border border-border w-48 z-50 overflow-hidden divide-y divide-slate-100">
                              <button
                                onClick={() => { setSoShowKebab(false); handleOpenSoRetur(selectedSo); }}
                                disabled={selectedSo.statusLogistik === 'Void'}
                                className="w-full text-left p-2.5 text-sm font-semibold text-primary hover:bg-danger/10 hover:text-danger transition-all disabled:opacity-50 disabled:pointer-events-none"
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
                                className="w-full text-left p-2.5 text-sm font-black text-danger hover:bg-danger/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                              >
                                Void (Batalkan) SO
                              </button>
                            </div>
                          )}

                        </div>
                      </div>
                    </div>
                    {/* Metadata Card */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-card border border-border">
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Metode Pembayaran</span>
                        <span className="text-sm font-semibold text-primary">{selectedSo.metode}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-slate-400 font-bold uppercase block">Tanggal Penjualan</span>
                        <span className="text-sm font-semibold text-primary">{selectedSo.tanggal}</span>
                      </div>
                      <div>
                        <span className="text-[11px] text-success font-bold uppercase block">Total Nilai Penjualan</span>
                        <span className="text-sm font-bold text-primary">Rp {selectedSo.grandTotal.toLocaleString('id-ID')}</span>
                      </div>
                      {selectedSo.catatan && (
                        <div className="col-span-1 sm:col-span-3">
                          <span className="text-[11px] text-slate-400 font-bold uppercase block">Catatan Tambahan / Memo</span>
                          <p className="text-sm text-secondary italic mt-0.5">{selectedSo.catatan}</p>
                        </div>
                      )}

                    </div>
                    {/* Order Items Table */}
                    <div>
                      <h4 className="text-sm font-black text-text-primary uppercase tracking-wider mb-2">Rincian Produk Dipesan</h4>
                      <div className="border border-border rounded-card overflow-hidden bg-white shadow-sm">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-text-primary text-white font-bold uppercase tracking-wider">
                            <tr>
                              <th className="p-3">SKU / Nama Barang</th>
                              <th className="p-3 text-center">Pesanan</th>
                              <th className="p-3 text-center">Telah Kirim</th>
                              <th className="p-3 text-right">Harga Satuan</th>
                              <th className="p-3 text-right">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {selectedSo.items.map((item: any, idx: number) => {
                              const sended = item.qtyShipped ?? (selectedSo.statusLogistik === 'Terkirim' || selectedSo.statusLogistik === 'Selesai' ? item.qty : 0);
                              return (
                                <tr key={item.sku} className="hover:bg-slate-50">
                                  <td className="p-3">
                                    <div className="font-bold text-text-primary">{item.nama || 'Produk'}</div>
                                    <div className="font-mono text-[11px] text-secondary">{item.sku}</div>
                                  </td>
                                  <td className="p-3 text-center font-semibold text-primary">{item.qty} Pcs</td>
                                  <td className="p-3 text-center font-bold text-success">{sended} Pcs</td>
                                  <td className="p-3 text-right text-secondary">Rp {item.harga.toLocaleString('id-ID')}</td>
                                  <td className="p-3 text-right font-black text-primary">Rp {item.subtotal.toLocaleString('id-ID')}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                      </div>
                    </div>
                    {/* Retur History Panel */}
                    {selectedSo.returItems && selectedSo.returItems.length > 0 && (
                      <div className="bg-danger/10 p-4 rounded-card border border-danger/30 mt-4">
                        <h4 className="text-sm font-black text-danger uppercase tracking-wider mb-2 flex items-center gap-1">
                          <CornerUpLeft size={13} />
                          <span>Riwayat Retur Penjualan</span>
                        </h4>
                        <div className="overflow-x-auto text-sm">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-danger/30 text-danger font-bold uppercase text-xs">
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
                                  <td className="py-2 text-center text-danger font-black">{r.qty} Pcs</td>
                                  <td className="py-2 italic text-secondary">{r.alasan}</td>
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
                <div className="bg-gray-50 px-6 py-4 border-t border-border flex justify-end gap-2">
                  <button
                    onClick={() => { setSelectedSo(null); setSoActionForm(null); }}
                    className="bg-slate-800 hover:bg-slate-700 text-white px-5 py-2 rounded-card text-sm font-bold transition-all shadow-md"
                  >
                    Tutup Viewer
                  </button>

                </div>
              </div>
            </div>
          )}

          {/* OVERLAY: PRODUCT TRANSACTION HISTORY */}
          {viewingProductTx && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden border border-border max-h-[90vh] relative my-auto">
                <div className="bg-slate-50 text-primary p-5 flex justify-between items-center border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/15 p-2 rounded-card">
                      <Package className="text-primary" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-primary">Rincian & Kartu Kendali Stok</h3>
                      <p className="text-[11px] text-secondary font-semibold">SKU: <span className="font-mono font-bold text-primary">{viewingProductTx.sku}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingProductTx(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-card text-slate-400 hover:text-primary transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>

                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-card border border-border text-sm">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Nama Barang</span>
                      <span className="font-bold text-primary text-sm mt-0.5 block">{viewingProductTx.nama}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Kategori</span>
                      <span className="font-bold text-primary mt-0.5 block">{viewingProductTx.kategori || '-'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Stok Fisik / Buku Besar</span>
                      <div className="mt-0.5 flex flex-col gap-1">
                        <span className="font-mono font-bold text-success text-sm">{viewingProductTx.stok} {viewingProductTx.satuan}</span>
                        {getOnOrderQty(viewingProductTx.sku) > 0 && (
                          <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-[4px] text-[10px] font-black uppercase inline-block w-max">
                            Dalam Pesanan: +{getOnOrderQty(viewingProductTx.sku)} (PO Aktif)
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Estimasi HPP</span>
                      <span className="font-mono font-bold text-primary mt-0.5 block">Rp {viewingProductTx.hpp.toLocaleString('id-ID')}</span>

                    </div>
                  </div>
                  {/* Transaction History Section */}
                  <div>
                    <h4 className="text-sm font-black text-primary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <History size={13} className="text-secondary" />
                      <span>Riwayat Mutasi & Buku Kendali Stok (Realtime)</span>
                    </h4>
                    <div className="border border-border rounded-card overflow-hidden bg-white shadow-sm overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 border-b border-border text-primary font-bold uppercase tracking-wider">
                          {/* ponytail: lock struktur & urutan kolom laporan mutasi persediaan agar tidak ter-reset */}
                          <tr>
                            <th className="p-3">Tanggal</th>
                            <th className="p-3">Jenis Transaksi</th>
                            <th className="p-3 text-center">Masuk (+)</th>
                            <th className="p-3 text-center">Keluar (-)</th>
                            <th className="p-3 text-center">Saldo Akhir / Sisa Qty</th>
                            <th className="p-3 text-right">Harga Unit</th>
                            <th className="p-3 text-right">Total Nilai</th>
                            <th className="p-3 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {deriveProductLedgerRows(viewingProductTx.sku).length > 0 ? (
                            deriveProductLedgerRows(viewingProductTx.sku).map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-50">
                                <td className="p-3 font-mono text-secondary">{row[0]}</td>
                                <td className="p-3 font-semibold text-primary">{row[1]}</td>
                                <td className="p-3 text-center font-bold text-success">{row[2]}</td>
                                <td className="p-3 text-center font-bold text-danger">{row[3]}</td>
                                <td className="p-3 text-center font-mono font-black text-primary bg-slate-50/50">{row[4]} {row[4] !== '-' ? viewingProductTx.satuan : ''}</td>
                                <td className="p-3 text-right text-secondary font-mono">{row[5]}</td>
                                <td className="p-3 text-right font-bold text-primary font-mono">{row[6]}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2 py-0.5 rounded-[4px] text-[11px] font-black uppercase ${row[7].toUpperCase().includes('DITERIMA') || row[7].toUpperCase().includes('TERKIRIM') || row[7].toUpperCase().includes('SELESAI') || row[7].toUpperCase().includes('TERJUAL') ? 'bg-success/20 text-success' :
                                      row[7].toUpperCase().includes('RETUR') ? 'bg-warning/20 text-warning' :
                                        row[7].toUpperCase().includes('OPNAME') ? 'bg-info/20 text-info' :
                                          row[7].toUpperCase().includes('DIPESAN') ? 'bg-sky-50 text-sky-700 border border-sky-200' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {row[7]}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={9} className="p-8 text-center text-slate-400 italic">
                                Belum ada riwayat transaksi tercatat untuk produk ini.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 border-t border-border flex justify-end">
                  <button
                    onClick={() => setViewingProductTx(null)}
                    className="bg-slate-800 hover:bg-text-primary text-white px-5 py-2 rounded-card text-sm font-bold transition-all shadow"
                  >
                    Tutup Rincian
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OVERLAY: CUSTOMER TRANSACTION HISTORY */}
          {viewingCustomerTx && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; color: black !important; }
                  header, footer, nav, aside, .no-print, button, input[type="checkbox"], select { display: none !important; }
                  #buku-besar-customer-section { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; position: static !important; max-height: none !important; overflow: visible !important; }
                  #buku-besar-customer-section * { overflow: visible !important; }
                }
              `}} />
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden border border-border max-h-[90vh] relative my-auto print-container" id="buku-besar-customer-section">
                <div className="bg-slate-50 text-primary p-5 flex justify-between items-center border-b border-border no-print">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/15 p-2 rounded-card">
                      <Users className="text-primary" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-primary">Kartu Piutang & Transaksi Pelanggan</h3>
                      <p className="text-[11px] text-secondary font-semibold">ID Customer: <span className="font-mono font-bold text-primary">{viewingCustomerTx.id}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingCustomerTx(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-card text-slate-400 hover:text-primary transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>

                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-card border border-border text-sm">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Instansi / Nama</span>
                      <span className="font-bold text-primary text-sm mt-0.5 block">{viewingCustomerTx.nama}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">PIC Kontak & Telp</span>
                      <span className="font-bold text-primary mt-0.5 block">{viewingCustomerTx.kontak} ({viewingCustomerTx.telp})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Email</span>
                      <span className="font-medium text-secondary mt-0.5 block truncate">{viewingCustomerTx.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Saldo Piutang Dagang</span>
                      <span className="font-mono font-bold text-primary text-sm mt-0.5 block">Rp {viewingCustomerTx.piutang.toLocaleString('id-ID')}</span>

                    </div>
                  </div>
                  {/* Transaction History Section */}
                  <div>
                    <h4 className="text-sm font-black text-primary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <History size={13} className="text-secondary" />
                      <span>Buku Besar Pembantu Piutang (Debit & Kredit)</span>
                    </h4>
                    <div className="border border-border rounded-card overflow-hidden bg-white shadow-sm overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 border-b border-border text-primary font-bold uppercase tracking-wider">
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
                                <td className="p-3 font-mono text-secondary">{row[0]}</td>
                                <td className="p-3">
                                  <button
                                    onClick={() => {
                                      const so = salesOrders.find(s => s.id === row[1]);
                                      if (so) {
                                        setSelectedSo(so);
                                        setViewingCustomerTx(null);
                                      }
                                    }}
                                    className="font-mono font-bold text-primary hover:underline hover:text-primary-hover transition-all"
                                    title="Klik untuk buka dokumen Sales Order"
                                  >
                                    {row[1]}
                                  </button>
                                </td>
                                <td className="p-3 text-secondary font-medium">{row[7]}</td>
                                <td className="p-3 text-right text-primary font-mono font-semibold">{row[2]}</td>
                                <td className="p-3 text-right text-success font-mono font-bold">{row[3]}</td>
                                <td className="p-3 text-right font-black text-primary font-mono bg-success/10">{row[4]}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase inline-block ${row[5] === 'Lunas' ? 'bg-success bg-opacity-15 text-success' :
                                      row[5] === 'Cicilan' ? 'bg-indigo-100 text-indigo-700' : 'bg-danger/20 text-danger'
                                    }`}>
                                    {row[5]}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                Belum ada riwayat transaksi.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>

                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 border-t border-border flex justify-between items-center print:hidden">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const ledger = deriveCustomerLedgerRows(viewingCustomerTx.id);
                        const headers = ['TANGGAL', 'DOKUMEN REF', 'KETERANGAN MUTASI', 'DEBIT (+)', 'KREDIT (-)', 'SALDO PIUTANG'];
                        const rows = ledger.map(l => [
                          l[0], l[1], l[7],
                          l[2],
                          l[3],
                          l[4]
                        ]);
                        generateReportPDF(
                          'BUKU BESAR PELANGGAN / PIUTANG',
                          `Instansi: ${viewingCustomerTx.nama} (${viewingCustomerTx.id}) | Kontak: ${viewingCustomerTx.kontak}`,
                          new Date().toLocaleDateString('id-ID'),
                          headers,
                          rows,
                          [],
                          `Buku_Besar_Customer_${viewingCustomerTx.id}.pdf`,
                          'landscape'
                        );
                      }}
                      className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Printer size={14} />
                      <span>Download Buku Besar Instansi (PDF)</span>
                    </button>
                    <button
                      onClick={() => {
                        const ledger = deriveCustomerLedgerRows(viewingCustomerTx.id);
                        const wsData: any[][] = [
                          ['BUKU BESAR PELANGGAN / PIUTANG'],
                          ['Nama Instansi:', viewingCustomerTx.nama],
                          ['ID Customer:', viewingCustomerTx.id],
                          ['Kontak:', `${viewingCustomerTx.kontak} (${viewingCustomerTx.telp})`],
                          ['Tanggal Cetak:', new Date().toLocaleDateString('id-ID')],
                          [''],
                          ['TANGGAL', 'DOKUMEN REF', 'KETERANGAN MUTASI', 'DEBIT (+)', 'KREDIT (-)', 'SALDO PIUTANG']
                        ];
                        ledger.forEach(row => {
                          const deb = typeof row[3] === 'number' ? row[3] : (parseInt(row[3].toString().replace(/\D/g, '')) || 0);
                          const kre = typeof row[4] === 'number' ? row[4] : (parseInt(row[4].toString().replace(/\D/g, '')) || 0);
                          const sal = typeof row[5] === 'number' ? row[5] : (parseInt(row[5].toString().replace(/\D/g, '')) || 0);
                          wsData.push([row[0], row[1], row[2], deb, kre, sal]);
                        });
                        if (typeof XLSX !== 'undefined') {
                          const ws = XLSX.utils.aoa_to_sheet(wsData);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Buku Besar");
                          XLSX.writeFile(wb, `Buku_Besar_${viewingCustomerTx.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
                        } else {
                          triggerToast('Library Excel tidak ditemukan', 'error');
                        }
                      }}
                      className="px-4 py-2 bg-success hover:bg-success/90 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Ekspor Buku Besar (.xlsx)</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setViewingCustomerTx(null)}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-5 py-2 rounded-card text-sm font-bold transition-all shadow-sm"
                  >
                    Tutup Rincian
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* OVERLAY: SUPPLIER TRANSACTION HISTORY */}
          {viewingSupplierTx && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                  body { background: white !important; color: black !important; }
                  header, footer, nav, aside, .no-print, button, input[type="checkbox"], select { display: none !important; }
                  #buku-besar-supplier-section { display: block !important; width: 100% !important; margin: 0 !important; padding: 0 !important; box-shadow: none !important; border: none !important; position: static !important; max-height: none !important; overflow: visible !important; }
                  #buku-besar-supplier-section * { overflow: visible !important; }
                }
              `}} />
              <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full flex flex-col overflow-hidden border border-border max-h-[90vh] relative my-auto print-container" id="buku-besar-supplier-section">
                <div className="bg-slate-50 text-primary p-5 flex justify-between items-center border-b border-border no-print">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/15 p-2 rounded-card">
                      <Users className="text-primary" size={20} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-primary">Kartu Hutang & Riwayat Supplier</h3>
                      <p className="text-[11px] text-secondary font-semibold">ID Supplier: <span className="font-mono font-bold text-primary">{viewingSupplierTx.id}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => setViewingSupplierTx(null)}
                    className="p-1.5 hover:bg-slate-100 rounded-card text-slate-400 hover:text-primary transition-all cursor-pointer"
                  >
                    <X size={18} />
                  </button>

                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-6">
                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-card border border-border text-sm">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Perusahaan / Vendor</span>
                      <span className="font-bold text-primary text-sm mt-0.5 block">{viewingSupplierTx.nama}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">PIC Kontak & Telp</span>
                      <span className="font-bold text-primary mt-0.5 block">{viewingSupplierTx.kontak} ({viewingSupplierTx.telp})</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Email</span>
                      <span className="font-medium text-secondary mt-0.5 block truncate">{viewingSupplierTx.email}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-xs">Saldo Hutang Dagang</span>
                      <span className="font-mono font-bold text-danger text-sm mt-0.5 block">Rp {viewingSupplierTx.hutang.toLocaleString('id-ID')}</span>

                    </div>
                  </div>
                  {/* Transaction History Section */}
                  <div>
                    <h4 className="text-sm font-black text-primary uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                      <History size={13} className="text-secondary" />
                      <span>Buku Besar Pembantu Hutang (Debit & Kredit)</span>
                    </h4>
                    <div className="border border-border rounded-card overflow-hidden bg-white shadow-sm overflow-x-auto">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 border-b border-border text-primary font-bold uppercase tracking-wider">
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
                                <td className="p-3 font-mono text-secondary">{row[0]}</td>
                                <td className="p-3">
                                  <button
                                    onClick={() => {
                                      const po = purchaseOrders.find(p => p.id === row[1]);
                                      if (po) {
                                        setSelectedPo(po);
                                        setViewingSupplierTx(null);
                                      }
                                    }}
                                    className="font-mono font-bold text-primary hover:underline hover:text-primary-hover transition-all"
                                    title="Klik untuk buka dokumen Purchase Order"
                                  >
                                    {row[1]}
                                  </button>
                                </td>
                                <td className="p-3 text-secondary font-medium">{row[7]}</td>
                                <td className="p-3 text-right text-primary font-mono font-semibold">{row[2]}</td>
                                <td className="p-3 text-right text-danger font-mono font-bold">{row[3]}</td>
                                <td className="p-3 text-right font-black text-danger font-mono bg-danger/10">{row[4]}</td>
                                <td className="p-3 text-center">
                                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-black uppercase inline-block ${row[5] === 'Lunas' ? 'bg-success bg-opacity-15 text-success' :
                                      row[5] === 'Cicilan' ? 'bg-indigo-100 text-indigo-700' : 'bg-danger/20 text-danger'
                                    }`}>
                                    {row[5]}
                                  </span>
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                Belum ada riwayat transaksi.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 px-6 py-4 border-t border-border flex justify-between items-center print:hidden">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const ledger = deriveSupplierLedgerRows(viewingSupplierTx.id);
                        const headers = ['TANGGAL', 'DOKUMEN REF', 'KETERANGAN MUTASI', 'DEBIT (+)', 'KREDIT (-)', 'SALDO HUTANG'];
                        const rows = ledger.map(l => [
                          l[0], l[1], l[7],
                          l[2],
                          l[3],
                          l[4]
                        ]);
                        generateReportPDF(
                          'BUKU BESAR SUPPLIER / HUTANG',
                          `Instansi: ${viewingSupplierTx.nama} (${viewingSupplierTx.id}) | Kontak: ${viewingSupplierTx.kontak}`,
                          new Date().toLocaleDateString('id-ID'),
                          headers,
                          rows,
                          [],
                          `Buku_Besar_Supplier_${viewingSupplierTx.id}.pdf`,
                          'landscape'
                        );
                      }}
                      className="px-4 py-2 bg-slate-800 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5"
                    >
                      <Printer size={14} />
                      <span>Download Buku Besar Instansi (PDF)</span>
                    </button>
                    <button
                      onClick={() => {
                        const ledger = deriveSupplierLedgerRows(viewingSupplierTx.id);
                        const wsData: any[][] = [
                          ['BUKU BESAR SUPPLIER / HUTANG'],
                          ['Nama Vendor:', viewingSupplierTx.nama],
                          ['ID Supplier:', viewingSupplierTx.id],
                          ['Kontak:', `${viewingSupplierTx.kontak} (${viewingSupplierTx.telp})`],
                          ['Tanggal Cetak:', new Date().toLocaleDateString('id-ID')],
                          [''],
                          ['TANGGAL', 'DOKUMEN REF', 'KETERANGAN MUTASI', 'DEBIT (+)', 'KREDIT (-)', 'SALDO HUTANG']
                        ];
                        ledger.forEach(row => {
                          const deb = typeof row[3] === 'number' ? row[3] : (parseInt(row[3].toString().replace(/\D/g, '')) || 0);
                          const kre = typeof row[4] === 'number' ? row[4] : (parseInt(row[4].toString().replace(/\D/g, '')) || 0);
                          const sal = typeof row[5] === 'number' ? row[5] : (parseInt(row[5].toString().replace(/\D/g, '')) || 0);
                          wsData.push([row[0], row[1], row[2], deb, kre, sal]);
                        });
                        if (typeof XLSX !== 'undefined') {
                          const ws = XLSX.utils.aoa_to_sheet(wsData);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Buku Besar");
                          XLSX.writeFile(wb, `Buku_Besar_${viewingSupplierTx.id}_${new Date().toISOString().slice(0, 10)}.xlsx`);
                        } else {
                          triggerToast('Library Excel tidak ditemukan', 'error');
                        }
                      }}
                      className="px-4 py-2 bg-success hover:bg-success/90 text-white text-sm font-semibold rounded-card shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet size={14} />
                      <span>Ekspor Buku Besar (.xlsx)</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setViewingSupplierTx(null)}
                    className="bg-white border border-slate-300 hover:bg-slate-50 text-slate-800 px-5 py-2 rounded-card text-sm font-bold transition-all shadow-sm"
                  >
                    Tutup Rincian
                  </button>
                </div>
              </div>
            </div>
          )}

          {showCreateCompanyModal && (
            <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
              <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 relative my-auto">
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
                  <div className="bg-warning/10 border border-warning/30 text-warning p-3.5 rounded-card text-sm space-y-1">
                    <p className="font-extrabold flex items-center gap-1">
                      ⚠️ PERINGATAN RE-INISIALISASI DATA
                    </p>
                    <p className="leading-relaxed opacity-90 text-[11px]">
                      Sistem akan membuat database baru dan memuat template yang dipilih. Data transaksi dan master aktif saat ini akan digantikan seluruhnya.
                    </p>
                  </div>
                  <div className="space-y-3.5">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black uppercase text-secondary tracking-wider">Nama Perusahaan / Toko</label>
                      <input
                        type="text"
                        required
                        value={newCompanyForm.nama}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, nama: e.target.value })}
                        placeholder="Cth: PT. Bakeri Sentosa, Toko Kelontong Jaya"
                        className="w-full border border-border p-2.5 rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary tracking-wider">Telepon / HP</label>
                        <input
                          type="text"
                          value={newCompanyForm.telp}
                          onChange={(e) => setNewCompanyForm({ ...newCompanyForm, telp: e.target.value })}
                          placeholder="Cth: 08123456789"
                          className="w-full border border-border p-2.5 rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none font-mono"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[11px] font-black uppercase text-secondary tracking-wider">Kota Operasional</label>
                        <input
                          type="text"
                          value={newCompanyForm.kota}
                          onChange={(e) => setNewCompanyForm({ ...newCompanyForm, kota: e.target.value })}
                          placeholder="Cth: Denpasar, Jakarta"
                          className="w-full border border-border p-2.5 rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[11px] font-black uppercase text-secondary tracking-wider">Alamat Lengkap</label>
                      <textarea
                        rows={2}
                        value={newCompanyForm.alamat}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, alamat: e.target.value })}
                        placeholder="Cth: Jl. Gatot Subroto No. 123, Kel. Dangin Puri"
                        className="w-full border border-border p-2.5 rounded-card text-sm font-bold text-primary focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5 bg-slate-50 border border-border p-3.5 rounded-card">
                      <label className="text-[11px] font-black uppercase text-success tracking-wider mb-1">Pilih Template Basis Bisnis</label>
                      <select
                        value={newCompanyForm.tipeTemplate}
                        onChange={(e) => setNewCompanyForm({ ...newCompanyForm, tipeTemplate: e.target.value })}
                        className="w-full border border-border p-2.5 rounded-card text-sm font-extrabold text-primary bg-white focus:ring-1 focus:ring-primary"
                      >
                        <option value="empty">Mulai dari Nol (Bersih / Kosong Tanpa Transaksi & Master)</option>
                        <option value="bakery">Sourdough Bakery & Manufaktur (Bahan Baku, Produk Jadi, BOM & Resep)</option>
                        <option value="retail">Retail & Toko Kelontong (Kopi Gayo, Susu UHT, Snack, Pelanggan)</option>
                        <option value="consignment">Konsinyasi & Multi-Platform (Mitra Donat, Komisi, Suplier)</option>
                      </select>
                      <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed text-left">
                        *Sistem otomatis menyuntikkan saldo kas awal awal Rp 10jt - Rp 20jt sebagai modal kerja sesuai template yang dipilih.
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowCreateCompanyModal(false)}
                      className="px-4 py-2.5 text-sm font-bold border border-border text-secondary hover:bg-slate-50 rounded-card transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-sm font-extrabold bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white rounded-card shadow-md transition-all cursor-pointer uppercase tracking-wider"
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
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-border grid grid-cols-5 md:hidden z-50 pb-safe shadow-lg">
        {NAV_GROUPS.map(group => {
          const active = isGroupActive(group);
          return (
            <button
              key={group.id}
              onClick={() => {
                if (group.direct) setActiveTab(group.id);
                else setActiveTab(group.children?.[0].id); // default to first child
              }}
              className={`flex flex-col items-center justify-center gap-1 py-2 px-1 text-[11px] font-medium transition-colors cursor-pointer ${active ? 'text-primary' : 'text-secondary hover:text-primary'
                }`}
            >
              {group.icon}
              <span className="scale-90 origin-center">{group.label}</span>
            </button>
          );
        })}
      </nav>
      {/* Add Cash Account Modal */}
      {isAddCashAccountOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-card shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex justify-between items-center bg-slate-50 rounded-t-card">
              <h2 className="text-lg font-black text-primary uppercase">{editingAccountName ? 'EDIT AKUN KAS' : 'TAMBAH AKUN KAS'}</h2>
              <button onClick={() => { setIsAddCashAccountOpen(false); setEditingAccountName(null); setNewCashAccountForm({ nomor: '', nama: '', jenis: 'Kas', fungsi: 'General' }); }} className="text-slate-400 hover:text-danger p-1">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[11px] font-black uppercase text-secondary mb-1">Nomor Akun (Opsional)</label>
                <input
                  type="text"
                  value={newCashAccountForm.nomor}
                  onChange={e => setNewCashAccountForm({ ...newCashAccountForm, nomor: e.target.value })}
                  placeholder="Misal: 110-10"
                  className="w-full border border-border rounded-card px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-secondary mb-1">Nama Akun</label>
                <input
                  type="text"
                  value={newCashAccountForm.nama}
                  onChange={e => setNewCashAccountForm({ ...newCashAccountForm, nama: e.target.value })}
                  placeholder="Misal: Bank BCA"
                  className="w-full border border-border rounded-card px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-secondary mb-1">Jenis Akun</label>
                <select
                  value={newCashAccountForm.jenis || 'Kas'}
                  onChange={e => setNewCashAccountForm({ ...newCashAccountForm, jenis: e.target.value })}
                  className="w-full border border-border rounded-card px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                >
                  <option value="Kas">Kas</option>
                  <option value="Bank">Bank</option>
                  <option value="Kas Kecil">Kas Kecil</option>
                  <option value="e-Wallet">e-Wallet</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-black uppercase text-secondary mb-1">Fungsi Utama</label>
                <select
                  value={newCashAccountForm.fungsi}
                  onChange={e => setNewCashAccountForm({ ...newCashAccountForm, fungsi: e.target.value })}
                  className="w-full border border-border rounded-card px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-primary focus:outline-none bg-white"
                >
                  <option value="General">General (Kas/Bank Standar)</option>
                  <option value="Penerimaan">Penerimaan (Hanya Uang Masuk)</option>
                  <option value="Pengeluaran">Pengeluaran (Petty Cash/Kas Kecil)</option>
                </select>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-slate-50 flex justify-end gap-2 rounded-b-card">
              <button onClick={() => { setIsAddCashAccountOpen(false); setEditingAccountName(null); setNewCashAccountForm({ nomor: '', nama: '', jenis: 'Kas', fungsi: 'General' }); }} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer">Batal</button>
              <button
                onClick={() => {
                  // ponytail: validasi duplikasi akun kas
                  if (!newCashAccountForm.nama.trim()) {
                    alert('Nama akun tidak boleh kosong!');
                    return;
                  }
                  if (editingAccountName) {
                    if (settingCashAccounts.some(a => a.nama !== editingAccountName && a.nama.toLowerCase() === newCashAccountForm.nama.trim().toLowerCase())) {
                      alert('Nama akun sudah digunakan!');
                      return;
                    }
                    if (newCashAccountForm.nomor.trim() !== '' && settingCashAccounts.some(a => a.nama !== editingAccountName && a.nomor === newCashAccountForm.nomor.trim())) {
                      alert('Nomor akun sudah digunakan!');
                      return;
                    }
                    setSettingCashAccounts(settingCashAccounts.map(a => a.nama === editingAccountName ? { ...newCashAccountForm } : a));
                  } else {
                    if (settingCashAccounts.some(a => a.nama.toLowerCase() === newCashAccountForm.nama.trim().toLowerCase())) {
                      alert('Nama akun sudah digunakan!');
                      return;
                    }
                    if (newCashAccountForm.nomor.trim() !== '' && settingCashAccounts.some(a => a.nomor === newCashAccountForm.nomor.trim())) {
                      alert('Nomor akun sudah digunakan!');
                      return;
                    }
                    setSettingCashAccounts([...settingCashAccounts, { ...newCashAccountForm }]);
                  }

                  setIsAddCashAccountOpen(false);
                  setEditingAccountName(null);
                  setNewCashAccountForm({ nomor: '', nama: '', jenis: 'Kas', fungsi: 'General' });
                }}
                className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary-hover shadow cursor-pointer"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Confirmation Modal */}
      {showPoConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowPoConfirmModal(false)} />
          <div className="bg-white rounded-card shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in relative z-10">
            <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-black text-amber-900 text-lg mb-1">Konfirmasi Pengesahan PO</h3>
                <p className="text-sm text-amber-700/80 leading-relaxed">
                  Anda akan mensahkan Purchase Order ke <b>{poForm.supplier}</b>.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Jumlah Item:</span>
                  <span className="font-bold text-slate-800">{poForm.items.filter((i: any) => i.sku && i.qty > 0).length} Barang</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-bold text-slate-800">Rp {poForm.items.reduce((acc: number, cur: any) => acc + ((cur.qty || 0) * (cur.harga || 0)), 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Apakah Anda yakin data transaksi ini sudah benar dan siap disahkan?
              </p>
            </div>
            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setShowPoConfirmModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">Kembali / Periksa Lagi</button>
              <button onClick={() => { setShowPoConfirmModal(false); processSavePO(pendingDraftState); }} className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">Ya, Sahkan Transaksi</button>
            </div>
          </div>
        </div>
      )}

      {/* SO Confirmation Modal */}
      {showSoConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowSoConfirmModal(false)} />
          <div className="bg-white rounded-card shadow-xl border border-border w-full max-w-md overflow-hidden animate-fade-in relative z-10">
            <div className="bg-amber-50 p-6 border-b border-amber-100 flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="font-black text-amber-900 text-lg mb-1">Konfirmasi Pengesahan SO</h3>
                <p className="text-sm text-amber-700/80 leading-relaxed">
                  Anda akan mensahkan Sales Order ke <b>{soForm.pelanggan}</b>.
                </p>
              </div>
            </div>
            <div className="p-6">
              <div className="bg-slate-50 rounded-lg p-4 mb-4 border border-slate-100 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Jumlah Item:</span>
                  <span className="font-bold text-slate-800">{soForm.items.filter((i: any) => i.sku && i.qty > 0).length} Barang</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Total Tagihan:</span>
                  <span className="font-bold text-slate-800">Rp {soForm.items.reduce((acc: number, cur: any) => acc + ((cur.qty || 0) * (cur.harga || 0)), 0).toLocaleString('id-ID')}</span>
                </div>
              </div>
              <p className="mt-4 text-sm text-slate-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
                Apakah Anda yakin data transaksi ini sudah benar dan siap disahkan?
              </p>
            </div>
            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
              <button onClick={() => setShowSoConfirmModal(false)} className="px-4 py-2 text-sm font-bold text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors">Kembali / Periksa Lagi</button>
              <button onClick={() => { setShowSoConfirmModal(false); processSaveSO(pendingDraftState); }} className="px-4 py-2 text-sm font-bold bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors shadow-md shadow-primary/20">Ya, Sahkan Transaksi</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
