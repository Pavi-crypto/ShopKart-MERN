import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyProfile } from '../services/api';
import { useCart } from '../context/CartContext';

const Cart = ({ user: initialUser, setUser: setParentUser }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(initialUser || null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const {
    cartItems,
    loading,
    error,
    totalUnits,
    subtotal,
    updateQuantity,
    removeFromCart,
    fetchCart,
  } = useCart();

  useEffect(() => {
    if (initialUser) {
      setUser(initialUser);
    } else if (!user) {
      getMyProfile()
        .then((data) => {
          setUser(data);
          if (setParentUser) setParentUser(data);
        })
        .catch(() => setUser(null));
    }
  }, [initialUser, setParentUser, user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleQuantityChange = async (productId, currentQuantity, change, stock) => {
    const newQuantity = currentQuantity + change;
    if (newQuantity < 1) return;
    if (newQuantity > stock) {
      setActionError(`Cannot add more than available stock (${stock}).`);
      return;
    }

    setActionLoadingId(productId);
    setActionError('');

    try {
      await updateQuantity(productId, newQuantity);
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Failed to update quantity. Please try again.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRemove = async (productId) => {
    setActionLoadingId(productId);
    setActionError('');

    try {
      await removeFromCart(productId);
    } catch (err) {
      setActionError(
        err.response?.data?.message || 'Failed to remove product from cart.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="cart-container">
        <div className="cart-header">
          <h1>Shopping Cart</h1>
          <p>Review and manage items in your cart</p>
        </div>

        {actionError && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            {actionError}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="loading-card" style={{ margin: '3rem auto' }}>
            <div className="spinner"></div>
            <p>Loading your cart...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="wishlist-error-state cart-error-state">
            <p className="error-title">Unable to load your cart.</p>
            <button
              type="button"
              className="btn-primary btn-retry"
              onClick={fetchCart}
            >
              Try Again
            </button>
          </div>
        ) : cartItems.length === 0 ? (
          /* Empty State */
          <div className="wishlist-empty-state cart-empty-state">
            <h2 className="empty-title">Your cart is empty 🛒</h2>
            <p className="empty-subtitle">Looks like you haven't added anything yet.</p>
            <Link to="/products" className="btn-primary btn-browse">
              Browse Products
            </Link>
          </div>
        ) : (
          /* Cart Content with Items and Order Summary */
          <div className="cart-layout">
            <div className="cart-items-column">
              {cartItems.map((item) => {
                const product = item.product;
                if (!product) return null;
                const isItemProcessing = actionLoadingId === product._id;
                const itemSubtotal = (product.price || 0) * (item.quantity || 0);

                return (
                  <div key={product._id} className="cart-item-card">
                    <div className="cart-item-image">
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
                    <div className="cart-item-info">
                      <div className="cart-item-top">
                        <h3 className="cart-item-name">{product.name}</h3>
                        <span className="category-badge">{product.category}</span>
                      </div>
                      <p className="cart-item-price">
                        ₹{product.price?.toLocaleString()}
                      </p>
                      <p className="cart-item-stock">
                        {product.stock > 0
                          ? `${product.stock} units available`
                          : 'Out of Stock'}
                      </p>

                      <div className="cart-item-controls-row">
                        <div className="quantity-controls">
                          <button
                            type="button"
                            className="btn-qty btn-qty-minus"
                            onClick={() =>
                              handleQuantityChange(
                                product._id,
                                item.quantity,
                                -1,
                                product.stock
                              )
                            }
                            disabled={isItemProcessing || item.quantity <= 1}
                            aria-label="Decrease quantity"
                            title={item.quantity <= 1 ? 'Use Remove button to remove item' : 'Decrease quantity'}
                          >
                            -
                          </button>
                          <span className="cart-qty-value">{item.quantity}</span>
                          <button
                            type="button"
                            className="btn-qty btn-qty-plus"
                            onClick={() =>
                              handleQuantityChange(
                                product._id,
                                item.quantity,
                                1,
                                product.stock
                              )
                            }
                            disabled={
                              isItemProcessing || item.quantity >= product.stock
                            }
                            aria-label="Increase quantity"
                            title={
                              item.quantity >= product.stock
                                ? 'Maximum stock reached'
                                : 'Increase quantity'
                            }
                          >
                            +
                          </button>
                        </div>

                        <div className="cart-item-subtotal-box">
                          <span className="subtotal-label">Subtotal:</span>
                          <span className="subtotal-value">
                            ₹{itemSubtotal.toLocaleString()}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="btn-remove-cart"
                          onClick={() => handleRemove(product._id)}
                          disabled={isItemProcessing}
                        >
                          {isItemProcessing ? 'Removing...' : 'Remove'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="order-summary-column">
              <div className="order-summary-card">
                <h2 className="summary-title">Order Summary</h2>

                <div className="summary-row">
                  <span className="summary-label">Total Units:</span>
                  <span className="summary-value">{totalUnits}</span>
                </div>

                <div className="summary-row total-row">
                  <span className="summary-label">Subtotal:</span>
                  <span className="summary-value">₹{subtotal.toLocaleString()}</span>
                </div>

                <button
                  type="button"
                  className="btn-primary btn-checkout"
                  onClick={() => navigate('/checkout')}
                >
                  Proceed to Checkout
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Cart;
