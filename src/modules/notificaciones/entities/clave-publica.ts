// La clave pública VAPID (P-256, 65 bytes sin comprimir, base64url) → los bytes que pide `pushManager.subscribe`.
export const LARGO_DE_CLAVE_PUBLICA = 65

const BASE64URL = /^[A-Za-z0-9_-]+$/

export function bytesDeClavePublica(clave: string): Uint8Array<ArrayBuffer> | null {
  if (!BASE64URL.test(clave)) return null
  const base64 = clave.replace(/-/g, '+').replace(/_/g, '/')
  const relleno = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  let binario: string
  try {
    binario = atob(relleno)
  } catch {
    return null
  }
  if (binario.length !== LARGO_DE_CLAVE_PUBLICA) return null
  const bytes = new Uint8Array(new ArrayBuffer(binario.length))
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i)
  return bytes
}

// Al revés: los bytes de la clave con que se suscribió el navegador (`PushSubscription.options.applicationServerKey`) → base64url sin relleno, o nulo
// si no son los 65 de una clave VAPID. Con ella se vuelve a suscribir sin pedirla al servidor (el push silenciado por el Modo Live).
export function textoDeClavePublica(bytes: ArrayBuffer | Uint8Array): string | null {
  const vista = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)
  if (vista.length !== LARGO_DE_CLAVE_PUBLICA) return null
  let binario = ''
  for (const byte of vista) binario += String.fromCharCode(byte)
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
