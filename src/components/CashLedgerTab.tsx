import React from 'react';
import { Plus, CornerUpLeft } from 'lucide-react';

export interface CashLedgerTabProps {
  selectedCashAccount: any;
  bukuBesarActiveAkun: string;
  settingCashAccounts: any[];
  cashLedger: any[];
  cashLedgerView: 'list' | 'detail';
  setNewCashAccountForm: (form: any) => void;
  setIsAddCashAccountOpen: (isOpen: boolean) => void;
  setSelectedCashAccount: (account: any) => void;
  setCashLedgerView: (view: 'list' | 'detail') => void;
  setEditingAccountName: (name: string) => void;
  setSettingCashAccounts: (accounts: any[]) => void;
  handleDeleteManualCash: (id: string) => void;
}

export const CashLedgerTab: React.FC<CashLedgerTabProps> = ({
  selectedCashAccount,
  bukuBesarActiveAkun,
  settingCashAccounts,
  cashLedger,
  cashLedgerView,
  setNewCashAccountForm,
  setIsAddCashAccountOpen,
  setSelectedCashAccount,
  setCashLedgerView,
  setEditingAccountName,
  setSettingCashAccounts,
  handleDeleteManualCash
}) => {
  const activeAkun = selectedCashAccount?.nama || bukuBesarActiveAkun || (settingCashAccounts.length > 0 ? settingCashAccounts[0].nama : '');
  // Calculate current balances dynamically
  const currentBalances: Record<string, number> = {};
  settingCashAccounts.forEach(acc => currentBalances[acc.nama] = 0);
  cashLedger.forEach(c => {
    if (currentBalances.hasOwnProperty(c.akun || 'Bank')) {
      currentBalances[c.akun || 'Bank'] += (c.debit || 0) - (c.kredit || 0);
    }
  });

  const sortedFilteredLedger = [...cashLedger]
    .filter(c => (c.akun || 'Bank') === activeAkun)
    .sort((a, b) => {
      const dateA = new Date(a.tanggal).getTime();
      const dateB = new Date(b.tanggal).getTime();
      if (dateA !== dateB) return dateA - dateB;
      return a.id.localeCompare(b.id);
    });

  let runningBalance = 0;
  const processedLedger = sortedFilteredLedger.map(tx => {
    runningBalance += (tx.debit || 0) - (tx.kredit || 0);
    return { ...tx, computedSaldo: runningBalance };
  });

  return (
    <div className="space-y-6">
      {cashLedgerView === 'list' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white p-5 border border-border rounded-card shadow-sm">
            <div>
              <h2 className="text-xl font-black text-primary uppercase tracking-wide">📖 Daftar Akun Kas</h2>
              <p className="text-xs text-text-secondary mt-1 font-semibold">Pilih akun kas atau bank untuk melihat riwayat buku besarnya.</p>
            </div>
            <button
              onClick={() => {
                setNewCashAccountForm({ nomor: '', nama: '', jenis: 'Kas', fungsi: 'General' });
                setIsAddCashAccountOpen(true);
              }}
              className="bg-primary hover:bg-primary-hover text-white px-4 py-2.5 rounded-card flex items-center gap-2 font-bold text-sm shadow transition-all cursor-pointer"
            >
              <Plus size={16} />
              <span>Tambah Akun</span>
            </button>
          </div>

          <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 border-b border-border text-primary font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Nomor Akun</th>
                    <th className="p-3">Nama Akun</th>
                    <th className="p-3 text-center">Fungsi</th>
                    <th className="p-3 text-right">Saldo Terkini</th>
                    <th className="p-3 text-center">AKSI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {settingCashAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-500 font-medium">Belum ada akun kas.</td>
                    </tr>
                  ) : (
                    settingCashAccounts.map((acc, idx) => {
                      const bal = currentBalances[acc.nama] || 0;
                      return (
                        <tr 
                          key={idx} 
                          onClick={() => {
                            setSelectedCashAccount(acc);
                            setCashLedgerView('detail');
                          }}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="p-3 text-xs font-mono font-bold text-slate-600">{acc.nomor || '-'}</td>
                          <td className="p-3 font-bold text-primary">{acc.nama}</td>
                          <td className="p-3 text-center">
                            <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase border border-slate-200">
                              {acc.fungsi || 'General'}
                            </span>
                          </td>
                          <td className="p-3 text-right font-mono font-black text-slate-800">
                            Rp {bal.toLocaleString('id-ID')}
                          </td>
                          <td className="p-3 text-center">
                            <div className="flex justify-center items-center gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingAccountName(acc.nama);
                                  setNewCashAccountForm({
                                    nomor: acc.nomor || '',
                                    nama: acc.nama,
                                    jenis: acc.jenis || 'Kas',
                                    fungsi: acc.fungsi || 'General'
                                  });
                                  setIsAddCashAccountOpen(true);
                                }}
                                className="text-primary hover:text-primary-hover font-bold text-xs"
                              >
                                Edit
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if(window.confirm('Hapus akun kas ini?')) {
                                    setSettingCashAccounts(settingCashAccounts.filter(a => a.nama !== acc.nama));
                                  }
                                }}
                                className="text-danger hover:text-red-700 font-bold text-xs"
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-4 bg-white p-4 border border-border rounded-card shadow-sm">
            <button
              onClick={() => {
                setCashLedgerView('list');
                setSelectedCashAccount(null);
              }}
              className="p-2 bg-slate-100 text-slate-600 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors cursor-pointer"
            >
              <CornerUpLeft size={18} />
            </button>
            <div>
              <h2 className="text-lg font-black text-primary uppercase tracking-wide">
                {selectedCashAccount?.nama || 'Mutasi Transaksi'}
              </h2>
              <p className="text-xs font-bold text-slate-500">
                {selectedCashAccount?.nomor ? `Nomor: ${selectedCashAccount.nomor}` : 'Tanpa Nomor Akun'}
              </p>
            </div>
          </div>

          {/* TABEL RIWAYAT TRANSAKSI */}
          <div className="bg-white border border-border rounded-card shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-100 border-b border-border text-primary font-bold uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Tanggal</th>
                    <th className="p-3">ID Transaksi</th>
                    <th className="p-3">Ref</th>
                    <th className="p-3">Keterangan</th>
                    <th className="p-3 text-center">Kategori</th>
                    <th className="p-3 text-right">Debit (Masuk)</th>
                    <th className="p-3 text-right">Kredit (Keluar)</th>
                    <th className="p-3 text-right">Saldo</th>
                    <th className="p-3 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {processedLedger.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="p-8 text-center text-slate-500 font-medium">
                        Belum ada transaksi di akun kas ini.
                      </td>
                    </tr>
                  ) : (
                    processedLedger.map((tx) => (
                      <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 text-xs font-semibold">{tx.tanggal}</td>
                        <td className="p-3 text-xs font-mono font-bold text-slate-600">{tx.id}</td>
                        <td className="p-3 text-xs">{tx.ref || '-'}</td>
                        <td className="p-3 text-xs">{tx.keterangan}</td>
                        <td className="p-3 text-center">
                          <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold uppercase border border-slate-200">
                            {tx.kategori}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600">
                          {tx.debit > 0 ? `Rp ${(tx.debit ?? 0).toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-rose-600">
                          {tx.kredit > 0 ? `Rp ${(tx.kredit ?? 0).toLocaleString('id-ID')}` : '-'}
                        </td>
                        <td className="p-3 text-right font-mono font-black text-slate-800">
                          Rp {(tx.computedSaldo ?? 0).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-right">
                          {(tx.ref && tx.ref.startsWith('MANUAL')) ? (
                            <button 
                              type="button" 
                              onClick={(e) => { 
                                e.preventDefault(); 
                                e.stopPropagation(); 
                                handleDeleteManualCash(tx.id); 
                              }} 
                              className="text-red-600 hover:text-red-800 font-medium text-xs px-3 py-1 bg-red-50 hover:bg-red-100 rounded cursor-pointer transition-colors"
                            >
                              Hapus
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
