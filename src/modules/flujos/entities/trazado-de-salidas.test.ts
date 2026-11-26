import { describe, expect, it } from 'vitest'
import { disponerDiagrama, medidasDelDiagrama } from './disposicion-del-diagrama'
import { disponerConPosiciones, limitesDelDibujo, trazarSalida } from './trazado-de-salidas'

const m = medidasDelDiagrama(16)
const fases = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `f${String(i)}` }))
const salida = (de: number, a: number) => ({
  id: `t${String(de)}-${String(a)}`,
  deFaseId: `f${String(de)}`,
  aFaseId: `f${String(a)}`,
})
const recta = { forma: 'recta', lado: null, carril: 0, puertoDe: 0, puertoA: 0 } as const

describe('trazarSalida', () => {
  it('con las cajas en su acomodo automático da los mismos puntos que el acomodo', () => {
    const salidas = [
      salida(0, 1),
      salida(1, 2),
      salida(0, 2),
      salida(3, 0),
      salida(1, 3),
      salida(2, 4),
    ]
    const d = disponerDiagrama(fases(5), salidas, m)
    const porId = new Map(d.nodos.map((n) => [n.id, n]))
    for (const f of d.flechas) {
      const de = porId.get(f.de)
      const a = porId.get(f.a)
      if (!de || !a) throw new Error('Falta una caja.')
      expect(trazarSalida(de, a, f.ruta, m)).toEqual({ puntos: f.puntos, etiqueta: f.etiqueta })
    }
  })

  it('una recta a otra altura baja por un escalón en el medio', () => {
    const t = trazarSalida({ x: 0, y: 0 }, { x: 600, y: 200 }, recta, m)
    expect(t.puntos).toHaveLength(4)
    expect(t.puntos[1]?.x).toBe(t.puntos[2]?.x)
    expect(t.puntos.at(-1)).toEqual({ x: 600, y: 200 + m.alto / 2 })
  })

  it('una recta cuyo destino quedó detrás pasa por debajo de las dos cajas', () => {
    const t = trazarSalida({ x: 600, y: 0 }, { x: 0, y: 100 }, recta, m)
    const nivel = Math.max(...t.puntos.map((p) => p.y))
    expect(nivel).toBe(100 + m.alto + m.carril)
    expect(t.etiqueta.y).toBe(nivel)
  })

  it('un arco arriba cruza por encima de la caja más alta, en su carril', () => {
    const ruta = { forma: 'arco', lado: 'arriba', carril: 2, puertoDe: 100, puertoA: 50 } as const
    const t = trazarSalida({ x: 0, y: 300 }, { x: 900, y: 100 }, ruta, m)
    expect(t.puntos[1]?.y).toBe(100 - 2 * m.carril)
    expect(t.puntos[0]).toEqual({ x: 100, y: 300 })
    expect(t.puntos[3]).toEqual({ x: 950, y: 100 })
  })
})

describe('disponerConPosiciones', () => {
  it('sin cajas movidas deja la misma disposición', () => {
    const d = disponerDiagrama(fases(4), [salida(0, 1), salida(0, 3), salida(3, 1)], m)
    expect(disponerConPosiciones(d, new Map())).toEqual(d)
  })

  it('mueve la caja y vuelve a trazar sus flechas, con la misma ruta', () => {
    const d = disponerDiagrama(fases(3), [salida(0, 1), salida(0, 2)], m)
    const movida = disponerConPosiciones(d, new Map([['f2', { x: 2000, y: 600 }]]))
    expect(movida.nodos.find((n) => n.id === 'f2')).toMatchObject({ x: 2000, y: 600 })
    const arco = movida.flechas.find((f) => f.id === 't0-2')
    expect(arco?.ruta).toEqual(d.flechas.find((f) => f.id === 't0-2')?.ruta)
    expect(arco?.puntos.at(-1)?.x).toBe(2000 + (arco?.ruta.puertoA ?? 0))
    expect(movida.limites.ancho).toBeGreaterThan(d.limites.ancho)
  })

  it('los límites cubren cajas y flechas con su margen', () => {
    const l = limitesDelDibujo(
      [{ x: -100, y: 50 }],
      [{ puntos: [{ x: 0, y: -40 }], etiqueta: { x: 0, y: 0 } }],
      m,
    )
    expect(l.x).toBe(-100 - m.margen)
    expect(l.y).toBe(-40 - m.margen)
    expect(l.x + l.ancho).toBe(-100 + m.ancho + m.margen)
  })
})
