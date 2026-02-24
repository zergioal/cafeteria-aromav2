// ============================================================
// App — Router de pestañas + gestión de sesión
// ============================================================
const App = {
  currentUser:    null,
  currentProfile: null,
  _publicSettings: {},

  async init() {
    Cart.init();
    this._setupTabs();

    // Cargar settings públicas (número de WhatsApp, etc.)
    try {
      this._publicSettings = await API.get('/api/settings/public');
    } catch { /* sin bloquear el inicio */ }

    // Escuchar cambios de autenticación
    Auth.onAuthStateChange(async (event, session) => {
      if (session) {
        this.currentUser = session.user;
        await this._loadProfile();
      } else {
        this.currentUser    = null;
        this.currentProfile = null;
      }
      this._updateHeader();
    });

    // Sesión inicial
    const session = await Auth.getSession();
    if (session) {
      this.currentUser = session.user;
      await this._loadProfile();
    }
    this._updateHeader();

    // Tab inicial desde hash o por defecto
    const hash = window.location.hash.replace('#', '');
    this.showTab(hash || 'home');
  },

  async _loadProfile() {
    try {
      const { data, error } = await Auth.getProfile(this.currentUser.id);
      if (!error && data) this.currentProfile = data;
    } catch (err) {
      console.error('[APP] Error cargando perfil:', err.message);
    }
  },

  _updateHeader() {
    const headerUser   = document.getElementById('header-user');
    const loginBtn     = document.getElementById('nav-login-btn');
    const adminBtn     = document.getElementById('nav-admin-btn');
    const cashierBtn   = document.getElementById('nav-cashier-btn');

    if (this.currentUser && this.currentProfile) {
      const role = this.currentProfile.role;
      const name = this.currentProfile.full_name;

      headerUser.innerHTML = `
        <span class="user-chip">👤 ${escHtml(name)}</span>
        <button class="btn-logout" onclick="App.logout()">Salir</button>
      `;
      loginBtn.classList.add('hidden');

      if (role === 'admin') {
        adminBtn.classList.remove('hidden');
        cashierBtn.classList.add('hidden');
      } else if (role === 'cashier') {
        cashierBtn.classList.remove('hidden');
        adminBtn.classList.add('hidden');
      } else {
        adminBtn.classList.add('hidden');
        cashierBtn.classList.add('hidden');
      }
    } else {
      headerUser.innerHTML = '';
      loginBtn.classList.remove('hidden');
      adminBtn.classList.add('hidden');
      cashierBtn.classList.add('hidden');
    }
  },

  async logout() {
    await Auth.signOut();
    Cart.clear();
    this.currentUser    = null;
    this.currentProfile = null;
    this._updateHeader();
    this.showTab('home');
    Toast.show('Sesión cerrada correctamente', 'success');
  },

  _setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => this.showTab(btn.dataset.tab));
    });
  },

  showTab(name) {
    document.querySelectorAll('.tab-content').forEach(s => s.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const section = document.getElementById(`tab-${name}`);
    const btn     = document.querySelector(`.tab-btn[data-tab="${name}"]`);

    if (!section) { this.showTab('home'); return; }

    section.classList.add('active');
    if (btn) btn.classList.add('active');
    window.location.hash = name;

    this._initPage(name);
  },

  _initPage(name) {
    switch (name) {
      case 'home':    HomePage.render();    break;
      case 'menu':    MenuPage.render();    break;
      case 'cart':    CartPage.render();    break;
      case 'login':   LoginPage.render();   break;
      case 'contact': ContactPage.render(); break;
      case 'cashier':
        if (!this.currentProfile || !['cashier', 'admin'].includes(this.currentProfile.role)) {
          Toast.show('Acceso denegado. Inicia sesión como cajero.', 'error');
          this.showTab('login'); return;
        }
        CashierPage.render(); break;
      case 'admin':
        if (!this.currentProfile || this.currentProfile.role !== 'admin') {
          Toast.show('Acceso denegado. Se requiere rol administrador.', 'error');
          this.showTab('login'); return;
        }
        AdminPage.render(); break;
    }
  },

  openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.remove('hidden');
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.getElementById('modal-content').innerHTML = '';
  },

  getWhatsApp() {
    return this._publicSettings.whatsapp_number || '+59170000000';
  },
};

// ── Toast ─────────────────────────────────────────────────────
const Toast = {
  show(message, type = 'info', duration = 3500) {
    const container = document.getElementById('toast-container');
    const toast     = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute('role', 'alert');
    container.appendChild(toast);

    requestAnimationFrame(() => toast.classList.add('show'));
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 350);
    }, duration);
  },
};

// ── Helpers globales ──────────────────────────────────────────
function escHtml(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function fmtCurrency(amount) {
  return `Bs ${parseFloat(amount || 0).toFixed(2)}`;
}

function fmtDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('es-BO', {
    dateStyle: 'short', timeStyle: 'short'
  });
}

function statusBadge(status) {
  const map = {
    pending_payment: ['Pendiente pago',  'badge-pending'],
    paid:            ['Pagado',          'badge-paid'],
    preparing:       ['En preparación',  'badge-preparing'],
    delivering:      ['En delivery',     'badge-delivering'],
    delivered:       ['Entregado',       'badge-delivered'],
    canceled:        ['Cancelado',       'badge-canceled'],
  };
  const [label, cls] = map[status] || [status, 'badge-pending'];
  return `<span class="badge ${cls}">${label}</span>`;
}

function channelBadge(channel) {
  return channel === 'online'
    ? '<span class="badge badge-online">Online</span>'
    : '<span class="badge badge-store">Tienda</span>';
}

// Cierra modal al hacer clic fuera del contenido
document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) App.closeModal();
});

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => App.init());
