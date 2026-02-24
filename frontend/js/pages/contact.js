// ============================================================
// Página: Contacto
// ============================================================
const ContactPage = {
  render() {
    const section  = document.getElementById('tab-contact');
    const settings = App._publicSettings || {};
    const waNum    = (settings.whatsapp_number || '+59170000000').replace(/\D/g, '');
    const address  = settings.business_address || 'Av. Ballivián, entre Heroínas y Jordán, Cochabamba';
    const hours    = settings.business_hours   || 'L-V: 7:00–21:00 | Sáb: 8:00–22:00 | Dom: 9:00–18:00';
    const qrInfo   = settings.qr_info         || 'Tigo Money: 70000000';

    section.innerHTML = `
      <h2 class="section-title">Contáctanos</h2>

      <div class="contact-grid">
        <div class="contact-card">
          <span class="contact-icon">📍</span>
          <h3>Ubicación</h3>
          <p>${escHtml(address)}</p>
          <a class="btn btn-outline btn-sm mt-2"
            href="https://maps.google.com/?q=${encodeURIComponent(address)}"
            target="_blank" rel="noopener">
            Ver en Google Maps
          </a>
        </div>

        <div class="contact-card">
          <span class="contact-icon">🕐</span>
          <h3>Horarios de atención</h3>
          <p style="white-space:pre-line;">${escHtml(hours.replace(/\|/g, '\n'))}</p>
        </div>

        <div class="contact-card">
          <span class="contact-icon">📱</span>
          <h3>WhatsApp</h3>
          <p>Escríbenos para pedidos, consultas o coordinar delivery.</p>
          <a class="btn btn-wa btn-sm mt-2"
            href="https://wa.me/${waNum}?text=${encodeURIComponent('Hola Cafetería Aroma! Me gustaría hacer un pedido.')}"
            target="_blank" rel="noopener">
            Abrir WhatsApp
          </a>
        </div>

        <div class="contact-card">
          <span class="contact-icon">💳</span>
          <h3>Métodos de pago</h3>
          <p style="white-space:pre-line;">${escHtml(qrInfo.replace(/\|/g, '\n'))}</p>
        </div>
      </div>

      <div class="card mt-2" style="text-align:center;">
        <p style="color:var(--text-muted);margin-bottom:1rem;">
          ¿Listo para pedir? Navega por nuestro menú y arma tu pedido online.
        </p>
        <button class="btn btn-primary" onclick="App.showTab('menu')">Ver Menú ☕</button>
      </div>
    `;
  },
};
