import { describe, expect, it } from 'vitest'
import { vieneDelMismoOrigen } from './mismo-origen'

const de = (cabeceras: Record<string, string>) => vieneDelMismoOrigen(new Headers(cabeceras))

describe('vieneDelMismoOrigen', () => {
  it('con Sec-Fetch-Site, sólo same-origin', () => {
    expect(de({ 'sec-fetch-site': 'same-origin' })).toBe(true)
    for (const sitio of ['same-site', 'cross-site', 'none']) {
      expect(
        de({ 'sec-fetch-site': sitio, origin: 'https://app.ejemplo.com', host: 'app.ejemplo.com' }),
      ).toBe(false)
    }
  })

  it('sin ella, un Origin igual al host', () => {
    expect(de({ origin: 'https://app.ejemplo.com', host: 'app.ejemplo.com' })).toBe(true)
    expect(
      de({
        origin: 'https://app.ejemplo.com',
        host: 'interno:3000',
        'x-forwarded-host': 'app.ejemplo.com',
      }),
    ).toBe(true)
    expect(de({ origin: 'https://otro.com', host: 'app.ejemplo.com' })).toBe(false)
    expect(de({ origin: 'null', host: 'app.ejemplo.com' })).toBe(false)
    expect(de({ host: 'app.ejemplo.com' })).toBe(false)
  })
})
