// El texto de «Compartir la cotización», listo para pegar, armado en el navegador con lo que mandó el servidor (`DatosParaCompartir`): cambiar de formato o de zona
// no vuelve a pedir nada. En el orden de V1: el título de la cotización; del vehículo, su título (si el de la cotización no es ese mismo), el lote, el año, el
// kilometraje, el VIN, el enlace y el cierre de la subasta en la zona elegida (sólo si todavía no pasó); los conceptos de la tarjeta con su monto; el total con su
// modo; y, como firma, el asesor (quien comparte: «Asesor: nombre, cargo» y «WhatsApp: …», tal como lo guardó). Lo que falta no deja una línea. Los formatos:
// - «Simple»: sin marcas y sin líneas en blanco;
// - «Facebook» y «TikTok»: sin marcas, una línea en blanco entre bloques (título · vehículo · conceptos · total · asesor);
// - «WhatsApp»: como Facebook, con el título y la línea del total en negrita (`*…*`; un texto que ya trae `*` va sin marca).
// Con `sinMoneda`, los montos van sin su moneda (los gemelos `…SinMoneda`): lo que el panel muestra con el Modo Live. Lo que se copia y se comparte, siempre sin él.
import { ciudadDeLaZona, formatearDiaLargo, formatearHora } from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import type { DatosParaCompartir, VehiculoParaCompartir } from './datos-para-compartir'
import type { LineaDeLaTarjeta } from './lineas-de-la-tarjeta'

export const FORMATOS_DE_TEXTO = ['simple', 'whatsapp', 'facebook', 'tiktok'] as const
export type FormatoDeTexto = (typeof FORMATOS_DE_TEXTO)[number]

export const ETIQUETA_DEL_FORMATO: Readonly<Record<FormatoDeTexto, string>> = {
  simple: 'Simple',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  tiktok: 'TikTok',
}

// En qué zona se dice el cierre de la subasta: la de la empresa (por defecto) o la del patio.
export type ZonaParaCompartir = 'empresa' | 'patio'

export type OpcionDeZona = { clave: ZonaParaCompartir; etiqueta: string }

// «Hora de La Paz» siempre; «Hora del patio» sólo con un patio conocido y una subasta que decir.
export function zonasDisponibles(datos: DatosParaCompartir): OpcionDeZona[] {
  const empresa: OpcionDeZona = {
    clave: 'empresa',
    etiqueta: `Hora de ${ciudadDeLaZona(datos.zonaDeLaEmpresa)}`,
  }
  const v = datos.vehiculo
  return v !== null && v.zonaDelPatio !== null && v.cierre !== null
    ? [empresa, { clave: 'patio', etiqueta: 'Hora del patio' }]
    : [empresa]
}

type Opciones = {
  formato: FormatoDeTexto
  zona: ZonaParaCompartir
  ahora: string
  sinMoneda?: boolean
}

// «Se subasta el jueves 19 de noviembre a las 22:00 (hora del patio)»: sólo si el cierre todavía no pasó (un «Se subasta» de algo cerrado engaña).
function lineaDeLaSubasta(
  v: VehiculoParaCompartir,
  datos: DatosParaCompartir,
  { zona, ahora }: Opciones,
): string | null {
  if (v.cierre === null || Date.parse(v.cierre) <= Date.parse(ahora)) return null
  const delPatio = zona === 'patio' && v.zonaDelPatio !== null
  const enZona = {
    zona: delPatio && v.zonaDelPatio !== null ? v.zonaDelPatio : datos.zonaDeLaEmpresa,
  }
  const cual = delPatio ? 'hora del patio' : `hora de ${ciudadDeLaZona(datos.zonaDeLaEmpresa)}`
  return `Se subasta el ${formatearDiaLargo(v.cierre, enZona)} a las ${formatearHora(v.cierre, enZona)} (${cual})`
}

