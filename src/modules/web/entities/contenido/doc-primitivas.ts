// Las piezas de la lista blanca del documento del sitio: topes, motivos, el rechazo y los chequeos de un texto (enlace, ruta de imagen).
// Las usan `doc-nodos.ts` y `doc-bloques.ts`; espejo de `_web_doc_ruta_valida`, `_seguimiento_href_valido` y `_web_html_escapar`.

export const MAXIMO_DE_BYTES_DEL_DOCUMENTO = 102400
// doc › lista › ítem › lista › ítem › párrafo › texto: dos niveles de lista.
export const PROFUNDIDAD_MAXIMA = 6
export const MAXIMO_DEL_ALT = 300
export const MAXIMO_DE_IMAGENES_DE_LA_GALERIA = 12
export const MAXIMO_DEL_TEXTO_DEL_BOTON = 60

export const MOTIVO_DE_FORMATO = 'El documento tiene un formato que no se admite.'
export const MOTIVO_DE_ENLACE =
  'Ese enlace no se admite: usa una dirección http, https, mailto o tel.'
export const MOTIVO_DE_IMAGEN = 'Esa imagen no se admite: súbela desde el editor.'
export const MOTIVO_DE_NIVELES = 'El documento tiene demasiados niveles.'
export const MOTIVO_DE_TAMANO = 'El documento es demasiado largo.'
export const MOTIVO_DE_GALERIA = 'Una galería lleva de 1 a 12 imágenes.'
export const MOTIVO_DE_BOTON = 'El texto del botón lleva de 1 a 60 caracteres.'
export const MOTIVO_DE_VIDEO = 'Ese video no se admite: usa un enlace de YouTube o Vimeo.'

const PROTOCOLO = /^(https?:\/\/|mailto:|tel:)/i
const RUTA_DE_IMAGEN = /^[A-Za-z0-9_-]+(\/[A-Za-z0-9_-]+)*\.(webp|png|jpe?g)$/

// Un espacio o un caracter de control (lo que rechaza `[[:space:][:cntrl:]]` en la base), con los
// controles C1 (U+0080–U+009F): el espejo rechaza de más, nunca de menos.
function esEspacioOControl(caracter: string): boolean {
  const codigo = caracter.codePointAt(0) ?? 0
  return codigo <= 0x20 || (codigo >= 0x7f && codigo <= 0x9f) || /\s/.test(caracter)
}

// Lo que se puede poner en un `href` (`_seguimiento_href_valido`): http, https, mailto o tel, sin
// espacios ni caracteres de control, de 1 a 2000 caracteres (`char_length`). `null` = no se admite.
export function hrefSeguro(href: unknown): string | null {
  if (typeof href !== 'string' || href.length === 0 || [...href].length > 2000) {
    return null
  }
  return PROTOCOLO.test(href) && ![...href].some(esEspacioOControl) ? href : null
}

// La ruta de una imagen dentro del bucket `web` (`_web_doc_ruta_valida`): sin esquema, host, `//` ni `..`.
export function rutaDeImagenSegura(ruta: unknown): string | null {
  if (typeof ruta !== 'string' || [...ruta].length > 300) {
    return null
  }
  return RUTA_DE_IMAGEN.test(ruta) ? ruta : null
}

// `_web_html_escapar`: `&` primero.
export function escaparHtml(texto: string): string {
  return texto
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export class Rechazo extends Error {}

export function rechazar(motivo: string = MOTIVO_DE_FORMATO): never {
  throw new Rechazo(motivo)
}

export type Crudo = Record<string, unknown>

export function esObjeto(valor: unknown): valor is Crudo {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

export function soloClaves(objeto: Crudo, permitidas: readonly string[]) {
  if (Object.keys(objeto).some((k) => !permitidas.includes(k))) {
    rechazar()
  }
}
