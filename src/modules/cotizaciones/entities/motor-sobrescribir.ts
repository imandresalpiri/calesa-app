// Lo que la persona sobrescribe y de dónde sale cada valor (docs/COTIZADOR.md › «Overrides», «El par
// porcentaje-monto» y «Pisar un cálculo»). Precedencia: override > sugerido. Un nodo con override vale el override; si
// es un cálculo con celda, lo que daría sin él va aparte a `calculados`. Un override que no se aplica no es un error:
// va a `descartados` con su motivo.
import { buscar, esta, ordenar, recorrer } from './medidor'
import { sumar } from './motor-calculo'
import {
  anotar,
  asentar,
  type Evaluacion,
  type Fuente,
  type MotivoDeDescarte,
  type Valor,
} from './motor-contexto'
import { aceptaValor, esPisable, type Nodo, type NodoCalculo } from './nodos'

type NodoDeValor = Exclude<Nodo, { tipo: 'opcion' }>
// Lo que daría un nodo sin lo escrito, sin dejar rastro en la evaluación (`calcularAparte()` de motor-nodos.ts).
export type Aparte = (ev: Evaluacion, n: NodoDeValor) => Valor

// El override de un nodo activo, si se aplica (undefined si no), y su fuente. Lo tipeado en un input va por
// `inputs`: su fuente la pone `valorDeInput`. Un pct pisado vale null hasta que llega su par. Un cálculo que se pisa
// sólo por su celda (`pisables`) no lleva fuente sin override: no gana el punto de «sugerido».
export function sobrescrito(ev: Evaluacion, n: NodoDeValor, aparte: Aparte): Valor | undefined {
  const ov = buscar(ev.entrada.overrides, n.id, ev.m)
  if (esta(ev.pisados, n.id, ev.m)) {
    ev.fuentes.set(n.id, 'override')
    return null
  }
  const acepta = aceptaValor(n)
  const conCelda = esPisable(n) && esta(ev.entrada.pisables, n.id, ev.m)
  if (n.tipo === 'input' || !(acepta || conCelda)) {
    if (ov !== undefined) descartar(ev, n.id, 'no_sobrescribible')
    return undefined
  }
  if (ov === undefined) {
    if (acepta) ev.fuentes.set(n.id, sinOverride(n))
    return undefined
  }
  return aplicar(ev, n, ov, conCelda ? aparte : undefined)
}

// El override que se aplica: su fuente, lo calculado si tiene celda (`aparte`) y el pct de su par.
function aplicar(ev: Evaluacion, n: NodoDeValor, ov: number, aparte: Aparte | undefined): Valor {
  ev.fuentes.set(n.id, 'override')
  if (aparte !== undefined) anotarCalculado(ev, n, aparte)
  if (n.tipo === 'calculo' && n.op === 'porcentaje_de') reescribirPct(ev, n, ov)
  // Un tipo de cambio de la persona pasa la misma revisión que el de la empresa.
  if (n.tipo === 'tipo_cambio' && !(ov > 0))
    return anotar(ev, 'tipo_de_cambio_sin_valor', n.id, n.clave)
  return ov
}

// Un default de la empresa o de la fórmula, o un sugerido de una tabla, un tramo o un cálculo.
const sinOverride = (n: NodoDeValor): Fuente =>
  n.tipo === 'constante' || n.tipo === 'tipo_cambio' ? 'default' : 'sugerido'

type Par = Extract<NodoCalculo, { op: 'porcentaje_de' }>

// Lo calculado de un cálculo pisado, antes de que el par reescriba su pct. Si el pct está pisado (vale null hasta el
// par), el monto se calcula con lo que daría el pct sin el pisado, que también va a `calculados`.
function anotarCalculado(ev: Evaluacion, n: NodoDeValor, aparte: Aparte): void {
  const pct = n.tipo === 'calculo' && n.op === 'porcentaje_de' ? pisadoDe(ev, n) : undefined
  if (pct === undefined) {
    ev.calculados.set(n.id, aparte(ev, n))
    return
  }
  const delPct = aparte(ev, pct)
  ev.calculados.set(pct.id, delPct)
  ev.valores.set(pct.id, delPct)
  ev.calculados.set(n.id, aparte(ev, n))
  ev.valores.set(pct.id, null)
}

function pisadoDe(ev: Evaluacion, par: Par): NodoDeValor | undefined {
  if (!esta(ev.pisados, par.pct, ev.m)) return undefined
  const pct = buscar(ev.nodos, par.pct, ev.m)
  return pct === undefined || pct.tipo === 'opcion' ? undefined : pct
}

// Manda el monto: el pct pisado vale monto ÷ base (null si la base es 0, con su faltante, o si es null). Si el pct
// está fuera de la variante o apagado, no está pisado y sigue en 0.
function reescribirPct(ev: Evaluacion, par: Par, monto: number): void {
  if (!esta(ev.pisados, par.pct, ev.m)) return
  const base = sumar(ev, par.id, par.de)
  const v =
    base === null ? null : base === 0 ? anotar(ev, 'division_por_cero', par.pct) : monto / base
  ev.valores.set(par.pct, asentar(ev, v, par.pct))
}

// Un nodo inactivo vale 0 y no guarda override: el que traiga se descarta con el estado del nodo.
export function descartarSiHay(ev: Evaluacion, id: string, motivo: MotivoDeDescarte): void {
  if (buscar(ev.entrada.overrides, id, ev.m) !== undefined) descartar(ev, id, motivo)
}

// Al final, los overrides de ids que no son nodos, ordenados por id: no dependen del orden de la entrada.
export function descartarInexistentes(ev: Evaluacion): void {
  const ids: string[] = []
  for (const [id] of recorrer(ev.entrada.overrides, ev.m)) {
    if (buscar(ev.nodos, id, ev.m) === undefined) ids.push(id)
  }
  for (const id of recorrer(ordenar(ids, ev.m), ev.m)) descartar(ev, id, 'nodo_inexistente')
}

function descartar(ev: Evaluacion, id: string, motivo: MotivoDeDescarte): void {
  ev.descartados.push({ id, motivo })
}
