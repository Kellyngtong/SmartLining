import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
import { ApiResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private instance: AxiosInstance;

  constructor() {
    this.instance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Interceptor para agregar token de autenticación
    this.instance.interceptors.request.use(
      config => {
        const token = localStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => Promise.reject(error)
    );

    // Interceptor para manejar errores de respuesta
    this.instance.interceptors.response.use(
      response => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Token expirado o inválido
          localStorage.removeItem('authToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  // Métodos genéricos
  async get<T>(url: string): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.instance.get(url);
    return response.data;
  }

  async post<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.instance.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.instance.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.instance.delete(url);
    return response.data;
  }

  async patch<T>(url: string, data?: unknown): Promise<ApiResponse<T>> {
    const response: AxiosResponse<ApiResponse<T>> = await this.instance.patch(url, data);
    return response.data;
  }

  // Auth endpoints
  async login(email: string, password: string) {
    return this.post('/auth/login', { email, password });
  }

  async getMe() {
    return this.get('/auth/me');
  }

  // Queue endpoints
  async getQueues(page = 1, limit = 10) {
    return this.get(`/colas?page=${page}&limit=${limit}`);
  }

  async getActiveQueues(page = 1, limit = 10) {
    return this.get(`/colas/activas?page=${page}&limit=${limit}`);
  }

  async getQueueById(id: number) {
    return this.get(`/colas/${id}`);
  }

  async getQueueInfo(queueId: number, ticketId?: number) {
    const url = ticketId ? `/queue-info/${queueId}?turnoId=${ticketId}` : `/queue-info/${queueId}`;
    return this.get(url);
  }

  async createQueue(nombre: string, descripcion?: string, activa = true) {
    return this.post('/colas', { nombre, descripcion, activa });
  }

  async updateQueue(id: number, nombre?: string, descripcion?: string, activa?: boolean) {
    return this.patch(`/colas/${id}`, { nombre, descripcion, activa });
  }

  async deleteQueue(id: number) {
    return this.delete(`/colas/${id}`);
  }

  async getQueueTickets(id: number, page = 1, limit = 10) {
    return this.get(`/colas/${id}/turnos?page=${page}&limit=${limit}`);
  }

  // Ticket endpoints
  async getTickets(page = 1, limit = 10, estado?: string, colaId?: number) {
    let url = `/turnos?page=${page}&limit=${limit}`;
    if (estado) url += `&estado=${estado}`;
    if (colaId) url += `&colaId=${colaId}`;
    return this.get(url);
  }

  async getTicketById(id: number) {
    return this.get(`/turnos/${id}`);
  }

  async createTicket(data: { id_cola: number; id_cliente?: number; estado?: string }) {
    return this.post('/turnos', data);
  }

  async updateTicket(id: number, estado?: string, timestamps?: any) {
    return this.patch(`/turnos/${id}`, { estado, ...timestamps });
  }

  async deleteTicket(id: number) {
    return this.delete(`/turnos/${id}`);
  }

  async getClientTickets(clienteId: number, page = 1, limit = 10) {
    return this.get(`/turnos/cliente/${clienteId}?page=${page}&limit=${limit}`);
  }

  // User endpoints
  async getUsuarios(page = 1, limit = 10) {
    return this.get(`/usuarios?page=${page}&limit=${limit}`);
  }

  async getUsuarioById(id: number) {
    return this.get(`/usuarios/${id}`);
  }

  async getUsuarioByEmail(email: string) {
    return this.get(`/usuarios/email/${email}`);
  }

  async updateUsuario(id: number, nombre?: string, activo?: boolean) {
    return this.patch(`/usuarios/${id}`, { nombre, activo });
  }

  // Event endpoints
  async getEventos(page = 1, limit = 10) {
    return this.get(`/eventos?page=${page}&limit=${limit}`);
  }

  async getEventoById(id: number) {
    return this.get(`/eventos/${id}`);
  }

  async createEvento(
    tipo: string,
    nombre: string,
    descripcion?: string,
    fecha_inicio?: string,
    fecha_fin?: string
  ) {
    return this.post('/eventos', { tipo, nombre, descripcion, fecha_inicio, fecha_fin });
  }

  async updateEvento(
    id: number,
    nombre?: string,
    descripcion?: string,
    fecha_inicio?: string,
    fecha_fin?: string
  ) {
    return this.patch(`/eventos/${id}`, { nombre, descripcion, fecha_inicio, fecha_fin });
  }

  async deleteEvento(id: number) {
    return this.delete(`/eventos/${id}`);
  }

  // Queue schedule endpoints
  async getHorariosCola(colaId: number) {
    return this.get(`/horarios-cola/${colaId}`);
  }

  async createHorarioCola(
    colaId: number,
    dia_semana: string,
    hora_inicio: string,
    hora_fin: string
  ) {
    return this.post(`/horarios-cola/${colaId}`, { dia_semana, hora_inicio, hora_fin });
  }

  async updateHorarioCola(id: number, hora_inicio?: string, hora_fin?: string) {
    return this.patch(`/horarios-cola/${id}`, { hora_inicio, hora_fin });
  }

  async deleteHorarioCola(id: number) {
    return this.delete(`/horarios-cola/${id}`);
  }

  // Attention/Service endpoints
  async createAtencion(id_turno: number, id_empleado: number, resultado: string) {
    return this.post('/atenciones', { id_turno, id_empleado, resultado });
  }

  async getAtencionById(id: number) {
    return this.get(`/atenciones/${id}`);
  }

  async updateAtencion(id: number, duracion_atencion?: number, resultado?: string) {
    return this.patch(`/atenciones/${id}`, { duracion_atencion, resultado });
  }

  // Rating endpoints
  async createValoracion(id_turno: number, puntuacion: number, comentario?: string) {
    return this.post('/valoraciones', { id_turno, puntuacion, comentario });
  }

  async getValoraciones(page = 1, limit = 10) {
    return this.get(`/valoraciones?page=${page}&limit=${limit}`);
  }

  async getValoracionByTurno(turnoId: number) {
    return this.get(`/valoraciones/turno/${turnoId}`);
  }

  async getValoracionById(id: number) {
    return this.get(`/valoraciones/${id}`);
  }

  async updateValoracion(id: number, puntuacion?: number, comentario?: string) {
    return this.patch(`/valoraciones/${id}`, { puntuacion, comentario });
  }

  async deleteValoracion(id: number) {
    return this.delete(`/valoraciones/${id}`);
  }

  // Client endpoints
  async createCliente(data: { nombre: string; email?: string }) {
    return this.post('/clientes', data);
  }

  async getClienteById(id: number) {
    return this.get(`/clientes/${id}`);
  }

  // Health check
  async health() {
    return this.get('/health');
  }
}

export const apiClient = new ApiClient();
