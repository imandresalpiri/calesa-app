// Los bloques del primer nivel de una guía que no son texto: imagen, galería, botón y video. Espejo de `_web_doc_imagen`,
// `_web_doc_galeria`, `_web_doc_boton` y `_web_doc_video`: el mismo orden de chequeos (formato, tamaño, y después imagen, enlace o patrón),
// el mismo primer rechazo y el mismo HTML. `doc.casos.ts` y `doc-bloques.casos.ts` los corren contra la base.
import {
  MAXIMO_DEL_ALT,
  MAXIMO_DEL_TEXTO_DEL_BOTON,
  MAXIMO_DE_IMAGENES_DE_LA_GALERIA,
  MOTIVO_DE_BOTON,
  MOTIVO_DE_ENLACE,
  MOTIVO_DE_GALERIA,
  MOTIVO_DE_IMAGEN,
  MOTIVO_DE_VIDEO,
  escaparHtml,
  esObjeto,
  hrefSeguro,
  rechazar,
  rutaDeImagenSegura,
  soloClaves,
} from './doc-primitivas'
import type { Crudo } from './doc-primitivas'

// Las dos formas canónicas de un video: lo demás lo pasa a ésta el editor (`enlaceDeVideo`).
export const PATRON_DE_YOUTUBE = /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/
export const PATRON_DE_VIMEO = /^https:\/\/vimeo\.com\/[0-9]{1,12}$/

// `_web_doc_imagen`: `attrs` con `ruta` y `alt` (texto de hasta 300 o nulo), y nada más.
export function imagen(nodo: Crudo): string {
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['ruta', 'alt'])
  const ruta = attrs['ruta']
  if (typeof ruta !== 'string') {
    rechazar()
  }
  let alt = ''
  const crudo = attrs['alt']
  if ('alt' in attrs && crudo !== null) {
    if (typeof crudo !== 'string' || [...crudo].length > MAXIMO_DEL_ALT) {
      rechazar()
    }
    alt = crudo
  }
  if (rutaDeImagenSegura(ruta) === null) {
    rechazar(MOTIVO_DE_IMAGEN)
  }
  return `<img data-ruta="${escaparHtml(ruta)}" alt="${escaparHtml(alt)}">`
}

// `_web_doc_galeria`: `attrs` con sólo `imagenes`, un arreglo de 1 a 12 imágenes (cada una con la regla de `imagen`).
export function galeria(nodo: Crudo): string {
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['imagenes'])
  const imagenes = attrs['imagenes']
  if (!Array.isArray(imagenes)) {
    rechazar()
  }
  if (imagenes.length < 1 || imagenes.length > MAXIMO_DE_IMAGENES_DE_LA_GALERIA) {
    rechazar(MOTIVO_DE_GALERIA)
  }
  const partes = imagenes.map((elemento) => imagen({ type: 'image', attrs: elemento }))
  return `<figure class="guia-galeria">${partes.join('')}</figure>`
}

// El texto del botón sin los espacios, saltos y tabs de las puntas (`btrim(…, E' \n\t')`).
const sinPuntas = (texto: string) => texto.replace(/^[ \n\t]+|[ \n\t]+$/g, '')

// `_web_doc_boton`: `attrs` con `texto` (de 1 a 60) y `href` seguro, y nada más.
export function boton(nodo: Crudo): string {
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['texto', 'href'])
  const texto = attrs['texto']
  const href = attrs['href']
  if (typeof texto !== 'string' || typeof href !== 'string') {
    rechazar()
  }
  if (sinPuntas(texto) === '' || [...texto].length > MAXIMO_DEL_TEXTO_DEL_BOTON) {
    rechazar(MOTIVO_DE_BOTON)
  }
  if (hrefSeguro(href) === null) {
    rechazar(MOTIVO_DE_ENLACE)
  }
  return `<a class="guia-boton" href="${escaparHtml(href)}" rel="noopener noreferrer nofollow">${escaparHtml(texto)}</a>`
}

// `_web_doc_video`: `attrs` con sólo `url`, de YouTube o Vimeo en su forma canónica. Sin `<iframe>`: un enlace dentro de un `figure`.
export function video(nodo: Crudo): string {
  const attrs = nodo['attrs']
  if (!esObjeto(attrs)) {
    rechazar()
  }
  soloClaves(attrs, ['url'])
  const url = attrs['url']
  if (typeof url !== 'string') {
    rechazar()
  }
  const proveedor = PATRON_DE_YOUTUBE.test(url)
    ? 'youtube'
    : PATRON_DE_VIMEO.test(url)
      ? 'vimeo'
      : null
  if (proveedor === null) {
    rechazar(MOTIVO_DE_VIDEO)
  }
  return `<figure class="guia-video" data-video="${proveedor}"><a href="${escaparHtml(url)}" rel="noopener noreferrer nofollow">${escaparHtml(url)}</a></figure>`
}
