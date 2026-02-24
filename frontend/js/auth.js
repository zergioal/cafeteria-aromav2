// ============================================================
// Auth — Supabase cliente con ANON KEY (seguro en frontend)
// ============================================================

// Crear cliente Supabase (solo anon key)
// Nota: se deshabilita el Web Lock para evitar el error
// "Navigator LockManager lock timed out" al abrir varias pestañas.
const _supabase = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: {
    lock: (_name, _acquireTimeout, fn) => fn(),
  },
});

const Auth = {
  supabase: _supabase,

  /** Iniciar sesión con email y contraseña */
  async signIn(email, password) {
    const { data, error } = await _supabase.auth.signInWithPassword({ email, password });
    return { data, error };
  },

  /** Registrar nuevo usuario (cliente por defecto) */
  async signUp(email, password, metadata = {}) {
    const { data, error } = await _supabase.auth.signUp({
      email,
      password,
      options: { data: { role: 'client', ...metadata } },
    });
    return { data, error };
  },

  /** Cerrar sesión */
  async signOut() {
    const { error } = await _supabase.auth.signOut();
    return { error };
  },

  /** Obtener sesión actual */
  async getSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    return session;
  },

  /** Obtener token JWT para enviar al backend */
  async getToken() {
    const session = await this.getSession();
    return session?.access_token || null;
  },

  /** Obtener perfil del usuario desde Supabase directamente */
  async getProfile(userId) {
    const { data, error } = await _supabase
      .from('profiles')
      .select('id, full_name, phone, role, active')
      .eq('id', userId)
      .single();
    return { data, error };
  },

  /** Suscribirse a cambios de sesión */
  onAuthStateChange(callback) {
    return _supabase.auth.onAuthStateChange(callback);
  },
};
