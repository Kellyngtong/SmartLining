import { create } from 'zustand';
import { Mesa } from '../models';
import { MesaMapper } from '../models/mappers';
import { apiClient } from '../services/api';
import { Zona, Reserva, WaitlistEntry, MesaZona, DashboardSala } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export interface TurnoEspera {
  id_turno: number;
  numero_turno: number;
  num_comensales: number | null;
  categoria: string | null;
  cliente_nombre?: string;
  fecha_hora_creacion: string;
  posicion: number;
  eta_minutos: number;
}

export interface TurnoAtencion {
  id_turno: number;
  numero_turno: number;
  num_comensales?: number | null;
  cliente?: { nombre?: string };
  mesa?: { numero?: number; capacidad?: number };
}

export interface RestaurantStats {
  totalMesas: number;
  mesasLibres: number;
  mesasOcupadas: number;
  turnosEnEspera: number;
  turnosEnAtencion: number;
  maxCapacidadRestaurante: number;
}

interface RestaurantStore {
  mesas: Mesa[];
  turnosEspera: TurnoEspera[];
  turnosAtencion: TurnoAtencion[];
  stats: RestaurantStats | null;
  colaId: number | null;
  isLoading: boolean;
  error: string | null;

  zonas: Zona[];
  mesasSinZona: MesaZona[];
  reservas: Reserva[];
  waitlist: WaitlistEntry[];
  dashboard: DashboardSala | null;
  reservasFecha: string;
  salaLoading: boolean;

  fetchCola: (colaId: number) => Promise<void>;
  fetchSala: (colaId: number, fecha?: string) => Promise<void>;
  fetchZonas: (colaId: number) => Promise<void>;
  fetchReservas: (colaId: number, fecha?: string) => Promise<void>;
  fetchWaitlist: (colaId: number) => Promise<void>;
  fetchDashboard: (colaId: number) => Promise<void>;
  initSse: (colaId: number) => () => void;
  crearMesa: (data: { numero: number; capacidad: number }) => Promise<boolean>;
  editarMesa: (id: number, data: { numero?: number; capacidad?: number; estado?: string }) => Promise<boolean>;
  borrarMesa: (id: number) => Promise<boolean>;
  asignarManual: (mesaId: number, turnoId: number) => Promise<boolean>;
  liberarMesa: (mesaId: number, restablecer?: boolean) => Promise<boolean>;
  juntarMesas: (mesaIds: number[]) => Promise<boolean>;
  separarMesa: (mesaId: number) => Promise<boolean>;
  anadirSilla: (mesaId: number, cantidad?: number) => Promise<boolean>;
  quitarSilla: (mesaId: number, cantidad?: number) => Promise<boolean>;
  crearZona: (data: { nombre: string; tipo?: string; orden?: number; activa?: boolean }) => Promise<boolean>;
  editarZona: (id: number, data: { nombre?: string; tipo?: string; orden?: number; activa?: boolean }) => Promise<boolean>;
  borrarZona: (id: number) => Promise<boolean>;
  asignarMesasZona: (id: number, mesa_ids: number[]) => Promise<boolean>;
  crearReserva: (data: Record<string, unknown>) => Promise<boolean>;
  editarReserva: (id: number, data: Record<string, unknown>) => Promise<boolean>;
  cambiarEstadoReserva: (id: number, estado: string) => Promise<boolean>;
  borrarReserva: (id: number) => Promise<boolean>;
  crearWaitlist: (data: Record<string, unknown>) => Promise<boolean>;
  editarWaitlist: (id: number, data: Record<string, unknown>) => Promise<boolean>;
  cambiarEstadoWaitlist: (id: number, estado: string) => Promise<boolean>;
  borrarWaitlist: (id: number) => Promise<boolean>;
  clearError: () => void;
}

