import { z } from 'zod'
import {
  ANCHOS,
  DENSIDADES_DE_SECCION,
  EFECTOS_DE_INTERRUPTOR,
  ENFASIS,
  esquemaColumnas,
  esquemaFilas,
  LETRAS,
  PRESENTACIONES,
  RELLENOS,
  SECUNDARIOS,
  SEPARACIONES,
  URL_DE_ENLACE,
} from './diseno'
import { esquemaCampo, esquemaId, FORMATOS, MAXIMO_DE_DECIMALES } from './nodos'

// Lo que la hoja de cotizar lee al abrir (paso 4.13, `cotizacion_hoja()`): el diseño publicado de un origen RECORTADO al nivel de
// quien mira, con lo que la hoja necesita para dibujarse sin otra consulta, la versión de la fórmula, la hora de la base y la hoja abierta firmada (`p_abierta` de
// `cotizacion_crear` y de `cotizacion_evaluar`, D2, 4-27 y 4-28) o el estado «sin publicar». Lo que la persona no ve no llega: ni su id, ni su etiqueta, ni su valor, ni su tono, ni su ayuda; lo que ve y no edita
// llega con su motivo. Este tipo es lo único que la pantalla conoce de la respuesta: lo que la base manda y no figura acá se cae al leerla (`z.object` no es estricto).

export const TIPOS_DE_NODO = [
  'input',
  'constante',
  'tipo_cambio',
  'campo_vehiculo',
  'bandera',
  'opcion',
  'tabla',
  'tramo',
  'calculo',
] as const
export type TipoDeNodoDeHoja = (typeof TIPOS_DE_NODO)[number]

// Por qué un monto no se edita: se calcula, es un dato del vehículo, su nivel de editar no es el de quien mira (con el nombre del nivel) o el diseño no deja editarlo.
export type MotivoDeCandado =
  { codigo: 'se_calcula' | 'del_vehiculo' | 'no_se_edita' } | { codigo: 'nivel'; nivel: string }

// Los «Decimales» de la celda (glosario): sin la clave, «Automático». `_cotizacion_hoja()` los copia del nodo sólo si los trae.
const decimales = { decimales: z.int().min(0).max(MAXIMO_DE_DECIMALES).optional() }

const esquemaMotivo = z.union([
  z.object({ codigo: z.enum(['se_calcula', 'del_vehiculo', 'no_se_edita']) }),
  z.object({ codigo: z.literal('nivel'), nivel: z.string().min(1) }),
])

// Se edita ⇔ no hay motivo: la base lo asegura en cada celda, variante, interruptor y secundario, y acá se vuelve a exigir.
const edicion = {
  editable: z.boolean(),
  motivo: esquemaMotivo.optional(),
}
const coherente = (e: { editable: boolean; motivo?: unknown }) =>
  e.editable !== (e.motivo !== undefined)
const ERROR_DE_MOTIVO = { error: 'Lo que se edita no lleva motivo y lo que no, sí.' }

const esquemaSecundario = z
  .object({
    nodo: esquemaId,
    como: z.enum(SECUNDARIOS),
    // El tipo del nodo del porcentaje (4-31): un `input` se edita en `inputs` y una constante en `overrides`; la hoja ya no lo adivina por la fuente de una respuesta.
    tipo_nodo: z.enum(TIPOS_DE_NODO),
    formato: z.enum(FORMATOS),
    ...decimales,
    ajustes: z.boolean(),
    // Con el monto escrito, el porcentaje lo calcula el par (`_cotizacion_hoja()`): no es lo tipeado. Sin la clave, el porcentaje no sigue al monto.
    sigue_al_monto: z.literal(true).optional(),
    ...edicion,
  })
  .refine(coherente, ERROR_DE_MOTIVO)

// El aspecto de cada pieza (`_cotizacion_hoja()` lo copia del diseño sólo si lo trae): todo opcional.
const aspectoDeItem = {
  alto: esquemaFilas.optional(),
  letra: z.enum(LETRAS).optional(),
  enfasis: z.enum(ENFASIS).optional(),
}
const anchoDeItem = { ancho: esquemaColumnas.optional(), ...aspectoDeItem }
const aspectoComun = {
  relleno: z.enum(RELLENOS).optional(),
  letra: z.enum(LETRAS).optional(),
  enfasis: z.enum(ENFASIS).optional(),
  tono: esquemaId.optional(),
}

