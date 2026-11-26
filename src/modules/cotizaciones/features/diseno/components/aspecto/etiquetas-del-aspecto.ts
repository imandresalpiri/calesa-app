// Los textos de los selects del aspecto (docs/UX.md › «Cotización: hoja (estados propios)»).
import {
  DENSIDADES_DE_SECCION,
  ENFASIS,
  LETRAS,
  RELLENOS,
  SEPARACIONES,
} from '../../../../entities/diseno'
import type { OpcionDelLugar } from '../../../../entities/diseno/tamano-en-la-rejilla'

type Opcion = { valor: string; etiqueta: string }

// El valor del select que quita la clave («Automático»).
export const AUTOMATICO = ''

export const SIN_CATALOGO = 'No se pudo leer el catálogo de colores.'

// Los campos del lugar de una pieza en la rejilla (`campos-del-lugar.tsx`).
export const CAMPOS_DEL_LUGAR = {
  columna: 'Columna',
  fila: 'Fila',
  ancho: 'Ancho',
  alto: 'Alto',
} as const

// El ancho de una sección sin ancho («Automática»).
export const ANCHO_AUTOMATICO = 'Automático (la mitad, si hay lugar)'

// Una opción del lugar: su número y, si no entra, por qué («7 — se pisa con «Flete»», «10 — se sale de las 12 columnas»).
export const etiquetaDelLugar = (o: OpcionDelLugar): string =>
  o.motivo === null ? String(o.valor) : `${String(o.valor)} — ${o.motivo}`

const ETIQUETAS = {
  chico: 'Chico',
  chica: 'Chica',
  medio: 'Medio',
  media: 'Media',
  grande: 'Grande',
  compacta: 'Compacta',
  comoda: 'Cómoda',
  normal: 'Normal',
  fuerte: 'Fuerte',
} as const

const opciones = (valores: readonly (keyof typeof ETIQUETAS)[]): readonly Opcion[] =>
  valores.map((valor) => ({ valor, etiqueta: ETIQUETAS[valor] }))

export const OPCIONES_DE_RELLENO = opciones(RELLENOS)
export const OPCIONES_DE_SEPARACION = opciones(SEPARACIONES)
export const OPCIONES_DE_DENSIDAD = opciones(DENSIDADES_DE_SECCION)
export const OPCIONES_DE_LETRA = opciones(LETRAS)
export const OPCIONES_DE_ENFASIS = opciones(ENFASIS)

// El error de una clave, si el rechazo de forma es de ella.
export type ErrorDelAspecto = { clave: string; mensaje: string } | null
export const errorDe = (error: ErrorDelAspecto, clave: string) =>
  error?.clave === clave ? error.mensaje : undefined
