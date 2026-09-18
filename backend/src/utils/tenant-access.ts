import prisma from '../config/prisma';

/**
 * Comprueba que el usuario autenticado tiene acceso a la cola indicada
 * (mismo tenant). Devuelve true si tiene acceso, false si no o no autenticado.
 */
export async function puedeAccederACola(colaId: number, idEmpresa: number | undefined): Promise<boolean> {
  if (!idEmpresa) return false;
  const cola = await prisma.cola.findUnique({ where: { id_cola: colaId } });
  return !!cola && cola.id_empresa === idEmpresa;
}

/**
 * Comprueba que el usuario autenticado tiene acceso a la mesa indicada
 * (misma empresa/tenant que la cola a la que pertenece).
 */
export async function puedeAccederAMesa(mesaId: number, idEmpresa: number | undefined): Promise<boolean> {
  if (!idEmpresa) return false;
  const mesa = await prisma.mesa.findUnique({ where: { id_mesa: mesaId } });
  if (!mesa) return false;
  const cola = await prisma.cola.findUnique({ where: { id_cola: mesa.id_cola } });
  return !!cola && cola.id_empresa === idEmpresa;
}

/**
 * Comprueba que el usuario puede acceder a una zona (misma empresa que su cola).
 */
export async function puedeAccederAZona(zonaId: number, idEmpresa: number | undefined): Promise<boolean> {
  if (!idEmpresa) return false;
  const zona = await prisma.zona.findUnique({ where: { id_zona: zonaId } });
  if (!zona) return false;
  const cola = await prisma.cola.findUnique({ where: { id_cola: zona.id_cola } });
  return !!cola && cola.id_empresa === idEmpresa;
}