// La ayuda como bloques (`ayuda-de-la-hoja.ts`). La URL de un enlace se vuelve a mirar aquí (`URL_DE_ENLACE`), así un `href` nunca recibe algo que no sea
// `https://`.
const esquemaCasa = z.union([
  z.object({ columna: esquemaId, nodo: esquemaId }),
  z.object({ columna: esquemaId, campo: esquemaCampo }),
])
const esquemaBloqueDeLaHoja = z.discriminatedUnion('tipo', [
  z.object({ tipo: z.literal('titulo'), texto: z.string().min(1) }),
  z.object({ tipo: z.literal('texto'), texto: z.string().min(1) }),
  z.object({
    tipo: z.literal('enlaces'),
    enlaces: z
      .array(z.object({ titulo: z.string().min(1), url: z.string().regex(URL_DE_ENLACE) }))
      .min(1),
  }),
  z.object({
    tipo: z.literal('tabla'),
    tabla: esquemaId,
    columnas: z
      .array(z.object({ columna: esquemaId, llena: esquemaId.optional() }))
      .min(1)
      .optional(),
    resaltar: z.literal(true).optional(),
    casa: z.array(esquemaCasa).min(1).optional(),
    id: z.guid().optional(),
  }),
])
export const esquemaAyudaDeLaHoja = z.array(esquemaBloqueDeLaHoja).min(1)

// Qué columna de la tabla de una celda casa con qué dato del vehículo (4.14-2c2): las filas para elegirlo las da `cotizacion_tabla`.
const esquemaDatoDelVehiculo = z.object({
  tabla: esquemaId,
  columnas: z.array(z.object({ columna: esquemaId, campo: esquemaCampo })).min(1),
})

export const esquemaCelda = z
  .object({
    tipo: z.literal('celda'),
    nodo: esquemaId,
    etiqueta: z.string().min(1),
    tipo_nodo: z.enum(TIPOS_DE_NODO),
    formato: z.enum(FORMATOS),
    ...decimales,
    ancho: z.union([z.enum(ANCHOS), esquemaColumnas]),
    ...aspectoDeItem,
    tono: esquemaId.optional(),
    ajustes: z.boolean(),
    ayuda: esquemaAyudaDeLaHoja.optional(),
    dato_del_vehiculo: esquemaDatoDelVehiculo.optional(),
    solo_en: z.array(esquemaId).optional(),
    condicion: esquemaId.optional(),
    requerido_si: esquemaId.optional(),
    secundario: esquemaSecundario.optional(),
    // Cambia según la opción de la variante en par (glosario: «Variante en par»): se dibuja en dos celdas. Lo decide la base.
    en_par: z.literal(true).optional(),
    ...edicion,
  })
  .refine(coherente, ERROR_DE_MOTIVO)

// Un chip de unos atajos: la etiqueta (el año) es texto y el valor, el de la columna del nodo (puede faltar en la fila).
const esquemaChip = z.object({ etiqueta: z.string(), valor: z.number().nullable() })
const esquemaAtajos = z.object({
  tipo: z.literal('atajos'),
  nodo: esquemaId,
  chips: z.array(esquemaChip),
  ...anchoDeItem,
})

const esquemaVariante = z
  .object({
    tipo: z.literal('variante'),
    nodo: esquemaId,
    etiqueta: z.string().min(1),
    opciones: z
      .array(z.object({ clave: esquemaId, etiqueta: z.string(), titulo: z.string() }))
      .min(1),
    por_defecto: esquemaId.optional(),
    ...anchoDeItem,
    ...edicion,
  })
  .refine(coherente, ERROR_DE_MOTIVO)

const esquemaInterruptor = z
  .object({
    tipo: z.literal('interruptor'),
    nodo: esquemaId,
    etiqueta: z.string().min(1),
    efecto: z.enum(EFECTOS_DE_INTERRUPTOR),
    solo_en: z.array(esquemaId).optional(),
    ...anchoDeItem,
    ...edicion,
  })
  .refine(coherente, ERROR_DE_MOTIVO)

const esquemaSubtotal = z.object({
  tipo: z.literal('subtotal'),
  nodo: esquemaId,
  etiqueta: z.string().min(1),
  formato: z.enum(FORMATOS),
  ...decimales,
  tono: esquemaId.optional(),
  en_par: z.literal(true).optional(),
  ...anchoDeItem,
})

