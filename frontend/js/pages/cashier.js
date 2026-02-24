// ============================================================
// Página: Panel Cajero
// ============================================================
const CashierPage = {
  _activeTab: 'orders',
  _products:  [],

  render() {
    const section = document.getElementById('tab-cashier');
    section.innerHTML = `
      <h2 class="section-title">Panel Cajero 💼</h2>

      <div class="cashier-tabs">
        <button class="cashier-tab-btn active" data-ct="orders"  onclick="CashierPage._switchTab('orders')">📋 Pedidos Online</button>
        <button class="cashier-tab-btn"        data-ct="sale"    onclick="CashierPage._switchTab('sale')">🛒 Venta Tienda</button>
        <button class="cashier-tab-btn"        data-ct="summary" onclick="CashierPage._switchTab('summary')">📊 Resumen del Día</button>
      </div>

      <div id="cashier-panel"></div>
    `;
    this._switchTab(this._activeTab);
  },

  _switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('.cashier-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.ct === tab));

    switch (tab) {
      case 'orders':  this._renderOrders();  break;
      case 'sale':    this._renderStoreSale(); break;
      case 'summary': this._renderSummary(); break;
    }
  },

  // ── PEDIDOS ONLINE ──────────────────────────────────────────
  async _renderOrders(statusFilter = '') {
    const panel = document.getElementById('cashier-panel');
    panel.innerHTML = `
      <div class="flex-between mb-2">
        <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <button class="filter-btn ${!statusFilter ? 'active':''}" onclick="CashierPage._renderOrders('')">Todos</button>
          <button class="filter-btn ${statusFilter==='pending_payment'?'active':''}" onclick="CashierPage._renderOrders('pending_payment')">Pendiente pago</button>
          <button class="filter-btn ${statusFilter==='paid'?'active':''}"            onclick="CashierPage._renderOrders('paid')">Pagado</button>
          <button class="filter-btn ${statusFilter==='preparing'?'active':''}"       onclick="CashierPage._renderOrders('preparing')">Preparando</button>
          <button class="filter-btn ${statusFilter==='delivering'?'active':''}"      onclick="CashierPage._renderOrders('delivering')">En delivery</button>
          <button class="filter-btn ${statusFilter==='delivered'?'active':''}"       onclick="CashierPage._renderOrders('delivered')">Entregado</button>
        </div>
        <button class="btn btn-sm btn-outline" onclick="CashierPage._renderOrders('${statusFilter}')">↻ Actualizar</button>
      </div>
      <div id="orders-list"><div class="loading-state"><div class="loading-spinner"></div><p>Cargando pedidos...</p></div></div>
    `;

    try {
      const url    = `/api/cashier/orders?channel=online${statusFilter ? `&status=${statusFilter}` : ''}&limit=60`;
      const orders = await API.get(url);
      this._renderOrdersTable(orders, statusFilter);
    } catch (err) {
      document.getElementById('orders-list').innerHTML = `<div class="alert alert-danger">Error: ${escHtml(err.message)}</div>`;
    }
  },

  _renderOrdersTable(orders, statusFilter) {
    const container = document.getElementById('orders-list');
    if (!orders.length) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">📭</span><p>No hay pedidos${statusFilter ? ' con ese estado' : ''}.</p></div>`;
      return;
    }

    container.innerHTML = `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Código</th>
              <th>Cliente</th>
              <th>Teléfono</th>
              <th>Total</th>
              <th>Estado</th>
              <th>Canal</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => `
              <tr>
                <td><strong>${escHtml(o.code)}</strong></td>
                <td>${escHtml(o.customer_name)}</td>
                <td>${escHtml(o.customer_phone)}</td>
                <td>${fmtCurrency(o.total)}</td>
                <td>${statusBadge(o.status)}</td>
                <td>${channelBadge(o.channel)}</td>
                <td style="white-space:nowrap;">${fmtDate(o.created_at)}</td>
                <td>
                  <div class="table-actions">
                    <button class="btn btn-sm btn-outline" onclick="CashierPage._openOrder('${escHtml(o.id)}')">Ver</button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  },

  async _openOrder(orderId) {
    try {
      const order = await API.get(`/api/cashier/orders/${orderId}`);
      const items = order.order_items || [];
      const waNum = App.getWhatsApp().replace(/\D/g, '');

      const statusOptions = ['pending_payment','paid','preparing','delivering','delivered','canceled'];

      App.openModal(`
        <h3 class="modal-title">Pedido: ${escHtml(order.code)}</h3>

        <div class="card mb-2">
          <div class="total-line"><span>Cliente:</span>   <strong>${escHtml(order.customer_name)}</strong></div>
          <div class="total-line"><span>Teléfono:</span>  <span>${escHtml(order.customer_phone)}</span></div>
          <div class="total-line"><span>Dirección:</span> <span>${escHtml(order.delivery_address || '-')}</span></div>
          <div class="total-line"><span>Notas:</span>     <span>${escHtml(order.notes || '-')}</span></div>
          <div class="total-line"><span>Estado:</span>    ${statusBadge(order.status)}</div>
          <div class="total-line"><span>Pago:</span>      <span>${order.payment_method === 'qr' ? '📱 QR' : '💵 Efectivo'}</span></div>
          <div class="total-line"><span>Fecha:</span>     <span>${fmtDate(order.created_at)}</span></div>
        </div>

        ${order.proof_url ? `
          <div class="proof-display-section">
            <p style="font-weight:700;margin-bottom:.5rem;">📸 Comprobante de pago del cliente:</p>
            <img src="${escHtml(order.proof_url)}" alt="Comprobante" class="proof-display-img"
                 style="cursor:pointer;" onclick="window.open('${escHtml(order.proof_url)}','_blank')"/>
            <p class="form-hint" style="margin-top:.5rem;">Haz clic en la imagen para verla en tamaño completo</p>
          </div>
        ` : `
          <div class="alert alert-warning" style="font-size:.85rem;">
            Sin comprobante adjunto en el sistema. Verificar por WhatsApp.
          </div>
        `}

        <h4 style="margin-bottom:.75rem;">Items del pedido</h4>
        <div class="table-wrap mb-2">
          <table>
            <thead><tr><th>Producto</th><th>Cantidad</th><th>Precio</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${items.map(i => `
                <tr>
                  <td>${escHtml(i.product_name_snapshot)}</td>
                  <td>${i.quantity}</td>
                  <td>${fmtCurrency(i.unit_price_snapshot)}</td>
                  <td>${fmtCurrency(i.subtotal)}</td>
                </tr>
              `).join('')}
              <tr style="font-weight:700;background:var(--surface-2);">
                <td colspan="3">TOTAL</td>
                <td>${fmtCurrency(order.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="form-group">
          <label for="new-status">Cambiar estado</label>
          <select id="new-status">
            ${statusOptions.map(s => `<option value="${s}" ${s === order.status ? 'selected':''}>${s}</option>`).join('')}
          </select>
        </div>

        ${order.status === 'pending_payment' ? `
          <div class="form-group">
            <label for="ref-text">Referencia de pago (opcional)</label>
            <input type="text" id="ref-text" placeholder="Número de transacción o nota"/>
          </div>
          <button class="btn btn-success btn-block mb-1" onclick="CashierPage._verifyPayment('${escHtml(order.id)}')">
            ✅ Verificar pago y aprobar
          </button>
        ` : ''}

        <div style="display:flex;gap:.5rem;flex-wrap:wrap;">
          <button class="btn btn-primary" onclick="CashierPage._updateStatus('${escHtml(order.id)}')">Actualizar estado</button>
          <a class="btn btn-wa" href="https://wa.me/${waNum}?text=${encodeURIComponent(`Hola ${order.customer_name}, tu pedido Aroma *${order.code}* está siendo procesado.`)}" target="_blank" rel="noopener">📲 WhatsApp cliente</a>
        </div>
      `);
    } catch (err) {
      Toast.show('Error al cargar el pedido: ' + err.message, 'error');
    }
  },

  async _verifyPayment(orderId) {
    const refText = document.getElementById('ref-text')?.value?.trim();
    try {
      await API.post(`/api/cashier/orders/${orderId}/verify-payment`, { reference_text: refText });
      App.closeModal();
      Toast.show('Pago verificado. Pedido aprobado ✅', 'success');
      this._renderOrders('pending_payment');
    } catch (err) {
      Toast.show('Error: ' + err.message, 'error');
    }
  },

  async _updateStatus(orderId) {
    const status = document.getElementById('new-status')?.value;
    if (!status) return;
    try {
      await API.patch(`/api/cashier/orders/${orderId}/status`, { status });
      App.closeModal();
      Toast.show('Estado actualizado correctamente', 'success');
      this._renderOrders(this._activeTab === 'orders' ? '' : '');
    } catch (err) {
      Toast.show('Error: ' + err.message, 'error');
    }
  },

  // ── VENTA EN TIENDA ─────────────────────────────────────────
  async _renderStoreSale() {
    const panel = document.getElementById('cashier-panel');
    panel.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Cargando productos...</p></div>`;

    try {
      const [products, categories] = await Promise.all([
        API.get('/api/products'),
        API.get('/api/categories'),
      ]);
      this._products = products || [];
      this._storeCategories = categories || [];
    } catch (err) {
      panel.innerHTML = `<div class="alert alert-danger">Error: ${escHtml(err.message)}</div>`;
      return;
    }

    this._storeSaleItems = [];
    this._renderStoreSaleForm(panel);
  },

  _renderStoreSaleForm(panel) {
    const cats = [{ id: 'all', name: 'Todos' }, ...(this._storeCategories || [])];

    panel.innerHTML = `
      <h3 class="card-title">Registrar Venta en Tienda</h3>
      <div style="display:grid;grid-template-columns:1fr 300px;gap:1.5rem;">
        <!-- Productos -->
        <div>
          <div class="category-filters mb-1">
            ${cats.map(c => `<button class="filter-btn ${c.id==='all'?'active':''}" data-sc="${escHtml(c.id)}" onclick="CashierPage._filterStoreProducts('${escHtml(c.id)}')">${escHtml(c.name)}</button>`).join('')}
          </div>
          <div class="search-bar mb-1">
            <input type="search" id="store-search" placeholder="Buscar producto..." oninput="CashierPage._filterStoreProducts()"/>
          </div>
          <div id="store-products" class="product-grid" style="max-height:450px;overflow-y:auto;padding-right:.25rem;"></div>
        </div>

        <!-- Carrito de tienda -->
        <div>
          <div class="card" style="position:sticky;top:calc(var(--header-h) + 1rem);">
            <h4 class="card-title">Venta actual</h4>
            <div id="store-cart-items" style="min-height:80px;"></div>
            <div class="divider"></div>
            <div class="total-line total-final" id="store-total">
              <span>Total</span><span>Bs 0.00</span>
            </div>

            <div class="form-group mt-1">
              <label for="s-customer">Nombre cliente (opcional)</label>
              <input type="text" id="s-customer" placeholder="Cliente tienda" maxlength="100"/>
            </div>
            <div class="form-group">
              <label for="s-payment">Método de pago <span class="required-mark">*</span></label>
              <select id="s-payment" onchange="CashierPage._toggleCashField()">
                <option value="cash">💵 Efectivo</option>
                <option value="qr">📱 QR / Tigo Money</option>
              </select>
            </div>
            <div class="form-group" id="cash-field">
              <label for="s-cash">Efectivo recibido (Bs) <span class="required-mark">*</span></label>
              <input type="number" id="s-cash" min="0" step="0.50" placeholder="0.00" oninput="CashierPage._calcChange()"/>
              <div class="form-hint" id="change-info"></div>
            </div>
            <div class="form-group">
              <label for="s-notes">Notas</label>
              <input type="text" id="s-notes" placeholder="Nota interna..." maxlength="200"/>
            </div>
            <button class="btn btn-success btn-block" id="store-submit-btn" onclick="CashierPage._submitStoreSale()" disabled>
              Registrar venta
            </button>
          </div>
        </div>
      </div>
    `;

    this._storeFilter   = 'all';
    this._storeSaleItems = [];
    this._renderStoreProducts();
    this._renderStoreCart();

    // Delegación de eventos para seleccionar productos (el contenedor es estable)
    document.getElementById('store-products').addEventListener('click', e => {
      const card = e.target.closest('[data-spid]');
      if (!card) return;
      const product = this._productsById?.[card.dataset.spid];
      if (product) this._addStoreItem(product);
    });
  },

  _filterStoreProducts(catId) {
    if (catId !== undefined) {
      this._storeFilter = catId;
      document.querySelectorAll('[data-sc]').forEach(b => b.classList.toggle('active', b.dataset.sc === catId));
    }
    this._renderStoreProducts();
  },

  _renderStoreProducts() {
    const container = document.getElementById('store-products');
    const search    = document.getElementById('store-search')?.value?.toLowerCase() || '';
    let prods = this._products;

    if (this._storeFilter && this._storeFilter !== 'all') {
      prods = prods.filter(p => p.category?.id === this._storeFilter);
    }
    if (search) {
      prods = prods.filter(p => p.name.toLowerCase().includes(search));
    }

    if (!prods.length) {
      container.innerHTML = `<div class="empty-state"><span class="empty-icon">🔍</span><p>Sin productos</p></div>`;
      return;
    }

    // Actualizar mapa de todos los productos (no solo los filtrados)
    this._productsById = {};
    this._products.forEach(p => { this._productsById[p.id] = p; });

    container.innerHTML = prods.map(p => `
      <div class="product-card" style="cursor:pointer;" data-spid="${escHtml(p.id)}">
        <div class="product-image" style="height:80px;font-size:2rem;">☕</div>
        <div class="product-body" style="padding:.6rem;">
          <div class="product-name" style="font-size:.85rem;">${escHtml(p.name)}</div>
          <div class="product-price">${fmtCurrency(p.price)}</div>
        </div>
      </div>
    `).join('');
  },

  _addStoreItem(product) {
    const existing = this._storeSaleItems.find(i => i.product_id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      this._storeSaleItems.push({ product_id: product.id, name: product.name, price: product.price, quantity: 1 });
    }
    this._renderStoreCart();
  },

  _renderStoreCart() {
    const container = document.getElementById('store-cart-items');
    const totalEl   = document.getElementById('store-total');
    const submitBtn = document.getElementById('store-submit-btn');

    if (!this._storeSaleItems.length) {
      container.innerHTML = `<p style="color:var(--text-muted);font-size:.85rem;text-align:center;">Selecciona productos del catálogo</p>`;
      if (totalEl) totalEl.innerHTML = `<span>Total</span><span>Bs 0.00</span>`;
      if (submitBtn) submitBtn.disabled = true;
      return;
    }

    const total = this._storeSaleItems.reduce((s, i) => s + i.price * i.quantity, 0);

    container.innerHTML = this._storeSaleItems.map((item, idx) => `
      <div class="cart-item" style="padding:.4rem 0;">
        <div class="cart-item-info" style="flex:1;">
          <div class="cart-item-name" style="font-size:.82rem;">${escHtml(item.name)}</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="CashierPage._changeStoreQty(${idx}, ${item.quantity - 1})">−</button>
          <span class="qty-value">${item.quantity}</span>
          <button class="qty-btn" onclick="CashierPage._changeStoreQty(${idx}, ${item.quantity + 1})">+</button>
        </div>
        <span class="cart-item-subtotal" style="font-size:.82rem;">${fmtCurrency(item.price * item.quantity)}</span>
      </div>
    `).join('');

    if (totalEl)   totalEl.innerHTML   = `<span>Total</span><strong>${fmtCurrency(total)}</strong>`;
    if (submitBtn) submitBtn.disabled  = false;

    this._calcChange();
  },

  _changeStoreQty(idx, qty) {
    if (qty <= 0) { this._storeSaleItems.splice(idx, 1); }
    else          { this._storeSaleItems[idx].quantity = qty; }
    this._renderStoreCart();
  },

  _toggleCashField() {
    const method   = document.getElementById('s-payment')?.value;
    const cashField = document.getElementById('cash-field');
    if (cashField) cashField.style.display = method === 'cash' ? 'block' : 'none';
    this._calcChange();
  },

  _calcChange() {
    const total    = this._storeSaleItems.reduce((s, i) => s + i.price * i.quantity, 0);
    const cashEl   = document.getElementById('s-cash');
    const infoEl   = document.getElementById('change-info');
    const method   = document.getElementById('s-payment')?.value;

    if (!infoEl || method !== 'cash') return;
    const received = parseFloat(cashEl?.value || 0);
    if (received >= total && total > 0) {
      infoEl.innerHTML = `<span style="color:var(--success);font-weight:700;">Cambio: ${fmtCurrency(received - total)}</span>`;
    } else if (received > 0 && received < total) {
      infoEl.innerHTML = `<span style="color:var(--danger);">Falta: ${fmtCurrency(total - received)}</span>`;
    } else {
      infoEl.textContent = '';
    }
  },

  async _submitStoreSale() {
    const method   = document.getElementById('s-payment')?.value;
    const customer = document.getElementById('s-customer')?.value?.trim();
    const notes    = document.getElementById('s-notes')?.value?.trim();
    const total    = this._storeSaleItems.reduce((s, i) => s + i.price * i.quantity, 0);

    if (!this._storeSaleItems.length) { Toast.show('Agrega al menos un producto', 'warning'); return; }

    let cashReceived = null;
    if (method === 'cash') {
      cashReceived = parseFloat(document.getElementById('s-cash')?.value || 0);
      if (!cashReceived || cashReceived < 0) { Toast.show('Ingresa el monto recibido', 'warning'); return; }
      if (cashReceived < total) { Toast.show(`Monto insuficiente. Total: ${fmtCurrency(total)}`, 'warning'); return; }
    }

    const btn = document.getElementById('store-submit-btn');
    btn.disabled = true; btn.textContent = 'Registrando...';

    try {
      const result = await API.post('/api/cashier/store-sale', {
        items:          this._storeSaleItems.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        payment_method: method,
        customer_name:  customer || 'Cliente tienda',
        cash_received:  cashReceived,
        notes,
      });

      const changeMsg = method === 'cash' ? ` | Cambio: Bs ${result.change}` : '';
      Toast.show(`✅ Venta registrada: ${result.order.code} | Total: Bs ${result.total}${changeMsg}`, 'success', 5000);
      this._storeSaleItems = [];
      this._renderStoreCart();

      // Mostrar resumen rápido
      App.openModal(`
        <h3 class="modal-title" style="color:var(--success);">✅ Venta registrada</h3>
        <div class="card mb-2">
          <div class="total-line"><span>Código:</span><strong>${escHtml(result.order.code)}</strong></div>
          <div class="total-line"><span>Total:</span><strong>${fmtCurrency(result.total)}</strong></div>
          ${method === 'cash' ? `
            <div class="total-line"><span>Recibido:</span><span>${fmtCurrency(cashReceived)}</span></div>
            <div class="total-line"><span>Cambio:</span><strong style="color:var(--success);">${fmtCurrency(result.change)}</strong></div>
          ` : ''}
          <div class="total-line"><span>Pago:</span><span>${method === 'cash' ? '💵 Efectivo' : '📱 QR'}</span></div>
        </div>
        <button class="btn btn-primary btn-block" onclick="App.closeModal()">Nueva venta</button>
      `);
    } catch (err) {
      Toast.show('Error: ' + err.message, 'error');
      btn.disabled = false; btn.textContent = 'Registrar venta';
    }
  },

  // ── RESUMEN DEL DÍA ─────────────────────────────────────────
  async _renderSummary() {
    const panel = document.getElementById('cashier-panel');
    panel.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Cargando resumen...</p></div>`;

    try {
      const s = await API.get('/api/cashier/summary/today');

      panel.innerHTML = `
        <h3 class="card-title">Resumen del día — ${s.date}</h3>

        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-value">${fmtCurrency(s.total_sales)}</div>
            <div class="summary-label">Total vendido</div>
          </div>
          <div class="summary-card">
            <div class="summary-value">${s.order_count}</div>
            <div class="summary-label">Pedidos/Ventas</div>
          </div>
          <div class="summary-card">
            <div class="summary-value" style="color:var(--warning);">${s.pending_count}</div>
            <div class="summary-label">Pendientes pago</div>
          </div>
          <div class="summary-card">
            <div class="summary-value" style="color:var(--info);">${s.by_channel.online_count}</div>
            <div class="summary-label">Online</div>
          </div>
          <div class="summary-card">
            <div class="summary-value" style="color:var(--success);">${s.by_channel.store_count}</div>
            <div class="summary-label">Tienda física</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.5rem;">
          <div class="card">
            <h4 class="card-title">Por Canal</h4>
            <div class="total-line"><span>🌐 Online</span><strong>${fmtCurrency(s.by_channel.online_total)}</strong></div>
            <div class="total-line"><span>🏪 Tienda</span><strong>${fmtCurrency(s.by_channel.store_total)}</strong></div>
          </div>
          <div class="card">
            <h4 class="card-title">Por Método de Pago</h4>
            <div class="total-line"><span>📱 QR</span>      <strong>${fmtCurrency(s.by_payment.qr_total)}</strong></div>
            <div class="total-line"><span>💵 Efectivo</span><strong>${fmtCurrency(s.by_payment.cash_total)}</strong></div>
          </div>
        </div>

        <div class="card">
          <h4 class="card-title">🏆 Top Productos del Día</h4>
          ${s.top_products.length ? `
            <div class="table-wrap">
              <table>
                <thead><tr><th>#</th><th>Producto</th><th>Unidades vendidas</th></tr></thead>
                <tbody>
                  ${s.top_products.map((p, i) => `
                    <tr>
                      <td>${i + 1}</td>
                      <td>${escHtml(p.name)}</td>
                      <td><strong>${p.quantity}</strong></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          ` : '<p style="color:var(--text-muted);">Sin ventas aún hoy.</p>'}
        </div>

        <button class="btn btn-outline mt-2" onclick="CashierPage._renderSummary()">↻ Actualizar</button>
      `;
    } catch (err) {
      panel.innerHTML = `<div class="alert alert-danger">Error: ${escHtml(err.message)}</div>`;
    }
  },
};
