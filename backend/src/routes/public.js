// Rutas públicas (sin autenticación)
const router = require('express').Router();
const productsController    = require('../controllers/productsController');
const categoriesController  = require('../controllers/categoriesController');
const { supabaseAdmin }     = require('../services/supabase');

// Productos activos
router.get('/products',     productsController.listProducts);
router.get('/products/:id', productsController.getProduct);

// Categorías
router.get('/categories', categoriesController.listCategories);

// Settings públicas (whatsapp, horarios, qr_info)
router.get('/settings/public', async (_req, res) => {
  const { data, error } = await supabaseAdmin
    .from('settings')
    .select('key, value');
  if (error) return res.status(500).json({ error: error.message });

  const obj = {};
  (data || []).forEach(s => { obj[s.key] = s.value; });
  res.json(obj);
});

module.exports = router;
