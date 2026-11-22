import { describe, expect, it } from 'vitest'
import { destinoDeLasTablasCompartidas } from './destino'

const A = '11111111-1111-4111-8111-111111111111'
const B = '22222222-2222-4222-8222-222222222222'
const C = '33333333-3333-4333-8333-333333333333'
const T = '44444444-4444-4444-8444-444444444444'
const planilla = (origen: string) => `/configuracion/origenes/${origen}/planilla`

const compartida = (...conPropia: string[]) => ({ propiaDe: null, conPropia })

describe('destinoDeLasTablasCompartidas', () => {
  it('sin tabla: el drawer del primer origen que configura, con el resto de la consulta', () => {
    expect(
      destinoDeLasTablasCompartidas({ configurables: [A, B], uso: null, parametros: {} }),
    ).toBe(`${planilla(A)}?panel=tablas`)
    expect(
      destinoDeLasTablasCompartidas({
        configurables: [A],
        uso: null,
        parametros: { panel: 'nueva-tabla' },
      }),
    ).toBe(`${planilla(A)}?panel=tablas&accion=nueva-tabla`)
  })

  it('una compartida: el primero que la recibe (no tiene una propia con su clave)', () => {
    expect(
      destinoDeLasTablasCompartidas({
        configurables: [A, B, C],
        uso: compartida(A),
        parametros: { tabla: T },
      }),
    ).toBe(`${planilla(B)}?panel=tablas&tabla=${T}`)
  })

  it('el `?panel=` viejo de la tabla pasa a `accion`', () => {
    expect(
      destinoDeLasTablasCompartidas({
        configurables: [A],
        uso: compartida(),
        parametros: { tabla: T, panel: 'publicar-tabla' },
      }),
    ).toBe(`${planilla(A)}?panel=tablas&tabla=${T}&accion=publicar-tabla`)
    expect(
      destinoDeLasTablasCompartidas({
        configurables: [A],
        uso: compartida(),
        parametros: { tabla: T, panel: 'columnas-de-tabla' },
      }),
    ).toBe(`${planilla(A)}?panel=tablas&tabla=${T}&accion=columnas-de-tabla`)
  })

  it('una propia va al origen dueño si la persona lo configura', () => {
    expect(
      destinoDeLasTablasCompartidas({
        configurables: [A, B],
        uso: { propiaDe: B, conPropia: [] },
        parametros: { tabla: T },
      }),
    ).toBe(`${planilla(B)}?panel=tablas&tabla=${T}`)
  })

  it('una tabla que nadie de los suyos recibe o que no existe: el primero, sin la tabla ni su panel', () => {
    for (const uso of [null, compartida(A, B), { propiaDe: C, conPropia: [] }]) {
      expect(
        destinoDeLasTablasCompartidas({
          configurables: [A, B],
          uso,
          parametros: { tabla: T, panel: 'publicar-tabla' },
        }),
      ).toBe(`${planilla(A)}?panel=tablas`)
    }
  })

  it('sin tabla que abrir conserva «Nueva tabla» y lo demás de la consulta', () => {
    expect(
      destinoDeLasTablasCompartidas({
        configurables: [A],
        uso: null,
        parametros: { tabla: T, panel: 'nueva-tabla', x: '1' },
      }),
    ).toBe(`${planilla(A)}?panel=tablas&x=1&accion=nueva-tabla`)
  })

  it('sin ningún origen que configure: el inicio de Configuración', () => {
    expect(
      destinoDeLasTablasCompartidas({ configurables: [], uso: null, parametros: { tabla: T } }),
    ).toBe('/configuracion/inicio')
  })
})
