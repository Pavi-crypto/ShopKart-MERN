import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logoutCustomer } from '../services/api';
import { useCart } from '../context/CartContext';

const Navbar = ({ user, setUser }) => {
  const navigate = useNavigate();
  const { totalUnits, clearCart } = useCart();

  const handleLogout = async () => {
    try {
      await logoutCustomer();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearCart();
      if (setUser) setUser(null);
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to={user ? '/home' : '/login'} className="nav-brand">
          ShopKart
        </Link>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/home" className="nav-link">Home</Link>
              <Link to="/products" className="nav-link">Products</Link>
              <Link to="/wishlist" className="nav-link">Wishlist</Link>
              <Link to="/cart" className="nav-link">Cart ({totalUnits})</Link>
              <Link to="/orders" className="nav-link">Orders</Link>
              <span className="user-greeting">Hi, {user.fullName}</span>
              <button onClick={handleLogout} className="btn-logout">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link btn-nav-register">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
