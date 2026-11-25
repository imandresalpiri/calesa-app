import { describe, expect, it } from 'vitest'
import configuracion from '../../../../../next.config'

describe('/repuestos/configuracion', () => {
  it('la raíz de la configuración abre el flujo, en el servidor y de forma permanente (308)', async () => {
    const reglas = (await configuracion('phase-development-server').redirects?.()) ?? []
    expect(reglas.find((r) => r.source === '/repuestos/configuracion')).toEqual({
      source: '/repuestos/configuracion',
      destination: '/repuestos/configuracion/flujo',
      permanent: true,
    })
  })
})
