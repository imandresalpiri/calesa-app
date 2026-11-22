// «Sin lugar en la hoja (N)» del editor de la hoja: las filas de la fórmula que la hoja tiene que dibujar y todavía no tienen pieza (las que la base rechazaría
// con `nodo_sin_seccion`: todo input y constante que no es auxiliar, la variante y la bandera que condiciona o pide algo; `validar-diseno-cobertura.ts`). Cada
// una con la pieza que la dibuja: la variante en sus chips, la bandera en su interruptor y lo demás en una celda. Puras; en el orden de la fórmula.
import type { Diseno } from '../diseno'
import type { Definicion } from '../formula'
import { esta } from '../medidor'
import type { Nodo } from '../nodos'
import { indexar } from '../validar-diseno-contexto'

export type FilaSinLugar = {
  nodo: string
  etiqueta: string
  tipo: 'celda' | 'variante' | 'interruptor'
}

const SIN_CONTEXTO = { niveles: [], retirados: [], tonos: [] }

// Lo que la hoja ya dibuja: el nodo de cada celda, subtotal, variante e interruptor, y el porcentaje que muestra una celda con secundario. Los atajos no
// dibujan su valor (van sobre su celda) y la tarjeta del total repite el suyo.
export function nodosDibujados(def: Definicion, d: Diseno): Set<string> {
  const nodos = new Map(def.nodos.map((n) => [n.id, n]))
  const dibujados = new Set<string>()
  for (const s of d.secciones) {
    for (const it of s.items) {
      if (it.tipo === 'total' || it.tipo === 'atajos') continue
      dibujados.add(it.nodo)
      const n = it.tipo === 'celda' && it.secundario !== undefined ? nodos.get(it.nodo) : undefined
      if (n?.tipo === 'calculo' && n.op === 'porcentaje_de') dibujados.add(n.pct)
    }
  }
  return dibujados
}

export const piezaQueLoDibuja = (n: Nodo): FilaSinLugar['tipo'] => {
  if (n.tipo === 'opcion') return 'variante'
  return n.tipo === 'bandera' ? 'interruptor' : 'celda'
}

export function filasSinLugar(def: Definicion, d: Diseno): FilaSinLugar[] {
  const ix = indexar(def, SIN_CONTEXTO, { visitas: 0 })
  const dibujados = nodosDibujados(def, d)
  return def.nodos.flatMap((n) => {
    const pide =
      n.tipo === 'input' ||
      (n.tipo === 'constante' && !esta(ix.auxiliares, n.id, ix.m)) ||
      n.tipo === 'opcion' ||
      (n.tipo === 'bandera' &&
        (esta(ix.condicionadas, n.id, ix.m) || esta(ix.requeridas, n.id, ix.m)))
    return pide && !dibujados.has(n.id)
      ? [{ nodo: n.id, etiqueta: n.etiqueta, tipo: piezaQueLoDibuja(n) }]
      : []
  })
}
