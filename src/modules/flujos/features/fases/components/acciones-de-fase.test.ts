import { describe, expect, it, vi } from 'vitest'
import { accionesDeFase, accionesDelPanelDeFase } from './acciones-de-fase'

const quehaceres = { alEditar: vi.fn(), alPedirQuitar: vi.fn(), alReactivar: vi.fn() }

describe('accionesDeFase', () => {
  it('una activa ofrece Editar y, aparte, Jubilar o eliminar como destructiva', () => {
    const lineas = accionesDeFase({ activa: true }, quehaceres)
    expect(lineas.map((l) => l.clave)).toEqual(['editar', 'antes-de-quitar', 'quitar'])
    const quitar = lineas.find((l) => l.clave === 'quitar')
    expect(quitar).toMatchObject({ etiqueta: 'Jubilar o eliminar', destructiva: true })
  })

  it('una jubilada ofrece Editar y Reactivar, nada que elimine', () => {
    const lineas = accionesDeFase({ activa: false }, quehaceres)
    expect(lineas.map((l) => l.clave)).toEqual(['editar', 'reactivar'])
  })

  it('cada línea llama a lo suyo', () => {
    for (const l of accionesDeFase({ activa: true }, quehaceres)) {
      if (l.tipo === 'accion') l.alElegir()
    }
    expect(quehaceres.alEditar).toHaveBeenCalledTimes(1)
    expect(quehaceres.alPedirQuitar).toHaveBeenCalledTimes(1)
    expect(quehaceres.alReactivar).not.toHaveBeenCalled()
  })
})

describe('accionesDelPanelDeFase', () => {
  const libres: Record<'subir' | 'bajar', string | null> = { subir: null, bajar: null }
  const claves = (activa: boolean, motivoSinMover = libres) =>
    accionesDelPanelDeFase(
      { activa },
      { alMover: vi.fn(), alPedirQuitar: vi.fn(), motivoSinMover },
    ).map((l) => l.clave)

  it('una activa mueve antes y después y, aparte, Jubilar o eliminar como destructiva', () => {
    expect(claves(true)).toEqual(['subir', 'bajar', 'antes-de-quitar', 'quitar'])
    const quitar = accionesDelPanelDeFase(
      { activa: true },
      { alMover: vi.fn(), alPedirQuitar: vi.fn(), motivoSinMover: libres },
    ).find((l) => l.clave === 'quitar')
    expect(quitar).toMatchObject({ etiqueta: 'Jubilar o eliminar', destructiva: true })
  })

  it('una jubilada sólo se mueve: nada que elimine', () => {
    expect(claves(false)).toEqual(['subir', 'bajar'])
  })

  it('una apagada dice su motivo debajo de ella', () => {
    expect(claves(true, { subir: 'Ya es la primera.', bajar: null })).toEqual([
      'subir',
      'motivo-subir',
      'bajar',
      'antes-de-quitar',
      'quitar',
    ])
  })

  it('con el mismo motivo para las dos, se dice una sola vez', () => {
    const motivo = 'Hay más de 200 fases.'
    const lineas = accionesDelPanelDeFase(
      { activa: true },
      {
        alMover: vi.fn(),
        alPedirQuitar: vi.fn(),
        motivoSinMover: { subir: motivo, bajar: motivo },
      },
    )
    expect(lineas.map((l) => l.clave).slice(0, 3)).toEqual(['subir', 'bajar', 'motivo-ambos'])
    expect(lineas.filter((l) => l.tipo === 'accion' && l.deshabilitada)).toHaveLength(2)
  })

  it('cada línea llama a lo suyo', () => {
    const alMover = vi.fn()
    const alPedirQuitar = vi.fn()
    for (const l of accionesDelPanelDeFase(
      { activa: true },
      { alMover, alPedirQuitar, motivoSinMover: libres },
    )) {
      if (l.tipo === 'accion') l.alElegir()
    }
    expect(alMover.mock.calls).toEqual([['subir'], ['bajar']])
    expect(alPedirQuitar).toHaveBeenCalledTimes(1)
  })
})