export const useRestaurantStore = create<RestaurantStore>(set => ({
  mesas: [],
  turnosEspera: [],
  turnosAtencion: [],
  stats: null,
  colaId: null,
  isLoading: false,
  error: null,

  zonas: [],
  mesasSinZona: [],
  reservas: [],
  waitlist: [],
  dashboard: null,
  reservasFecha: '',
  salaLoading: false,

  fetchCola: async (colaId: number) => {
    set({ isLoading: true, error: null, colaId });
    try {
      const response = await apiClient.getColaRestaurante(colaId);
      const data = response.data as any;
      if (data) {
        set({
          mesas: MesaMapper.toDomainArray(data.mesas || []),
          turnosEspera: data.turnosEspera || [],
          turnosAtencion: data.turnosAtencion || [],
          stats: data.stats || null,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch restaurant queue';
      set({ error: message, isLoading: false });
    }
  },

  fetchZonas: async (colaId: number) => {
    try {
      const response = await apiClient.getZonasByCola(colaId);
      const data = response.data as any;
      if (data) {
        set({ zonas: data.zonas || [], mesasSinZona: data.mesasSinZona || [] });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch zonas';
      set({ error: message });
    }
  },

  fetchReservas: async (colaId: number, fecha?: string) => {
    try {
      const response = await apiClient.getReservas(colaId, { fecha });
      const data = response.data as any;
      if (data) {
        set({ reservas: data || [], reservasFecha: fecha || '' });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch reservas';
      set({ error: message });
    }
  },

  fetchWaitlist: async (colaId: number) => {
    try {
      const response = await apiClient.getWaitlist(colaId, { activas: true });
      const data = response.data as any;
      if (data) set({ waitlist: data || [] });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch waitlist';
      set({ error: message });
    }
  },

  fetchDashboard: async (colaId: number) => {
    try {
      const response = await apiClient.getDashboardSala(colaId);
      const data = response.data as any;
      if (data) set({ dashboard: data });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch dashboard';
      set({ error: message });
    }
  },

  fetchSala: async (colaId: number, fecha?: string) => {
    set({ salaLoading: true, colaId });
    await Promise.all([
      useRestaurantStore.getState().fetchCola(colaId),
      useRestaurantStore.getState().fetchZonas(colaId),
      useRestaurantStore.getState().fetchReservas(colaId, fecha),
      useRestaurantStore.getState().fetchWaitlist(colaId),
      useRestaurantStore.getState().fetchDashboard(colaId),
    ]);
    set({ salaLoading: false });
  },

  initSse: (colaId: number) => {
    const es = new EventSource(`${API_BASE_URL}/events?queueId=${colaId}`);
    const refresh = () => {
      useRestaurantStore.getState().fetchSala(colaId);
    };
    const eventos = [
      'RESERVA_CREADA',
      'RESERVA_ASIGNADA',
      'RESERVA_ESTADO',
      'RESERVA_ELIMINADA',
      'WAITLIST_ACTUALIZADA',
      'ZONA_ELIMINADA',
      'ZONA_MESAS',
      'MESA_ASIGNADA',
      'MESA_LIBERADA',
      'MESA_ESTADO',
      'MESA_ELIMINADA',
      'COLA_RESTAURANTE_ACTUALIZADA',
      'queueUpdate',
    ];
    eventos.forEach(e => es.addEventListener(e, refresh));
    return () => es.close();
  },

  crearMesa: async (data: { numero: number; capacidad: number }) => {
    set({ error: null });
    try {
      const colaId = useRestaurantStore.getState().colaId;
      if (!colaId) {
        set({ error: 'No se ha seleccionado la cola del restaurante' });
        return false;
      }
      const response = await apiClient.createMesa({ ...data, id_cola: colaId });
      if (response.data) {
        const newMesa = MesaMapper.toDomain(response.data as any);
        set(state => ({ mesas: [...state.mesas, newMesa] }));
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create mesa';
      set({ error: message });
      return false;
    }
  },

  editarMesa: async (id: number, data: { numero?: number; capacidad?: number; estado?: string }) => {
    set({ error: null });
    try {
      const response = await apiClient.updateMesa(id, data);
      if (response.data) {
        const updated = MesaMapper.toDomain(response.data as any);
        set(state => ({
          mesas: state.mesas.map(m => (m.id_mesa === id ? updated : m)),
        }));
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to update mesa';
      set({ error: message });
      return false;
    }
  },

  borrarMesa: async (id: number) => {
    set({ error: null });
    try {
      const response = await apiClient.deleteMesa(id);
      if (response.success) {
        set(state => ({ mesas: state.mesas.filter(m => m.id_mesa !== id) }));
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to delete mesa';
      set({ error: message });
      return false;
    }
  },

  asignarManual: async (mesaId: number, turnoId: number) => {
    set({ error: null });
    try {
      const response = await apiClient.asignarMesa(mesaId, turnoId);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          await useRestaurantStore.getState().fetchCola(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to assign mesa';
      set({ error: message });
      return false;
    }
  },

  liberarMesa: async (mesaId: number, restablecer = true) => {
    set({ error: null });
    try {
      const response = await apiClient.liberarMesa(mesaId, restablecer);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          await useRestaurantStore.getState().fetchCola(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to free mesa';
      set({ error: message });
      return false;
    }
  },

  juntarMesas: async (mesaIds: number[]) => {
    set({ error: null });
    try {
      const colaId = useRestaurantStore.getState().colaId;
      if (!colaId || mesaIds.length < 2) {
        set({ error: 'Se necesitan al menos 2 mesas para juntar' });
        return false;
      }
      const response = await apiClient.juntarMesas(colaId, mesaIds);
      if (response.success) {
        await useRestaurantStore.getState().fetchCola(colaId);
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to join mesas';
      set({ error: message });
      return false;
    }
  },

  separarMesa: async (mesaId: number) => {
    set({ error: null });
    try {
      const response = await apiClient.separarMesas(mesaId);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          await useRestaurantStore.getState().fetchCola(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to split mesas';
      set({ error: message });
      return false;
    }
  },

  anadirSilla: async (mesaId: number, cantidad = 1) => {
    set({ error: null });
    try {
      const response = await apiClient.addSilla(mesaId, cantidad);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          await useRestaurantStore.getState().fetchCola(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to add silla';
      set({ error: message });
      return false;
    }
  },

  quitarSilla: async (mesaId: number, cantidad = 1) => {
    set({ error: null });
    try {
      const response = await apiClient.removeSilla(mesaId, cantidad);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          await useRestaurantStore.getState().fetchCola(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to remove silla';
      set({ error: message });
      return false;
    }
  },

  clearError: () => set({ error: null }),

  // ========================================
  // Zonas
  // ========================================
  crearZona: async (data: { nombre: string; tipo?: string; orden?: number; activa?: boolean }) => {
    set({ error: null });
    const colaId = useRestaurantStore.getState().colaId;
    if (!colaId) {
      set({ error: 'No se ha seleccionado la cola del restaurante' });
      return false;
    }
    try {
      const response = await apiClient.createZona({ id_cola: colaId, ...data });
      if (response.success) {
        await useRestaurantStore.getState().fetchZonas(colaId);
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to create zona' });
      return false;
    }
  },

  editarZona: async (id: number, data: { nombre?: string; tipo?: string; orden?: number; activa?: boolean }) => {
    set({ error: null });
    try {
      const response = await apiClient.updateZona(id, data);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) await useRestaurantStore.getState().fetchZonas(colaId);
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to update zona' });
      return false;
    }
  },

  borrarZona: async (id: number) => {
    set({ error: null });
    try {
      const response = await apiClient.deleteZona(id);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) await useRestaurantStore.getState().fetchZonas(colaId);
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete zona' });
      return false;
    }
  },

  asignarMesasZona: async (id: number, mesa_ids: number[]) => {
    set({ error: null });
    try {
      const response = await apiClient.asignarMesasZona(id, mesa_ids);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) await useRestaurantStore.getState().fetchZonas(colaId);
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to assign mesas to zona' });
      return false;
    }
  },

  // ========================================
  // Reservas
  // ========================================
  crearReserva: async (data: Record<string, unknown>) => {
    set({ error: null });
    try {
      const response = await apiClient.createReserva(data);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          const fecha = (data.fecha as string) || useRestaurantStore.getState().reservasFecha;
          await useRestaurantStore.getState().fetchReservas(colaId, fecha);
          await useRestaurantStore.getState().fetchDashboard(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to create reserva' });
      return false;
    }
  },

  editarReserva: async (id: number, data: Record<string, unknown>) => {
    set({ error: null });
    try {
      const response = await apiClient.updateReserva(id, data);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) await useRestaurantStore.getState().fetchReservas(colaId, useRestaurantStore.getState().reservasFecha || undefined);
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to update reserva' });
      return false;
    }
  },

  cambiarEstadoReserva: async (id: number, estado: string) => {
    set({ error: null });
    try {
      const response = await apiClient.updateReservaEstado(id, estado);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          await useRestaurantStore.getState().fetchReservas(colaId, useRestaurantStore.getState().reservasFecha || undefined);
          await useRestaurantStore.getState().fetchDashboard(colaId);
          await useRestaurantStore.getState().fetchCola(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to update reserva estado' });
      return false;
    }
  },

  borrarReserva: async (id: number) => {
    set({ error: null });
    try {
      const response = await apiClient.deleteReserva(id);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) await useRestaurantStore.getState().fetchReservas(colaId, useRestaurantStore.getState().reservasFecha || undefined);
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete reserva' });
      return false;
    }
  },

  // ========================================
  // Waitlist
  // ========================================
  crearWaitlist: async (data: Record<string, unknown>) => {
    set({ error: null });
    try {
      const response = await apiClient.createWaitlist(data);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          await useRestaurantStore.getState().fetchWaitlist(colaId);
          await useRestaurantStore.getState().fetchDashboard(colaId);
          await useRestaurantStore.getState().fetchCola(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to create waitlist entry' });
      return false;
    }
  },

  editarWaitlist: async (id: number, data: Record<string, unknown>) => {
    set({ error: null });
    try {
      const response = await apiClient.updateWaitlist(id, data);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) await useRestaurantStore.getState().fetchWaitlist(colaId);
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to update waitlist entry' });
      return false;
    }
  },

  cambiarEstadoWaitlist: async (id: number, estado: string) => {
    set({ error: null });
    try {
      const response = await apiClient.updateWaitlistEstado(id, estado);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) {
          await useRestaurantStore.getState().fetchWaitlist(colaId);
          await useRestaurantStore.getState().fetchDashboard(colaId);
          await useRestaurantStore.getState().fetchCola(colaId);
        }
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to update waitlist estado' });
      return false;
    }
  },

  borrarWaitlist: async (id: number) => {
    set({ error: null });
    try {
      const response = await apiClient.deleteWaitlist(id);
      if (response.success) {
        const colaId = useRestaurantStore.getState().colaId;
        if (colaId) await useRestaurantStore.getState().fetchWaitlist(colaId);
        return true;
      }
      return false;
    } catch (error: unknown) {
      set({ error: error instanceof Error ? error.message : 'Failed to delete waitlist entry' });
      return false;
    }
  },
}));
