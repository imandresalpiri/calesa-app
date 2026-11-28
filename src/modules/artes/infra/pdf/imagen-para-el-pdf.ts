import 'server-only'
import sharp from 'sharp'
import type { Caja } from '../../entities/editor/cajas'
import type { Medidas } from '../../entities/formatos'

// Una imagen de un arte para su PDF (`sharp`, sólo en el servidor): llega en bytes (la ruta que pide el PDF la lee con la sesión de quien pide,
// nunca react-pdf por URL) y sale ya girada según su EXIF, recortada a la parte que se ve al cubrir su caja y achicada a lo que ocupa en la
// hoja: react-pdf la estira a su lugar sin recortar. Con transparencia, PNG; sin ella, JPEG. Un SVG (el logo, uno de la biblioteca: los dos
// pasaron las reglas del SVG al subirse) se dibuja al tamaño que ocupa, no al suyo. Una imagen que `sharp` no lee no se dibuja.
export type ImagenLeida = { medidas: Medidas; conAlfa: boolean; vectorial: boolean }

export type ImagenParaElPdf = { data: Buffer; format: 'png' | 'jpg' }

// Los px por pt de la imagen en la hoja (216 ppp): de sobra para imprimir; nunca se agranda una imagen chica.
const PX_POR_PT = 3
const LADO_MAXIMO = 4096
const ENTRADA = { limitInputPixels: LADO_MAXIMO * LADO_MAXIMO } as const
const CALIDAD_DEL_JPEG = 90

// Las medidas a la vista (con el giro de su EXIF), si tiene transparencia y si es un SVG; nula, `sharp` no la lee.
export async function leerImagen(bytes: Uint8Array): Promise<ImagenLeida | null> {
  try {
    const m = await sharp(bytes, ENTRADA).metadata()
    const { width, height } = m.autoOrient
    if (!(width > 0 && height > 0)) {
      return null
    }
    return {
      medidas: { ancho: width, alto: height },
      conAlfa: m.hasAlpha,
      vectorial: m.format === 'svg',
    }
  } catch {
    return null
  }
}

// La parte de la imagen en px enteros de la imagen dibujada a `escala`, sin salirse de ella.
function enPixeles(parte: Caja, escala: number, imagen: Medidas) {
  const ancho = Math.floor(imagen.ancho * escala)
  const alto = Math.floor(imagen.alto * escala)
  const left = Math.min(Math.max(0, Math.floor(parte.x * escala)), ancho - 1)
  const top = Math.min(Math.max(0, Math.floor(parte.y * escala)), alto - 1)
  return {
    left,
    top,
    width: Math.max(1, Math.min(ancho - left, Math.round(parte.ancho * escala))),
    height: Math.max(1, Math.min(alto - top, Math.round(parte.alto * escala))),
  }
}

// La imagen para un lugar de la hoja (en pt), con la parte `recorte` (en sus px; nula, entera).
export async function imagenParaElPdf(
  bytes: Uint8Array,
  leida: ImagenLeida,
  recorte: Caja | null,
  lugar: Medidas,
): Promise<ImagenParaElPdf | null> {
  const parte = recorte ?? { x: 0, y: 0, ...leida.medidas }
  const ancho = Math.min(LADO_MAXIMO, Math.ceil(lugar.ancho * PX_POR_PT))
  const alto = Math.min(LADO_MAXIMO, Math.ceil(lugar.alto * PX_POR_PT))
  const lado = Math.max(leida.medidas.ancho, leida.medidas.alto)
  const escala = leida.vectorial
    ? Math.min(
        Math.max(1, Math.max(ancho, alto) / Math.max(parte.ancho, parte.alto)),
        LADO_MAXIMO / lado,
      )
    : 1
  try {
    let imagen = sharp(bytes, {
      ...ENTRADA,
      autoOrient: true,
      ...(leida.vectorial ? { density: 72 * escala } : {}),
    })
    if (recorte) {
      imagen = imagen.extract(enPixeles(recorte, escala, leida.medidas))
    }
    imagen = imagen.resize({ width: ancho, height: alto, fit: 'inside', withoutEnlargement: true })
    const data = leida.conAlfa
      ? await imagen.png().toBuffer()
      : await imagen.jpeg({ quality: CALIDAD_DEL_JPEG }).toBuffer()
    return { data, format: leida.conAlfa ? 'png' : 'jpg' }
  } catch {
    return null
  }
}
