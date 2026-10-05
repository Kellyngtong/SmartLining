import React, { useMemo } from 'react';
import { Mesa } from '../../models';
import MesaCard from './MesaCard';
import MesaGrupoCard from './MesaGrupoCard';
import { agruparMesasJuntadas, estanEnGrupo } from '../../models/mesaGrupos';
import { OcupanteInfo } from '../../types';
import '../../styles/restaurant.css';

interface MesaGridProps {
  mesas: Mesa[];
  onMesaClick?: (mesa: Mesa) => void;
  onLiberar?: (mesa: Mesa) => void;
  onJuntar?: (mesa: Mesa) => void;
  onEliminar?: (mesa: Mesa) => void;
  selectedMesaId?: number | null;
  ocupacion?: Record<number, OcupanteInfo>;
}

const MesaGrid: React.FC<MesaGridProps> = ({ mesas, onMesaClick, onLiberar, onJuntar, onEliminar, selectedMesaId, ocupacion }) => {
  const grupos = useMemo(() => agruparMesasJuntadas(mesas), [mesas]);
  const enGrupo = useMemo(() => estanEnGrupo(mesas), [mesas]);
  const mesasIndividuales = mesas.filter(m => !enGrupo.has(m.id_mesa));

  return (
    <div className="mesa-grid">
      {grupos.map(grupo => (
        <MesaGrupoCard
          key={grupo.id_grupo}
          grupo={grupo}
          onLiberar={grupo.miembroOcupado && onLiberar ? () => onLiberar(grupo.representante) : undefined}
          selected={selectedMesaId != null && grupo.mesas.some(m => m.id_mesa === selectedMesaId)}
          ocupante={ocupacion ? grupo.mesas.map(m => ocupacion[m.id_mesa]).find(Boolean) ?? null : null}
        />
      ))}
      {mesasIndividuales.map(mesa => (
        <MesaCard
          key={mesa.id_mesa}
          mesa={mesa}
          onClick={onMesaClick}
          onLiberar={onLiberar}
          onJuntar={onJuntar}
          onEliminar={onEliminar}
          selected={selectedMesaId === mesa.id_mesa}
          ocupante={ocupacion?.[mesa.id_mesa] ?? null}
        />
      ))}
    </div>
  );
};

export default MesaGrid;
