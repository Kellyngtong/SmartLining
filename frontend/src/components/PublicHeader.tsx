import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/header.css';

export default function PublicHeader() {
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
          <Link to="/login" className="logout-btn" style={{ textDecoration: 'none' }}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}
