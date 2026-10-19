
// ponytail: Refactor guard clauses. Rata kiri, return early, no nesting.
let PRODUCTS = [];
let cart = [];
let currentCategory = 'Semua';
let currentPayMethod = 'Tunai';
let currentModal = null;
let KASIR_NAME = '';
let SESSION_TOKEN = localStorage.getItem('pos_session_token') || '';

async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function init() {
  updateClock();
  setInterval(updateClock, 1000);
  
  if (SESSION_TOKEN) {
    google.script.run
      .withSuccessHandler(res => {
        if (res.ok) {
          KASIR_NAME = res.user.nama;
          finishLoginInit();
        } else {
          showLogin();
        }
      })
      .withFailureHandler(() => showLogin())
      .validateSession(SESSION_TOKEN);
  } else {
    showLogin();
  }
}

function showLogin() {
  document.getElementById('login-overlay').style.display = 'flex';
}

function doLogin() {
  const user = document.getElementById('login-user').value;
  const pass = document.getElementById('login-pass').value;
  if (!user || !pass) return;
  
  const btn = document.getElementById('btn-login-submit');
  const err = document.getElementById('login-error-msg');
  btn.disabled = true;
  btn.textContent = 'Verifikasi...';
  err.textContent = '';
  
  sha256(pass).then(hash => {
    google.script.run
      .withSuccessHandler(res => {
        if (res.ok) {
          SESSION_TOKEN = res.token;
          KASIR_NAME = res.user.nama;
          localStorage.setItem('pos_session_token', SESSION_TOKEN);
          finishLoginInit();
        } else {
          btn.disabled = false;
          btn.textContent = 'Login ke POS';
          err.textContent = res.error || 'Login gagal.';
        }
      })
      .withFailureHandler(e => {
        btn.disabled = false;
        btn.textContent = 'Login ke POS';
        err.textContent = 'Error koneksi: ' + e.message;
      })
      .login(user, hash);
  });
}

function finishLoginInit() {
  document.getElementById('login-overlay').style.display = 'none';
  document.getElementById('kasir-name-display').textContent = KASIR_NAME;
  
  google.script.run
    .withSuccessHandler(res => {
      if (!res) return;
      PRODUCTS = res;
      renderCategories();
      renderProducts();
    })
    .withFailureHandler(err => alert("Gagal memuat produk: " + err.message))
    .getProdukList();

  google.script.run
    .withSuccessHandler(res => {
      if (!res) return;
      const sel = document.getElementById('customer-select');
      const defaultOption = `<option value="UMUM" selected>Pelanggan Umum (Walk-in)</option>`;
      sel.innerHTML = defaultOption + res.map(c => `<option value="${c.id}">${c.nama}</option>`).join('');
    })
    .withFailureHandler(err => alert("Gagal memuat customer: " + err.message))
    .getCustomerList();

  renderDashboard();
}

function updateClock() {
  const now = new Date();
  const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
  document.getElementById('clock').textContent =
    `${days[now.getDay()]}, ${now.toLocaleDateString('id-ID',{day:'2-digit',month:'short',year:'numeric'})} · ${now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}`;
}

function switchView(name) {
  if (!name) return;
  
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  
  const targetView = document.getElementById(`view-${name}`);
  if (!targetView) return;
  
  targetView.classList.add('active');
  if (event && event.currentTarget) event.currentTarget.classList.add('active');
  
  const titles = {kasir:'Kasir · Point of Sale',dashboard:'Dashboard',po:'Purchase Order',customers:'Database Customer',laporan:'Laporan Keuangan'};
  document.getElementById('topbar-title').textContent = titles[name] || name;
  document.getElementById('btn-pay-top').style.display = (name === 'kasir') ? '' : 'none';
}

function renderProducts() {
  const grid = document.getElementById('product-grid');
  if (!grid) return;
  
  const q = document.getElementById('search-input')?.value.toLowerCase() || '';
  let filtered = PRODUCTS;
  
  if (currentCategory !== 'Semua') filtered = filtered.filter(p => p.kategori === currentCategory);
  if (q) filtered = filtered.filter(p => p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.brand.toLowerCase().includes(q));
  
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="no-products"><div class="no-products-icon">🔍</div><div>Produk tidak ditemukan / Memuat data...</div></div>';
    return;
  }
  
  grid.innerHTML = filtered.map(p => {
    const isRefill = p.satuan === 'Gram' || p.satuan === 'ml';
    const priceText = isRefill ? `Rp ${rp(p.harga)}/gr` : `Rp ${rp(p.harga)}`;
    return `<div class="product-card ${isRefill ? 'refill' : ''}" onclick="selectProduct('${p.sku}')">
      <div class="product-sku">${p.sku}</div>
      <div class="product-name">${p.nama}</div>
      <div class="product-brand">${p.brand}</div>
      <div class="product-price">${priceText}</div>
      <div class="product-unit">${p.satuan}${isRefill ? ' · timbang' : ''}</div>
    </div>`;
  }).join('');
}

