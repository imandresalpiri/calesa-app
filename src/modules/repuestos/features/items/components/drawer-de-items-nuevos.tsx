'use client'

import { useMemo } from 'react'
import { Drawer } from '@/shared/ui/drawer'
import { SimbolosDeXCell, XCELL_COMPACTA } from '@/shared/ui/xcell'
import type { FilaDeItem } from '../../../entities/nucleo/item'
import { AvisoDeConflictoDeLaHoja, AvisoDeTopeDeLaHoja } from './avisos-de-la-hoja'
import type { ContextoDeLaHoja } from './contexto-de-la-hoja'
import { FilaDelItem, TablaDeLaFila } from './fila-del-item'
import { FilaNueva } from './fila-nueva'

type Props = {
  abierto: boolean
  alCerrar: () => void
  // Cada apertura empieza vacía (el drawer no guarda lo anterior).
  apertura: number
  // Las filas vivas de la hoja y los ids de las que se agregaron en esta apertura: se muestran como filas editables.
  filas: readonly FilaDeItem[]
  ids: readonly string[]
  contexto: ContextoDeLaHoja
  alAgregar: (id: string, descripcion: string) => Promise<string | null>
  // La hoja llegó a su tope: ya no cabe otra fila nueva.
  llena: boolean
  conflicto: string | null
  alRecargar: () => void
  focoAlCerrar: () => HTMLElement | true
}

// «Agregar ítems» (`?panel=nuevo-item`): un drawer de abajo con la fila del ítem como Excel. Se escribe la descripción y Enter crea el ítem (queda arriba, editable celda a celda) y deja otra
// fila nueva lista: así se cargan varios seguidos con el teclado. Sólo se crea con descripción; cerrar con algo escrito sin agregar pregunta. Las filas agregadas usan el estado vivo de la hoja.
export function DrawerDeItemsNuevos({
  abierto,
  alCerrar,
  apertura,
  filas,
  ids,
  contexto,
  alAgregar,
  llena,
  conflicto,
  alRecargar,
  focoAlCerrar,
}: Props) {
  const agregadas = useMemo(() => {
    const porId = new Map(filas.map((fila) => [fila.id, fila]))
    return ids.flatMap((id) => porId.get(id) ?? [])
  }, [filas, ids])
  return (
    <Drawer
      abierto={abierto}
      alCerrar={alCerrar}
      titulo="Agregar ítems"
      descripcion="Escribe la descripción y pulsa Enter: se crea el ítem y queda otra fila lista."
      lado="bottom"
      alto="ajustable"
      focoAlCerrar={focoAlCerrar}
    >
      <div className={`grid min-w-0 gap-3 ${XCELL_COMPACTA}`}>
        <SimbolosDeXCell />
        {conflicto ? (
          <AvisoDeConflictoDeLaHoja mensaje={conflicto} alRecargar={alRecargar} />
        ) : null}
        <TablaDeLaFila>
          {agregadas.map((fila) => (
            <FilaDelItem key={fila.id} fila={fila} contexto={contexto} />
          ))}
          {llena ? null : (
            <tr data-fila-de-item="nueva">
              <td colSpan={8} className="px-2 py-1.5">
                <FilaNueva key={apertura} alAgregar={alAgregar} />
              </td>
            </tr>
          )}
        </TablaDeLaFila>
        {llena ? <AvisoDeTopeDeLaHoja /> : null}
      </div>
    </Drawer>
  )
}
