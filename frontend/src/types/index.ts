// User types
export interface Usuario {
  id: string;
  email: string;
  nombre: string;
  rol: 'ADMINISTRADOR' | 'EMPLEADO';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: Usuario;
}

// Queue types
export interface Cola {
  id_cola: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
}

// Ticket types
export interface Turno {
  id_turno: number;
  id_cola: number;
  id_cliente: number;
  numero_turno: number;
  estado: 'EN_ESPERA' | 'EN_ATENCION' | 'FINALIZADO' | 'CANCELADO';
  fecha_hora_creacion: string;
  fecha_hora_llamada?: string;
  fecha_hora_inicio_atencion?: string;
  fecha_hora_fin_atencion?: string;
}

// API Response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
