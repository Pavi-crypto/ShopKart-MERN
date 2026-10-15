const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
} = require('../controllers/product.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/', createProduct);
router.get('/', protect, getAllProducts);
router.get('/:id', protect, getProductById);

module.exports = router;
