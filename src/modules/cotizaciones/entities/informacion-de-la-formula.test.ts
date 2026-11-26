import { describe, expect, it } from 'vitest'
import { marcaDeLaInformacion } from './informacion-de-la-formula'

const base = { conPublicada: true, atrasado: false, conAvisos: false, origen: 'Japón' }

describe('marcaDeLaInformacion', () => {
  it('sin nada que bloquee ni avisos, sin marca', () => {
    expect(marcaDeLaInformacion(base)).toBeNull()
  })

  it('sin publicada, dice que no se cotiza en el origen', () => {
    expect(marcaDeLaInformacion({ ...base, conPublicada: false })).toEqual({
      texto: 'Japón no tiene una versión publicada: no se puede cotizar en él.',
    })
  })

  it('un borrador atrasado no se puede publicar', () => {
    expect(marcaDeLaInformacion({ ...base, atrasado: true })?.texto).toBe(
      'El borrador quedó atrasado: no se puede publicar.',
    )
  })

  it('los avisos de la copia pendientes también marcan', () => {
    expect(marcaDeLaInformacion({ ...base, conAvisos: true })?.texto).toBe(
      'Hay avisos de la copia.',
    )
  })

  it('sin publicada gana al atrasado y a los avisos; el atrasado, a los avisos', () => {
    expect(
      marcaDeLaInformacion({ ...base, conPublicada: false, atrasado: true, conAvisos: true })
        ?.texto,
    ).toContain('no tiene una versión publicada')
    expect(marcaDeLaInformacion({ ...base, atrasado: true, conAvisos: true })?.texto).toBe(
      'El borrador quedó atrasado: no se puede publicar.',
    )
  })
})
