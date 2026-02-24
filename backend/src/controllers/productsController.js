// ============================================================
// Controller: Productos
// ============================================================
const { supabaseAdmin } = require('../services/supabase');

// ── PÚBLICO: solo productos activos ─────────────────────────
const listProducts = async (req, res) => {
  try {
    const { category } = req.query;

    let query = supabaseAdmin
      .from('products')
      .select('id, name, description, price, active, image_url, category:categories(id, name)')
      .eq('active', true)
      .order('name');

    if (category) query = query.eq('category_id', category);

    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[products/list]', err.message);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

const getProduct = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, category:categories(id, name)')
      .eq('id', req.params.id)
      .eq('active', true)
      .single();

    if (error || !data) return res.status(404).json({ error: 'Producto no encontrado' });
    res.json(data);
  } catch (err) {
    console.error('[products/get]', err.message);
    res.status(500).json({ error: 'Error al obtener el producto' });
  }
};

// ── ADMIN: todos los productos (activos e inactivos) ─────────
const listAllProducts = async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*, category:categories(id, name)')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[products/listAll]', err.message);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, cost, category_id, active, image_url } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'El nombre del producto es obligatorio' });
    }
    if (price === undefined || price === null || isNaN(Number(price))) {
      return res.status(400).json({ error: 'El precio es obligatorio y debe ser un número' });
    }
    if (Number(price) < 0) {
      return res.status(400).json({ error: 'El precio no puede ser negativo' });
    }
    if (cost !== undefined && Number(cost) < 0) {
      return res.status(400).json({ error: 'El costo no puede ser negativo' });
    }

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert({
        name:        name.trim(),
        description: description?.trim() || null,
        price:       Number(price),
        cost:        Number(cost || 0),
        category_id: category_id || null,
        active:      active !== false,
        image_url:   image_url?.trim() || null,
      })
      .select('*, category:categories(id, name)')
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[products/create]', err.message);
    res.status(500).json({ error: err.message || 'Error al crear producto' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { name, description, price, cost, category_id, active, image_url } = req.body;
    const updates = {};

    if (name !== undefined) {
      if (!name.trim()) return res.status(400).json({ error: 'El nombre no puede estar vacío' });
      updates.name = name.trim();
    }
    if (description !== undefined) updates.description = description?.trim() || null;
    if (price !== undefined) {
      if (Number(price) < 0) return res.status(400).json({ error: 'El precio no puede ser negativo' });
      updates.price = Number(price);
    }
    if (cost !== undefined) {
      if (Number(cost) < 0) return res.status(400).json({ error: 'El costo no puede ser negativo' });
      updates.cost = Number(cost);
    }
    if (category_id !== undefined) updates.category_id = category_id || null;
    if (active      !== undefined) updates.active = active;
    if (image_url   !== undefined) updates.image_url = image_url?.trim() || null;

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(updates)
      .eq('id', req.params.id)
      .select('*, category:categories(id, name)')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[products/update]', err.message);
    res.status(500).json({ error: err.message || 'Error al actualizar producto' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Producto eliminado correctamente' });
  } catch (err) {
    console.error('[products/delete]', err.message);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};

module.exports = {
  listProducts,
  getProduct,
  listAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
