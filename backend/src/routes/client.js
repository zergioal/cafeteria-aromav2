// Rutas para clientes autenticados
const router = require('express').Router();
const { requireAuth }      = require('../middleware/auth');
const ordersController     = require('../controllers/ordersController');

// Crear pedido online
router.post('/orders', requireAuth, ordersController.createOrder);

// Ver mis pedidos
router.get('/my-orders', requireAuth, ordersController.getMyOrders);

module.exports = router;
