const mongoose = require('mongoose');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');

// Helper to filter out null product references if catalog items were removed
const getCleanPopulatedCart = (customer) => {
  return (customer.cart || []).filter(
    (item) => item.product !== null && typeof item.product === 'object'
  );
};

// API 1: Add Product to Cart (POST /cart/:productId)
const addToCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (!customer.cart) {
      customer.cart = [];
    }

    const itemIndex = customer.cart.findIndex(
      (item) => item.product && item.product.toString() === productId
    );

    if (itemIndex > -1) {
      const newQuantity = customer.cart[itemIndex].quantity + 1;
      if (newQuantity > product.stock) {
        return res.status(400).json({
          success: false,
          message: 'Quantity exceeds available stock',
        });
      }
      customer.cart[itemIndex].quantity = newQuantity;
    } else {
      if (product.stock < 1) {
        return res.status(400).json({
          success: false,
          message: 'Product is out of stock',
        });
      }
      customer.cart.push({ product: productId, quantity: 1 });
    }

    await customer.save();

    await customer.populate({
      path: 'cart.product',
      select: 'name price category image stock description',
    });

    const cart = getCleanPopulatedCart(customer);

    return res.status(200).json({
      success: true,
      message: 'Product added to cart',
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// API 2: Get Current User's Cart (GET /cart)
const getCart = async (req, res) => {
  try {
    const customer = await Customer.findById(req.user._id).populate({
      path: 'cart.product',
      select: 'name price category image stock description',
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    const cart = getCleanPopulatedCart(customer);

    return res.status(200).json({
      success: true,
      count: cart.length,
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// API 3: Update Quantity (PATCH /cart/:productId)
const updateCartQuantity = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    if (
      quantity === undefined ||
      quantity === null ||
      typeof quantity !== 'number' ||
      isNaN(quantity) ||
      !Number.isInteger(quantity) ||
      quantity < 1
    ) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a valid number of at least 1',
      });
    }

    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
      });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (!customer.cart) {
      customer.cart = [];
    }

    const itemIndex = customer.cart.findIndex(
      (item) => item.product && item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart',
      });
    }

    if (quantity > product.stock) {
      return res.status(400).json({
        success: false,
        message: 'Quantity exceeds available stock',
      });
    }

    customer.cart[itemIndex].quantity = quantity;
    await customer.save();

    await customer.populate({
      path: 'cart.product',
      select: 'name price category image stock description',
    });

    const cart = getCleanPopulatedCart(customer);

    return res.status(200).json({
      success: true,
      message: 'Cart quantity updated',
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// API 4: Remove Product from Cart (DELETE /cart/:productId)
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid product ID format',
      });
    }

    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found',
      });
    }

    if (!customer.cart) {
      customer.cart = [];
    }

    const itemIndex = customer.cart.findIndex(
      (item) => item.product && item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in cart',
      });
    }

    customer.cart.splice(itemIndex, 1);
    await customer.save();

    await customer.populate({
      path: 'cart.product',
      select: 'name price category image stock description',
    });

    const cart = getCleanPopulatedCart(customer);

    return res.status(200).json({
      success: true,
      message: 'Product removed from cart',
      cart,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

module.exports = {
  addToCart,
  getCart,
  updateCartQuantity,
  removeFromCart,
};
