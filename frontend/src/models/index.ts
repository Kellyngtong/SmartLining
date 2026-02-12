// ================================
// Domain Models
// ================================

/**
 * Usuario - Administrador o Empleado
 */
export class Usuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: 'ADMINISTRADOR' | 'EMPLEADO';
  activo: boolean;
  fecha_creacion: Date;

  constructor(data: {
    id_usuario: number;
    nombre: string;
    email: string;
    rol: 'ADMINISTRADOR' | 'EMPLEADO';
    activo: boolean;
    fecha_creacion: string | Date;
  }) {
    this.id_usuario = data.id_usuario;
    this.nombre = data.nombre;
    this.email = data.email;
    this.rol = data.rol;
    this.activo = data.activo;
    this.fecha_creacion =
      typeof data.fecha_creacion === 'string' ? new Date(data.fecha_creacion) : data.fecha_creacion;
  }

  isAdmin(): boolean {
    return this.rol === 'ADMINISTRADOR';
  }

  isActive(): boolean {
    return this.activo;
  }
}

/**
 * Cliente - Persona que solicita turno
 */
export class Cliente {
  id_cliente: number;
  fecha_creacion: Date;
  origen: string;

  constructor(data: { id_cliente: number; fecha_creacion: string | Date; origen: string }) {
    this.id_cliente = data.id_cliente;
    this.fecha_creacion =
      typeof data.fecha_creacion === 'string' ? new Date(data.fecha_creacion) : data.fecha_creacion;
    this.origen = data.origen;
  }
}

/**
 * Cola - Cola de atención
 */
export class Cola {
  id_cola: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: Date;

  constructor(data: {
    id_cola: number;
    nombre: string;
    descripcion?: string;
    activa: boolean;
    fecha_creacion: string | Date;
  }) {
    this.id_cola = data.id_cola;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
    this.activa = data.activa;
    this.fecha_creacion =
      typeof data.fecha_creacion === 'string' ? new Date(data.fecha_creacion) : data.fecha_creacion;
  }

  isActive(): boolean {
    return this.activa;
  }
}

/**
 * HorarioCola - Franja horaria de cola
 */
export class HorarioCola {
  id_horario: number;
  id_cola: number;
  dia_semana: 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';
  hora_inicio: string;
  hora_fin: string;

  constructor(data: {
    id_horario: number;
    id_cola: number;
    dia_semana: 'LUNES' | 'MARTES' | 'MIERCOLES' | 'JUEVES' | 'VIERNES' | 'SABADO' | 'DOMINGO';
    hora_inicio: string;
    hora_fin: string;
  }) {
    this.id_horario = data.id_horario;
    this.id_cola = data.id_cola;
    this.dia_semana = data.dia_semana;
    this.hora_inicio = data.hora_inicio;
    this.hora_fin = data.hora_fin;
  }
}

/**
 * Turno - Solicitud de atención de cliente
 */
export class Turno {
  id_turno: number;
  id_cola: number;
  id_cliente: number;
  numero_turno: number;
  estado: 'EN_ESPERA' | 'EN_ATENCION' | 'FINALIZADO' | 'CANCELADO';
  fecha_hora_creacion: Date;
  fecha_hora_llamada?: Date;
  fecha_hora_inicio_atencion?: Date;
  fecha_hora_fin_atencion?: Date;

  constructor(data: {
    id_turno: number;
    id_cola: number;
    id_cliente: number;
    numero_turno: number;
    estado: 'EN_ESPERA' | 'EN_ATENCION' | 'FINALIZADO' | 'CANCELADO';
    fecha_hora_creacion: string | Date;
    fecha_hora_llamada?: string | Date;
    fecha_hora_inicio_atencion?: string | Date;
    fecha_hora_fin_atencion?: string | Date;
  }) {
    this.id_turno = data.id_turno;
    this.id_cola = data.id_cola;
    this.id_cliente = data.id_cliente;
    this.numero_turno = data.numero_turno;
    this.estado = data.estado;
    this.fecha_hora_creacion =
      typeof data.fecha_hora_creacion === 'string'
        ? new Date(data.fecha_hora_creacion)
        : data.fecha_hora_creacion;
    this.fecha_hora_llamada = data.fecha_hora_llamada
      ? typeof data.fecha_hora_llamada === 'string'
        ? new Date(data.fecha_hora_llamada)
        : data.fecha_hora_llamada
      : undefined;
    this.fecha_hora_inicio_atencion = data.fecha_hora_inicio_atencion
      ? typeof data.fecha_hora_inicio_atencion === 'string'
        ? new Date(data.fecha_hora_inicio_atencion)
        : data.fecha_hora_inicio_atencion
      : undefined;
    this.fecha_hora_fin_atencion = data.fecha_hora_fin_atencion
      ? typeof data.fecha_hora_fin_atencion === 'string'
        ? new Date(data.fecha_hora_fin_atencion)
        : data.fecha_hora_fin_atencion
      : undefined;
  }

