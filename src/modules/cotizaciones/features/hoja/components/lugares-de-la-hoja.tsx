'use client'

import { useContext, useMemo, type ReactNode } from 'react'
import type { ContextoDeHoja } from '../../../entities/binding'
import type { SeccionDeHoja as Seccion } from '../../../entities/hoja'
import type { DeDondeCalcula } from '../../../entities/pedido-de-recalculo'
import { ordenDeLaHoja } from '../../../entities/presentacion-de-la-hoja'
import { useAyudaDeLaHoja } from '../hooks/use-ayuda-de-la-hoja'
import type { AccionesDeHoja } from '../hooks/use-hoja'
import { AvanzadoDeLaHoja } from './avanzado-de-la-hoja'
import { ContextoDelAjuste } from './hueco-del-ajuste'
import type { AjusteEnLaHoja } from './huecos'
import { LugarDeAyuda } from './lugar-de-ayuda'
import { LugarDelAjuste } from './lugar-del-ajuste'
import { LugaresConAjuste } from './lugares-con-ajuste'
import { SeccionDeHoja } from './seccion-de-hoja'

type Props = {
  // Las secciones que se dibujan, en el orden declarado.
  secciones: Seccion[]
  contexto: ContextoDeHoja
  acciones: AccionesDeHoja
  guardando: boolean
  // De dónde leen las tablas de la ayuda: de donde calcula esta hoja.
  de: DeDondeCalcula
  // La versión de la fórmula y «Recargar»: sólo los usa el ajuste de una celda, si un área llenó el hueco.
  formula: { id: string; version: number }
  alRecargar: () => void
  // El total suelto (sin la pieza en el diseño, o en par): a todo el ancho, justo encima de «Avanzado». Nulo, la pieza lo dibuja en su sección.
  totalSuelto?: ReactNode
  // El cierre de la hoja («Guardar», su motivo y la región viva del guardado): a todo el ancho, justo debajo de «Avanzado».
  cierre?: ReactNode
}

export type PropsDeLosLugares = Omit<Props, 'formula' | 'alRecargar'> & {
  // El ajuste de una celda (el ⚙) y su callback: nulo e indefinido sin proveedor.
  ajuste: AjusteEnLaHoja | null
  alAjustar: ((nodo: string) => void) | undefined
}

// Los lugares de la hoja con el ⚙ de las celdas si hay proveedor del ajuste (4.15-6a), o los de siempre sin él. El proveedor no cambia mientras la página vive.
export function LugaresDeLaHoja(props: Props) {
  const area = useContext(ContextoDelAjuste)
  if (area === null) {
    return <LugaresDibujados {...props} ajuste={null} alAjustar={undefined} />
  }
  return <LugaresConAjuste Ajuste={area.Ajuste} {...props} />
}

const A_TODO_EL_ANCHO = 'col-span-12 min-w-0'

// Las secciones principales en su orden, con «Avanzado» (el botón y su modal) donde estaba la primera avanzada, y la ayuda en bloques de sus celdas: quien guarda
// en la URL cuál se abre es la hoja, y el callback que reciben las celdas es uno solo (la `XCell` está en `memo`). El ajuste de una celda va en el mismo lugar que la ayuda:
// con las secciones principales aquí y con las avanzadas dentro del modal. El total suelto va justo encima de «Avanzado» y el cierre justo debajo, los dos a todo el ancho.
export function LugaresDibujados({
  secciones,
  contexto,
  acciones: deLaHoja,
  guardando,
  de,
  ajuste,
  alAjustar,
  totalSuelto = null,
  cierre = null,
}: PropsDeLosLugares) {
  // Mientras guarda, la hoja no se toca (`inert`): la ayuda, que va por un portal fuera de ella, tampoco escribe.
  const { ayuda, alAyudar } = useAyudaDeLaHoja(de, guardando ? undefined : deLaHoja.alAplicar)
  const acciones = useMemo(
    () => ({ ...deLaHoja, alAyudar, ...(alAjustar ? { alAjustar } : {}) }),
    [deLaHoja, alAyudar, alAjustar],
  )
  const lugares = ordenDeLaHoja(secciones, {
    totalSuelto: totalSuelto !== null,
    conCierre: cierre !== null,
  })
  const principales = secciones.filter((s) => s.presentacion !== 'avanzado')
  return (
    <>
      {lugares.map((lugar) => {
        switch (lugar.tipo) {
          case 'seccion':
            return (
              <SeccionDeHoja
                key={lugar.seccion.id}
                seccion={lugar.seccion}
                contexto={contexto}
                acciones={acciones}
                enLaRejilla
              />
            )
          case 'avanzado':
            return (
              <AvanzadoDeLaHoja
                key="avanzado"
                secciones={lugar.secciones}
                contexto={contexto}
                acciones={acciones}
                guardando={guardando}
                ayuda={ayuda}
                ajuste={ajuste}
              />
            )
          case 'total':
            return (
              <div key="total" className={A_TODO_EL_ANCHO}>
                {totalSuelto}
              </div>
            )
          case 'cierre':
            return (
              <div key="cierre" className={A_TODO_EL_ANCHO}>
                {cierre}
              </div>
            )
        }
      })}
      <LugarDeAyuda secciones={principales} contexto={contexto} ayuda={ayuda} />
      {ajuste ? (
        <LugarDelAjuste secciones={principales} contexto={contexto} ajuste={ajuste} />
      ) : null}
    </>
  )
}
