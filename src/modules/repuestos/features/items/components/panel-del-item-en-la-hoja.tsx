'use client'

import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { SimbolosDeXCell } from '@/shared/ui/xcell'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { AvisoDeCerrado, AvisoDeConflictoDeLaHoja } from './avisos-de-la-hoja'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { FilaDelItem, TablaDeLaFila } from './fila-del-item'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // El ítem de `?item=` entre las filas vivas de la hoja; nulo si no está (otro proyecto por URL, o más allá del tope): el panel muestra sólo las secciones.
  fila: FilaDeItem | null
  // Las secciones que dibujó el servidor y de qué ítem son; el esqueleto mientras no sean las de este.
  secciones: { id: string; contenido: ReactNode } | null
  idAbierto: string | null
  contexto: ContextoDeLaHoja
  cerrado: boolean
  conflicto: string | null
  alRecargar: () => void
  focoAlCerrar: () => HTMLElement | true
}

// El panel del ítem en `/repuestos/[id]` (`?item=<id>`): un drawer de abajo con la fila del ítem como Excel, editable celda a celda, fija arriba y, debajo, sus secciones a la vista, que se
// desplazan. La fila usa el estado vivo de la hoja (`guardar`, errores, conflicto) y las secciones las lee el servidor (el hueco de la hoja). Alto: 60 % de la ventana en escritorio, con asa
// para agrandarlo; pantalla completa en el celular.
export function PanelDelItemEnLaHoja({
  abierto,
  alCerrar,
  fila,
  secciones,
  idAbierto,
  contexto,
  cerrado,
  conflicto,
  alRecargar,
  focoAlCerrar,
}: Props) {
  const ultimaFila = useUltimo(fila)
  const ultimoId = useUltimo(idAbierto)
  const ultimasSecciones = useUltimo(secciones)
  const vista = abierto ? fila : ultimaFila
  const contenido =
    ultimasSecciones !== null && ultimasSecciones.id === ultimoId ? (
      ultimasSecciones.contenido
    ) : (
      <EsqueletoListado filas={4} columnas={2} />
    )
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo={vista?.descripcion ?? 'Repuesto'}
      descripcion={
        vista === null
          ? 'El ítem y lo que falta o se hizo en su recorrido.'
          : (vista.fase?.nombre ?? 'Sin fase')
      }
      lado="bottom"
      alto="ajustable"
      desplazamiento="propio"
      focoAlCerrar={focoAlCerrar}
    >
      <div className="flex h-full min-h-0 flex-col gap-3">
        <SimbolosDeXCell />
        <div className="grid shrink-0 gap-2 empty:hidden">
          {cerrado ? <AvisoDeCerrado /> : null}
          {conflicto ? (
            <AvisoDeConflictoDeLaHoja mensaje={conflicto} alRecargar={alRecargar} />
          ) : null}
          {vista === null ? null : (
            <TablaDeLaFila>
              <FilaDelItem fila={vista} contexto={contexto} />
            </TablaDeLaFila>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{contenido}</div>
      </div>
    </Drawer>
  )
}
