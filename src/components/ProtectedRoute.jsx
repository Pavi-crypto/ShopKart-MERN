import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getMyProfile } from '../services/api';
import { useCart } from '../context/CartContext';

const ProtectedRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const { fetchCart, clearCart } = useCart();

  useEffect(() => {
    let isMounted = true;

    const verifyAuth = async () => {
      try {
        const userData = await getMyProfile();
        if (!isMounted) return;

        setUser(userData);
        setIsAuthenticated(true);

        // Fetch cart once user is authenticated
        try {
          await fetchCart();
        } catch (_) {
          // Handled inside CartContext
        }
      } catch (err) {
        if (!isMounted) return;
        setUser(null);
        setIsAuthenticated(false);
        clearCart();
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    verifyAuth();

    return () => {
      isMounted = false;
    };
  }, []); // Run authentication check once on mount

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return React.isValidElement(children)
    ? React.cloneElement(children, { user, setUser })
    : children;
};

export default ProtectedRoute;