function filterProducts() { renderProducts(); }

function setCategory(cat, el) {
  if (!cat) return;
  currentCategory = cat;
  
  // Update class active jika tombol di-klik langsung
  if (el) {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    el.classList.add('active');
  } else {
    // Update ulang render jika di-set dari luar (safety)
    renderCategories();
  }
  
  renderProducts();
}

function renderCategories() {
  const bar = document.getElementById('filter-bar');
  if (!bar || !PRODUCTS) return;
  
  // Ambil semua kategori unik dari list produk
  const cats = [...new Set(PRODUCTS.map(p => p.kategori).filter(Boolean))].sort();
  
  let html = `<button class="filter-btn ${currentCategory === 'Semua' ? 'active' : ''}" onclick="setCategory('Semua', this)">Semua</button>`;
  
  cats.forEach(c => {
    const isActive = currentCategory === c ? 'active' : '';
    html += `<button class="filter-btn ${isActive}" onclick="setCategory('${c}', this)">${c}</button>`;
  });
  
  bar.innerHTML = html;
}

function selectProduct(sku) {
  if (!sku) return;
  const p = PRODUCTS.find(x => x.sku === sku);
  if (!p) return;
  
  if (p.satuan === 'Gram' || p.satuan === 'ml') return openModal(p);
  
  const existing = cart.find(c => c.sku === sku && c.satuan !== 'Gram');
  if (existing) {
    existing.qty++;
    existing.subtotal = existing.qty * existing.harga;
    return renderCart();
  }
  
  cart.push({ sku: p.sku, nama: p.nama, satuan: p.satuan, qty: 1, harga: p.harga, netto: null, subtotal: p.harga });
  renderCart();
}

function openModal(p) {
  if (!p) return;
  currentModal = p;
  document.getElementById('modal-product-name').textContent = p.nama;
  document.getElementById('modal-product-sku').textContent = `${p.sku} · ${p.satuan}`;
  document.getElementById('modal-tare').value = '';
  document.getElementById('modal-gross').value = '';
  document.getElementById('modal-netto-display').textContent = '0 gr';
  document.getElementById('modal-subtotal').textContent = 'Rp 0';
  document.getElementById('refill-modal').classList.add('show');
  setTimeout(() => document.getElementById('modal-gross').focus(), 100);
}

function closeModal() {
  document.getElementById('refill-modal').classList.remove('show');
  currentModal = null;
}

function calcModal() {
  if (!currentModal) return;
  const tare = parseFloat(document.getElementById('modal-tare').value) || 0;
  const gross = parseFloat(document.getElementById('modal-gross').value) || 0;
  const netto = Math.max(0, gross - tare);
  const subtotal = Math.round(netto * currentModal.harga);
  
  document.getElementById('modal-netto-display').textContent = `${netto.toFixed(1)} gr`;
  document.getElementById('modal-subtotal').textContent = `Rp ${rp(subtotal)}`;
}

