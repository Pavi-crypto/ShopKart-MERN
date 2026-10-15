import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getMyProfile } from '../services/api';

const Home = ({ user: propUser, setUser: propSetUser }) => {
  const [user, setUser] = useState(propUser || null);
  const [loading, setLoading] = useState(!propUser);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    // If user was already provided by ProtectedRoute, reuse it
    if (propUser) {
      setUser(propUser);
      setLoading(false);
      return;
    }

    const fetchUserData = async () => {
      try {
        const data = await getMyProfile();
        setUser(data);
        if (propSetUser) propSetUser(data);
      } catch (err) {
        setError('Session expired or unauthenticated. Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1000);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [propUser, propSetUser, navigate]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="home-container">
          <div className="loading-card">
            <div className="spinner"></div>
            <p>Loading your profile details...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !user) {
    return (
      <>
        <Navbar />
        <div className="home-container">
          <div className="alert alert-error">
            {error || 'Unable to authenticate user.'}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar user={user} setUser={setUser} />
      <div className="home-container">
        <div className="profile-card">
          <div className="welcome-banner">
            <h1>Welcome, {user.fullName}!</h1>
            <p>You have successfully authenticated into ShopKart.</p>
          </div>

          <div className="home-actions" style={{ marginBottom: '1.5rem', textAlign: 'center' }}>
            <Link to="/products" className="btn-primary" style={{ display: 'inline-block', textDecoration: 'none' }}>
              Browse Product Catalog &rarr;
            </Link>
          </div>

          <div className="profile-details">
            <h3>Customer Profile</h3>
            <div className="detail-item">
              <span className="detail-label">Full Name:</span>
              <span className="detail-value">{user.fullName}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Email Address:</span>
              <span className="detail-value">{user.email}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Phone Number:</span>
              <span className="detail-value">{user.phone}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Home;
