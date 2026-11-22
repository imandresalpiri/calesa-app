import { describe, expect, it } from 'vitest'
import { celda, disenoDe, seccion } from './diseno-de-prueba.soporte'
import { campoDelRechazo } from './campo-del-rechazo'

const d = disenoDe([
  seccion('s', [celda('a')]),
  seccion('t', [celda('c'), { tipo: 'subtotal', nodo: 'neto' }]),
])

describe('campoDelRechazo', () => {
  it('lleva el rechazo de forma a su pieza y su clave', () => {
    expect(campoDelRechazo('diseno.secciones.1.relleno', d)).toStrictEqual({
      pieza: 'seccion',
      seccionId: 't',
      clave: 'relleno',
    })
    expect(campoDelRechazo('diseno.secciones.1.items.1.alto', d)).toStrictEqual({
      pieza: 'item',
      seccionId: 't',
      item: { tipo: 'subtotal', nodo: 'neto' },
      clave: 'alto',
    })
    expect(campoDelRechazo('diseno.cabecera.tono', d)).toStrictEqual({
      pieza: 'cabecera',
      clave: 'tono',
    })
  })

  it('lo que no es del aspecto o no existe no tiene lugar', () => {
    for (const campo of [
      undefined,
      'diseno',
      'diseno.secciones.0.titulo',
      'diseno.secciones.9.relleno',
      'diseno.secciones.0.items.5.alto',
      'diseno.cabecera.modos.0.nombre',
      'otra.cosa',
    ]) {
      expect(campoDelRechazo(campo, d), String(campo)).toBeNull()
    }
  })
})
