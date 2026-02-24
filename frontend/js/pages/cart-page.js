// ============================================================
// Página: Carrito y Checkout
// ============================================================
const CartPage = {
  _step: 'cart', // 'cart' | 'checkout' | 'success'
  _order: null,
  _proofFile: null,
  _proofObjectURL: null,

  _cleanup() {
    if (this._proofObjectURL) {
      URL.revokeObjectURL(this._proofObjectURL);
      this._proofObjectURL = null;
    }
    this._proofFile = null;
    this._step  = 'cart';
    this._order = null;
  },

  render() {
    this._step = Cart.isEmpty() ? 'cart' : this._step;
    if (this._step === 'success' && !this._order) this._step = 'cart';

    const section = document.getElementById('tab-cart');

    if (Cart.isEmpty() && this._step !== 'success') {
      section.innerHTML = `
        <h2 class="section-title">Tu Carrito</h2>
        <div class="empty-state">
          <span class="empty-icon">🛒</span>
          <p>Tu carrito está vacío.</p>
          <button class="btn btn-primary mt-2" onclick="App.showTab('menu')">Ver Menú</button>
        </div>
      `;
      return;
    }

    if (this._step === 'cart')     this._renderCartView(section);
    if (this._step === 'checkout') this._renderCheckout(section);
    if (this._step === 'success')  this._renderSuccess(section);
  },

  _renderCartView(section) {
    const items    = Cart.items;
    const total    = Cart.getTotal();
    const itemsHtml = items.map(item => `
      <div class="cart-item">
        <div class="cart-item-info">
          <div class="cart-item-name">${escHtml(item.name)}</div>
          <div class="cart-item-price">${fmtCurrency(item.price)} c/u</div>
        </div>
        <div class="cart-item-controls">
          <button class="qty-btn" onclick="CartPage._changeQty('${escHtml(item.product_id)}', ${item.quantity - 1})" aria-label="Disminuir cantidad">−</button>
          <span class="qty-value" aria-live="polite">${item.quantity}</span>
          <button class="qty-btn" onclick="CartPage._changeQty('${escHtml(item.product_id)}', ${item.quantity + 1})" aria-label="Aumentar cantidad">+</button>
        </div>
        <div class="cart-item-subtotal">${fmtCurrency(item.price * item.quantity)}</div>
        <button class="btn-remove-item" onclick="CartPage._removeItem('${escHtml(item.product_id)}')" aria-label="Eliminar ${escHtml(item.name)}">🗑</button>
      </div>
    `).join('');

    section.innerHTML = `
      <h2 class="section-title">Tu Carrito (${Cart.getCount()} items)</h2>
      <div class="cart-layout">
        <div>
          <div class="card">
            ${itemsHtml}
          </div>
          <button class="btn btn-outline btn-sm mt-2" onclick="Cart.clear();CartPage.render();" style="color:var(--danger);border-color:var(--danger);">
            🗑 Vaciar carrito
          </button>
        </div>
        <div class="cart-summary-box">
          <h3 class="card-title">Resumen</h3>
          ${items.map(i => `
            <div class="total-line">
              <span>${escHtml(i.name)} ×${i.quantity}</span>
              <span>${fmtCurrency(i.price * i.quantity)}</span>
            </div>
          `).join('')}
          <div class="total-line total-final">
            <span>Total</span>
            <span>${fmtCurrency(total)}</span>
          </div>
          <button class="btn btn-primary btn-block mt-2" onclick="CartPage._goCheckout()">
            Continuar al pago →
          </button>
          <button class="btn btn-outline btn-block mt-1" onclick="App.showTab('menu')">
            ← Seguir comprando
          </button>
        </div>
      </div>
    `;
  },

  _changeQty(productId, newQty) {
    Cart.updateQuantity(productId, newQty);
    this.render();
  },

  _removeItem(productId) {
    Cart.remove(productId);
    this.render();
  },

  _goCheckout() {
    if (!App.currentUser) {
      Toast.show('Inicia sesión para continuar con el pedido.', 'warning');
      App.showTab('login');
      return;
    }
    this._step = 'checkout';
    this.render();
  },

  _renderCheckout(section) {
    const total      = Cart.getTotal();
    const profile    = App.currentProfile;
    const settings   = App._publicSettings || {};
    const qrImageUrl = settings.qr_image_url || '';
    const qrInfo     = settings.qr_info || '';

    section.innerHTML = `
      <h2 class="section-title">Checkout — Datos y pago</h2>

      <div class="cart-layout">
        <div>
          <div class="card checkout-card">
            <div id="checkout-error" class="alert alert-danger" style="display:none;"></div>

            <form id="checkout-form" novalidate>
              <!-- Datos de entrega -->
              <h4 style="margin-bottom:.75rem;color:var(--primary-dark);">📦 Datos de entrega</h4>
              <div class="form-group">
                <label for="co-name">Nombre completo <span class="required-mark">*</span></label>
                <input type="text" id="co-name" required maxlength="100"
                  value="${escHtml(profile?.full_name || '')}" placeholder="Juan Pérez"/>
              </div>
              <div class="form-group">
                <label for="co-phone">Teléfono <span class="required-mark">*</span></label>
                <div class="phone-input-group">
                  <span class="phone-prefix">+591</span>
                  <input type="tel" id="co-phone" required maxlength="12"
                    value="${escHtml((profile?.phone || '').replace(/^\+591\s?/, ''))}"
                    placeholder="70000000"/>
                </div>
                <span class="form-hint">Número local boliviano, ej: 70000000</span>
              </div>
              <div class="form-group">
                <label for="co-address">Dirección de delivery <span class="required-mark">*</span></label>
                <input type="text" id="co-address" required maxlength="200"
                  placeholder="Calle, número, zona o referencia"/>
              </div>
              <div class="form-group">
                <label for="co-notes">Notas adicionales</label>
                <textarea id="co-notes" placeholder="Ej: sin azúcar, tocar timbre..." maxlength="300"></textarea>
              </div>

              <div class="divider"></div>
              <!-- Pago por QR -->
              <h4 style="margin-bottom:.75rem;color:var(--primary-dark);">📱 Pago por QR</h4>

              ${qrImageUrl ? `
                <div class="qr-image-section">
                  <p style="font-weight:600;margin-bottom:.5rem;font-size:.9rem;">1. Escanea el QR y realiza el pago:</p>
                  <img src="${escHtml(qrImageUrl)}" alt="QR de pago Aroma" class="qr-display-img"/>
                  ${qrInfo ? `<p class="form-hint" style="margin-top:.5rem;">${escHtml(qrInfo)}</p>` : ''}
                </div>
              ` : `
                <div class="qr-info-box">
                  <strong>ℹ️ Instrucciones de pago:</strong><br>
                  ${escHtml(qrInfo || 'Realiza el pago y adjunta el comprobante a continuación.')}
                </div>
              `}

              <!-- Comprobante de pago -->
              <div class="form-group">
                <label>${qrImageUrl ? '2. ' : ''}Adjunta tu comprobante de pago <span class="required-mark">*</span></label>
                <div class="proof-upload-area" id="proof-drop-zone">
                  <div id="proof-preview-wrap">
                    <div class="proof-placeholder">
                      <span style="font-size:2.5rem;">📸</span>
                      <p>Toca para seleccionar la captura de pago</p>
                      <span class="form-hint">Foto o screenshot del comprobante</span>
                    </div>
                  </div>
                  <input type="file" id="co-proof" accept="image/*" style="display:none;"/>
                </div>
              </div>

              <button type="submit" class="btn btn-primary btn-block" id="checkout-btn">
                ✅ Confirmar pedido
              </button>
              <button type="button" class="btn btn-outline btn-block mt-1"
                onclick="CartPage._step='cart';CartPage.render();">
                ← Volver al carrito
              </button>
            </form>
          </div>
        </div>

        <!-- Resumen -->
        <div class="cart-summary-box">
          <h3 class="card-title">Tu pedido</h3>
          ${Cart.items.map(i => `
            <div class="total-line">
              <span>${escHtml(i.name)} ×${i.quantity}</span>
              <span>${fmtCurrency(i.price * i.quantity)}</span>
            </div>
          `).join('')}
          <div class="total-line total-final">
            <span>Total</span>
            <span>${fmtCurrency(total)}</span>
          </div>
          <p style="font-size:.78rem;color:var(--text-muted);margin-top:.5rem;">
            * Costo de delivery a coordinar por WhatsApp
          </p>
        </div>
      </div>
    `;

    // Manejador de upload de comprobante
    const proofZone  = document.getElementById('proof-drop-zone');
    const proofInput = document.getElementById('co-proof');
    proofZone.addEventListener('click', () => proofInput.click());
    proofInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (!file) return;
      this._proofFile = file;
      if (this._proofObjectURL) URL.revokeObjectURL(this._proofObjectURL);
      this._proofObjectURL = URL.createObjectURL(file);
      document.getElementById('proof-preview-wrap').innerHTML = `
        <img src="${this._proofObjectURL}" alt="Comprobante" class="proof-preview-img"/>
        <p style="font-size:.82rem;color:var(--success);margin-top:.5rem;text-align:center;font-weight:600;">
          ✓ Comprobante adjunto
        </p>
      `;
    });

    document.getElementById('checkout-form').addEventListener('submit', e => this._submitOrder(e));
  },

  async _submitOrder(e) {
    e.preventDefault();
    const errorEl = document.getElementById('checkout-error');
    const btn     = document.getElementById('checkout-btn');
    errorEl.style.display = 'none';

    const name      = document.getElementById('co-name').value.trim();
    const phoneRaw  = document.getElementById('co-phone').value.trim().replace(/\s/g, '');
    const phone     = phoneRaw ? '+591' + phoneRaw : '';
    const address   = document.getElementById('co-address').value.trim();
    const notes     = document.getElementById('co-notes').value.trim();

    // Validaciones
    if (!name)          { this._showError('El nombre es obligatorio.'); return; }
    if (!phoneRaw)      { this._showError('El teléfono es obligatorio.'); return; }
    if (!/^\d{7,8}$/.test(phoneRaw)) { this._showError('Ingresa solo los dígitos locales, ej: 70000000'); return; }
    if (!address)       { this._showError('La dirección es obligatoria.'); return; }
    if (!this._proofFile) { this._showError('Adjunta el comprobante de pago antes de confirmar.'); return; }

    btn.disabled    = true;
    btn.textContent = 'Subiendo comprobante...';

    try {
      // 1. Subir comprobante a Supabase Storage (best-effort)
      let proofUrl = null;
      if (this._proofFile) {
        try {
          const ext      = this._proofFile.name.split('.').pop() || 'jpg';
          const filePath = `proofs/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

          const { data: uploadData, error: uploadError } = await Auth.supabase.storage
            .from('order-proofs')
            .upload(filePath, this._proofFile, { contentType: this._proofFile.type, upsert: false });

          if (uploadError) {
            // BucketNotFound u otro error de storage → continuar sin URL
            console.warn('[proof-upload]', uploadError.message);
            Toast.show('⚠️ No se pudo guardar el comprobante en el sistema. Envíalo por WhatsApp.', 'warning');
          } else {
            const { data: urlData } = Auth.supabase.storage
              .from('order-proofs')
              .getPublicUrl(uploadData.path);
            proofUrl = urlData?.publicUrl || null;
          }
        } catch (storageErr) {
          console.warn('[proof-upload]', storageErr.message);
          Toast.show('⚠️ No se pudo guardar el comprobante en el sistema. Envíalo por WhatsApp.', 'warning');
        }
      }

      // 2. Crear pedido con la URL del comprobante
      btn.textContent = 'Confirmando pedido...';
      const orderData = {
        items:            Cart.items.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        customer_name:    name,
        customer_phone:   phone,
        delivery_address: address,
        notes:            notes || null,
        payment_method:   'qr',
        channel:          'online',
        proof_url:        proofUrl,
      };

      const order = await API.post('/api/orders', orderData);
      // Guardar también la URL local para la pantalla de éxito
      if (proofUrl) order._proofUrl = proofUrl;
      this._order = order;
      Cart.clear();
      this._step  = 'success';
      this.render();
    } catch (err) {
      this._showError(err.message || 'Error al crear el pedido. Inténtalo de nuevo.');
      btn.disabled    = false;
      btn.textContent = 'Confirmar pedido';
    }
  },

  _showError(msg) {
    const el = document.getElementById('checkout-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
  },

  _renderSuccess(section) {
    const order    = this._order;
    const waNum    = App.getWhatsApp().replace(/\D/g, '');
    // Preferir URL de Storage (persistente); fallback al blob URL local
    const proofURL = order._proofUrl || this._proofObjectURL;

    const waMsg = encodeURIComponent(
      `Hola Cafetería Aroma! 🎉\n\n` +
      `*Código de pedido:* ${order.code}\n` +
      `*Total:* Bs ${parseFloat(order.total).toFixed(2)}\n` +
      `*Nombre:* ${order.customer_name}\n` +
      `*Dirección:* ${order.delivery_address}\n\n` +
      `Te adjunto el comprobante de pago. Por favor confirma mi pedido. ✅`
    );

    section.innerHTML = `
      <div class="order-success-box">
        <div style="font-size:3rem;margin-bottom:.75rem;">🎉</div>
        <h2 style="color:var(--success);margin-bottom:.5rem;">¡Pedido registrado!</h2>
        <p style="margin-bottom:1rem;color:var(--text-muted);">
          Tu pedido fue recibido. Ahora envía el comprobante de pago por WhatsApp.
        </p>

        <div style="margin-bottom:1.25rem;">
          <p style="font-size:.9rem;color:var(--text-muted);">Código de pedido:</p>
          <div class="order-code">${escHtml(order.code)}</div>
        </div>

        <div class="card" style="text-align:left;margin-bottom:1.25rem;max-width:420px;margin-inline:auto;">
          <div class="total-line"><span>Total:</span><strong>${fmtCurrency(order.total)}</strong></div>
          <div class="total-line"><span>Dirección:</span><span>${escHtml(order.delivery_address || '-')}</span></div>
          <div class="total-line"><span>Estado:</span>${statusBadge(order.status)}</div>
        </div>

        ${proofURL ? `
          <div class="proof-display-section">
            <p style="font-weight:700;margin-bottom:.5rem;">📸 Tu comprobante de pago:</p>
            <img src="${proofURL}" alt="Comprobante de pago" class="proof-display-img"/>
            <p class="form-hint" style="margin-top:.75rem;">
              Al abrir WhatsApp, <strong>adjunta esta imagen</strong> al mensaje
            </p>
          </div>
        ` : ''}

        <div class="alert alert-info" style="max-width:420px;margin-inline:auto;text-align:left;margin-bottom:1.25rem;">
          <strong>Pasos para confirmar tu pedido:</strong><br>
          1. Pulsa el botón de WhatsApp abajo.<br>
          2. En WhatsApp, adjunta la imagen del comprobante.<br>
          3. Envía el mensaje — el cajero verificará el pago. ✅
        </div>

        <a class="btn btn-wa btn-lg" href="https://wa.me/${waNum}?text=${waMsg}" target="_blank" rel="noopener">
          📲 Enviar comprobante por WhatsApp
        </a>

        <div style="margin-top:1.25rem;">
          <button class="btn btn-outline" onclick="CartPage._cleanup();App.showTab('menu');">
            Volver al menú
          </button>
        </div>
      </div>
    `;
  },
};
