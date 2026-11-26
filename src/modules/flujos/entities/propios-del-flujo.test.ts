import { describe, expect, it } from 'vitest'
import { compartidosTapados, quienTapa } from './propios-del-flujo'

const tipo = (id: string, nombre: string, activo = true) => ({ id, nombre, activo })

describe('compartidosTapados', () => {
  it('tapa el compartido con la clave de un propio activo, sin importar mayúsculas, tildes ni espacios', () => {
    const compartidos = [tipo('bl', 'BL'), tipo('factura', 'Factura'), tipo('poliza', 'Póliza')]
    const propios = [tipo('bl-propio', '  bl '), tipo('poliza-propia', 'poliza', false)]
    expect([...compartidosTapados(compartidos, propios)]).toEqual(['bl'])
  })

  it('sin propios no tapa nada, y un propio nunca está tapado', () => {
    expect(compartidosTapados([tipo('bl', 'BL')], []).size).toBe(0)
    expect(compartidosTapados([], [tipo('bl', 'BL')]).size).toBe(0)
  })
})

describe('quienTapa', () => {
  it('nombra el origen; sin origen, el flujo de repuestos', () => {
    expect(quienTapa('Miami')).toBe('el de Miami')
    expect(quienTapa(null)).toBe('el del flujo de repuestos')
  })
})
