export interface LoginRequestDTO {
  email: string;
  password: string;
}

export interface CreateTurnoRequestDTO {
  id_cola: number;
  id_cliente: number;
}

export interface CreateValoracionRequestDTO {
  id_turno: number;
  puntuacion: number;
  comentario?: string;
}

export interface UpdateColaRequestDTO {
  nombre?: string;
  descripcion?: string;
  activa?: boolean;
}

export interface UpdateHorarioRequestDTO {
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface CreateClienteRequestDTO {
  origen: string;
}

export interface AuthResponseDTO {
  success: boolean;
  data: {
    usuario: {
      id_usuario: number;
      nombre: string;
      email: string;
      rol: string;
      activo: boolean;
      fecha_creacion: string;
    };
    token: string;
    expiresIn: number;
  };
  message?: string;
  error?: string;
}

export interface MeResponseDTO {
  success: boolean;
  data: {
    id_usuario: number;
    nombre: string;
    email: string;
    rol: string;
    activo: boolean;
    fecha_creacion: string;
  };
  message?: string;
  error?: string;
}

export interface ColaResponseDTO {
  success: boolean;
  data: {
    id_cola: number;
    nombre: string;
    descripcion?: string;
    activa: boolean;
    fecha_creacion: string;
    horarios?: Array<{
      id_horario: number;
      dia_semana: string;
      hora_inicio: string;
      hora_fin: string;
    }>;
    eventos?: Array<{
      id_evento: number;
      tipo: string;
      nombre: string;
    }>;
  };
  message?: string;
  error?: string;
}

export interface ColasListResponseDTO {
  success: boolean;
  data: Array<{
    id_cola: number;
    nombre: string;
    descripcion?: string;
    activa: boolean;
    fecha_creacion: string;
  }>;
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
  error?: string;
}

export interface TurnoResponseDTO {
  success: boolean;
  data: {
    id_turno: number;
    numero_turno: number;
    id_cola: number;
    id_cliente: number;
    estado: string;
    fecha_hora_creacion: string;
    fecha_hora_llamada?: string;
    fecha_hora_inicio_atencion?: string;
    fecha_hora_fin_atencion?: string;
    atencion?: {
      resultado?: string;
      duracion_atencion?: number;
    };
  };
  message?: string;
  error?: string;
}

export interface TurnosListResponseDTO {
  success: boolean;
  data: Array<{
    id_turno: number;
    numero_turno: number;
    id_cola: number;
    id_cliente: number;
    estado: string;
    fecha_hora_creacion: string;
    fecha_hora_llamada?: string;
    fecha_hora_inicio_atencion?: string;
    fecha_hora_fin_atencion?: string;
  }>;
  total?: number;
  page?: number;
  limit?: number;
  message?: string;
  error?: string;
}

export interface ValoracionResponseDTO {
  success: boolean;
  data: {
    id_valoracion: number;
    id_turno: number;
    puntuacion: number;
    comentario?: string;
    fecha_valoracion: string;
  };
  message?: string;
  error?: string;
}

export interface AnalyticsResponseDTO {
  success: boolean;
  data: {
    totalTurnos: number;
    turnosAtendidos: number;
    turnosCancelados: number;
    turnosEnEspera: number;
    tiempoPromedioEspera: number;
    tiempoPromedioAtencion: number;
    satisfaccionPromedio: number;
    ultimosSevenDays: Array<{
      fecha: string;
      turnos: number;
      atendidos: number;
    }>;
  };
  message?: string;
  error?: string;
}

export interface HealthResponseDTO {
  status: 'ok' | 'error';
  timestamp: string;
  uptime?: number;
  database?: {
    status: 'connected' | 'disconnected';
  };
}

// ================================
// Generic API Response Wrapper
// ================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  statusCode?: number;
}

export interface PaginatedApiResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  message?: string;
  error?: string;
}

// ================================
// Type Guards
// ================================

export function isAuthResponse(data: unknown): data is AuthResponseDTO {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    typeof (data as any).data === 'object' &&
    'usuario' in (data as any).data &&
    'token' in (data as any).data
  );
}

export function isColaResponse(data: unknown): data is ColaResponseDTO {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    typeof (data as any).data === 'object' &&
    'id_cola' in (data as any).data
  );
}

export function isTurnoResponse(data: unknown): data is TurnoResponseDTO {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    typeof (data as any).data === 'object' &&
    'id_turno' in (data as any).data
  );
}

export function isPaginatedResponse<T>(data: unknown): data is PaginatedApiResponse<T> {
  return (
    typeof data === 'object' &&
    data !== null &&
    'data' in data &&
    'total' in data &&
    'page' in data &&
    'limit' in data &&
    Array.isArray((data as any).data)
  );
}
