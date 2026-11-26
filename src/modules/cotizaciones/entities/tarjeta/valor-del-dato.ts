// Lo que vale y cómo se dibuja un dato de una celda de la tarjeta (una variable de la cotización o algo de un nodo: su monto, etiqueta, descripción, porcentaje,
// tipo de cambio o plazo, D6, D8, D17 y D18 de T310), y si tiene valor (lo que mira la lista de respaldo y la condición «está vacío»). Va aparte del contenido de
// la celda porque lo usan el contenido y las condiciones (`condiciones-de-la-celda.ts`), que se importan en ese orden. Un dato de un nodo que no aplica queda
// vacío; un monto nulo, «—». Los montos con `formatearMonto()` (el texto de `<Monto>` y del PDF); en pantalla los tapa `<Monto>` en Modo Live. Dentro de un texto con
// datos (`parteDibujada()`) va el mismo formato, pero sin valor no escribe nada (nunca «—»). El monto (y su segunda en Bs) y el porcentaje van con los «Decimales» de
// su celda (glosario: «Decimales (de una celda)»; los del `pct` para el porcentaje); sin ellos, lo de siempre. El tipo de cambio, siempre con 4.
import { formatearConDecimales } from '@/shared/lib/cifra-fija'
import { formatearMonto, formatearNumero, formatearPorcentaje } from '@/shared/lib/formato'
import type { CalculoDeLaTarjeta } from '../calculo-de-la-tarjeta'
import type { DatoDeLaCelda, Mostrar } from '../cuadricula-de-la-tarjeta'
import { valorDeLaVariable, type ContextoDeLaCotizacion } from './contexto-de-la-cotizacion'
import type { TarjetaLista, TipoDeCambioDeLaTarjeta } from './lectura-de-la-tarjeta'

export const SIN_DATO = '—'

// `decimales`, sólo si la celda los trae: `<MontoConDecimales>` redondea `valor` igual que `texto`.
export type MontoDibujado = { valor: number; moneda: string; texto: string; decimales?: number }
// Un tramo de un texto con datos: un texto (con sus saltos de línea adentro) o un monto, que en pantalla va con `<Monto>`.
export type TramoDelTexto = string | MontoDibujado
export type ContenidoDibujado =
  // `tramos`, sólo en un texto con datos que lleva un monto: el HTML lo dibuja por tramos para que Live lo tape; el PDF, la imagen y «Copiar texto» leen `lineas`.
  | { tipo: 'texto'; lineas: string[]; tramos?: readonly TramoDelTexto[] }
  | ({ tipo: 'monto'; segunda: MontoDibujado | null } & MontoDibujado)
  | { tipo: 'logo' }
  // La foto del asesor: su URL (nula sin foto: el círculo con las iniciales; `''` en las cifras de ejemplo: la muestra punteada «Foto»), sus iniciales y su nombre.
  | { tipo: 'foto_del_asesor'; url: string | null; iniciales: string; nombre: string }
  | { tipo: 'vacio' }

export type EntradaDelContenido = {
  tarjeta: TarjetaLista
  calculo: CalculoDeLaTarjeta
  contexto: ContextoDeLaCotizacion
  monedaBs: string | null
  locale: string
}

export const textoDibujado = (t: string): ContenidoDibujado => ({
  tipo: 'texto',
  lineas: t === '' ? [] : t.split('\n'),
})
const numeroONulo = (v: unknown): number | null => (typeof v === 'number' ? v : null)

export const esElTotal = (e: EntradaDelContenido, nodo: string) => e.tarjeta.total.nodo === nodo

// El valor de un nodo: el del total sale de los totales (D6); el resto, del cálculo por su id.
export function valorDelNodo(e: EntradaDelContenido, nodo: string): unknown {
  return esElTotal(e, nodo) ? e.calculo.totales.usd : e.calculo.valores.get(nodo)
}

export const aplica = (e: EntradaDelContenido, nodo: string): boolean =>
  esElTotal(e, nodo) || e.calculo.estados === null || e.calculo.estados.get(nodo) === 'activo'

