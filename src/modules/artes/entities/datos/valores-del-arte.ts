// El valor de cada `{clave}` de un arte con unos datos (docs/GLOSARIO.md › «Elemento con datos»): ya escrito, como se dibuja en el lienzo y en
// la vista previa de «Textos». Lo vacío es `null` (su línea se quita). Los montos llegan escritos con su moneda y sin ella: `sinMoneda` (el
// Modo Live) elige el gemelo. La subasta se escribe con la regla del texto de compartir de hoy: «jueves 19 de noviembre a las 14:30 (hora de
// La Paz)» en la zona de la empresa y, aparte, la hora del patio. Puro.
import {
  ciudadDeLaZona,
  formatearDiaLargo,
  formatearFecha,
  formatearHora,
  inicioDelDia,
} from '@/shared/lib/fechas'
import { formatearNumero } from '@/shared/lib/formato'
import {
  REDES_DEL_ARTE,
  type DatosDeLaCotizacion,
  type DatosDelArte,
  type DatosDelVehiculo,
  type MontoDelArte,
} from './tipos'
import {
  PREFIJO_DE_CELDA,
  PREFIJO_DE_FICHA,
  PREFIJO_DE_RED,
  type CatalogoDelArte,
} from './variables-del-arte'

// Lo que vale cada `{clave}`: `null` o ausente = sin valor.
export type ValoresDelArte = { get(clave: string): string | null | undefined }

// Con los datos de ejemplo, un campo de la ficha muestra su etiqueta y una celda, este monto: la plantilla se ve llena mientras se diseña.
export const MONTO_DE_CELDA_DE_EJEMPLO: MontoDelArte = {
  conMoneda: 'USD 1.250,00',
  sinMoneda: '1.250,00',
}

type Par = readonly [string, string | null]

function texto(valor: string | null | undefined): string | null {
  const limpio = valor?.trim() ?? ''
  return limpio === '' ? null : limpio
}

// «jueves 19 de noviembre a las 14:30 (hora de La Paz)»
export function textoDeLaSubasta(cierre: string, zona: string, deQuien: string): string {
  return `${formatearDiaLargo(cierre, { zona })} a las ${formatearHora(cierre, { zona })} (${deQuien})`
}

function delVehiculo(v: DatosDelVehiculo, { zona, locale }: DatosDelArte['empresa']): Par[] {
  return [
    ['vehiculo', texto(v.titulo)],
    ['marca', texto(v.marca)],
    ['modelo', texto(v.modelo)],
    ['anio', v.anio === null ? null : String(v.anio)],
    ['color', texto(v.color)],
    [
      'kilometraje',
      v.kilometraje === null
        ? null
        : `${formatearNumero(v.kilometraje, { locale, decimales: 0 })} km`,
    ],
    ['vin', texto(v.vin)],
    ['lote', texto(v.lote)],
    ['origen', texto(v.origen)],
    ['ubicacion', texto(v.ubicacion)],
    [
      'subasta',
      v.cierre ? textoDeLaSubasta(v.cierre, zona, `hora de ${ciudadDeLaZona(zona)}`) : null,
    ],
    [
      'hora_del_patio',
      v.cierre && v.zonaDelPatio
        ? textoDeLaSubasta(v.cierre, v.zonaDelPatio, 'hora del patio')
        : null,
    ],
    ['enlace_del_lote', texto(v.enlace)],
  ]
}

function deLaCotizacion(
  c: DatosDeLaCotizacion,
  zona: string,
  monto: (valor: MontoDelArte | null | undefined) => string | null,
): Par[] {
  return [
    ['numero', String(c.numero)],
    ['total', monto(c.total)],
    ['modo', texto(c.modo)],
    ['vigencia', c.venceEl ? formatearFecha(inicioDelDia(c.venceEl, { zona }), { zona }) : null],
  ]
}

function deQuienYLaEmpresa({ lead, asesor, empresa }: DatosDelArte): Par[] {
  return [
    ['cliente', texto(lead?.nombre)],
    ['asesor', texto(asesor?.nombre)],
    ['cargo', texto(asesor?.cargo)],
    ['whatsapp', texto(asesor?.whatsapp)],
    ['empresa', texto(empresa.nombre)],
    ['web', texto(empresa.web)],
    ...REDES_DEL_ARTE.map((red): Par => [`${PREFIJO_DE_RED}${red}`, texto(empresa.redes[red])]),
  ]
}

export function valoresDelArte(
  datos: DatosDelArte,
  { sinMoneda, catalogo }: { sinMoneda: boolean; catalogo: Pick<CatalogoDelArte, 'campos'> },
): ValoresDelArte {
  const { vehiculo, cotizacion, empresa, deEjemplo } = datos
  const monto = (valor: MontoDelArte | null | undefined) =>
    valor ? texto(sinMoneda ? valor.sinMoneda : valor.conMoneda) : null
  const fijos = new Map<string, string | null>([
    ...(vehiculo ? delVehiculo(vehiculo, empresa) : []),
    ...(cotizacion ? deLaCotizacion(cotizacion, empresa.zona, monto) : []),
    ...deQuienYLaEmpresa(datos),
  ])
  return {
    get(clave) {
      if (clave.startsWith(PREFIJO_DE_FICHA)) {
        const campo = clave.slice(PREFIJO_DE_FICHA.length)
        return texto(deEjemplo ? catalogo.campos.get(campo) : vehiculo?.ficha[campo])
      }
      if (clave.startsWith(PREFIJO_DE_CELDA)) {
        const concepto = clave.slice(PREFIJO_DE_CELDA.length)
        if (!cotizacion) {
          return null
        }
        return monto(deEjemplo ? MONTO_DE_CELDA_DE_EJEMPLO : cotizacion.celdas[concepto])
      }
      return fijos.get(clave) ?? null
    },
  }
}
