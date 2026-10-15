import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyProfile, getOrders } from '../services/api';

const Orders = ({ user: initialUser, setUser: setParentUser }) => {
  const [user, setUser] = useState(initialUser || null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
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

  const fetchUserOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getOrders();
      if (data && data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to fetch your orders. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserOrders();
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="cart-container orders-page-container">
        <div className="cart-header">
          <h1>My Orders</h1>
          <p>View your past orders, delivery details, and payment statuses</p>
        </div>

        {loading ? (
          <div className="loading-card" style={{ margin: '3rem auto' }}>
            <div className="spinner"></div>
            <p>Loading your orders...</p>
          </div>
        ) : error ? (
          <div className="wishlist-error-state cart-error-state">
            <p className="error-title">{error}</p>
            <button
              type="button"
              className="btn-primary btn-retry"
              onClick={fetchUserOrders}
              style={{ marginTop: '1rem', width: 'auto', padding: '0.6rem 1.5rem' }}
            >
              Try Again
            </button>
          </div>
        ) : orders.length === 0 ? (
          <div className="wishlist-empty-state cart-empty-state">
            <h2 className="empty-title">No orders yet 📦</h2>
            <p className="empty-subtitle">You have not placed any orders so far.</p>
            <Link to="/products" className="btn-primary btn-browse">
              Browse Products
            </Link>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => {
              const total = order.total || order.totalAmount || 0;
              const isPaid = order.paymentStatus === 'PAID';
              const isPlaced = order.status === 'PLACED';

              return (
                <div key={order._id} className="order-history-card">
                  <div className="order-history-header">
                    <div className="order-header-info">
                      <div className="order-id-block">
                        <span className="order-label">Order ID</span>
                        <span className="order-id-value">#{order._id}</span>
                      </div>
                      <div className="order-date-block">
                        <span className="order-label">Placed On</span>
                        <span className="order-date-value">{formatDate(order.createdAt)}</span>
                      </div>
                    </div>

                    <div className="order-header-badges">
                      <span
                        className={`status-badge ${
                          isPlaced ? 'status-placed' : 'status-pending'
                        }`}
                      >
                        Order: {order.status}
                      </span>
                      <span
                        className={`status-badge ${
                          isPaid ? 'status-paid' : 'status-pending'
                        }`}
                      >
                        Payment: {order.paymentStatus}
                      </span>
                      <div className="order-total-block">
                        <span className="order-label">Total:</span>
                        <span className="order-total-value">₹{total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="order-history-body">
                    <div className="order-items-list">
                      {order.items?.map((item, index) => (
                        <div key={index} className="order-item-row">
                          {item.image && (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="order-item-thumbnail"
                              onError={(e) => {
                                e.target.onerror = null;
                                e.target.src =
                                  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
                              }}
                            />
                          )}
                          <div className="order-item-desc">
                            <h4 className="order-item-title">{item.name}</h4>
                            <p className="order-item-meta">
                              Qty: <strong>{item.quantity}</strong> × ₹{item.price?.toLocaleString()}
                            </p>
                          </div>
                          <div className="order-item-amount">
                            ₹{((item.price || 0) * (item.quantity || 0)).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.shippingAddress && (
                      <div className="order-shipping-summary">
                        <h5>Delivery Address</h5>
                        <p className="shipping-text">
                          {order.shippingAddress.fullName} | {order.shippingAddress.phone}
                        </p>
                        <p className="shipping-text">
                          {order.shippingAddress.address}, {order.shippingAddress.city},{' '}
                          {order.shippingAddress.state} - {order.shippingAddress.pincode}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};

export default Orders;
