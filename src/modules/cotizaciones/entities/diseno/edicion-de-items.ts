// Editar los ítems del diseño que no son una celda de valor (4.22-3): los atajos (columna y filas), el efecto de un interruptor y la ayuda de una celda. Variante y
// subtotal no tienen más campo que su nodo: no hay qué editar. Nada muta lo que recibe; lo que `validarDiseno()` rechaza tras un cambio queda aplicado y lo dice el editor.
import {
  EFECTOS_DE_INTERRUPTOR,
  MAXIMO_DE_ATAJOS,
  MAXIMO_DE_ENLACES,
  MAXIMO_DE_LA_URL_DEL_ENLACE,
  MAXIMO_DEL_TITULO_DEL_ENLACE,
  URL_DE_ENLACE,
  type CeldaDeDiseno,
  type Diseno,
  type EnlaceDeAyuda,
  type ItemDeDiseno,
  type PiezaEnLaSeccion,
  esLaPieza,
} from '../diseno'
import type { Definicion } from '../formula'
import type { NodosPorId } from './admite-nivel'
import { conSeccion } from './edicion-del-diseno'

export const MAXIMO_DE_LA_AYUDA = 300

export type AyudaDeCelda = Exclude<NonNullable<CeldaDeDiseno['ayuda']>, readonly unknown[]>

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

// La ayuda es una tabla o un texto (con sus enlaces), no las dos: escribir una quita la otra; vacía, de blancos, sin tabla o `null` quita la clave (los enlaces piden
// texto: se van con él). Un texto más largo se corta. Escribir el texto conserva los enlaces que ya tenía.
export function ponerAyuda(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  ayuda: AyudaDeCelda | null,
): Diseno {
  const limpia = ((): AyudaDeCelda | null => {
    if (ayuda === null) return null
    if ('tabla' in ayuda) return ayuda.tabla === '' ? null : { tabla: ayuda.tabla }
    // Sin `trim()`: el texto se escribe letra a letra y un espacio al final es el de la palabra que sigue. Sólo blancos = sin ayuda.
    const texto = Array.from(ayuda.texto).slice(0, MAXIMO_DE_LA_AYUDA).join('')
    return texto.trim() === ''
      ? null
      : { texto, ...(ayuda.enlaces ? { enlaces: ayuda.enlaces } : {}) }
  })()
  return enItem(diseno, { seccion: seccionId, tipo: 'celda', nodo: nodoId }, (it) => {
    if (it.tipo !== 'celda') return it
    const { ayuda: anterior, ...resto } = it
    if (limpia === null) return resto
    const enlaces =
      anterior !== undefined && !Array.isArray(anterior) && 'texto' in anterior
        ? anterior.enlaces
        : undefined
    return {
      ...resto,
      ayuda:
        'texto' in limpia && limpia.enlaces === undefined && enlaces
          ? { ...limpia, enlaces }
          : limpia,
    }
  })
}

// Cambia los enlaces de la ayuda de texto de una celda (sin ayuda de texto no hay enlaces que tocar); sin ninguno, la clave se va.
function conEnlaces(
  diseno: Diseno,
  seccionId: string,
  nodoId: string,
  cambiar: (enlaces: readonly EnlaceDeAyuda[]) => EnlaceDeAyuda[],
): Diseno {
  return enItem(diseno, { seccion: seccionId, tipo: 'celda', nodo: nodoId }, (it) => {
    if (it.tipo !== 'celda' || it.ayuda === undefined || Array.isArray(it.ayuda)) return it
    if (!('texto' in it.ayuda)) return it
    const { enlaces: antes, ...texto } = it.ayuda
    const despues = cambiar(antes ?? [])
    return { ...it, ayuda: despues.length === 0 ? texto : { ...texto, enlaces: despues } }
  })
}

// «Agregar enlace»: uno vacío al final, hasta `MAXIMO_DE_ENLACES`.
export const sumarEnlace = (diseno: Diseno, seccionId: string, nodoId: string): Diseno =>
  conEnlaces(diseno, seccionId, nodoId, (enlaces) =>
    enlaces.length >= MAXIMO_DE_ENLACES ? [...enlaces] : [...enlaces, { titulo: '', url: '' }],
  )

// El enlace en `posicion` de la ayuda de la celda `nodo` de la sección `seccion`.
export type DondeDelEnlace = { seccion: string; nodo: string; posicion: number }

export const ponerEnlace = (
  diseno: Diseno,
  donde: DondeDelEnlace,
  cambios: Partial<EnlaceDeAyuda>,
): Diseno =>
  conEnlaces(diseno, donde.seccion, donde.nodo, (enlaces) =>
    enlaces.map((e, i) => (i === donde.posicion ? { ...e, ...cambios } : e)),
  )

export const quitarEnlace = (diseno: Diseno, donde: DondeDelEnlace): Diseno =>
  conEnlaces(diseno, donde.seccion, donde.nodo, (enlaces) =>
    enlaces.filter((_, i) => i !== donde.posicion),
  )

// Lo que se dice junto al campo de un enlace mientras se tipea (el espejo de la forma y de `ayuda_enlace_no_https`); nada si vale.
export function rechazoDelEnlace(enlace: EnlaceDeAyuda): { titulo?: string; url?: string } {
  const largoDelTitulo = Array.from(enlace.titulo).length
  const titulo =
    largoDelTitulo === 0
      ? 'Escribe un título.'
      : largoDelTitulo > MAXIMO_DEL_TITULO_DEL_ENLACE
        ? `Hasta ${String(MAXIMO_DEL_TITULO_DEL_ENLACE)} caracteres.`
        : undefined
  const url = !enlace.url.startsWith('https://')
    ? 'Tiene que empezar con https://.'
    : Array.from(enlace.url).length > MAXIMO_DE_LA_URL_DEL_ENLACE
      ? `Hasta ${String(MAXIMO_DE_LA_URL_DEL_ENLACE)} caracteres.`
      : !URL_DE_ENLACE.test(enlace.url)
        ? 'No puede llevar espacios ni tildes.'
        : undefined
  return { ...(titulo ? { titulo } : {}), ...(url ? { url } : {}) }
}

// Las tablas de referencia que nombran los nodos de la fórmula, en orden de aparición y sin repetir; la actual siempre va.
export function tablasParaAyuda(definicion: Definicion, actual?: string): string[] {
  const nombres = new Set<string>()
  for (const n of definicion.nodos) {
    if (n.tipo === 'tabla' || n.tipo === 'tramo') nombres.add(n.tabla)
    else if (n.tipo === 'calculo' && n.op === 'depreciar') nombres.add(n.tabla)
  }
  if (actual !== undefined) nombres.add(actual)
  return [...nombres]
}
