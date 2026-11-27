import type { DocumentoDeLaUnidad } from './documento'

// La vista previa de un documento: qué forma tiene su archivo (imagen, PDF u otro), cuál se dibuja como miniatura y a quién se pasa con las flechas. Pura: sin I/O.

export type FormaDelArchivo = 'imagen' | 'pdf' | 'otro'

type Archivo = Pick<DocumentoDeLaUnidad, 'mime' | 'nombre'>

const IMAGENES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const DE_IMAGEN = /\.(jpe?g|png|webp|gif)$/i

/**
 * El peso máximo de una imagen para dibujarla como miniatura: los documentos se guardan sin comprimir (hasta 25 MB) y una fila nunca baja un original de varios MB. Por encima, su icono.
 * Lo anota `docs/RENDIMIENTO.md` › «Página de la unidad».
 */
export const TOPE_DE_PESO_DE_LA_MINIATURA = 1_500_000

/** La forma del archivo: por su tipo de contenido y, si no lo trae, por la extensión de su nombre. */
export function formaDelArchivo({ mime, nombre }: Archivo): FormaDelArchivo {
  if (mime === 'application/pdf') return 'pdf'
  if (mime !== null && IMAGENES.has(mime)) return 'imagen'
  if (mime === null || mime === '') {
    if (nombre !== null && /\.pdf$/i.test(nombre)) return 'pdf'
    if (nombre !== null && DE_IMAGEN.test(nombre)) return 'imagen'
  }
  return 'otro'
}

/** La extensión en mayúsculas para decir de qué es el archivo («PDF», «JPG»); `ARCHIVO` si no se sabe. */
export function extensionDelArchivo({ mime, nombre }: Archivo): string {
  const deNombre = /\.([a-z0-9]{1,5})$/i.exec(nombre ?? '')?.[1]
  if (deNombre) return deNombre.toUpperCase()
  if (mime === 'application/pdf') return 'PDF'
  if (mime === 'image/jpeg') return 'JPG'
  if (mime === 'image/png') return 'PNG'
  if (mime === 'image/webp') return 'WEBP'
  return 'ARCHIVO'
}

/** ¿Se dibuja la imagen como miniatura? Es una imagen, tiene archivo y pesa hasta el tope (sin peso conocido, no). */
export function usaMiniatura(
  documento: Pick<DocumentoDeLaUnidad, 'mime' | 'nombre' | 'bytes' | 'ruta'>,
): boolean {
  return (
    documento.ruta !== null &&
    formaDelArchivo(documento) === 'imagen' &&
    documento.bytes !== null &&
    documento.bytes <= TOPE_DE_PESO_DE_LA_MINIATURA
  )
}

/** Las rutas que piden miniatura, sin repetir (varios documentos pueden compartir objeto). */
export function rutasDeLasMiniaturas(
  documentos: readonly Pick<DocumentoDeLaUnidad, 'mime' | 'nombre' | 'bytes' | 'ruta'>[],
): string[] {
  const rutas = new Set<string>()
  for (const d of documentos) {
    if (d.ruta !== null && usaMiniatura(d)) rutas.add(d.ruta)
  }
  return [...rutas]
}

/** El id vecino de `actual` en el orden en que se ven (`1` el siguiente, `-1` el anterior); nulo en los extremos o si `actual` no está. */
export function vecinoDe(
  ids: readonly string[],
  actual: string | null,
  paso: 1 | -1,
): string | null {
  if (actual === null) return null
  const i = ids.indexOf(actual)
  if (i === -1) return null
  return ids[i + paso] ?? null
}
