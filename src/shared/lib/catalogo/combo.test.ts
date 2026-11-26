import { describe, expect, it } from 'vitest'
import { CREAR, SIN_VALOR, opcionesDelCombo } from './combo'
import type { ElementoDeCatalogo } from './tipos'

function elemento(id: string, nombre: string, orden: number, activo = true): ElementoDeCatalogo {
  return { id, nombre, orden, activo, actualizadoEn: '2026-11-26T10:00:00Z' }
}

const CATALOGO = [
  elemento('a', 'Datos del Cliente', 10),
  elemento('b', 'Ubicación', 20),
  elemento('c', 'Datos viejos', 30, false),
  elemento('d', 'Vehículo', 40),
]

function opciones(texto: string, valorActual: string | null = null, puedeCrear = true) {
  return opcionesDelCombo({ elementos: CATALOGO, valorActual, texto, puedeCrear })
}

describe('opcionesDelCombo', () => {
  it('sin texto ofrece los activos en el orden del catálogo y resalta el elegido o «Sin …»', () => {
    expect(opciones('').opciones.map((o) => o.id)).toEqual(['a', 'b', 'd'])
    expect(opciones('').resaltada).toBe(SIN_VALOR)
    expect(opciones('', 'b').resaltada).toBe('b')
    expect(opciones('').crear).toBeNull()
  })

  it('filtra sin importar mayúsculas, tildes ni espacios de más', () => {
    expect(opciones('UBICACION').opciones.map((o) => o.id)).toEqual(['b'])
    expect(opciones('  datos   del ').opciones.map((o) => o.id)).toEqual(['a'])
  })

  it('el nombre exacto con otra escritura no se ofrece crear: resalta el que existe', () => {
    const resultado = opciones('datos del cliente')
    expect(resultado.existente?.id).toBe('a')
    expect(resultado.crear).toBeNull()
    expect(resultado.resaltada).toBe('a')
  })

  it('un inactivo no se ofrece, pero su nombre bloquea crear', () => {
    const resultado = opciones('datos viejos')
    expect(resultado.opciones).toEqual([])
    expect(resultado.existente?.id).toBe('c')
    expect(resultado.crear).toBeNull()
    expect(resultado.resaltada).toBe(SIN_VALOR)
  })

  it('el inactivo elegido sigue en la lista, marcado', () => {
    expect(opciones('', 'c').opciones).toContainEqual({
      id: 'c',
      nombre: 'Datos viejos',
      inactivo: true,
    })
    expect(opciones('', 'c').resaltada).toBe('c')
  })

  it('un nombre nuevo se ofrece crear, limpio; sin coincidencias, «Crear» es la resaltada', () => {
    const resultado = opciones('  Medidas   nuevas ')
    expect(resultado.crear).toBe('Medidas nuevas')
    expect(resultado.resaltada).toBe(CREAR)
  })

  it('con coincidencias parciales, la primera va antes que «Crear»', () => {
    const resultado = opciones('dat')
    expect(resultado.crear).toBe('dat')
    expect(resultado.resaltada).toBe('a')
  })

  it('sin permiso para crear no se ofrece', () => {
    expect(opciones('Medidas', null, false).crear).toBeNull()
    expect(opciones('Medidas', null, false).resaltada).toBe(SIN_VALOR)
  })
})