function bloqueDelVehiculo(datos: DatosParaCompartir, opciones: Opciones): string[] {
  const v = datos.vehiculo
  if (v === null) return []
  return [
    // El título automático ya es el del vehículo (la base lo guarda en la columna): no se repite.
    datos.titulo.fuente === 'vehiculo' || datos.titulo.texto === v.titulo ? null : v.titulo,
    v.lote === null ? null : `Lote: ${v.lote}`,
    v.anio === null ? null : `Año: ${String(v.anio)}`,
    v.kilometraje === null
      ? null
      : `Kilometraje: ${formatearNumero(v.kilometraje, { locale: datos.locale, decimales: 0 })} km`,
    v.vin === null ? null : `VIN: ${v.vin}`,
    v.enlace === null ? null : `URL: ${v.enlace}`,
    lineaDeLaSubasta(v, datos, opciones),
  ].filter((l): l is string => l !== null && l.trim() !== '')
}

// El monto y la segunda línea de una línea, con su moneda o sin ella.
const montoDe = (l: LineaDeLaTarjeta, sinMoneda: boolean) =>
  sinMoneda ? l.montoSinMoneda : l.monto
const segundaDe = (l: LineaDeLaTarjeta, sinMoneda: boolean) =>
  sinMoneda ? l.segundaSinMoneda : l.segunda

const lineaDe = (l: LineaDeLaTarjeta, sinMoneda: boolean, concepto: string | null = l.concepto) =>
  concepto === null ? montoDe(l, sinMoneda) : `${concepto}: ${montoDe(l, sinMoneda)}`

// `*…*` en WhatsApp; un texto con `*` rompería la negrita: va sin marca.
const negrita = (texto: string, formato: FormatoDeTexto) =>
  formato === 'whatsapp' && !texto.includes('*') ? `*${texto}*` : texto

function bloqueDelTotal(
  datos: DatosParaCompartir,
  formato: FormatoDeTexto,
  sinMoneda: boolean,
): string[] {
  const total = datos.total
  return [
    total === null ? null : negrita(lineaDe(total, sinMoneda, total.concepto ?? 'Total'), formato),
    total === null ? null : segundaDe(total, sinMoneda),
    datos.modo === null ? null : `Modo de tipo de cambio: ${datos.modo}`,
  ].filter((l): l is string => l !== null)
}

const lineasDe = (conceptos: DatosParaCompartir['conceptos'], sinMoneda: boolean) =>
  conceptos.flatMap((l) => {
    const segunda = segundaDe(l, sinMoneda)
    return [lineaDe(l, sinMoneda), ...(segunda === null ? [] : [segunda])]
  })

// Las cotizaciones hermanas: un bloque por opción (su etiqueta, sus conceptos y su total), una debajo de la otra; el modo, una vez al final.
function bloquesDeLasVersiones(
  datos: DatosParaCompartir,
  formato: FormatoDeTexto,
  sinMoneda: boolean,
): string[][] {
  const versiones = datos.versiones ?? []
  return [
    ...versiones.map((v) => [
      negrita(v.etiqueta, formato),
      ...lineasDe(v.conceptos, sinMoneda),
      ...bloqueDelTotal({ ...datos, total: v.total, modo: null }, formato, sinMoneda),
    ]),
    datos.modo === null ? [] : [`Modo de tipo de cambio: ${datos.modo}`],
  ]
}

// La firma: quien comparte, con su cargo, y su WhatsApp.
function bloqueDelAsesor(datos: DatosParaCompartir): string[] {
  const a = datos.asesor
  if (a === null) return []
  return [
    a.cargo === null ? `Asesor: ${a.nombre}` : `Asesor: ${a.nombre}, ${a.cargo}`,
    a.telefono === null ? null : `WhatsApp: ${a.telefono}`,
  ].filter((l): l is string => l !== null)
}

export function textoParaCompartir(datos: DatosParaCompartir, opciones: Opciones): string {
  const { formato, sinMoneda = false } = opciones
  const cifras = datos.versiones
    ? bloquesDeLasVersiones(datos, formato, sinMoneda)
    : [lineasDe(datos.conceptos, sinMoneda), bloqueDelTotal(datos, formato, sinMoneda)]
  const bloques = [
    [negrita(datos.titulo.texto, formato)],
    bloqueDelVehiculo(datos, opciones),
    ...cifras,
    bloqueDelAsesor(datos),
  ].filter((b) => b.length > 0)
  return bloques.map((b) => b.join('\n')).join(formato === 'simple' ? '\n' : '\n\n')
}
