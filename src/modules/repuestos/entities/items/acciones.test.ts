import { describe, expect, it, vi } from 'vitest'
import type { AccionDeMenu } from '@/shared/ui/lista'
import { accionesDelItem } from './acciones'

const hueco: AccionDeMenu[] = [
  { tipo: 'accion', clave: 'stock', etiqueta: 'Stock', alElegir: () => undefined },
  { tipo: 'accion', clave: 'mover', etiqueta: 'Mover a…', alElegir: () => undefined },
]
const entrada = (editable: boolean) => ({
  editable,
  alImagenes: vi.fn(),
  alEliminar: vi.fn(),
})
const claves = (acciones: readonly AccionDeMenu[]) => acciones.map((a) => a.clave)

describe('accionesDelItem', () => {
  it('con permiso: Imágenes, lo del hueco, un separador y Eliminar', () => {
    expect(claves(accionesDelItem(entrada(true), hueco))).toEqual([
      'imagenes',
      'stock',
      'mover',
      'separador-eliminar',
      'eliminar',
    ])
  })

  it('sin permiso o con el proyecto cerrado no hay Eliminar ni separador', () => {
    expect(claves(accionesDelItem(entrada(false), hueco))).toEqual(['imagenes', 'stock', 'mover'])
  })

  it('sin hueco: Imágenes y, con permiso, Eliminar', () => {
    expect(claves(accionesDelItem(entrada(true), []))).toEqual([
      'imagenes',
      'separador-eliminar',
      'eliminar',
    ])
    expect(claves(accionesDelItem(entrada(false), []))).toEqual(['imagenes'])
  })

  it('Eliminar es la acción destructiva y las dos que abren algo esperan al menú', () => {
    const acciones = accionesDelItem(entrada(true), hueco)
    const eliminar = acciones.find((a) => a.clave === 'eliminar')
    const imagenes = acciones.find((a) => a.clave === 'imagenes')
    expect(eliminar).toMatchObject({ destructiva: true, despuesDeCerrar: true })
    expect(imagenes).toMatchObject({ despuesDeCerrar: true })
  })

  it('cada acción llama a lo suyo', () => {
    const e = entrada(true)
    for (const a of accionesDelItem(e, [])) {
      if (a.tipo === 'accion') a.alElegir()
    }
    expect(e.alImagenes).toHaveBeenCalledTimes(1)
    expect(e.alEliminar).toHaveBeenCalledTimes(1)
  })
})
