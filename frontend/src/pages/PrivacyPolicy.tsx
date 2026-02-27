import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/privacy.css';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="sl-page">
      <header className="sl-header">
        <div className="sl-header-inner">
          <button className="sl-btn-ghost" onClick={() => navigate(-1)} aria-label="Volver">
            ←
          </button>
          <div>
            <h1 className="sl-title">Política de Privacidad y Cookies</h1>
            <p className="sl-sub">SmartLining</p>
          </div>
        </div>
      </header>

      <main className="container sl-main">
        <section className="sl-card">
          <h2>Protección de Datos</h2>
          <p className="muted">Última actualización: 27 de febrero de 2026</p>
          <p>
            En <strong>SmartLining</strong>, nos tomamos muy en serio la privacidad y protección de tus datos. Este
            documento explica qué datos recogemos, cómo los utilizamos y cuáles son tus derechos.
          </p>
          <div className="sl-note">
            <strong>Importante:</strong> Esta es una aplicación de demostración con datos simulados (mock). En
            producción se aplicarían medidas adicionales de seguridad y cumplimiento.
          </div>
        </section>

        <section className="sl-card">
          <h3>Política de Cookies</h3>
          <p>SmartLining utiliza cookies estrictamente necesarias para el correcto funcionamiento del servicio:</p>
          <ul>
            <li>
              <strong>smartlining_turn:</strong> Cookie temporal que identifica tu turno en la cola. Se elimina
              automáticamente al completar el turno o tras 24 horas.
            </li>
          </ul>
        </section>

        <section className="sl-card">
          <h3>Protección de Datos Personales</h3>
          <p>Para el servicio de cola virtual, recogemos:</p>
          <ul>
            <li>Identificador de turno</li>
            <li>Hora de entrada</li>
            <li>Tiempos de atención (agregados y anónimos)</li>
            <li>Valoración (opcional)</li>
          </ul>
        </section>

        <section className="sl-card">
          <h3>Medidas de seguridad</h3>
          <ol>
            <li>Autenticación segura para empleados</li>
            <li>Cifrado de contraseñas (bcrypt) en el backend</li>
            <li>Validación y saneamiento de entradas</li>
          </ol>
        </section>

        <section className="sl-card">
          <h3>Tus derechos</h3>
          <p>Acceso, rectificación, supresión, limitación, portabilidad y oposición (RGPD).</p>
        </section>

        <section className="sl-card">
          <h3>Contacto</h3>
          <div className="sl-note">
            <p>
              <strong>Email:</strong> privacidad@smartlining.com
            </p>
            <p>
              <strong>Responsable:</strong> Aitor Aridane Peña Sánchez
            </p>
          </div>
        </section>

        <div className="sl-actions">
          <button className="sl-btn-primary" onClick={() => navigate(-1)}>
            ← Volver
          </button>
        </div>
      </main>
    </div>
  );
}
