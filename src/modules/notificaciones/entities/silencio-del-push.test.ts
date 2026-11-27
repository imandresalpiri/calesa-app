import { describe, expect, it } from 'vitest'
import { pasoDelSilencio } from './silencio-del-push'

describe('pasoDelSilencio', () => {
  it('encendido y sin marca: silenciar; con la marca (con o sin clave), nada', () => {
    expect(pasoDelSilencio(true, null)).toBe('silenciar')
    expect(pasoDelSilencio(true, 'BPclave')).toBe('nada')
    expect(pasoDelSilencio(true, '')).toBe('nada')
  })

  it('apagado con la marca: reanudar (también vacía, para borrarla); sin marca, nada', () => {
    expect(pasoDelSilencio(false, 'BPclave')).toBe('reanudar')
    expect(pasoDelSilencio(false, '')).toBe('reanudar')
    expect(pasoDelSilencio(false, null)).toBe('nada')
  })
})
