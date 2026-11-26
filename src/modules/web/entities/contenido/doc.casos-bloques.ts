// Los casos de los bloques del primer nivel de una guía que no son texto (separador, galería, botón, video): se suman a `doc.casos.ts` y los
// corren `htmlDelDocumento()` y `_web_doc_html()` de la base con el mismo resultado.
import {
  MOTIVO_DE_BOTON,
  MOTIVO_DE_ENLACE,
  MOTIVO_DE_FORMATO,
  MOTIVO_DE_GALERIA,
  MOTIVO_DE_IMAGEN,
  MOTIVO_DE_VIDEO,
} from './doc'

export type CasoDelDocumento = { nombre: string; documento: unknown } & (
  { html: string; motivo?: never } | { motivo: string; html?: never }
)

const p = (texto: string) => ({ type: 'paragraph', content: [{ type: 'text', text: texto }] })
const doc = (...content: unknown[]) => ({ type: 'doc', content })
const REGLA = { type: 'horizontalRule' }
const galeria = (...imagenes: unknown[]) => ({ type: 'gallery', attrs: { imagenes } })
const foto = (ruta: string, alt?: string) => (alt === undefined ? { ruta } : { ruta, alt })
const boton = (texto: unknown, href: unknown) => ({ type: 'button', attrs: { texto, href } })
const video = (url: unknown) => ({ type: 'video', attrs: { url } })
const REL = 'rel="noopener noreferrer nofollow"'
const YOUTUBE = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
const VIMEO = 'https://vimeo.com/123456789'

const fotos = (cuantas: number) =>
  Array.from({ length: cuantas }, (_, i) => foto(`g/${String(i)}.webp`))

const ACEPTADOS: CasoDelDocumento[] = [
  {
    nombre: 'un separador entre dos párrafos',
    documento: doc(p('Hola'), REGLA, p('Chao')),
    html: '<p>Hola</p><hr><p>Chao</p>',
  },
  { nombre: 'un separador solo es vacío', documento: doc(REGLA), html: '' },
  {
    nombre: 'una galería de dos imágenes',
    documento: doc(galeria(foto('a/b.webp', 'Uno "1"'), foto('a/c.png'))),
    html:
      '<figure class="guia-galeria"><img data-ruta="a/b.webp" alt="Uno &quot;1&quot;">' +
      '<img data-ruta="a/c.png" alt=""></figure>',
  },
  {
    nombre: 'una galería de 12 imágenes',
    documento: doc(galeria(...fotos(12))),
    html: `<figure class="guia-galeria">${fotos(12)
      .map((f) => `<img data-ruta="${f.ruta}" alt="">`)
      .join('')}</figure>`,
  },
  {
    nombre: 'una galería sola tiene contenido',
    documento: doc(galeria(foto('a.webp'))),
    html: '<figure class="guia-galeria"><img data-ruta="a.webp" alt=""></figure>',
  },
  {
    nombre: 'un botón con un enlace con ampersand',
    documento: doc(boton('Cotiza <ya>', 'https://a.com/x?a=1&b=2')),
    html: `<a class="guia-boton" href="https://a.com/x?a=1&amp;b=2" ${REL}>Cotiza &lt;ya&gt;</a>`,
  },
  {
    nombre: 'un botón de 60 caracteres, con tildes y emojis',
    documento: doc(boton('ñ😀'.repeat(30), 'tel:+59170000000')),
    html: `<a class="guia-boton" href="tel:+59170000000" ${REL}>${'ñ😀'.repeat(30)}</a>`,
  },
  {
    nombre: 'un botón solo tiene contenido',
    documento: doc(boton('Ir', 'https://a.com')),
    html: `<a class="guia-boton" href="https://a.com" ${REL}>Ir</a>`,
  },
  {
    nombre: 'un video de YouTube',
    documento: doc(video(YOUTUBE)),
    html: `<figure class="guia-video" data-video="youtube"><a href="${YOUTUBE}" ${REL}>${YOUTUBE}</a></figure>`,
  },
  {
    nombre: 'un video de Vimeo',
    documento: doc(video(VIMEO)),
    html: `<figure class="guia-video" data-video="vimeo"><a href="${VIMEO}" ${REL}>${VIMEO}</a></figure>`,
  },
]

