import React, { useState } from 'react';
import { Settings, DollarSign, Layers, Lock, Trash2 } from 'lucide-react';
import { hashPassword } from '../authService';
import { getProducts, saveAllProducts, getSalesOrders, saveAllSalesOrders, getPurchaseOrders, saveAllPurchaseOrders, getCustomers, saveAllCustomers, getSuppliers, saveAllSuppliers, saveSettingsToGas } from '../dataService';

export interface SettingsTabProps {
  namaToko: string; setNamaToko: (v: string) => void;
  alamatToko: string; setAlamatToko: (v: string) => void;
  telpToko: string; setTelpToko: (v: string) => void;
  kotaToko: string; setKotaToko: (v: string) => void;
  ppnRate: number; setPpnRate: (v: number) => void;
  metodeHppDefault: string; setMetodeHppDefault: (v: string) => void;
  mataUang: string; setMataUang: (v: string) => void;
  driveFolderStruk: string; setDriveFolderStruk: (v: string) => void;
  formatTanggal: string; setFormatTanggal: (v: string) => void;
  tipeBisnis: string; setTipeBisnis: (v: string) => void;
  isLoginActive: boolean; setIsLoginActive: (v: boolean) => void;
  loginUsername: string; setLoginUsername: (v: string) => void;
  loginPassword: string; setLoginPassword: (v: string) => void;
  settingUsersList: any[]; setSettingUsersList: (v: any[]) => void;
  setIsLoggedIn: (v: boolean) => void;
  triggerToast: (msg: string, type: string) => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  namaToko, setNamaToko,
  alamatToko, setAlamatToko,
  telpToko, setTelpToko,
  kotaToko, setKotaToko,
  ppnRate, setPpnRate,
  metodeHppDefault, setMetodeHppDefault,
  mataUang, setMataUang,
  driveFolderStruk, setDriveFolderStruk,
  formatTanggal, setFormatTanggal,
  tipeBisnis, setTipeBisnis,
  isLoginActive, setIsLoginActive,
  loginUsername, setLoginUsername,
  loginPassword, setLoginPassword,
  settingUsersList, setSettingUsersList,
  setIsLoggedIn, triggerToast
}) => {
  const [settingSubTab, setSettingSubTab] = useState<string>('profil');
  const [importJson, setImportJson] = useState('');
  const [importTarget, setImportTarget] = useState('produk');
  const [importStep, setImportStep] = useState<1 | 2>(1);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const [importErrors, setImportErrors] = useState<string[]>([]);

  return (
    <div className="bg-white rounded-card shadow-sm border border-border overflow-hidden">
      <div className="p-5 border-b border-border bg-slate-50 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-primary flex items-center gap-2">
            <Settings className="text-primary" /> Pengaturan Sistem
          </h2>
          <p className="text-xs text-secondary mt-1">Konfigurasi bisnis, manajemen tim, dan keamanan aplikasi.</p>
        </div>
      </div>
      {/* Sub Navigation Tabs */}
      <div className="flex items-center gap-1 border-b border-border overflow-x-auto pb-px scrollbar-none">
        {[
          { id: 'profil', label: '🏪 Profil Toko' },
          { id: 'user', label: '👥 Pengguna & Sandi' },
          { id: 'dev', label: '🔌 Celah Import' }
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
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
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
                    min="0" max="30"
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
        <div className="p-5 space-y-6 animate-fade-in">
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
                    value={loginPassword.length === 64 ? '' : loginPassword}
                    placeholder={loginPassword.length === 64 ? '******** (Terenkripsi)' : 'Masukkan password baru...'}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onBlur={async (e) => {
                      const val = e.target.value;
                      if (val && !(val.length === 64 && /^[0-9a-f]{64}$/i.test(val))) {
                        setLoginPassword(await hashPassword(val));
                        triggerToast('Password Superadmin diperbarui!', 'success');
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
                <p className="text-[11px] text-slate-400">Atur akses untuk tim operasional gudang dan kasir.</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingUsersList([...settingUsersList, { email: '', nama: '', role: 'Kasir' }])}
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
                          value={usr.pin && usr.pin.length === 64 ? '' : (usr.pin || '')}
                          placeholder={usr.pin && usr.pin.length === 64 ? '****' : 'PIN...'}
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
                              triggerToast('PIN Pengguna diperbarui!', 'success');
                            }
                          }}
                          className="w-24 mx-auto block text-center p-2 border border-border rounded-card text-sm font-mono font-bold"
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
      <div className="p-5">
        <div className="bg-slate-100 rounded-card p-5 border border-border flex flex-col sm:flex-row justify-between items-center gap-3">
          <div>
            <h4 className="text-sm font-extrabold text-primary">☁️ Sinkronisasi Pengaturan</h4>
            <p className="text-[11px] text-secondary">Pengaturan berubah secara lokal. Tekan tombol ini agar berlaku di perangkat lain (HP, dsb).</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                triggerToast('Menyimpan ke awan...', 'info');
                try {
                  await saveSettingsToGas([
                    { key: 'login_username', value: loginUsername },
                    { key: 'login_password', value: loginPassword },
                    { key: 'nama_toko', value: namaToko },
                    { key: 'tipe_bisnis', value: tipeBisnis },
                    { key: 'alamat_toko', value: alamatToko },
                    { key: 'telp_toko', value: telpToko },
                    { key: 'kota_toko', value: kotaToko },
                    { key: 'mata_uang', value: mataUang },
                    { key: 'ppn_rate', value: ppnRate.toString() },
                    { key: 'metode_hpp_default', value: metodeHppDefault }
                  ]);
                  triggerToast('Pengaturan disinkronkan ke semua perangkat!', 'success');
                } catch(e: any) {
                  triggerToast('Gagal sinkronisasi: ' + e.message, 'error');
                }
              }}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white font-extrabold text-[11px] rounded-card transition-all uppercase tracking-wider whitespace-nowrap shadow-sm"
            >
              Simpan & Sinkronkan ke Server
            </button>
            <button
              onClick={() => {
                const confirmReset = window.confirm('Apakah Anda yakin ingin menyetel ulang seluruh pengaturan lokal browser ini? Tindakan ini tidak dapat dibatalkan.');
                if (confirmReset) {
                  localStorage.clear();
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-danger hover:bg-danger text-white font-extrabold text-[11px] rounded-card transition-all uppercase tracking-wider whitespace-nowrap"
            >
              Reset Browser
            </button>
          </div>
        </div>
      </div>
      
      {/* TAB CONTENT: DEV IMPORT */}
      {settingSubTab === 'dev' && (
        <div className="p-5 space-y-6 animate-fade-in">
          <div className="bg-white border border-border rounded-card p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-black text-primary uppercase tracking-wider flex items-center gap-2 border-b pb-2">
              <Layers className="w-4 h-4" /> Import Data via CSV/TSV
            </h3>
            
            {importStep === 1 ? (
              <>
                {importTarget === 'produk' && (
                  <p className="text-sm text-secondary">
                    <strong>Format Template Produk (pisahkan dengan Tanda Tab / Koma):</strong><br />
                    <code className="bg-slate-100 p-1 rounded">sku, kategori, subKategori, nama, satuan, hargaJual, hpp, safetyStock, stok, status, supplierUtama, lokasi, masaSimpan, catatan</code>
                  </p>
                )}
                {importTarget === 'customer' && (
                  <p className="text-sm text-secondary">
                    <strong>Format Template Pelanggan (pisahkan dengan Tanda Tab / Koma):</strong><br />
                    <code className="bg-slate-100 p-1 rounded">id, nama, kontak, email, telp, alamat, piutang</code>
                  </p>
                )}
                {importTarget === 'supplier' && (
                  <p className="text-sm text-secondary">
                    <strong>Format Template Supplier (pisahkan dengan Tanda Tab / Koma):</strong><br />
                    <code className="bg-slate-100 p-1 rounded">id, nama, kontak, email, telp, alamat, hutang</code>
                  </p>
                )}
                {importTarget === 'po' && (
                  <p className="text-sm text-secondary">
                    <strong>Format Template Pembelian/PO (pisahkan dengan Tanda Tab / Koma):</strong><br />
                    <code className="bg-slate-100 p-1 rounded">id, tanggal, supplierId, namaSupplier, terminPembayaran, jatuhTempo, subtotal, diskon, ppn, grandTotal, statusLogistik, statusPembayaran, dibuatOleh, tanggalUpdate, catatan</code>
                  </p>
                )}
                {importTarget === 'so' && (
                  <p className="text-sm text-secondary">
                    <strong>Format Template Penjualan/SO (pisahkan dengan Tanda Tab / Koma):</strong><br />
                    <code className="bg-slate-100 p-1 rounded">id, tanggal, pelanggan, metodePembayaran, subtotal, diskon, pajak, grandTotal, statusLogistik, statusPembayaran, kasir, catatan</code>
                  </p>
                )}
                <div className="flex gap-4">
                  <select 
                    value={importTarget} 
                    onChange={e => setImportTarget(e.target.value)}
                    className="p-2 border border-border rounded-card bg-white focus:ring-1 focus:ring-primary">
                    <option value="produk">Data Barang (Produk)</option>
                    <option value="so">Penjualan (SO)</option>
                    <option value="po">Pembelian (PO)</option>
                    <option value="customer">Pelanggan (Customer)</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>
                
                <textarea 
                  value={importJson}
                  onChange={e => setImportJson(e.target.value)}
                  placeholder='Copy data dari Excel / Google Sheets, lalu paste ke kotak ini.'
                  className="w-full h-48 p-3 font-mono text-xs border border-border rounded-card bg-slate-50 focus:ring-1 focus:ring-primary"
                />
                
                <button
                  onClick={() => {
                    try {
                      let parsed: any[] = [];
                      const raw = importJson.trim();
                      const errors: string[] = [];
                      if (!raw) throw new Error('Data tidak boleh kosong!');
                      
                      if (raw.startsWith('[') && raw.endsWith(']')) {
                        parsed = JSON.parse(raw);
                      } else {
                        // ponytail: debug - log raw data length & first 100 chars
                        console.log('[CSV Debug] raw length:', raw.length, '| first 100 chars:', JSON.stringify(raw.slice(0, 100)));
                        const lines = raw.split(/\r?\n|\r/);
                        console.log('[CSV Debug] lines detected:', lines.length);
                        if (lines.length < 2) throw new Error(`Hanya ${lines.length} baris terdeteksi. Pastikan data berisi header + minimal 1 baris data (ada enter/baris baru antar baris).`);
                        const sep = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
                        const originalHeaders = lines[0].split(sep).map(h => h.trim());
                        for (let i = 1; i < lines.length; i++) {
                          if (!lines[i].trim()) continue;
                          const values = lines[i].split(sep).map(v => v.trim());
                          // Flexible row length allowed
                          
                          const obj: any = {};
                          originalHeaders.forEach((origH, idx) => {
                            let h = origH.toLowerCase();
                            let key = origH; 
                            if (h === 'harga jual' || h === 'harga_jual' || h === 'hargajual') key = 'hj';
                            else if (h === 'stok' || h === 'qty') key = 'stok';
                            else if (h === 'subkategori' || h === 'sub_kategori' || h === 'sub kategori') key = 'subKat';
                            else if (h === 'safetystock' || h === 'safety_stock' || h === 'safety stock') key = 'safety';
                            else if (h === 'supplierutama' || h === 'supplier_utama' || h === 'supplier utama' || h === 'supplier') key = 'supplier';
                            else if (h === 'masasimpan' || h === 'masa_simpan' || h === 'masa simpan') key = 'masaSmp';
                            else if (h === 'lokasi' || h === 'tempatsimpan' || h === 'tempat_simpan' || h === 'tempat simpan') key = 'tempatSimpan';
                            else if (h === 'jatuh tempo' || h === 'jatuh_tempo' || h === 'jatuhtempo') key = 'jatuhTempo';
                            else if (h === 'id pelanggan') key = 'pelanggan';
                            
                            let val: any = values[idx] || '';
                            if (!isNaN(val as any) && val !== '') val = Number(val);
                            obj[key] = val;
                          });
                          
                          if (importTarget === 'so' || importTarget === 'po') {
                            obj.items = [];
                            obj.returItems = [];
                            obj.logistikLogs = [];
                            obj.pembayaranLogs = [];
                          }
                          
                          if (importTarget === 'product' && !obj.sku) {
                            errors.push(`Baris ke-${i + 1} diabaikan karena kolom SKU kosong.`);
                            continue;
                          }
                          if (importTarget !== 'product' && !obj.id) {
                            errors.push(`Baris ke-${i + 1} diabaikan karena kolom ID kosong.`);
                            continue;
                          }
                          
                          parsed.push(obj);
                        }
                      }
                      
                      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error('Data kosong atau tidak valid!');
                      setPreviewData(parsed);
                      setImportErrors(errors);
                      setPreviewPage(1);
                      setImportStep(2);
                    } catch(e: any) {
                      triggerToast(e.message, 'error');
                    }
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-card font-bold hover:bg-primary-dark"
                >
                  Lihat Preview Data
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-secondary">
                    Preview Data: <span className="text-primary">{previewData.length} Baris valid ditemukan</span>
                  </p>
                  <p className="text-xs text-secondary italic">Halaman {previewPage} (max 10 baris per halaman)</p>
                </div>
                
                {importErrors.length > 0 && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-card text-xs text-danger max-h-32 overflow-y-auto">
                    <p className="font-bold mb-1">⚠️ Ditemukan {importErrors.length} baris bermasalah (Diabaikan):</p>
                    <ul className="list-disc pl-5">
                      {importErrors.map((err, idx) => <li key={idx}>{err}</li>)}
                    </ul>
                    <p className="mt-1 italic opacity-80">Catatan: Pastikan tidak ada karakter koma (,) di dalam teks nama barang Anda jika CSV-nya dipisah pakai koma.</p>
                  </div>
                )}
                
                <div className="overflow-x-auto border border-border rounded-card mb-4 max-h-64">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="bg-slate-100 sticky top-0 border-b border-border text-secondary">
                      <tr>
                        {Object.keys(previewData[0] || {}).map(k => (
                          <th key={k} className="p-2 border-r border-border font-bold uppercase tracking-wider">{k}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.slice((previewPage - 1) * 10, previewPage * 10).map((row, i) => (
                        <tr key={i} className="border-b border-border hover:bg-slate-50">
                          {Object.keys(row).map(k => (
                            <td key={k} className="p-2 border-r border-border">{String(row[k] ?? '-')}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="flex items-center justify-between mb-4">
                   <div className="flex gap-2">
                     <button 
                       disabled={previewPage === 1} 
                       onClick={() => setPreviewPage(p => Math.max(1, p - 1))}
                       className="px-3 py-1 bg-slate-100 border border-border rounded text-xs disabled:opacity-50"
                     >
                       Prev
                     </button>
                     <button 
                       disabled={previewPage * 10 >= previewData.length} 
                       onClick={() => setPreviewPage(p => p + 1)}
                       className="px-3 py-1 bg-slate-100 border border-border rounded text-xs disabled:opacity-50"
                     >
                       Next
                     </button>
                   </div>
                   <span className="text-xs text-secondary">
                     Menampilkan {(previewPage - 1) * 10 + 1} - {Math.min(previewPage * 10, previewData.length)} dari {previewData.length}
                   </span>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={() => setImportStep(1)}
                    className="px-4 py-2 border border-border text-secondary rounded-card font-bold hover:bg-slate-50"
                  >
                    Kembali Edit
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        triggerToast('Proses Upload Dimulai... Mohon tunggu', 'info');
                        if (importTarget === 'produk') {
                          const existing = await getProducts();
                          await saveAllProducts([...existing, ...previewData]);
                        } else if (importTarget === 'so') {
                          const existing = await getSalesOrders();
                          await saveAllSalesOrders([...existing, ...previewData]);
                        } else if (importTarget === 'po') {
                          const existing = await getPurchaseOrders();
                          await saveAllPurchaseOrders([...existing, ...previewData]);
                        } else if (importTarget === 'customer') {
                          const existing = await getCustomers();
                          await saveAllCustomers([...existing, ...previewData]);
                        } else if (importTarget === 'supplier') {
                          const existing = await getSuppliers();
                          await saveAllSuppliers([...existing, ...previewData]);
                        }
                        triggerToast('Data berhasil di-upload!', 'success');
                        setTimeout(() => window.location.reload(), 1500);
                      } catch(e: any) {
                        triggerToast('Gagal Upload: ' + e.message, 'error');
                      }
                    }}
                    className="px-6 py-2 bg-primary text-white rounded-card font-bold hover:bg-primary-dark flex-1 shadow-md hover:shadow-lg transition-all"
                  >
                    Konfirmasi & Upload {previewData.length} Baris
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
