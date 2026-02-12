export function NotFoundPage() {
  return (
    <div style={styles.container}>
      <h1>404</h1>
      <p>Página no encontrada</p>
      <a href="/" style={styles.link}>
        Volver al inicio
      </a>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    gap: '16px',
  },
  link: {
    color: '#007bff',
    textDecoration: 'none',
  },
};
