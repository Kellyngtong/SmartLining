import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { UtensilsCrossed, CalendarDays, ArrowRight } from 'lucide-react';
import { apiClient } from '../services/api';
import '../styles/restaurant.css';

interface Restaurant {
  id_cola: number;
  nombre: string;
  descripcion: string | null;
  duracion_estimada_comida_min: number;
  empresa: { id_empresa: number; nombre: string };
}

const RestaurantHubPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedId = searchParams.get('cola');

  const [restaurantes, setRestaurantes] = useState<Restaurant[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(preselectedId ? parseInt(preselectedId, 10) : null);
  const [loading, setLoading] = useState(true);
  const accionesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = 'Restaurantes — SmartLining';
    return () => {
      document.title = 'SmartLining';
    };
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await apiClient.getPublicRestaurantes();
        const data = (res.data as Restaurant[]) || [];
        setRestaurantes(data);
        if (preselectedId) {
          const id = parseInt(preselectedId, 10);
          if (data.some(r => r.id_cola === id)) setSelectedId(id);
        } else if (data.length === 1) {
          // Con un solo restaurante no tiene sentido pedir que lo elija
          setSelectedId(data[0].id_cola);
        }
      } catch (e) {
        console.error('Error loading restaurants', e);
      } finally {
        setLoading(false);
      }
    };
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    load();
  }, [preselectedId]);

  const elegir = (id: number) => {
    setSelectedId(id);
    // Llevar la vista a las acciones (útil en móvil, donde quedan debajo)
    requestAnimationFrame(() => accionesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }));
  };

  const selected = restaurantes.find(r => r.id_cola === selectedId) || null;
  const unico = restaurantes.length === 1;

  if (loading) {
    return (
      <div className="restaurant-container">
        <div style={{ textAlign: 'center', padding: 60 }}>
          <span className="spinner-rest" />
        </div>
      </div>
    );
  }

  if (restaurantes.length === 0) {
    return (
      <div className="restaurant-container">
        <div className="restaurant-hero">
          <h1>SmartLining</h1>
          <p>No hay restaurantes disponibles en este momento.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="restaurant-container">
      <div className="restaurant-hero">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <UtensilsCrossed size={28} />
          {unico && selected ? selected.nombre : 'Elige tu restaurante'}
        </h1>
        <p>
          {unico
            ? 'Ponte en la cola o haz una reserva.'
            : 'Selecciona el restaurante para ponerte en la cola o hacer una reserva.'}
        </p>
      </div>

      {!unico && (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 32 }}>
        {restaurantes.map(r => (
          <div
            key={r.id_cola}
            role="button"
            tabIndex={0}
            aria-pressed={selectedId === r.id_cola}
            aria-label={`Seleccionar restaurante ${r.nombre}`}
            onClick={() => elegir(r.id_cola)}
            onKeyDown={e => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                elegir(r.id_cola);
              }
            }}
            style={{
              background: '#fff',
              border: `2px solid ${selectedId === r.id_cola ? 'var(--sl-yellow)' : 'var(--color-border)'}`,
              borderRadius: 14,
              padding: 20,
              cursor: 'pointer',
              boxShadow: selectedId === r.id_cola ? '0 4px 16px rgba(255,179,0,0.15)' : 'var(--shadow-soft)',
              transition: 'all 0.2s ease',
            }}
          >
            <h3 style={{ margin: '0 0 4px', fontSize: '1.15rem' }}>{r.nombre}</h3>
            {r.empresa && (
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--color-text-secondary)' }}>
                {r.empresa.nombre}
              </p>
            )}
            {r.descripcion && (
              <p style={{ margin: '8px 0 0', fontSize: '0.9rem', color: 'var(--color-text-secondary)' }}>
                {r.descripcion}
              </p>
            )}
          </div>
        ))}
      </div>
      )}

      {selected && (
        <div ref={accionesRef} style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          boxShadow: '0 10px 30px rgba(255,179,0,0.12)',
          textAlign: 'center',
        }}>
          <h2 style={{ margin: '0 0 4px' }}>{selected.nombre}</h2>
          <p style={{ color: 'var(--color-text-secondary)', margin: '0 0 28px' }}>
            ¿Qué te gustaría hacer?
          </p>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              className="btn-restaurant yellow"
              onClick={() => navigate(`/restaurante/cola/${selected.id_cola}`)}
              style={{ padding: '16px 32px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}
            >
              <ArrowRight size={20} />
              Entrar en la cola
            </button>
            <button
              className="btn-restaurant"
              onClick={() => navigate(`/restaurante/reserva/${selected.id_cola}`)}
              style={{ padding: '16px 32px', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: 10, minWidth: 220 }}
            >
              <CalendarDays size={20} />
              Reservar mesa
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantHubPage;