// Un nodo sin estado (que no es el total) no está en la versión del cálculo.
export const fueraDeLaVersion = (e: EntradaDelContenido, nodo: string): boolean =>
  !esElTotal(e, nodo) && e.calculo.estados !== null && !e.calculo.estados.has(nodo)

// El tipo de cambio del bucket del grupo del nodo: el del modo elegido o, sin modo (o uno que la lectura no nombra), el de omisión.
function tipoDeCambio(e: EntradaDelContenido, nodo: string): TipoDeCambioDeLaTarjeta | null {
  const grupo = e.tarjeta.nodos.get(nodo)?.grupo
  const bucket = grupo == null ? null : (e.tarjeta.grupos.get(grupo)?.bucket ?? null)
  if (bucket === null) return null
  const modo =
    e.calculo.modoTc === null ? undefined : e.tarjeta.tiposDeCambio.modos.get(e.calculo.modoTc)
  return (modo ?? e.tarjeta.tiposDeCambio.buckets).get(bucket) ?? null
}

const numeroDe = (e: EntradaDelContenido, id: string | null | undefined): number | null =>
  id == null ? null : numeroONulo(e.calculo.valores.get(id))

// Lo que vale un nodo por `mostrar`, sin formato: un número, un texto o nulo.
const CRUDOS: {
  readonly [M in Mostrar]: (e: EntradaDelContenido, nodo: string) => number | string | null
} = {
  monto: (e, nodo) => numeroONulo(valorDelNodo(e, nodo)),
  etiqueta: (e, nodo) => e.tarjeta.nodos.get(nodo)?.etiqueta ?? null,
  descripcion: (e, nodo) => e.tarjeta.nodos.get(nodo)?.descripcion ?? null,
  porcentaje: (e, nodo) => numeroDe(e, e.tarjeta.nodos.get(nodo)?.pct),
  tc_nombre: (e, nodo) => tipoDeCambio(e, nodo)?.nombre ?? null,
  tc_valor: (e, nodo) => numeroDe(e, tipoDeCambio(e, nodo)?.nodo),
  plazo: (e, nodo) => {
    const grupo = e.tarjeta.nodos.get(nodo)?.grupo
    return grupo == null ? null : (e.tarjeta.grupos.get(grupo)?.plazo ?? null)
  },
}

function montoDibujado(
  e: EntradaDelContenido,
  nodo: string,
  valor: number,
  moneda: string,
): MontoDibujado {
  const decimales = e.tarjeta.nodos.get(nodo)?.decimales
  const { locale } = e
  return decimales === undefined
    ? { valor, moneda, texto: formatearMonto(valor, { moneda, locale }) }
    : {
        valor,
        moneda,
        decimales,
        texto: formatearConDecimales(valor, 'monto', { decimales, locale, moneda }),
      }
}

// El porcentaje (la fracción) con los «Decimales» del `pct` del nodo.
function textoDelPorcentaje(e: EntradaDelContenido, nodo: string, valor: number): string {
  const decimales = e.tarjeta.nodos.get(nodo)?.decimalesDelPct
  return decimales === undefined
    ? formatearPorcentaje(valor, { locale: e.locale })
    : formatearConDecimales(valor, 'porcentaje', { decimales, locale: e.locale })
}

// El total en Bs es la misma celda en otra moneda: con sus decimales.
function monto(e: EntradaDelContenido, nodo: string, valor: number | null): ContenidoDibujado {
  if (valor === null) return textoDibujado(SIN_DATO)
  const { calculo, monedaBs } = e
  const bs = calculo.totales.bs
  const segunda =
    esElTotal(e, nodo) && calculo.verTotalBs && monedaBs !== null && bs !== null
      ? montoDibujado(e, nodo, bs, monedaBs)
      : null
  return { tipo: 'monto', ...montoDibujado(e, nodo, valor, 'USD'), segunda }
}

