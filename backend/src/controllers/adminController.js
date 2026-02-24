// ============================================================
// Controller: Admin
// ============================================================
const { supabaseAdmin } = require('../services/supabase');

// ── Usuarios ─────────────────────────────────────────────────
const listUsers = async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, phone, role, active, created_at')
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[admin/listUsers]', err.message);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

const createUser = async (req, res) => {
  try {
    const { email, password, full_name, phone, role } = req.body;

    if (!email || !email.trim())     return res.status(400).json({ error: 'El email es obligatorio' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' });
    if (!full_name || !full_name.trim()) return res.status(400).json({ error: 'El nombre es obligatorio' });

    const validRoles = ['admin', 'cashier', 'client'];
    const userRole = role || 'cashier';
    if (!validRoles.includes(userRole)) {
      return res.status(400).json({ error: `Rol inválido. Permitidos: ${validRoles.join(', ')}` });
    }

    // Crear en Supabase Auth (ya confirmado)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email:         email.trim(),
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name.trim(), phone: phone?.trim(), role: userRole },
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
      }
      throw authError;
    }

    // Asegurar que el perfil tenga el rol correcto (el trigger puede haber corrido primero)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id:        authData.user.id,
        full_name: full_name.trim(),
        phone:     phone?.trim() || null,
        role:      userRole,
        active:    true,
      }, { onConflict: 'id' })
      .select()
      .single();

    if (profileError) console.error('[profile upsert]', profileError.message);

    console.log(`[USER CREATED] ${email} (${userRole})`);
    res.status(201).json({
      id:        authData.user.id,
      email:     authData.user.email,
      profile:   profile || null,
    });
  } catch (err) {
    console.error('[admin/createUser]', err.message);
    res.status(500).json({ error: err.message || 'Error al crear usuario' });
  }
};

const updateUser = async (req, res) => {
  try {
    const { role, active, full_name, phone } = req.body;
    const updates = {};

    if (role !== undefined) {
      const validRoles = ['admin', 'cashier', 'client'];
      if (!validRoles.includes(role)) return res.status(400).json({ error: 'Rol inválido' });
      updates.role = role;
    }
    if (active    !== undefined) updates.active    = active;
    if (full_name !== undefined) updates.full_name = full_name?.trim();
    if (phone     !== undefined) updates.phone     = phone?.trim() || null;

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[admin/updateUser]', err.message);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};

// ── Dashboard de ventas ───────────────────────────────────────
const getDashboard = async (req, res) => {
  try {
    const { from, to } = req.query;

    // Bolivia es siempre UTC-4 (sin horario de verano)
    // Las fechas del usuario (YYYY-MM-DD) se interpretan como días bolivianos
    // Medianoche Bolivia en UTC = ese día a las T04:00:00Z
    const BOLIVIA_OFFSET_MS = 4 * 60 * 60 * 1000;
    const MS_DAY            = 24 * 60 * 60 * 1000;

    const boliviaToday    = new Date(Date.now() - BOLIVIA_OFFSET_MS).toISOString().split('T')[0];
    const bolivia30DaysAgo = new Date(Date.now() - BOLIVIA_OFFSET_MS - 30 * MS_DAY).toISOString().split('T')[0];

    const fromISO = from
      ? `${from}T04:00:00.000Z`
      : `${bolivia30DaysAgo}T04:00:00.000Z`;

    const toISO = to
      ? new Date(new Date(`${to}T04:00:00.000Z`).getTime() + MS_DAY - 1).toISOString()
      : new Date(new Date(`${boliviaToday}T04:00:00.000Z`).getTime() + MS_DAY - 1).toISOString();

    // Órdenes en el rango (no canceladas)
    const { data: orders, error: ordErr } = await supabaseAdmin
      .from('orders')
      .select('id, total, channel, payment_method, status, created_at')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .neq('status', 'canceled');

    if (ordErr) throw ordErr;

    const orderIds = orders.map(o => o.id);
    let salesByProduct = [];
    let totalCost      = 0;

    if (orderIds.length > 0) {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('product_name_snapshot, quantity, unit_price_snapshot, unit_cost_snapshot, subtotal')
        .in('order_id', orderIds);

      // Costo total
      (items || []).forEach(item => {
        totalCost += parseFloat(item.unit_cost_snapshot || 0) * item.quantity;
      });

      // Ventas por producto
      const productMap = {};
      (items || []).forEach(item => {
        const key = item.product_name_snapshot;
        if (!productMap[key]) productMap[key] = { name: key, quantity: 0, revenue: 0 };
        productMap[key].quantity += item.quantity;
        productMap[key].revenue  += parseFloat(item.subtotal);
      });
      salesByProduct = Object.values(productMap).sort((a, b) => b.revenue - a.revenue);
    }

    // Ventas por día
    const dayMap = {};
    orders.forEach(o => {
      const day = o.created_at.split('T')[0];
      if (!dayMap[day]) dayMap[day] = { date: day, total: 0, count: 0 };
      dayMap[day].total += parseFloat(o.total);
      dayMap[day].count += 1;
    });
    const salesByDay = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));

    const totalSales = orders.reduce((s, o) => s + parseFloat(o.total), 0);

    res.json({
      period: { from: fromISO.split('T')[0], to: toISO.split('T')[0] },
      total_sales:       parseFloat(totalSales.toFixed(2)),
      total_orders:      orders.length,
      estimated_profit:  parseFloat((totalSales - totalCost).toFixed(2)),
      by_channel: {
        online: {
          count: orders.filter(o => o.channel === 'online').length,
          total: parseFloat(orders.filter(o => o.channel === 'online').reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2)),
        },
        store: {
          count: orders.filter(o => o.channel === 'store').length,
          total: parseFloat(orders.filter(o => o.channel === 'store').reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2)),
        },
      },
      by_payment: {
        qr:   parseFloat(orders.filter(o => o.payment_method === 'qr').reduce((s, o)   => s + parseFloat(o.total), 0).toFixed(2)),
        cash: parseFloat(orders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2)),
      },
      sales_by_product: salesByProduct,
      sales_by_day:     salesByDay,
    });
  } catch (err) {
    console.error('[admin/dashboard]', err.message);
    res.status(500).json({ error: 'Error al obtener dashboard' });
  }
};

// ── Settings ──────────────────────────────────────────────────
const getSettings = async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('settings').select('*');
    if (error) throw error;

    const obj = {};
    (data || []).forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) {
    console.error('[admin/getSettings]', err.message);
    res.status(500).json({ error: 'Error al obtener configuración' });
  }
};

const updateSettings = async (req, res) => {
  try {
    const settings = req.body;
    if (typeof settings !== 'object' || Array.isArray(settings)) {
      return res.status(400).json({ error: 'El cuerpo debe ser un objeto key:value' });
    }

    const upserts = Object.entries(settings).map(([key, value]) => ({
      key,
      value: String(value),
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabaseAdmin
      .from('settings')
      .upsert(upserts, { onConflict: 'key' });

    if (error) throw error;
    res.json({ message: 'Configuración guardada correctamente' });
  } catch (err) {
    console.error('[admin/updateSettings]', err.message);
    res.status(500).json({ error: 'Error al guardar configuración' });
  }
};

module.exports = {
  listUsers,
  createUser,
  updateUser,
  getDashboard,
  getSettings,
  updateSettings,
};
