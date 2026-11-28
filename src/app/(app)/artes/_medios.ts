// Una foto del bucket `vehiculos` para el lienzo del editor de artes, servida por una ruta del mismo origen (`/artes/fotos/<vehiculo>/<foto>`):
// el bucket es de lectura pública, así que se baja por su URL pública (sin el cliente de Supabase ni la secret key) y el cuerpo pasa tal cual,
// sin leerlo entero. Quién la ve lo decide la ruta antes, con la sesión de quien pide. El tipo sale de la extensión de la ruta: las fotos se
// suben como WebP (y las de antes, JPEG o PNG); otra cosa no se sirve.
import 'server-only'
import type { cabecerasDelMedio } from '@/modules/artes'
import { urlPublica } from '@/shared/lib/almacen'

type ExtensionDeLaFoto = Exclude<Parameters<typeof cabecerasDelMedio>[0]['extension'], 'svg'>

// Lo que se espera al bucket: una foto de 1.600 px pesa unos cientos de KB.
const ESPERA_MS = 10_000

const EXTENSIONES = new Map<string, ExtensionDeLaFoto>([
  ['webp', 'webp'],
  ['jpg', 'jpg'],
  ['jpeg', 'jpg'],
  ['png', 'png'],
])

// La extensión del medio por la de la ruta; una que no es de una foto, ninguna.
export function extensionDeLaFoto(ruta: string): ExtensionDeLaFoto | null {
  const extension = /\.([a-z0-9]+)$/i.exec(ruta)?.[1]?.toLowerCase()
  return extension === undefined ? null : (EXTENSIONES.get(extension) ?? null)
}

// `no_esta`: el bucket no la tiene (la fila quedó sin su objeto); `fallo`: no respondió o respondió con un error.
export type FotoBajada =
  { ok: true; cuerpo: ReadableStream<Uint8Array> } | { ok: false; motivo: 'no_esta' | 'fallo' }

export async function bajarLaFoto(ruta: string): Promise<FotoBajada> {
  try {
    const respuesta = await fetch(urlPublica('vehiculos', ruta), {
      cache: 'no-store',
      signal: AbortSignal.timeout(ESPERA_MS),
    })
    if (respuesta.ok && respuesta.body !== null) {
      return { ok: true, cuerpo: respuesta.body }
    }
    return {
      ok: false,
      motivo: respuesta.status === 400 || respuesta.status === 404 ? 'no_esta' : 'fallo',
    }
  } catch {
    return { ok: false, motivo: 'fallo' }
  }
}
