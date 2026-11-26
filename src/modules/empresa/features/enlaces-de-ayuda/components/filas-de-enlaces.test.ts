import { describe, expect, it, vi } from 'vitest'
import type { EnlaceDeAyudaDeLaEmpresa } from '../../../entities/enlaces-de-ayuda'
import { filasDeEnlaces } from './filas-de-enlaces'

const base = { descripcion: null, actualizadoEn: 'v', titulo: 'Manual' }
const enlaces: EnlaceDeAyudaDeLaEmpresa[] = [
  { ...base, id: 'a', url: 'https://uno.com/x', orden: 1, activo: true },
  { ...base, id: 'b', url: 'https://dos.com', orden: 2, activo: false },
]

describe('filasDeEnlaces', () => {
  it('dice el dominio, el lugar y las acciones en su orden', () => {
    const quehaceres = { alEditar: vi.fn(), alActivar: vi.fn(), alPedirQuitar: vi.fn() }
    const [primera, segunda] = filasDeEnlaces(enlaces, quehaceres)
    expect(primera).toMatchObject({ uso: 'uno.com', puedeSubir: false, puedeBajar: true })
    expect(segunda).toMatchObject({
      uso: 'dos.com',
      puedeSubir: true,
      puedeBajar: false,
      activo: false,
    })
    expect(primera?.acciones.map((linea) => linea.clave)).toEqual([
      'editar',
      'desactivar',
      'antes-de-quitar',
      'quitar',
    ])
    expect(segunda?.acciones[1]?.clave).toBe('activar')
    const activar = segunda?.acciones[1]
    if (activar?.tipo === 'accion') activar.alElegir()
    expect(quehaceres.alActivar).toHaveBeenCalledWith(enlaces[1], true)
  })
})
