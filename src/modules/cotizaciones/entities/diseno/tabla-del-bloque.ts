// El bloque de tabla de la ayuda de una celda en el inspector: qué tabla abre, qué columnas muestra (sin `columnas`, todas las de la tabla, también las que
// sume después), qué celda llena cada una y si resalta la fila del vehículo. Y lo que el inspector ofrece para elegir: las celdas que aceptan un valor (la
// regla `ayuda_llena_no_acepta_valor`) y, si el catálogo no se leyó, las tablas que nombra la fórmula. Nada muta lo que recibe.
import { aceptaValorEnLaHoja, nodosConCelda } from '../ayuda-en-bloques'
import type { TablaDelCatalogoDelOrigen } from '../catalogo-de-tablas'
import type { BloqueDeAyuda, ColumnaDeLaAyuda, Diseno } from '../diseno'
import type { Definicion } from '../formula'
import { enBloque, type DondeDelBloque } from './edicion-de-la-ayuda'

export type BloqueDeTabla = Extract<BloqueDeAyuda, { tipo: 'tabla' }>
// Una columna (su clave) de un bloque de tabla.
export type DondeDeLaColumna = DondeDelBloque & { columna: string }

const enTabla = (
  diseno: Diseno,
  donde: DondeDelBloque,
  cambiar: (b: BloqueDeTabla) => BloqueDeTabla,
): Diseno => enBloque(diseno, donde, (b) => (b.tipo === 'tabla' ? cambiar(b) : b))

const sinColumnas = ({ columnas: _columnas, ...b }: BloqueDeTabla): BloqueDeTabla => b

// Las columnas que muestra el bloque: las suyas o, sin lista, todas las de la tabla (`todas`, las claves del catálogo en su orden).
export const columnasMostradas = (
  b: BloqueDeTabla,
  todas: readonly string[],
): readonly ColumnaDeLaAyuda[] => b.columnas ?? todas.map((columna) => ({ columna }))

// Todas las de la tabla, en su orden y sin llenar nada, es lo mismo que no tener lista: la lista se va.
function conColumnas(
  b: BloqueDeTabla,
  columnas: readonly ColumnaDeLaAyuda[],
  todas: readonly string[],
): BloqueDeTabla {
  const lasDeLaTabla =
    columnas.length === todas.length &&
    columnas.every((c, i) => c.columna === todas[i] && c.llena === undefined)
  return lasDeLaTabla ? sinColumnas(b) : { ...b, columnas: [...columnas] }
}

// Otra tabla: sus columnas son otras, así que muestra todas y no llena nada. «Resaltar» se conserva.
export const ponerTablaDelBloque = (diseno: Diseno, donde: DondeDelBloque, tabla: string): Diseno =>
  enTabla(diseno, donde, (b) => (b.tabla === tabla ? b : { ...sinColumnas(b), tabla }))

// «Mostrar» una columna (en el lugar que tiene en la tabla) o dejar de mostrarla. La última que queda no se quita: el bloque muestra al menos una.
export function mostrarColumna(
  diseno: Diseno,
  donde: DondeDeLaColumna,
  todas: readonly string[],
  mostrar: boolean,
): Diseno {
  const { columna } = donde
  return enTabla(diseno, donde, (b) => {
    const actuales = columnasMostradas(b, todas)
    const sin = actuales.filter((c) => c.columna !== columna)
    if (!mostrar) return sin.length === 0 ? b : conColumnas(b, sin, todas)
    if (sin.length !== actuales.length) return b
    const lugar = todas.indexOf(columna)
    const antesDe = sin.findIndex((c) => todas.indexOf(c.columna) > lugar)
    const i = antesDe === -1 ? sin.length : antesDe
    return conColumnas(b, [...sin.slice(0, i), { columna }, ...sin.slice(i)], todas)
  })
}

// «Llena la celda» de una columna que se muestra: el nodo de esa celda, o ninguna (`null`).
export function ponerLlena(
  diseno: Diseno,
  donde: DondeDeLaColumna,
  todas: readonly string[],
  llena: string | null,
): Diseno {
  const { columna } = donde
  return enTabla(diseno, donde, (b) => {
    const actuales = columnasMostradas(b, todas)
    if (!actuales.some((c) => c.columna === columna)) return b
    const nuevas = actuales.map((c) =>
      c.columna !== columna ? c : llena === null ? { columna } : { columna, llena },
    )
    return conColumnas(b, nuevas, todas)
  })
}

// «Resaltar la fila del vehículo»: apagado, la clave se va.
export const ponerResaltar = (diseno: Diseno, donde: DondeDelBloque, resaltar: boolean): Diseno =>
  enTabla(diseno, donde, ({ resaltar: _antes, ...b }) => (resaltar ? { ...b, resaltar } : b))

export type CeldaQueAceptaValor = { nodo: string; rotulo: string }

// Las celdas del diseño que la hoja deja escribir (también el porcentaje de una celda con secundario), en el orden del diseño y sin repetir: lo que
// ofrece «Llena la celda». Sin ninguna (una hoja sin datos que se tipean), sólo «Ninguna».
export function celdasQueAceptanValor(
  diseno: Pick<Diseno, 'secciones'>,
  definicion: Definicion,
): CeldaQueAceptaValor[] {
  const nodos = new Map(definicion.nodos.map((n) => [n.id, n]))
  const vistas = new Set<string>()
  const celdas: CeldaQueAceptaValor[] = []
  for (const id of nodosConCelda(diseno, nodos)) {
    const n = nodos.get(id)
    if (n === undefined || vistas.has(id) || !aceptaValorEnLaHoja(n)) continue
    vistas.add(id)
    celdas.push({ nodo: id, rotulo: n.etiqueta })
  }
  return celdas
}

// Las tablas de referencia que nombran los nodos de la fórmula, en orden de aparición y sin repetir; la actual siempre va. El respaldo del select de tabla
// cuando el catálogo del origen no se pudo leer.
export function tablasParaAyuda(definicion: Definicion, actual?: string): string[] {
  const nombres = new Set<string>()
  for (const n of definicion.nodos) {
    if (n.tipo === 'tabla' || n.tipo === 'tramo') nombres.add(n.tabla)
    else if (n.tipo === 'calculo' && n.op === 'depreciar') nombres.add(n.tabla)
  }
  if (actual !== undefined) nombres.add(actual)
  return [...nombres]
}

export const SIN_TABLAS = 'Este origen no tiene tablas.'

// La tabla con que nace un bloque de tabla de «+ Bloque»: la primera del catálogo que esta ayuda no muestra todavía (las del origen antes que las
// compartidas) o, si ya muestra todas, la primera. Sin catálogo, lo mismo con las que nombra la fórmula. Sin ninguna, el motivo de «Tabla» apagada.
export function tablaParaElBloqueNuevo(
  bloques: readonly BloqueDeAyuda[],
  catalogo: readonly TablaDelCatalogoDelOrigen[] | null,
  deLaFormula: readonly string[],
): { tabla: string } | { motivo: string } {
  const claves =
    catalogo === null
      ? deLaFormula
      : [...catalogo.filter((t) => !t.compartida), ...catalogo.filter((t) => t.compartida)].map(
          (t) => t.clave,
        )
  const usadas = new Set(bloques.flatMap((b) => (b.tipo === 'tabla' ? [b.tabla] : [])))
  const tabla = claves.find((c) => !usadas.has(c)) ?? claves[0]
  return tabla === undefined ? { motivo: SIN_TABLAS } : { tabla }
}