  isWaiting(): boolean {
    return this.estado === 'EN_ESPERA';
  }

  isAttending(): boolean {
    return this.estado === 'EN_ATENCION';
  }

  isFinished(): boolean {
    return this.estado === 'FINALIZADO';
  }

  isCancelled(): boolean {
    return this.estado === 'CANCELADO';
  }

  getDurationInSeconds(): number | null {
    if (!this.fecha_hora_inicio_atencion || !this.fecha_hora_fin_atencion) {
      return null;
    }
    return Math.round(
      (this.fecha_hora_fin_atencion.getTime() - this.fecha_hora_inicio_atencion.getTime()) / 1000
    );
  }

  getWaitingTimeInSeconds(): number | null {
    if (!this.fecha_hora_llamada) {
      return null;
    }
    return Math.round(
      (this.fecha_hora_llamada.getTime() - this.fecha_hora_creacion.getTime()) / 1000
    );
  }
}

/**
 * Atencion - Registro de atención realizada
 */
export class Atencion {
  id_atencion: number;
  id_turno: number;
  id_empleado: number;
  duracion_atencion?: number;
  resultado: 'ATENDIDO' | 'CANCELADO';

  constructor(data: {
    id_atencion: number;
    id_turno: number;
    id_empleado: number;
    duracion_atencion?: number;
    resultado: 'ATENDIDO' | 'CANCELADO';
  }) {
    this.id_atencion = data.id_atencion;
    this.id_turno = data.id_turno;
    this.id_empleado = data.id_empleado;
    this.duracion_atencion = data.duracion_atencion;
    this.resultado = data.resultado;
  }

  getDurationInMinutes(): number | null {
    if (!this.duracion_atencion) return null;
    return Math.round(this.duracion_atencion / 60);
  }

  wasServed(): boolean {
    return this.resultado === 'ATENDIDO';
  }

  wasCancelled(): boolean {
    return this.resultado === 'CANCELADO';
  }
}

/**
 * Valoracion - Rating de cliente post-atención
 */
export class Valoracion {
  id_valoracion: number;
  id_turno: number;
  puntuacion: number;
  comentario?: string;
  fecha_valoracion: Date;

  constructor(data: {
    id_valoracion: number;
    id_turno: number;
    puntuacion: number;
    comentario?: string;
    fecha_valoracion: string | Date;
  }) {
    this.id_valoracion = data.id_valoracion;
    this.id_turno = data.id_turno;
    this.puntuacion = Math.max(1, Math.min(5, data.puntuacion));
    this.comentario = data.comentario;
    this.fecha_valoracion =
      typeof data.fecha_valoracion === 'string'
        ? new Date(data.fecha_valoracion)
        : data.fecha_valoracion;
  }

  isPositive(): boolean {
    return this.puntuacion >= 4;
  }

  isNeutral(): boolean {
    return this.puntuacion === 3;
  }

  isNegative(): boolean {
    return this.puntuacion <= 2;
  }

  getStars(): string {
    return '⭐'.repeat(this.puntuacion);
  }
}

/**
 * Evento - Promoción, festivo o evento especial
 */
export class Evento {
  id_evento: number;
  tipo: 'PROMOCION' | 'FESTIVO' | 'EVENTO';
  nombre: string;
  descripcion?: string;
  fecha_inicio: Date;
  fecha_fin: Date;

  constructor(data: {
    id_evento: number;
    tipo: 'PROMOCION' | 'FESTIVO' | 'EVENTO';
    nombre: string;
    descripcion?: string;
    fecha_inicio: string | Date;
    fecha_fin: string | Date;
  }) {
    this.id_evento = data.id_evento;
    this.tipo = data.tipo;
    this.nombre = data.nombre;
    this.descripcion = data.descripcion;
    this.fecha_inicio =
      typeof data.fecha_inicio === 'string' ? new Date(data.fecha_inicio) : data.fecha_inicio;
    this.fecha_fin = typeof data.fecha_fin === 'string' ? new Date(data.fecha_fin) : data.fecha_fin;
  }

  isActive(date: Date = new Date()): boolean {
    return date >= this.fecha_inicio && date <= this.fecha_fin;
  }

  getDaysRemaining(date: Date = new Date()): number {
    if (date > this.fecha_fin) return 0;
    return Math.ceil((this.fecha_fin.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  }
}

/**
 * ColaEvento - Relación N:M entre colas y eventos
 */
export class ColaEvento {
  id_cola: number;
  id_evento: number;

  constructor(data: { id_cola: number; id_evento: number }) {
    this.id_cola = data.id_cola;
    this.id_evento = data.id_evento;
  }
}
