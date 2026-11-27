'use client'

import { cn } from 'cn'
import { useAbiertoAlgunaVez } from '@/shared/ui/use-abierto-alguna-vez'
import { usePanelPorUrl } from '@/shared/ui/use-panel-por-url'
import { hayFiltrosDePlantillas, type PedidoDePlantillas } from '../../../entities/filtros'
import { PANEL_NUEVA_PLANTILLA } from '../../../entities/paneles'
import type { QuienMira } from '../../../entities/permisos-de-artes'
import type {
  OrigenDeArtes,
  PaginaDeArtes,
  PlantillaDeArte,
  PorDefecto,
} from '../../../entities/tipos'
import { useAccionesDeLasPlantillas } from '../hooks/use-acciones-de-las-plantillas'
import { useFiltrosDeArtes } from '../hooks/use-filtros-de-artes'
import { usePlantillas } from '../hooks/use-plantillas'
import { BarraDeFiltros } from './barra-de-filtros'
import {
  ConfirmarEliminarPlantillaDiferido,
  ConfirmarHacerlaPrivadaDiferido,
  ModalNuevaPlantillaDiferido,
} from './diferidos'
import { ListaDePlantillas } from './lista-de-plantillas'

// El del filtro si se puede crear en él; si no, el primero activo.
function origenInicial(origenes: readonly OrigenDeArtes[], filtrado: string | null): string {
  const activos = origenes.filter((o) => o.activo)
  return (activos.find((o) => o.id === filtrado) ?? activos[0])?.id ?? ''
}

type Props = {
  inicial: PaginaDeArtes<PlantillaDeArte>
  pedido: PedidoDePlantillas
  quien: QuienMira
  // Los orígenes donde quien mira ve cotizaciones: los del filtro y los de «Nueva plantilla».
  origenes: readonly OrigenDeArtes[]
  porDefecto: readonly PorDefecto[]
}

// La pestaña Plantillas de `/artes`: los filtros arriba, la rejilla con «Ver más» y lo que se abre encima por URL («Nueva plantilla» y las
// confirmaciones de eliminar y de hacer privada la de otra persona). La página le pone una `key` por filtros: otros filtros empiezan de cero.
export function PestanaDePlantillas({ inicial, pedido, quien, origenes, porDefecto }: Props) {
  const filtros = useFiltrosDeArtes()
  const plantillas = usePlantillas({ inicial, pedido })
  const acciones = useAccionesDeLasPlantillas({ quien, origenes, porDefecto, plantillas })
  const nueva = usePanelPorUrl(PANEL_NUEVA_PLANTILLA)
  const { confirmarEliminar, confirmarPrivada } = acciones
  const montarEliminar = useAbiertoAlgunaVez(confirmarEliminar.abierto)
  const montarPrivada = useAbiertoAlgunaVez(confirmarPrivada.abierto)
  const abrirNueva = () => {
    nueva.abrir()
  }
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      <BarraDeFiltros origenes={origenes} pedido={pedido} filtros={filtros} alCrear={abrirNueva} />
      <div
        aria-busy={filtros.pendiente}
        className={cn(
          'min-w-0 transition-opacity duration-(--dur-rapida)',
          filtros.pendiente && 'opacity-60',
        )}
      >
        <ListaDePlantillas
          plantillas={plantillas}
          acciones={acciones}
          yo={quien.yo}
          hayFiltros={hayFiltrosDePlantillas(pedido)}
          limpiar={filtros.limpiar}
          alCrear={abrirNueva}
        />
      </div>
      {nueva.abierto ? (
        <ModalNuevaPlantillaDiferido
          origenes={origenes}
          origenInicial={origenInicial(origenes, pedido.origenId)}
          alCerrar={nueva.cerrar}
        />
      ) : null}
      {montarEliminar ? (
        <ConfirmarEliminarPlantillaDiferido
          abierto={confirmarEliminar.abierto}
          alCerrar={confirmarEliminar.cerrar}
          plantilla={confirmarEliminar.plantilla}
          enCurso={acciones.eliminacion.enCurso}
          alEliminar={acciones.eliminacion.eliminar}
        />
      ) : null}
      {montarPrivada ? (
        <ConfirmarHacerlaPrivadaDiferido
          abierto={confirmarPrivada.abierto}
          alCerrar={confirmarPrivada.cerrar}
          plantilla={confirmarPrivada.plantilla}
          enCurso={acciones.visibilidad.enCurso}
          alHacerlaPrivada={(plantilla) =>
            acciones.visibilidad.cambiar(plantilla, 'privada', false)
          }
        />
      ) : null}
    </div>
  )
}
