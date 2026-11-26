// El diseño de la hoja (D7; docs/COTIZADOR.md › «El diseño de la hoja»): cómo se ve y se maneja la hoja de un origen. Es declarativo:
// objetos estrictos, un enum para cada decisión visual y un id para cada referencia; nada de CSS, clases, HTML ni hex. Ninguna colección
// es un `z.record` (la clave de cada modo y de cada bucket va adentro): así una clave `__proto__` sólo puede ser una clave desconocida de
// un objeto estricto, y la rechazan igual Zod y `validar_diseno()`. Lo que cruza el diseño con la fórmula vive en `validar-diseno*.ts`.
import { z } from 'zod'
import { disenoEnRejilla } from './diseno-en-rejilla'
import { esquemaId } from './nodos'
import {
  COLUMNAS_DE_LA_REJILLA,
  FILAS_DE_LA_REJILLA,
  MAXIMO_DE_FILAS,
  type Posicion,
} from './rejilla-de-la-hoja'

export const ANCHOS = ['completo', 'mitad', 'tercio'] as const
// El aspecto (docs/GLOSARIO.md › «Aspecto»): cómo se ve cada pieza en la rejilla de la hoja. Todo es opcional y su ausencia dibuja lo de siempre; los
// valores salen de escalas cerradas (nada de px, CSS ni hex). Las claves no se llaman `estilo`, `clase`, `css`, `color` ni `html`: esas las rechaza el juego.
// La rejilla de cada sección y la de las secciones tienen 12 columnas (`rejilla-de-la-hoja.ts`); `completo`, `mitad` y `tercio` de una celda son 12, 6 y 4.
export { COLUMNAS_DE_LA_REJILLA, FILAS_DE_LA_REJILLA, MAXIMO_DE_FILAS }
export type { Posicion }
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
export const esquemaFila = z.int().min(1).max(FILAS_DE_LA_REJILLA)
const columnas = esquemaColumnas
const filas = esquemaFilas
// Dónde empieza una pieza en su rejilla (docs/GLOSARIO.md › «Posición (en la rejilla)»): un objeto, porque `columna` ya es una clave de los atajos.
// Va en toda sección y en todo ítem: un diseño de flujo la recibe al leerse (`disenoEnRejilla()`, el preproceso de `esquemaDiseno`).
export const esquemaPosicion = z.strictObject({ columna: columnas, fila: esquemaFila })
// El aspecto que lleva todo ítem, además del ancho (obligatorio en la celda, opcional en los demás), y su posición en la rejilla de su sección.
const aspectoDeItem = {
  alto: filas.optional(),
  letra: z.enum(LETRAS).optional(),
  enfasis: z.enum(ENFASIS).optional(),
  posicion: esquemaPosicion,
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

// Cuántos enlaces lleva un bloque de enlaces de la ayuda de una celda, y el largo de un título y de una URL (en caracteres, como `char_length`).
export const MAXIMO_DE_ENLACES = 5
export const MAXIMO_DEL_TITULO_DEL_ENLACE = 60
export const MAXIMO_DE_LA_URL_DEL_ENLACE = 2000
// La URL de un enlace: `https://` y ASCII imprimible sin espacios. `[!-~]` (de `!` a `~`) y sin la bandera `u`: la misma clase en JS y en
// Postgres (`\S` difiere con Unicode). La usan `revisarAyudas()` y el esquema de la hoja: un `href` nunca recibe algo que no sea `https://`.
export const URL_DE_ENLACE = /^https:\/\/[!-~]+$/
// Un enlace de la ayuda: que la URL sea `https://` no es la forma sino la regla `ayuda_enlace_no_https` (`validar-diseno-ayudas.ts`).
export const esquemaEnlace = z.strictObject({
  titulo: texto(MAXIMO_DEL_TITULO_DEL_ENLACE),
  url: z.string().min(1).max(MAXIMO_DE_LA_URL_DEL_ENLACE),
})

// La ayuda de una celda (docs/GLOSARIO.md › «Ayuda (de una celda)») es una lista de bloques («Bloque de la ayuda»): títulos, textos (con `**negrita**`),
// enlaces y hasta 3 tablas de referencia. Los topes son de forma, como el largo de un texto; el texto se cuenta en caracteres (`char_length`).
export const MAXIMO_DE_BLOQUES = 8
export const MAXIMO_DE_TABLAS_EN_LA_AYUDA = 3
export const MAXIMO_DEL_TITULO_DE_LA_AYUDA = 80
export const MAXIMO_DEL_TEXTO_DE_LA_AYUDA = 1000
// Las columnas que muestra un bloque de tabla: el tope de columnas de una tabla de referencia (`TOPE_DE_COLUMNAS` del área `tablas`, que el núcleo no
// importa; un test del área los compara).
export const MAXIMO_DE_COLUMNAS_EN_LA_AYUDA = 20
// El largo del texto de la ayuda de antes (`{texto, enlaces?}`), que se sigue aceptando.
export const MAXIMO_DE_LA_AYUDA_DE_ANTES = 300
export const TIPOS_DE_BLOQUE = ['titulo', 'texto', 'enlaces', 'tabla'] as const

// Una columna que muestra un bloque de tabla y, si la tiene, la celda que llena (el id de un nodo: la regla `ayuda_llena_no_acepta_valor`).
const esquemaColumnaDeLaAyuda = z.strictObject({ columna: esquemaId, llena: esquemaId.optional() })
const esquemaBloqueDeAyuda = z.discriminatedUnion('tipo', [
  z.strictObject({ tipo: z.literal('titulo'), texto: texto(MAXIMO_DEL_TITULO_DE_LA_AYUDA) }),
  z.strictObject({ tipo: z.literal('texto'), texto: texto(MAXIMO_DEL_TEXTO_DE_LA_AYUDA) }),
  z.strictObject({
    tipo: z.literal('enlaces'),
    enlaces: z.array(esquemaEnlace).min(1).max(MAXIMO_DE_ENLACES),
  }),
  // Sin `columnas`, todas las de la tabla. Que la tabla y sus columnas existan lo dice el catálogo (`ayuda_tabla_inexistente`, `ayuda_columna_inexistente`).
  z.strictObject({
    tipo: z.literal('tabla'),
    tabla: esquemaId,
    columnas: z
      .array(esquemaColumnaDeLaAyuda)
      .min(1)
      .max(MAXIMO_DE_COLUMNAS_EN_LA_AYUDA)
      .optional(),
    resaltar: z.boolean().optional(),
  }),
])
const esquemaBloques = z
  .array(esquemaBloqueDeAyuda)
  .min(1)
  .max(MAXIMO_DE_BLOQUES)
  .superRefine((bloques, ctx) => {
    if (bloques.filter((b) => b.tipo === 'tabla').length > MAXIMO_DE_TABLAS_EN_LA_AYUDA) {
      ctx.addIssue({ code: 'custom', message: 'Hasta 3 tablas por ayuda.' })
    }
    bloques.forEach((b, i) => {
      if (b.tipo !== 'tabla' || b.columnas === undefined) return
      const vistas = new Set(b.columnas.map((c) => c.columna))
      if (vistas.size !== b.columnas.length) {
        ctx.addIssue({ code: 'custom', message: 'Una columna repetida.', path: [i, 'columnas'] })
      }
    })
  })

// La ayuda: la lista de bloques o, como se guardaba antes y se sigue aceptando (la N+1 de una tabla vuelve a validar diseños guardados), la tabla
// de referencia que se abre o un texto (con hasta 5 enlaces). La de antes se lee como bloques (`ayudaEnBloques()`); el editor sólo escribe bloques.
const esquemaAyuda = z.union([
  esquemaBloques,
  z.strictObject({ tabla: esquemaId }),
  z.strictObject({
    texto: texto(MAXIMO_DE_LA_AYUDA_DE_ANTES),
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
// `total_repetido`, `total_en_avanzado` y `total_con_nivel`). Sin la pieza, el total se dibuja solo arriba de «Avanzado».
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

// Una sección va en la rejilla de las secciones (las principales) o en la lista de su bloque «Avanzado» (las avanzadas, en su propio espacio). El orden
// del DOM, de lectura y del `Tab` es el de su posición (fila y luego columna); el editor guarda la lista en ese orden (`ordenarPorLectura()`). Sin
// `ancho`, la sección es «Automática» (toda la fila o, con lugar, la mitad).
const esquemaSeccion = z.strictObject({
  id: esquemaId,
  titulo: texto(80).optional(),
  presentacion: z.enum(PRESENTACIONES),
  nivel_ver: esquemaId.optional(),
  nivel_editar: esquemaId.optional(),
  ancho: columnas.optional(),
  alto: filas.optional(),
  posicion: esquemaPosicion,
  relleno: z.enum(RELLENOS).optional(),
  separacion: z.enum(SEPARACIONES).optional(),
  densidad: z.enum(DENSIDADES_DE_SECCION).optional(),
  letra: z.enum(LETRAS).optional(),
  enfasis: z.enum(ENFASIS).optional(),
  tono: esquemaId.optional(),
  items: z.array(esquemaItem).min(1),
})

// Lo que muestra la tarjeta del total: su nodo y sus secundarios. Dónde se dibuja lo dice la pieza `{ tipo: 'total' }` de una sección; sin ella, va
// sola arriba de «Avanzado».
const esquemaTarjeta = z.strictObject({ nodo: esquemaId, secundarios: z.array(esquemaId) })

// Dónde va el bloque «Avanzado» (el total suelto, el botón «Avanzado» y el cierre: docs/GLOSARIO.md › «Bloque del avanzado»): una fila entera de la
// rejilla de las secciones. Sin la clave, debajo de la última fila.
const esquemaAvanzado = z.strictObject({ fila: esquemaFila })

// El orden de las claves es el que Zod recorre para dar su primer error: cabecera, secciones, tarjeta, avanzado (`validar_diseno()` lo copia).
export const esquemaDeLaRejilla = z.strictObject({
  cabecera: esquemaCabecera,
  secciones: z.array(esquemaSeccion).min(1),
  tarjeta_total: esquemaTarjeta,
  avanzado: esquemaAvanzado.optional(),
})
// Todo lector del diseño lo recibe en rejilla: uno de flujo se convierte al leerse, sin reescribir ninguna versión guardada.
export const esquemaDiseno = z.preprocess(disenoEnRejilla, esquemaDeLaRejilla)

export type Diseno = z.output<typeof esquemaDeLaRejilla>
export type AvanzadoDeDiseno = NonNullable<Diseno['avanzado']>
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
export type BloqueDeAyuda = z.infer<typeof esquemaBloqueDeAyuda>
export type ColumnaDeLaAyuda = z.infer<typeof esquemaColumnaDeLaAyuda>
export type TipoDeBloque = BloqueDeAyuda['tipo']
export type AnchoDeCelda = CeldaDeDiseno['ancho']
export type Relleno = (typeof RELLENOS)[number]
export type Separacion = (typeof SEPARACIONES)[number]
export type DensidadDeSeccion = (typeof DENSIDADES_DE_SECCION)[number]
export type Letra = (typeof LETRAS)[number]
export type Enfasis = (typeof ENFASIS)[number]

// Una pieza antes de tener lugar: la que ofrece «Sumar» (`primerLugarLibre()` le da su posición al sumarla) y la de un diseño de flujo que aún no se
// leyó (las pruebas lo escriben así y `esquemaDiseno` o `enRejilla()` lo convierten).
type SinPosicion<T> = T extends { posicion: Posicion }
  ? Omit<T, 'posicion'> & { posicion?: Posicion }
  : T
export type ItemSinPosicion = SinPosicion<ItemDeDiseno>
export type SeccionSinPosicion = Omit<SeccionDeDiseno, 'posicion' | 'items'> & {
  posicion?: Posicion
  items: ItemSinPosicion[]
}
export type DisenoSinPosicion = Omit<Diseno, 'secciones'> & { secciones: SeccionSinPosicion[] }

// Un diseño (de flujo o ya en rejilla) en rejilla, sin validarlo: la conversión de `esquemaDiseno` con su tipo.
export const enRejilla = (d: DisenoSinPosicion | Diseno): Diseno => disenoEnRejilla(d) as Diseno

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
