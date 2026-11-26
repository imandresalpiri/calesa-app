// El aspecto de cada pieza de la hoja (docs/GLOSARIO.md › «Aspecto») tal como lo manda `_cotizacion_hoja()` o lo arma la vista previa: sólo las
// claves que el diseño trae. Una ausente no se escribe como `undefined`: la pieza sin aspecto es idéntica a la de siempre (y las pruebas comparan
// con `toStrictEqual`). Las claves son de una palabra: valen igual en la respuesta de la base y en la pantalla.
import type { DensidadDeSeccion, Enfasis, Letra, Relleno, Separacion } from './diseno'
import type { Posicion } from './rejilla-de-la-hoja'

// Lo que lleva todo ítem; la celda tiene además su `ancho` obligatorio (con nombre o en columnas). La posición es su lugar en la rejilla de su sección
// (docs/GLOSARIO.md › «Posición (en la rejilla)»): la base siempre la manda; sin ella (un diseño de prueba), el flujo de siempre.
export type AspectoDeItem = { alto?: number; letra?: Letra; enfasis?: Enfasis; posicion?: Posicion }
// Los demás ítems (atajos, variante, interruptor, subtotal): su ancho en columnas, opcional (sin él, la fila entera).
export type AspectoDeItemConAncho = AspectoDeItem & { ancho?: number }
export type AspectoDeSeccion = {
  ancho?: number
  alto?: number
  posicion?: Posicion
  relleno?: Relleno
  separacion?: Separacion
  densidad?: DensidadDeSeccion
  letra?: Letra
  enfasis?: Enfasis
  tono?: string
}
export type AspectoDeCabecera = {
  tono?: string
  relleno?: Relleno
  letra?: Letra
  enfasis?: Enfasis
}

const CLAVES_DEL_ITEM = ['alto', 'letra', 'enfasis', 'posicion'] as const
const CLAVES_DEL_ITEM_CON_ANCHO = ['ancho', ...CLAVES_DEL_ITEM] as const
const CLAVES_DE_LA_SECCION = [
  'ancho',
  'alto',
  'posicion',
  'relleno',
  'separacion',
  'densidad',
  'letra',
  'enfasis',
  'tono',
] as const
const CLAVES_DE_LA_CABECERA = ['tono', 'relleno', 'letra', 'enfasis'] as const

function copiar<T extends object>(origen: T, claves: readonly (keyof T)[]): T {
  const salida: Partial<T> = {}
  for (const clave of claves) {
    if (origen[clave] !== undefined) salida[clave] = origen[clave]
  }
  return salida as T
}

export const aspectoDeItem = (origen: AspectoDeItem): AspectoDeItem =>
  copiar(origen, CLAVES_DEL_ITEM)
export const aspectoDeItemConAncho = (origen: AspectoDeItemConAncho): AspectoDeItemConAncho =>
  copiar(origen, CLAVES_DEL_ITEM_CON_ANCHO)
export const aspectoDeSeccion = (origen: AspectoDeSeccion): AspectoDeSeccion =>
  copiar(origen, CLAVES_DE_LA_SECCION)
export const aspectoDeCabecera = (origen: AspectoDeCabecera): AspectoDeCabecera =>
  copiar(origen, CLAVES_DE_LA_CABECERA)
