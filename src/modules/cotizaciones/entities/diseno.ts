// El diseño de la hoja (D7; docs/COTIZADOR.md › «El diseño de la hoja»): cómo se ve y se maneja la hoja de un origen. Es declarativo:
// objetos estrictos, un enum para cada decisión visual y un id para cada referencia; nada de CSS, clases, HTML ni hex. Ninguna colección
// es un `z.record` (la clave de cada modo y de cada bucket va adentro): así una clave `__proto__` sólo puede ser una clave desconocida de
// un objeto estricto, y la rechazan igual Zod y `validar_diseno()`. Lo que cruza el diseño con la fórmula vive en `validar-diseno*.ts`.
import { z } from 'zod'
import { esquemaId } from './nodos'
import { COLUMNAS_DE_LA_REJILLA, MAXIMO_DE_FILAS } from './rejilla-de-la-hoja'

export const ANCHOS = ['completo', 'mitad', 'tercio'] as const
// El aspecto (docs/GLOSARIO.md › «Aspecto»): cómo se ve cada pieza en la rejilla de la hoja. Todo es opcional y su ausencia dibuja lo de siempre; los
// valores salen de escalas cerradas (nada de px, CSS ni hex). Las claves no se llaman `estilo`, `clase`, `css`, `color` ni `html`: esas las rechaza el juego.
// La rejilla de cada sección y la de las secciones tienen 12 columnas (`rejilla-de-la-hoja.ts`); `completo`, `mitad` y `tercio` de una celda son 12, 6 y 4.
export { COLUMNAS_DE_LA_REJILLA, MAXIMO_DE_FILAS }
export const RELLENOS = ['chico', 'medio', 'grande'] as const
export const SEPARACIONES = ['chica', 'media', 'grande'] as const
export const DENSIDADES_DE_SECCION = ['compacta', 'comoda'] as const
export const LETRAS = ['chica', 'normal', 'grande'] as const
export const ENFASIS = ['normal', 'fuerte'] as const
// Lo que dibuja una pieza sin esa clave: el editor no la escribe, la quita.
export const ASPECTO_POR_DEFECTO = {
  relleno: 'medio',
  separacion: 'media',
  densidad: 'comoda',
  letra: 'normal',
  enfasis: 'normal',
} as const
export const PRESENTACIONES = ['principal', 'avanzado'] as const
export const SECUNDARIOS = ['porcentaje', 'monto'] as const
export const EFECTOS_DE_INTERRUPTOR = ['habilita', 'muestra'] as const
// Cuántas filas de una tabla se ofrecen como chips (los años del factor de depreciación).
export const MAXIMO_DE_ATAJOS = 12
// Cuántos ítems lleva un diseño publicable, sumando todas sus secciones (4-30): la hoja de 40 ítems queda en el techo de nodos
// (docs/RENDIMIENTO.md › «Cotizador»). `validar_diseno()` lo lee de `_diseno_maximo_de_items()`.
export const MAXIMO_DE_ITEMS_DEL_DISENO = 40
// El nivel que todos tienen: no se crea, no se retira y no genera permisos (D7).
export const NIVEL_TODOS = 'todos'

// Se cuenta en caracteres, como `char_length` de `validar_diseno()` (y como Zod 4: un emoji es uno).
const texto = (max: number) => z.string().min(1).max(max)

// Un entero como lo lee JS (`0.99999999999999999` es 1); la base copia esa lectura (D55–D58 y las marcas del aspecto).
export const esquemaColumnas = z.int().min(1).max(COLUMNAS_DE_LA_REJILLA)
export const esquemaFilas = z.int().min(1).max(MAXIMO_DE_FILAS)
const columnas = esquemaColumnas
const filas = esquemaFilas
// El aspecto que lleva todo ítem, además del ancho (obligatorio en la celda, opcional en los demás).
const aspectoDeItem = {
  alto: filas.optional(),
  letra: z.enum(LETRAS).optional(),
  enfasis: z.enum(ENFASIS).optional(),
}
const anchoDeItem = { ancho: columnas.optional(), ...aspectoDeItem }

