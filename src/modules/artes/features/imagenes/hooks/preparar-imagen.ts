// Prepara en el navegador una imagen para la biblioteca: decodifica una vez, mira si tiene transparencia y la guarda sin perderla
// (`comoSeGuarda()`), con su miniatura de 480 px. Un SVG pasa por las reglas del de la marca (`@/modules/empresa/client`): peso, sin
// scripts y con medidas.
import { medidasDeSvg, motivoDeSvgInvalido, PESO_MAXIMO_SVG } from '@/modules/empresa/client'
import { fallo, ok, type Resultado } from '@/shared/lib/errores'
import { comprimirEnTamanos, inspeccionarImagen } from '@/shared/lib/imagenes'
import {
  comoSeGuarda,
  LADO_DE_LA_MINIATURA,
  LADO_MAXIMO_IMAGEN_DE_ARTE,
  motivoDeArchivoInvalido,
  motivoDePesoFinal,
  TIPO_SVG,
  tipoDeImagenDe,
} from '../../../entities/imagenes'
import type { ImagenPreparada } from '../../../entities/tipos'

const NO_SE_ABRIO = 'No pudimos abrir la imagen. Prueba con otra.'
const SVG_PESADO = 'El SVG pesa más de 200 KB: expórtalo sin imágenes incrustadas.'
// El `check` de `artes_imagenes`: un SVG puede declarar medidas absurdas.
const LADO_MAXIMO_EN_LA_BASE = 20000

const lado = (n: number): number => Math.min(LADO_MAXIMO_EN_LA_BASE, Math.max(1, Math.round(n)))

async function prepararSvg(archivo: File): Promise<Resultado<ImagenPreparada>> {
  if (archivo.size > PESO_MAXIMO_SVG) {
    return fallo('validacion', SVG_PESADO)
  }
  const texto = await archivo.text()
  const motivo = motivoDeSvgInvalido(texto)
  const medidas = medidasDeSvg(texto)
  if (motivo !== null || medidas === null) {
    return fallo('validacion', motivo ?? NO_SE_ABRIO)
  }
  const contenido = new Blob([texto], { type: TIPO_SVG })
  return ok({
    original: contenido,
    miniatura: contenido,
    tipo: 'svg',
    ancho: lado(medidas.ancho),
    alto: lado(medidas.alto),
  })
}

async function prepararRaster(archivo: File): Promise<Resultado<ImagenPreparada>> {
  const vista = await inspeccionarImagen(archivo)
  const como = comoSeGuarda({ tipo: archivo.type, peso: archivo.size, ...vista })
  if (como === 'tal-cual') {
    const [miniatura] = await comprimirEnTamanos(archivo, [LADO_DE_LA_MINIATURA], 'image/png')
    const tipo = tipoDeImagenDe(archivo.type)
    return miniatura && tipo
      ? ok({
          original: archivo,
          miniatura: miniatura.contenido,
          tipo,
          ancho: vista.ancho,
          alto: vista.alto,
        })
      : fallo('inesperado', NO_SE_ABRIO)
  }
  // Con alfa a PNG; sin alfa a WebP (en Safari, JPEG sobre blanco: sin alfa no se pierde nada).
  const formato = como === 'png' ? 'image/png' : 'image/webp'
  const [grande, miniatura] = await comprimirEnTamanos(
    archivo,
    [LADO_MAXIMO_IMAGEN_DE_ARTE, LADO_DE_LA_MINIATURA],
    formato,
  )
  const tipo = grande ? tipoDeImagenDe(grande.contenido.type) : null
  if (!grande || !miniatura || !tipo) {
    return fallo('inesperado', NO_SE_ABRIO)
  }
  return ok({
    original: grande.contenido,
    miniatura: miniatura.contenido,
    tipo,
    ancho: grande.ancho,
    alto: grande.alto,
  })
}

export async function prepararImagen(archivo: File): Promise<Resultado<ImagenPreparada>> {
  const motivo = motivoDeArchivoInvalido({ tipo: archivo.type, peso: archivo.size })
  if (motivo !== null) {
    return fallo('validacion', motivo)
  }
  try {
    const preparada =
      archivo.type === TIPO_SVG ? await prepararSvg(archivo) : await prepararRaster(archivo)
    if (!preparada.ok) {
      return preparada
    }
    const pesada = motivoDePesoFinal(preparada.data.original.size)
    return pesada === null ? preparada : fallo('validacion', pesada)
  } catch {
    return fallo('validacion', NO_SE_ABRIO)
  }
}
