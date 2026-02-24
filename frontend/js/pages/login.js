// ============================================================
// Página: Login / Registro
// Sin selector de rol — el rol se lee automáticamente de la BD
// ============================================================
const LoginPage = {
  _mode: 'login', // 'login' | 'register'

  render() {
    if (App.currentUser && App.currentProfile) {
      const role = App.currentProfile.role;
      if (role === 'admin')   { App.showTab('admin');   return; }
      if (role === 'cashier') { App.showTab('cashier'); return; }
      App.showTab('menu'); return;
    }

    this._mode = 'login';
    const section = document.getElementById('tab-login');
    section.innerHTML = `
      <div class="login-container">
        <div class="card">
          <h2 class="section-title" style="border:none;margin-bottom:.25rem;">
            Bienvenido a Aroma ☕
          </h2>
          <p style="color:var(--text-muted);font-size:.875rem;margin-bottom:1.5rem;">
            Ingresa con tu correo y contraseña.
          </p>
          <div id="login-form-area"></div>
        </div>
      </div>
    `;
    this._renderForm();
  },

  _renderForm() {
    const isLogin = this._mode === 'login';
    document.getElementById('login-form-area').innerHTML = `
      <div id="auth-error" class="alert alert-danger" style="display:none;"></div>

      <form id="auth-form" novalidate>
        ${!isLogin ? `
        <div class="form-group">
          <label for="auth-name">Nombre completo <span class="required-mark">*</span></label>
          <input type="text" id="auth-name" required autocomplete="name"
            placeholder="Juan Pérez" maxlength="100"/>
        </div>
        <div class="form-group">
          <label for="auth-phone">Teléfono</label>
          <div class="phone-input-group">
            <span class="phone-prefix">+591</span>
            <input type="tel" id="auth-phone" autocomplete="tel"
              placeholder="70000000" maxlength="8"/>
          </div>
        </div>
        ` : ''}

        <div class="form-group">
          <label for="auth-email">Correo electrónico <span class="required-mark">*</span></label>
          <input type="email" id="auth-email" required autocomplete="email"
            placeholder="correo@ejemplo.com"/>
        </div>

        <div class="form-group">
          <label for="auth-pass">Contraseña <span class="required-mark">*</span></label>
          <input type="password" id="auth-pass" required
            autocomplete="${isLogin ? 'current-password' : 'new-password'}"
            placeholder="${isLogin ? '••••••••' : 'Mínimo 6 caracteres'}"
            minlength="6"/>
        </div>

        <button type="submit" class="btn btn-primary btn-block" id="auth-submit">
          ${isLogin ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      </form>

      <div class="toggle-link">
        ${isLogin
          ? `¿No tienes cuenta? <button onclick="LoginPage._toggleMode()">Regístrate gratis</button>`
          : `¿Ya tienes cuenta? <button onclick="LoginPage._toggleMode()">Inicia sesión</button>`
        }
      </div>
    `;

    document.getElementById('auth-form').addEventListener('submit', e => this._handleSubmit(e));
    setTimeout(() => document.getElementById('auth-email')?.focus(), 50);
  },

  _toggleMode() {
    this._mode = this._mode === 'login' ? 'register' : 'login';
    this._renderForm();
  },

  async _handleSubmit(e) {
    e.preventDefault();
    const email     = document.getElementById('auth-email')?.value?.trim() || '';
    const password  = document.getElementById('auth-pass')?.value || '';
    const submitBtn = document.getElementById('auth-submit');

    this._clearError();

    if (!email)               return this._showError('El correo es obligatorio.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
                              return this._showError('Ingresa un correo válido.');
    if (!password)            return this._showError('La contraseña es obligatoria.');
    if (password.length < 6)  return this._showError('La contraseña debe tener al menos 6 caracteres.');

    submitBtn.disabled    = true;
    submitBtn.textContent = 'Procesando...';

    try {
      if (this._mode === 'login') {
        await this._doLogin(email, password);
      } else {
        await this._doRegister(email, password);
      }
    } catch (err) {
      this._showError(this._friendlyError(err.message));
    } finally {
      if (document.getElementById('auth-submit')) {
        submitBtn.disabled    = false;
        submitBtn.textContent = this._mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta';
      }
    }
  },

  async _doLogin(email, password) {
    const { data, error } = await Auth.signIn(email, password);
    if (error) throw error;

    const { data: profile, error: pErr } = await Auth.getProfile(data.user.id);
    if (pErr || !profile) throw new Error('No se pudo cargar tu perfil. Contacta al administrador.');
    if (!profile.active)  throw new Error('Tu cuenta está desactivada. Contacta al administrador.');

    App.currentUser    = data.user;
    App.currentProfile = profile;
    App._updateHeader();
    Toast.show(`¡Bienvenido, ${profile.full_name}! 👋`, 'success');

    // Redirigir automáticamente según el rol almacenado en BD
    if (profile.role === 'admin')        App.showTab('admin');
    else if (profile.role === 'cashier') App.showTab('cashier');
    else                                 App.showTab('menu');
  },

  async _doRegister(email, password) {
    const fullName  = document.getElementById('auth-name')?.value?.trim();
    const phoneRaw  = document.getElementById('auth-phone')?.value?.trim().replace(/\s/g, '') || '';
    const phone     = phoneRaw ? '+591' + phoneRaw : null;

    if (!fullName) { this._showError('El nombre es obligatorio.'); return; }

    const { data, error } = await Auth.signUp(email, password, {
      full_name: fullName,
      phone:     phone,
      role:      'client',
    });
    if (error) throw error;

    if (data.session) {
      // Supabase sin confirmación de email → sesión inmediata
      App.currentUser = data.user;
      const { data: profile } = await Auth.getProfile(data.user.id);
      App.currentProfile = profile;
      App._updateHeader();
      Toast.show('¡Cuenta creada! Bienvenido a Aroma.', 'success');
      App.showTab('menu');
    } else {
      // Con confirmación de email habilitada
      document.getElementById('login-form-area').innerHTML = `
        <div class="alert alert-success">
          <strong>¡Registro exitoso!</strong><br>
          Revisa tu correo <strong>${escHtml(email)}</strong> y confirma tu cuenta.
          Luego vuelve aquí a iniciar sesión.
        </div>
        <button class="btn btn-primary btn-block mt-2"
          onclick="LoginPage._mode='login';LoginPage._renderForm()">
          Ir a iniciar sesión
        </button>
      `;
    }
  },

  _showError(msg) {
    const el = document.getElementById('auth-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
  },

  _clearError() {
    const el = document.getElementById('auth-error');
    if (el) { el.style.display = 'none'; el.textContent = ''; }
  },

  _friendlyError(msg) {
    if (!msg) return 'Error desconocido.';
    const m = msg.toLowerCase();
    if (m.includes('invalid login credentials') || m.includes('invalid_credentials'))
      return 'Correo o contraseña incorrectos.';
    if (m.includes('already registered') || m.includes('already been registered'))
      return 'Ya existe una cuenta con ese correo. Intenta iniciar sesión.';
    if (m.includes('password should be'))
      return 'La contraseña debe tener al menos 6 caracteres.';
    if (m.includes('email not confirmed'))
      return 'Confirma tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.';
    if (m.includes('signup is disabled'))
      return 'El registro está desactivado. Contacta al administrador.';
    if (m.includes('500') || m.includes('unexpected'))
      return 'Error del servidor. En Supabase → Authentication → Settings, desactiva "Enable email confirmations" para desarrollo local.';
    return msg;
  },
};