const RECHAZADOS: CasoDelDocumento[] = [
  { nombre: 'una galería vacía', documento: doc(galeria()), motivo: MOTIVO_DE_GALERIA },
  {
    nombre: 'una galería de 13 imágenes',
    documento: doc(galeria(...fotos(13))),
    motivo: MOTIVO_DE_GALERIA,
  },
  {
    nombre: 'una galería con una ruta de otro host',
    documento: doc(galeria(foto('a.webp'), foto('https://otro.host/x.png'))),
    motivo: MOTIVO_DE_IMAGEN,
  },
  {
    nombre: 'una galería con una clave de más',
    documento: doc({ type: 'gallery', attrs: { imagenes: [foto('a.webp')], titulo: 'x' } }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una galería sin attrs',
    documento: doc({ type: 'gallery' }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una galería cuyas imágenes no son un arreglo',
    documento: doc({ type: 'gallery', attrs: { imagenes: 'a.webp' } }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una galería con una imagen con src',
    documento: doc(galeria({ src: 'a/b.webp' })),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un botón de 61 caracteres',
    documento: doc(boton('a'.repeat(61), 'https://a.com')),
    motivo: MOTIVO_DE_BOTON,
  },
  {
    nombre: 'un botón en blanco',
    documento: doc(boton(' \n\t ', 'https://a.com')),
    motivo: MOTIVO_DE_BOTON,
  },
  {
    nombre: 'un botón con javascript',
    documento: doc(boton('Ir', 'javascript:alert(1)')),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'un botón con el enlace en blanco',
    documento: doc(boton('Ir', ' https://a.com')),
    motivo: MOTIVO_DE_ENLACE,
  },
  {
    nombre: 'un botón sin href',
    documento: doc({ type: 'button', attrs: { texto: 'Ir' } }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un botón con el texto en la clave de siempre',
    documento: doc({ type: 'button', attrs: { text: 'Ir', href: 'https://a.com' } }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un botón con el texto que no es texto',
    documento: doc(boton(3, 'https://a.com')),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un video de youtu.be',
    documento: doc(video('https://youtu.be/dQw4w9WgXcQ')),
    motivo: MOTIVO_DE_VIDEO,
  },
  {
    nombre: 'un video de otro host',
    documento: doc(video('https://www.dailymotion.com/video/x7tgad0')),
    motivo: MOTIVO_DE_VIDEO,
  },
  {
    nombre: 'un video de YouTube con un id corto',
    documento: doc(video('https://www.youtube.com/watch?v=abc')),
    motivo: MOTIVO_DE_VIDEO,
  },
  {
    nombre: 'un video con un salto de línea al final',
    documento: doc(video(`${YOUTUBE}\n`)),
    motivo: MOTIVO_DE_VIDEO,
  },
  {
    nombre: 'un video con un parámetro de más',
    documento: doc(video(`${YOUTUBE}&t=10`)),
    motivo: MOTIVO_DE_VIDEO,
  },
  {
    nombre: 'un video sin url',
    documento: doc({ type: 'video', attrs: {} }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un video con la url que no es texto',
    documento: doc(video(5)),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un separador con attrs',
    documento: doc({ type: 'horizontalRule', attrs: {} }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un separador con contenido',
    documento: doc({ type: 'horizontalRule', content: [] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'una galería dentro de una cita',
    documento: doc({ type: 'blockquote', content: [galeria(foto('a.webp'))] }),
    motivo: MOTIVO_DE_FORMATO,
  },
  {
    nombre: 'un botón dentro de una lista',
    documento: doc({
      type: 'bulletList',
      content: [{ type: 'listItem', content: [boton('Ir', 'https://a.com')] }],
    }),
    motivo: MOTIVO_DE_FORMATO,
  },
]

export const CASOS_DE_LOS_BLOQUES: CasoDelDocumento[] = [...ACEPTADOS, ...RECHAZADOS]