// Un modo de tipo de cambio: la misma forma que `buckets` y `total_en` de la fórmula, con la clave y el nombre adentro.
const esquemaModo = z.strictObject({
  clave: esquemaId,
  nombre: texto(40),
  buckets: z.array(z.strictObject({ bucket: esquemaId, nodo: esquemaId })).min(1),
  total_en: esquemaId,
})
// La cabecera (los modos de tipo de cambio) va sola en su fila, encima de la rejilla: no lleva ancho ni alto. Lo que trae por defecto
// (docs/GLOSARIO.md › «Modo por defecto», «Modos visibles») es opcional: sin eso, el primer modo, «Ver total» apagado y todos los modos a la vista.
// Cómo se cruza con los modos lo dice `validar-diseno-cabecera.ts`.
const esquemaCabecera = z.strictObject({
  modos: z.array(esquemaModo),
  ver_total_bs: z.boolean(),
  tono: esquemaId.optional(),
  relleno: z.enum(RELLENOS).optional(),
  letra: z.enum(LETRAS).optional(),
  enfasis: z.enum(ENFASIS).optional(),
  modo_por_defecto: esquemaId.optional(),
  ver_total_bs_por_defecto: z.boolean().optional(),
  modos_visibles: z.array(esquemaId).optional(),
})

// Cuántos enlaces lleva la ayuda de texto de una celda, y el largo de un título y de una URL (en caracteres, como `char_length`).
export const MAXIMO_DE_ENLACES = 5
export const MAXIMO_DEL_TITULO_DEL_ENLACE = 60
export const MAXIMO_DE_LA_URL_DEL_ENLACE = 2000
// La URL de un enlace: `https://` y ASCII imprimible sin espacios. `[!-~]` (de `!` a `~`) y sin la bandera `u`: la misma clase en JS y en
// Postgres (`\S` difiere con Unicode). La usan `revisarEnlaces()` y el esquema de la hoja: un `href` nunca recibe algo que no sea `https://`.
export const URL_DE_ENLACE = /^https:\/\/[!-~]+$/
// Un enlace de la ayuda: que la URL sea `https://` no es la forma sino la regla `ayuda_enlace_no_https` (`validar-diseno-enlaces.ts`).
export const esquemaEnlace = z.strictObject({
  titulo: texto(MAXIMO_DEL_TITULO_DEL_ENLACE),
  url: z.string().min(1).max(MAXIMO_DE_LA_URL_DEL_ENLACE),
})

// Una ayuda es la tabla de referencia que se abre o un texto (con hasta 5 enlaces), no las dos.
const esquemaAyuda = z.union([
  z.strictObject({ tabla: esquemaId }),
  z.strictObject({
    texto: texto(300),
    enlaces: z.array(esquemaEnlace).min(1).max(MAXIMO_DE_ENLACES).optional(),
  }),
])

const esquemaCelda = z.strictObject({
  tipo: z.literal('celda'),
  nodo: esquemaId,
  // Los anchos con nombre de los diseños guardados siguen valiendo: son 12, 6 y 4 columnas.
  ancho: z.union([z.enum(ANCHOS), columnas]),
  secundario: z.enum(SECUNDARIOS).optional(),
  ayuda: esquemaAyuda.optional(),
  nivel_ver: esquemaId.optional(),
  nivel_editar: esquemaId.optional(),
  ...aspectoDeItem,
})
const esquemaAtajos = z.strictObject({
  tipo: z.literal('atajos'),
  nodo: esquemaId,
  columna: esquemaId,
  filas: z.int().min(1).max(MAXIMO_DE_ATAJOS),
  ...anchoDeItem,
})
const esquemaVariante = z.strictObject({
  tipo: z.literal('variante'),
  nodo: esquemaId,
  ...anchoDeItem,
})
const esquemaInterruptor = z.strictObject({
  tipo: z.literal('interruptor'),
  nodo: esquemaId,
  efecto: z.enum(EFECTOS_DE_INTERRUPTOR),
  ...anchoDeItem,
})
const esquemaSubtotal = z.strictObject({
  tipo: z.literal('subtotal'),
  nodo: esquemaId,
  ...anchoDeItem,
})
// La tarjeta del total como pieza (docs/GLOSARIO.md › «Tarjeta del total»): dice dónde se dibuja y su aspecto. No lleva `nodo`: el nodo del total y
// sus secundarios siguen en `tarjeta_total` (una sola fuente). A lo sumo una por diseño, en una sección principal y sin nivel (las reglas
// `total_repetido`, `total_en_avanzado` y `total_con_nivel`). Sin la pieza, el total se dibuja en el resumen fijo, como siempre.
const esquemaTotal = z.strictObject({
  tipo: z.literal('total'),
  ...anchoDeItem,
})

