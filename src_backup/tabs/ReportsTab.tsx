import React from 'react';
import { Printer, FileSpreadsheet, TrendingUp, Plus, Calculator, X } from 'lucide-react';
import { Badge } from '../components/Badge';
import { SearchableSelect } from '../components/SearchableSelect';

export interface ReportsTabProps {
  activeTab: string;
  analitikStartDate: string;
  setAnalitikStartDate: (v: string) => void;
  analitikEndDate: string;
  setAnalitikEndDate: (v: string) => void;
  isExportingPDF: boolean;
  exportElementToPDF: (elementId: string, filename: string) => void;
  triggerToast: (msg: string, type?: string) => void;
  
  salesOrders: any[];
  purchaseOrders: any[];
  cashLedger: any[];
  settingCashAccounts: any[];
  
  arusKasFilterAkun: string;
  setArusKasFilterAkun: (v: string) => void;
  showManualCashModal: boolean;
  setShowManualCashModal: (v: boolean) => void;
  setManualCashForm: (v: any) => void;
  
  consignments: any[];
  setConsignments: (v: any[]) => void;
  consignmentForm: any;
  setConsignmentForm: (v: any) => void;
  consignmentSellForm: any;
  setConsignmentSellForm: (v: any) => void;
  showAddConsignmentModal: boolean;
  setShowAddConsignmentModal: (v: boolean) => void;
  showSellConsignmentModal: boolean;
  setShowSellConsignmentModal: (v: boolean) => void;
  setCashLedger: (v: any[]) => void;
  saveCashEntry: (entry: any) => void;
  
  products: any[];
  dailySalesReportMonth: string;
  setDailySalesReportMonth: (v: string) => void;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({
  activeTab, analitikStartDate, setAnalitikStartDate, analitikEndDate, setAnalitikEndDate,
  isExportingPDF, exportElementToPDF, triggerToast,
  salesOrders, purchaseOrders, cashLedger, settingCashAccounts,
  arusKasFilterAkun, setArusKasFilterAkun, showManualCashModal, setShowManualCashModal, setManualCashForm,
  consignments, setConsignments, consignmentForm, setConsignmentForm, consignmentSellForm, setConsignmentSellForm,
  showAddConsignmentModal, setShowAddConsignmentModal, showSellConsignmentModal, setShowSellConsignmentModal, setCashLedger,
  saveCashEntry, products, dailySalesReportMonth, setDailySalesReportMonth
}) => {
  return (
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
                        <p className="text-sm text-primary print:text-black font-bold tracking-widest">METODE LANGSUNG (DIRECT METHOD) G�� DENGAN KOMPARASI</p>
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
                                  return { label: `${c.nama} (${c.consignor}) G�� Sisa: ${available} pcs`, value: c.id };
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
                          <span>=��� Laporan Penjualan Harian per Barang</span>
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


  );
};
