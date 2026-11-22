import { describe, expect, it, vi } from 'vitest'
import { accionesDeLaPersona } from './acciones-de-la-persona'

describe('accionesDeLaPersona', () => {
  it('«Editar…» es la principal y va primera; «Quitar de la rueda» es la destructiva', () => {
    const alEditar = vi.fn()
    const alQuitar = vi.fn()
    const acciones = accionesDeLaPersona({ alEditar, alQuitar })
    expect(acciones.map((a) => a.clave)).toEqual(['editar', 'quitar'])
    const [editar, quitar] = acciones
    expect(editar).toMatchObject({ etiqueta: 'Editar…', principal: true })
    expect(quitar).toMatchObject({ etiqueta: 'Quitar de la rueda', destructiva: true })
    if (editar?.tipo === 'accion') editar.alElegir()
    if (quitar?.tipo === 'accion') quitar.alElegir()
    expect(alEditar).toHaveBeenCalledTimes(1)
    expect(alQuitar).toHaveBeenCalledTimes(1)
  })

  it('las dos abren un modal: esperan a que el menú se cierre', () => {
    const acciones = accionesDeLaPersona({ alEditar: vi.fn(), alQuitar: vi.fn() })
    expect(acciones.every((a) => a.tipo === 'accion' && a.despuesDeCerrar === true)).toBe(true)
  })
})
