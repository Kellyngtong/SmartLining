import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import '../styles/header.css';

const PrivateHeader: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="private-header">
      <div className="private-header-inner container">
        <div className="brand">
          <img className="brand-logo" src="/assets/logo.jpg" alt="SmartLining" />
          <div className="brand-title">SmartLining</div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: '#fff', marginRight: 8 }}>{user?.nombre}</div>
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default PrivateHeader;
export { PrivateHeader };
