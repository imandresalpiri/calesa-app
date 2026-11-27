// La fórmula y el diseño mínimos que comparten las pruebas de `entities/diseno/`: un total que suma tres sumandos (a, b y c), una
// comisión con su porcentaje, una resta y una variante. El diseño dibuja todo menos `libre`; cada prueba lo cambia con `ponerSeccion()`.
import { esquemaDiseno, type Diseno } from '../diseno'
import type { ItemSinPosicion, SeccionSinPosicion } from '../diseno-sin-posicion'
import { esquemaDefinicion, type Definicion } from '../formula'

export const formulaDePrueba: Definicion = esquemaDefinicion.parse({
  nodos: [
    {
      id: 'variante',
      tipo: 'opcion',
      etiqueta: 'Variante',
      opciones: [
        { clave: 'x', etiqueta: 'X', titulo: 'COTIZACIÓN X' },
        { clave: 'y', etiqueta: 'Y', titulo: 'COTIZACIÓN Y' },
      ],
    },
    { id: 'a', tipo: 'input', etiqueta: 'A' },
    { id: 'b', tipo: 'input', etiqueta: 'B' },
    { id: 'c', tipo: 'input', etiqueta: 'C' },
    { id: 'libre', tipo: 'input', etiqueta: 'Libre' },
    { id: 'tasa', tipo: 'constante', etiqueta: 'Tasa', formato: 'pct' },
    {
      id: 'comision',
      tipo: 'calculo',
      op: 'porcentaje_de',
      de: ['a'],
      pct: 'tasa',
      etiqueta: 'Comisión',
    },
    { id: 'neto', tipo: 'calculo', op: 'restar', de: ['a', 'b'], etiqueta: 'Neto' },
    {
      id: 'total',
      tipo: 'calculo',
      op: 'suma',
      de: ['a', 'b', 'c'],
      etiqueta: 'Total',
      salida: 'total',
    },
  ],
})

// Las piezas se escriben sin posición (como un diseño de flujo): `disenoDe()` las convierte a la rejilla al leerlas, como la base.
export const celda = (
  nodo: string,
  extra: Partial<Extract<ItemSinPosicion, { tipo: 'celda' }>> = {},
): ItemSinPosicion => ({
  tipo: 'celda',
  nodo,
  ancho: 'completo',
  ...extra,
})

export const seccion = (
  id: string,
  items: ItemSinPosicion[],
  extra: Partial<SeccionSinPosicion> = {},
): SeccionSinPosicion => ({
  id,
  presentacion: 'principal',
  items,
  ...extra,
})

// Una posición para una pieza de un diseño de rejilla: `celda('a', en(7, 1))`. Un diseño con una sola posición ya es de rejilla y las pide todas.
export const en = (columna: number, fila: number) => ({ posicion: { columna, fila } })

export const disenoDe = (secciones: SeccionSinPosicion[], avanzado?: { fila: number }): Diseno =>
  esquemaDiseno.parse({
    cabecera: { modos: [], ver_total_bs: false },
    secciones,
    tarjeta_total: { nodo: 'total', secundarios: [] },
    ...(avanzado === undefined ? {} : { avanzado }),
  })

// Un diseño de rejilla para las pruebas de mover y medir: «base» (columnas 1 a 6) con a y b lado a lado y c debajo; «extra» (7 a 12) con neto; el bloque
// «Avanzado» en la fila 2 y «av» en su lista.
export const disenoDeRejillaDePrueba = (): Diseno =>
  disenoDe([
    seccion('base', [celda('a', { ancho: 'mitad' }), celda('b', { ancho: 'mitad' }), celda('c')]),
    seccion('extra', [celda('neto')]),
    seccion('av', [celda('comision')], { presentacion: 'avanzado' }),
  ])
