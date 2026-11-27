// Variantes del logo (docs/GLOSARIO.md › «Variante del logo»): el logo de la empresa en las versiones que necesita. «Principal» y «Para fondo
// oscuro» son las dos columnas de siempre de `ajustes_empresa` (la lista las trae primero, fijas: se cambian en Identidad); las demás son
// filas de `logos_empresa` con nombre, orden y versión. Topes y reglas: espejo de la tabla y de las RPC `logo_variante_*`. Puro.
import { z } from 'zod'

// Cuántas variantes con nombre puede guardar la empresa (`_logos_empresa_tope()`), además de «Principal» y «Para fondo oscuro».
export const TOPE_DE_LOGOS = 12
export const LARGO_MAXIMO_DEL_NOMBRE_DE_LOGO = 40

export const NOMBRE_DE_LA_PRINCIPAL = 'Principal'
export const NOMBRE_DE_LA_OSCURA = 'Para fondo oscuro'
// Los que se sugieren al sumar una; los dos primeros ya son de las columnas de siempre.
export const NOMBRES_SUGERIDOS_DE_LOGO = [
  NOMBRE_DE_LA_PRINCIPAL,
  NOMBRE_DE_LA_OSCURA,
  'Ícono',
  'Monocromo',
] as const

// `principal` y `oscuro` son los ids de las dos fijas; el de una variante es su guid. La ventana de cámara guarda el de la elegida (`principal` = nada).
export const ID_DE_LA_PRINCIPAL = 'principal'
export const ID_DE_LA_OSCURA = 'oscuro'
export type UsoDelLogo = typeof ID_DE_LA_PRINCIPAL | typeof ID_DE_LA_OSCURA

export type VarianteDelLogo = {
  id: string
  nombre: string
  // Sin archivo (nulo) sólo las dos fijas cuando la empresa no subió ese logo.
  ruta: string | null
  tipo: 'svg' | 'png' | 'webp' | 'jpg' | null
  // De las dos fijas no hay medidas.
  ancho: number | null
  alto: number | null
  // La versión de la variante (la que manda al renombrar y quitar); nula en las fijas.
  actualizadoEn: string | null
  uso: UsoDelLogo | null
}

export type ListaDeLogos = { tope: number; variantes: VarianteDelLogo[] }

export const esFija = (variante: VarianteDelLogo): boolean => variante.uso !== null

// Las que se renombran, ordenan y quitan desde la lista.
export const propias = (lista: ListaDeLogos): VarianteDelLogo[] =>
  lista.variantes.filter((v) => !esFija(v))

// Las que tienen archivo: lo que ofrecen el editor de artes y la ventana de cámara.
export const conArchivo = (lista: ListaDeLogos): (VarianteDelLogo & { ruta: string })[] =>
  lista.variantes.filter((v): v is VarianteDelLogo & { ruta: string } => v.ruta !== null)

export function varianteDeLaLista(lista: ListaDeLogos, id: string | null): VarianteDelLogo | null {
  return id === null ? null : (lista.variantes.find((v) => v.id === id) ?? null)
}

export const alTopeDeLogos = (lista: ListaDeLogos): boolean => propias(lista).length >= lista.tope
export const textoDelTopeDeLogos = (tope: number): string =>
  `Ya hay ${String(tope)} logos guardados: quita uno para sumar otro.`

export const MENSAJE_DE_LOGO_NO_DISPONIBLE = 'Ese logo ya no existe.'

// Como la base: `char_length` cuenta puntos de código.
const largoDe = (texto: string): number => Array.from(texto).length

// La clave de un nombre: sin mayúsculas, tildes ni espacios (`_logo_nombre_clave()`).
export function claveDelNombreDeLogo(nombre: string): string {
  return nombre.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s/g, '')
}

// Por qué un nombre no sirve (o nulo): vacío, largo o repetido. «Principal» y «Para fondo oscuro» ya están en la lista; `ignorar` es la que se renombra.
export function motivoDelNombreDeLogo(
  nombre: string,
  lista: ListaDeLogos,
  ignorar: string | null = null,
): string | null {
  const limpio = nombre.trim()
  if (limpio === '') {
    return 'Escribe un nombre.'
  }
  if (largoDe(limpio) > LARGO_MAXIMO_DEL_NOMBRE_DE_LOGO) {
    return `El nombre puede tener hasta ${String(LARGO_MAXIMO_DEL_NOMBRE_DE_LOGO)} caracteres.`
  }
  const clave = claveDelNombreDeLogo(limpio)
  const repetido = lista.variantes.some(
    (v) => v.id !== ignorar && claveDelNombreDeLogo(v.nombre) === clave,
  )
  return repetido ? `Ya existe «${limpio}».` : null
}

// Los nombres sugeridos que todavía no están en la lista.
export function nombresSugeridos(lista: ListaDeLogos): string[] {
  const usados = new Set(lista.variantes.map((v) => claveDelNombreDeLogo(v.nombre)))
  return NOMBRES_SUGERIDOS_DE_LOGO.filter((n) => !usados.has(claveDelNombreDeLogo(n)))
}

// El nombre que se propone al subir un archivo nuevo: el primero sugerido que falta.
export const nombreSugerido = (lista: ListaDeLogos): string => nombresSugeridos(lista)[0] ?? ''

export type Direccion = 'antes' | 'despues'

