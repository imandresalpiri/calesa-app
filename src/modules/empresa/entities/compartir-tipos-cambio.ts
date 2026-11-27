// Compartir los tipos de cambio con un cliente: una imagen con la marca de la empresa y un texto para WhatsApp, los dos con lo mismo (la
// empresa, el momento en su zona, un tipo por línea y la leyenda). Acá, lo puro: el tope, el armado del texto y los ids de la URL.
import { z } from 'zod'
import { formatearFechaHoraConZona } from '@/shared/lib/fechas'
import { formatearMonto, formatearMontoSinMoneda } from '@/shared/lib/formato'
import type { Tables } from '@/shared/types/database.types'
import { decimalesDeValor } from './tipos-cambio'
import { TOPE_DEL_POPOVER } from './tipos-cambio-vigentes'

// Lo mismo que el `check` de `ajustes_empresa.leyenda_tipos_cambio` y su RPC.
export const LEYENDA_MAXIMA = 120

// Cuántos tipos entran en un envío: los mismos que el popover dibuja.
export const TOPE_PARA_COMPARTIR = TOPE_DEL_POPOVER

// La leyenda con la versión de la fila de ajustes (la misma que lleva el formulario de Empresa): la lee Configuración › Empresa › Monedas.
export type LeyendaDeTiposCambio = {
  leyenda: string | null
  // La versión tal como la dio la base (con sus microsegundos): nunca pasa por `Date`.
  actualizadoEn: string
}

export function leyendaDesde(
  fila: Pick<Tables<'ajustes_empresa'>, 'leyenda_tipos_cambio' | 'actualizado_en'>,
): LeyendaDeTiposCambio {
  return { leyenda: fila.leyenda_tipos_cambio, actualizadoEn: fila.actualizado_en }
}

export const MOTIVO_NINGUN_TIPO_PARA_COMPARTIR = 'Elige al menos un tipo de cambio.'

export type TipoParaCompartir = {
  id: string
  nombre: string
  monedaDe: string
  monedaA: string
  valor: number
}

// Lo que se comparte, leído en el servidor: la imagen y el texto salen de esto y de nada más.
export type ParaCompartir = {
  empresa: string
  // La dirección pública del logo (o null: sólo el nombre).
  logoUrl: string | null
  // `#rrggbb` o null (los tokens neutros): la franja de la imagen.
  colorAcento: string | null
  locale: string
  zonaHoraria: string
  // ISO: el momento de armar lo que se comparte.
  ahora: string
  // null = sin leyenda.
  leyenda: string | null
  // En el orden en que se pidieron.
  tipos: readonly TipoParaCompartir[]
  // La vista del Modo Live (`?sin-moneda=1`): los valores sin su moneda. Lo que se copia y se comparte va siempre sin esto.
  sinMoneda?: boolean
}

// `?sin-moneda=` de las rutas de compartir: sólo `1` pide la vista sin moneda; otro valor se ignora.
export const CLAVE_SIN_MONEDA = 'sin-moneda'
export const sinMonedaDe = (valor: string | null): boolean => valor === '1'

// «1 USD = Bs 6,96», con los decimales con que se ve en toda la app. Con `sinMoneda`, «1 USD = 6,96»: el valor sin su moneda; «1 USD» queda, porque sin él no se sabe
// de qué tipo es la cifra.
export function valorParaCompartir(
  tipo: Pick<TipoParaCompartir, 'monedaDe' | 'monedaA' | 'valor'>,
  locale: string,
  { sinMoneda = false }: { sinMoneda?: boolean } = {},
): string {
  const formatear = sinMoneda ? formatearMontoSinMoneda : formatearMonto
  const monto = formatear(tipo.valor, {
    moneda: tipo.monedaA,
    locale,
    decimales: decimalesDeValor(tipo.valor),
  })
  return `1 ${tipo.monedaDe} = ${monto}`
}

// «17 nov 2026, 14:30 GMT-4»: en la zona de la empresa, con su abreviatura (quien lo recibe puede estar en otra).
export function momentoParaCompartir(ahora: string, zonaHoraria: string): string {
  return formatearFechaHoraConZona(ahora, { zona: zonaHoraria })
}

// La leyenda como la guarda la base: sin espacios en los bordes y vacía = ninguna.
export function normalizarLeyenda(texto: string | null | undefined): string | null {
  const limpia = (texto ?? '').trim()
  return limpia === '' ? null : limpia
}

// Los caracteres de verdad (un emoji es uno), como `char_length` de la base: `.length` cuenta unidades UTF-16.
export function caracteresDeLaLeyenda(texto: string): number {
  return Array.from(texto).length
}

// El texto listo para pegar en WhatsApp: el nombre en negrita (`*…*`), el momento, un tipo por línea y la leyenda. Un `*` en el nombre
// rompería la negrita: no se imprime.
export function armarTextoParaCompartir(datos: ParaCompartir): string {
  const nombre = datos.empresa.replaceAll('*', '').trim()
  const lineas = [
    nombre === '' ? 'Tipos de cambio' : `*${nombre}*`,
    nombre === ''
      ? momentoParaCompartir(datos.ahora, datos.zonaHoraria)
      : `Tipos de cambio · ${momentoParaCompartir(datos.ahora, datos.zonaHoraria)}`,
    '',
    ...datos.tipos.map(
      (tipo) =>
        `${tipo.nombre}: ${valorParaCompartir(tipo, datos.locale, { sinMoneda: datos.sinMoneda === true })}`,
    ),
  ]
  const leyenda = normalizarLeyenda(datos.leyenda)
  if (leyenda !== null) {
    lineas.push('', leyenda)
  }
  return lineas.join('\n')
}

// Los ids de `?ids=a,b,c` (los de los tipos elegidos): guid, sin repetir, de 1 a `TOPE_PARA_COMPARTIR`. Lo demás es `null`.
const esquemaDeIds = z.array(z.guid()).min(1).max(TOPE_PARA_COMPARTIR)

export function idsParaCompartir(valor: string | null): string[] | null {
  if (valor === null) {
    return null
  }
  const ids = [...new Set(valor.split(',').map((id) => id.trim()))]
  const leidos = esquemaDeIds.safeParse(ids)
  return leidos.success ? leidos.data : null
}
