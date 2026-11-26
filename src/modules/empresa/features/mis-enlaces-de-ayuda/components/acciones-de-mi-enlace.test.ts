import { describe, expect, it, vi } from 'vitest'
import type { ElementoDeMisEnlaces } from '../../../entities/mis-enlaces-de-ayuda'
import { accionesDeMiEnlace, primeraAccion, urlDelElemento } from './acciones-de-mi-enlace'

const deLaEmpresa: ElementoDeMisEnlaces = {
  tipo: 'empresa',
  enlace: { id: 'a', titulo: 'A', url: 'https://a.com', descripcion: null },
  oculto: false,
}
const propio: ElementoDeMisEnlaces = {
  tipo: 'propio',
  id: 'p',
  titulo: 'Mía',
  url: 'https://m.com',
  descripcion: null,
}

describe('accionesDeMiEnlace', () => {
  const quehaceres = { alEditar: vi.fn(), alQuitar: vi.fn(), alMover: vi.fn() }

  it('uno de la empresa abre, sube y baja; el primero no sube', () => {
    const acciones = accionesDeMiEnlace([deLaEmpresa, propio], deLaEmpresa, quehaceres)
    expect(acciones.map((linea) => linea.clave)).toEqual([
      'abrir',
      'orden-subir',
      'orden-bajar',
      'orden-motivo-subir',
    ])
  })

  it('uno propio se edita primero y se quita al final', () => {
    const acciones = accionesDeMiEnlace([deLaEmpresa, propio], propio, quehaceres)
    expect(acciones.map((linea) => linea.clave)).toEqual([
      'editar',
      'orden-subir',
      'orden-bajar',
      'orden-motivo-bajar',
      'abrir',
      'antes-de-quitar',
      'quitar',
    ])
    primeraAccion(acciones)?.()
    expect(quehaceres.alEditar).toHaveBeenCalledWith('p')
    const subir = acciones[1]
    if (subir?.tipo === 'accion') subir.alElegir()
    expect(quehaceres.alMover).toHaveBeenCalledWith('propio-p', 'subir')
  })

  it('urlDelElemento', () => {
    expect(urlDelElemento(deLaEmpresa)).toBe('https://a.com')
    expect(urlDelElemento(propio)).toBe('https://m.com')
  })
})
