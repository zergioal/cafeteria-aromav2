// Rutas solo para admin
const router = require('express').Router();
const { requireAuth, requireRole }  = require('../middleware/auth');
const productsController            = require('../controllers/productsController');
const categoriesController          = require('../controllers/categoriesController');
const adminController               = require('../controllers/adminController');

// Todos los endpoints requieren auth + rol admin
router.use(requireAuth, requireRole('admin'));

// ── Productos (admin ve todos, activos e inactivos) ──────────
router.get('/products',        productsController.listAllProducts);
router.post('/products',       productsController.createProduct);
router.put('/products/:id',    productsController.updateProduct);
router.delete('/products/:id', productsController.deleteProduct);

// ── Categorías ───────────────────────────────────────────────
router.get('/categories',        categoriesController.listCategories);
router.post('/categories',       categoriesController.createCategory);
router.put('/categories/:id',    categoriesController.updateCategory);
router.delete('/categories/:id', categoriesController.deleteCategory);

// ── Usuarios ─────────────────────────────────────────────────
router.get('/users',          adminController.listUsers);
router.post('/users',         adminController.createUser);
router.patch('/users/:id',    adminController.updateUser);

// ── Dashboard de ventas ──────────────────────────────────────
router.get('/dashboard', adminController.getDashboard);

// ── Settings del negocio ─────────────────────────────────────
router.get('/settings', adminController.getSettings);
router.put('/settings', adminController.updateSettings);

module.exports = router;
