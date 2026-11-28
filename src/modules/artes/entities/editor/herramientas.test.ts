import { describe, expect, it } from 'vitest'
import {
  HERRAMIENTAS_DEL_RIEL,
  letraDeLaHerramienta,
  seUsaEnSoloLectura,
  tituloDeLaHerramienta,
} from './herramientas'

describe('el riel de herramientas', () => {
  it('cada herramienta una vez, de mover a imagen', () => {
    expect(new Set(HERRAMIENTAS_DEL_RIEL).size).toBe(HERRAMIENTAS_DEL_RIEL.length)
    expect(HERRAMIENTAS_DEL_RIEL[0]).toBe('mover')
    expect(HERRAMIENTAS_DEL_RIEL.at(-1)).toBe('imagen')
  })

  it('la letra sale de la tabla de atajos', () => {
    expect(letraDeLaHerramienta('mover')).toBe('V')
    expect(letraDeLaHerramienta('mano')).toBe('H')
    expect(letraDeLaHerramienta('rectangulo')).toBe('R')
    expect(letraDeLaHerramienta('pluma')).toBe('P')
    expect(letraDeLaHerramienta('poligono')).toBeNull()
    expect(letraDeLaHerramienta('imagen')).toBeNull()
  })

  it('el título lleva la letra si la hay', () => {
    expect(tituloDeLaHerramienta('rectangulo')).toBe('Rectángulo (R)')
    expect(tituloDeLaHerramienta('linea')).toBe('Línea (L)')
    expect(tituloDeLaHerramienta('poligono')).toBe('Polígono')
  })

  it('en sólo lectura, sólo mover y mano', () => {
    expect(HERRAMIENTAS_DEL_RIEL.filter(seUsaEnSoloLectura)).toEqual(['mover', 'mano'])
  })
})
