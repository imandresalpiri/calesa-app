'use client'

import type { ReactNode } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { EsqueletoListado } from '@/shared/ui/esqueletos'
import { useUltimo } from '@/shared/ui/use-ultimo'
import { SimbolosDeXCell, XCELL_COMPACTA } from '@/shared/ui/xcell'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { AvisoDeCerrado, AvisoDeConflictoDeLaHoja } from './avisos-de-la-hoja'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { ContextoDelItemAbierto, type ItemAbiertoEnLaHoja } from './contexto-del-item-abierto'
import type { HuecoDeLaHoja } from './hueco-de-la-hoja'

type Props = {
  abierto: boolean
  // El hueco de la hoja: su `item` (cerrar y las secciones que dibujó el servidor) y `pasoDeFila` (el botón del siguiente de ese ítem, que pone `src/app`).
  hueco: HuecoDeLaHoja
  // El ítem de `?item=` entre las filas vivas de la hoja; nulo si no está (otro proyecto por URL, o más allá del tope): el panel muestra sólo lo que lee el servidor.
  fila: FilaDeItem | null
  idAbierto: string | null
  contexto: ContextoDeLaHoja
  cerrado: boolean
  conflicto: string | null
  alRecargar: () => void
  focoAlCerrar: () => HTMLElement | true
}

// Lo que dibujó el servidor, si es el del ítem abierto; mientras llega otro, el esqueleto.
function contenidoDelServidor(
  secciones: { id: string; contenido: ReactNode } | null,
  id: string | null,
): ReactNode {
  return secciones !== null && secciones.id === id ? (
    secciones.contenido
  ) : (
    <EsqueletoListado filas={4} columnas={2} />
  )
}

// El panel del ítem en `/repuestos/[id]` (`?item=<id>`): un drawer de abajo con el ítem en dos columnas (izquierda lo del ítem, derecha sus tarjetas), que dibuja el servidor. Lo vivo de la hoja
// (la fila, el guardado, el conflicto, el botón del siguiente) llega a la columna izquierda por contexto: lo editado se ve sin releer. El título es qué es el ítem («Tipo · Condición» o su
// descripción). Alto: 60 % de la ventana en escritorio, con asa para agrandarlo; pantalla completa en el celular.
export function PanelDelItemEnLaHoja({
  abierto,
  hueco,
  fila,
  idAbierto,
  contexto,
  cerrado,
  conflicto,
  alRecargar,
  focoAlCerrar,
}: Props) {
  const ultimaFila = useUltimo(fila)
  const ultimoId = useUltimo(idAbierto)
  const ultimasSecciones = useUltimo(hueco.item.secciones)
  const vista = abierto ? fila : ultimaFila
  const contenido = contenidoDelServidor(ultimasSecciones, ultimoId)
  const delItem: ItemAbiertoEnLaHoja = {
    fila: vista,
    contexto,
    cerrado,
    conflicto,
    alRecargar,
    paso: vista === null ? null : (hueco.pasoDeFila?.(vista) ?? null),
  }
  return (
    <Drawer
      abierto={abierto}
      alCerrar={hueco.item.cerrar}
      titulo={vista?.descripcion ?? 'Repuesto'}
      lado="bottom"
      alto="ajustable"
      desplazamiento="propio"
      focoAlCerrar={focoAlCerrar}
    >
      <ContextoDelItemAbierto value={delItem}>
        <div className={`flex h-full min-h-0 flex-col gap-3 overflow-y-auto ${XCELL_COMPACTA}`}>
          <SimbolosDeXCell />
          {cerrado || conflicto ? (
            <div className="grid shrink-0 gap-2">
              {cerrado ? <AvisoDeCerrado /> : null}
              {conflicto ? (
                <AvisoDeConflictoDeLaHoja mensaje={conflicto} alRecargar={alRecargar} />
              ) : null}
            </div>
          ) : null}
          {contenido}
        </div>
      </ContextoDelItemAbierto>
    </Drawer>
  )
}
