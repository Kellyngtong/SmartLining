import { PrismaClient, EstadoTurno, ResultadoAtencion } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seeding de la base de datos...');

  const force = process.env.SEED_FORCE === 'true';

  // ========================================
  // EMPRESAS / TENANTS
  // ========================================
  const empresaGeneral = await prisma.empresa.upsert({
    where: { id_empresa: 1 },
    update: {},
    create: { nombre: 'Empresa General SmartLining', licencia: 'GENERAL' as any },
  });
  const empresaRestaurante = await prisma.empresa.upsert({
    where: { id_empresa: 2 },
    update: {},
    create: { nombre: 'Restaurante El Buen Sabor', licencia: 'RESTAURANTE' as any },
  });
  console.log(`🏢  Empresas: "${empresaGeneral.nombre}" (${empresaGeneral.licencia}) y "${empresaRestaurante.nombre}" (${empresaRestaurante.licencia})`);

  // ========================================
  // COLAS GENÉRICAS
  // ========================================
  const genericQueuesData = [
    {
      nombre: 'Atención al Cliente',
      descripcion: 'Cola principal para atención general de clientes',
      activa: true,
      id_empresa: empresaGeneral.id_empresa,
    },
    { nombre: 'Cajas', descripcion: 'Cola de cajas para pago de servicios', activa: true, id_empresa: empresaGeneral.id_empresa },
    {
      nombre: 'Reclamos',
      descripcion: 'Cola para atención de reclamos y devoluciones',
      activa: true,
      id_empresa: empresaGeneral.id_empresa,
    },
    { nombre: 'Carnicería', descripcion: 'Cola para acceder a la carniceria', activa: true, id_empresa: empresaGeneral.id_empresa },
    { nombre: 'Soporte', descripcion: 'Soporte técnico y consultas', activa: true, id_empresa: empresaGeneral.id_empresa },
    { nombre: 'Devoluciones', descripcion: 'Gestión de devoluciones y cambios', activa: true, id_empresa: empresaGeneral.id_empresa },
  ];

  const createdQueues: any[] = [];
  for (const q of genericQueuesData) {
    let cola = await prisma.cola.findFirst({ where: { nombre: q.nombre } });
    if (!cola) cola = await prisma.cola.create({ data: q });
    createdQueues.push(cola);
  }
  console.log('✅ Colas genéricas creadas:', createdQueues.map((c) => c.nombre).join(', '));

  // ========================================
  // COLA RESTAURANTE
  // ========================================
  let restauranteCola = await prisma.cola.findFirst({ where: { nombre: 'Restaurante El Buen Sabor' } });
  if (!restauranteCola) {
    restauranteCola = await prisma.cola.create({
      data: {
        nombre: 'Restaurante El Buen Sabor',
        descripcion: 'Cola del restaurante — gestiona mesas y comensales',
        tipo: 'RESTAURANTE',
        activa: true,
        id_empresa: empresaRestaurante.id_empresa,
      },
    });
  } else if (!restauranteCola.id_empresa) {
    restauranteCola = await prisma.cola.update({
      where: { id_cola: restauranteCola.id_cola },
      data: { id_empresa: empresaRestaurante.id_empresa },
    });
  }
  createdQueues.push(restauranteCola);
  console.log('🍽️  Cola restaurante asegurada:', restauranteCola.nombre, `(ID: ${restauranteCola.id_cola})`);

  // ========================================
  // MESAS DEL RESTAURANTE
  // ========================================
  const mesasConfig = [
    { numero: 1, capacidad: 2 },
    { numero: 2, capacidad: 2 },
    { numero: 3, capacidad: 2 },
    { numero: 4, capacidad: 4 },
    { numero: 5, capacidad: 4 },
    { numero: 6, capacidad: 4 },
    { numero: 7, capacidad: 4 },
    { numero: 8, capacidad: 6 },
    { numero: 9, capacidad: 6 },
    { numero: 10, capacidad: 8 },
  ];

  for (const m of mesasConfig) {
    const existing = await prisma.mesa.findFirst({
      where: { id_cola: restauranteCola.id_cola, numero: m.numero },
    });
    if (!existing) {
      await prisma.mesa.create({
        data: {
          numero: m.numero,
          capacidad: m.capacidad,
          id_cola: restauranteCola.id_cola,
          estado: 'LIBRE',
        },
      });
    }
  }
  const totalMesas = await prisma.mesa.count({ where: { id_cola: restauranteCola.id_cola } });
  console.log(`🪑  Mesas del restaurante: ${totalMesas} (2×3, 4×4, 2×6, 1×8)`);

  // ========================================
  // USUARIOS
  // ========================================
  const adminPassword = await bcrypt.hash('admin123', 10);
  const empleadoPassword = await bcrypt.hash('empleado123', 10);
  const camareroPassword = await bcrypt.hash('camarero123', 10);

  // Admin general
  let adminUser = await prisma.usuario.findUnique({ where: { email: 'admin@smartlining.com' } });
  if (!adminUser) {
    adminUser = await prisma.usuario.create({
      data: {
        nombre: 'Juan Administrador',
        email: 'admin@smartlining.com',
        password_hash: adminPassword,
        rol: 'ADMINISTRADOR' as any,
        licencia: 'GENERAL' as any,
        id_empresa: empresaGeneral.id_empresa,
      },
    });
  }

  // Empleado genérico
  let empleadoUser = await prisma.usuario.findUnique({ where: { email: 'empleado1@smartlining.com' } });
  if (!empleadoUser) {
    empleadoUser = await prisma.usuario.create({
      data: {
        nombre: 'María Empleada',
        email: 'empleado1@smartlining.com',
        password_hash: empleadoPassword,
        rol: 'EMPLEADO' as any,
        licencia: 'GENERAL' as any,
        id_empresa: empresaGeneral.id_empresa,
      },
    });
  }

  // Admin del restaurante
  let adminRestaurante = await prisma.usuario.findUnique({ where: { email: 'admin.restaurante@smartlining.com' } });
  if (!adminRestaurante) {
    adminRestaurante = await prisma.usuario.create({
      data: {
        nombre: 'Carlos Restaurante Admin',
        email: 'admin.restaurante@smartlining.com',
        password_hash: adminPassword,
        rol: 'ADMINISTRADOR' as any,
        licencia: 'RESTAURANTE' as any,
        id_empresa: empresaRestaurante.id_empresa,
      },
    });
  }
  console.log('👨‍💼  Admin restaurante:', adminRestaurante.email);

  // Camarero / Operador de restaurante
  let camarero1 = await prisma.usuario.findUnique({ where: { email: 'camarero1@smartlining.com' } });
  if (!camarero1) {
    camarero1 = await prisma.usuario.create({
      data: {
        nombre: 'Ana Camarera',
        email: 'camarero1@smartlining.com',
        password_hash: camareroPassword,
        rol: 'EMPLEADO' as any,
        licencia: 'RESTAURANTE' as any,
        id_empresa: empresaRestaurante.id_empresa,
      },
    });
  }
  console.log('🧑‍🍳  Camarero 1:', camarero1.email);

  let camarero2 = await prisma.usuario.findUnique({ where: { email: 'camarero2@smartlining.com' } });
  if (!camarero2) {
    camarero2 = await prisma.usuario.create({
      data: {
        nombre: 'Pedro Camarero',
        email: 'camarero2@smartlining.com',
        password_hash: camareroPassword,
        rol: 'EMPLEADO' as any,
        licencia: 'RESTAURANTE' as any,
        id_empresa: empresaRestaurante.id_empresa,
      },
    });
  }
  console.log('🧑‍🍳  Camarero 2:', camarero2.email);

  console.log(`🔑  Credenciales:`);
  console.log(`     Admin general:       admin@smartlining.com / admin123`);
  console.log(`     Admin restaurante:   admin.restaurante@smartlining.com / admin123`);
  console.log(`     Camarero 1:          camarero1@smartlining.com / camarero123`);
  console.log(`     Camarero 2:          camarero2@smartlining.com / camarero123`);

  // ========================================
  // CLIENTES DE PRUEBA
  // ========================================
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

  // ========================================
  // EMPLEADOS PARA ATENCIONES
  // ========================================
  const empleadoIds = [adminUser.id_usuario, empleadoUser.id_usuario];

  // ========================================
  // HISTORIAL DE TURNOS GENÉRICOS
  // ========================================
  const createTurno = async (
    colaId: number,
    clienteId: number,
    numero: number,
    estado: EstadoTurno,
    createdAt: Date,
    calledAt?: Date,
    startAt?: Date,
    endAt?: Date,
    numComensales?: number
  ) => {
    return prisma.turno.create({
      data: {
        id_cola: colaId,
        id_cliente: clienteId,
        numero_turno: numero,
        estado,
        num_comensales: numComensales ?? null,
        fecha_hora_creacion: createdAt,
        fecha_hora_llamada: calledAt ?? null,
        fecha_hora_inicio_atencion: startAt ?? null,
        fecha_hora_fin_atencion: endAt ?? null,
      },
    });
  };

  const DAYS = 14;
  let numeroCounter = (await prisma.turno.count()) + 1;
  const now = new Date();

  for (const q of createdQueues) {
    // Saltar historial del restaurante — solo genera historial genérico
    if (q.tipo === 'RESTAURANTE') continue;

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
          const empleadoId = empleadoIds.length ? empleadoIds[j % empleadoIds.length] : null;
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

  // ========================================
  // TURNOS DE HOY GENÉRICOS (mínimo 20)
  // ========================================
  const MIN_TODAY = 20;
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setUTCHours(23, 59, 59, 999);

  for (const q of createdQueues) {
    if (q.tipo === 'RESTAURANTE') continue;

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
          const empleadoId = empleadoIds.length ? empleadoIds[k % empleadoIds.length] : null;
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

  // ========================================
  // RESUMEN
  // ========================================
  console.log('\n✨ Seeding completado correctamente!');
  console.log('📊 Resumen:');
  const totalQueues = await prisma.cola.count();
  const totalMesasCount = await prisma.mesa.count();
  const totalClients = await prisma.cliente.count();
  const totalTurnos = await prisma.turno.count();
  const totalAtenciones = await prisma.atencion.count();
  console.log(`   • Colas: ${totalQueues}`);
  console.log(`   • Mesas: ${totalMesasCount}`);
  console.log(`   • Clientes: ${totalClients}`);
  console.log(`   • Turnos: ${totalTurnos}`);
  console.log(`   • Atenciones: ${totalAtenciones}`);
  console.log(`   • ID Cola restaurante: ${restauranteCola.id_cola}`);
}

main()
  .catch((e) => {
    console.error('❌ Error fatal:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
