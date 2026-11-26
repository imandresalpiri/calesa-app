// Cómo dibuja la hoja cada rejilla con posiciones (docs/GLOSARIO.md › «Posición (en la rejilla)», docs/DECISIONES.md › «La hoja en una rejilla libre»):
// desde el corte de su pieza más exigente cada pieza va en su lugar, y la rejilla declara sus filas (`auto` la ocupada, `ALTO_DE_UNA_FILA_VACIA` la que
// no). Se calcula con las piezas que llegaron de la base, después del nivel (lo que esconde deja su lugar vacío) y antes de las condiciones (lo que una
// condición apaga queda `auto` y colapsa). Si a alguna pieza le falta la posición (una hoja de prueba), nulo: el flujo de siempre. Puro, sin Zod.
import type { ItemDeHoja, SeccionDeHoja } from './hoja'
import {
  COLUMNAS_DE_LA_REJILLA,
  columnasDeLaCelda,
  corteDe,
  corteDeLaRejilla,
  pistasDeLasFilas,
  SECCION_AUTOMATICA,
  ultimaFila,
  type Corte,
  type PiezaEnLaRejilla,
} from './rejilla-de-la-hoja'

// Una rejilla que dibuja posiciones: desde qué corte y sus pistas de filas (el texto de `grid-template-rows`).
export type RejillaDibujada = { corte: Corte | 'siempre'; filas: string }
// La de las secciones, con la fila del bloque del avanzado (docs/GLOSARIO.md › «Bloque del avanzado»).
export type RejillaDeLasSecciones = RejillaDibujada & { filaDelBloque: number }

// Las columnas de un ítem: la celda, con nombre o en número; los demás, toda la fila si no dicen.
export const columnasDelItem = (item: ItemDeHoja): number =>
  item.tipo === 'celda' ? columnasDeLaCelda(item.ancho) : (item.ancho ?? COLUMNAS_DE_LA_REJILLA)

const piezaDelItem = (item: ItemDeHoja): PiezaEnLaRejilla | null =>
  item.posicion === undefined
    ? null
    : { posicion: item.posicion, ancho: columnasDelItem(item), alto: item.alto ?? 1 }

// Lo que la rejilla de las secciones lee de cada una (la de la hoja y la del lienzo del editor).
type LugarDeLaSeccion = Pick<SeccionDeHoja, 'presentacion' | 'posicion' | 'ancho' | 'alto'>

// Una sección sin ancho es «Automática»: mide 6 columnas y las toma desde `5xl`.
const piezaDeLaSeccion = (s: LugarDeLaSeccion): PiezaEnLaRejilla | null =>
  s.posicion === undefined
    ? null
    : { posicion: s.posicion, ancho: s.ancho ?? SECCION_AUTOMATICA.columnas, alto: s.alto ?? 1 }

const corteDeLaSeccion = (s: LugarDeLaSeccion) =>
  s.ancho === undefined ? SECCION_AUTOMATICA.corte : corteDe(s.ancho)

// Las piezas de una lista, o nulo si está vacía o a alguna le falta la posición.
function piezasDe<T>(
  lista: readonly T[],
  pieza: (x: T) => PiezaEnLaRejilla | null,
): PiezaEnLaRejilla[] | null {
  const salida: PiezaEnLaRejilla[] = []
  for (const x of lista) {
    const p = pieza(x)
    if (p === null) return null
    salida.push(p)
  }
  return salida.length === 0 ? null : salida
}

// Una celda o un subtotal que en una hoja en par va en dos (glosario: «Variante en par»).
const vaEnDos = (item: ItemDeHoja): boolean =>
  (item.tipo === 'celda' || item.tipo === 'subtotal') && item.enPar === true

// La rejilla de las celdas de una sección, con todos sus ítems (también los que una condición apaga). En una hoja en par, una sección con un ítem que va en dos
// dibuja en orden de lectura: los dos hermanos no caben en el lugar de uno.
export function rejillaDeLosItems(
  items: readonly ItemDeHoja[],
  { enPar = false }: { enPar?: boolean } = {},
): RejillaDibujada | null {
  if (enPar && items.some(vaEnDos)) return null
  const piezas = piezasDe(items, piezaDelItem)
  return piezas === null ? null : rejillaDeLasPiezas(piezas)
}

// La rejilla de unas piezas ya medidas; `extra` suma sus filas sin pesar en el corte (el «+» del lienzo del editor, en su fila). Nula sin piezas.
export function rejillaDeLasPiezas(
  piezas: readonly PiezaEnLaRejilla[],
  extra: readonly PiezaEnLaRejilla[] = [],
): RejillaDibujada | null {
  if (piezas.length === 0) return null
  return {
    corte: corteDeLaRejilla(piezas.map((p) => corteDe(p.ancho))),
    filas: pistasDeLasFilas([...piezas, ...extra]),
  }
}

// La rejilla de las secciones principales y el bloque del avanzado: el bloque va en su fila (`avanzado.fila`) o, sin ella, debajo de la última, y ocupa
// la fila entera sólo si se dibuja (`hayBloque`: avanzadas, el total suelto o el cierre). Sin principales, nulo: el bloque solo, en el flujo.
export function rejillaDeLasSecciones(
  todas: readonly LugarDeLaSeccion[],
  { avanzado, hayBloque }: { avanzado?: { fila: number }; hayBloque: boolean },
): RejillaDeLasSecciones | null {
  const principales = todas.filter((s) => s.presentacion !== 'avanzado')
  const piezas = piezasDe(principales, piezaDeLaSeccion)
  if (piezas === null) return null
  const filaDelBloque = avanzado?.fila ?? ultimaFila(piezas) + 1
  const bloque = hayBloque
    ? [{ posicion: { columna: 1, fila: filaDelBloque }, ancho: COLUMNAS_DE_LA_REJILLA, alto: 1 }]
    : []
  return {
    corte: corteDeLaRejilla(principales.map(corteDeLaSeccion)),
    filas: pistasDeLasFilas([...piezas, ...bloque]),
    filaDelBloque,
  }
}
