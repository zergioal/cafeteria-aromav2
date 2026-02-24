// ============================================================
// Controller: Cajero
// ============================================================
const { supabaseAdmin } = require('../services/supabase');

// ── Listar órdenes con filtros ────────────────────────────────
const listOrders = async (req, res) => {
  try {
    const { status, channel, limit = '50', offset = '0' } = req.query;

    let query = supabaseAdmin
      .from('orders')
      .select('id, code, customer_name, customer_phone, delivery_address, status, channel, payment_method, total, created_at, order_items(product_name_snapshot, quantity, unit_price_snapshot)')
      .order('created_at', { ascending: false })
      .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

    if (status)  query = query.eq('status', status);
    if (channel) query = query.eq('channel', channel);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[cashier/listOrders]', err.message);
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
};

// ── Detalle de una orden ──────────────────────────────────────
const getOrder = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(*), payments(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Pedido no encontrado' });
    res.json(data);
  } catch (err) {
    console.error('[cashier/getOrder]', err.message);
    res.status(500).json({ error: 'Error al obtener el pedido' });
  }
};

// ── Actualizar estado de la orden ────────────────────────────
const updateOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending_payment', 'paid', 'preparing', 'delivering', 'delivered', 'canceled'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Estado inválido. Valores permitidos: ${validStatuses.join(', ')}` });
    }

    const { data, error } = await supabaseAdmin
      .from('orders')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    console.log(`[STATUS] Orden ${req.params.id} → ${status} por cajero ${req.user.id}`);
    res.json(data);
  } catch (err) {
    console.error('[cashier/updateStatus]', err.message);
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
};

// ── Verificar pago (QR online) ───────────────────────────────
const verifyPayment = async (req, res) => {
  try {
    const { reference_text } = req.body;
    const cashierId = req.user.id;

    // Cambiar estado a 'paid'
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', req.params.id)
      .select()
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: 'Pedido no encontrado' });
    }

    // Registrar el pago (sin imagen de comprobante)
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id:       order.id,
        method:         order.payment_method,
        verified_by:    cashierId,
        verified_at:    new Date().toISOString(),
        reference_text: reference_text?.trim() || null,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('[payments/register error]', paymentError.message);
    }

    console.log(`[PAYMENT VERIFIED] Orden ${order.code} por cajero ${cashierId}`);
    res.json({ order, payment: payment || null });
  } catch (err) {
    console.error('[cashier/verifyPayment]', err.message);
    res.status(500).json({ error: 'Error al verificar el pago' });
  }
};

// ── Registrar venta en tienda física ─────────────────────────
const registerStoreSale = async (req, res) => {
  try {
    const { items, payment_method, customer_name, cash_received, notes } = req.body;

    // Validaciones
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Selecciona al menos un producto' });
    }
    if (!['qr', 'cash'].includes(payment_method)) {
      return res.status(400).json({ error: 'Método de pago inválido (qr o cash)' });
    }

    // Obtener productos de la BD
    const productIds = items.map(i => i.product_id).filter(Boolean);
    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, cost, active')
      .in('id', productIds);

    if (prodError) throw prodError;

    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    // Calcular total
    let total = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product  = productMap[item.product_id];
      if (!product) return res.status(400).json({ error: `Producto no encontrado: ${item.product_id}` });
      const quantity = parseInt(item.quantity);
      if (!quantity || quantity < 1) return res.status(400).json({ error: 'Cantidad inválida' });

      const subtotal = parseFloat(product.price) * quantity;
      total += subtotal;
      orderItemsData.push({
        product_id:            item.product_id,
        product_name_snapshot: product.name,
        unit_price_snapshot:   product.price,
        unit_cost_snapshot:    product.cost,
        quantity,
        subtotal,
      });
    }

    // Validar efectivo
    let change = 0;
    if (payment_method === 'cash') {
      const received = parseFloat(cash_received);
      if (isNaN(received) || received < 0) {
        return res.status(400).json({ error: 'Monto recibido inválido' });
      }
      if (received < total) {
        return res.status(400).json({
          error: `Monto insuficiente. Total: Bs ${total.toFixed(2)}, Recibido: Bs ${received.toFixed(2)}`,
        });
      }
      change = received - total;
    }

    // Crear orden de tienda (directamente como 'delivered')
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_name:  customer_name?.trim() || 'Cliente tienda',
        customer_phone: '',
        channel:        'store',
        payment_method,
        status:         'delivered',
        total,
        notes:          notes?.trim() || null,
        code:           '',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // Insertar items
    const itemsWithOrder = orderItemsData.map(item => ({ ...item, order_id: order.id }));
    await supabaseAdmin.from('order_items').insert(itemsWithOrder);

    // Registrar pago (cajero verifica en el momento)
    await supabaseAdmin.from('payments').insert({
      order_id:    order.id,
      method:      payment_method,
      verified_by: req.user.id,
      verified_at: new Date().toISOString(),
    });

    console.log(`[STORE SALE] ${order.code} | Bs ${total.toFixed(2)} | Cambio: Bs ${change.toFixed(2)}`);

    res.status(201).json({
      order,
      total:         total.toFixed(2),
      change:        change.toFixed(2),
      cash_received: payment_method === 'cash' ? parseFloat(cash_received).toFixed(2) : null,
      items:         itemsWithOrder,
    });
  } catch (err) {
    console.error('[cashier/storeSale]', err.message);
    res.status(500).json({ error: err.message || 'Error al registrar la venta' });
  }
};

