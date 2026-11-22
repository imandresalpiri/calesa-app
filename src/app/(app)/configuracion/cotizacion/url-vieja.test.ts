import { describe, expect, it } from 'vitest'
import { destinoDeLaUrlVieja } from './url-vieja'

const A = '11111111-1111-4111-8111-111111111111'
const ORIGEN = `/configuracion/origenes/${A}`

describe('la URL vieja de Configuración › Cotización', () => {
  it('sin nada, la lista de orígenes', () => {
    expect(destinoDeLaUrlVieja({})).toBe('/configuracion/origenes')
  })

  it('cada pestaña de un origen va a su pestaña en la página del origen', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'formula', origen: A })).toBe(`${ORIGEN}/planilla`)
    expect(destinoDeLaUrlVieja({ seccion: 'diseno', origen: A })).toBe(`${ORIGEN}/hoja`)
    expect(destinoDeLaUrlVieja({ seccion: 'tarjeta', origen: A })).toBe(`${ORIGEN}/tarjeta`)
    expect(destinoDeLaUrlVieja({ seccion: 'tablas', origen: A })).toBe(
      `${ORIGEN}/planilla?panel=tablas`,
    )
  })

  it('con sólo el origen, su Planilla', () => {
    expect(destinoDeLaUrlVieja({ origen: A })).toBe(`${ORIGEN}/planilla`)
  })

  it('los niveles van al bloque «Cotizaciones» de Roles, con sus paneles', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'niveles' })).toBe(
      '/configuracion/roles?bloque=cotizaciones',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'niveles', panel: 'nuevo-nivel' })).toBe(
      '/configuracion/roles?bloque=cotizaciones&panel=nuevo-nivel',
    )
  })

  it('los colores y la vigencia van al modal de su tarjeta en Orígenes', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'colores' })).toBe(
      '/configuracion/origenes?panel=colores',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'tonos' })).toBe('/configuracion/origenes?panel=colores')
    expect(destinoDeLaUrlVieja({ seccion: 'ajustes', origen: A })).toBe(
      '/configuracion/origenes?panel=vigencia',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'vigencia' })).toBe(
      '/configuracion/origenes?panel=vigencia',
    )
  })

  it('el panel propio de la URL vieja manda y el resto de la consulta viaja', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'tonos', panel: 'editar-tono', tono: 'azul' })).toBe(
      '/configuracion/origenes?panel=editar-tono&tono=azul',
    )
    expect(
      destinoDeLaUrlVieja({ seccion: 'colores', panel: ['eliminar-tono', 'x'], tono: 't' }),
    ).toBe('/configuracion/origenes?panel=eliminar-tono&tono=t')
    expect(destinoDeLaUrlVieja({ seccion: 'colores', x: '1' })).toBe(
      '/configuracion/origenes?panel=colores&x=1',
    )
  })

  it('conserva los demás parámetros de un origen', () => {
    expect(
      destinoDeLaUrlVieja({ seccion: 'tablas', origen: A, tabla: 't1', panel: 'publicar-tabla' }),
    ).toBe(`${ORIGEN}/planilla?panel=tablas&tabla=t1&accion=publicar-tabla`)
    expect(destinoDeLaUrlVieja({ seccion: 'diseno', origen: A, vista: '412' })).toBe(
      `${ORIGEN}/hoja?vista=412`,
    )
  })

  it('una pestaña de un origen sin origen, o con uno que no es un id, va a la lista sin parámetros', () => {
    expect(destinoDeLaUrlVieja({ seccion: 'formula', panel: 'publicar-formula' })).toBe(
      '/configuracion/origenes',
    )
    expect(destinoDeLaUrlVieja({ seccion: 'tablas', origen: 'general' })).toBe(
      '/configuracion/origenes',
    )
    expect(destinoDeLaUrlVieja({ seccion: '<script>', origen: A })).toBe('/configuracion/origenes')
  })

  it('nunca devuelve seccion ni origen', () => {
    const casos = [
      { seccion: ['formula', 'tarjeta'], origen: A },
      { seccion: 'tarjeta', origen: [A, A] },
      { seccion: 'niveles', origen: 'x' },
      { origen: 'x', otra: '1' },
    ]
    for (const caso of casos) {
      expect(destinoDeLaUrlVieja(caso)).not.toMatch(/[?&](seccion|origen)=/)
    }
  })
})
