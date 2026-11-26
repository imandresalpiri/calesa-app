// Editar la ayuda de una celda en el inspector (docs/GLOSARIO.md › «Bloque de la ayuda»): sumar, escribir, mover y quitar bloques, y los enlaces de un bloque
// de enlaces. Toda escritura deja la ayuda como lista de bloques (la de antes, `{texto, enlaces?}` o `{tabla}`, se convierte con `ayudaEnBloques()`); sin
// bloques, la clave se va. Nada muta lo que recibe; un bloque recién sumado está vacío y `validarDiseno()` lo marca hasta que se llena (como un enlace nuevo).
// Las operaciones del bloque de tabla están en `tabla-del-bloque.ts`.
import { ayudaEnBloques } from '../ayuda-en-bloques'
import {
  MAXIMO_DE_BLOQUES,
  MAXIMO_DE_ENLACES,
  MAXIMO_DE_LA_URL_DEL_ENLACE,
  MAXIMO_DE_TABLAS_EN_LA_AYUDA,
  MAXIMO_DEL_TEXTO_DE_LA_AYUDA,
  MAXIMO_DEL_TITULO_DE_LA_AYUDA,
  MAXIMO_DEL_TITULO_DEL_ENLACE,
  URL_DE_ENLACE,
  type AyudaDeDiseno,
  type BloqueDeAyuda,
  type Diseno,
  type EnlaceDeAyuda,
  type TipoDeBloque,
} from '../diseno'
import { enItem } from './edicion-de-items'

// La ayuda de la celda `nodo` de la sección `seccion`; un bloque suyo; un enlace de un bloque de enlaces.
export type DondeDeLaAyuda = { seccion: string; nodo: string }
export type DondeDelBloque = DondeDeLaAyuda & { bloque: number }
export type DondeDelEnlace = DondeDelBloque & { posicion: number }

export const HASTA_OCHO_BLOQUES = `Hasta ${String(MAXIMO_DE_BLOQUES)} bloques.`
export const HASTA_TRES_TABLAS = `Hasta ${String(MAXIMO_DE_TABLAS_EN_LA_AYUDA)} tablas por ayuda.`

// Cómo se llama cada tipo de bloque en el inspector («+ Bloque», la cabecera de cada uno, «Quitaste el bloque…»).
export const NOMBRES_DE_BLOQUE: Readonly<Record<TipoDeBloque, string>> = {
  titulo: 'Título',
  texto: 'Texto',
  enlaces: 'Enlaces',
  tabla: 'Tabla',
}

// El tope de caracteres de un bloque de título o de texto.
export const MAXIMO_DEL_BLOQUE = {
  titulo: MAXIMO_DEL_TITULO_DE_LA_AYUDA,
  texto: MAXIMO_DEL_TEXTO_DE_LA_AYUDA,
} as const

// Cambia los bloques de la ayuda de esa celda; sin ninguno, la clave se va.
export function conBloques(
  diseno: Diseno,
  donde: DondeDeLaAyuda,
  cambiar: (bloques: readonly BloqueDeAyuda[]) => readonly BloqueDeAyuda[],
): Diseno {
  return enItem(diseno, { seccion: donde.seccion, tipo: 'celda', nodo: donde.nodo }, (it) => {
    if (it.tipo !== 'celda') return it
    const { ayuda, ...resto } = it
    const bloques = cambiar(ayudaEnBloques(ayuda))
    return bloques.length === 0 ? resto : { ...resto, ayuda: [...bloques] }
  })
}

// Cambia el bloque `donde.bloque` (si existe).
export function enBloque(
  diseno: Diseno,
  donde: DondeDelBloque,
  cambiar: (bloque: BloqueDeAyuda) => BloqueDeAyuda,
): Diseno {
  return conBloques(diseno, donde, (bloques) =>
    bloques.map((b, i) => (i === donde.bloque ? cambiar(b) : b)),
  )
}

// Por qué no se puede sumar un bloque de ese tipo («+ Bloque» lo dice apagado); nulo si se puede.
export const motivoParaSumar = (ayuda: AyudaDeDiseno | undefined, tipo: TipoDeBloque) =>
  motivoEnBloques(ayudaEnBloques(ayuda), tipo)

function motivoEnBloques(bloques: readonly BloqueDeAyuda[], tipo: TipoDeBloque): string | null {
  if (bloques.length >= MAXIMO_DE_BLOQUES) return HASTA_OCHO_BLOQUES
  const tablas = bloques.filter((b) => b.tipo === 'tabla').length
  return tipo === 'tabla' && tablas >= MAXIMO_DE_TABLAS_EN_LA_AYUDA ? HASTA_TRES_TABLAS : null
}

// El bloque vacío de cada tipo: un enlace sin título ni URL, o la tabla que se pasa (la primera del catálogo).
function bloqueVacio(tipo: TipoDeBloque, tabla: string): BloqueDeAyuda {
  switch (tipo) {
    case 'titulo':
      return { tipo: 'titulo', texto: '' }
    case 'texto':
      return { tipo: 'texto', texto: '' }
    case 'enlaces':
      return { tipo: 'enlaces', enlaces: [{ titulo: '', url: '' }] }
    case 'tabla':
      return { tipo: 'tabla', tabla }
  }
}

