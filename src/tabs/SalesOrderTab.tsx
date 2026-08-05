import React from 'react';
import { FileText, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../components/Badge';
import { EmptyState } from '../components/EmptyState';
import { SearchableSelect } from '../components/SearchableSelect';

export interface SalesOrderTabProps {
  showSoForm: boolean;
  setShowSoForm: (v: boolean) => void;
  searchSoQuery: string;
  setSearchSoQuery: (v: string) => void;
  soForm: any;
  setSoForm: (v: any) => void;
  isEditingSo: boolean;
  setIsEditingSo: (v: boolean) => void;
  filteredSOs: any[];
  setSelectedSo: (v: any) => void;
  setSoActionForm: (v: any) => void;
  customers: any[];
  products: any[];
  handleSoItemChange: (index: number, field: string, value: any) => void;
  handleRemoveSoItem: (index: number) => void;
  handleAddSoItem: () => void;
  handleSaveSalesOrder: (isDraft: boolean) => void;
  handleVoidSO: (id: string) => void;
  isSavingSO: boolean;
}

export const SalesOrderTab: React.FC<SalesOrderTabProps> = ({
  showSoForm, setShowSoForm,
  searchSoQuery, setSearchSoQuery,
  soForm, setSoForm,
  isEditingSo, setIsEditingSo,
  filteredSOs, setSelectedSo, setSoActionForm,
  customers, products,
  handleSoItemChange, handleRemoveSoItem, handleAddSoItem,
  handleSaveSalesOrder, handleVoidSO,
  isSavingSO
}) => {
  return (
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
              {soForm.items.map((item: any, idx: number) => (
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
                <span>Rp {soForm.items.reduce((sum: number, item: any) => sum + item.subtotal, 0).toLocaleString('id-ID')}</span>
              </div>
              {soForm.pajak && (
                <div className="flex justify-between text-text-secondary">
                  <span>PPN (12%)</span>
                  <span>Rp {Math.round(soForm.items.reduce((sum: number, item: any) => sum + item.subtotal, 0) * 0.12).toLocaleString('id-ID')}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-text-primary border-t border-border pt-2">
                <span>TOTAL AKHIR</span>
                <span className="text-primary">
                  Rp {(
                    soForm.items.reduce((sum: number, item: any) => sum + item.subtotal, 0) +
                    (soForm.pajak ? Math.round(soForm.items.reduce((sum: number, item: any) => sum + item.subtotal, 0) * 0.12) : 0)
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
  );
};
