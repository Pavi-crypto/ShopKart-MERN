const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth.middleware');
const {
  createPaymentOrder,
  verifyPayment,
  getOrders,
  getOrderById,
} = require('../controllers/order.controller');

// All order endpoints are authenticated
router.post('/create-payment-order', protect, createPaymentOrder);
router.post('/verify-payment', protect, verifyPayment);
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderById);

module.exports = router;
