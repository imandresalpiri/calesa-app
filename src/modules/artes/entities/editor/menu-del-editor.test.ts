import { describe, expect, it } from 'vitest'
import { lineasDelMenuDelEditor } from './menu-del-editor'

const claves = (formato: Parameters<typeof lineasDelMenuDelEditor>[0]) =>
  lineasDelMenuDelEditor(formato).map((l) => l.clave)

describe('el «⋯» del editor de artes', () => {
  it('en un formato de imagen: exportar, duplicar en otro formato y los atajos', () => {
    expect(claves('vertical')).toEqual([
      'exportar-png',
      'otro-formato',
      'separador-de-la-ayuda',
      'atajos',
    ])
    expect(lineasDelMenuDelEditor('vertical')[0]).toMatchObject({
      etiqueta: 'Exportar PNG',
      deshabilitada: false,
    })
  })

  it('en Carta o A4 exporta la página que se ve', () => {
    expect(lineasDelMenuDelEditor('carta')[0]).toMatchObject({
      clave: 'exportar-png',
      etiqueta: 'Exportar esta página en PNG',
      deshabilitada: false,
    })
    expect(claves('a4')).toEqual(claves('vertical'))
  })
})
