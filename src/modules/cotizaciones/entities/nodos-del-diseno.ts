// Los nodos que el diseño de la hoja nombra: el de cada ítem (también un `atajos`), el `pct` de una celda con `secundario` sobre un `porcentaje_de`, los
// tipos de cambio de cada modo y lo que muestra la tarjeta del total (`tarjeta_total`). Borrar uno de esos nodos haría que publicar el diseño cayera
// (`nodo_inexistente` o `nodo_sin_seccion`): la planilla no lo borra (`entities/formula/usos-de-la-fila.ts`). Núcleo: lo usa el área `formula` sin
// importar `diseno`. Puro, O(ítems + nodos).
import type { Diseno } from './diseno'
import type { Definicion } from './formula'

export function nodosDelDiseno(diseno: Diseno, definicion: Pick<Definicion, 'nodos'>): Set<string> {
  const porId = new Map(definicion.nodos.map((n) => [n.id, n]))
  const nodos = new Set<string>()
  for (const seccion of diseno.secciones) {
    for (const item of seccion.items) {
      // La tarjeta del total no nombra un nodo: el suyo es el de `tarjeta_total`, que va abajo.
      if (item.tipo === 'total') continue
      nodos.add(item.nodo)
      const n = porId.get(item.nodo)
      const conPct = item.tipo === 'celda' && item.secundario !== undefined
      if (conPct && n?.tipo === 'calculo' && n.op === 'porcentaje_de') nodos.add(n.pct)
    }
  }
  for (const modo of diseno.cabecera.modos) {
    nodos.add(modo.total_en)
    for (const b of modo.buckets) nodos.add(b.nodo)
  }
  nodos.add(diseno.tarjeta_total.nodo)
  for (const s of diseno.tarjeta_total.secundarios) nodos.add(s)
  return nodos
}
