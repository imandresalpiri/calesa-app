import { itemSeDibuja, type ContextoDeHoja } from './binding'
import { calculadoDe, ladoPisado } from './binding-pisado'
import type { Formato } from './nodos'

// Lo pisado de la hoja, para el resumen (`docs/COTIZADOR.md` › «Pisar un cálculo»): «Editado a mano: Transferencia a USA $500, calculado $480», una línea por
// celda pisada, en el orden de la hoja. Sólo las celdas que se dibujan y cuentan: una apagada por su interruptor, la variante o su condición no suma (la base
// descarta lo escrito ahí). Acotada por los ítems del diseño (`demasiados_items`).
export type Pisada = {
  nodo: string
  etiqueta: string
  // Lo escrito sobre el cálculo.
  valor: number
  // Lo que daría sin lo escrito; nulo si le falta un dato, y sin la respuesta que lo calculó, `undefined` (la línea no lo dice).
  calculado: number | null | undefined
  formato: Formato
  // Los «Decimales» del lado pisado (glosario); sin ellos, «Automático».
  decimales: number | undefined
}

export function pisadasDeLaHoja(c: ContextoDeHoja): Pisada[] {
  const pisadas: Pisada[] = []
  for (const celda of c.indice.celdas.values()) {
    const lado = ladoPisado(celda, c.entradas.overrides)
    const valor = lado === null ? undefined : c.entradas.overrides.get(lado.nodo)
    const cuenta =
      itemSeDibuja(celda, c) && (c.respuesta?.estados.get(celda.nodo) ?? 'activo') === 'activo'
    if (lado !== null && valor !== undefined && cuenta) {
      pisadas.push({
        nodo: lado.nodo,
        etiqueta: celda.etiqueta,
        valor,
        calculado: calculadoDe(lado.nodo, c.respuesta),
        formato: lado.formato,
        decimales: lado.decimales,
      })
    }
  }
  return pisadas
}
