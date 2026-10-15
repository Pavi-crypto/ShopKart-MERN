const mongoose = require('mongoose');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const Order = require('../models/order.model');
const Customer = require('../models/customer.model');
const Product = require('../models/product.model');

// Helper to validate phone number (10 digits)
const isValidPhone = (phone) => {
  return /^[0-9]{10}$/.test(phone);
};

// Helper to validate 6-digit pincode
const isValidPincode = (pincode) => {
  return /^\d{6}$/.test(pincode);
};

// API 1: Create Payment Order (POST /orders/create-payment-order)
const createPaymentOrder = async (req, res) => {
  try {
    const shippingAddress = req.body.shippingAddress || {};
    const fullName = (shippingAddress.fullName || '').trim();
    const phone = (shippingAddress.phone || '').trim();
    const address = (shippingAddress.address || shippingAddress.addressLine || '').trim();
    const city = (shippingAddress.city || '').trim();
    const state = (shippingAddress.state || '').trim();
    const pincode = (shippingAddress.pincode || shippingAddress.pinCode || '').trim();

    // 1. Validate shipping address fields
    if (!fullName || !phone || !address || !city || !state || !pincode) {
      return res.status(400).json({
        success: false,
        message: 'All shipping fields (full name, phone, address, city, state, pincode) are required and cannot be empty.',
      });
    }

    if (!isValidPhone(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid 10-digit phone number.',
      });
    }

    if (!isValidPincode(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Pincode must be exactly 6 digits.',
      });
    }

    // 2. Fetch authenticated user's cart from database (never trust client payload)
    const customer = await Customer.findById(req.user._id);
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found.',
      });
    }

    if (!customer.cart || customer.cart.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Your cart is empty. Please add products to cart before checkout.',
      });
    }

    // 3. Validate product availability, stock, and calculate trusted total
    const orderItems = [];
    let calculatedTotal = 0;

    for (const item of customer.cart) {
      if (!item.product) continue;

      const product = await Product.findById(item.product);
      if (!product) {
        return res.status(400).json({
          success: false,
          message: 'One or more products in your cart are no longer available.',
        });
      }

      const qty = Number(item.quantity);
      if (!qty || qty < 1) {
        return res.status(400).json({
          success: false,
          message: `Invalid quantity specified for "${product.name}".`,
        });
      }

      if (product.stock < qty) {
        return res.status(400).json({
          success: false,
          message: `Insufficient stock for "${product.name}". Available: ${product.stock}, requested: ${qty}.`,
        });
      }

      calculatedTotal += product.price * qty;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.image,
      });
    }

    if (orderItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid items found in cart.',
      });
    }

    if (calculatedTotal <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Order total must be greater than zero.',
      });
    }

    // 4. Check Razorpay credentials
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay Test Mode credentials are not configured on the server. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env',
      });
    }

    // 5. Create Razorpay order
    const razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });

    const amountInPaise = Math.round(calculatedTotal * 100);

    let rzpOrder;
    try {
      rzpOrder = await razorpay.orders.create({
        amount: amountInPaise,
        currency: 'INR',
        receipt: `receipt_${Date.now()}`,
      });
    } catch (rzpErr) {
      return res.status(500).json({
        success: false,
        message: `Razorpay order creation failed: ${rzpErr.error?.description || rzpErr.message || 'Payment provider error'}`,
      });
    }

    // 6. Save ShopKart order in MongoDB
    const order = new Order({
      user: customer._id,
      items: orderItems,
      shippingAddress: {
        fullName,
        phone,
        address,
        city,
        state,
        pincode,
      },
      total: calculatedTotal,
      totalAmount: calculatedTotal,
      paymentStatus: 'PENDING',
      status: 'PENDING',
      razorpayOrderId: rzpOrder.id,
    });

    await order.save();

    return res.status(201).json({
      success: true,
      orderId: order._id,
      razorpayOrderId: rzpOrder.id,
      amount: rzpOrder.amount,
      currency: rzpOrder.currency,
      keyId: keyId,
      order,
    });
  } catch (error) {
    console.error('Create payment order error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating order. Your cart has been preserved.',
    });
  }
};

// API 2: Verify Payment (POST /orders/verify-payment)
const verifyPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const razorpayOrderId = req.body.razorpayOrderId || req.body.razorpay_order_id;
    const razorpayPaymentId = req.body.razorpayPaymentId || req.body.razorpay_payment_id;
    const razorpaySignature = req.body.razorpaySignature || req.body.razorpay_signature;

    if (!orderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        message: 'Missing required payment verification parameters.',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(orderId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format.',
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Ownership check
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this order.',
      });
    }

    // Prevent duplicate verification
    if (order.paymentStatus === 'PAID') {
      return res.status(200).json({
        success: true,
        message: 'Payment has already been verified.',
        order,
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay secret key not configured on server.',
      });
    }

    // Verify HMAC-SHA256 signature using the trusted stored razorpayOrderId from DB
    const body = `${order.razorpayOrderId}|${razorpayPaymentId}`;
    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpaySignature) {
      order.paymentStatus = 'FAILED';
      order.status = 'FAILED';
      await order.save();

      return res.status(400).json({
        success: false,
        message: 'Payment verification failed: Invalid signature.',
      });
    }

    // Signature verified! Update order status
    order.paymentStatus = 'PAID';
    order.status = 'PLACED';
    order.razorpayPaymentId = razorpayPaymentId;
    order.razorpaySignature = razorpaySignature;
    await order.save();

    // Deduct stock for each purchased item
    for (const item of order.items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity },
      });
    }

    // Clear authenticated user's database cart only after successful payment verification
    const customer = await Customer.findById(req.user._id);
    if (customer) {
      customer.cart = [];
      await customer.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order placed successfully.',
      order,
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while verifying payment.',
    });
  }
};

// API 3: Get User's Orders (GET /orders)
const getOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders,
    });
  } catch (error) {
    console.error('Get orders error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching orders.',
    });
  }
};

// API 4: Get Order By ID (GET /orders/:id)
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format.',
      });
    }

    const order = await Order.findById(id);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found.',
      });
    }

    // Enforce ownership: user must never access another user's order
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this order.',
      });
    }

    return res.status(200).json({
      success: true,
      order,
    });
  } catch (error) {
    console.error('Get order by ID error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching order details.',
    });
  }
};

module.exports = {
  createPaymentOrder,
  verifyPayment,
  getOrders,
  getOrderById,
};
