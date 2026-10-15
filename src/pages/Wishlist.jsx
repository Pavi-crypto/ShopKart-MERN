import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getWishlist, removeFromWishlist, getMyProfile } from '../services/api';

const Wishlist = ({ user: initialUser, setUser: setParentUser }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [removeError, setRemoveError] = useState('');
  const [removingId, setRemovingId] = useState(null);
  const [user, setUser] = useState(initialUser || null);
  const navigate = useNavigate();

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

  const fetchWishlistData = async () => {
    setLoading(true);
    setError(false);
    setRemoveError('');
    try {
      const data = await getWishlist();
      if (data.success) {
        setWishlist(data.wishlist || []);
      } else {
        setError(true);
      }
    } catch (err) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlistData();
  }, []);

  const handleRemove = async (productId) => {
    setRemovingId(productId);
    setRemoveError('');
    try {
      const data = await removeFromWishlist(productId);
      if (data.success) {
        setWishlist((prev) => prev.filter((item) => item._id !== productId));
      } else {
        setRemoveError('Failed to remove product from wishlist.');
      }
    } catch (err) {
      setRemoveError(err.response?.data?.message || 'Failed to remove product from wishlist.');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="wishlist-container">
        <div className="wishlist-header">
          <h1>My Wishlist</h1>
          <p>Saved items you want to shop for later</p>
        </div>

        {removeError && (
          <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
            {removeError}
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="loading-card" style={{ margin: '3rem auto' }}>
            <div className="spinner"></div>
            <p>Loading your wishlist...</p>
          </div>
        ) : error ? (
          /* Error State */
          <div className="wishlist-error-state">
            <p className="error-title">Something went wrong.</p>
            <p className="error-subtitle">We couldn't load your wishlist.</p>
            <button
              type="button"
              className="btn-primary btn-retry"
              onClick={fetchWishlistData}
            >
              Try Again
            </button>
          </div>
        ) : wishlist.length === 0 ? (
          /* Empty State */
          <div className="wishlist-empty-state">
            <h2 className="empty-title">Your wishlist is empty ❤️</h2>
            <p className="empty-subtitle">Start saving products you love.</p>
            <Link to="/products" className="btn-primary btn-browse">
              Browse Products
            </Link>
          </div>
        ) : (
          /* Wishlist Grid */
          <div className="products-grid">
            {wishlist.map((item) => (
              <div key={item._id} className="product-card">
                <div className="product-image-wrapper">
                  <img
                    src={item.image}
                    alt={item.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src =
                        'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
                    }}
                  />
                  <span className="category-badge">{item.category}</span>
                </div>
                <div className="product-card-body">
                  <h3 className="product-name">{item.name}</h3>
                  <p className="product-category-text">{item.category}</p>
                  <p className="product-price">₹{item.price?.toLocaleString()}</p>
                  <p
                    className={`stock-status ${
                      item.stock > 0 ? 'in-stock' : 'out-of-stock'
                    }`}
                  >
                    {item.stock > 0 ? `${item.stock} units left` : 'Out of Stock'}
                  </p>

                  <div className="card-actions">
                    <button
                      type="button"
                      onClick={() => navigate(`/products/${item._id}`)}
                      className="btn-details"
                    >
                      View Details
                    </button>

                    <button
                      type="button"
                      className="btn-remove-wishlist"
                      onClick={() => handleRemove(item._id)}
                      disabled={removingId === item._id}
                    >
                      {removingId === item._id ? 'Removing...' : 'Remove ♥'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Wishlist;
