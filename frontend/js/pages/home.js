// ============================================================
// Página: Inicio (landing)
// ============================================================
const HomePage = {
  render() {
    const section = document.getElementById('tab-home');
    section.innerHTML = `
      <!-- Hero -->
      <div class="hero">
        <div class="hero-content">
          <h1 class="hero-title">Cafetería Aroma</h1>
          <p class="hero-subtitle">
            El mejor café artesanal de Cochabamba.<br>
            Delivery express al centro de la ciudad.
          </p>
          <div class="hero-actions">
            <button class="btn btn-secondary btn-lg" onclick="App.showTab('menu')">
              Ver Menú
            </button>
            <button class="btn btn-outline btn-lg" style="border-color:#fff;color:#fff;" onclick="App.showTab('contact')">
              Contacto
            </button>
          </div>
        </div>
        <div class="hero-emoji" aria-hidden="true">☕</div>
      </div>

      <!-- Promociones -->
      <h2 class="section-title">Promociones del día</h2>
      <div class="promo-grid">
        <div class="promo-card">
          <div class="promo-icon">🌅</div>
          <h3>Desayuno Completo</h3>
          <p>Café o té + tostadas + mermelada + fruta fresca</p>
          <span class="promo-price">Bs 45</span>
        </div>
        <div class="promo-card">
          <div class="promo-icon">☕</div>
          <h3>2×1 Café</h3>
          <p>Todos los martes de 14:00 a 17:00 hrs</p>
          <span class="promo-badge">Oferta del día</span>
        </div>
        <div class="promo-card">
          <div class="promo-icon">🚚</div>
          <h3>Delivery Gratis</h3>
          <p>En pedidos mayores a Bs 100 (zona centro)</p>
          <span class="promo-badge promo-badge-green">Pedidos online</span>
        </div>
      </div>

      <!-- Características -->
      <div class="features-section">
        <div class="feature">
          <span class="feature-icon">🕐</span>
          <h4>Horarios</h4>
          <p>L-V: 7:00–21:00<br>Sáb: 8:00–22:00<br>Dom: 9:00–18:00</p>
        </div>
        <div class="feature">
          <span class="feature-icon">📍</span>
          <h4>Ubicación</h4>
          <p>Av. Ballivián, entre Heroínas y Jordán<br>Cochabamba, Bolivia</p>
        </div>
        <div class="feature">
          <span class="feature-icon">🚚</span>
          <h4>Delivery</h4>
          <p>Pide online y recibe en tu domicilio dentro del centro</p>
        </div>
        <div class="feature">
          <span class="feature-icon">📱</span>
          <h4>Pago fácil</h4>
          <p>QR Tigo Money / BNB o efectivo en tienda</p>
        </div>
      </div>

      <!-- CTA login -->
      <div class="card text-center mt-2">
        <p style="margin-bottom:1rem;color:var(--text-muted);">
          ¿Quieres hacer un pedido a domicilio? Crea tu cuenta gratis.
        </p>
        <button class="btn btn-primary" onclick="App.showTab('login')">
          Crear cuenta / Iniciar sesión
        </button>
      </div>
    `;
  },
};
