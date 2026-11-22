import { describe, expect, it } from 'vitest'
import { formulaDePrueba } from './diseno-de-prueba.soporte'
import {
  cambiosReales,
  definicionConNodos,
  ponerEtiqueta,
  ponerFormato,
  SIN_CAMBIOS_DE_NODOS,
} from './edicion-de-nodos'

describe('el rótulo y el formato de una fila', () => {
  it('el rótulo sin blancos a los lados y de hasta 80; vacío no se escribe', () => {
    const c = ponerEtiqueta(SIN_CAMBIOS_DE_NODOS, 'a', '  Precio en origen  ')
    expect(c).toEqual({ a: { etiqueta: 'Precio en origen' } })
    expect(ponerEtiqueta(c, 'a', '   ')).toBe(c)
    expect(Array.from(ponerEtiqueta(c, 'a', 'ñ'.repeat(90))['a']?.etiqueta ?? '')).toHaveLength(80)
    expect(SIN_CAMBIOS_DE_NODOS).toEqual({})
  })

  it('el formato, sólo uno de los que hay; los dos cambios conviven', () => {
    const c = ponerFormato(ponerEtiqueta(SIN_CAMBIOS_DE_NODOS, 'a', 'Precio'), 'a', 'pct')
    expect(c).toEqual({ a: { etiqueta: 'Precio', formato: 'pct' } })
    expect(ponerFormato(c, 'a', 'otro' as never)).toBe(c)
  })

  it('la definición con lo editado, sin mutar la leída; un nodo que ya no está se ignora', () => {
    const c = { a: { etiqueta: 'Precio', formato: 'raw' as const }, zz: { etiqueta: 'Nada' } }
    const def = definicionConNodos(formulaDePrueba, c)
    expect(def.nodos.find((n) => n.id === 'a')).toMatchObject({
      etiqueta: 'Precio',
      formato: 'raw',
    })
    expect(def.nodos.some((n) => n.id === 'zz')).toBe(false)
    expect(formulaDePrueba.nodos.find((n) => n.id === 'a')?.etiqueta).toBe('A')
    expect(definicionConNodos(formulaDePrueba, SIN_CAMBIOS_DE_NODOS)).toBe(formulaDePrueba)
  })

  it('sólo cuenta lo que cambia de verdad (el formato por omisión es usd)', () => {
    expect(
      cambiosReales(formulaDePrueba, {
        a: { etiqueta: 'A', formato: 'usd' },
        b: { etiqueta: 'Bis' },
        tasa: { formato: 'pct' },
        zz: { etiqueta: 'Nada' },
      }),
    ).toEqual({ b: { etiqueta: 'Bis' } })
  })
})

describe('el borrador de los rótulos', () => {
  it('repone sólo lo que tiene la forma', async () => {
    const { esquemaCambiosDeNodos } = await import('./edicion-de-nodos')
    expect(
      esquemaCambiosDeNodos.safeParse({ a: { etiqueta: 'Precio', formato: 'pct' } }).success,
    ).toBe(true)
    expect(esquemaCambiosDeNodos.safeParse({ a: { formato: 'otro' } }).success).toBe(false)
    expect(esquemaCambiosDeNodos.safeParse({ 'A-b': {} }).success).toBe(false)
  })
})
