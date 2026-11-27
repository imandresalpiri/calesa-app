// Cambiar el tamaño de una pieza con Alt+Shift+flechas o con su borde en el editor de la hoja (docs/UX.md › «Cotización: hoja (estados propios)»): crece lo
// que entra sin empujar a nadie (`tamanoQueEntra()`) y se anuncia lo que mide o por qué no cambió. Puras.
import { COLUMNAS_DE_LA_REJILLA, type Diseno } from '../diseno'
import { MAXIMO_DE_FILAS } from '../rejilla-de-la-hoja'
import { LA_ULTIMA_FILA, type Nombrar } from './anuncios-de-la-rejilla'
import { lugarDe, type Tamano } from './lugar-en-la-rejilla'
import type { PiezaDeLaHoja } from './pieza-de-la-hoja'
import { ponerTamano, tamanoQueEntra, type Tope } from './tamano-en-la-rejilla'

export const EL_BLOQUE_OCUPA_LA_FILA = '«Avanzado» ocupa la fila entera.'
export const LAS_AVANZADAS_VAN_A_LO_ANCHO = 'Las secciones de «Avanzado» van a todo el ancho.'

export const enColumnas = (n: number) => (n === 1 ? '1 columna' : `${String(n)} columnas`)
export const enFilas = (n: number) => (n === 1 ? '1 fila' : `${String(n)} filas`)

const conMayuscula = (t: string) => `${t.charAt(0).toUpperCase()}${t.slice(1)}`

// «Precio» mide 4 columnas y 2 filas. / La sección «Base» mide 12 columnas y 1 fila. / La tarjeta del total mide…
export function textoDelTamano(p: PiezaDeLaHoja, nombre: Nombrar, t: Tamano): string {
  const quien = p.pieza === 'seccion' ? `la sección ${nombre(p)}` : nombre(p)
  return `${conMayuscula(quien)} mide ${enColumnas(t.ancho)} y ${enFilas(t.alto)}.`
}

// Por qué no cambió: la vecina con la que se topa, el borde de la rejilla, el tope de filas o ya en lo mínimo.
function porQueNoCambio(tope: Tope | null, lado: keyof Tamano, actual: Tamano, nombre: Nombrar) {
  if (tope?.motivo === 'pisa') {
    return `No crece: ${nombre(tope.con)} está ${tope.lado === 'ancho' ? 'al lado' : 'debajo'}.`
  }
  if (tope?.motivo === 'borde') {
    return tope.lado === 'ancho'
      ? `Ya ocupa hasta la columna ${String(COLUMNAS_DE_LA_REJILLA)}.`
      : LA_ULTIMA_FILA
  }
  if (tope?.motivo === 'maximo') return `Ya mide ${enFilas(MAXIMO_DE_FILAS)}.`
  return `Ya mide ${lado === 'ancho' ? enColumnas(actual.ancho) : enFilas(actual.alto)}.`
}

const mismoTamano = (a: Tamano, b: Tamano) => a.ancho === b.ancho && a.alto === b.alto

export type CambioDeTamano = { diseno: Diseno; anuncio: string }

// Pone en `p` lo que entra de lo pedido (un lado: el ancho o el alto) y dice lo que pasó; si nada cambió, el diseño vuelve el mismo con el motivo. El bloque
// «Avanzado» y las avanzadas no cambian de tamaño (la fila entera; a todo el ancho de su lista). Nulo si la pieza no está en la rejilla (la cabecera, lo que
// ya no está).
export function cambiarElTamano(
  d: Diseno,
  p: PiezaDeLaHoja,
  pedido: Partial<Tamano>,
  nombre: Nombrar,
): CambioDeTamano | null {
  if (p.pieza === 'bloque-avanzado') return { diseno: d, anuncio: EL_BLOQUE_OCUPA_LA_FILA }
  const antes = lugarDe(d, p)
  if (antes === null) return null
  if (antes.espacio.tipo === 'avanzadas') {
    return { diseno: d, anuncio: LAS_AVANZADAS_VAN_A_LO_ANCHO }
  }
  const despues = ponerTamano(d, p, pedido)
  const ahora = lugarDe(despues, p)?.pieza ?? antes.pieza
  if (!mismoTamano(ahora, antes.pieza)) {
    return { diseno: despues, anuncio: textoDelTamano(p, nombre, ahora) }
  }
  const lado: keyof Tamano = pedido.ancho === undefined ? 'alto' : 'ancho'
  const tope = tamanoQueEntra(d, p, pedido)?.tope ?? null
  return { diseno: d, anuncio: porQueNoCambio(tope, lado, antes.pieza, nombre) }
}
