import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Running database seeder...');

  const colaCount = await prisma.cola.count();
  if (colaCount > 0) {
    console.log('Database already has data (colas). Aborting seeder.');
    return;
  }

  // Create queues
  const queuesData = [
    { nombre: 'Atención al Cliente', descripcion: 'Cola principal para atención general de clientes', activa: true },
    { nombre: 'Cajas', descripcion: 'Cola de cajas para pago de servicios', activa: true },
    { nombre: 'Reclamos', descripcion: 'Cola para atención de reclamos y devoluciones', activa: true },
    { nombre: 'Carnicería', descripcion: 'Cola para acceder a la carniceria', activa: true },
  ];

  const createdQueues = [] as any[];
  for (const q of queuesData) {
    const created = await prisma.cola.create({ data: q });
    createdQueues.push(created);
  }
  console.log('Created queues:', createdQueues.map((c) => c.nombre).join(', '));

  // Create some clients
  const clients = [] as any[];
  for (let i = 1; i <= 12; i++) {
    const c = await prisma.cliente.create({ data: { nombre: `Cliente ${i}`, email: `cliente${i}@example.test` } });
    clients.push(c);
  }
  console.log('Created clients:', clients.length);

  // Helper to create a turno
  const createTurno = async (colaId: number, clienteId: number, numero: number, estado: string, createdAt: Date, calledAt?: Date, startAt?: Date, endAt?: Date) => {
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

  // Seed recent turnos and atenciones
  const now = new Date();
  let numeroCounter = 1;
  for (const q of createdQueues) {
    // create a few historical and recent turnos
    for (let d = 0; d < 12; d++) {
      // for each of last 12 days create 2-6 tickets
      const day = new Date(now);
      day.setDate(now.getDate() - d);
      const count = 2 + (d % 5);
      for (let j = 0; j < count; j++) {
        const createdAt = new Date(day);
        createdAt.setHours(9 + (j % 6), 0, 0, 0);
        const cliente = clients[(j + d) % clients.length];
        const estado = j % 3 === 0 ? 'FINALIZADO' : j % 3 === 1 ? 'EN_ATENCION' : 'EN_ESPERA';
        const turno = await createTurno(q.id_cola, cliente.id_cliente, numeroCounter++, estado, createdAt,
          estado !== 'EN_ESPERA' ? new Date(createdAt.getTime() + 5 * 60 * 1000) : undefined,
          estado === 'FINALIZADO' ? new Date(createdAt.getTime() + 6 * 60 * 1000) : undefined,
          estado === 'FINALIZADO' ? new Date(createdAt.getTime() + 12 * 60 * 1000) : undefined
        );

        // if finalized, create an atencion with duration
        if (estado === 'FINALIZADO') {
          const durSec = 300 + ((j + d) % 5) * 60; // 5-9 minutes
          await prisma.atencion.create({ data: { id_turno: turno.id_turno, id_empleado: 1, duracion_atencion: durSec } });
        }
      }
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error('Seeder error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
