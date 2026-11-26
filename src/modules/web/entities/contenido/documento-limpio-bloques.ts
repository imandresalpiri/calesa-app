// Los bloques del primer nivel de una guía que no son texto, reducidos a la lista blanca de `doc.ts` (imagen, galería, botón, video, separador).
// Los atributos de un botón y de un video se conservan como texto aunque no valgan: el motivo lo dice el editor (`motivoDelBloque`) y lo
// escrito no se pierde al recargar. Lo que cae es lo que no tiene arreglo: una imagen sin ruta válida, o una galería sin ninguna.
import { MAXIMO_DEL_ALT, MAXIMO_DE_IMAGENES_DE_LA_GALERIA, rutaDeImagenSegura } from './doc'
import { esObjeto } from './doc-primitivas'

export type Imagen = { type: 'image'; attrs: { ruta: string; alt: string } }
export type Separador = { type: 'horizontalRule' }
export type Galeria = {
  type: 'gallery'
  attrs: { imagenes: { ruta: string; alt: string }[] }
}
export type BotonDelDocumento = { type: 'button'; attrs: { texto: string; href: string } }
export type VideoDelDocumento = { type: 'video'; attrs: { url: string } }
export type BloqueDeDatos = Imagen | Separador | Galeria | BotonDelDocumento | VideoDelDocumento

// Los tipos de nodo de este archivo: dentro de una lista o una cita no caben.
export const TIPOS_DE_BLOQUE_DE_DATOS = ['image', 'horizontalRule', 'gallery', 'button', 'video']

const comoLista = (valor: unknown): unknown[] => (Array.isArray(valor) ? valor : [])

function fotoLimpia(attrs: unknown): { ruta: string; alt: string } | null {
  const ruta = esObjeto(attrs) ? rutaDeImagenSegura(attrs['ruta']) : null
  if (ruta === null || !esObjeto(attrs)) {
    return null
  }
  const alt =
    typeof attrs['alt'] === 'string' ? [...attrs['alt']].slice(0, MAXIMO_DEL_ALT).join('') : ''
  return { ruta, alt }
}

function limpiarImagen(nodo: Record<string, unknown>): Imagen[] {
  const foto = fotoLimpia(nodo['attrs'])
  return foto === null ? [] : [{ type: 'image', attrs: foto }]
}

function limpiarGaleria(nodo: Record<string, unknown>): Galeria[] {
  const attrs = nodo['attrs']
  const imagenes = comoLista(esObjeto(attrs) ? attrs['imagenes'] : undefined)
    .flatMap((elemento) => {
      const foto = fotoLimpia(elemento)
      return foto === null ? [] : [foto]
    })
    .slice(0, MAXIMO_DE_IMAGENES_DE_LA_GALERIA)
  return imagenes.length > 0 ? [{ type: 'gallery', attrs: { imagenes } }] : []
}

const comoTexto = (valor: unknown): string => (typeof valor === 'string' ? valor : '')

function limpiarBoton(nodo: Record<string, unknown>): BotonDelDocumento[] {
  const attrs = esObjeto(nodo['attrs']) ? nodo['attrs'] : {}
  return [
    { type: 'button', attrs: { texto: comoTexto(attrs['texto']), href: comoTexto(attrs['href']) } },
  ]
}

function limpiarVideo(nodo: Record<string, unknown>): VideoDelDocumento[] {
  const attrs = esObjeto(nodo['attrs']) ? nodo['attrs'] : {}
  return [{ type: 'video', attrs: { url: comoTexto(attrs['url']) } }]
}

// Un bloque del primer nivel de los de datos; `null` si el nodo no es de éstos.
export function limpiarBloqueDeDatos(nodo: Record<string, unknown>): BloqueDeDatos[] | null {
  switch (nodo['type']) {
    case 'image':
      return limpiarImagen(nodo)
    case 'horizontalRule':
      return [{ type: 'horizontalRule' }]
    case 'gallery':
      return limpiarGaleria(nodo)
    case 'button':
      return limpiarBoton(nodo)
    case 'video':
      return limpiarVideo(nodo)
    default:
      return null
  }
}
