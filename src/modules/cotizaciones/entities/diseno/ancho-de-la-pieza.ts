// El ancho de una pieza en columnas de la rejilla (docs/GLOSARIO.md › «Rejilla de la hoja»), como lo cambian el borde y Alt+Shift+←/→ en el editor de la
// hoja: crece hasta toparse con la vecina o el borde (`tamanoQueEntra()`), nunca la empuja. Puras.
import { COLUMNAS_DE_LA_REJILLA, type ClaveDePieza, type Diseno } from '../diseno'
import { anchoEfectivoDelItem } from '../diseno-en-rejilla'
import { piezaDelItemDeLaHoja } from './pieza-de-la-hoja'
import { ponerTamano } from './tamano-en-la-rejilla'

// Una celda siempre lleva su ancho (con nombre o en columnas); las demás piezas, sin ancho, ocupan la fila entera.
export const columnasDe = anchoEfectivoDelItem

export const acotarColumnas = (n: number): number =>
  Math.max(1, Math.min(COLUMNAS_DE_LA_REJILLA, Math.round(n)))

// De 1 a 12 y lo que entra sin pisar a la vecina; en lo que no es celda, 12 quita la clave (lo de siempre).
export const ponerColumnas = (d: Diseno, clave: ClaveDePieza, columnas: number): Diseno =>
  ponerTamano(d, piezaDelItemDeLaHoja(clave), { ancho: acotarColumnas(columnas) })

// Las columnas que deja el borde arrastrado: lo que mide la pieza desde su inicio hasta el puntero, en columnas de su rejilla (redondeado, de 1 a 12).
// `anchoDeLaRejilla` es el de la rejilla de su sección; un ancho que no se pudo medir deja las de antes.
export function columnasPorBorde(
  desdeElInicio: number,
  anchoDeLaRejilla: number,
  antes: number,
): number {
  if (!(anchoDeLaRejilla > 0) || !Number.isFinite(desdeElInicio)) return antes
  return acotarColumnas((desdeElInicio / anchoDeLaRejilla) * COLUMNAS_DE_LA_REJILLA)
}

export const textoDeLasColumnas = (n: number) => `${String(n)}/${String(COLUMNAS_DE_LA_REJILLA)}`
