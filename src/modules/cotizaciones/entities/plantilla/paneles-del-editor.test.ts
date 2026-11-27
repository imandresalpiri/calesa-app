import { describe, expect, it } from 'vitest'
import { motivoDelContenido, panelDeLaSeleccion } from './paneles-del-editor'

describe('panelDeLaSeleccion', () => {
  it('sin nada elegido no hay panel de celda y dice por qué', () => {
    expect(panelDeLaSeleccion(null)).toEqual({
      contenido: 'nada',
      nombre: 'Celda',
      motivo: 'Elige una celda o una fila.',
    })
  })

  it('filas: «Fila»; celdas y columnas: «Celda»', () => {
    expect(panelDeLaSeleccion({ tipo: 'filas', desde: 1, hasta: 2 })).toMatchObject({
      contenido: 'fila',
      nombre: 'Fila',
      motivo: null,
    })
    expect(
      panelDeLaSeleccion({ tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 0, k: 1 } }),
    ).toMatchObject({ contenido: 'celda', nombre: 'Celda' })
    expect(panelDeLaSeleccion({ tipo: 'columnas', desde: 0, hasta: 0 })).toMatchObject({
      contenido: 'celda',
      nombre: 'Celda',
    })
  })
})

describe('motivoDelContenido', () => {
  it('sólo se pone contenido en celdas o columnas', () => {
    expect(motivoDelContenido(null)).toBe('Elige una celda.')
    expect(motivoDelContenido({ tipo: 'filas', desde: 0, hasta: 0 })).toBe(
      'Elige una celda, no una fila.',
    )
    expect(
      motivoDelContenido({ tipo: 'celdas', ancla: { f: 0, k: 0 }, foco: { f: 0, k: 0 } }),
    ).toBeNull()
    expect(motivoDelContenido({ tipo: 'columnas', desde: 0, hasta: 0 })).toBeNull()
  })
})
