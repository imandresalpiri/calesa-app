// La **posición de la fase** en el diagrama: dónde se dibuja cada una (la guardada o, sin ninguna, el acomodo automático), qué se guarda al moverla,
// «Ordenar solo», la rejilla, el teclado, dónde nace una fase pedida en el lienzo y la pila de deshacer. Las posiciones van en rem del lienzo (px = rem ×
// el rem medido): con el texto al 200 % todo el dibujo crece con las cajas y nada se pisa. Puro: sin I/O ni React.
import {
  medidasDelDiagrama,
  type DisposicionDelDiagrama,
  type Punto,
} from './disposicion-del-diagrama'
import type { PosicionDeLaFase } from './fase-para-configurar'

// Lo que se manda a `fase_posiciones_guardar` por fase: las dos nulas = sin posición.
export type CambioDePosicion =
  { faseId: string; x: number; y: number } | { faseId: string; x: null; y: null }

type ConPosicion = { id: string; posicion: PosicionDeLaFase | null }

// Las medidas del dibujo en rem.
const EN_REM = medidasDelDiagrama(1)
export const LIMITE_DE_POSICION = 10000

const redondo = (n: number) => Math.round(n * 100) / 100
const acotado = (n: number) => Math.min(Math.max(n, -LIMITE_DE_POSICION), LIMITE_DE_POSICION)

// Dónde se dibuja cada fase, en rem. Si ninguna tiene posición, el acomodo automático (`auto`, en px). Si alguna la tiene, cada una en la suya y las que
// no, a la derecha de la caja más a la derecha, a su altura, una tras otra (en su orden).
export function posicionesEfectivas(
  fases: readonly ConPosicion[],
  auto: DisposicionDelDiagrama,
  rem: number,
): Map<string, Punto> {
  const efectivas = new Map<string, Punto>()
  if (!fases.some((f) => f.posicion !== null)) {
    for (const nodo of auto.nodos) {
      efectivas.set(nodo.id, { x: redondo(nodo.x / rem), y: redondo(nodo.y / rem) })
    }
    return efectivas
  }
  let ultima: Punto | null = null
  for (const fase of fases) {
    if (fase.posicion === null) continue
    efectivas.set(fase.id, fase.posicion)
    if (ultima === null || fase.posicion.x > ultima.x) ultima = fase.posicion
  }
  const paso = EN_REM.ancho + EN_REM.separacion
  let siguiente = ultima ?? { x: 0, y: 0 }
  for (const fase of fases) {
    if (fase.posicion !== null) continue
    siguiente = { x: acotado(siguiente.x + paso), y: siguiente.y }
    efectivas.set(fase.id, siguiente)
  }
  return efectivas
}

// De rem a px, para React Flow.
export function enPx(efectivas: ReadonlyMap<string, Punto>, rem: number): Map<string, Punto> {
  return new Map([...efectivas].map(([id, p]) => [id, { x: p.x * rem, y: p.y * rem }]))
}

// Lo que se guarda al mover unas fases: las movidas y, en el mismo envío, las que todavía no tenían posición, donde se dibujan (si no, el primer arrastre
// en un flujo sin posiciones haría saltar a todas las demás).
export function cambiosAlMover(
  efectivas: ReadonlyMap<string, Punto>,
  fases: readonly ConPosicion[],
  movidas: readonly { faseId: string; x: number; y: number }[],
): CambioDePosicion[] {
  const ids = new Set(movidas.map((m) => m.faseId))
  const sinPosicion = fases.flatMap((f): CambioDePosicion[] => {
    const donde = efectivas.get(f.id)
    return f.posicion === null && !ids.has(f.id) && donde
      ? [{ faseId: f.id, x: donde.x, y: donde.y }]
      : []
  })
  return [
    ...movidas.map((m) => ({
      faseId: m.faseId,
      x: acotado(redondo(m.x)),
      y: acotado(redondo(m.y)),
    })),
    ...sinPosicion,
  ]
}

// «Ordenar solo»: todas las fases a su lugar del acomodo automático, en un solo envío.
export function posicionesDeOrdenarSolo(
  auto: DisposicionDelDiagrama,
  rem: number,
): CambioDePosicion[] {
  return auto.nodos.map((n) => ({ faseId: n.id, x: redondo(n.x / rem), y: redondo(n.y / rem) }))
}

// Si ya está todo en el acomodo automático: «Ordenar solo» no haría nada.
export function enElAcomodo(
  efectivas: ReadonlyMap<string, Punto>,
  auto: DisposicionDelDiagrama,
  rem: number,
): boolean {
  return auto.nodos.every((n) => {
    const p = efectivas.get(n.id)
    return p !== undefined && p.x === redondo(n.x / rem) && p.y === redondo(n.y / rem)
  })
}

export const MOTIVO_YA_EN_EL_ACOMODO = 'Ya está en el acomodo automático.'

