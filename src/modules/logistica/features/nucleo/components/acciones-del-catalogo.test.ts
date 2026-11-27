import { describe, expect, it } from 'vitest'
import { accionesDelCatalogo, insigniasDelCatalogo } from './acciones-del-catalogo'

const fila = { id: 'a', activo: true }
const quehaceres = { alEditar: () => undefined, alActivar: () => undefined }

describe('accionesDelCatalogo', () => {
  it('ofrece editar y desactivar, sin eliminar', () => {
    const acciones = accionesDelCatalogo(fila, quehaceres, null)
    expect(acciones.map((a) => a.clave)).toEqual(['editar', 'desactivar'])
    expect(acciones.some((a) => a.tipo === 'accion' && a.deshabilitada)).toBe(false)
  })

  it('una desactivada ofrece activar', () => {
    expect(accionesDelCatalogo({ ...fila, activo: false }, quehaceres, null)[1]?.clave).toBe(
      'activar',
    )
  })

  it('sin permiso, las apaga y dice el motivo', () => {
    const acciones = accionesDelCatalogo(fila, quehaceres, 'Pídelo.')
    expect(acciones.filter((a) => a.tipo === 'accion').every((a) => a.deshabilitada)).toBe(true)
    expect(acciones.at(-1)).toEqual({ tipo: 'nota', clave: 'sin-permiso', texto: 'Pídelo.' })
  })
})

describe('insigniasDelCatalogo', () => {
  it('sólo el compartido tapado lleva la insignia', () => {
    const contexto = { tapados: new Set(['a']), tapado: 'Tapado por el de Miami', sinPermiso: null }
    expect(insigniasDelCatalogo({ id: 'a' }, contexto)).toEqual(['Tapado por el de Miami'])
    expect(insigniasDelCatalogo({ id: 'b' }, contexto)).toEqual([])
  })
})
