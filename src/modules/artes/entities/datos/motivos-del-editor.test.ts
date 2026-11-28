import { describe, expect, it } from 'vitest'
import { MOTIVO_SIN_EL_MENSAJE_DEL_PORTAL, motivoSinVehiculosDeEjemplo } from './motivos-del-editor'

describe('los motivos del editor de artes', () => {
  it('nombran el origen y a quién le toca', () => {
    expect(motivoSinVehiculosDeEjemplo('Copart')).toBe(
      'No ves los vehículos de Copart: el arte usa los datos de ejemplo.',
    )
    expect(MOTIVO_SIN_EL_MENSAJE_DEL_PORTAL).toBe('Sólo quien configura Leads cambia este mensaje.')
  })
})
