import { describe, expect, it } from 'vitest'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import { lugarDelRechazo } from './pieza-del-rechazo'

const d = disenoDe([
  seccion('base', [
    celda('a'),
    { tipo: 'atajos', nodo: 'a', columna: 'x', filas: 2 },
    { tipo: 'variante', nodo: 'variante' },
  ]),
  seccion('costos', [celda('neto')], { nivel_ver: 'costos', nivel_editar: 'costos' }),
  seccion('sin_nivel', [celda('b')]),
])
const pieza = (p: object) => ({ tipo: 'pieza', pieza: p })

describe('a qué pieza apunta un rechazo', () => {
  it('lo que nombra un nodo es la pieza que lo dibuja, antes que sus atajos', () => {
    expect(lugarDelRechazo(d, { regla: 'celda_no_es_valor', donde: 'a' })).toEqual(
      pieza({ pieza: 'nodo', nodo: 'a' }),
    )
    expect(lugarDelRechazo(d, { regla: 'variante_no_es_opcion', donde: 'variante' })).toEqual(
      pieza({ pieza: 'nodo', nodo: 'variante' }),
    )
    expect(lugarDelRechazo(d, { regla: 'nodo_inexistente', donde: 'zz' })).toBeNull()
  })

  it('las reglas de los atajos apuntan a los atajos aunque compartan el nodo con la celda', () => {
    expect(lugarDelRechazo(d, { regla: 'atajos_no_es_tabla', donde: 'a' })).toEqual(
      pieza({ pieza: 'atajos', nodo: 'a' }),
    )
  })

  it('las del total y la tarjeta van a la tarjeta del total; las de los modos, a la cabecera', () => {
    expect(lugarDelRechazo(d, { regla: 'total_con_nivel', donde: 'costos' })).toEqual(
      pieza({ pieza: 'total' }),
    )
    expect(lugarDelRechazo(d, { regla: 'tarjeta_no_es_el_total', donde: 'neto' })).toEqual(
      pieza({ pieza: 'total' }),
    )
    expect(lugarDelRechazo(d, { regla: 'modo_duplicado', donde: 'cabecera' })).toEqual(
      pieza({ pieza: 'cabecera' }),
    )
  })

  it('un nivel: la sección si lo lleva, si no la pieza del nodo', () => {
    expect(lugarDelRechazo(d, { regla: 'nivel_inexistente', donde: 'costos' })).toEqual(
      pieza({ pieza: 'seccion', seccion: 'costos' }),
    )
    expect(lugarDelRechazo(d, { regla: 'editar_sin_ver', donde: 'b' })).toEqual(
      pieza({ pieza: 'nodo', nodo: 'b' }),
    )
    expect(lugarDelRechazo(d, { regla: 'demasiados_items', donde: 'sin_nivel' })).toEqual(
      pieza({ pieza: 'seccion', seccion: 'sin_nivel' }),
    )
  })

  it('una fila sin celda va a «Sin lugar en la hoja»', () => {
    expect(lugarDelRechazo(d, { regla: 'nodo_sin_seccion', donde: 'libre' })).toEqual({
      tipo: 'sin_lugar',
      nodo: 'libre',
    })
  })

  it('un rechazo de forma sigue la ruta de Zod', () => {
    const forma = (campo: string) => lugarDelRechazo(d, { regla: 'forma', campo })
    expect(forma('diseno.secciones.0.items.1.filas')).toEqual(pieza({ pieza: 'atajos', nodo: 'a' }))
    expect(forma('diseno.secciones.2.relleno')).toEqual(
      pieza({ pieza: 'seccion', seccion: 'sin_nivel' }),
    )
    expect(forma('diseno.cabecera.modos.0')).toEqual(pieza({ pieza: 'cabecera' }))
    expect(forma('diseno.tarjeta_total.nodo')).toEqual(pieza({ pieza: 'total' }))
    expect(forma('diseno.secciones.9.items.0')).toBeNull()
    expect(forma('params.x')).toBeNull()
  })
})
