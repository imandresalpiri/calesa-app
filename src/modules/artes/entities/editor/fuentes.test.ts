import { describe, expect, it } from 'vitest'
import { PESOS_DE_TEXTO } from '../documento'
import {
  FUENTE_DEL_PDF,
  FUENTE_POR_DEFECTO,
  FUENTES_DE_ARTE,
  fuenteDe,
  fuenteDelFormato,
  fuentesDelFormato,
  NOMBRES_DE_LOS_PESOS,
} from './fuentes'

describe('las fuentes del editor de artes', () => {
  it('la por defecto es Geist, sin familia fija', () => {
    expect(fuenteDe(FUENTE_POR_DEFECTO)).toEqual({ clave: 'geist', nombre: 'Geist', familia: null })
  })

  it('una clave desconocida cae a la por defecto', () => {
    expect(fuenteDe('comic-sans').clave).toBe(FUENTE_POR_DEFECTO)
    expect(fuenteDe('georgia').familia).toBe('Georgia, serif')
  })

  it('las claves no se repiten y cada una de sistema lleva su respaldo', () => {
    const claves = FUENTES_DE_ARTE.map((f) => f.clave)
    expect(new Set(claves).size).toBe(claves.length)
    for (const fuente of FUENTES_DE_ARTE.filter((f) => f.familia !== null)) {
      expect(fuente.familia).toMatch(/, (sans-serif|serif|monospace)$/)
    }
  })

  it('cada peso tiene su nombre', () => {
    expect(PESOS_DE_TEXTO.map((p) => NOMBRES_DE_LOS_PESOS[p])).toEqual([
      'Normal',
      'Media',
      'Seminegrita',
      'Negrita',
    ])
  })

  it('un formato de PDF ofrece y dibuja sólo Geist; uno de imagen, todas', () => {
    expect(fuentesDelFormato('pdf').map((f) => f.clave)).toEqual(['geist'])
    expect(fuentesDelFormato('imagen')).toBe(FUENTES_DE_ARTE)
    expect(fuenteDelFormato('georgia', 'pdf').clave).toBe('geist')
    expect(fuenteDelFormato('georgia', 'imagen').clave).toBe('georgia')
  })

  it('la Geist del PDF tiene un TTF por cada peso que se ofrece', () => {
    expect(Object.keys(FUENTE_DEL_PDF.archivos).map(Number)).toEqual([...PESOS_DE_TEXTO])
  })
})
