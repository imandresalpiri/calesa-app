// El juego espejo de la conversión a la rejilla (`casos-de-rejilla.json`): cada caso es una entrada y lo que devuelve `disenoEnRejilla()`, y
// `supabase/tests/areas/diseno/rejilla.sql` pide lo mismo a `_diseno_en_rejilla()`. Entran los diseños distintos de `casos-de-diseno.json` que son
// chicos, los válidos y los de las semillas, y los bordes de abajo (lo que no tiene forma, lo que ya es de rejilla, los altos que se quitan y los que no).
import { disenoEnRejilla } from './diseno-en-rejilla'

export type CasoDeRejilla = { nombre: string; entrada: unknown; salida: unknown }

const seccion = (id: string, extra: Record<string, unknown> = {}) => ({
  id,
  titulo: id,
  presentacion: 'principal',
  items: [],
  ...extra,
})
const celda = (nodo: string, ancho: unknown, extra: Record<string, unknown> = {}) => ({
  tipo: 'celda',
  nodo,
  ancho,
  ...extra,
})

export const BORDES: readonly { nombre: string; entrada: unknown }[] = [
  { nombre: 'borde: un texto', entrada: 'x' },
  { nombre: 'borde: nulo', entrada: null },
  { nombre: 'borde: una lista', entrada: [] },
  { nombre: 'borde: un número', entrada: 7 },
  { nombre: 'borde: sin secciones', entrada: { cabecera: { modos: [] } } },
  { nombre: 'borde: secciones que no son una lista', entrada: { secciones: {} } },
  {
    nombre: 'borde: una sección y un ítem que no son objetos, e ítems que no son una lista',
    entrada: {
      secciones: [
        'x',
        seccion('a', { items: [7, celda('p', 'mitad')] }),
        seccion('b', { items: 'x' }),
      ],
    },
  },
  {
    nombre: 'borde: ya en la rejilla por una posición: vuelve igual',
    entrada: { secciones: [seccion('a'), seccion('b', { posicion: { columna: 1, fila: 3 } })] },
  },
  {
    nombre: 'borde: ya en la rejilla por un ítem con posición: vuelve igual',
    entrada: {
      secciones: [
        seccion('a', { items: [celda('p', 'mitad', { posicion: { columna: 7, fila: 2 } })] }),
      ],
    },
  },
  {
    nombre: 'borde: ya en la rejilla por el bloque: vuelve igual',
    entrada: { secciones: [seccion('a')], avanzado: { fila: 2 } },
  },
  {
    nombre:
      'borde: a 12 columnas el alto válido se quita y el inválido queda; angosta, el alto cuenta',
    entrada: {
      secciones: [
        seccion('a', { ancho: 12, alto: 2 }),
        seccion('b', { ancho: 12, alto: 9 }),
        seccion('c', { ancho: 6, alto: 2 }),
        seccion('d', { ancho: 6 }),
        seccion('e', { ancho: 6 }),
      ],
    },
  },
  {
    nombre: 'borde: una pieza que no cabe baja de fila y deja el hueco detrás de una alta',
    entrada: {
      secciones: [
        seccion('a', { ancho: 6, alto: 2 }),
        seccion('b', { ancho: 6 }),
        seccion('c'),
        seccion('d', { ancho: 8 }),
        seccion('e', { ancho: 4 }),
        seccion('f', { ancho: 12 }),
      ],
    },
  },
  {
    nombre: 'borde: un ancho que no es una medida cuenta 12',
    entrada: {
      secciones: [
        seccion('a', { ancho: 6.5 }),
        seccion('b', {
          ancho: 0,
          items: [celda('p', 0), { tipo: 'atajos', nodo: 'q', ancho: 'mitad' }],
        }),
      ],
    },
  },
  {
    nombre: 'borde: las celdas con nombre, con número y sin ancho, y el alto de un ítem',
    entrada: {
      secciones: [
        seccion('a', {
          items: [
            celda('p', 'mitad', { alto: 2 }),
            celda('q', 'tercio'),
            celda('r', 3),
            celda('s', 'completo', { alto: 3 }),
            { tipo: 'subtotal', nodo: 't' },
            { tipo: 'interruptor', nodo: 'u', ancho: 4, alto: 4 },
            celda('v', 'tercio'),
          ],
        }),
      ],
    },
  },
  {
    nombre: 'borde: avanzadas en el medio, una angosta y alta y otra a 12 con alto',
    entrada: {
      secciones: [
        seccion('a', { ancho: 6 }),
        seccion('x', { presentacion: 'avanzado', ancho: 6, alto: 3 }),
        seccion('b', { ancho: 6 }),
        seccion('y', { presentacion: 'avanzado', ancho: 12, alto: 2 }),
        seccion('z', { presentacion: 'avanzado' }),
        seccion('c'),
      ],
    },
  },
]

const TAMANO_DE_UN_DISENO_CHICO = 2000

export function casosDeRejilla(
  juego: readonly { nombre: string; valida: boolean; diseno: unknown }[],
): CasoDeRejilla[] {
  const vistos = new Set<string>()
  const casos: CasoDeRejilla[] = []
  const sumar = (nombre: string, entrada: unknown) => {
    const clave = JSON.stringify(entrada)
    if (vistos.has(clave)) return
    vistos.add(clave)
    casos.push({ nombre, entrada, salida: disenoEnRejilla(entrada) })
  }
  for (const c of juego) {
    const chico = JSON.stringify(c.diseno).length <= TAMANO_DE_UN_DISENO_CHICO
    if (chico || c.valida || c.nombre.startsWith('semilla')) sumar(`juego: ${c.nombre}`, c.diseno)
  }
  for (const b of BORDES) sumar(b.nombre, b.entrada)
  return casos
}

// Un caso por línea: el diff de una regeneración muestra los que cambiaron.
export function casosDeRejillaComoTexto(casos: readonly CasoDeRejilla[]): string {
  const descripcion =
    'La conversión de un diseño de flujo a la rejilla: lo genera diseno-en-rejilla.test.ts con disenoEnRejilla() y lo lee supabase/tests/areas/diseno/rejilla.sql contra _diseno_en_rejilla().'
  const lineas = casos.map((c) => JSON.stringify(c)).join(',\n')
  return `{"descripcion":${JSON.stringify(descripcion)},\n"casos":[\n${lineas}\n]}\n`
}
