import { create } from 'zustand';
import { Cola, Turno } from '../models';
import { ColaMapper, TurnoMapper } from '../models/mappers';
import { apiClient } from '../services/api';

interface QueueStore {
  queues: Cola[];
  selectedQueue: Cola | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchQueues: () => Promise<void>;
  selectQueue: (queue: Cola) => void;
  clearError: () => void;
}

export const useQueueStore = create<QueueStore>(set => ({
  queues: [],
  selectedQueue: null,
  isLoading: false,
  error: null,

  fetchQueues: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getQueues();
      if (response.data) {
        const queues = Array.isArray(response.data)
          ? ColaMapper.toDomainArray(response.data as any[])
          : (response.data as any[]).map(q => ColaMapper.toDomain(q));

        set({
          queues,
          isLoading: false,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch queues';
      set({
        error: message,
        isLoading: false,
      });
    }
  },

  selectQueue: (queue: Cola) => {
    set({ selectedQueue: queue });
  },

  clearError: () => set({ error: null }),
}));

// Ticket Store
interface TicketStore {
  tickets: Turno[];
  selectedTicket: Turno | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchTickets: () => Promise<void>;
  selectTicket: (ticket: Turno) => void;
  createTicket: (data: { id_cola: number; id_cliente?: number; estado?: string }) => Promise<void>;
  clearError: () => void;
}

export const useTicketStore = create<TicketStore>(set => ({
  tickets: [],
  selectedTicket: null,
  isLoading: false,
  error: null,

  fetchTickets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getTickets();
      if (response.data) {
        const tickets = Array.isArray(response.data)
          ? TurnoMapper.toDomainArray(response.data as any[])
          : (response.data as any[]).map(t => TurnoMapper.toDomain(t));

        set({
          tickets,
          isLoading: false,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to fetch tickets';
      set({
        error: message,
        isLoading: false,
      });
    }
  },

  selectTicket: (ticket: Turno) => {
    set({ selectedTicket: ticket });
  },

  createTicket: async (data: { id_cola: number; id_cliente?: number; estado?: string }) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.createTicket(data);
      if (response.data) {
        const newTicket = TurnoMapper.toDomain(response.data as any);
        set(state => ({
          tickets: [...state.tickets, newTicket],
          selectedTicket: newTicket,
          isLoading: false,
        }));
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Failed to create ticket';
      set({
        error: message,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
