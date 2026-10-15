import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProductCard from '../components/ProductCard';
import {
  getProducts,
  getMyProfile,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from '../services/api';
import { useCart } from '../context/CartContext';

const CATEGORIES = ['All Categories', 'Electronics', 'Fashion', 'Books', 'Home'];

const Products = ({ user: propUser, setUser: propSetUser }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [user, setUser] = useState(propUser || null);
  const [wishlistIds, setWishlistIds] = useState([]);
  const { fetchCart } = useCart();

  useEffect(() => {
    // Use user profile from ProtectedRoute or fetch if standalone
    if (propUser) {
      setUser(propUser);
    } else {
      getMyProfile()
        .then((data) => {
          setUser(data);
          if (propSetUser) propSetUser(data);
        })
        .catch(() => setUser(null));
    }

    // Ensure cart is synchronized
    fetchCart();

    // Fetch authenticated user's wishlist once
    getWishlist()
      .then((data) => {
        if (data.success && Array.isArray(data.wishlist)) {
          const ids = data.wishlist.map((item) =>
            item._id ? item._id.toString() : item.toString()
          );
          setWishlistIds(ids);
        }
      })
      .catch((err) => {
        console.error('Failed to load wishlist:', err);
      });
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setError('');
    try {
      // Do not send category filter if 'All Categories' is selected
      const selectedCat = category === 'All Categories' ? '' : category;
      const data = await getProducts(search, selectedCat);
      if (data.success) {
        setProducts(data.products || []);
      } else {
        setError('Something went wrong while loading products.');
      }
    } catch (err) {
      setError('Something went wrong while loading products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 300); // Debounce search input

    return () => clearTimeout(timer);
  }, [search, category]);

  const handleToggleWishlist = async (productId) => {
    const isCurrentlyWishlisted = wishlistIds.includes(productId);

    if (isCurrentlyWishlisted) {
      await removeFromWishlist(productId);
      setWishlistIds((prev) => prev.filter((id) => id !== productId));
    } else {
      await addToWishlist(productId);
      setWishlistIds((prev) => [...prev, productId]);
    }
  };

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="products-container">
        <div className="products-header">
          <div>
            <h1>Product Catalog</h1>
            <p>Discover & search products in ShopKart</p>
          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="filter-section">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="category-filter">
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && <div className="alert alert-error">{error}</div>}

        {/* Loading State */}
        {loading ? (
          <div className="loading-card">
            <div className="spinner"></div>
            <p>Loading products...</p>
          </div>
        ) : products.length === 0 ? (
          /* Empty State */
          <div className="empty-state">
            <h3>No products found.</h3>
          </div>
        ) : (
          /* Products Grid */
          <div className="products-grid">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                isWishlisted={wishlistIds.includes(product._id)}
                onToggleWishlist={handleToggleWishlist}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
};

export default Products;