// ── Resumen del día ───────────────────────────────────────────
const getTodaySummary = async (req, res) => {
  try {
    // Bolivia es siempre UTC-4 (sin horario de verano)
    // Medianoche Bolivia en UTC = fecha boliviana a las T04:00:00Z
    const BOLIVIA_OFFSET_MS = 4 * 60 * 60 * 1000;
    const MS_DAY            = 24 * 60 * 60 * 1000;

    const boliviaNow = new Date(Date.now() - BOLIVIA_OFFSET_MS);
    const todayStr   = boliviaNow.toISOString().split('T')[0]; // YYYY-MM-DD Bolivia

    const fromISO = `${todayStr}T04:00:00.000Z`;                                         // Medianoche Bolivia
    const toISO   = new Date(new Date(fromISO).getTime() + MS_DAY - 1).toISOString();   // 23:59:59.999 Bolivia

    // Órdenes del día (no canceladas)
    const { data: orders, error: ordErr } = await supabaseAdmin
      .from('orders')
      .select('id, total, channel, payment_method, status')
      .gte('created_at', fromISO)
      .lte('created_at', toISO)
      .neq('status', 'canceled');

    if (ordErr) throw ordErr;

    // Items para top productos
    const orderIds = orders.map(o => o.id);
    let topProducts = [];

    if (orderIds.length > 0) {
      const { data: items } = await supabaseAdmin
        .from('order_items')
        .select('product_name_snapshot, quantity')
        .in('order_id', orderIds);

      const productCount = {};
      (items || []).forEach(item => {
        const key = item.product_name_snapshot;
        productCount[key] = (productCount[key] || 0) + item.quantity;
      });

      topProducts = Object.entries(productCount)
        .map(([name, quantity]) => ({ name, quantity }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 5);
    }

    const totalSales = orders.reduce((sum, o) => sum + parseFloat(o.total), 0);

    res.json({
      date:          todayStr,
      total_sales:   totalSales.toFixed(2),
      order_count:   orders.length,
      pending_count: orders.filter(o => o.status === 'pending_payment').length,
      by_channel: {
        online_count: orders.filter(o => o.channel === 'online').length,
        store_count:  orders.filter(o => o.channel === 'store').length,
        online_total: orders.filter(o => o.channel === 'online').reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2),
        store_total:  orders.filter(o => o.channel === 'store').reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2),
      },
      by_payment: {
        qr_total:   orders.filter(o => o.payment_method === 'qr').reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2),
        cash_total: orders.filter(o => o.payment_method === 'cash').reduce((s, o) => s + parseFloat(o.total), 0).toFixed(2),
      },
      top_products: topProducts,
    });
  } catch (err) {
    console.error('[cashier/summary]', err.message);
    res.status(500).json({ error: 'Error al obtener resumen del día' });
  }
};

module.exports = {
  listOrders,
  getOrder,
  updateOrderStatus,
  verifyPayment,
  registerStoreSale,
  getTodaySummary,
};
