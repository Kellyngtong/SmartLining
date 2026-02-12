import {
  Usuario,
  Cliente,
  Cola,
  HorarioCola,
  Turno,
  Atencion,
  Valoracion,
  Evento,
  ColaEvento,
} from './index';

// ================================
// Type definitions for raw API responses
// ================================

export interface RawUsuario {
  id_usuario: number;
  nombre: string;
  email: string;
  rol: string;
  activo: boolean;
  fecha_creacion: string;
}

export interface RawCliente {
  id_cliente: number;
  fecha_creacion: string;
  origen: string;
}

export interface RawCola {
  id_cola: number;
  nombre: string;
  descripcion?: string;
  activa: boolean;
  fecha_creacion: string;
}

export interface RawHorarioCola {
  id_horario: number;
  id_cola: number;
  dia_semana: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface RawTurno {
  id_turno: number;
  id_cola: number;
  id_cliente: number;
  numero_turno: number;
  estado: string;
  fecha_hora_creacion: string;
  fecha_hora_llamada?: string;
  fecha_hora_inicio_atencion?: string;
  fecha_hora_fin_atencion?: string;
}

export interface RawAtencion {
  id_atencion: number;
  id_turno: number;
  id_empleado: number;
  duracion_atencion?: number;
  resultado: string;
}

export interface RawValoracion {
  id_valoracion: number;
  id_turno: number;
  puntuacion: number;
  comentario?: string;
  fecha_valoracion: string;
}

export interface RawEvento {
  id_evento: number;
  tipo: string;
  nombre: string;
  descripcion?: string;
  fecha_inicio: string;
  fecha_fin: string;
}

export interface RawColaEvento {
  id_cola: number;
  id_evento: number;
}

// ================================
// Mapper Functions
// ================================

export const UsuarioMapper = {
  toDomain: (raw: RawUsuario): Usuario => {
    return new Usuario({
      id_usuario: raw.id_usuario,
      nombre: raw.nombre,
      email: raw.email,
      rol: raw.rol as 'ADMINISTRADOR' | 'EMPLEADO',
      activo: raw.activo,
      fecha_creacion: raw.fecha_creacion,
    });
  },

  toDomainArray: (rawArray: RawUsuario[]): Usuario[] => {
    return rawArray.map(UsuarioMapper.toDomain);
  },

  toDTO: (domain: Usuario) => ({
    id_usuario: domain.id_usuario,
    nombre: domain.nombre,
    email: domain.email,
    rol: domain.rol,
    activo: domain.activo,
    fecha_creacion: domain.fecha_creacion.toISOString(),
  }),
};

export const ClienteMapper = {
  toDomain: (raw: RawCliente): Cliente => {
    return new Cliente({
      id_cliente: raw.id_cliente,
      fecha_creacion: raw.fecha_creacion,
      origen: raw.origen,
    });
  },

  toDomainArray: (rawArray: RawCliente[]): Cliente[] => {
    return rawArray.map(ClienteMapper.toDomain);
  },

  toDTO: (domain: Cliente) => ({
    id_cliente: domain.id_cliente,
    fecha_creacion: domain.fecha_creacion.toISOString(),
    origen: domain.origen,
  }),
};

export const ColaMapper = {
  toDomain: (raw: RawCola): Cola => {
    return new Cola({
      id_cola: raw.id_cola,
      nombre: raw.nombre,
      descripcion: raw.descripcion,
      activa: raw.activa,
      fecha_creacion: raw.fecha_creacion,
    });
  },

  toDomainArray: (rawArray: RawCola[]): Cola[] => {
    return rawArray.map(ColaMapper.toDomain);
  },

  toDTO: (domain: Cola) => ({
    id_cola: domain.id_cola,
    nombre: domain.nombre,
    descripcion: domain.descripcion,
    activa: domain.activa,
    fecha_creacion: domain.fecha_creacion.toISOString(),
  }),
};

export const HorarioColaMapper = {
  toDomain: (raw: RawHorarioCola): HorarioCola => {
    return new HorarioCola({
      id_horario: raw.id_horario,
      id_cola: raw.id_cola,
      dia_semana: raw.dia_semana as any,
      hora_inicio: raw.hora_inicio,
      hora_fin: raw.hora_fin,
    });
  },

  toDomainArray: (rawArray: RawHorarioCola[]): HorarioCola[] => {
    return rawArray.map(HorarioColaMapper.toDomain);
  },

  toDTO: (domain: HorarioCola) => ({
    id_horario: domain.id_horario,
    id_cola: domain.id_cola,
    dia_semana: domain.dia_semana,
    hora_inicio: domain.hora_inicio,
    hora_fin: domain.hora_fin,
  }),
};

export const TurnoMapper = {
  toDomain: (raw: RawTurno): Turno => {
    return new Turno({
      id_turno: raw.id_turno,
      id_cola: raw.id_cola,
      id_cliente: raw.id_cliente,
      numero_turno: raw.numero_turno,
      estado: raw.estado as any,
      fecha_hora_creacion: raw.fecha_hora_creacion,
      fecha_hora_llamada: raw.fecha_hora_llamada,
      fecha_hora_inicio_atencion: raw.fecha_hora_inicio_atencion,
      fecha_hora_fin_atencion: raw.fecha_hora_fin_atencion,
    });
  },

  toDomainArray: (rawArray: RawTurno[]): Turno[] => {
    return rawArray.map(TurnoMapper.toDomain);
  },

  toDTO: (domain: Turno) => ({
    id_turno: domain.id_turno,
    id_cola: domain.id_cola,
    id_cliente: domain.id_cliente,
    numero_turno: domain.numero_turno,
    estado: domain.estado,
    fecha_hora_creacion: domain.fecha_hora_creacion.toISOString(),
    fecha_hora_llamada: domain.fecha_hora_llamada?.toISOString(),
    fecha_hora_inicio_atencion: domain.fecha_hora_inicio_atencion?.toISOString(),
    fecha_hora_fin_atencion: domain.fecha_hora_fin_atencion?.toISOString(),
  }),
};

export const AtencionMapper = {
  toDomain: (raw: RawAtencion): Atencion => {
    return new Atencion({
      id_atencion: raw.id_atencion,
      id_turno: raw.id_turno,
      id_empleado: raw.id_empleado,
      duracion_atencion: raw.duracion_atencion,
      resultado: raw.resultado as 'ATENDIDO' | 'CANCELADO',
    });
  },

  toDomainArray: (rawArray: RawAtencion[]): Atencion[] => {
    return rawArray.map(AtencionMapper.toDomain);
  },

  toDTO: (domain: Atencion) => ({
    id_atencion: domain.id_atencion,
    id_turno: domain.id_turno,
    id_empleado: domain.id_empleado,
    duracion_atencion: domain.duracion_atencion,
    resultado: domain.resultado,
  }),
};

export const ValoracionMapper = {
  toDomain: (raw: RawValoracion): Valoracion => {
    return new Valoracion({
      id_valoracion: raw.id_valoracion,
      id_turno: raw.id_turno,
      puntuacion: raw.puntuacion,
      comentario: raw.comentario,
      fecha_valoracion: raw.fecha_valoracion,
    });
  },

  toDomainArray: (rawArray: RawValoracion[]): Valoracion[] => {
    return rawArray.map(ValoracionMapper.toDomain);
  },

  toDTO: (domain: Valoracion) => ({
    id_valoracion: domain.id_valoracion,
    id_turno: domain.id_turno,
    puntuacion: domain.puntuacion,
    comentario: domain.comentario,
    fecha_valoracion: domain.fecha_valoracion.toISOString(),
  }),
};

export const EventoMapper = {
  toDomain: (raw: RawEvento): Evento => {
    return new Evento({
      id_evento: raw.id_evento,
      tipo: raw.tipo as 'PROMOCION' | 'FESTIVO' | 'EVENTO',
      nombre: raw.nombre,
      descripcion: raw.descripcion,
      fecha_inicio: raw.fecha_inicio,
      fecha_fin: raw.fecha_fin,
    });
  },

  toDomainArray: (rawArray: RawEvento[]): Evento[] => {
    return rawArray.map(EventoMapper.toDomain);
  },

  toDTO: (domain: Evento) => ({
    id_evento: domain.id_evento,
    tipo: domain.tipo,
    nombre: domain.nombre,
    descripcion: domain.descripcion,
    fecha_inicio: domain.fecha_inicio.toISOString().split('T')[0],
    fecha_fin: domain.fecha_fin.toISOString().split('T')[0],
  }),
};

export const ColaEventoMapper = {
  toDomain: (raw: RawColaEvento): ColaEvento => {
    return new ColaEvento({
      id_cola: raw.id_cola,
      id_evento: raw.id_evento,
    });
  },

  toDomainArray: (rawArray: RawColaEvento[]): ColaEvento[] => {
    return rawArray.map(ColaEventoMapper.toDomain);
  },

  toDTO: (domain: ColaEvento) => ({
    id_cola: domain.id_cola,
    id_evento: domain.id_evento,
  }),
};
