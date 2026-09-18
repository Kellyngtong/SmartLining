import React from 'react';
import { useNavigate } from 'react-router-dom';
import { UtensilsCrossed } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';
import '../styles/header.css';

/**
 * PrivateHeader component - shows user info and logout button when authenticated
 * This component is used in the main App layout and only renders if a user is logged in.
 */

const PrivateHeader: React.FC = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const rol = user?.rol;
  const isAdmin = rol === 'ADMINISTRADOR';

  // La cola restaurante estándar (Restaurante El Buen Sabor, ID 7 de la seed)
  const colaRestauranteId = 7;

  return (
    <header className="private-header">
      <div className="private-header-inner container">
        <div className="brand">
          <img className="brand-logo" src="/assets/logo.jpg" alt="SmartLining" />
          <span className="footer-logo-text">
            Smart
            <span className="text-accent" style={{ color: '#ffd700' }}>
              Lining
            </span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            className="header-link"
            onClick={() => navigate(`/restaurante/${isAdmin ? 'admin' : 'operador'}/${colaRestauranteId}`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: isAdmin ? 'rgba(255,215,0,0.15)' : 'rgba(255,215,0,0.1)',
              color: '#ffd700',
              border: '1px solid rgba(255,215,0,0.3)',
              borderRadius: 8,
              padding: '8px 14px',
              fontWeight: 600,
            }}
          >
            <UtensilsCrossed size={16} />
            Restaurante
          </button>
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
