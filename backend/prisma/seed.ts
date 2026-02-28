import { PrismaClient, EstadoTurno, ResultadoAtencion } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...');

  const force = process.env.SEED_FORCE === 'true';

  // Queues to ensure
  const queuesData = [
    {
      nombre: 'Atención al Cliente',
      descripcion: 'Cola principal para atención general de clientes',
      activa: true,
    },
    { nombre: 'Cajas', descripcion: 'Cola de cajas para pago de servicios', activa: true },
    {
      nombre: 'Reclamos',
      descripcion: 'Cola para atención de reclamos y devoluciones',
      activa: true,
    },
    { nombre: 'Carnicería', descripcion: 'Cola para acceder a la carniceria', activa: true },
    { nombre: 'Soporte', descripcion: 'Soporte técnico y consultas', activa: true },
    { nombre: 'Devoluciones', descripcion: 'Gestión de devoluciones y cambios', activa: true },
  ];

  // Upsert queues to avoid duplicates
  const createdQueues: any[] = [];
  for (const q of queuesData) {
    let cola = await prisma.cola.findFirst({ where: { nombre: q.nombre } });
    if (!cola) cola = await prisma.cola.create({ data: q });
    createdQueues.push(cola);
  }
  console.log('✅ Colas creadas/aseguradas:', createdQueues.map((c) => c.nombre).join(', '));

  // Create or ensure some users (admin + empleados)
  let empleadoIds: number[] = [];

  try {
    const adminPassword = await bcrypt.hash('admin123', 10);
    const empleadoPassword = await bcrypt.hash('empleado123', 10);

    await prisma.usuario.upsert({
      where: { email: 'admin@smartlining.com' },
      update: {},
      create: {
        nombre: 'Juan Administrador',
        email: 'admin@smartlining.com',
        password_hash: adminPassword,
        rol: 'ADMINISTRADOR' as any,
      },
    });
    await prisma.usuario.upsert({
      where: { email: 'empleado1@smartlining.com' },
      update: {},
      create: {
        nombre: 'María Empleada',
        email: 'empleado1@smartlining.com',
        password_hash: empleadoPassword,
        rol: 'EMPLEADO' as any,
      },
    });
  } catch (e) {
    console.warn('No se pudieron crear usuarios (bcrypt import failed?)', e);
  }

  // Ensure we have empleado IDs available for atenciones (fallback to admin if none)
  const empleados = await prisma.usuario.findMany({ where: { rol: 'EMPLEADO' as any } });
  empleadoIds = empleados.length ? empleados.map((e) => e.id_usuario) : [];
  if (empleadoIds.length === 0) {
    const admin = await prisma.usuario.findUnique({ where: { email: 'admin@smartlining.com' } });
    if (admin) empleadoIds.push(admin.id_usuario);
  }
  console.log('📝 Usuarios asegurados (admin + empleados)');
  

  // Ensure many clients
  const CLIENT_COUNT = 200;
  const existingClients = await prisma.cliente.count();
  const clients: any[] = [];
  if (existingClients >= CLIENT_COUNT && !force) {
    const sample = await prisma.cliente.findMany({ take: CLIENT_COUNT });
    clients.push(...sample);
    console.log(`👥 Clientes existentes: ${existingClients} (usando muestra para seed)`);
  } else {
    for (let i = 1; i <= CLIENT_COUNT; i++) {
      const token = `cliente${i}@example.test`;
      let c = await prisma.cliente.findFirst({ where: { client_token: token } as any });
      if (!c) {
        c = await prisma.cliente.create({
          data: { nombre: `Cliente ${i}`, client_token: token } as any,
        });
      }
      clients.push(c);
    }
    console.log(`👥 Clientes asegurados: ${clients.length}`);
  }

  // Helper to create a turno
  const createTurno = async (
    colaId: number,
    clienteId: number,
    numero: number,
    estado: EstadoTurno,
    createdAt: Date,
    calledAt?: Date,
    startAt?: Date,
    endAt?: Date
  ) => {
    return prisma.turno.create({
      data: {
        id_cola: colaId,
        id_cliente: clienteId,
        numero_turno: numero,
        estado,
        fecha_hora_creacion: createdAt,
        fecha_hora_llamada: calledAt ?? null,
        fecha_hora_inicio_atencion: startAt ?? null,
        fecha_hora_fin_atencion: endAt ?? null,
      },
    });
  };

  // Seed historical data for last DAYS days
  const DAYS = 14;
  let numeroCounter = (await prisma.turno.count()) + 1;
  const now = new Date();

  for (const q of createdQueues) {
    for (let d = 0; d < DAYS; d++) {
      const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - d));
      const base = 8 + (q.id_cola % 5) * 2;
      const count = base + (d % 7) + Math.floor(Math.random() * 6);
      for (let j = 0; j < count; j++) {
        const hour = 8 + ((j * 13) % 10);
        const minute = (j * 7) % 60;
        const createdAt = new Date(
          Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), hour, minute, 0)
        );
        const cliente = clients[(j + d * 3 + q.id_cola) % clients.length];
        const r = Math.random();
        let estado: EstadoTurno = EstadoTurno.EN_ESPERA;
        if (r < 0.6) estado = EstadoTurno.FINALIZADO;
        else if (r < 0.8) estado = EstadoTurno.EN_ATENCION;
        const llamadaAt =
          estado === EstadoTurno.EN_ESPERA
            ? null
            : new Date(createdAt.getTime() + (5 + Math.floor(Math.random() * 10)) * 60 * 1000);
        const startAt =
          estado === EstadoTurno.FINALIZADO || estado === EstadoTurno.EN_ATENCION
            ? new Date(
                (llamadaAt ?? createdAt).getTime() + (1 + Math.floor(Math.random() * 5)) * 60 * 1000
              )
            : null;
        const endAt =
          estado === EstadoTurno.FINALIZADO
            ? new Date(
                (startAt as Date).getTime() + (3 + Math.floor(Math.random() * 12)) * 60 * 1000
              )
            : null;
        const turno = await createTurno(
          q.id_cola,
          cliente.id_cliente,
          numeroCounter++,
          estado,
          createdAt,
          llamadaAt ?? undefined,
          startAt ?? undefined,
          endAt ?? undefined
        );
        if (estado === EstadoTurno.FINALIZADO && startAt && endAt) {
          const durSec = Math.round((endAt.getTime() - startAt.getTime()) / 1000);
          const empleadoId = empleadoIds.length ? empleadoIds[(j % empleadoIds.length)] : null;
          if (empleadoId) {
            await prisma.atencion.create({
              data: {
                id_turno: turno.id_turno,
                id_empleado: empleadoId,
                duracion_atencion: durSec,
                resultado: ResultadoAtencion.ATENDIDO,
              },
            });
          }
        }
      }
    }
  }

  // Ensure at least MIN_TODAY entries per queue (using UTC day boundaries)
  const MIN_TODAY = 20;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  for (const q of createdQueues) {
    const existingToday = await prisma.turno.count({
      where: { id_cola: q.id_cola, fecha_hora_creacion: { gte: todayStart, lte: todayEnd } },
    });
    if (existingToday < MIN_TODAY) {
      const needed = MIN_TODAY - existingToday;
      console.log(`Queue ${q.nombre} has ${existingToday} today — creating ${needed} more turnos`);
      for (let k = 0; k < needed; k++) {
        const createdAt = new Date();
        createdAt.setUTCMinutes((k * 3) % 60, 0, 0);
        const cliente = clients[(k + q.id_cola) % clients.length];
        const estado: EstadoTurno =
          k % 4 === 0
            ? EstadoTurno.FINALIZADO
            : k % 3 === 0
              ? EstadoTurno.EN_ATENCION
              : EstadoTurno.EN_ESPERA;
        const llamadaAt =
          estado === EstadoTurno.EN_ESPERA
            ? null
            : new Date(createdAt.getTime() + (2 + (k % 5)) * 60 * 1000);
        const startAt =
          estado === EstadoTurno.FINALIZADO || estado === EstadoTurno.EN_ATENCION
            ? new Date((llamadaAt ?? createdAt).getTime() + (1 + (k % 3)) * 60 * 1000)
            : null;
        const endAt =
          estado === EstadoTurno.FINALIZADO
            ? new Date((startAt as Date).getTime() + (4 + (k % 8)) * 60 * 1000)
            : null;
        const turno = await createTurno(
          q.id_cola,
          cliente.id_cliente,
          numeroCounter++,
          estado,
          createdAt,
          llamadaAt ?? undefined,
          startAt ?? undefined,
          endAt ?? undefined
        );
        if (estado === EstadoTurno.FINALIZADO && startAt && endAt) {
          const durSec = Math.round((endAt.getTime() - startAt.getTime()) / 1000);
          const empleadoId = empleadoIds.length ? empleadoIds[(k % empleadoIds.length)] : null;
          if (empleadoId) {
            await prisma.atencion.create({
              data: {
                id_turno: turno.id_turno,
                id_empleado: empleadoId,
                duracion_atencion: durSec,
                resultado: ResultadoAtencion.ATENDIDO,
              },
            });
          }
        }
      }
    }
  }

  console.log('✨ Seeding completado correctamente!');
  console.log('📊 Resumen de acciones:');
  const totalQueues = await prisma.cola.count();
  const totalClients = await prisma.cliente.count();
  const totalTurnos = await prisma.turno.count();
  const totalAtenciones = await prisma.atencion.count();
  console.log(`   • Colas: ${totalQueues}`);
  console.log(`   • Clientes: ${totalClients}`);
  console.log(`   • Turnos: ${totalTurnos}`);
  console.log(`   • Atenciones: ${totalAtenciones}`);
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
