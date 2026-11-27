// Las reglas de una imagen que entra a la biblioteca de imágenes (docs/GLOSARIO.md › «Biblioteca de imágenes»): qué archivos se aceptan y cómo
// se guarda cada uno sin perder la transparencia. Una foto (sin alfa) va a WebP de hasta 1600 px; lo que tiene alfa nunca va a JPEG (el respaldo
// de Safari cuando no sabe WebP): sube tal cual si ya es PNG o WebP chico y liviano, o se reduce a PNG. Un SVG sube tal cual y es su propia
// miniatura. Puro.
import { conteoAcotado, conteoCorto } from '@/shared/lib/conteo'
import type { TipoDeImagen } from './tipos'

const MB = 1024 * 1024
export const PESO_MAXIMO_ORIGINAL_DE_ARTE = 10 * MB
// El `file_size_limit` del bucket `artes`.
export const PESO_MAXIMO_IMAGEN_DE_ARTE = 5 * MB
export const LADO_MAXIMO_IMAGEN_DE_ARTE = 1600
export const LADO_DE_LA_MINIATURA = 480

export const TIPOS_ADMITIDOS = ['image/png', 'image/webp', 'image/jpeg', 'image/svg+xml'] as const
export const TIPO_SVG = 'image/svg+xml'

export const MENSAJE_TIPO_NO_ADMITIDO = 'Sube una imagen PNG, WebP, JPG o SVG.'
export const MENSAJE_ORIGINAL_PESADO = 'La imagen pesa más de 10 MB.'
export const MENSAJE_AUN_REDUCIDA = 'Aun reducida pesa más de 5 MB; prueba con otra.'

const TIPO_POR_MIME: Readonly<Record<string, TipoDeImagen>> = {
  'image/png': 'png',
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/svg+xml': 'svg',
}

// El tipo de la biblioteca de lo que de verdad se va a subir (el `type` del blob), o nulo si no es uno admitido.
export function tipoDeImagenDe(mime: string): TipoDeImagen | null {
  return TIPO_POR_MIME[mime] ?? null
}

// Por qué no se acepta un archivo antes de abrirlo, o nulo. Un SVG pasa además por las reglas de `empresa` (sin código, ≤ 200 KB, con medidas).
export function motivoDeArchivoInvalido(archivo: { tipo: string; peso: number }): string | null {
  if (tipoDeImagenDe(archivo.tipo) === null) {
    return MENSAJE_TIPO_NO_ADMITIDO
  }
  return archivo.peso > PESO_MAXIMO_ORIGINAL_DE_ARTE ? MENSAJE_ORIGINAL_PESADO : null
}

export type ComoSeGuarda = 'tal-cual' | 'png' | 'webp' | 'svg'

// Cómo se guarda una imagen ya abierta: `conAlfa`, si algún píxel no es opaco (`inspeccionarImagen()`).
export function comoSeGuarda(imagen: {
  tipo: string
  conAlfa: boolean
  ancho: number
  alto: number
  peso: number
}): ComoSeGuarda {
  if (imagen.tipo === TIPO_SVG) {
    return 'svg'
  }
  if (!imagen.conAlfa) {
    return 'webp'
  }
  const conAlfaYa = imagen.tipo === 'image/png' || imagen.tipo === 'image/webp'
  const cabe =
    Math.max(imagen.ancho, imagen.alto) <= LADO_MAXIMO_IMAGEN_DE_ARTE &&
    imagen.peso <= PESO_MAXIMO_IMAGEN_DE_ARTE
  return conAlfaYa && cabe ? 'tal-cual' : 'png'
}

// Lo que sale de la preparación pesa más de lo que admite el bucket.
export function motivoDePesoFinal(peso: number): string | null {
  return peso > PESO_MAXIMO_IMAGEN_DE_ARTE ? MENSAJE_AUN_REDUCIDA : null
}

// `artes_imagen_usos()` cuenta con tope: 101 dice «más de 100».
export const TOPE_DE_USOS = 100

// Lo que dice la confirmación de quitar sobre cuántas plantillas de arte usan la imagen: con alguna, «Quitar» queda apagado.
export function textoDeUsos(usos: number): string {
  if (usos <= 0) {
    return 'Ninguna plantilla de arte la usa.'
  }
  if (usos === 1) {
    return 'La usa 1 plantilla. Quítala de esa plantilla antes.'
  }
  return `La usan ${conteoCorto(conteoAcotado(usos, TOPE_DE_USOS))} plantillas. Quítala de esas plantillas antes.`
}
