// ============================================================
// Cart — Carrito de compras en localStorage
// ============================================================
const Cart = {
  _KEY: 'aroma_cart',
  items: [],

  init() {
    try {
      const saved = localStorage.getItem(this._KEY);
      this.items = saved ? JSON.parse(saved) : [];
    } catch {
      this.items = [];
    }
    this.updateBadge();
  },

  _save() {
    localStorage.setItem(this._KEY, JSON.stringify(this.items));
    this.updateBadge();
  },

  add(product, quantity = 1) {
    const qty = parseInt(quantity);
    if (!qty || qty < 1) return;

    const existing = this.items.find(i => i.product_id === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      this.items.push({
        product_id: product.id,
        name:       product.name,
        price:      parseFloat(product.price),
        quantity:   qty,
      });
    }
    this._save();
  },

  remove(productId) {
    this.items = this.items.filter(i => i.product_id !== productId);
    this._save();
  },

  updateQuantity(productId, quantity) {
    const qty = parseInt(quantity);
    if (qty <= 0) {
      this.remove(productId);
      return;
    }
    const item = this.items.find(i => i.product_id === productId);
    if (item) {
      item.quantity = qty;
      this._save();
    }
  },

  clear() {
    this.items = [];
    this._save();
  },

  getTotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },

  getCount() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  },

  isEmpty() {
    return this.items.length === 0;
  },

  updateBadge() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const count = this.getCount();
    badge.textContent = count;
    badge.style.display = count > 0 ? 'inline-flex' : 'none';
  },
};
