'use client'

import { MasAcciones } from '@/shared/ui/lista'
import {
  despuesDeAlMover,
  motivoSinMover,
  type DireccionDeFase,
} from '../../../entities/fases/orden-de-fases'
import type { FaseParaConfigurar, FlujoParaConfigurar } from '../../../entities/flujo'
import {
  MOTIVO_SIN_ORDEN_AQUI,
  useOrdenDeFases,
} from '../../configuracion/hooks/use-orden-de-fases'
import { useAbrirEliminarFase } from '../hooks/use-eliminar-fase-por-url'
import { accionesDelPanelDeFase } from './acciones-de-fase'

type Props = { flujo: FlujoParaConfigurar; fase: FaseParaConfigurar }

// El hueco `bloques.acciones`, el «⋯» arriba a la derecha del panel de una fase (lo pone el `<Drawer>` junto a la ✕): «Mover antes», «Mover después» y, en una
// activa, «Jubilar o eliminar» (la confirmación por URL que monta la barra). Apagadas, con el motivo en texto junto a cada una. El «⋯» no cambia de lugar cuando
// llega el orden nuevo y el menú le devuelve el foco al cerrarse: el foco sigue en él. Una jubilada se reactiva desde su aviso.
export function AccionesDelPanel({ flujo, fase }: Props) {
  const orden = useOrdenDeFases()
  const abrirQuitar = useAbrirEliminarFase()
  const general = orden === null ? MOTIVO_SIN_ORDEN_AQUI : orden.motivo
  const motivoDe = (direccion: DireccionDeFase) =>
    general ?? motivoSinMover(flujo.fases, fase.id, direccion)

  async function mover(direccion: DireccionDeFase) {
    const destino = despuesDeAlMover(flujo.fases, fase.id, direccion)
    // En curso sólo no responde: una escritura a la vez.
    if (destino === null || orden === null || orden.enCurso) {
      return
    }
    await orden.mover(fase.id, destino.despuesDe)
  }

  return (
    <MasAcciones
      nombre={fase.nombre}
      id={`fase-del-panel-${fase.id}-mas`}
      acciones={accionesDelPanelDeFase(fase, {
        alMover: (direccion) => void mover(direccion),
        alPedirQuitar: () => {
          abrirQuitar(fase.id)
        },
        motivoSinMover: { subir: motivoDe('subir'), bajar: motivoDe('bajar') },
      })}
    />
  )
}
