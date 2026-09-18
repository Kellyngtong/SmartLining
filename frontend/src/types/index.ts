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

// ========================================
// Gestión de sala de restaurante (Fase 2/3)
// ========================================

export interface Zona {
  id_zona: number;
  id_cola: number;
  nombre: string;
  tipo: string | null;
  orden: number | null;
  activa: boolean;
  mesas?: MesaZona[] | null;
}

export interface MesaZona {
  id_mesa: number;
  numero: number;
  capacidad: number;
  estado: string;
  id_zona: number | null;
}

export interface Reserva {
  id_reserva: number;
  id_cola: number;
  id_cliente: number | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  cliente_email: string | null;
  fecha: string;
  hora_inicio: string;
  hora_inicio_str?: string;
  hora_fin: string | null;
  hora_fin_str?: string | null;
  num_comensales: number;
  notas: string | null;
  preferencia_zona: number | null;
  preferencia_mesa: number | null;
  origen: string;
  estado: string;
  created_at: string;
}

export interface WaitlistEntry {
  id_waitlist: number;
  id_cola: number;
  id_cliente: number | null;
  cliente_nombre: string;
  cliente_telefono: string | null;
  num_comensales: number;
  prioridad: number;
  preferencia_zona: number | null;
  preferencia_mesa: number | null;
  notas: string | null;
  estado: string;
  hora_llegada: string;
  tiempo_estimado_min: number | null;
}

export interface OpcionMesa {
  mesaIds: number[];
  mesaPrincipal: number;
  mesas: {
    id_mesa: number;
    numero: number;
    capacidad: number;
    estado: string;
  }[];
  capacidad: number;
  esGrupo: boolean;
  zonaId: number | null;
  zonaNombre: string | null;
  score: number;
  motivo: string;
}

export interface Disponibilidad {
  colaId: number;
  fecha: string;
  hora_inicio: string;
  hora_fin_prevista: string;
  duracion_min: number;
  comensales: number;
  hayDisponibilidad: boolean;
  opciones: OpcionMesa[];
  mejor_opcion: OpcionMesa | null;
  meta: { total_mesas: number; opciones_encontradas: number };
}

export interface AsignacionResult {
  id_asignacion: number;
  id_cola: number;
  tipo_origen: string;
  id_reserva: number | null;
  id_waitlist: number | null;
  mesa_ids: number[];
  grupo_id: number | null;
  num_comensales: number;
  hora_inicio: string;
  hora_fin_prevista: string | null;
  estado: string;
}

export interface DashboardSala {
  cola: { id_cola: number; nombre: string | null; duracion_estimada_comida_min: number };
  mesas: {
    total_mesas: number;
    libres: number;
    ocupadas: number;
    reservadas: number;
    otro_estado: number;
    tasa_ocupacion: number;
    por_zona: { id_zona: number; nombre: string; total: number; ocupadas: number; tasa: number }[];
  };
  waitlist: {
    hoy: number;
    esperando_ahora: number;
    tiempo_medio_espera_min: number | null;
  };
  reservas: {
    hoy: number;
    por_estado: { estado: string; cantidad: number }[];
    proxima: string | null;
  };
  operacion: {
    grupos_finalizados_hoy: number;
    asignaciones_mesa_hoy: number;
    tiempo_medio_comida_min: number | null;
  };
}
