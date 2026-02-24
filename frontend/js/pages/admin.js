// ============================================================
// Página: Panel Admin
// ============================================================
const AdminPage = {
  _activeTab: 'dashboard',

  render() {
    const section = document.getElementById('tab-admin');
    section.innerHTML = `
      <h2 class="section-title">Panel Administrador ⚙️</h2>
      <div class="admin-tabs">
        <button class="admin-tab-btn active" data-at="dashboard" onclick="AdminPage._switchTab('dashboard')">📊 Dashboard</button>
        <button class="admin-tab-btn"        data-at="products"  onclick="AdminPage._switchTab('products')">🛒 Productos</button>
        <button class="admin-tab-btn"        data-at="categories"onclick="AdminPage._switchTab('categories')">🗂 Categorías</button>
        <button class="admin-tab-btn"        data-at="users"     onclick="AdminPage._switchTab('users')">👥 Usuarios</button>
        <button class="admin-tab-btn"        data-at="settings"  onclick="AdminPage._switchTab('settings')">⚙️ Config</button>
      </div>
      <div id="admin-panel"></div>
    `;
    this._switchTab(this._activeTab);
  },

  _switchTab(tab) {
    this._activeTab = tab;
    document.querySelectorAll('.admin-tab-btn').forEach(b => b.classList.toggle('active', b.dataset.at === tab));
    switch (tab) {
      case 'dashboard':  this._renderDashboard();  break;
      case 'products':   this._renderProducts();   break;
      case 'categories': this._renderCategories(); break;
      case 'users':      this._renderUsers();      break;
      case 'settings':   this._renderSettings();   break;
    }
  },

  // ── DASHBOARD ────────────────────────────────────────────────
  async _renderDashboard() {
    const panel = document.getElementById('admin-panel');
    panel.innerHTML = `
      <div class="admin-panel-header">
        <h3 class="card-title" style="margin:0">Ventas</h3>
        <div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap;">
          <label for="dash-from" style="font-size:.82rem;">Desde</label>
          <input type="date" id="dash-from" style="border:1px solid var(--border);border-radius:6px;padding:.3rem .6rem;font-size:.82rem;"/>
          <label for="dash-to" style="font-size:.82rem;">Hasta</label>
          <input type="date" id="dash-to"   style="border:1px solid var(--border);border-radius:6px;padding:.3rem .6rem;font-size:.82rem;"/>
          <button class="btn btn-primary btn-sm" onclick="AdminPage._loadDashboard()">Filtrar</button>
        </div>
      </div>
      <div id="dashboard-content"><div class="loading-state"><div class="loading-spinner"></div><p>Cargando...</p></div></div>
    `;

    // Valores por defecto: últimos 30 días
    const today = new Date();
    const from  = new Date(); from.setDate(today.getDate() - 30);
    document.getElementById('dash-from').value = from.toISOString().split('T')[0];
    document.getElementById('dash-to').value   = today.toISOString().split('T')[0];

    this._loadDashboard();
  },

  async _loadDashboard() {
    const from = document.getElementById('dash-from')?.value;
    const to   = document.getElementById('dash-to')?.value;
    const container = document.getElementById('dashboard-content');
    container.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Cargando datos...</p></div>`;

    try {
      const d = await API.get(`/api/admin/dashboard?from=${from || ''}&to=${to || ''}`);

      container.innerHTML = `
        <div class="dashboard-grid">
          <div class="stat-card">
            <div class="stat-value">${fmtCurrency(d.total_sales)}</div>
            <div class="stat-label">Total Ventas</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${d.total_orders}</div>
            <div class="stat-label">Pedidos/Ventas</div>
          </div>
          <div class="stat-card" style="border-top:3px solid var(--success);">
            <div class="stat-value" style="color:var(--success);">${fmtCurrency(d.estimated_profit)}</div>
            <div class="stat-label">Ganancia estimada</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${fmtCurrency(d.by_channel.online.total)}</div>
            <div class="stat-label">Online (${d.by_channel.online.count})</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${fmtCurrency(d.by_channel.store.total)}</div>
            <div class="stat-label">Tienda (${d.by_channel.store.count})</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${fmtCurrency(d.by_payment.qr)}</div>
            <div class="stat-label">Por QR</div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <!-- Ventas por producto -->
          <div class="card">
            <h4 class="card-title">🏆 Ventas por Producto</h4>
            ${d.sales_by_product.length ? `
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Producto</th><th>Unidades</th><th>Ingresos</th></tr></thead>
                  <tbody>
                    ${d.sales_by_product.slice(0,10).map(p => `
                      <tr>
                        <td>${escHtml(p.name)}</td>
                        <td>${p.quantity}</td>
                        <td>${fmtCurrency(p.revenue)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p style="color:var(--text-muted);">Sin datos</p>'}
          </div>

          <!-- Ventas por día -->
          <div class="card">
            <h4 class="card-title">📅 Ventas por Día</h4>
            ${d.sales_by_day.length ? `
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Fecha</th><th>Pedidos</th><th>Total</th></tr></thead>
                  <tbody>
                    ${d.sales_by_day.slice(-15).map(day => `
                      <tr>
                        <td>${day.date}</td>
                        <td>${day.count}</td>
                        <td>${fmtCurrency(day.total)}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : '<p style="color:var(--text-muted);">Sin datos</p>'}
          </div>
        </div>
      `;
    } catch (err) {
      container.innerHTML = `<div class="alert alert-danger">Error: ${escHtml(err.message)}</div>`;
    }
  },

  // ── PRODUCTOS ────────────────────────────────────────────────
  async _renderProducts() {
    const panel = document.getElementById('admin-panel');
    panel.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;

    try {
      const [products, categories] = await Promise.all([
        API.get('/api/admin/products'),
        API.get('/api/admin/categories'),
      ]);
      this._adminCategories = categories || [];
      this._adminProductsById = {};
      (products || []).forEach(p => { this._adminProductsById[p.id] = p; });

      panel.innerHTML = `
        <div class="admin-panel-header">
          <h3 class="card-title" style="margin:0">Productos (${products.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="AdminPage._openProductForm()">+ Nuevo producto</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>Nombre</th><th>Categoría</th><th>Precio</th><th>Costo</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
              ${products.map(p => `
                <tr>
                  <td><strong>${escHtml(p.name)}</strong><br><small style="color:var(--text-muted);">${escHtml(p.description||'')}</small></td>
                  <td>${escHtml(p.category?.name || '-')}</td>
                  <td>${fmtCurrency(p.price)}</td>
                  <td>${fmtCurrency(p.cost)}</td>
                  <td><span class="badge ${p.active ? 'badge-active' : 'badge-inactive'}">${p.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-sm btn-outline" onclick="AdminPage._editProduct('${escHtml(p.id)}')">Editar</button>
                      <button class="btn btn-sm btn-danger" onclick="AdminPage._deleteProduct('${escHtml(p.id)}','${escHtml(p.name)}')">Eliminar</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      panel.innerHTML = `<div class="alert alert-danger">Error: ${escHtml(err.message)}</div>`;
    }
  },

  _editProduct(id) {
    const product = this._adminProductsById?.[id];
    if (product) this._openProductForm(product);
  },

  _openProductForm(product = null) {
    const cats = this._adminCategories || [];
    const isEdit = !!product;

    App.openModal(`
      <h3 class="modal-title">${isEdit ? 'Editar Producto' : 'Nuevo Producto'}</h3>
      <div id="prod-form-error" class="alert alert-danger" style="display:none;"></div>
      <form id="product-form" novalidate>
        <div class="form-group">
          <label for="pf-name">Nombre <span class="required-mark">*</span></label>
          <input type="text" id="pf-name" value="${escHtml(product?.name||'')}" required maxlength="100"/>
        </div>
        <div class="form-group">
          <label for="pf-desc">Descripción</label>
          <textarea id="pf-desc" maxlength="300">${escHtml(product?.description||'')}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
          <div class="form-group">
            <label for="pf-price">Precio (Bs) <span class="required-mark">*</span></label>
            <input type="number" id="pf-price" step="0.50" min="0" value="${product?.price||''}" required/>
          </div>
          <div class="form-group">
            <label for="pf-cost">Costo (Bs)</label>
            <input type="number" id="pf-cost" step="0.50" min="0" value="${product?.cost||'0'}"/>
          </div>
        </div>
        <div class="form-group">
          <label for="pf-cat">Categoría</label>
          <select id="pf-cat">
            <option value="">-- Sin categoría --</option>
            ${cats.map(c => `<option value="${escHtml(c.id)}" ${product?.category_id===c.id?'selected':''}>${escHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label for="pf-img">URL de imagen (opcional)</label>
          <input type="url" id="pf-img" value="${escHtml(product?.image_url||'')}" placeholder="https://..."/>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="pf-active" ${!product || product.active ? 'checked' : ''}/>
            Producto activo (visible en el menú)
          </label>
        </div>
        <button type="submit" class="btn btn-primary btn-block">
          ${isEdit ? 'Guardar cambios' : 'Crear producto'}
        </button>
      </form>
    `);

    document.getElementById('product-form').addEventListener('submit', async e => {
      e.preventDefault();
      const name  = document.getElementById('pf-name').value.trim();
      const price = parseFloat(document.getElementById('pf-price').value);
      const cost  = parseFloat(document.getElementById('pf-cost').value) || 0;
      const errEl = document.getElementById('prod-form-error');

      if (!name) { errEl.textContent='El nombre es obligatorio.'; errEl.style.display='block'; return; }
      if (isNaN(price)||price<0) { errEl.textContent='El precio debe ser positivo.'; errEl.style.display='block'; return; }

      const body = {
        name,
        description: document.getElementById('pf-desc').value.trim() || null,
        price,
        cost,
        category_id: document.getElementById('pf-cat').value || null,
        image_url:   document.getElementById('pf-img').value.trim() || null,
        active:      document.getElementById('pf-active').checked,
      };

      try {
        if (isEdit) await API.put(`/api/admin/products/${product.id}`, body);
        else        await API.post('/api/admin/products', body);
        App.closeModal();
        Toast.show(`Producto ${isEdit?'actualizado':'creado'} correctamente`, 'success');
        this._renderProducts();
      } catch (err) {
        errEl.textContent = err.message; errEl.style.display = 'block';
      }
    });
  },

  async _deleteProduct(id, name) {
    if (!confirm(`¿Eliminar el producto "${name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await API.del(`/api/admin/products/${id}`);
      Toast.show('Producto eliminado', 'success');
      this._renderProducts();
    } catch (err) {
      Toast.show('Error: ' + err.message, 'error');
    }
  },

  // ── CATEGORÍAS ───────────────────────────────────────────────
  async _renderCategories() {
    const panel = document.getElementById('admin-panel');
    panel.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;

    try {
      const cats = await API.get('/api/admin/categories');
      this._adminCatsById = {};
      (cats || []).forEach(c => { this._adminCatsById[c.id] = c; });

      panel.innerHTML = `
        <div class="admin-panel-header">
          <h3 class="card-title" style="margin:0">Categorías</h3>
          <button class="btn btn-primary btn-sm" onclick="AdminPage._openCatForm()">+ Nueva categoría</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Creada</th><th>Acciones</th></tr></thead>
            <tbody>
              ${cats.map(c => `
                <tr>
                  <td><strong>${escHtml(c.name)}</strong></td>
                  <td>${fmtDate(c.created_at)}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-sm btn-outline" onclick="AdminPage._editCat('${escHtml(c.id)}')">Editar</button>
                      <button class="btn btn-sm btn-danger" onclick="AdminPage._deleteCat('${escHtml(c.id)}','${escHtml(c.name)}')">Eliminar</button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      panel.innerHTML = `<div class="alert alert-danger">Error: ${escHtml(err.message)}</div>`;
    }
  },

  _editCat(id) {
    const cat = this._adminCatsById?.[id];
    if (cat) this._openCatForm(cat);
  },

  _openCatForm(cat = null) {
    App.openModal(`
      <h3 class="modal-title">${cat ? 'Editar Categoría' : 'Nueva Categoría'}</h3>
      <div id="cat-error" class="alert alert-danger" style="display:none;"></div>
      <form id="cat-form" novalidate>
        <div class="form-group">
          <label for="cf-name">Nombre <span class="required-mark">*</span></label>
          <input type="text" id="cf-name" value="${escHtml(cat?.name||'')}" required maxlength="60" autofocus/>
        </div>
        <button type="submit" class="btn btn-primary btn-block">${cat ? 'Guardar' : 'Crear'}</button>
      </form>
    `);

    document.getElementById('cat-form').addEventListener('submit', async e => {
      e.preventDefault();
      const name  = document.getElementById('cf-name').value.trim();
      const errEl = document.getElementById('cat-error');
      if (!name) { errEl.textContent='El nombre es obligatorio.'; errEl.style.display='block'; return; }

      try {
        if (cat) await API.put(`/api/admin/categories/${cat.id}`, { name });
        else     await API.post('/api/admin/categories', { name });
        App.closeModal();
        Toast.show(`Categoría ${cat?'actualizada':'creada'}`, 'success');
        this._renderCategories();
      } catch (err) {
        errEl.textContent = err.message; errEl.style.display='block';
      }
    });
  },

  async _deleteCat(id, name) {
    if (!confirm(`¿Eliminar la categoría "${name}"? Los productos asociados quedarán sin categoría.`)) return;
    try {
      await API.del(`/api/admin/categories/${id}`);
      Toast.show('Categoría eliminada', 'success');
      this._renderCategories();
    } catch (err) {
      Toast.show('Error: ' + err.message, 'error');
    }
  },

  // ── USUARIOS ─────────────────────────────────────────────────
  async _renderUsers() {
    const panel = document.getElementById('admin-panel');
    panel.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;

    try {
      const users = await API.get('/api/admin/users');
      this._adminUsersById = {};
      (users || []).forEach(u => { this._adminUsersById[u.id] = u; });

      panel.innerHTML = `
        <div class="admin-panel-header">
          <h3 class="card-title" style="margin:0">Usuarios (${users.length})</h3>
          <button class="btn btn-primary btn-sm" onclick="AdminPage._openUserForm()">+ Crear cajero/admin</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Rol</th><th>Estado</th><th>Registrado</th><th>Acciones</th></tr></thead>
            <tbody>
              ${users.map(u => `
                <tr>
                  <td><strong>${escHtml(u.full_name)}</strong></td>
                  <td>${escHtml(u.phone || '-')}</td>
                  <td><span class="badge badge-${u.role}">${u.role}</span></td>
                  <td><span class="badge ${u.active ? 'badge-active' : 'badge-inactive'}">${u.active ? 'Activo' : 'Inactivo'}</span></td>
                  <td>${fmtDate(u.created_at)}</td>
                  <td>
                    <div class="table-actions">
                      <button class="btn btn-sm btn-outline" onclick="AdminPage._editUser('${escHtml(u.id)}')">Editar</button>
                      <button class="btn btn-sm ${u.active?'btn-warning':'btn-success'}" onclick="AdminPage._toggleUser('${escHtml(u.id)}',${!u.active})">
                        ${u.active ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } catch (err) {
      panel.innerHTML = `<div class="alert alert-danger">Error: ${escHtml(err.message)}</div>`;
    }
  },

  _openUserForm() {
    App.openModal(`
      <h3 class="modal-title">Crear Cajero / Admin</h3>
      <div id="user-error" class="alert alert-danger" style="display:none;"></div>
      <form id="user-form" novalidate>
        <div class="form-group">
          <label for="uf-name">Nombre completo <span class="required-mark">*</span></label>
          <input type="text" id="uf-name" required maxlength="100"/>
        </div>
        <div class="form-group">
          <label for="uf-phone">Teléfono</label>
          <input type="tel" id="uf-phone" maxlength="15"/>
        </div>
        <div class="form-group">
          <label for="uf-email">Email <span class="required-mark">*</span></label>
          <input type="email" id="uf-email" required/>
        </div>
        <div class="form-group">
          <label for="uf-pass">Contraseña <span class="required-mark">*</span></label>
          <input type="password" id="uf-pass" required minlength="6" placeholder="Mínimo 6 caracteres"/>
        </div>
        <div class="form-group">
          <label for="uf-role">Rol <span class="required-mark">*</span></label>
          <select id="uf-role">
            <option value="cashier">Cajero</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Crear usuario</button>
      </form>
    `);

    document.getElementById('user-form').addEventListener('submit', async e => {
      e.preventDefault();
      const errEl = document.getElementById('user-error');
      try {
        await API.post('/api/admin/users', {
          full_name: document.getElementById('uf-name').value.trim(),
          phone:     document.getElementById('uf-phone').value.trim() || null,
          email:     document.getElementById('uf-email').value.trim(),
          password:  document.getElementById('uf-pass').value,
          role:      document.getElementById('uf-role').value,
        });
        App.closeModal();
        Toast.show('Usuario creado correctamente', 'success');
        this._renderUsers();
      } catch (err) {
        errEl.textContent = err.message; errEl.style.display = 'block';
      }
    });
  },

  _editUser(id) {
    const user = this._adminUsersById?.[id];
    if (user) this._openEditUser(user);
  },

  _openEditUser(user) {
    App.openModal(`
      <h3 class="modal-title">Editar Usuario</h3>
      <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:1rem;">${escHtml(user.full_name)}</p>
      <div id="edit-user-error" class="alert alert-danger" style="display:none;"></div>
      <form id="edit-user-form" novalidate>
        <div class="form-group">
          <label for="eu-name">Nombre</label>
          <input type="text" id="eu-name" value="${escHtml(user.full_name)}" maxlength="100"/>
        </div>
        <div class="form-group">
          <label for="eu-phone">Teléfono</label>
          <input type="tel" id="eu-phone" value="${escHtml(user.phone||'')}" maxlength="15"/>
        </div>
        <div class="form-group">
          <label for="eu-role">Rol</label>
          <select id="eu-role">
            <option value="client"  ${user.role==='client' ?'selected':''}>Cliente</option>
            <option value="cashier" ${user.role==='cashier'?'selected':''}>Cajero</option>
            <option value="admin"   ${user.role==='admin'  ?'selected':''}>Admin</option>
          </select>
        </div>
        <div class="form-group">
          <label>
            <input type="checkbox" id="eu-active" ${user.active?'checked':''}/> Cuenta activa
          </label>
        </div>
        <button type="submit" class="btn btn-primary btn-block">Guardar cambios</button>
      </form>
    `);

    document.getElementById('edit-user-form').addEventListener('submit', async e => {
      e.preventDefault();
      const errEl = document.getElementById('edit-user-error');
      try {
        await API.patch(`/api/admin/users/${user.id}`, {
          full_name: document.getElementById('eu-name').value.trim(),
          phone:     document.getElementById('eu-phone').value.trim() || null,
          role:      document.getElementById('eu-role').value,
          active:    document.getElementById('eu-active').checked,
        });
        App.closeModal();
        Toast.show('Usuario actualizado', 'success');
        this._renderUsers();
      } catch (err) {
        errEl.textContent = err.message; errEl.style.display = 'block';
      }
    });
  },

  async _toggleUser(id, active) {
    try {
      await API.patch(`/api/admin/users/${id}`, { active });
      Toast.show(`Usuario ${active ? 'activado' : 'desactivado'}`, 'success');
      this._renderUsers();
    } catch (err) {
      Toast.show('Error: ' + err.message, 'error');
    }
  },

  // ── SETTINGS ─────────────────────────────────────────────────
  async _renderSettings() {
    const panel = document.getElementById('admin-panel');
    panel.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div></div>`;

    try {
      const s = await API.get('/api/admin/settings');

      panel.innerHTML = `
        <div class="admin-panel-header">
          <h3 class="card-title" style="margin:0">Configuración del Negocio</h3>
        </div>
        <div class="card">
          <div id="settings-error" class="alert alert-danger" style="display:none;"></div>
          <form id="settings-form" novalidate>
            <div class="form-group">
              <label for="s-wa">Número WhatsApp del negocio</label>
              <input type="text" id="s-wa" value="${escHtml(s.whatsapp_number||'')}" placeholder="+59170000000"/>
              <span class="form-hint">Incluir código de país. Ej: +59170000000</span>
            </div>
            <div class="form-group">
              <label for="s-hours">Horarios de atención</label>
              <textarea id="s-hours">${escHtml(s.business_hours||'')}</textarea>
            </div>
            <div class="form-group">
              <label for="s-address">Dirección del local</label>
              <input type="text" id="s-address" value="${escHtml(s.business_address||'')}"/>
            </div>
            <div class="form-group">
              <label for="s-qr-img">Imagen QR de pago (URL pública) 🖼️</label>
              <input type="url" id="s-qr-img" value="${escHtml(s.qr_image_url||'')}"
                placeholder="https://i.imgur.com/tu-qr.png"/>
              <span class="form-hint">
                Sube tu QR a <strong>Imgur</strong> u otro hosting y pega aquí la URL directa de la imagen.
                El cliente la verá al momento de pagar para escanearla.
              </span>
              ${s.qr_image_url ? `<img src="${escHtml(s.qr_image_url)}" alt="QR actual" style="max-width:160px;margin-top:.5rem;border-radius:8px;display:block;border:1px solid var(--border);"/>` : ''}
            </div>
            <div class="form-group">
              <label for="s-qr">Texto informativo de pago QR</label>
              <textarea id="s-qr">${escHtml(s.qr_info||'')}</textarea>
              <span class="form-hint">Texto complementario que aparece junto al QR en el checkout del cliente</span>
            </div>
            <div class="form-group">
              <label for="s-delivery">Nota de delivery</label>
              <input type="text" id="s-delivery" value="${escHtml(s.delivery_note||'')}"/>
            </div>
            <button type="submit" id="settings-save-btn" class="btn btn-success">Guardar configuración</button>
          </form>
        </div>
      `;

      document.getElementById('settings-form').addEventListener('submit', async e => {
        e.preventDefault();
        const errEl = document.getElementById('settings-error');
        const btn   = document.getElementById('settings-save-btn');

        errEl.style.display = 'none';
        btn.disabled    = true;
        btn.textContent = 'Guardando...';

        try {
          await API.put('/api/admin/settings', {
            whatsapp_number:  document.getElementById('s-wa').value.trim(),
            business_hours:   document.getElementById('s-hours').value.trim(),
            business_address: document.getElementById('s-address').value.trim(),
            qr_image_url:     document.getElementById('s-qr-img').value.trim(),
            qr_info:          document.getElementById('s-qr').value.trim(),
            delivery_note:    document.getElementById('s-delivery').value.trim(),
          });
          Toast.show('Configuración guardada ✅', 'success');
        } catch (err) {
          errEl.textContent = err.message;
          errEl.style.display = 'block';
          errEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } finally {
          btn.disabled    = false;
          btn.textContent = 'Guardar configuración';
        }

        // Actualizar settings en memoria (best-effort, sin bloquear UI)
        API.get('/api/settings/public')
          .then(data => { App._publicSettings = data; })
          .catch(() => {});
      });
    } catch (err) {
      panel.innerHTML = `<div class="alert alert-danger">Error: ${escHtml(err.message)}</div>`;
    }
  },
};