export function puedeMoverse(lista: ListaDeLogos, id: string, direccion: Direccion): boolean {
  const ids = propias(lista)
  const i = ids.findIndex((v) => v.id === id)
  if (i === -1) {
    return false
  }
  return direccion === 'antes' ? i > 0 : i < ids.length - 1
}

// Los ids de las variantes propias en su orden nuevo, tras llevar `id` a la posición `hasta` (0 = primera).
export function idsConElMovido(lista: ListaDeLogos, id: string, hasta: number): string[] {
  const ids = propias(lista).map((v) => v.id)
  const desde = ids.indexOf(id)
  if (desde === -1) {
    return ids
  }
  ids.splice(desde, 1)
  ids.splice(Math.min(Math.max(hasta, 0), ids.length), 0, id)
  return ids
}

export function idsMoviendoUnLugar(
  lista: ListaDeLogos,
  id: string,
  direccion: Direccion,
): string[] {
  const i = propias(lista).findIndex((v) => v.id === id)
  return idsConElMovido(lista, id, direccion === 'antes' ? i - 1 : i + 1)
}

// Lo que dice el lector de pantalla tras mover una: «Monocromo, 2 de 3».
export function textoDelLugarDeLogo(lista: ListaDeLogos, id: string): string {
  const ids = propias(lista)
  const i = ids.findIndex((v) => v.id === id)
  const logo = ids[i]
  return logo ? `${logo.nombre}, ${String(i + 1)} de ${String(ids.length)}` : ''
}

// Dónde se usa una variante (`logo_variante_usos()`): hoy, las ventanas de cámara que la eligieron (con tope de 100).
export type UsosDelLogo = { ventanasDeCamara: number }
const TOPE_DE_USOS = 100

const esquemaDeUsos = z.object({ ventanas_de_camara: z.number().int().min(0) })

export function usosDelLogoDesde(data: unknown): UsosDelLogo | null {
  const leido = esquemaDeUsos.safeParse(data)
  return leido.success ? { ventanasDeCamara: leido.data.ventanas_de_camara } : null
}

export function hayUsos(usos: UsosDelLogo): boolean {
  return usos.ventanasDeCamara > 0
}

// «La usa la ventana de cámara de 2 personas.» (o «de 100+ personas»).
export function textoDeUsos(usos: UsosDelLogo): string | null {
  if (!hayUsos(usos)) {
    return null
  }
  const n = usos.ventanasDeCamara
  const cuantas = n > TOPE_DE_USOS ? `${String(TOPE_DE_USOS)}+` : String(n)
  return `La usa la ventana de cámara de ${cuantas} ${n === 1 ? 'persona' : 'personas'}.`
}

// Lo que cruza el límite al crear, renombrar, ordenar y quitar. El nombre, recortado y sin pasar del largo; la base repite todo con el campo en el `hint`.
export const esquemaDelNombreDeLogo = z
  .string()
  .trim()
  .min(1, { error: 'Escribe un nombre.' })
  .refine((v) => largoDe(v) <= LARGO_MAXIMO_DEL_NOMBRE_DE_LOGO, {
    error: `El nombre puede tener hasta ${String(LARGO_MAXIMO_DEL_NOMBRE_DE_LOGO)} caracteres.`,
  })

const esquemaDeLaVariante = z.object({
  id: z.string().min(1),
  nombre: z.string(),
  ruta: z.string().nullable(),
  tipo: z.enum(['svg', 'png', 'webp', 'jpg']).nullable(),
  ancho: z.number().nullable(),
  alto: z.number().nullable(),
  actualizado_en: z.string().nullable(),
  uso: z.enum([ID_DE_LA_PRINCIPAL, ID_DE_LA_OSCURA]).nullable(),
})

const esquemaDeLaLista = z.object({
  tope: z.number(),
  variantes: z.array(esquemaDeLaVariante),
})

// La lista que da la base (`logos_empresa_leer()`, o la de cada escritura), o nula si no tiene la forma.
export function listaDeLogosDesde(data: unknown): ListaDeLogos | null {
  const leida = esquemaDeLaLista.safeParse(data)
  if (!leida.success) {
    return null
  }
  return {
    tope: leida.data.tope,
    variantes: leida.data.variantes.map((fila) => ({
      id: fila.id,
      nombre: fila.nombre,
      ruta: fila.ruta,
      tipo: fila.tipo,
      ancho: fila.ancho,
      alto: fila.alto,
      actualizadoEn: fila.actualizado_en,
      uso: fila.uso,
    })),
  }
}

// La respuesta de una escritura: la lista entera y, si la hubo, la ruta de la que se sumó o se quitó.
export function respuestaDeLogosDesde(
  data: unknown,
): { lista: ListaDeLogos; ruta: string | null } | null {
  if (typeof data !== 'object' || data === null || !('lista' in data)) {
    return null
  }
  const lista = listaDeLogosDesde(data.lista)
  if (!lista) {
    return null
  }
  const ruta = 'ruta' in data && typeof data.ruta === 'string' ? data.ruta : null
  return { lista, ruta }
}

// Una firma de la lista: si cambia (otra persona, «Recargar»), la de la pantalla se vuelve a sembrar.
export function firmaDeLogos(lista: ListaDeLogos): string {
  return lista.variantes
    .map((v) => `${v.id}@${v.actualizadoEn ?? ''}:${v.ruta ?? ''}:${v.nombre}`)
    .join('|')
}
