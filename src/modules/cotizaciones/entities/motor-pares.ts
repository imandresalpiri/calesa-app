// Los pares que reescriben su pct por la hoja (docs/COTIZADOR.md › «Pisar un cálculo»): un `porcentaje_de` con celda
// (en `pisables`), no `sobrescribible` y que no es el total, cuyo pct es exclusivo: una constante o un input que ningún
// otro nodo nombra. Con su monto pisado, el pct vale monto ÷ base como en un par `sobrescribible`; un pct compartido no
// se reescribe por la espalda. Espejos en la base: `_motor_pcts_exclusivos()` y el comienzo de `evaluar_formula()`.
import { buscar, esta, recorrer, type Medidor } from './medidor'
import { esPisable, type Nodo } from './nodos'
import { referenciasDe } from './nodos-referencias'

export function paresDeLaHoja(
  nodos: readonly Nodo[],
  porId: ReadonlyMap<string, Nodo>,
  pisables: ReadonlySet<string>,
  m: Medidor,
): Set<string> {
  const pares = new Set<string>()
  if (pisables.size === 0) return pares
  const exclusivos = pctsExclusivos(nodos, porId, m)
  for (const n of recorrer(nodos, m)) {
    if (n.tipo !== 'calculo' || n.op !== 'porcentaje_de' || n.sobrescribible === true) continue
    if (esPisable(n) && esta(pisables, n.id, m) && esta(exclusivos, n.pct, m)) pares.add(n.id)
  }
  return pares
}

// Las constantes y los inputs que nombra un solo nodo, con cualquier papel. Con un id repetido manda el último nodo
// (`porId`), como el índice del motor.
export function pctsExclusivos(
  nodos: readonly Nodo[],
  porId: ReadonlyMap<string, Nodo>,
  m: Medidor,
): Set<string> {
  const lectores = new Map<string, number>()
  for (const n of recorrer(nodos, m)) {
    const vistos = new Set<string>()
    for (const r of recorrer(referenciasDe(n), m)) {
      if (esta(vistos, r.id, m)) continue
      vistos.add(r.id)
      lectores.set(r.id, (buscar(lectores, r.id, m) ?? 0) + 1)
    }
  }
  const exclusivos = new Set<string>()
  for (const [id, cuantos] of recorrer(lectores, m)) {
    const tipo = buscar(porId, id, m)?.tipo
    if (cuantos === 1 && (tipo === 'constante' || tipo === 'input')) exclusivos.add(id)
  }
  return exclusivos
}
