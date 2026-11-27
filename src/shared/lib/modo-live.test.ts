import { afterEach, describe, expect, it } from 'vitest'
import {
  CLASE_LIVE,
  CLAVE_LIVE,
  codigoDelGuionDelLive,
  cookieDelLive,
  liveDeLaCookie,
  valorDeLaCookie,
} from './modo-live'

describe('cookieDelLive', () => {
  it('dura un año, va a toda la app y sólo con https lleva Secure', () => {
    expect(cookieDelLive(true, false)).toBe('modo-live=1; Path=/; Max-Age=31536000; SameSite=Lax')
    expect(cookieDelLive(false, true)).toBe(
      'modo-live=0; Path=/; Max-Age=31536000; SameSite=Lax; Secure',
    )
  })
})

describe('liveDeLaCookie y valorDeLaCookie', () => {
  it('sólo «1» es encendido', () => {
    expect(liveDeLaCookie('1')).toBe(true)
    expect(liveDeLaCookie('0')).toBe(false)
    expect(liveDeLaCookie(undefined)).toBe(false)
    expect(liveDeLaCookie('true')).toBe(false)
  })

  it('encuentra la cookie entre otras, o dice que no está', () => {
    expect(valorDeLaCookie('a=1; modo-live=1; menu-plegado=0')).toBe('1')
    expect(valorDeLaCookie('modo-live=0')).toBe('0')
    expect(valorDeLaCookie('otro-modo-live=1')).toBeUndefined()
    expect(valorDeLaCookie('')).toBeUndefined()
  })
})

describe('codigoDelGuionDelLive', () => {
  // Como en el HTML: un <script> con el código tal cual.
  function correr(): void {
    const guion = document.createElement('script')
    guion.textContent = codigoDelGuionDelLive()
    document.body.append(guion)
    guion.remove()
  }

  afterEach(() => {
    document.documentElement.classList.remove(CLASE_LIVE)
    document.cookie = 'modo-live=; Max-Age=0; Path=/'
    localStorage.clear()
  })

  it('manda la cookie aunque localStorage diga otra cosa', () => {
    localStorage.setItem(CLAVE_LIVE, '1')
    document.cookie = 'modo-live=0; Path=/'
    correr()
    expect(document.documentElement.classList.contains(CLASE_LIVE)).toBe(false)
    document.cookie = 'modo-live=1; Path=/'
    localStorage.setItem(CLAVE_LIVE, '0')
    correr()
    expect(document.documentElement.classList.contains(CLASE_LIVE)).toBe(true)
  })

  it('sin cookie usa lo guardado en localStorage', () => {
    localStorage.setItem(CLAVE_LIVE, '1')
    correr()
    expect(document.documentElement.classList.contains(CLASE_LIVE)).toBe(true)
  })
})
