import { Link } from 'react-router-dom';
import { Button } from '@/components/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/Card';
import { ImageWithFallback } from '@/components/ImageWithFallback';
import {
  QrCode,
  BarChart3,
  Users,
  Clock,
  Shield,
  Zap,
  ArrowRight,
  CheckCircle,
} from 'lucide-react';
// Header rendering handled by App layout

export default function LandingPage() {

  const features = [
    {
      icon: <QrCode className="icon-lg" />,
      title: 'Turnos por QR',
      description: 'Los clientes obtienen turnos escaneando un código QR, sin necesidad de apps.',
    },
    {
      icon: <Clock className="icon-lg" />,
      title: 'Gestión en Tiempo Real',
      description: 'Visualiza y administra todas tus colas de espera desde un panel unificado.',
    },
    {
      icon: <BarChart3 className="icon-lg" />,
      title: 'Analytics & KPIs',
      description: 'Obtén insights valiosos sobre la afluencia y optimiza tus recursos.',
    },
    {
      icon: <Users className="icon-lg" />,
      title: 'Multi-Usuario',
      description: 'Diferentes roles para administradores, empleados y clientes.',
    },
    {
      icon: <Shield className="icon-lg" />,
      title: 'Seguro y Privado',
      description: 'Autenticación JWT y cumplimiento de normativas de protección de datos.',
    },
    {
      icon: <Zap className="icon-lg" />,
      title: 'Rápido y Eficiente',
      description: 'Reduce tiempos de espera y mejora la experiencia de tus clientes.',
    },
  ];

  const benefits = [
    'Reduce los tiempos de espera percibidos',
    'Mejora la satisfacción del cliente',
    'Optimiza la asignación de recursos',
    'Analiza patrones de afluencia',
    'Gestiona eventos especiales',
    'Sin instalación de apps para clientes',
  ];

  return (
    <div className="landing-page">
      {/* header rendered by App layout */}
      <section className="hero-section">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <h1 className="hero-title">
                Gestiona tus colas
                <br />
                de forma <span className="text-accent">inteligente</span>
              </h1>

              <p className="hero-description">
                SmartLining es la plataforma de gestión de colas virtuales con Business Intelligence
                que revolucionará la atención al cliente en tu negocio.
              </p>

              <div className="hero-buttons">
                <Button asChild className="btn btn-primary btn-lg">
                  <Link to="/login">
                    Comenzar Ahora
                    <ArrowRight className="icon-sm ml-2" />
                  </Link>
                </Button>

                <Button asChild className="btn btn-outline btn-lg btn-black">
                  <a href="#features">Ver Funcionalidades</a>
                </Button>
              </div>
            </div>

            <div className="hero-image-wrapper">
              <div className="hero-image-glow"></div>
              <ImageWithFallback
                src="/assets/smartLiningPortada.jpeg"
                alt="Gestión moderna de colas"
                className="hero-image"
              />
            </div>
          </div>
        </div>
      </section>
      {/* FEATURES */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              Funcionalidades <span className="text-accent">Destacadas</span>
            </h2>
            <p className="section-description">
              Todo lo que necesitas para gestionar colas virtuales de manera profesional
            </p>
          </div>

          <div className="features-grid">
            {features.map((feature, index) => (
              <Card key={index} className="feature-card">
                <CardHeader className="black-border">
                  <div className="feature-icon">{feature.icon}</div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section className="how-section">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">
              ¿Cómo <span className="text-accent">Funciona?</span>
            </h2>
            <p className="section-description">Un sistema simple pero potente en tres pasos</p>
          </div>

          <div className="how-grid">
            <Card className="how-card how-card-yellow">
              <CardHeader>
                <div className="step-circle step-yellow">1</div>
                <CardTitle>Cliente Escanea QR</CardTitle>
                <CardContent>
                  <ImageWithFallback
                    src="/assets/QR AMARILLO.png"
                    alt="Escanear código QR"
                    className="how-image"
                  />
                  <p>
                    El cliente escanea el código QR en tu negocio y obtiene su turno
                    automáticamente.
                  </p>
                </CardContent>
              </CardHeader>
            </Card>

            <Card className="how-card how-card-dark">
              <CardHeader>
                <div className="step-circle step-accent">2</div>
                <CardTitle>Gestión en Tiempo Real</CardTitle>
                <CardContent>
                  <ImageWithFallback
                    src="/assets/charts.jpeg"
                    alt="Panel de control"
                    className="how-image"
                  />
                  <p>
                    Los empleados gestionan la cola desde su panel, llamando turnos y actualizando
                    estados.
                  </p>
                </CardContent>
              </CardHeader>
            </Card>

            <Card className="how-card how-card-orange">
              <CardHeader>
                <div className="step-circle step-dark">3</div>
                <CardTitle>Análisis y Mejora</CardTitle>
                <CardContent>
                  <div className="how-chart-box">
                    <BarChart3 height={128} width={128} className="icon-xl text-accent" />
                  </div>
                  <p>
                    Analiza métricas clave y optimiza la experiencia de tus clientes con insights en
                    tiempo real.
                  </p>
                </CardContent>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>
      {/* BENEFITS */}
      <section className="benefits-section">
        <div className="container">
          <div className="benefits-grid">
            <div>
              <h2 className="section-title">
                Beneficios para tu <span className="text-accent">Negocio</span>
              </h2>

              <p className="section-description">
                SmartLining no solo gestiona colas, transforma la experiencia de atención al cliente
              </p>

              <div className="benefits-list">
                {benefits.map((benefit, index) => (
                  <div key={index} className="benefit-item">
                    <CheckCircle className="icon-sm text-accent" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>

            <Card className="demo-card">
              <CardHeader className="text-center">
                <CardTitle style={{ fontSize: '2rem' }}>Prueba Demo</CardTitle>
                <CardDescription style={{ color: 'white' }}>
                  Accede con estas credenciales para probar el sistema
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="demo-admin demo-card">
                  <p>
                    <strong>Administrador</strong>
                  </p>
                  <p>Usuario: admin</p>
                  <p>Contraseña: password123</p>
                </div>

                <div className="demo-employee demo-card">
                  <p>
                    <strong>Empleado</strong>
                  </p>
                  <p>Usuario: employee1</p>
                  <p>Contraseña: password123</p>
                </div>

                <Button asChild className="btn btn-primary btn-full">
                  <Link to="/login">Acceder a la Demo</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* CTA */}
      <section className="cta-section">
        <div className="container text-center">
          <h2 className="cta-title">¿Listo para optimizar tu negocio?</h2>

          <p className="cta-description">
            Únete a SmartLining y lleva la gestión de colas de tu negocio al siguiente nivel
          </p>

          <Button asChild className="btn btn-dark btn-lg">
            <Link to="/login">
              Comenzar Gratis
              <ArrowRight className="icon-sm ml-2" />
            </Link>
          </Button>
        </div>
      </section>
      {/* FOOTER */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div>
              <div className="footer-brand">
                <img className="brand-logo" src="/assets/logo.jpg" alt="SmartLining" />
                <span className="footer-logo-text">
                  Smart<span className="text-accent">Lining</span>
                </span>
              </div>
              <p className="footer-description">
                La plataforma líder en gestión de colas virtuales con Business Intelligence
              </p>
            </div>

            <div>
              <h3 className="footer-title">Enlaces</h3>
              <ul className="footer-links">
                <li>
                  <Link to="/login">Iniciar Sesión</Link>
                </li>
                <li>
                  <Link to="/privacy">Política de Privacidad</Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="footer-title">Contacto</h3>
              <p className="footer-description">
                Para más información sobre SmartLining y cómo puede ayudar a tu negocio
              </p>
            </div>
          </div>

          <div className="footer-bottom">
            &copy; 2026 SmartLining. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}