const comoTexto = (_e: EntradaDelContenido, _nodo: string, crudo: number | string | null) =>
  textoDibujado(typeof crudo === 'string' ? crudo : '')

// Cómo se dibuja lo que vale un nodo, por `mostrar`.
const FORMATOS: {
  readonly [M in Mostrar]: (
    e: EntradaDelContenido,
    nodo: string,
    crudo: number | string | null,
  ) => ContenidoDibujado
} = {
  monto: (e, nodo, crudo) => monto(e, nodo, numeroONulo(crudo)),
  porcentaje: (e, nodo, crudo) =>
    textoDibujado(typeof crudo === 'number' ? textoDelPorcentaje(e, nodo, crudo) : SIN_DATO),
  tc_valor: (e, _nodo, crudo) =>
    textoDibujado(
      typeof crudo === 'number'
        ? formatearNumero(crudo, { decimales: 4, locale: e.locale })
        : SIN_DATO,
    ),
  etiqueta: comoTexto,
  descripcion: comoTexto,
  tc_nombre: comoTexto,
  plazo: comoTexto,
}

const delNodo = (e: EntradaDelContenido, nodo: string, mostrar: Mostrar): ContenidoDibujado =>
  aplica(e, nodo) ? FORMATOS[mostrar](e, nodo, CRUDOS[mostrar](e, nodo)) : textoDibujado('')

// El título de la opción elegida de la variante; nulo sin variante o sin clave.
export function tituloDeLaOpcion({ tarjeta, calculo }: EntradaDelContenido): string | null {
  if (tarjeta.variante === null) return null
  const clave = calculo.valores.get(tarjeta.variante.nodo)
  return tarjeta.variante.opciones.find((o) => o.clave === clave)?.titulo ?? null
}

function textoDeLaVariable(e: EntradaDelContenido, variable: string): string {
  const modo = e.calculo.modoTc === null ? null : (e.tarjeta.modos.get(e.calculo.modoTc) ?? null)
  return valorDeLaVariable(variable, e.contexto, { tituloOpcion: tituloDeLaOpcion(e), modo })
}

export function datoDibujado(e: EntradaDelContenido, d: DatoDeLaCelda): ContenidoDibujado {
  return 'variable' in d
    ? textoDibujado(textoDeLaVariable(e, d.variable))
    : delNodo(e, d.nodo, d.mostrar)
}

// Un dato dentro de un texto con datos: el mismo formato que en una celda «Dato», un monto aparte (para `<Monto>`) y, sin valor o si no aplica, nada.
export function parteDibujada(e: EntradaDelContenido, d: DatoDeLaCelda): TramoDelTexto {
  if ('variable' in d) return textoDeLaVariable(e, d.variable)
  if (!aplica(e, d.nodo)) return ''
  const crudo = CRUDOS[d.mostrar](e, d.nodo)
  if (d.mostrar === 'monto')
    return typeof crudo === 'number' ? montoDibujado(e, d.nodo, crudo, 'USD') : ''
  if (d.mostrar === 'porcentaje')
    return typeof crudo === 'number' ? textoDelPorcentaje(e, d.nodo, crudo) : ''
  if (d.mostrar === 'tc_valor')
    return typeof crudo === 'number'
      ? formatearNumero(crudo, { decimales: 4, locale: e.locale })
      : ''
  return typeof crudo === 'string' ? crudo : ''
}

// Si un dato tiene valor: un texto que no queda vacío sin los espacios de los bordes, o un número (también el 0). Un nulo no; un nodo que no aplica, tampoco.
export function tieneValor(e: EntradaDelContenido, d: DatoDeLaCelda): boolean {
  if ('variable' in d) return textoDeLaVariable(e, d.variable).trim() !== ''
  if (!aplica(e, d.nodo)) return false
  const crudo = CRUDOS[d.mostrar](e, d.nodo)
  return typeof crudo === 'number' || (typeof crudo === 'string' && crudo.trim() !== '')
}
