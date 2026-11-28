// De dónde sale cada imagen de un arte al armar su PDF en el servidor: el `src` que pone `fuenteDeLaCapa()` (siempre una ruta del mismo origen)
// leído al revés, para que la ruta del PDF la lea con su lector y la sesión de quien pide, sin pedirse a sí misma por HTTP. Lo que no es una de
// esas rutas con sus ids válidos no se lee. Puro.
import { z } from 'zod'
import { esquemaDeLaVarianteDelLogo, LADOS_DE_LA_FOTO, type LadoDeLaFoto } from '../medios'

export type ImagenDelPdf =
  | { tipo: 'biblioteca'; id: string }
  | { tipo: 'logo'; variante: string }
  | { tipo: 'foto'; vehiculoId: string; fotoId: string; lado: LadoDeLaFoto }
  | { tipo: 'tarjeta'; cotizacionId: string; sinMoneda: boolean }
  | { tipo: 'ejemplo'; archivo: string }

const BIBLIOTECA = /^\/artes\/imagenes\/([^/?]+)$/
const LOGO = /^\/artes\/logos\/([^/?]+)$/
const FOTO = /^\/artes\/fotos\/([^/?]+)\/([^/?]+)\?ancho=(\d+)$/
const TARJETA = /^\/cotizaciones\/([^/?]+)\/imagen(\?sin-moneda=1)?$/
const EJEMPLO = /^\/artes\/ejemplo\/([a-z0-9-]+\.svg)$/

const guid = z.guid()

function decodificado(parte: string | undefined): string | null {
  if (parte === undefined) {
    return null
  }
  try {
    return decodeURIComponent(parte)
  } catch {
    return null
  }
}

const unGuid = (parte: string | undefined) => {
  const leido = guid.safeParse(decodificado(parte))
  return leido.success ? leido.data : null
}

function deLaFoto(src: string): ImagenDelPdf | null {
  const [, vehiculo, foto, ancho] = FOTO.exec(src) ?? []
  const vehiculoId = unGuid(vehiculo)
  const fotoId = unGuid(foto)
  const lado = LADOS_DE_LA_FOTO.find((l) => String(l) === ancho)
  return vehiculoId && fotoId && lado ? { tipo: 'foto', vehiculoId, fotoId, lado } : null
}

function delLogo(src: string): ImagenDelPdf | null {
  const variante = esquemaDeLaVarianteDelLogo.safeParse(decodificado(LOGO.exec(src)?.[1]))
  return variante.success ? { tipo: 'logo', variante: variante.data } : null
}

export function deDondeSaleLaImagen(src: string): ImagenDelPdf | null {
  if (BIBLIOTECA.test(src)) {
    const id = unGuid(BIBLIOTECA.exec(src)?.[1])
    return id ? { tipo: 'biblioteca', id } : null
  }
  if (LOGO.test(src)) {
    return delLogo(src)
  }
  if (FOTO.test(src)) {
    return deLaFoto(src)
  }
  const tarjeta = TARJETA.exec(src)
  if (tarjeta) {
    const cotizacionId = unGuid(tarjeta[1])
    return cotizacionId
      ? { tipo: 'tarjeta', cotizacionId, sinMoneda: tarjeta[2] !== undefined }
      : null
  }
  const archivo = EJEMPLO.exec(src)?.[1]
  return archivo ? { tipo: 'ejemplo', archivo } : null
}
