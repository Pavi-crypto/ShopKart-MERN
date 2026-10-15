import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyProfile, createPaymentOrder, verifyPayment } from '../services/api';
import { useCart } from '../context/CartContext';

// Helper to dynamically load Razorpay checkout script safely
const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const existingScript = document.getElementById('razorpay-checkout-script');
    if (existingScript) {
      existingScript.onload = () => resolve(true);
      existingScript.onerror = () => resolve(false);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

const Checkout = ({ user: initialUser, setUser: setParentUser }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(initialUser || null);
  const { cartItems, loading: cartLoading, totalUnits, subtotal, clearCart, fetchCart } = useCart();

  const [formData, setFormData] = useState({
    fullName: initialUser?.fullName || '',
    phone: initialUser?.phone || '',
    address: '',
    city: '',
    state: '',
    pincode: '',
  });

  const [formErrors, setFormErrors] = useState({});
  const [backendError, setBackendError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
      setFormData((prev) => ({
        ...prev,
        fullName: prev.fullName || initialUser.fullName || '',
        phone: prev.phone || initialUser.phone || '',
      }));
    } else if (!user) {
      getMyProfile()
        .then((data) => {
          setUser(data);
          if (setParentUser) setParentUser(data);
          setFormData((prev) => ({
            ...prev,
            fullName: prev.fullName || data.fullName || '',
            phone: prev.phone || data.phone || '',
          }));
        })
        .catch(() => setUser(null));
    }
  }, [initialUser, setParentUser, user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    // Clear validation error when user begins typing
    if (formErrors[name]) {
      setFormErrors((prev) => ({
        ...prev,
        [name]: '',
      }));
    }
    setBackendError('');
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.fullName || formData.fullName.trim() === '') {
      errors.fullName = 'Full Name is required.';
    }

    if (!formData.phone || formData.phone.trim() === '') {
      errors.phone = 'Phone number is required.';
    } else if (!/^[0-9]{10}$/.test(formData.phone.trim())) {
      errors.phone = 'Enter a valid 10-digit phone number.';
    }

    if (!formData.address || formData.address.trim() === '') {
      errors.address = 'Street Address line is required.';
    }

    if (!formData.city || formData.city.trim() === '') {
      errors.city = 'City is required.';
    }

    if (!formData.state || formData.state.trim() === '') {
      errors.state = 'State is required.';
    }

    if (!formData.pincode || formData.pincode.trim() === '') {
      errors.pincode = 'Pincode is required.';
    } else if (!/^\d{6}$/.test(formData.pincode.trim())) {
      errors.pincode = 'Pincode must be exactly 6 digits.';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    setBackendError('');

    if (cartItems.length === 0) {
      setBackendError('Your cart is empty. Please add items before checking out.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      // 1. Create order on backend and get Razorpay order details
      const orderResponse = await createPaymentOrder({
        fullName: formData.fullName.trim(),
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
      });

      if (!orderResponse || !orderResponse.success) {
        throw new Error(orderResponse?.message || 'Failed to initialize order.');
      }

      const { orderId, razorpayOrderId, amount, currency, keyId } = orderResponse;

      // 2. Load Razorpay checkout script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay payment SDK. Please check your internet connection.');
      }

      // 3. Open Razorpay Checkout modal
      const options = {
        key: keyId,
        amount: amount,
        currency: currency || 'INR',
        name: 'ShopKart',
        description: `Order #${orderId}`,
        order_id: razorpayOrderId,
        prefill: {
          name: formData.fullName.trim(),
          contact: formData.phone.trim(),
          email: user?.email || '',
        },
        theme: {
          color: '#2563eb',
        },
        handler: async function (response) {
          // Callback after user completes payment in Razorpay modal
          try {
            setVerifying(true);
            const verifyRes = await verifyPayment({
              orderId,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });

            if (verifyRes.success) {
              // Immediately clear global cart state so Navbar count becomes 0
              clearCart();
              // Navigate to confirmation page
              navigate(`/order-confirmation/${orderId}`, {
                state: { order: verifyRes.order },
              });
            } else {
              setBackendError(verifyRes.message || 'Payment verification failed on the server.');
            }
          } catch (verifyErr) {
            console.error('Payment verification error:', verifyErr);
            setBackendError(
              verifyErr.response?.data?.message ||
                'Payment verification failed. Please contact support.'
            );
          } finally {
            setVerifying(false);
            setSubmitting(false);
          }
        },
        modal: {
          ondismiss: function () {
            setSubmitting(false);
            setBackendError('Payment was cancelled. Your cart items have been preserved.');
          },
        },
      };

      const razorpayInstance = new window.Razorpay(options);

      razorpayInstance.on('payment.failed', function (failureResponse) {
        setSubmitting(false);
        const reason =
          failureResponse.error?.description ||
          failureResponse.error?.reason ||
          'Payment failed. Please try again.';
        setBackendError(reason);
      });

      razorpayInstance.open();
    } catch (err) {
      console.error('Checkout error:', err);
      setBackendError(
        err.response?.data?.message || err.message || 'Unable to proceed to payment. Please try again.'
      );
      setSubmitting(false);
    }
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="cart-container checkout-container">
        <div className="cart-header">
          <h1>Checkout</h1>
          <p>Provide your delivery details and complete your payment</p>
        </div>

        {backendError && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            {backendError}
          </div>
        )}

        {cartLoading ? (
          <div className="loading-card" style={{ margin: '3rem auto' }}>
            <div className="spinner"></div>
            <p>Loading checkout details...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="wishlist-empty-state cart-empty-state">
            <h2 className="empty-title">Your cart is empty 🛒</h2>
            <p className="empty-subtitle">You have no items in your cart to checkout.</p>
            <Link to="/products" className="btn-primary btn-browse">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="checkout-layout">
            {/* Left Column: Shipping Address Form */}
            <div className="checkout-form-column">
              <div className="checkout-card">
                <h2 className="checkout-section-title">Shipping Address</h2>
                <form onSubmit={handlePayment} noValidate>
                  <div className="form-group">
                    <label htmlFor="fullName">Full Name *</label>
                    <input
                      type="text"
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="e.g. John Doe"
                      disabled={submitting || verifying}
                      className={formErrors.fullName ? 'input-error' : ''}
                    />
                    {formErrors.fullName && (
                      <span className="field-error-text">{formErrors.fullName}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="phone">Phone Number (10 digits) *</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="e.g. 9876543210"
                      disabled={submitting || verifying}
                      className={formErrors.phone ? 'input-error' : ''}
                    />
                    {formErrors.phone && (
                      <span className="field-error-text">{formErrors.phone}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label htmlFor="address">Address Line *</label>
                    <textarea
                      id="address"
                      name="address"
                      rows="3"
                      value={formData.address}
                      onChange={handleChange}
                      placeholder="House / Flat No, Street, Landmark"
                      disabled={submitting || verifying}
                      className={formErrors.address ? 'input-error' : ''}
                    />
                    {formErrors.address && (
                      <span className="field-error-text">{formErrors.address}</span>
                    )}
                  </div>

                  <div className="form-row-2col">
                    <div className="form-group">
                      <label htmlFor="city">City *</label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        value={formData.city}
                        onChange={handleChange}
                        placeholder="e.g. Bangalore"
                        disabled={submitting || verifying}
                        className={formErrors.city ? 'input-error' : ''}
                      />
                      {formErrors.city && (
                        <span className="field-error-text">{formErrors.city}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label htmlFor="state">State *</label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        value={formData.state}
                        onChange={handleChange}
                        placeholder="e.g. Karnataka"
                        disabled={submitting || verifying}
                        className={formErrors.state ? 'input-error' : ''}
                      />
                      {formErrors.state && (
                        <span className="field-error-text">{formErrors.state}</span>
                      )}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="pincode">Pincode (6 digits) *</label>
                    <input
                      type="text"
                      id="pincode"
                      name="pincode"
                      maxLength="6"
                      value={formData.pincode}
                      onChange={handleChange}
                      placeholder="e.g. 560001"
                      disabled={submitting || verifying}
                      className={formErrors.pincode ? 'input-error' : ''}
                    />
                    {formErrors.pincode && (
                      <span className="field-error-text">{formErrors.pincode}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="btn-primary btn-pay-now"
                    disabled={submitting || verifying}
                  >
                    {verifying
                      ? 'Verifying Payment...'
                      : submitting
                      ? 'Processing Order...'
                      : `Pay ₹${subtotal.toLocaleString()} via Razorpay`}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Order Summary & Items List */}
            <div className="checkout-summary-column">
              <div className="order-summary-card">
                <h2 className="summary-title">Order Summary</h2>

                <div className="checkout-items-preview">
                  {cartItems.map((item) => {
                    const product = item.product;
                    if (!product) return null;
                    const itemSubtotal = (product.price || 0) * (item.quantity || 0);

                    return (
                      <div key={product._id} className="checkout-item-row">
                        <div className="checkout-item-thumb">
                          <img
                            src={product.image}
                            alt={product.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src =
                                'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
                            }}
                          />
                        </div>
                        <div className="checkout-item-details">
                          <p className="checkout-item-name">{product.name}</p>
                          <p className="checkout-item-qty">
                            Qty: {item.quantity} × ₹{product.price?.toLocaleString()}
                          </p>
                        </div>
                        <div className="checkout-item-subtotal">
                          ₹{itemSubtotal.toLocaleString()}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="summary-row" style={{ marginTop: '1.25rem' }}>
                  <span className="summary-label">Total Items / Units:</span>
                  <span className="summary-value">{totalUnits}</span>
                </div>

                <div className="summary-row total-row">
                  <span className="summary-label">Total Payable:</span>
                  <span className="summary-value">₹{subtotal.toLocaleString()}</span>
                </div>

                <div className="checkout-security-badge">
                  <span>🔒 Safe & Secure Razorpay Test Mode Payment</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Checkout;