function addRefillToCart() {
  if (!currentModal) return;
  
  const tare = parseFloat(document.getElementById('modal-tare').value) || 0;
  const gross = parseFloat(document.getElementById('modal-gross').value) || 0;
  const netto = Math.max(0, gross - tare);
  
  if (netto <= 0) return alert('Masukkan berat gross yang valid!');
  
  cart.push({
    sku: currentModal.sku,
    nama: currentModal.nama,
    satuan: 'Gram',
    qty: netto,
    harga: currentModal.harga,
    netto: netto,
    tare: tare,
    subtotal: Math.round(netto * currentModal.harga)
  });
  
  closeModal();
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-items');
  if (!container) return;
  
  if (!cart || cart.length === 0) {
    container.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><div class="cart-empty-text">Pilih produk untuk mulai</div></div>`;
    return updateSummary();
  }
  
  container.innerHTML = cart.map((item, i) => {
    const detail = item.satuan === 'Gram' 
      ? `${item.netto.toFixed(1)} gr × Rp ${rp(item.harga)}/gr` 
      : `${item.qty} ${item.satuan} × Rp ${rp(item.harga)}`;
      
    return `<div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${item.nama}</div>
        <div class="cart-item-detail">${detail}</div>
      </div>
      <div class="cart-item-subtotal">Rp ${rp(item.subtotal)}</div>
      <button class="cart-item-del" onclick="removeFromCart(${i})">×</button>
    </div>`;
  }).join('');
  
  updateSummary();
}

function removeFromCart(i) {
  if (i === undefined || i < 0 || i >= cart.length) return;
  cart.splice(i, 1); 
  renderCart(); 
}

function clearCart() { 
  cart = []; 
  renderCart(); 
}

function updateSummary() {
  if (!cart) return;
  const subtotal = cart.reduce((s, c) => s + c.subtotal, 0);
  document.getElementById('sum-subtotal').textContent = `Rp ${rp(subtotal)}`;
  document.getElementById('sum-total').textContent = `Rp ${rp(subtotal)}`;
}

function setPayMethod(m, el) {
  if (!m || !el) return;
  currentPayMethod = m;
  document.querySelectorAll('.pay-method').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

function prosesBayar() {
  if (!cart || cart.length === 0) return alert('Keranjang kosong!');
  
  const customer = document.getElementById('customer-select');
  if (!customer || customer.selectedIndex === -1) return alert('Pilih customer!');
  
  const total = cart.reduce((s, c) => s + c.subtotal, 0);
  const custName = customer.options[customer.selectedIndex].text;
  const custId = customer.value;

  const btnBottom = document.getElementById('btn-pay-bottom');
  const btnTop = document.getElementById('btn-pay-top');
  
  btnBottom.disabled = true;
  btnTop.disabled = true;
  btnBottom.textContent = '⏳ Memproses...';
  btnTop.textContent = '⏳ Memproses...';

  for (const item of cart) {
    const p = PRODUCTS.find(x => x.sku === item.sku);
    const itemQty = item.satuan === 'Gram' ? item.netto : item.qty;
    if (p && p.stok < itemQty) {
      const btnBottom = document.getElementById('btn-pay-bottom');
      const btnTop = document.getElementById('btn-pay-top');
      btnBottom.disabled = btnTop.disabled = false;
      btnBottom.textContent = btnTop.textContent = '⚡ BAYAR';
      alert(`Stok tidak mencukupi untuk ${item.nama}!\nTersedia: ${p.stok} ${item.satuan}\nDiminta: ${itemQty} ${item.satuan}`);
      return;
    }
  }

  const payload = {
    token: SESSION_TOKEN,
    customerNama: custName,
    customerId: custId,
    metodeBayar: currentPayMethod,
    total: total,
    kasir: KASIR_NAME,
    items: cart.map(c => ({
      sku: c.sku,
      nama: c.nama,
      satuan: c.satuan,
      qty: c.satuan === 'Gram' ? c.netto : c.qty,
      harga: c.harga,
      subtotal: c.subtotal
    }))
  };

  google.script.run
    .withSuccessHandler(res => {
      btnBottom.disabled = btnTop.disabled = false;
      btnBottom.textContent = btnTop.textContent = '⚡ BAYAR';
      if (!res) return alert('Gagal memproses, response kosong dari server.');
      tampilkanStruk(res.strukNo, res.timestamp, custName, total);
      renderDashboard();
    })
    .withFailureHandler(err => {
      btnBottom.disabled = btnTop.disabled = false;
      btnBottom.textContent = btnTop.textContent = '⚡ BAYAR';
      alert(`Gagal memproses transaksi: ${err.message}`);
    })
    .simpanTransaksiPenjualan(payload);
}

function tampilkanStruk(strukNo, timestamp, custName, total) {
  if (!strukNo || !timestamp) return;
  
  const dateObj = new Date(timestamp);
  document.getElementById('struk-no').textContent = strukNo;
  document.getElementById('struk-date').textContent = dateObj.toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short'});
  
  const struk = document.getElementById('struk-content');
  if (!struk) return;
  
  struk.innerHTML = `
    <div class="struk-header">
      <div class="struk-shop">re-feel</div>
      <div class="struk-tagline">ZERO WASTE REFILL STORE · BALI</div>
      <div class="struk-date">
        ${dateObj.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}<br>
        ${dateObj.toLocaleTimeString('id-ID')} · Kasir: ${KASIR_NAME}
      </div>
    </div>
    <div style="font-size:10px;margin-bottom:8px">
      No: <strong>${strukNo}</strong><br>
      Customer: ${custName}<br>
      Pembayaran: ${currentPayMethod}
    </div>
    <div class="struk-sep"></div>
    ${cart.map(item => {
      const isRefill = item.satuan === 'Gram';
      const detail = isRefill ? `${item.netto.toFixed(1)} gr × Rp ${rp(item.harga)}` : `${item.qty} ${item.satuan} × Rp ${rp(item.harga)}`;
      return `<div class="struk-item-row">
        <span>${item.nama}</span>
        <span>Rp ${rp(item.subtotal)}</span>
      </div>
      <div class="struk-item-detail">${detail}</div>`;
    }).join('')}
    <div class="struk-sep"></div>
    <div class="struk-total-row">
      <span>TOTAL</span>
      <span>Rp ${rp(total)}</span>
    </div>
    <div class="struk-footer">Terima kasih! 🌿<br>Bersama kita jaga bumi.</div>`;

  document.getElementById('struk-modal').classList.add('show');
}

function closeStruk() { document.getElementById('struk-modal').classList.remove('show'); }

function openRiwayat() {
  document.getElementById('riwayat-modal').classList.add('show');
  document.getElementById('riwayat-list').innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px;font-size:12px">Memuat...</div>';

  google.script.run
    .withSuccessHandler(renderRiwayat)
    .withFailureHandler(err => {
      document.getElementById('riwayat-list').innerHTML =
        `<div style="text-align:center;color:var(--red);padding:20px;font-size:12px">Gagal memuat: ${err.message}</div>`;
    })
    .getRiwayatHariIni();
}

function renderRiwayat(list) {
  const container = document.getElementById('riwayat-list');
  const totalEl = document.getElementById('riwayat-total-hari-ini');

  if (!list || list.length === 0) {
    container.innerHTML = '<div style="text-align:center;color:var(--text3);padding:20px;font-size:12px">Belum ada transaksi hari ini.</div>';
    totalEl.textContent = '';
    return;
  }

  const totalHariIni = list.reduce((sum, t) => sum + Number(t.grandTotal || 0), 0);
  totalEl.textContent = `${list.length} transaksi · Rp ${rp(totalHariIni)}`;

  container.innerHTML = list.map(t => {
    const jumlahItem = Array.isArray(t.items) ? t.items.length : 0;
    return `<div class="riwayat-row">
      <div>
        <div class="riwayat-row-id">${t.id}</div>
        <div class="riwayat-row-meta">${t.pelanggan || 'Pelanggan Umum'} · ${jumlahItem} item · ${t.metode || ''}</div>
      </div>
      <div class="riwayat-row-total">Rp ${rp(t.grandTotal)}</div>
    </div>`;
  }).join('');
}

function closeRiwayat() { document.getElementById('riwayat-modal').classList.remove('show'); }

function printStruk() {
  const content = document.getElementById('struk-content');
  if (!content) return;
  const w = window.open('','_blank','width=300,height=500');
  w.document.write(`<html><body>${content.outerHTML}</body></html>`);
  w.document.close();
  w.print();
}

function newTransaction() {
  cart = [];
  renderCart();
  document.getElementById('struk-no').textContent = 'Belum Disimpan';
  document.getElementById('struk-modal').classList.remove('show');
}

function renderDashboard() {
  google.script.run.withSuccessHandler(res => {
    if (!res) return;
    
    document.getElementById('kpi-cash').textContent = `Rp ${rp(res.omzetHariIni)}`;
    document.getElementById('kpi-txn').textContent = res.jumlahTransaksiHariIni;
    document.getElementById('kpi-piutang').textContent = `Rp ${rp(res.totalPiutang)}`;
    document.getElementById('kpi-hutang').textContent = `Rp ${rp(res.totalHutang)}`;
    document.getElementById('kpi-kritis').textContent = `${res.jumlahStokKritis} SKU`;

    const methodBadge = m => `<span class="log-badge ${{ Tunai: 'badge-cash', QRIS: 'badge-qris', Piutang: 'badge-piutang', Transfer: 'badge-transfer' }[m] || 'badge-cash'}">${m}</span>`;
    const container = document.getElementById('sales-log-container');
    
    if (!res.salesLogs || res.salesLogs.length === 0) {
      container.innerHTML = '<div style="color:var(--text3); font-size:12px">Belum ada transaksi hari ini.</div>';
      return;
    }
    
    container.innerHTML = res.salesLogs.map(s => `
      <div class="sales-log-item">
        <div class="log-meta">
          <div class="log-struk">${s.struk} · ${methodBadge(s.method)}</div>
          <div class="log-customer">${s.customer}</div>
          <div class="log-items">${s.items}</div>
        </div>
        <div class="log-amount">Rp ${rp(s.amount)}</div>
      </div>`).join('');
  }).withFailureHandler(err => alert("Gagal memuat dashboard: " + err.message)).getRingkasanDashboard();
}

function rp(n) { return Math.round(n || 0).toLocaleString('id-ID'); }

init();
