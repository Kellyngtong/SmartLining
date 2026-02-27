import { Link } from 'react-router-dom';

export default function LandingPage() {
  const apiUrl = import.meta.env.VITE_API_URL ?? '/api';
  return (
    <div style={{ padding: 40, fontFamily: 'Inter, sans-serif' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ color: 'var(--sl-black)' }}>SmartLining</h1>
        <nav>
          <Link to="/login" style={{ marginRight: 12 }}>
            <button className="btn-primary">Admin</button>
          </Link>
          <Link to="/join-queue/1">
            <button className="btn-primary">Join Demo Queue</button>
          </Link>
        </nav>
      </header>

      <main style={{ marginTop: 36, maxWidth: 800 }}>
        <h2>Welcome to SmartLining</h2>
        <p>
          SmartLining is a lightweight virtual-queue management system. Scan the QR, join the queue,
          and see your ticket number and estimated wait time on your phone.
        </p>

        <section style={{ marginTop: 24 }}>
          <h3>Try the demo</h3>
          <p>
            Use the demo queue to create a ticket. This runs against your local backend API and
            demonstrates the Join Queue → Ticket Confirmation flow.
          </p>
          <Link to="/join-queue/1">
            <button className="btn-primary" style={{ borderRadius: 6 }}>Join Demo Queue</button>
          </Link>
        </section>
      </main>

      <footer
        style={{
          marginTop: 48,
          color: '#666',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <Link to="/privacy" style={{ marginLeft: 12 }}>
            Política de Privacidad
          </Link>
        </div>
      </footer>
    </div>
  );
}
