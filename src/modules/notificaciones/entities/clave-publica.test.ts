import { describe, expect, it } from 'vitest'
import { bytesDeClavePublica, LARGO_DE_CLAVE_PUBLICA, textoDeClavePublica } from './clave-publica'

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

describe('bytesDeClavePublica', () => {
  it('base64url de 65 bytes → esos 65 bytes', () => {
    const original = Uint8Array.from(
      { length: LARGO_DE_CLAVE_PUBLICA },
      (_, i) => (i * 7 + 250) % 256,
    )
    original[0] = 4
    const clave = base64url(original)
    expect(clave).toHaveLength(87)
    expect(Array.from(bytesDeClavePublica(clave) ?? [])).toEqual(Array.from(original))
  })

  it('rechaza otro largo, vacío y caracteres que no son base64url', () => {
    expect(bytesDeClavePublica(base64url(new Uint8Array(32)))).toBeNull()
    expect(bytesDeClavePublica('')).toBeNull()
    expect(bytesDeClavePublica('abc+/=')).toBeNull()
  })
})

describe('textoDeClavePublica', () => {
  it('los 65 bytes → la clave en base64url, que vuelve a dar esos bytes', () => {
    const original = Uint8Array.from(
      { length: LARGO_DE_CLAVE_PUBLICA },
      (_, i) => (i * 13 + 251) % 256,
    )
    const clave = textoDeClavePublica(original.buffer)
    expect(clave).toBe(base64url(original))
    expect(Array.from(bytesDeClavePublica(clave ?? '') ?? [])).toEqual(Array.from(original))
    expect(textoDeClavePublica(original)).toBe(clave)
  })

  it('otro largo no es una clave', () => {
    expect(textoDeClavePublica(new Uint8Array(32))).toBeNull()
    expect(textoDeClavePublica(new ArrayBuffer(0))).toBeNull()
  })
})
