// ============================================================
// Página: Menú / Catálogo de productos
// ============================================================
const MenuPage = {
  _products:   [],
  _categories: [],
  _activeCategory: 'all',
  _searchText: '',

  async render() {
    const section = document.getElementById('tab-menu');
    section.innerHTML = `
      <h2 class="section-title">Nuestro Menú</h2>
      <div class="search-bar">
        <input type="search" id="menu-search" placeholder="Buscar producto..." aria-label="Buscar producto" />
      </div>
      <div class="category-filters" id="category-filters">
        <button class="filter-btn active" data-category="all">Todos</button>
      </div>
      <div id="products-container">
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Cargando menú...</p>
        </div>
      </div>
    `;

    // Cargar datos en paralelo
    try {
      const [products, categories] = await Promise.all([
        API.get('/api/products'),
        API.get('/api/categories'),
      ]);
      this._products   = products   || [];
      this._categories = categories || [];
    } catch (err) {
      document.getElementById('products-container').innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">⚠️</span>
          <p>Error al cargar el menú: ${escHtml(err.message)}</p>
          <button class="btn btn-primary mt-2" onclick="MenuPage.render()">Reintentar</button>
        </div>
      `;
      return;
    }

    this._renderCategories();
    this._renderProducts();
    this._bindEvents();
  },

  _renderCategories() {
    const container = document.getElementById('category-filters');
    container.innerHTML = `<button class="filter-btn active" data-category="all">Todos</button>`;
    this._categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className      = 'filter-btn';
      btn.dataset.category = cat.id;
      btn.textContent    = cat.name;
      container.appendChild(btn);
    });
  },

  _renderProducts() {
    const container = document.getElementById('products-container');

    let filtered = this._products;

    if (this._activeCategory !== 'all') {
      filtered = filtered.filter(p => p.category?.id === this._activeCategory);
    }

    if (this._searchText.trim()) {
      const q = this._searchText.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q)
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">🔍</span>
          <p>No se encontraron productos${this._searchText ? ` para "${escHtml(this._searchText)}"` : ''}.</p>
        </div>
      `;
      return;
    }

    // Guardar mapa de productos por ID para evitar JSON en onclick
    this._productsById = {};
    filtered.forEach(p => { this._productsById[p.id] = p; });

    const emoji = ['☕','🍵','🧃','🍰','🥐','🥤','🍫','🧁'];
    container.innerHTML = `<div class="product-grid">
      ${filtered.map((p, i) => {
        const cartItem = Cart.items.find(ci => ci.product_id === p.id);
        const cartQty  = cartItem ? cartItem.quantity : 0;
        return `
        <div class="product-card" data-id="${escHtml(p.id)}">
          <div class="product-image" aria-hidden="true">
            ${cartQty > 0 ? `<span class="product-qty-badge">${cartQty}</span>` : ''}
            ${p.image_url
              ? `<img src="${escHtml(p.image_url)}" alt="${escHtml(p.name)}" loading="lazy"/>`
              : emoji[i % emoji.length]
            }
          </div>
          <div class="product-body">
            <span class="product-category">${escHtml(p.category?.name || 'Otros')}</span>
            <h3 class="product-name">${escHtml(p.name)}</h3>
            <p class="product-desc">${escHtml(p.description || '')}</p>
            <div class="product-footer">
              <span class="product-price">${fmtCurrency(p.price)}</span>
              <button
                class="btn-add-cart"
                data-pid="${escHtml(p.id)}"
                aria-label="Agregar ${escHtml(p.name)} al carrito"
              >+ Agregar</button>
            </div>
          </div>
        </div>
      `;
      }).join('')}
    </div>`;

    // Añadir padding inferior si hay barra flotante
    container.style.paddingBottom = Cart.getCount() > 0 ? '80px' : '';

    // Barra flotante "Ver carrito" — visible solo en pestaña menú
    const existingCta = document.getElementById('menu-cart-cta');
    if (existingCta) existingCta.remove();

    const cartCount = Cart.getCount();
    if (cartCount > 0) {
      const cta = document.createElement('div');
      cta.id        = 'menu-cart-cta';
      cta.className = 'menu-cart-cta';
      cta.innerHTML = `
        <div class="menu-cart-cta-info">
          <span class="menu-cart-cta-count">🛒 ${cartCount} ${cartCount === 1 ? 'producto' : 'productos'}</span>
          <span class="menu-cart-cta-total">${fmtCurrency(Cart.getTotal())}</span>
        </div>
        <button class="btn btn-success" onclick="App.showTab('cart')" style="white-space:nowrap;font-weight:700;">
          Ver carrito y pagar →
        </button>
      `;
      document.getElementById('tab-menu').appendChild(cta);
    }
  },

  _bindEvents() {
    // Filtros de categoría
    const filtersEl = document.getElementById('category-filters');
    filtersEl.addEventListener('click', e => {
      const btn = e.target.closest('.filter-btn');
      if (!btn) return;
      filtersEl.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      this._activeCategory = btn.dataset.category;
      this._renderProducts();
    });

    // Búsqueda
    const searchEl = document.getElementById('menu-search');
    let debounceTimer;
    searchEl.addEventListener('input', e => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        this._searchText = e.target.value;
        this._renderProducts();
      }, 250);
    });

    // Delegación de eventos para botones "Agregar" (evita JSON en onclick)
    const productsContainer = document.getElementById('products-container');
    productsContainer.addEventListener('click', e => {
      const btn = e.target.closest('.btn-add-cart');
      if (!btn) return;
      const pid = btn.dataset.pid;
      const product = this._productsById?.[pid] || this._products.find(p => p.id === pid);
      if (product) {
        this.addToCart(product);
        this._renderProducts(); // actualiza badges de cantidad
      }
    });
  },

  addToCart(product) {
    if (!App.currentUser) {
      Toast.show('Inicia sesión para agregar productos al carrito', 'warning');
      App.showTab('login');
      return;
    }
    Cart.add(product, 1);
    Toast.show(`"${product.name}" agregado al carrito ☕`, 'success');
  },
};
