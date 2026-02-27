import { PrismaClient, UserRole, DiaSemana, EstadoTurno, ResultadoAtencion, TipoEvento } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...\n');

  try {
    // ========================
    // USUARIOS
    // ========================
    console.log('📝 Creando usuarios...');

    const adminPassword = await bcrypt.hash('admin123', 10);
    const empleadoPassword = await bcrypt.hash('empleado123', 10);

    const admin = await prisma.usuario.upsert({
      where: { email: 'admin@smartlining.com' },
      update: {},
      create: {
        nombre: 'Juan Administrador',
        email: 'admin@smartlining.com',
        password_hash: adminPassword,
        rol: UserRole.ADMINISTRADOR,
        activo: true,
      },
    });

    const empleado1 = await prisma.usuario.upsert({
      where: { email: 'empleado1@smartlining.com' },
      update: {},
      create: {
        nombre: 'María Empleada',
        email: 'empleado1@smartlining.com',
        password_hash: empleadoPassword,
        rol: UserRole.EMPLEADO,
        activo: true,
      },
    });

    const empleado2 = await prisma.usuario.upsert({
      where: { email: 'empleado2@smartlining.com' },
      update: {},
      create: {
        nombre: 'Carlos Empleado',
        email: 'empleado2@smartlining.com',
        password_hash: empleadoPassword,
        rol: UserRole.EMPLEADO,
        activo: true,
      },
    });

    console.log(`✅ Usuarios creados: ${admin.nombre}, ${empleado1.nombre}, ${empleado2.nombre}\n`);

    // ========================
    // COLAS
    // ========================
    console.log('🎫 Creando colas...');

    const colaAtencion = await prisma.cola.upsert({
      where: { id_cola: 1 },
      update: {},
      create: {
        nombre: 'Atención al Cliente',
        descripcion: 'Cola principal para atención general de clientes',
        activa: true,
      },
    });

    const colaCajas = await prisma.cola.upsert({
      where: { id_cola: 2 },
      update: {},
      create: {
        nombre: 'Cajas',
        descripcion: 'Cola de cajas para pago de servicios',
        activa: true,
      },
    });

    const colaReclamos = await prisma.cola.upsert({
      where: { id_cola: 3 },
      update: {},
      create: {
        nombre: 'Reclamos',
        descripcion: 'Cola para atención de reclamos y devoluciones',
        activa: true,
      },
    });

    console.log(`✅ Colas creadas: ${colaAtencion.nombre}, ${colaCajas.nombre}, ${colaReclamos.nombre}\n`);

    // ========================
    // HORARIOS
    // ========================
    console.log('⏰ Creando horarios...');

    // Horarios para cola de atención (lunes a viernes 09:00 a 20:00)
    const diasLaborales = [
      DiaSemana.LUNES,
      DiaSemana.MARTES,
      DiaSemana.MIERCOLES,
      DiaSemana.JUEVES,
      DiaSemana.VIERNES,
    ];

    for (const dia of diasLaborales) {
      await prisma.horarioCola.upsert({
        where: {
          id_horario: dias_horarios[dia] || undefined,
        },
        update: {},
        create: {
          id_cola: colaAtencion.id_cola,
          dia_semana: dia,
          hora_inicio: new Date('2024-01-01 09:00:00'),
          hora_fin: new Date('2024-01-01 20:00:00'),
        },
      });
    }

    // Sábado y domingo cerrado (solo ejemplo)
    await prisma.horarioCola.upsert({
      where: {
        id_horario: 100,
      },
      update: {},
      create: {
        id_cola: colaAtencion.id_cola,
        dia_semana: DiaSemana.SABADO,
        hora_inicio: new Date('2024-01-01 10:00:00'),
        hora_fin: new Date('2024-01-01 16:00:00'),
      },
    });

    console.log('✅ Horarios creados\n');

    // ========================
    // CLIENTES
    // ========================
    console.log('👥 Creando clientes de ejemplo...');

    const cliente1 = await prisma.cliente.create({
      data: {
        nombre: 'Cliente 1',
        origen: 'QR',
      },
    });

    const cliente2 = await prisma.cliente.create({
      data: {
        nombre: 'Cliente 2',
        origen: 'QR',
      },
    });

    const cliente3 = await prisma.cliente.create({
      data: {
        nombre: 'Cliente 3',
        origen: 'QR',
      },
    });

    console.log(`✅ Clientes creados: ${cliente1.id_cliente}, ${cliente2.id_cliente}, ${cliente3.id_cliente}\n`);

    // ========================
    // TURNOS
    // ========================
    console.log('🎟️  Creando turnos...');

    const ahora = new Date();
    const ayer = new Date(ahora);
    ayer.setDate(ayer.getDate() - 1);

    // Turno completado de ayer
    const turnoCompletado = await prisma.turno.create({
      data: {
        id_cola: colaAtencion.id_cola,
        id_cliente: cliente1.id_cliente,
        numero_turno: 1,
        estado: EstadoTurno.FINALIZADO,
        fecha_hora_creacion: new Date(ayer.setHours(10, 0, 0)),
        fecha_hora_llamada: new Date(ayer.setHours(10, 15, 0)),
        fecha_hora_inicio_atencion: new Date(ayer.setHours(10, 16, 0)),
        fecha_hora_fin_atencion: new Date(ayer.setHours(10, 25, 0)),
      },
    });

    // Turno en espera de hoy
    const turnoEnEspera = await prisma.turno.create({
      data: {
        id_cola: colaAtencion.id_cola,
        id_cliente: cliente2.id_cliente,
        numero_turno: 2,
        estado: EstadoTurno.EN_ESPERA,
        fecha_hora_creacion: new Date(ahora.setHours(14, 30, 0)),
      },
    });

    // Turno en atención
    const turnoEnAtencion = await prisma.turno.create({
      data: {
        id_cola: colaCajas.id_cola,
        id_cliente: cliente3.id_cliente,
        numero_turno: 1,
        estado: EstadoTurno.EN_ATENCION,
        fecha_hora_creacion: new Date(ahora.setHours(15, 0, 0)),
        fecha_hora_llamada: new Date(ahora.setHours(15, 2, 0)),
        fecha_hora_inicio_atencion: new Date(ahora.setHours(15, 3, 0)),
      },
    });

    console.log(`✅ Turnos creados: ${turnoCompletado.numero_turno} (completado), ${turnoEnEspera.numero_turno} (en espera), ${turnoEnAtencion.numero_turno} (en atención)\n`);

    // ========================
    // ATENCIONES
    // ========================
    console.log('👨‍💼 Creando registros de atención...');

    const atencion = await prisma.atencion.create({
      data: {
        id_turno: turnoCompletado.id_turno,
        id_empleado: empleado1.id_usuario,
        duracion_atencion: 540, // 9 minutos en segundos
        resultado: ResultadoAtencion.ATENDIDO,
      },
    });

    console.log(`✅ Atención registrada: ${atencion.duracion_atencion} segundos\n`);

    // ========================
    // VALORACIONES
    // ========================
    console.log('⭐ Creando valoraciones...');

    const valoracion = await prisma.valoracion.create({
      data: {
        id_turno: turnoCompletado.id_turno,
        puntuacion: 5,
        comentario: 'Excelente servicio, muy rápido y atentivo',
      },
    });

    console.log(`✅ Valoración creada: ${valoracion.puntuacion} estrellas\n`);

    // ========================
    // EVENTOS (Promociones, Festivos, Eventos)
    // ========================
    console.log('🎉 Creando eventos...');

    const festivo = await prisma.evento.create({
      data: {
        tipo: TipoEvento.FESTIVO,
        nombre: 'Año Nuevo',
        descripcion: 'Día festivo - Establecimiento cerrado',
        fecha_inicio: new Date('2024-01-01'),
        fecha_fin: new Date('2024-01-01'),
      },
    });

    const promocion = await prisma.evento.create({
      data: {
        tipo: TipoEvento.PROMOCION,
        nombre: 'Black Friday',
        descripcion: 'Gran venta anual con descuentos especiales',
        fecha_inicio: new Date('2024-11-24'),
        fecha_fin: new Date('2024-11-25'),
      },
    });

    console.log(`✅ Eventos creados: ${festivo.nombre}, ${promocion.nombre}\n`);

    // ========================
    // RELACIÓN COLAS-EVENTOS
    // ========================
    console.log('🔗 Asociando eventos a colas...');

    await prisma.colaEvento.create({
      data: {
        id_cola: colaAtencion.id_cola,
        id_evento: promocion.id_evento,
      },
    });

    await prisma.colaEvento.create({
      data: {
        id_cola: colaCajas.id_cola,
        id_evento: promocion.id_evento,
      },
    });

    console.log('✅ Eventos asociados a colas\n');

    // ========================
    // RESUMEN
    // ========================
    console.log('✨ Seeding completado correctamente!\n');
    console.log('📊 Resumen de datos creados:');
    console.log(`   • Usuarios: 3 (1 admin, 2 empleados)`);
    console.log(`   • Colas: 3`);
    console.log(`   • Horarios: 6`);
    console.log(`   • Clientes: 3`);
    console.log(`   • Turnos: 3`);
    console.log(`   • Atenciones: 1`);
    console.log(`   • Valoraciones: 1`);
    console.log(`   • Eventos: 2`);
    console.log(`   • Relaciones Cola-Evento: 2\n`);
    console.log('🔑 Credenciales de prueba:');
    console.log(`   Admin: admin@smartlining.com / admin123`);
    console.log(`   Empleado: empleado1@smartlining.com / empleado123\n`);
  } catch (error) {
    console.error('❌ Error durante el seeding:', error);
    throw error;
  }
}

// Mapeo temporal para evitar conflictos de IDs
const dias_horarios: { [key: string]: number } = {
  LUNES: 1,
  MARTES: 2,
  MIERCOLES: 3,
  JUEVES: 4,
  VIERNES: 5,
  SABADO: 6,
};

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Error fatal:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
