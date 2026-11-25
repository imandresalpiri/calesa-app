import type { CasaDeLaFila } from './ayuda-de-la-hoja'
import type { HojaLista } from './hoja'

// «Tu vehículo» en la tabla de la ayuda (`resaltar` de un bloque de tabla; glosario: «Bloque de la ayuda»): la fila que casa con esta hoja como la leería el motor
// (`motor-tablas.ts`): la primera cuyas columnas de `casa` son todas iguales, sin conversión (2024 no es "2024"), al valor que nombran.

// Un valor con que se casa: lo que el motor compara.
export type ValorParaCasar = number | string

export type ValoresParaCasar = {
  // El valor de un nodo en el último recálculo de la hoja (la clave elegida, si es la variante); nulo o ausente, sin valor.
  deNodo: (nodo: string) => number | string | null | undefined
  // Los datos del vehículo elegido que la ayuda nombra (`valoresParaCasar()` de `vehiculos`, que manda la página).
  delVehiculo: Readonly<Record<string, ValorParaCasar>>
}

// El índice de la fila, o nulo si la tabla no casa con la hoja, falta un valor (sin vehículo, un dato vacío o un nodo sin calcular) o ninguna fila coincide.
export function filaDelVehiculo(
  filas: readonly Readonly<Record<string, unknown>>[],
  casa: readonly CasaDeLaFila[] | null,
  valores: ValoresParaCasar,
): number | null {
  if (casa === null || casa.length === 0) {
    return null
  }
  const claves: { columna: string; valor: ValorParaCasar }[] = []
  for (const entrada of casa) {
    const valor =
      'nodo' in entrada ? valores.deNodo(entrada.nodo) : valores.delVehiculo[entrada.campo]
    if (valor === null || valor === undefined) {
      return null
    }
    claves.push({ columna: entrada.columna, valor })
  }
  const indice = filas.findIndex((fila) =>
    claves.every(({ columna, valor }) => Object.hasOwn(fila, columna) && fila[columna] === valor),
  )
  return indice === -1 ? null : indice
}

// Los datos del vehículo que nombra alguna tabla de la ayuda que resalta su fila: lo único que la página tiene que mandar del vehículo.
export function camposQueCasanLaAyuda(hoja: Pick<HojaLista, 'secciones'>): string[] {
  const casas = hoja.secciones
    .flatMap((seccion) => seccion.items)
    .flatMap((item) => (item.tipo === 'celda' ? (item.ayuda ?? []) : []))
    .flatMap((bloque) => (bloque.tipo === 'tabla' && bloque.resaltar ? (bloque.casa ?? []) : []))
  return [...new Set(casas.flatMap((entrada) => ('campo' in entrada ? [entrada.campo] : [])))]
}

// Cuántas filas se dibujan: las que pidió «Ver más filas» y, si «Tu vehículo» queda más abajo, hasta ella (la fila resaltada siempre se ve).
export const filasAMostrar = (dibujadas: number, resaltada: number | null): number =>
  resaltada !== null && resaltada >= dibujadas ? resaltada + 1 : dibujadas
