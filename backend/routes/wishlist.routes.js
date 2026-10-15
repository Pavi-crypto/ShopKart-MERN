const express = require('express');
const router = express.Router();
const {
  addToWishlist,
  getWishlist,
  removeFromWishlist,
} = require('../controllers/wishlist.controller');
const { protect } = require('../middlewares/auth.middleware');

router.post('/:productId', protect, addToWishlist);
router.get('/', protect, getWishlist);
router.delete('/:productId', protect, removeFromWishlist);

module.exports = router;