// La tarjeta del total donde el diseño la ubica (viaja a todos: el total lo ven todos). `nodo` es el de `tarjeta`; el monto sale de los totales.
const esquemaTotal = z.object({
  tipo: z.literal('total'),
  nodo: esquemaId,
  etiqueta: z.string().min(1),
  formato: z.enum(FORMATOS),
  ...decimales,
  ...anchoDeItem,
})

export const esquemaItem = z.discriminatedUnion('tipo', [
  esquemaCelda,
  esquemaAtajos,
  esquemaVariante,
  esquemaInterruptor,
  esquemaSubtotal,
  esquemaTotal,
])

const esquemaSeccion = z.object({
  id: esquemaId,
  titulo: z.string().min(1).optional(),
  presentacion: z.enum(PRESENTACIONES),
  ancho: esquemaColumnas.optional(),
  alto: esquemaFilas.optional(),
  separacion: z.enum(SEPARACIONES).optional(),
  densidad: z.enum(DENSIDADES_DE_SECCION).optional(),
  ...aspectoComun,
  items: z.array(esquemaItem).min(1),
})

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/)
const colores = z.object({ fondo: hex, borde: hex, tinta: hex })
const esquemaTono = z.object({ clave: esquemaId, claro: colores, oscuro: colores })

const esquemaDeNodoDeTarjeta = z.object({
  nodo: esquemaId,
  etiqueta: z.string().min(1),
  formato: z.enum(FORMATOS),
  ...decimales,
})
const esquemaOrigen = z.object({ id: z.guid(), nombre: z.string().min(1) })
const esquemaOpcionDelPar = z.object({ clave: esquemaId, etiqueta: z.string().min(1) })

// El diseño de una versión de la fórmula recortado al nivel de quien mira: lo que comparten la hoja de cotizar y la de una guardada (`cotizacion_hoja_guardada()`, 4.15-2),
// que no trae hoja abierta (calcula por su cotización).
export const esquemaDeDiseno = z.object({
  origen: esquemaOrigen,
  formula: z.object({ id: z.guid(), version: z.int().positive() }),
  cabecera: z.object({
    modos: z.array(z.object({ clave: esquemaId, nombre: z.string().min(1) })),
    ver_total_bs: z.boolean(),
    // La moneda en que se escribe el total en Bs (`cabecera.moneda_bs`): nula sin `total_en` o sin su tipo de cambio activo.
    moneda_bs: z.string().length(3).nullable(),
    // Quien mira tiene el ⚙ de la cabecera (`cotizaciones.configurar` del origen y al menos un modo): lo decide la base.
    ajustes: z.boolean().optional(),
    // Lo que la cabecera trae por defecto (docs/GLOSARIO.md › «Modo por defecto», «Modos visibles»): sólo si el diseño lo trae.
    modo_por_defecto: esquemaId.optional(),
    ver_total_bs_por_defecto: z.boolean().optional(),
    modos_visibles: z.array(esquemaId).optional(),
    ...aspectoComun,
  }),
  secciones: z.array(esquemaSeccion),
  tarjeta_total: esquemaDeNodoDeTarjeta.extend({ secundarios: z.array(esquemaDeNodoDeTarjeta) }),
  tonos: z.array(esquemaTono),
  // La variante en par: viaja a todo el que abre la hoja (sus etiquetas son configuración); en una guardada, `opcion` es la de esa cotización.
  par: z
    .object({
      nodo: esquemaId,
      etiqueta: z.string().min(1),
      opciones: z.tuple([esquemaOpcionDelPar, esquemaOpcionDelPar]),
      opcion: esquemaId.nullable().optional(),
    })
    .nullable()
    .optional(),
})
export const esquemaLista = esquemaDeDiseno.extend({
  estado: z.literal('lista'),
  abierta_en: z.string().min(1),
  // La hoja abierta que firma la base: lo único que `cotizacion_crear` y `cotizacion_evaluar` aceptan como `p_abierta`. Para la pantalla es opaca.
  abierta: z.string().min(1),
})
const esquemaSinPublicar = z.object({
  estado: z.literal('sin_publicar'),
  origen: esquemaOrigen,
  puede_configurar: z.boolean(),
})
export const esquemaHoja = z.discriminatedUnion('estado', [esquemaLista, esquemaSinPublicar])
