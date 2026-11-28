// Las guías inteligentes del editor de artes (docs/GLOSARIO.md › «Guía inteligente»): al mover una capa, su borde o su centro se ajusta al
// borde o al centro del documento o de otra capa visible si queda a menos del umbral, y se dibuja la línea que coincide. Cada eje por
// separado. En unidades del documento. Puro.
import type { Medidas } from '../formatos'
import type { Caja } from './cajas'

// Eje `x`: una línea vertical en x = `posicion`, de y = `desde` a y = `hasta`. Eje `y`: horizontal.
export type Guia = { eje: 'x' | 'y'; posicion: number; desde: number; hasta: number }

export type Ajuste = { dx: number; dy: number; guias: Guia[] }

// Lo que se ajusta, en px de pantalla: a más zoom, menos unidades del documento.
const UMBRAL_EN_PANTALLA = 6
const IGUALES = 1e-6

export function umbralDeAjuste(escala: number): number {
  return UMBRAL_EN_PANTALLA / escala
}

type Eje = 'x' | 'y'
type Referencia = { valor: number; desde: number; hasta: number }

const inicio = (caja: Caja, eje: Eje) => (eje === 'x' ? caja.x : caja.y)
const largo = (caja: Caja, eje: Eje) => (eje === 'x' ? caja.ancho : caja.alto)
const otroEje = (eje: Eje): Eje => (eje === 'x' ? 'y' : 'x')

// El borde inicial, el centro y el borde final de una caja en un eje.
function lineasDe(caja: Caja, eje: Eje): number[] {
  const desde = inicio(caja, eje)
  const lado = largo(caja, eje)
  return [desde, desde + lado / 2, desde + lado]
}

// A qué puede ajustarse: el documento y cada otra caja, con el tramo que ocupa en el otro eje (para dibujar la línea).
function referencias(otras: readonly Caja[], documento: Caja, eje: Eje): Referencia[] {
  return [documento, ...otras].flatMap((caja) => {
    const desde = inicio(caja, otroEje(eje))
    const hasta = desde + largo(caja, otroEje(eje))
    return lineasDe(caja, eje).map((valor) => ({ valor, desde, hasta }))
  })
}

// El menor corrimiento, dentro del umbral, que deja una línea de la caja sobre una referencia; sin ninguna, 0.
function corrimiento(movida: Caja, refs: readonly Referencia[], eje: Eje, umbral: number): number {
  let mejor: number | null = null
  for (const propia of lineasDe(movida, eje)) {
    for (const ref of refs) {
      const delta = ref.valor - propia
      if (Math.abs(delta) <= umbral && (mejor === null || Math.abs(delta) < Math.abs(mejor))) {
        mejor = delta
      }
    }
  }
  return mejor ?? 0
}

// Las líneas que coinciden con la caja ya corrida; las de la misma posición se juntan en una que abarca todo.
function guiasDe(movida: Caja, refs: readonly Referencia[], eje: Eje): Guia[] {
  const desde = inicio(movida, otroEje(eje))
  const hasta = desde + largo(movida, otroEje(eje))
  const porPosicion = new Map<number, Guia>()
  for (const propia of lineasDe(movida, eje)) {
    for (const ref of refs) {
      if (Math.abs(ref.valor - propia) > IGUALES) {
        continue
      }
      const previa = porPosicion.get(ref.valor)
      porPosicion.set(ref.valor, {
        eje,
        posicion: ref.valor,
        desde: Math.min(previa?.desde ?? desde, desde, ref.desde),
        hasta: Math.max(previa?.hasta ?? hasta, hasta, ref.hasta),
      })
    }
  }
  return [...porPosicion.values()]
}

// Cuánto correr la caja movida para que se ajuste, y las guías que quedan a la vista tras correrla.
export function ajustar(
  movida: Caja,
  otras: readonly Caja[],
  documento: Medidas,
  umbral: number,
): Ajuste {
  const delDocumento = { x: 0, y: 0, ancho: documento.ancho, alto: documento.alto }
  const enX = referencias(otras, delDocumento, 'x')
  const enY = referencias(otras, delDocumento, 'y')
  const dx = corrimiento(movida, enX, 'x', umbral)
  const dy = corrimiento(movida, enY, 'y', umbral)
  const corrida = { ...movida, x: movida.x + dx, y: movida.y + dy }
  return { dx, dy, guias: [...guiasDe(corrida, enX, 'x'), ...guiasDe(corrida, enY, 'y')] }
}
