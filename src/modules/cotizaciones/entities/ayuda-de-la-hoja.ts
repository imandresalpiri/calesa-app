import type { z } from 'zod'
import type { esquemaAyudaDeLaHoja } from './hoja-esquema'

// La ayuda de una celda como la recibe la hoja (`cotizacion_hoja()`, docs/GLOSARIO.md › «Ayuda (de una celda)» y «Bloque de la ayuda»): la lista de bloques
// del diseño ya recortada al nivel de quien mira. La de antes llega también como bloques: la hoja no conoce otra forma.
export type EnlaceDeLaAyuda = { titulo: string; url: string }

// Cómo casa una fila de la tabla con la hoja («Tu vehículo»): una columna por un nodo que se ve o por un dato del vehículo.
export type CasaDeLaFila = { columna: string; nodo: string } | { columna: string; campo: string }

// Una columna que muestra un bloque de tabla y el nodo que llena al tocar su valor (nulo: no llena nada, o llena un nodo que quien mira no ve).
export type ColumnaDeLaAyudaEnLaHoja = { columna: string; llena: string | null }

export type BloqueEnLaHoja =
  | { tipo: 'titulo'; texto: string }
  | { tipo: 'texto'; texto: string }
  | { tipo: 'enlaces'; enlaces: EnlaceDeLaAyuda[] }
  | {
      tipo: 'tabla'
      tabla: string
      // Nulo: todas las que quien mira lee.
      columnas: ColumnaDeLaAyudaEnLaHoja[] | null
      resaltar: boolean
      // Sólo con `resaltar`, y nulo si la tabla no casa con la hoja.
      casa: CasaDeLaFila[] | null
      // El id de la tabla viva, sólo a quien configura el origen.
      id: string | null
    }

export type AyudaDeCelda = readonly BloqueEnLaHoja[]

type CrudoDeLaAyuda = z.infer<typeof esquemaAyudaDeLaHoja>

// De lo que manda la base (las claves que no vinieron) a lo que dibuja la hoja (nulo).
export function ayudaDeLaHoja(crudo: CrudoDeLaAyuda | undefined): AyudaDeCelda | null {
  if (crudo === undefined) return null
  return crudo.map((b): BloqueEnLaHoja => {
    if (b.tipo !== 'tabla') return b
    return {
      tipo: 'tabla',
      tabla: b.tabla,
      columnas: b.columnas?.map((c) => ({ columna: c.columna, llena: c.llena ?? null })) ?? null,
      resaltar: b.resaltar === true,
      casa: b.casa ?? null,
      id: b.id ?? null,
    }
  })
}
