const mongoose = require('mongoose');
const crypto = require('crypto');
const dotenv = require('dotenv');
dotenv.config();

const Customer = require('./models/customer.model');
const Product = require('./models/product.model');
const Order = require('./models/order.model');
const {
  createPaymentOrder,
  verifyPayment,
  getOrders,
  getOrderById,
} = require('./controllers/order.controller');

// Helper to create mock res
const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.data = null;
  res.status = function (code) {
    this.statusCode = code;
    return this;
  };
  res.json = function (payload) {
    this.data = payload;
    return this;
  };
  return res;
};

async function runTests() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/shopkart_db');
  console.log('--- Starting Lab 06 Backend Tests ---');

  // Create test customer
  const testEmail = `test_customer_${Date.now()}@test.com`;
  const customer = await Customer.create({
    fullName: 'Test Customer',
    email: testEmail,
    password: 'hashedpassword123',
    phone: '9876543210',
    cart: [],
  });

  const otherCustomer = await Customer.create({
    fullName: 'Other Customer',
    email: `other_${Date.now()}@test.com`,
    password: 'hashedpassword123',
    phone: '9876543211',
    cart: [],
  });

  // Create test product with stock 5, price 499
  const product = await Product.create({
    name: 'Test Bluetooth Earbuds',
    description: 'High quality audio',
    price: 499,
    category: 'Electronics',
    image: 'https://images.unsplash.com/photo-test',
    stock: 5,
  });

  console.log('✓ Created test customer and test product');

  // Test 1: Empty cart rejection
  {
    const req = {
      user: customer,
      body: {
        shippingAddress: {
          fullName: 'Test Customer',
          phone: '9876543210',
          address: '123 MG Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
      },
    };
    const res = createMockRes();
    await createPaymentOrder(req, res);
    console.assert(res.statusCode === 400, `Expected 400 for empty cart, got ${res.statusCode}`);
    console.assert(res.data.success === false, 'Expected success: false for empty cart');
    console.log('✓ Test 1: Empty cart rejected with 400');
  }

  // Test 2: Invalid shipping address (whitespace / missing / invalid phone / invalid pincode)
  {
    customer.cart = [{ product: product._id, quantity: 2 }];
    await customer.save();

    // 2a: Empty address
    const req1 = {
      user: customer,
      body: {
        shippingAddress: {
          fullName: 'Test Customer',
          phone: '9876543210',
          address: '   ',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
      },
    };
    const res1 = createMockRes();
    await createPaymentOrder(req1, res1);
    console.assert(res1.statusCode === 400, `Expected 400 for blank address, got ${res1.statusCode}`);

    // 2b: Invalid phone
    const req2 = {
      user: customer,
      body: {
        shippingAddress: {
          fullName: 'Test Customer',
          phone: '123',
          address: '123 Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
      },
    };
    const res2 = createMockRes();
    await createPaymentOrder(req2, res2);
    console.assert(res2.statusCode === 400, `Expected 400 for invalid phone, got ${res2.statusCode}`);

    // 2c: Invalid pincode (not 6 digits)
    const req3 = {
      user: customer,
      body: {
        shippingAddress: {
          fullName: 'Test Customer',
          phone: '9876543210',
          address: '123 Street',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '5600',
        },
      },
    };
    const res3 = createMockRes();
    await createPaymentOrder(req3, res3);
    console.assert(res3.statusCode === 400, `Expected 400 for invalid pincode, got ${res3.statusCode}`);
    console.log('✓ Test 2: Invalid shipping address & formatting rejected with 400');
  }

  // Test 3: Insufficient stock rejection
  {
    customer.cart = [{ product: product._id, quantity: 10 }]; // stock is 5
    await customer.save();

    const req = {
      user: customer,
      body: {
        shippingAddress: {
          fullName: 'Test Customer',
          phone: '9876543210',
          address: '123 MG Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
      },
    };
    const res = createMockRes();
    await createPaymentOrder(req, res);
    console.assert(res.statusCode === 400, `Expected 400 for insufficient stock, got ${res.statusCode}`);
    console.assert(res.data.message.includes('Insufficient stock'), 'Expected insufficient stock message');
    console.log('✓ Test 3: Insufficient stock rejected with 400');
  }

  // Test 4: Missing Razorpay credentials reporting
  {
    customer.cart = [{ product: product._id, quantity: 2 }];
    await customer.save();

    const oldKey = process.env.RAZORPAY_KEY_ID;
    const oldSecret = process.env.RAZORPAY_KEY_SECRET;
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;

    const req = {
      user: customer,
      body: {
        shippingAddress: {
          fullName: 'Test Customer',
          phone: '9876543210',
          address: '123 MG Road',
          city: 'Bangalore',
          state: 'Karnataka',
          pincode: '560001',
        },
      },
    };
    const res = createMockRes();
    await createPaymentOrder(req, res);
    console.assert(res.statusCode === 500, `Expected 500 when credentials missing, got ${res.statusCode}`);
    console.assert(res.data.message.includes('RAZORPAY_KEY_ID'), 'Expected message to mention RAZORPAY_KEY_ID');
    console.log('✓ Test 4: Missing Razorpay credentials gracefully returns 500 with helpful instruction');

    // Restore test credentials for subsequent tests
    process.env.RAZORPAY_KEY_ID = 'rzp_test_sampleKeyId123';
    process.env.RAZORPAY_KEY_SECRET = 'sampleSecretKey456';
  }

  // Test 5: Verify Payment - Invalid signature rejection
  let createdOrderId;
  {
    // Manually create an order in PENDING status to test verifyPayment
    const pendingOrder = await Order.create({
      user: customer._id,
      items: [
        {
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: 2,
          image: product.image,
        },
      ],
      shippingAddress: {
        fullName: 'Test Customer',
        phone: '9876543210',
        address: '123 MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        pincode: '560001',
      },
      total: 998,
      totalAmount: 998,
      paymentStatus: 'PENDING',
      status: 'PENDING',
      razorpayOrderId: 'order_test_rzp_9999',
    });
    createdOrderId = pendingOrder._id;

    const req = {
      user: customer,
      body: {
        orderId: pendingOrder._id,
        razorpayPaymentId: 'pay_test_123',
        razorpaySignature: 'invalid_tampered_signature',
      },
    };
    const res = createMockRes();
    await verifyPayment(req, res);

    console.assert(res.statusCode === 400, `Expected 400 for invalid signature, got ${res.statusCode}`);
    console.assert(res.data.success === false, 'Expected success: false for invalid signature');

    // Verify order was marked FAILED and cart is NOT cleared
    const updatedOrder = await Order.findById(pendingOrder._id);
    console.assert(updatedOrder.paymentStatus === 'FAILED', 'Order paymentStatus should be FAILED');
    const custAfterFail = await Customer.findById(customer._id);
    console.assert(custAfterFail.cart.length > 0, 'Cart must NOT be cleared on payment failure');
    console.log('✓ Test 5: Invalid payment signature rejected, order marked FAILED, cart preserved');
  }

  // Test 6: Verify Payment - Valid HMAC-SHA256 signature
  {
    // Reset order to PENDING
    const orderToPay = await Order.findById(createdOrderId);
    orderToPay.paymentStatus = 'PENDING';
    orderToPay.status = 'PENDING';
    await orderToPay.save();

    const paymentId = 'pay_test_valid_777';
    const bodyStr = `${orderToPay.razorpayOrderId}|${paymentId}`;
    const validSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(bodyStr)
      .digest('hex');

    const initialStock = product.stock; // 5

    const req = {
      user: customer,
      body: {
        orderId: orderToPay._id,
        razorpayPaymentId: paymentId,
        razorpaySignature: validSignature,
      },
    };
    const res = createMockRes();
    await verifyPayment(req, res);

    console.assert(res.statusCode === 200, `Expected 200 for valid payment, got ${res.statusCode}`);
    console.assert(res.data.success === true, 'Expected success: true');

    const confirmedOrder = await Order.findById(orderToPay._id);
    console.assert(confirmedOrder.paymentStatus === 'PAID', 'paymentStatus should be PAID');
    console.assert(confirmedOrder.status === 'PLACED', 'status should be PLACED');
    console.assert(confirmedOrder.razorpayPaymentId === paymentId, 'razorpayPaymentId persisted');

    // Verify stock decremented by item quantity (2)
    const updatedProduct = await Product.findById(product._id);
    console.assert(updatedProduct.stock === initialStock - 2, `Expected stock ${initialStock - 2}, got ${updatedProduct.stock}`);

    // Verify customer cart cleared
    const customerAfterSuccess = await Customer.findById(customer._id);
    console.assert(customerAfterSuccess.cart.length === 0, 'Customer cart must be cleared after payment verification');
    console.log('✓ Test 6: Valid payment verified: paymentStatus=PAID, status=PLACED, stock decremented, cart cleared');
  }

  // Test 7: Duplicate verification idempotency
  {
    const paymentId = 'pay_test_valid_777';
    const req = {
      user: customer,
      body: {
        orderId: createdOrderId,
        razorpayPaymentId: paymentId,
        razorpaySignature: 'any_sig',
      },
    };
    const res = createMockRes();
    await verifyPayment(req, res);
    console.assert(res.statusCode === 200, 'Expected 200 on duplicate verification');
    console.assert(res.data.message === 'Payment has already been verified.', 'Expected already verified message');
    console.log('✓ Test 7: Duplicate verification handled idempotently');
  }

  // Test 8: Cross-user order access (GET /orders/:id)
  {
    // Try to access customer's order with otherCustomer
    const reqOther = {
      user: otherCustomer,
      params: { id: createdOrderId.toString() },
    };
    const resOther = createMockRes();
    await getOrderById(reqOther, resOther);
    console.assert(resOther.statusCode === 403, `Expected 403 for unauthorized order access, got ${resOther.statusCode}`);

    // Access with owner
    const reqOwner = {
      user: customer,
      params: { id: createdOrderId.toString() },
    };
    const resOwner = createMockRes();
    await getOrderById(reqOwner, resOwner);
    console.assert(resOwner.statusCode === 200, `Expected 200 for order owner, got ${resOwner.statusCode}`);
    console.assert(resOwner.data.order._id.toString() === createdOrderId.toString(), 'Order ID matches');
    console.log('✓ Test 8: Order ownership strictly enforced on GET /orders/:id (403 for unauthorized users)');
  }

  // Test 9: Get Orders list (GET /orders)
  {
    const req = { user: customer };
    const res = createMockRes();
    await getOrders(req, res);
    console.assert(res.statusCode === 200, `Expected 200, got ${res.statusCode}`);
    console.assert(res.data.orders.length >= 1, 'Expected at least 1 order');
    console.assert(res.data.orders[0]._id.toString() === createdOrderId.toString(), 'Newest order first');
    console.log('✓ Test 9: GET /orders returned customer orders sorted newest first');
  }

  // Clean up test data
  await Order.deleteMany({ user: { $in: [customer._id, otherCustomer._id] } });
  await Customer.deleteMany({ _id: { $in: [customer._id, otherCustomer._id] } });
  await Product.deleteOne({ _id: product._id });
  console.log('✓ Cleaned up test data');

  console.log('\n=========================================');
  console.log('🎉 ALL LAB 06 BACKEND TESTS PASSED! 🎉');
  console.log('=========================================\n');

  await mongoose.disconnect();
}

runTests().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
