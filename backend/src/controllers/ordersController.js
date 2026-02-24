// ============================================================
// Controller: Órdenes (cliente)
// ============================================================
const { supabaseAdmin } = require('../services/supabase');

/**
 * POST /api/orders
 * Crear una orden online. El total se calcula en el servidor.
 */
const createOrder = async (req, res) => {
  try {
    const {
      items,
      customer_name,
      customer_phone,
      delivery_address,
      notes,
      payment_method,
      proof_url,
    } = req.body;

    // ── Validaciones básicas ─────────────────────────────────
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'El carrito está vacío' });
    }
    if (!customer_name || !customer_name.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }
    if (!customer_phone || !customer_phone.trim()) {
      return res.status(400).json({ error: 'El teléfono es obligatorio' });
    }
    // Validar teléfono: solo dígitos y +, mínimo 7 caracteres
    const phoneClean = customer_phone.trim().replace(/\s/g, '');
    if (!/^[\+\d]{7,15}$/.test(phoneClean)) {
      return res.status(400).json({ error: 'Formato de teléfono inválido' });
    }
    if (!delivery_address || !delivery_address.trim()) {
      return res.status(400).json({ error: 'La dirección de delivery es obligatoria' });
    }

    // ── Verificar productos en la BD (no confiar en el cliente) ─
    const productIds = items.map(i => i.product_id).filter(Boolean);
    if (productIds.length !== items.length) {
      return res.status(400).json({ error: 'ID de producto inválido en el carrito' });
    }

    const { data: products, error: prodError } = await supabaseAdmin
      .from('products')
      .select('id, name, price, cost, active')
      .in('id', productIds);

    if (prodError) throw prodError;

    const productMap = {};
    products.forEach(p => { productMap[p.id] = p; });

    // Validar cada item
    for (const item of items) {
      const product = productMap[item.product_id];
      if (!product) {
        return res.status(400).json({ error: `Producto no encontrado: ${item.product_id}` });
      }
      if (!product.active) {
        return res.status(400).json({ error: `El producto "${product.name}" no está disponible` });
      }
      const qty = parseInt(item.quantity);
      if (!qty || qty < 1) {
        return res.status(400).json({ error: `Cantidad inválida para "${product.name}"` });
      }
    }

    // ── Calcular total en el servidor ────────────────────────
    let total = 0;
    const orderItemsData = items.map(item => {
      const product  = productMap[item.product_id];
      const quantity = parseInt(item.quantity);
      const subtotal = parseFloat(product.price) * quantity;
      total += subtotal;
      return {
        product_id:              item.product_id,
        product_name_snapshot:   product.name,
        unit_price_snapshot:     product.price,
        unit_cost_snapshot:      product.cost,
        quantity,
        subtotal,
      };
    });

    // ── Crear orden ──────────────────────────────────────────
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .insert({
        customer_user_id: req.user.id,
        customer_name:    customer_name.trim(),
        customer_phone:   phoneClean,
        delivery_address: delivery_address.trim(),
        notes:            notes?.trim() || null,
        payment_method:   payment_method === 'cash' ? 'cash' : 'qr',
        channel:          'online',
        status:           'pending_payment',
        total,
        proof_url:        proof_url || null,
        code:             '',  // lo asigna el trigger
      })
      .select()
      .single();

    if (orderError) throw orderError;

    // ── Insertar items ───────────────────────────────────────
    const itemsWithOrder = orderItemsData.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('order_items')
      .insert(itemsWithOrder);

    if (itemsError) {
      // Rollback manual de la orden
      await supabaseAdmin.from('orders').delete().eq('id', order.id);
      throw itemsError;
    }

    console.log(`[ORDER CREATED] ${order.code} | Bs ${total.toFixed(2)} | User: ${req.user.id}`);

    res.status(201).json({ ...order, items: itemsWithOrder });
  } catch (err) {
    console.error('[orders/create]', err.message);
    res.status(500).json({ error: err.message || 'Error al crear el pedido' });
  }
};

/**
 * GET /api/my-orders
 * Devuelve los pedidos del cliente autenticado
 */
const getMyOrders = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select('*, order_items(product_name_snapshot, quantity, unit_price_snapshot, subtotal)')
      .eq('customer_user_id', req.user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[orders/myOrders]', err.message);
    res.status(500).json({ error: 'Error al obtener tus pedidos' });
  }
};

module.exports = { createOrder, getMyOrders };
