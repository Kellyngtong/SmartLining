import { create } from 'zustand';
import { Usuario } from '../models';
import { UsuarioMapper } from '../models/mappers';
import { apiClient } from '../services/api';

interface AuthStore {
  user: Usuario | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>(set => ({
  user: null,
  token: localStorage.getItem('authToken'),
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.login(email, password);

      if (response.data) {
        const token = (response.data as any).token;
        const rawUser = (response.data as any).user;

        // Map the response directly to Usuario domain
        const user = UsuarioMapper.toDomain({
          id_usuario: rawUser.id_usuario,
          nombre: rawUser.nombre,
          email: rawUser.email,
          rol: rawUser.rol,
          activo: rawUser.activo,
          fecha_creacion: rawUser.fecha_creacion,
        });

        localStorage.setItem('authToken', token);
        localStorage.setItem(
          'user',
          JSON.stringify({
            id_usuario: user.id_usuario,
            nombre: user.nombre,
            email: user.email,
            rol: user.rol,
            activo: user.activo,
            fecha_creacion: user.fecha_creacion.toISOString(),
          })
        );

        set({
          token,
          user,
          isLoading: false,
        });
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Login failed';
      set({
        error: message,
        isLoading: false,
      });
      throw error;
    }
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    set({
      user: null,
      token: null,
      error: null,
    });
  },

  restoreSession: async () => {
    const token = localStorage.getItem('authToken');
    const userStr = localStorage.getItem('user');

    if (token && userStr) {
      try {
        const userData = JSON.parse(userStr) as any;
        const user = UsuarioMapper.toDomain(userData);
        set({ token, user });

        // Validar token con el servidor
        await apiClient.getMe();
      } catch {
        // Token inválido
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        set({ user: null, token: null });
      }
    }
  },

  clearError: () => set({ error: null }),
}));
