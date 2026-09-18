import { Mesa } from './index';

/**
 * Grupo de mesas juntadas agrupado como una única "mesa" para la galería
 * y para la asignación de turnos.
 */
export interface MesaGrupoAgrupado {
  id_grupo: number;
  numero: number;
  capacidad_total: number;
  mesas: Mesa[];
  miembroOcupado: boolean;
  disponible: boolean;
  representante: Mesa;
}

/**
 * Agrupa las mesas de una cola por su grupo juntado. Devolvemos un elemento
 * por grupo, de modo que el grupo actúa como una única mesa de cara a la
 * galería y a la asignación.
 */
export function agruparMesasJuntadas(mesas: Mesa[]): MesaGrupoAgrupado[] {
  const map = new Map<number, MesaGrupoAgrupado>();
  for (const m of mesas) {
    if (!m.grupo) continue;
    let g = map.get(m.grupo.id_grupo);
    if (!g) {
      g = {
        id_grupo: m.grupo.id_grupo,
        numero: m.grupo.numero,
        capacidad_total: m.grupo.capacidad_total,
        mesas: [],
        miembroOcupado: false,
        disponible: true,
        representante: m,
      };
      map.set(m.grupo.id_grupo, g);
    }
    g.mesas.push(m);
    if (m.estado === 'OCUPADA') g.miembroOcupado = true;
    if (m.estado === 'RESERVADA') g.disponible = false;
    // Representante: preferimos la mesa ocupada (la que sirve al grupo)
    if (m.estado === 'OCUPADA') g.representante = m;
  }
  return Array.from(map.values());
}

/** IDs de las mesas que pertenecen a algún grupo juntado. */
export function estanEnGrupo(mesas: Mesa[]): Set<number> {
  const set = new Set<number>();
  for (const m of mesas) {
    if (m.grupo) set.add(m.id_mesa);
  }
  return set;
}
