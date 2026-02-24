// ============================================================
// Controller: Categorías
// ============================================================
const { supabaseAdmin } = require('../services/supabase');

const listCategories = async (_req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[categories/list]', err.message);
    res.status(500).json({ error: 'Error al obtener categorías' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es obligatorio' });
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return res.status(409).json({ error: 'Ya existe una categoría con ese nombre' });
      throw error;
    }
    res.status(201).json(data);
  } catch (err) {
    console.error('[categories/create]', err.message);
    res.status(500).json({ error: 'Error al crear categoría' });
  }
};

const updateCategory = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    const { data, error } = await supabaseAdmin
      .from('categories')
      .update({ name: name.trim() })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[categories/update]', err.message);
    res.status(500).json({ error: 'Error al actualizar categoría' });
  }
};

const deleteCategory = async (req, res) => {
  try {
    const { error } = await supabaseAdmin
      .from('categories')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ message: 'Categoría eliminada' });
  } catch (err) {
    console.error('[categories/delete]', err.message);
    res.status(500).json({ error: 'Error al eliminar categoría' });
  }
};

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