// «+ Bloque»: uno vacío al final, si `motivoParaSumar()` lo deja. Uno de tabla nace con `tabla`.
export function sumarBloque(
  diseno: Diseno,
  donde: DondeDeLaAyuda,
  tipo: TipoDeBloque,
  tabla = '',
): Diseno {
  return conBloques(diseno, donde, (bloques) =>
    motivoEnBloques(bloques, tipo) === null ? [...bloques, bloqueVacio(tipo, tabla)] : bloques,
  )
}

// El texto de un bloque de título o de texto; uno más largo que su tope se corta (en caracteres, como `char_length`). Sin `trim()`: se escribe letra a letra.
export const ponerTextoDelBloque = (diseno: Diseno, donde: DondeDelBloque, texto: string): Diseno =>
  enBloque(diseno, donde, (b) =>
    b.tipo === 'titulo' || b.tipo === 'texto'
      ? { ...b, texto: Array.from(texto).slice(0, MAXIMO_DEL_BLOQUE[b.tipo]).join('') }
      : b,
  )

// Alt+↑/↓ y «Mover antes/después»: el bloque al lugar `destino`. Fuera de la lista, igual.
// Lleva el elemento `desde` al lugar `hasta` (contado sin él). Nulo si alguno cae fuera de la lista o son el mismo.
function mover<T>(lista: readonly T[], desde: number, hasta: number): readonly T[] | null {
  const dentro = (i: number) => Number.isInteger(i) && i >= 0 && i < lista.length
  if (!dentro(desde) || !dentro(hasta) || desde === hasta) return null
  const salida = [...lista]
  const [movido] = salida.splice(desde, 1)
  if (movido === undefined) return null
  salida.splice(hasta, 0, movido)
  return salida
}

export const moverBloque = (diseno: Diseno, donde: DondeDelBloque, destino: number): Diseno =>
  conBloques(diseno, donde, (bloques) => mover(bloques, donde.bloque, destino) ?? bloques)

export const quitarBloque = (diseno: Diseno, donde: DondeDelBloque): Diseno =>
  conBloques(diseno, donde, (bloques) => bloques.filter((_, i) => i !== donde.bloque))

// «Deshacer» de quitar: el bloque vuelve a su lugar (o al final, si la lista se acortó), aunque se haya editado otra cosa entre medio.
export const devolverBloque = (
  diseno: Diseno,
  donde: DondeDelBloque,
  bloque: BloqueDeAyuda,
): Diseno =>
  conBloques(diseno, donde, (bloques) =>
    bloques.length >= MAXIMO_DE_BLOQUES
      ? bloques
      : [...bloques.slice(0, donde.bloque), bloque, ...bloques.slice(donde.bloque)],
  )

// Cambia los enlaces de un bloque de enlaces (otro bloque queda igual). El bloque pide al menos uno: quitar el único no hace nada (se quita el bloque).
function conEnlaces(
  diseno: Diseno,
  donde: DondeDelBloque,
  cambiar: (enlaces: readonly EnlaceDeAyuda[]) => EnlaceDeAyuda[],
): Diseno {
  return enBloque(diseno, donde, (b) => {
    if (b.tipo !== 'enlaces') return b
    const enlaces = cambiar(b.enlaces)
    return enlaces.length === 0 ? b : { ...b, enlaces }
  })
}

// «Agregar enlace»: uno vacío al final, hasta `MAXIMO_DE_ENLACES`.
export const sumarEnlace = (diseno: Diseno, donde: DondeDelBloque): Diseno =>
  conEnlaces(diseno, donde, (enlaces) =>
    enlaces.length >= MAXIMO_DE_ENLACES ? [...enlaces] : [...enlaces, { titulo: '', url: '' }],
  )

export const ponerEnlace = (
  diseno: Diseno,
  donde: DondeDelEnlace,
  cambios: Partial<EnlaceDeAyuda>,
): Diseno =>
  conEnlaces(diseno, donde, (enlaces) =>
    enlaces.map((e, i) => (i === donde.posicion ? { ...e, ...cambios } : e)),
  )

export const quitarEnlace = (diseno: Diseno, donde: DondeDelEnlace): Diseno =>
  conEnlaces(diseno, donde, (enlaces) => enlaces.filter((_, i) => i !== donde.posicion))

// Lo que se dice junto al campo de un enlace mientras se tipea (el espejo de la forma y de `ayuda_enlace_no_https`); nada si vale.
export function rechazoDelEnlace(enlace: EnlaceDeAyuda): { titulo?: string; url?: string } {
  const largoDelTitulo = Array.from(enlace.titulo).length
  const titulo =
    largoDelTitulo === 0
      ? 'Escribe un título.'
      : largoDelTitulo > MAXIMO_DEL_TITULO_DEL_ENLACE
        ? `Hasta ${String(MAXIMO_DEL_TITULO_DEL_ENLACE)} caracteres.`
        : undefined
  const url = !enlace.url.startsWith('https://')
    ? 'Tiene que empezar con https://.'
    : Array.from(enlace.url).length > MAXIMO_DE_LA_URL_DEL_ENLACE
      ? `Hasta ${String(MAXIMO_DE_LA_URL_DEL_ENLACE)} caracteres.`
      : !URL_DE_ENLACE.test(enlace.url)
        ? 'No puede llevar espacios ni tildes.'
        : undefined
  return { ...(titulo ? { titulo } : {}), ...(url ? { url } : {}) }
}
