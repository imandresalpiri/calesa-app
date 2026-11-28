// Lo que el lienzo del editor de artes pide para dibujar una imagen de la biblioteca o un logo: siempre por una ruta del mismo origen que
// recibe un id, nunca una URL (`/artes/imagenes/<id>`, `/artes/logos/<variante>`), así el lienzo no queda «teñido» y exportar no falla. Las
// cabeceras de esas respuestas. Puro.
import { z } from 'zod'

export const TIPOS_DE_MEDIO = {
  webp: 'image/webp',
  png: 'image/png',
  jpg: 'image/jpeg',
  svg: 'image/svg+xml',
} as const
export type ExtensionDeMedio = keyof typeof TIPOS_DE_MEDIO
export const EXTENSIONES_DE_MEDIO = Object.keys(TIPOS_DE_MEDIO) as ExtensionDeMedio[]

// Un SVG servido no corre scripts ni pide nada: sólo su estilo en línea.
export const CSP_DEL_SVG = "default-src 'none'; style-src 'unsafe-inline'; sandbox"

// La variante de un logo en la ruta: una de las dos fijas o el guid de una con nombre.
export const esquemaDeLaVarianteDelLogo = z.union([
  z.literal('principal'),
  z.literal('oscuro'),
  z.guid(),
])

export const rutaDeLaImagenDelLienzo = (id: string) => `/artes/imagenes/${encodeURIComponent(id)}`
export const rutaDelLogoDelLienzo = (variante: string | null) =>
  `/artes/logos/${encodeURIComponent(variante ?? 'principal')}`

// La etiqueta de un objeto por su ruta en el bucket: la de la biblioteca es por hash (`imagenes/<sha256>.<ext>`), así que la ruta es su
// versión. Sólo lo que una ETag admite entre comillas.
export function etiquetaDeLaRuta(ruta: string): string {
  return `"${ruta.replace(/[^\w./-]/g, '_')}"`
}

export const SIN_MEDIO = {
  'Cache-Control': 'private, no-store',
  'X-Content-Type-Options': 'nosniff',
} as const

// `inmutable`: el objeto no cambia nunca para esa ruta (la biblioteca); si no (un logo, que puede cambiar de archivo), se pregunta cada vez.
export function cabecerasDelMedio(medio: {
  extension: ExtensionDeMedio
  etiqueta: string
  inmutable: boolean
}): Record<string, string> {
  return {
    'Content-Type': TIPOS_DE_MEDIO[medio.extension],
    'Cache-Control': medio.inmutable ? 'private, max-age=86400, immutable' : 'private, no-cache',
    ETag: medio.etiqueta,
    'X-Content-Type-Options': 'nosniff',
    ...(medio.extension === 'svg' ? { 'Content-Security-Policy': CSP_DEL_SVG } : {}),
  }
}
