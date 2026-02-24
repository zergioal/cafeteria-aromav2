// Rutas para cajero (y admin, que puede hacer todo)
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const cashierController            = require('../controllers/cashierController');

// Todos los endpoints requieren auth + rol cashier o admin
router.use(requireAuth, requireRole('cashier', 'admin'));

router.get('/orders',                    cashierController.listOrders);
router.get('/orders/:id',                cashierController.getOrder);
router.patch('/orders/:id/status',       cashierController.updateOrderStatus);
router.post('/orders/:id/verify-payment',cashierController.verifyPayment);
router.post('/store-sale',               cashierController.registerStoreSale);
router.get('/summary/today',             cashierController.getTodaySummary);

module.exports = router;
