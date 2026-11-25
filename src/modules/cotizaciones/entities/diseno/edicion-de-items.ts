// Editar los ítems del diseño que no son una celda de valor (4.22-3): los atajos (columna y filas) y el efecto de un interruptor (la ayuda de una celda, en
// `edicion-de-la-ayuda.ts`). Variante y subtotal no tienen más campo que su nodo: no hay qué editar. Nada muta lo que recibe; lo que `validarDiseno()` rechaza
// tras un cambio queda aplicado y lo dice el editor.
import {
  EFECTOS_DE_INTERRUPTOR,
  MAXIMO_DE_ATAJOS,
  type Diseno,
  type ItemDeDiseno,
  type PiezaEnLaSeccion,
  esLaPieza,
} from '../diseno'
import type { NodosPorId } from './admite-nivel'
import { conSeccion } from './edicion-del-diseno'

// Cambia la primera pieza así en la sección (`esLaPieza`).
export function enItem(
  diseno: Diseno,
  donde: PiezaEnLaSeccion & { seccion: string },
  cambiar: (item: ItemDeDiseno) => ItemDeDiseno,
): Diseno {
  return conSeccion(diseno, donde.seccion, (s) => {
    let hecho = false
    return {
      ...s,
      items: s.items.map((it) => {
        if (hecho || !esLaPieza(it, donde)) return it
        hecho = true
        return cambiar(it)
      }),
    }
  })
}

// `filas` se acota a 1..12 (un valor que no es número deja el diseño igual); la columna es sólo la clave.
export function ponerAtajos(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  cambios: { columna?: string; filas?: number },
): Diseno {
  const filas =
    cambios.filas === undefined || !Number.isFinite(cambios.filas)
      ? undefined
      : Math.min(MAXIMO_DE_ATAJOS, Math.max(1, Math.trunc(cambios.filas)))
  if (cambios.filas !== undefined && filas === undefined && cambios.columna === undefined) {
    return diseno
  }
  return enItem(diseno, { seccion: seccionId, tipo: 'atajos', nodo: nodoId }, (it) =>
    it.tipo === 'atajos'
      ? {
          ...it,
          ...(cambios.columna === undefined ? {} : { columna: cambios.columna }),
          ...(filas === undefined ? {} : { filas }),
        }
      : it,
  )
}

// Las columnas que la base permite para unos atajos: las claves de `match` del nodo `tabla` y su `columna`; la actual siempre va, para verla aunque venga de otro lado.
export function columnasParaAtajos(nodos: NodosPorId, nodoId: string, actual: string): string[] {
  const nodo = nodos.get(nodoId)
  const propias = nodo?.tipo === 'tabla' ? [...Object.keys(nodo.match), nodo.columna] : []
  return [...new Set([...propias, actual])]
}

export function ponerEfecto(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  efecto: (typeof EFECTOS_DE_INTERRUPTOR)[number],
): Diseno {
  if (!EFECTOS_DE_INTERRUPTOR.includes(efecto)) return diseno
  return enItem(diseno, { seccion: seccionId, tipo: 'interruptor', nodo: nodoId }, (it) =>
    it.tipo === 'interruptor' ? { ...it, efecto } : it,
  )
}
