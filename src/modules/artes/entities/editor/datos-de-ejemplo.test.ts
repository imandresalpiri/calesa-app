import { describe, expect, it } from 'vitest'
import {
  DATOS_DE_EJEMPLO,
  FOTOS_DE_EJEMPLO,
  fotoDeEjemplo,
  TARJETA_DE_EJEMPLO,
} from './datos-de-ejemplo'
import { VARIABLES_DE_ARTE } from './variables'

describe('los datos de ejemplo', () => {
  it('llenan cada variable del arte', () => {
    for (const { clave } of VARIABLES_DE_ARTE) {
      expect(DATOS_DE_EJEMPLO[clave]).toBeTruthy()
    }
  })

  it('no llevan montos', () => {
    for (const valor of Object.values(DATOS_DE_EJEMPLO)) {
      expect(valor).not.toMatch(/\$|Bs|USD|BOB/)
    }
  })

  it('las fotos dan la vuelta después de la tercera', () => {
    expect(fotoDeEjemplo(0)).toBe(FOTOS_DE_EJEMPLO[0])
    expect(fotoDeEjemplo(3)).toBe(FOTOS_DE_EJEMPLO[0])
    expect(fotoDeEjemplo(4)).toBe(FOTOS_DE_EJEMPLO[1])
    expect(fotoDeEjemplo(-1)).toBe(FOTOS_DE_EJEMPLO[2])
  })

  it('todas las imágenes son del mismo origen', () => {
    for (const imagen of [...FOTOS_DE_EJEMPLO, TARJETA_DE_EJEMPLO]) {
      expect(imagen.src).toMatch(/^\/artes\/ejemplo\/[a-z0-9-]+\.svg$/)
    }
  })
})
