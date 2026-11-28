import { describe, expect, it } from 'vitest'
import { MENSAJE_SIN_PDF } from './exportar'
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
    expect(lineasDelMenuDelEditor('vertical')[0]).toMatchObject({ deshabilitada: false })
  })

  it('en Carta o A4 exportar va apagado y la nota dice por qué', () => {
    const lineas = lineasDelMenuDelEditor('carta')
    expect(lineas[0]).toMatchObject({ clave: 'exportar-png', deshabilitada: true })
    expect(lineas[1]).toEqual({ tipo: 'nota', clave: 'sin-pdf', texto: MENSAJE_SIN_PDF })
    expect(claves('a4')).toContain('sin-pdf')
  })
})
