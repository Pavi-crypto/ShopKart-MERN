import React, { useState, useEffect } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyProfile, getOrderById } from '../services/api';

const OrderConfirmation = ({ user: initialUser, setUser: setParentUser }) => {
  const { id } = useParams();
  const location = useLocation();
  const [user, setUser] = useState(initialUser || null);
  const [order, setOrder] = useState(location.state?.order || null);
  const [loading, setLoading] = useState(!location.state?.order);
  const [error, setError] = useState('');

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
    // If order is not available in location state, fetch it from backend
    if (!order && id) {
      setLoading(true);
      getOrderById(id)
        .then((data) => {
          if (data && data.success && data.order) {
            setOrder(data.order);
          } else {
            setError('Order details could not be found.');
          }
        })
        .catch((err) => {
          setError(
            err.response?.data?.message || 'Failed to fetch order details.'
          );
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, order]);

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="cart-container confirmation-page-container">
        {loading ? (
          <div className="loading-card" style={{ margin: '3rem auto' }}>
            <div className="spinner"></div>
            <p>Loading order confirmation...</p>
          </div>
        ) : error ? (
          <div className="wishlist-error-state cart-error-state">
            <p className="error-title">{error}</p>
            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <Link to="/orders" className="btn-primary" style={{ textDecoration: 'none', width: 'auto', padding: '0.6rem 1.5rem' }}>
                View My Orders
              </Link>
              <Link to="/products" className="btn-secondary" style={{ textDecoration: 'none', width: 'auto', padding: '0.6rem 1.5rem' }}>
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : order ? (
          <div className="confirmation-card">
            <div className="confirmation-header">
              <div className="success-icon-badge">✓</div>
              <h1 className="confirmation-title">Order Confirmed!</h1>
              <p className="confirmation-subtitle">
                Thank you for your purchase. We have received your order and payment.
              </p>
            </div>

            <div className="confirmation-meta-box">
              <div className="meta-col">
                <span className="meta-label">Order ID</span>
                <span className="meta-value order-id-highlight">{order._id}</span>
              </div>
              <div className="meta-col">
                <span className="meta-label">Order Status</span>
                <span className="status-badge status-placed">{order.status || 'PLACED'}</span>
              </div>
              <div className="meta-col">
                <span className="meta-label">Payment Status</span>
                <span className="status-badge status-paid">{order.paymentStatus || 'PAID'}</span>
              </div>
              <div className="meta-col">
                <span className="meta-label">Total Amount</span>
                <span className="meta-value total-highlight">₹{(order.total || order.totalAmount)?.toLocaleString()}</span>
              </div>
            </div>

            {order.shippingAddress && (
              <div className="confirmation-section">
                <h3>Delivery Address</h3>
                <p className="address-line"><strong>{order.shippingAddress.fullName}</strong> ({order.shippingAddress.phone})</p>
                <p className="address-line">{order.shippingAddress.address}</p>
                <p className="address-line">{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
              </div>
            )}

            <div className="confirmation-section">
              <h3>Ordered Items</h3>
              <div className="confirmation-items-list">
                {order.items?.map((item, idx) => (
                  <div key={idx} className="confirmation-item-row">
                    {item.image && (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="confirmation-item-img"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src =
                            'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
                        }}
                      />
                    )}
                    <div className="confirmation-item-info">
                      <p className="item-title">{item.name}</p>
                      <p className="item-qty-price">
                        Qty: {item.quantity} × ₹{item.price?.toLocaleString()}
                      </p>
                    </div>
                    <div className="confirmation-item-subtotal">
                      ₹{((item.price || 0) * (item.quantity || 0)).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="confirmation-actions">
              <Link to="/orders" className="btn-primary btn-view-orders">
                View My Orders
              </Link>
              <Link to="/products" className="btn-secondary btn-continue-shopping">
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
};

export default OrderConfirmation;