// La rejilla del lienzo: 1 rem. Las posiciones quedan en números redondos.
export const enRejilla = (n: number) => Math.round(n)

// Cuánto mueve una flecha del teclado: 1 rem, o 10 con Shift. Otra tecla, nada.
export function pasoDeTeclado(tecla: string, shift: boolean): Punto | null {
  const n = shift ? 10 : 1
  switch (tecla) {
    case 'ArrowLeft':
      return { x: -n, y: 0 }
    case 'ArrowRight':
      return { x: n, y: 0 }
    case 'ArrowUp':
      return { x: 0, y: -n }
    case 'ArrowDown':
      return { x: 0, y: n }
    default:
      return null
  }
}

// Dónde nace una fase pedida en un punto del lienzo (rem): con el centro de su caja en ese punto, en la rejilla.
export function posicionDeLaNuevaFase(punto: Punto): Punto {
  return {
    x: acotado(enRejilla(punto.x - EN_REM.ancho / 2)),
    y: acotado(enRejilla(punto.y - EN_REM.alto / 2)),
  }
}

// El parámetro `?en=<x>,<y>` (rem) de «Nueva fase» pedida en el lienzo. Uno mal formado o fuera del rango se ignora.
export function posicionPedida(valor: string | null): Punto | null {
  if (valor === null) return null
  const partes = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(valor.trim())
  if (!partes) return null
  const x = Number(partes[1])
  const y = Number(partes[2])
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  if (Math.abs(x) > LIMITE_DE_POSICION || Math.abs(y) > LIMITE_DE_POSICION) return null
  return { x, y }
}

export const textoDePosicion = (p: Punto) => `${String(p.x)},${String(p.y)}`

// Deshacer: cada paso guarda lo que había antes de un gesto (también «sin posición»). Sin rehacer; se vacía al recargar o ante un conflicto.
export const TOPE_DE_DESHACER = 50
export type PasoDeDeshacer = readonly CambioDePosicion[]

// Lo que había antes de estos cambios, según lo guardado (o pendiente) de cada fase.
export function loQueHabia(
  guardadas: ReadonlyMap<string, PosicionDeLaFase | null>,
  cambios: readonly CambioDePosicion[],
): PasoDeDeshacer {
  return cambios.map((c) => {
    const antes = guardadas.get(c.faseId) ?? null
    return antes === null
      ? { faseId: c.faseId, x: null, y: null }
      : { faseId: c.faseId, x: antes.x, y: antes.y }
  })
}

export function apilar(pila: readonly PasoDeDeshacer[], paso: PasoDeDeshacer): PasoDeDeshacer[] {
  return paso.length === 0 ? [...pila] : [...pila, paso].slice(-TOPE_DE_DESHACER)
}

export function deshacer(
  pila: readonly PasoDeDeshacer[],
): { paso: PasoDeDeshacer; pila: PasoDeDeshacer[] } | null {
  const paso = pila.at(-1)
  return paso === undefined ? null : { paso, pila: pila.slice(0, -1) }
}

// Si un cambio ya está en lo leído (la versión nueva llegó): lo pendiente se va.
export function yaGuardado(
  cambio: CambioDePosicion,
  leida: PosicionDeLaFase | null | undefined,
): boolean {
  if (leida === undefined) return true
  return cambio.x === null
    ? leida === null
    : leida !== null && leida.x === cambio.x && leida.y === cambio.y
}

// Una posición movida en pantalla que todavía no se ve en lo leído: `guardadaEn` es la versión que devolvió su escritura (nula mientras no llegó).
export type PosicionPendiente = { cambio: CambioDePosicion; guardadaEn: string | null }

// Lo pendiente que sigue valiendo sobre lo leído: se va cuando lo leído ya lo trae, o cuando se leyó una versión igual o posterior a la de su escritura
// (otra persona la movió después: manda lo leído). `alMenosTan(leida, guardada)` dice si la leída es igual o posterior.
export function pendientesVigentes(
  pendientes: ReadonlyMap<string, PosicionPendiente>,
  leidas: ReadonlyMap<string, PosicionDeLaFase | null>,
  leidaNoAntes: (guardadaEn: string) => boolean,
): Map<string, PosicionPendiente> {
  const vigentes = new Map<string, PosicionPendiente>()
  for (const [id, p] of pendientes) {
    if (!leidas.has(id) || yaGuardado(p.cambio, leidas.get(id))) continue
    if (p.guardadaEn !== null && leidaNoAntes(p.guardadaEn)) continue
    vigentes.set(id, p)
  }
  return vigentes
}

// Las fases con lo pendiente encima de lo leído.
export function conPendientes<T extends ConPosicion>(
  fases: readonly T[],
  pendientes: ReadonlyMap<string, PosicionPendiente>,
): T[] {
  return fases.map((f) => {
    const p = pendientes.get(f.id)?.cambio
    if (!p) return f
    return { ...f, posicion: p.x === null ? null : { x: p.x, y: p.y } }
  })
}
