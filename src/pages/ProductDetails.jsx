import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getProductById, getMyProfile } from '../services/api';

const ProductDetails = ({ user: propUser, setUser: propSetUser }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState(propUser || null);

  useEffect(() => {
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

    const fetchProduct = async () => {
      setLoading(true);
      setError('');
      try {
        const data = await getProductById(id);
        if (data.success && data.product) {
          setProduct(data.product);
        } else {
          setError('Product not found');
        }
      } catch (err) {
        if (err.response?.status === 404) {
          setError('Product not found');
        } else if (err.response?.status === 400) {
          setError('Invalid Product ID format');
        } else {
          setError('Something went wrong while loading product details.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="product-details-container">
        <div className="back-navigation">
          <button onClick={() => navigate('/products')} className="btn-back">
            &larr; Back to Products
          </button>
        </div>

        {loading ? (
          <div className="loading-card">
            <div className="spinner"></div>
            <p>Loading product details...</p>
          </div>
        ) : error || !product ? (
          <div className="alert alert-error text-center">
            <h3>{error || 'Product Not Found'}</h3>
            <p className="mt-2">The requested product could not be loaded.</p>
            <Link to="/products" className="btn-primary inline-block mt-4">
              Return to Catalog
            </Link>
          </div>
        ) : (
          <div className="product-details-card">
            <div className="product-details-image">
              <img
                src={product.image}
                alt={product.name}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
                }}
              />
            </div>
            <div className="product-details-info">
              <span className="category-pill">{product.category}</span>
              <h1 className="product-title">{product.name}</h1>
              <p className="product-price-large">₹{product.price.toLocaleString()}</p>
              
              <div className="stock-info">
                <span className={`stock-badge ${product.stock > 0 ? 'in-stock-badge' : 'out-of-stock-badge'}`}>
                  {product.stock > 0 ? `${product.stock} units left` : 'Out of Stock'}
                </span>
              </div>

              <div className="description-section">
                <h3>Description</h3>
                <p>{product.description}</p>
              </div>

              <div className="action-buttons">
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ProductDetails;