const esquemaItem = z.discriminatedUnion('tipo', [
  esquemaCelda,
  esquemaAtajos,
  esquemaVariante,
  esquemaInterruptor,
  esquemaSubtotal,
  esquemaTotal,
])

// El orden de las secciones es el del DOM, de lectura y del `Tab`. Sin `ancho`, la sección es «Automática» (toda la fila o, con lugar, la mitad).
const esquemaSeccion = z.strictObject({
  id: esquemaId,
  titulo: texto(80).optional(),
  presentacion: z.enum(PRESENTACIONES),
  nivel_ver: esquemaId.optional(),
  nivel_editar: esquemaId.optional(),
  ancho: columnas.optional(),
  alto: filas.optional(),
  relleno: z.enum(RELLENOS).optional(),
  separacion: z.enum(SEPARACIONES).optional(),
  densidad: z.enum(DENSIDADES_DE_SECCION).optional(),
  letra: z.enum(LETRAS).optional(),
  enfasis: z.enum(ENFASIS).optional(),
  tono: esquemaId.optional(),
  items: z.array(esquemaItem).min(1),
})

// Lo que muestra la tarjeta del total: su nodo y sus secundarios. Dónde se dibuja lo dice la pieza `{ tipo: 'total' }` de una sección; sin ella, va
// en el resumen fijo.
const esquemaTarjeta = z.strictObject({ nodo: esquemaId, secundarios: z.array(esquemaId) })

// El orden de las claves es el que Zod recorre para dar su primer error: cabecera, secciones, tarjeta (`validar_diseno()` lo copia).
export const esquemaDiseno = z.strictObject({
  cabecera: esquemaCabecera,
  secciones: z.array(esquemaSeccion).min(1),
  tarjeta_total: esquemaTarjeta,
})

export type Diseno = z.infer<typeof esquemaDiseno>
export type ModoDeTipoDeCambio = Diseno['cabecera']['modos'][number]
export type SeccionDeDiseno = Diseno['secciones'][number]
export type ItemDeDiseno = SeccionDeDiseno['items'][number]
export type CeldaDeDiseno = Extract<ItemDeDiseno, { tipo: 'celda' }>
export type TotalDeDiseno = Extract<ItemDeDiseno, { tipo: 'total' }>
// Un ítem que dibuja un nodo de la fórmula (todos menos la tarjeta del total).
export type ItemConNodo = Exclude<ItemDeDiseno, { tipo: 'total' }>
export type CabeceraDeDiseno = Diseno['cabecera']
export type AyudaDeDiseno = NonNullable<CeldaDeDiseno['ayuda']>
export type EnlaceDeAyuda = z.infer<typeof esquemaEnlace>
export type AnchoDeCelda = CeldaDeDiseno['ancho']
export type Relleno = (typeof RELLENOS)[number]
export type Separacion = (typeof SEPARACIONES)[number]
export type DensidadDeSeccion = (typeof DENSIDADES_DE_SECCION)[number]
export type Letra = (typeof LETRAS)[number]
export type Enfasis = (typeof ENFASIS)[number]

// El nodo que dibuja un ítem, o nada si es la tarjeta del total (su nodo es el de `tarjeta_total`).
export function nodoDelItem(item: ItemDeDiseno): string | null {
  return item.tipo === 'total' ? null : item.nodo
}

export const esItemConNodo = (item: ItemDeDiseno): item is ItemConNodo => item.tipo !== 'total'

// Una pieza dentro de su sección: la de un nodo (con su tipo: unos atajos y su celda comparten el nodo) o la tarjeta del total. Las ediciones la
// buscan así; el nodo de los ítems que no son atajos no se repite en un diseño válido (`nodo_repetido`), y en uno que no lo es gana el primero.
export type PiezaEnLaSeccion = { tipo: ItemConNodo['tipo']; nodo: string } | { tipo: 'total' }
export type ClaveDePieza = PiezaEnLaSeccion & { seccion: string }

export function esLaPieza(item: ItemDeDiseno, pieza: PiezaEnLaSeccion): boolean {
  if (item.tipo !== pieza.tipo) return false
  return item.tipo === 'total' || ('nodo' in pieza && item.nodo === pieza.nodo)
}

// La pieza de un ítem, sin la sección.
export const piezaDelItem = (item: ItemDeDiseno): PiezaEnLaSeccion =>
  item.tipo === 'total' ? { tipo: 'total' } : { tipo: item.tipo, nodo: item.nodo }
