// ============================================================
// Middleware de autenticación y autorización por rol
// ============================================================
const { supabaseAdmin } = require('../services/supabase');

/**
 * requireAuth
 * Verifica el JWT enviado en el header Authorization: Bearer <token>
 * Si es válido, adjunta req.user (datos del usuario + perfil con rol)
 */
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' });
    }

    const token = authHeader.slice(7); // quitar "Bearer "

    // Validar el JWT con Supabase
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }

    // Obtener perfil con rol
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, role, active')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Perfil de usuario no encontrado' });
    }

    if (!profile.active) {
      return res.status(403).json({ error: 'Cuenta desactivada. Contacta al administrador.' });
    }

    // Adjuntar user y profile al request
    req.user    = user;
    req.profile = profile;
    next();
  } catch (err) {
    console.error('[AUTH MIDDLEWARE ERROR]', err.message);
    res.status(500).json({ error: 'Error de autenticación' });
  }
};

/**
 * requireRole(...roles)
 * Usado después de requireAuth.
 * Ejemplo: requireRole('admin')  |  requireRole('cashier', 'admin')
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.profile) {
    return res.status(401).json({ error: 'No autenticado' });
  }
  if (!roles.includes(req.profile.role)) {
    return res.status(403).json({
      error: `Acceso denegado. Se requiere rol: ${roles.join(' o ')}`,
    });
  }
  next();
};

module.exports = { requireAuth, requireRole };
