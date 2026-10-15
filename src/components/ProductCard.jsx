import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { addToWishlist, removeFromWishlist } from '../services/api';
import { useCart } from '../context/CartContext';

const ProductCard = ({ product, isWishlisted = false, onToggleWishlist }) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [loadingCartAction, setLoadingCartAction] = useState(false);
  const [cartError, setCartError] = useState('');

  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();

  if (!product) return null;

  // Find if this product is currently in the cart and retrieve its quantity
  const cartItem = cartItems.find((item) => {
    const itemProdId = item.product?._id
      ? item.product._id.toString()
      : item.product?.toString();
    const targetProdId = product._id
      ? product._id.toString()
      : product.toString();
    return itemProdId === targetProdId;
  });

  const currentQuantity = cartItem ? cartItem.quantity : 0;

  const handleToggle = async () => {
    if (loading) return; // Prevent repeated clicks while current API request is running

    setLoading(true);
    setErrorMessage('');

    try {
      if (onToggleWishlist) {
        await onToggleWishlist(product._id);
      } else {
        if (isWishlisted) {
          await removeFromWishlist(product._id);
        } else {
          await addToWishlist(product._id);
        }
      }
    } catch (err) {
      setErrorMessage(
        isWishlisted
          ? 'Unable to remove from wishlist. Please try again.'
          : 'Unable to add to wishlist. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (loadingCartAction || product.stock <= 0) return;

    setLoadingCartAction(true);
    setCartError('');

    try {
      await addToCart(product._id);
    } catch (err) {
      if (err.response?.status === 401) {
        setCartError('Please log in to add items to cart.');
      } else {
        setCartError(
          err.response?.data?.message || 'Unable to add to cart. Please try again.'
        );
      }
    } finally {
      setLoadingCartAction(false);
    }
  };

  const handleIncrease = async () => {
    if (loadingCartAction) return;

    if (currentQuantity >= product.stock) {
      setCartError('Cannot exceed available stock.');
      return;
    }

    setLoadingCartAction(true);
    setCartError('');

    try {
      await updateQuantity(product._id, currentQuantity + 1);
    } catch (err) {
      setCartError(
        err.response?.data?.message || 'Failed to update quantity. Please try again.'
      );
    } finally {
      setLoadingCartAction(false);
    }
  };

  const handleDecrease = async () => {
    if (loadingCartAction) return;

    setLoadingCartAction(true);
    setCartError('');

    try {
      if (currentQuantity <= 1) {
        // When quantity reaches 0, remove product from cart and display Add to Cart again
        await removeFromCart(product._id);
      } else {
        await updateQuantity(product._id, currentQuantity - 1);
      }
    } catch (err) {
      setCartError(
        err.response?.data?.message || 'Failed to update quantity. Please try again.'
      );
    } finally {
      setLoadingCartAction(false);
    }
  };

  const getButtonText = () => {
    if (loading) {
      return isWishlisted ? '⏳ Removing...' : '⏳ Adding...';
    }
    return isWishlisted ? '♥ In Wishlist' : '♡ Add to Wishlist';
  };

  return (
    <div className="product-card">
      <div className="product-image-wrapper">
        <img
          src={product.image}
          alt={product.name}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src =
              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80';
          }}
        />
        <span className="category-badge">{product.category}</span>
      </div>
      <div className="product-card-body">
        <h3 className="product-name">{product.name}</h3>
        <p className="product-category-text">{product.category}</p>
        <p className="product-price">₹{product.price.toLocaleString()}</p>
        <p className={`stock-status ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}`}>
          {product.stock > 0 ? `${product.stock} units left` : 'Out of Stock'}
        </p>

        <div className="card-actions">
          {currentQuantity > 0 ? (
            <div className="card-qty-selector">
              <button
                type="button"
                className="btn-qty btn-qty-minus"
                onClick={handleDecrease}
                disabled={loadingCartAction}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="card-qty-value">
                {currentQuantity}
              </span>
              <button
                type="button"
                className="btn-qty btn-qty-plus"
                onClick={handleIncrease}
                disabled={loadingCartAction || currentQuantity >= product.stock}
                aria-label="Increase quantity"
                title={currentQuantity >= product.stock ? 'Maximum stock reached' : 'Increase quantity'}
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-add-cart"
              onClick={handleAddToCart}
              disabled={loadingCartAction || product.stock <= 0}
            >
              {loadingCartAction
                ? 'Adding...'
                : product.stock <= 0
                ? 'Out of Stock'
                : 'Add to Cart'}
            </button>
          )}

          <Link to={`/products/${product._id}`} className="btn-details">
            View Details
          </Link>

          <button
            type="button"
            className={`btn-wishlist ${isWishlisted ? 'added' : ''}`}
            onClick={handleToggle}
            disabled={loading}
          >
            {getButtonText()}
          </button>

          {cartError && (
            <p className="card-error-text">{cartError}</p>
          )}

          {errorMessage && (
            <p className="card-error-text">{errorMessage}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
