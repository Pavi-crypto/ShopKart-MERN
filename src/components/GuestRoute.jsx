import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getMyProfile } from '../services/api';

const GuestRoute = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    getMyProfile()
      .then(() => {
        if (isMounted) {
          setIsAuthenticated(true);
          setLoading(false);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAuthenticated(false);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="home-container">
        <div className="loading-card">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/home" replace />;
  }

  return children;
};

export default GuestRoute;
